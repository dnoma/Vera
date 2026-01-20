import { markdownReport, summarize } from '../src/eval/report.js';
import type { EvalRun } from '../src/eval/types.js';

describe('markdown report completion disclosure', () => {
  test('includes predicted/total and error counts per method', () => {
    const runBase: Omit<EvalRun, 'summaries'> = {
      runId: 'eval-test',
      startedAt: '2026-01-01T00:00:00.000Z',
      finishedAt: '2026-01-01T00:00:01.000Z',
      datasetPath: 'CUAD_v1',
      contractCount: 1,
      categoryCount: 1,
      methods: ['baseline', 'qbaf'],
      openai: { model: 'test', temperature: 0 },
      results: [
        {
          qaId: 'qa',
          contractTitle: 'C',
          category: 'Cat',
          label: true,
          method: 'baseline',
          predicted: null,
          error: 'x',
          evidenceSpansChecked: 0,
          evidenceSpansValid: 0,
          evidenceTokenOverlapF1: null,
          evidenceUnitCount: 0,
          evidenceGoldUnitCount: 0,
          minimalSufficiencyScore: null,
          authorityAppropriatenessRate: null,
        },
        {
          qaId: 'qa',
          contractTitle: 'C',
          category: 'Cat',
          label: true,
          method: 'qbaf',
          predicted: true,
          evidenceSpansChecked: 0,
          evidenceSpansValid: 0,
          evidenceTokenOverlapF1: null,
          evidenceUnitCount: 0,
          evidenceGoldUnitCount: 0,
          minimalSufficiencyScore: null,
          authorityAppropriatenessRate: null,
          traceHash: 'a'.repeat(64),
          traceReproducible: true,
          traceCompletenessRate: 1,
          counterargumentPresent: true,
          editSuitePassRate: 1,
        },
      ],
    };

    const summaries = summarize({ ...runBase, summaries: [] });
    const run: EvalRun = { ...runBase, summaries };
    const md = markdownReport(run);

    expect(md).toContain('Baseline completion: 0/1 (errors: 1)');
    expect(md).toContain('QBAF completion: 1/1 (errors: 0)');
  });
});
