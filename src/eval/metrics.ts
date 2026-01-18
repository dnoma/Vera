export function clamp01(value: number): number {
  if (Number.isNaN(value)) return 0;
  if (value < 0) return 0;
  if (value > 1) return 1;
  return value;
}

function normalize(text: string): string {
  return text.toLowerCase().replace(/\s+/g, ' ').trim();
}

export function spanIsValid(
  contractText: string,
  span: { start: number; end: number }
): boolean {
  if (!Number.isFinite(span.start) || !Number.isFinite(span.end)) return false;
  if (span.start < 0) return false;
  if (span.end > contractText.length) return false;
  if (span.end <= span.start) return false;
  return true;
}

export function extractSpanText(
  contractText: string,
  span: { start: number; end: number }
): string {
  return contractText.slice(span.start, span.end);
}

function tokens(text: string): readonly string[] {
  return normalize(text)
    .replace(/[^a-z0-9 ]+/g, ' ')
    .split(' ')
    .map(t => t.trim())
    .filter(Boolean);
}

export function tokenF1(a: string, b: string): number {
  const aT = tokens(a);
  const bT = tokens(b);
  if (aT.length === 0 && bT.length === 0) return 1;
  if (aT.length === 0 || bT.length === 0) return 0;

  const aCounts = new Map<string, number>();
  for (const t of aT) aCounts.set(t, (aCounts.get(t) ?? 0) + 1);

  let overlap = 0;
  for (const t of bT) {
    const n = aCounts.get(t) ?? 0;
    if (n > 0) {
      overlap++;
      aCounts.set(t, n - 1);
    }
  }

  const precision = overlap / bT.length;
  const recall = overlap / aT.length;
  if (precision + recall === 0) return 0;
  return (2 * precision * recall) / (precision + recall);
}

export function bestSpanTokenF1(
  contractText: string,
  predicted: readonly { start: number; end: number }[],
  gold: readonly { start: number; end: number }[]
): number | null {
  if (predicted.length === 0 && gold.length === 0) return 1;
  if (predicted.length === 0 || gold.length === 0) return 0;

  let best = 0;
  for (const p of predicted) {
    if (!spanIsValid(contractText, p)) continue;
    const pText = extractSpanText(contractText, p);
    for (const g of gold) {
      if (!spanIsValid(contractText, g)) continue;
      const gText = extractSpanText(contractText, g);
      best = Math.max(best, tokenF1(pText, gText));
    }
  }
  return best;
}

export function safeJsonParse<T>(raw: string): { ok: true; value: T } | { ok: false; error: string } {
  try {
    const parsed = JSON.parse(raw) as T;
    return { ok: true, value: parsed };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}
