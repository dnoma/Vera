import { krippendorffAlphaOrdinalSquared } from '../src/eval/human-review/iaa.js';

describe('inter-rater agreement', () => {
  test('alpha is 1 for perfect agreement', () => {
    const records = [
      { itemId: 'a', raterId: 'r1', value: 1 },
      { itemId: 'a', raterId: 'r2', value: 1 },
      { itemId: 'b', raterId: 'r1', value: 5 },
      { itemId: 'b', raterId: 'r2', value: 5 },
    ] as const;
    const alpha = krippendorffAlphaOrdinalSquared(records);
    expect(alpha).toBe(1);
  });

  test('alpha is low when raters systematically disagree', () => {
    const records = [
      { itemId: 'a', raterId: 'r1', value: 1 },
      { itemId: 'a', raterId: 'r2', value: 5 },
      { itemId: 'b', raterId: 'r1', value: 1 },
      { itemId: 'b', raterId: 'r2', value: 5 },
    ] as const;
    const alpha = krippendorffAlphaOrdinalSquared(records);
    expect(alpha).not.toBeNull();
    expect(alpha!).toBeLessThan(0.2);
  });
});

