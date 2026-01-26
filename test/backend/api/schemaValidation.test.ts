import { validateAgainstSchema } from '../../../src/backend/api/validation/schemaValidator.js';

describe('backend-api schema validation', () => {
  test('citations/resolve request schema accepts valid payload', () => {
    const result = validateAgainstSchema('citations-resolve.request.schema.json', {
      rawCitation: '[2020] SGCA 1',
    });
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  test('citations/resolve request schema rejects missing rawCitation', () => {
    const result = validateAgainstSchema('citations-resolve.request.schema.json', {});
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  test('propositions/verify response schema enforces groundingOk guardrail', () => {
    const bad = validateAgainstSchema('propositions-verify.response.schema.json', {
      verdict: 'supported',
      supportSpans: [],
      counterSpans: [],
      confidence: 0.9,
      groundingOk: false,
    });
    expect(bad.valid).toBe(false);

    const good = validateAgainstSchema('propositions-verify.response.schema.json', {
      verdict: 'needs_context',
      supportSpans: [],
      counterSpans: [],
      confidence: 0.9,
      groundingOk: false,
    });
    expect(good.valid).toBe(true);
  });
});

