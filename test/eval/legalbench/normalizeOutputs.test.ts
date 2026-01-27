import { normalizeLegalBenchOutput } from '../../../src/eval/legalbench/normalize.js';

describe('legalbench output normalization', () => {
  test('sara_numeric keeps already-correct outputs intact', () => {
    expect(normalizeLegalBenchOutput('sara_numeric', '2500')).toBe('2500');
  });

  test('sara_numeric extracts numeric value from formatted outputs', () => {
    expect(normalizeLegalBenchOutput('sara_numeric', '$2,500')).toBe('2500');
  });

  test('definition_extraction keeps already-correct outputs intact', () => {
    expect(normalizeLegalBenchOutput('definition_extraction', 'term1, term2')).toBe('term1, term2');
  });

  test('definition_extraction normalizes list delimiters', () => {
    expect(
      normalizeLegalBenchOutput('definition_extraction', 'Answer: term1; term2')
    ).toBe('term1, term2');
  });

  test('citation_prediction_open keeps already-correct outputs intact', () => {
    expect(normalizeLegalBenchOutput('citation_prediction_open', '21 U.S.C. 841')).toBe(
      '21 U.S.C. 841'
    );
  });

  test('citation_prediction_open strips prefix phrases', () => {
    expect(
      normalizeLegalBenchOutput(
        'citation_prediction_open',
        'The citation is 21 U.S.C. 841.'
      )
    ).toBe('21 U.S.C. 841');
  });
});
