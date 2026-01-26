import type { JudgmentDocument, ParagraphHit } from './types.js';

export interface ParagraphIndex {
  readonly records: readonly {
    caseId: string;
    paraId: string;
    text: string;
    length: number;
  }[];
  readonly postingsByTerm: ReadonlyMap<string, readonly [docIndex: number, tf: number][]>;
  readonly docCount: number;
  readonly avgDocLen: number;
}

function tokenize(text: string): readonly string[] {
  const tokens = text.toLowerCase().match(/[a-z0-9]+/g);
  return tokens ?? [];
}

function requireCaseId(doc: JudgmentDocument): string {
  if (!doc.caseId) {
    throw new Error('JudgmentDocument.caseId is required for paragraph indexing');
  }
  return doc.caseId;
}

function stableRecordOrder(
  a: { caseId: string; paraId: string },
  b: { caseId: string; paraId: string }
): number {
  const byCase = a.caseId.localeCompare(b.caseId);
  if (byCase !== 0) return byCase;
  return a.paraId.localeCompare(b.paraId);
}

/**
 * Builds an in-process paragraph index for deterministic Singapore-first retrieval.
 *
 * Determinism guarantees:
 * - Paragraph record ordering is stable (caseId, then paraId).
 * - Postings are sorted by doc index and query results are stable under ties.
 */
export function buildParagraphIndex(docs: readonly JudgmentDocument[]): ParagraphIndex {
  const records: Array<{ caseId: string; paraId: string; text: string; length: number }> = [];

  for (const doc of docs) {
    const caseId = requireCaseId(doc);
    for (const para of doc.paragraphs) {
      const tokens = tokenize(para.text);
      records.push({ caseId, paraId: para.paraId, text: para.text, length: tokens.length });
    }
  }

  records.sort(stableRecordOrder);

  const postingsByTerm = new Map<string, Array<[number, number]>>();
  let totalLen = 0;

  for (let docIndex = 0; docIndex < records.length; docIndex += 1) {
    const record = records[docIndex]!;
    totalLen += record.length;

    const tf = new Map<string, number>();
    for (const token of tokenize(record.text)) {
      tf.set(token, (tf.get(token) ?? 0) + 1);
    }

    for (const [term, count] of tf.entries()) {
      const postings = postingsByTerm.get(term) ?? [];
      postings.push([docIndex, count]);
      postingsByTerm.set(term, postings);
    }
  }

  for (const postings of postingsByTerm.values()) {
    postings.sort((a, b) => a[0] - b[0]);
  }

  return {
    records,
    postingsByTerm,
    docCount: records.length,
    avgDocLen: records.length === 0 ? 0 : totalLen / records.length,
  };
}

export interface ParagraphQueryOptions {
  limit?: number;
  minScore?: number;
  k1?: number;
  b?: number;
}

function bm25Idf(docCount: number, df: number): number {
  return Math.log(1 + (docCount - df + 0.5) / (df + 0.5));
}

/**
 * Queries the paragraph index using a BM25-like lexical score.
 * Ordering is deterministic: score desc, then (caseId+paraId) asc.
 */
export function queryParagraphs(
  index: ParagraphIndex,
  query: string,
  opts: ParagraphQueryOptions = {}
): readonly ParagraphHit[] {
  const k1 = opts.k1 ?? 1.2;
  const b = opts.b ?? 0.75;
  const limit = opts.limit ?? 20;
  const minScore = opts.minScore ?? 0;

  if (index.docCount === 0) return [];

  const queryTerms = Array.from(new Set(tokenize(query)));
  if (queryTerms.length === 0) return [];

  const scores = new Float64Array(index.docCount);
  const matched = new Set<number>();

  for (const term of queryTerms) {
    const postings = index.postingsByTerm.get(term);
    if (!postings || postings.length === 0) continue;

    const idf = bm25Idf(index.docCount, postings.length);
    for (const [docIndex, tf] of postings) {
      const len = index.records[docIndex]!.length;
      const denom = tf + k1 * (1 - b + (b * len) / (index.avgDocLen || 1));
      const score = idf * ((tf * (k1 + 1)) / denom);
      scores[docIndex] = (scores[docIndex] ?? 0) + score;
      matched.add(docIndex);
    }
  }

  const hits: ParagraphHit[] = [];
  for (const docIndex of matched) {
    const score = scores[docIndex] ?? 0;
    if (score < minScore) continue;
    const r = index.records[docIndex]!;
    hits.push({ caseId: r.caseId, paraId: r.paraId, score });
  }

  hits.sort((a, b2) => {
    const byScore = b2.score - a.score;
    if (byScore !== 0) return byScore;
    const aKey = `${a.caseId}#${a.paraId}`;
    const bKey = `${b2.caseId}#${b2.paraId}`;
    return aKey.localeCompare(bKey);
  });

  return hits.slice(0, limit);
}
