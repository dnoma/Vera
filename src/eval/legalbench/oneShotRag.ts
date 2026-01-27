import { readFileSync } from 'fs';
import { resolve } from 'path';

type StringRow = Record<string, string>;

export type OneShotRagDemo = {
  readonly trainId: string;
  readonly trainIndex: number;
  readonly score: number;
  readonly questionText: string;
  readonly answerText: string;
};

export type OneShotRagIndex = {
  readonly trainRows: readonly StringRow[];
  readonly trainIds: readonly string[];
  readonly trainAnswers: readonly string[];
  readonly trainTokenSets: readonly ReadonlySet<string>[];
  readonly inverted: ReadonlyMap<string, readonly number[]>;
};

function readUtf8(path: string): string {
  return readFileSync(path, 'utf-8');
}

function parseDelimitedLine(line: string, delimiter: string): string[] {
  const out: string[] = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]!;
    if (ch === '"') {
      const next = line[i + 1];
      if (inQuotes && next === '"') {
        cur += '"';
        i++;
        continue;
      }
      inQuotes = !inQuotes;
      continue;
    }
    if (!inQuotes && ch === delimiter) {
      out.push(cur);
      cur = '';
      continue;
    }
    cur += ch;
  }
  out.push(cur);
  return out;
}

function parseTsv(content: string): readonly StringRow[] {
  const lines = content
    .split(/\r?\n/)
    .map(l => l.trimEnd())
    .filter(l => l.length > 0);
  if (lines.length === 0) return [];

  const header = parseDelimitedLine(lines[0]!, '\t');
  const rows: StringRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const values = parseDelimitedLine(lines[i]!, '\t');
    const row: StringRow = {};
    for (let j = 0; j < header.length; j++) {
      const key = header[j]!;
      row[key] = values[j] ?? '';
    }
    rows.push(row);
  }
  return rows;
}

function pickAnswer(row: StringRow): string {
  return row['answer'] ?? row['label'] ?? row['gold_label'] ?? row['gold'] ?? '';
}

function normalizeForTokens(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
}

export function tokenize(text: string): readonly string[] {
  const norm = normalizeForTokens(text);
  if (!norm) return [];
  return norm
    .split(/\s+/)
    .map(t => t.trim())
    .filter(t => t.length >= 3);
}

export function buildQuestionText(row: StringRow): string {
  const text = row['text'] ?? '';
  const question = row['question'] ?? '';
  if (text && question) return `${text} ${question}`.trim();
  if (text) return text.trim();
  if (question) return question.trim();

  const skip = new Set(['answer', 'label', 'gold_label', 'gold', 'index']);
  const parts: string[] = [];
  for (const [k, v] of Object.entries(row)) {
    if (skip.has(k)) continue;
    const val = String(v ?? '').trim();
    if (val) parts.push(val);
  }
  return parts.join(' ').trim();
}

export function buildOneShotRagIndexFromTsv(tsvContent: string, taskName: string): OneShotRagIndex {
  const rows = parseTsv(tsvContent);
  const trainIds: string[] = [];
  const trainAnswers: string[] = [];
  const trainTokenSets: ReadonlySet<string>[] = [];
  const inverted = new Map<string, number[]>();

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]!;
    const ans = pickAnswer(row).trim();
    if (!ans) continue;

    const id = `${taskName}-${row['index'] ?? String(i)}`;
    trainIds.push(id);
    trainAnswers.push(ans);

    const q = buildQuestionText(row);
    const tokens = new Set(tokenize(q));
    trainTokenSets.push(tokens);

    const trainIndex = trainTokenSets.length - 1;
    for (const tok of tokens) {
      const arr = inverted.get(tok);
      if (arr) arr.push(trainIndex);
      else inverted.set(tok, [trainIndex]);
    }
  }

  return {
    trainRows: rows,
    trainIds,
    trainAnswers,
    trainTokenSets,
    inverted,
  };
}

export function loadOneShotRagIndex(datasetRootDir: string, taskName: string): OneShotRagIndex | null {
  const path = resolve(datasetRootDir, 'tasks', taskName, 'train.tsv');
  try {
    const content = readUtf8(path);
    return buildOneShotRagIndexFromTsv(content, taskName);
  } catch {
    return null;
  }
}

function jaccard(a: ReadonlySet<string>, b: ReadonlySet<string>, overlap: number): number {
  const union = a.size + b.size - overlap;
  return union === 0 ? 0 : overlap / union;
}

export function selectBestOneShotDemo(
  index: OneShotRagIndex,
  queryText: string
): OneShotRagDemo | null {
  const qTokens = new Set(tokenize(queryText));
  if (qTokens.size === 0 || index.trainTokenSets.length === 0) return null;

  const overlapCounts = new Map<number, number>();
  for (const tok of qTokens) {
    const hits = index.inverted.get(tok);
    if (!hits) continue;
    for (const trainIdx of hits) {
      overlapCounts.set(trainIdx, (overlapCounts.get(trainIdx) ?? 0) + 1);
    }
  }

  let bestIdx = -1;
  let bestScore = -1;
  for (const [trainIdx, overlap] of overlapCounts.entries()) {
    const score = jaccard(qTokens, index.trainTokenSets[trainIdx]!, overlap);
    if (score > bestScore || (score === bestScore && trainIdx < bestIdx)) {
      bestIdx = trainIdx;
      bestScore = score;
    }
  }

  if (bestIdx < 0) return null;

  const row = index.trainRows.find(r => `${r['index'] ?? ''}` === index.trainIds[bestIdx]!.split('-').slice(-1)[0]) ?? index.trainRows[0]!;
  const questionText = buildQuestionText(row);
  const answerText = index.trainAnswers[bestIdx]!;
  return {
    trainId: index.trainIds[bestIdx]!,
    trainIndex: bestIdx,
    score: Number(bestScore.toFixed(6)),
    questionText,
    answerText,
  };
}

export function formatOneShotDemo(demo: OneShotRagDemo): string {
  return `Example (retrieved):\nQ: ${demo.questionText}\nA: ${demo.answerText}`;
}

