import {
  buildOneShotRagIndexFromTsv,
  formatOneShotDemo,
  selectBestOneShotDemo,
  tokenize,
} from '../../../src/eval/legalbench/oneShotRag.js';

describe('one-shot RAG (LegalBench)', () => {
  test('tokenize is deterministic and filters short tokens', () => {
    expect(tokenize('A! b cc ddd eeee')).toEqual(['ddd', 'eeee']);
  });

  test('selectBestOneShotDemo chooses highest overlap (tie-breaks by lower index)', () => {
    const tsv = [
      'index\tanswer\ttext',
      '0\tYES\tThe quick brown fox',
      '1\tNO\tThe quick red fox',
      '2\tMAYBE\tCompletely unrelated',
      '',
    ].join('\n');
    const idx = buildOneShotRagIndexFromTsv(tsv, 'demo_task');
    const demo = selectBestOneShotDemo(idx, 'quick brown');
    expect(demo?.trainId).toBe('demo_task-0');
    expect(demo?.answerText).toBe('YES');
  });

  test('formatOneShotDemo includes Q and A', () => {
    const demo = {
      trainId: 't-1',
      trainIndex: 0,
      score: 0.5,
      questionText: 'hello?',
      answerText: 'world',
    };
    expect(formatOneShotDemo(demo)).toContain('Q: hello?');
    expect(formatOneShotDemo(demo)).toContain('A: world');
  });
});

