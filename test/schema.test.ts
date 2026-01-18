import { createToyAuditTrace } from '../src/examples/toy-case.js';
import { validateAuditTrace } from '../src/validators/validateAuditTrace.js';

describe('schema validation', () => {
  test('toy audit trace validates against schema', () => {
    const trace = createToyAuditTrace();
    const result = validateAuditTrace(trace);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  test('invalid audit trace is rejected by schema', () => {
    const trace = createToyAuditTrace();
    const invalid = {
      ...trace,
      traceId: 'bad-trace-id',
    } as unknown as typeof trace;

    const result = validateAuditTrace(invalid);
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });
});
