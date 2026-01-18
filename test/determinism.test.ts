import { createArgument } from '../src/core/Argument.js';
import { createFramework } from '../src/core/ArgumentationFramework.js';
import { createAttack, createSupport } from '../src/core/Relation.js';
import { evaluateWithDFQuAD } from '../src/semantics/DFQuAD.js';
import { createToyAuditTrace } from '../src/examples/toy-case.js';
import { hash } from '../src/integrity/hash.js';

function strengthMap(framework: ReturnType<typeof evaluateWithDFQuAD>): Map<string, number> {
  return new Map(framework.arguments.map(arg => [arg.id, arg.computedStrength]));
}

describe('determinism', () => {
  test('DF-QuAD evaluation is deterministic across relation order', () => {
    const root = createArgument('Root', 0.6, { id: 'arg-a1' });
    const supporter = createArgument('Support', 0.7, { id: 'arg-b2' });
    const attacker = createArgument('Attack', 0.4, { id: 'arg-c3' });

    const supportRel = createSupport(supporter.id, root.id, 'rel-1');
    const attackRel = createAttack(attacker.id, root.id, 'rel-2');

    const frameworkA = createFramework(root.id, [root, supporter, attacker], [
      supportRel,
      attackRel,
    ]);
    const frameworkB = createFramework(root.id, [root, supporter, attacker], [
      attackRel,
      supportRel,
    ]);

    const evaluatedA = evaluateWithDFQuAD(frameworkA);
    const evaluatedB = evaluateWithDFQuAD(frameworkB);

    const mapA = strengthMap(evaluatedA);
    const mapB = strengthMap(evaluatedB);

    for (const [id, strength] of mapA.entries()) {
      const other = mapB.get(id);
      expect(other).toBeDefined();
      expect(strength).toBeCloseTo(other as number, 12);
    }
  });

  test('AuditTrace hashing is deterministic across source order', () => {
    const traceA = createToyAuditTrace({
      traceId: 'trace-0000aaaa',
      createdAt: '2024-01-01T00:00:00.000Z',
      sourceOrder: 'original',
    });
    const traceB = createToyAuditTrace({
      traceId: 'trace-0000aaaa',
      createdAt: '2024-01-01T00:00:00.000Z',
      sourceOrder: 'reversed',
    });

    expect(traceA.integrity.sourcesHash).toBe(traceB.integrity.sourcesHash);
    expect(traceA.integrity.traceHash).toBe(traceB.integrity.traceHash);
    expect(hash(traceA)).toBe(hash(traceB));
  });
});
