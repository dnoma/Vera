import { createHash } from 'crypto';
import type { JudgmentDocument, JudgmentParagraph } from './types.js';

function normalizeInputText(input: string): string {
  return input
    .replace(/^\uFEFF/, '')
    .replace(/\r\n?/g, '\n')
    .replace(/\u00a0/g, ' ')
    .split('\n')
    .map(line => line.replace(/[ \t]+$/g, ''))
    .join('\n');
}

function normalizeParagraphText(text: string): string {
  return text
    .normalize('NFKC')
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const PARA_START_PATTERNS: readonly RegExp[] = [
  /^\s*\[(\d{1,4})\]\s+(.*\S.*)\s*$/u,
  /^\s*\((\d{1,4})\)\s+(.*\S.*)\s*$/u,
  /^\s*(\d{1,4})[.)]\s+(.*\S.*)\s*$/u,
];

function tryParseParaStart(line: string): { paraId: string; initialText: string } | null {
  for (const pattern of PARA_START_PATTERNS) {
    const match = line.match(pattern);
    if (!match) continue;
    return { paraId: match[1]!, initialText: match[2]! };
  }
  return null;
}

function buildFullTextAndOffsets(
  paragraphs: readonly Omit<JudgmentParagraph, 'charStart' | 'charEnd'>[]
): { fullText: string; paragraphs: readonly JudgmentParagraph[] } {
  let cursor = 0;
  const withOffsets: JudgmentParagraph[] = [];
  const chunks: string[] = [];

  for (let i = 0; i < paragraphs.length; i += 1) {
    const para = paragraphs[i]!;
    const separator = i === 0 ? '' : '\n\n';
    chunks.push(separator, para.text);
    cursor += separator.length;

    const charStart = cursor;
    const charEnd = cursor + para.text.length;
    withOffsets.push({ ...para, charStart, charEnd });
    cursor = charEnd;
  }

  return { fullText: chunks.join(''), paragraphs: withOffsets };
}

/**
 * Deterministically normalizes a raw judgment string into paragraph units.
 *
 * Determinism guarantees:
 * - Same input string -> same `paragraphs[]` boundaries, same `fullText`, same offsets.
 * - Whitespace normalization is limited to: line-ending normalization and collapsing
 *   whitespace runs within each paragraph to single spaces.
 */
export function normalizeJudgmentText(input: string): JudgmentDocument {
  const rawText = input;
  const normalized = normalizeInputText(input);

  const preambleLines: string[] = [];
  const paragraphs: Array<Omit<JudgmentParagraph, 'charStart' | 'charEnd'>> = [];

  let currentParaId: string | null = null;
  let currentLines: string[] = [];

  const flushCurrent = (): void => {
    if (!currentParaId) return;
    const text = normalizeParagraphText(currentLines.join('\n'));
    paragraphs.push({ paraId: currentParaId, text });
    currentParaId = null;
    currentLines = [];
  };

  for (const line of normalized.split('\n')) {
    const parsed = tryParseParaStart(line);
    if (parsed) {
      if (!currentParaId && paragraphs.length === 0 && preambleLines.length > 0) {
        const preambleText = normalizeParagraphText(preambleLines.join('\n'));
        paragraphs.push({ paraId: 'preamble', text: preambleText, isHeading: true });
        preambleLines.length = 0;
      }

      flushCurrent();
      currentParaId = parsed.paraId;
      currentLines = [parsed.initialText];
      continue;
    }

    if (!currentParaId) {
      if (line.trim().length > 0) {
        preambleLines.push(line);
      }
      continue;
    }

    if (line.trim().length === 0) {
      currentLines.push('');
      continue;
    }

    currentLines.push(line);
  }

  flushCurrent();

  if (paragraphs.length === 0 && preambleLines.length > 0) {
    const preambleText = normalizeParagraphText(preambleLines.join('\n'));
    paragraphs.push({ paraId: 'preamble', text: preambleText, isHeading: true });
  }

  const { fullText, paragraphs: withOffsets } = buildFullTextAndOffsets(paragraphs);

  return {
    rawText,
    fullText,
    paragraphs: withOffsets,
  };
}

export function getParagraph(doc: JudgmentDocument, paraId: string): JudgmentParagraph | undefined {
  return doc.paragraphs.find(p => p.paraId === paraId);
}

export function extractParagraphWindow(
  doc: JudgmentDocument,
  paraIds: readonly string[],
  windowSize: number
): readonly JudgmentParagraph[] {
  const idSet = new Set(paraIds);
  const targetIndexes = doc.paragraphs
    .map((p, idx) => ({ p, idx }))
    .filter(({ p }) => idSet.has(p.paraId))
    .map(({ idx }) => idx);

  const include = new Set<number>();
  for (const idx of targetIndexes) {
    const start = Math.max(0, idx - windowSize);
    const end = Math.min(doc.paragraphs.length - 1, idx + windowSize);
    for (let i = start; i <= end; i += 1) {
      include.add(i);
    }
  }

  return [...include]
    .sort((a, b) => a - b)
    .map(i => doc.paragraphs[i]!)
    .filter(p => p.text.length > 0);
}

/**
 * Deterministic content hash for audit and cache keys.
 * The hash commits to the paragraph IDs and normalized paragraph text.
 */
export function hashJudgment(doc: JudgmentDocument): string {
  const hash = createHash('sha256');
  for (const para of doc.paragraphs) {
    hash.update(para.paraId);
    hash.update('\n');
    hash.update(para.text);
    hash.update('\n\n');
  }
  return hash.digest('hex');
}

