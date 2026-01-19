import type { CuadExample } from '../src/eval/types.js';
import { selectStratifiedExamples } from '../src/eval/sampling/stratified.js';

function ex(params: {
  contractTitle: string;
  category: string;
  label: boolean;
  qaId: string;
}): CuadExample {
  return {
    contractTitle: params.contractTitle,
    category: params.category,
    label: params.label,
    qaId: params.qaId,
    question: 'q',
    contractText: 'A\nB\n',
    goldSpans: params.label ? [{ start: 0, end: 1 }] : [],
  };
}

describe('stratified sampling', () => {
  test('selects balanced examples per category/label within chosen contracts', () => {
    const examples: CuadExample[] = [
      ex({ contractTitle: 'C1', category: 'CatA', label: true, qaId: '1' }),
      ex({ contractTitle: 'C1', category: 'CatA', label: false, qaId: '2' }),
      ex({ contractTitle: 'C1', category: 'CatB', label: true, qaId: '3' }),
      ex({ contractTitle: 'C1', category: 'CatB', label: false, qaId: '4' }),
      ex({ contractTitle: 'C2', category: 'CatA', label: true, qaId: '5' }),
      ex({ contractTitle: 'C2', category: 'CatA', label: false, qaId: '6' }),
    ];

    const { selected, stats } = selectStratifiedExamples(examples, {
      seed: 's',
      contractLimit: 1,
      perCategoryPerLabel: 1,
    });

    expect(stats.selectedContracts).toBe(1);
    expect(stats.selectedCategories).toBeGreaterThanOrEqual(1);
    // For the chosen contract, CatA and CatB should contribute 2 each if both labels exist.
    expect(selected.length).toBeGreaterThanOrEqual(2);
    expect(stats.perLabelCounts.true + stats.perLabelCounts.false).toBe(selected.length);
  });

  test('is deterministic for the same seed', () => {
    const examples: CuadExample[] = [
      ex({ contractTitle: 'C1', category: 'CatA', label: true, qaId: '1' }),
      ex({ contractTitle: 'C1', category: 'CatA', label: false, qaId: '2' }),
      ex({ contractTitle: 'C2', category: 'CatA', label: true, qaId: '3' }),
      ex({ contractTitle: 'C2', category: 'CatA', label: false, qaId: '4' }),
    ];

    const a = selectStratifiedExamples(examples, { seed: 'fixed', contractLimit: 2, perCategoryPerLabel: 1 }).selected.map(e => e.qaId);
    const b = selectStratifiedExamples(examples, { seed: 'fixed', contractLimit: 2, perCategoryPerLabel: 1 }).selected.map(e => e.qaId);
    expect(a).toEqual(b);
  });
});

