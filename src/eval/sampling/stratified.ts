import type { CuadExample } from '../types.js';
import { hash } from '../../integrity/hash.js';

export type StratifiedSampleOptions = {
  readonly seed: string;
  readonly contractLimit: number;
  readonly perCategoryPerLabel: number;
  readonly categories?: readonly string[];
};

export type StratifiedSampleStats = {
  readonly selectedContracts: number;
  readonly selectedExamples: number;
  readonly selectedCategories: number;
  readonly perLabelCounts: Readonly<Record<'true' | 'false', number>>;
};

function score(value: unknown, seed: string): string {
  return hash({ seed, value }).slice(0, 16);
}

function uniq<T>(values: readonly T[]): readonly T[] {
  return [...new Set(values)];
}

export function selectStratifiedExamples(
  examples: readonly CuadExample[],
  options: StratifiedSampleOptions
): { readonly selected: readonly CuadExample[]; readonly stats: StratifiedSampleStats } {
  const categoriesFilter = options.categories ? new Set(options.categories) : null;
  const filtered = categoriesFilter
    ? examples.filter(e => categoriesFilter.has(e.category))
    : examples;

  const contractTitles = uniq(filtered.map(e => e.contractTitle));
  const pickedContracts = [...contractTitles]
    .sort((a, b) => score(a, options.seed).localeCompare(score(b, options.seed)))
    .slice(0, options.contractLimit);
  const pickedSet = new Set(pickedContracts);

  const inScope = filtered.filter(e => pickedSet.has(e.contractTitle));

  const byCategory: Map<string, { pos: CuadExample[]; neg: CuadExample[] }> = new Map();
  for (const e of inScope) {
    const bucket = byCategory.get(e.category) ?? { pos: [], neg: [] };
    (e.label ? bucket.pos : bucket.neg).push(e);
    byCategory.set(e.category, bucket);
  }

  const selected: CuadExample[] = [];
  for (const [category, bucket] of [...byCategory.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
    const pos = [...bucket.pos].sort((a, b) => score(a.qaId, options.seed).localeCompare(score(b.qaId, options.seed)));
    const neg = [...bucket.neg].sort((a, b) => score(a.qaId, options.seed).localeCompare(score(b.qaId, options.seed)));

    selected.push(...pos.slice(0, options.perCategoryPerLabel));
    selected.push(...neg.slice(0, options.perCategoryPerLabel));
  }

  const perLabelCounts = {
    true: selected.filter(e => e.label).length,
    false: selected.filter(e => !e.label).length,
  } as const;

  return {
    selected,
    stats: {
      selectedContracts: pickedContracts.length,
      selectedExamples: selected.length,
      selectedCategories: byCategory.size,
      perLabelCounts,
    },
  };
}

