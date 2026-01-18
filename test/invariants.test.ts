import type {
  ArgumentationFramework,
  EvaluatedFramework,
} from '../src/core/types.js';
import { createArgument } from '../src/core/Argument.js';
import { createFramework, createEvaluatedFramework } from '../src/core/ArgumentationFramework.js';
import { validateInvariants } from '../src/validators/validateInvariants.js';

describe('invariant validation', () => {
  test('passes invariants on a simple evaluated framework', () => {
    const root = createArgument('root', 0.6, { id: 'arg-root' });
    const framework = createFramework('arg-root', [root], []);
    const strengths = new Map([['arg-root', 0.6]]);
    const evaluated = createEvaluatedFramework(framework, strengths, 'df-quad', '2024-01-01T00:00:00Z');

    const results = validateInvariants(evaluated);
    const byInvariant = new Map(results.map(r => [r.invariant, r]));

    expect(byInvariant.get('ACYCLIC')?.passed).toBe(true);
    expect(byInvariant.get('CONNECTED')?.passed).toBe(true);
    expect(byInvariant.get('TREE_STRUCTURE')?.passed).toBe(true);
    expect(byInvariant.get('VALID_BASE_SCORES')?.passed).toBe(true);
    expect(byInvariant.get('VALID_COMPUTED_STRENGTHS')?.passed).toBe(true);
  });

  test('flags invalid base scores and computed strengths', () => {
    const framework: ArgumentationFramework = {
      rootClaimId: 'arg-root',
      arguments: [
        {
          id: 'arg-root',
          content: 'root',
          baseScore: 1.5,
          sourceRefs: [],
          assumptions: [],
        },
      ],
      relations: [],
    };

    const evaluated: EvaluatedFramework = {
      rootClaimId: framework.rootClaimId,
      arguments: [
        {
          id: 'arg-root',
          content: 'root',
          baseScore: 1.5,
          sourceRefs: [],
          assumptions: [],
          computedStrength: 1.2,
        },
      ],
      relations: [],
      semanticsUsed: 'df-quad',
      evaluatedAt: '2024-01-01T00:00:00Z',
    };

    const results = validateInvariants(evaluated);
    const byInvariant = new Map(results.map(r => [r.invariant, r]));

    expect(byInvariant.get('VALID_BASE_SCORES')?.passed).toBe(false);
    expect(byInvariant.get('VALID_COMPUTED_STRENGTHS')?.passed).toBe(false);
  });
});
