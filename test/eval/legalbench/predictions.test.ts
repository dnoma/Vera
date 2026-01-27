import { buildLegalBenchPredictions } from '../../../src/eval/legalbench/predictions.js';
import type { LegalBenchEvalRun } from '../../../src/eval/legalbench/runner.js';

describe('legalbench predictions jsonl', () => {
  test('buildLegalBenchPredictions is deterministic and ordered by task/id', () => {
    const run: LegalBenchEvalRun = {
      runId: 'legalbench-abc',
      startedAt: '2026-01-01T00:00:00Z',
      finishedAt: '2026-01-01T00:00:10Z',
      datasetPath: 'data/legalbench',
      split: 'test',
      tasks: ['b', 'a'],
      promptMode: 'few-shot',
      normalizeOutputs: false,
      concurrency: 1,
      openai: { model: 'gpt-test', temperature: 0 },
      results: [
        {
          id: 'b-2',
          index: 2,
          task: 'b',
          goldAnswer: 'gold-b',
          predicted: 'pred-b',
        },
        {
          id: 'a-1',
          index: 1,
          task: 'a',
          goldAnswer: 'gold-a1',
          predicted: 'pred-a1',
        },
        {
          id: 'a-0',
          index: 0,
          task: 'a',
          goldAnswer: 'gold-a0',
          predicted: 'pred-a0',
        },
      ],
      taskSummaries: [],
      overall: { total: 3, predicted: 3, macroScore: null },
    };

    const rows = buildLegalBenchPredictions(run);
    expect(rows.map(r => `${r.task}:${r.id}`)).toEqual(['a:0', 'a:1', 'b:2']);
    expect(rows[0]?.prediction).toBe('pred-a0');
    expect(rows[0]?.split).toBe('test');
  });
});
