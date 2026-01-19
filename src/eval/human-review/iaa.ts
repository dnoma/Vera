export type OrdinalValue = number;

export type RatingRecord = {
  readonly itemId: string;
  readonly raterId: string;
  readonly value: OrdinalValue;
};

function uniqSorted(values: readonly number[]): readonly number[] {
  return [...new Set(values)].sort((a, b) => a - b);
}

/**
 * Krippendorff's alpha (ordinal/interval approximation using squared distance).
 *
 * This implementation is intended for practitioner-facing evaluation where:
 * - ratings are ordinal integers (e.g. 1..5),
 * - missingness is allowed (not all raters rate all items),
 * - interpretation should be qualitative (agreement is acceptable / mixed / poor).
 */
export function krippendorffAlphaOrdinalSquared(
  records: readonly RatingRecord[]
): number | null {
  if (records.length === 0) return null;

  const values = records.map(r => r.value).filter(v => Number.isFinite(v));
  const categories = uniqSorted(values);
  if (categories.length <= 1) return null;

  const index = new Map<number, number>();
  categories.forEach((c, i) => index.set(c, i));

  const k = categories.length;
  const O: number[][] = Array.from({ length: k }, () => Array.from({ length: k }, () => 0));

  const byItem = new Map<string, RatingRecord[]>();
  for (const r of records) {
    const list = byItem.get(r.itemId) ?? [];
    list.push(r);
    byItem.set(r.itemId, list);
  }

  // Build observed coincidence matrix.
  // For each item with m ratings, add for each rating i to each other rating j:
  // O[v_i][v_j] += 1/(m-1)
  for (const list of byItem.values()) {
    const m = list.length;
    if (m < 2) continue;
    for (let i = 0; i < m; i++) {
      for (let j = 0; j < m; j++) {
        if (i === j) continue;
        const a = index.get(list[i]!.value);
        const b = index.get(list[j]!.value);
        if (a === undefined || b === undefined) continue;
        O[a]![b] = (O[a]![b] ?? 0) + 1 / (m - 1);
      }
    }
  }

  const n: number[] = Array.from({ length: k }, () => 0);
  let N = 0;
  for (let a = 0; a < k; a++) {
    for (let b = 0; b < k; b++) {
      const v = O[a]![b] ?? 0;
      n[a] = (n[a] ?? 0) + v;
      N += v;
    }
  }

  if (N <= 1) return null;

  const delta = (a: number, b: number): number => {
    const da = categories[a]!;
    const db = categories[b]!;
    const d = da - db;
    return d * d;
  };

  let Do = 0;
  for (let a = 0; a < k; a++) {
    for (let b = 0; b < k; b++) {
      Do += O[a]![b]! * delta(a, b);
    }
  }
  Do /= N;

  // Expected coincidence matrix under chance agreement.
  let De = 0;
  for (let a = 0; a < k; a++) {
    for (let b = 0; b < k; b++) {
      const expected = (n[a]! * (b === a ? (n[b]! - 1) : n[b]!)) / (N - 1);
      De += expected * delta(a, b);
    }
  }
  De /= N;

  if (De <= 0) return null;
  return 1 - Do / De;
}
