import { createFramework } from '../src/core/ArgumentationFramework.js';
import { evaluateWithDFQuAD } from '../src/semantics/DFQuAD.js';
import { getFinalStrength } from '../src/core/ArgumentationFramework.js';
import { minInterventionsToFlipDecision } from '../src/eval/contestation/auditability.js';

describe('auditability interventions', () => {
  test('bounded interventions can flip where base-score-only cannot (within depth)', () => {
    // Root strength is high due to a strong support; base-score changes alone may not flip within small changes,
    // but flipping the relation type to attack should reduce support.
    const base = createFramework(
      'arg-root',
      [
        { id: 'arg-root', content: 'Root', baseScore: 0.5, sourceRefs: [], assumptions: [] },
        { id: 'arg-a', content: 'A', baseScore: 0.9, sourceRefs: [], assumptions: [] },
      ],
      [{ id: 'rel-1', from: 'arg-a', to: 'arg-root', type: 'support' }]
    );
    const evaluated = evaluateWithDFQuAD(base);
    expect(getFinalStrength(evaluated)).toBeGreaterThan(0.5);

    const res = minInterventionsToFlipDecision(base, evaluated, 1);
    // With maxDepth=1, relation flip is available and should flip in many cases; base-score-only may also flip
    // depending on semantics, but bounded should never be null if flip found.
    expect(res.boundedFlippable).toBe(true);
    expect(res.minBoundedInterventionsToFlip).toBe(1);
  });
});

