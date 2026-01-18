import type { AuditTrace, ArgumentationFramework } from '../core/types.js';
import { createClaim } from '../core/Claim.js';
import { createArgument } from '../core/Argument.js';
import {
  createEvaluatedFramework,
  createFramework,
  getFinalStrength,
} from '../core/ArgumentationFramework.js';
import { createAttack, createSupport } from '../core/Relation.js';
import { createSource, createSourceMetadata } from '../core/Source.js';
import { createDecisionFromStrength } from '../core/Decision.js';
import { createMinimalUncertainty } from '../core/Uncertainty.js';
import { evaluateWithDFQuAD } from '../semantics/DFQuAD.js';
import { createAuditTrace } from '../core/AuditTrace.js';
import { hash } from '../integrity/hash.js';

export interface ToyCaseOptions {
  readonly traceId?: string;
  readonly createdAt?: string;
  readonly sourceOrder?: 'original' | 'reversed';
}

export function buildToyFramework(): ArgumentationFramework {
  const root = createArgument('Approve the request.', 0.6, {
    id: 'arg-a1',
    sourceRefs: ['src-1111'],
  });
  const support = createArgument('Evidence supports approval.', 0.7, {
    id: 'arg-b2',
    sourceRefs: ['src-1111'],
  });
  const attack = createArgument('Policy warns against approval.', 0.4, {
    id: 'arg-c3',
    sourceRefs: ['src-2222'],
  });
  const counter = createArgument('Exception applies to the policy.', 0.8, {
    id: 'arg-d4',
    sourceRefs: ['src-2222'],
  });

  const relations = [
    createSupport(support.id, root.id, 'rel-1'),
    createAttack(attack.id, root.id, 'rel-2'),
    createSupport(counter.id, attack.id, 'rel-3'),
  ];

  return createFramework(root.id, [root, support, attack, counter], relations);
}

export function createToyAuditTrace(options: ToyCaseOptions = {}): AuditTrace {
  const claim = createClaim(
    'The system should approve the request.',
    'Synthetic example for Vera.',
    'claim-aaaa1111',
    '2024-01-01T00:00:00.000Z'
  );

  const sources = [
    createSource(
      'Mock policy excerpt',
      'Synthetic policy statement.',
      hash('policy-1'),
      createSourceMetadata('policy', {
        version: '1.0.0',
        jurisdiction: 'synthetic',
        tags: ['toy', 'policy'],
      }),
      { id: 'src-1111', retrievedAt: '2024-01-01T00:00:00.000Z' }
    ),
    createSource(
      'Mock guidance memo',
      'Synthetic guidance statement.',
      hash('guidance-1'),
      createSourceMetadata('guidance', {
        version: '1.0.0',
        jurisdiction: 'synthetic',
        tags: ['toy', 'guidance'],
      }),
      { id: 'src-2222', retrievedAt: '2024-01-01T00:00:00.000Z' }
    ),
  ];

  const orderedSources =
    options.sourceOrder === 'reversed' ? [...sources].reverse() : sources;

  const framework = buildToyFramework();
  const evaluatedAt = '2024-01-01T00:00:00.000Z';
  const evaluatedRaw = evaluateWithDFQuAD(framework);
  const strengths = new Map(
    evaluatedRaw.arguments.map(arg => [arg.id, arg.computedStrength])
  );
  const evaluated = createEvaluatedFramework(
    framework,
    strengths,
    'df-quad',
    evaluatedAt
  );
  const finalStrength = getFinalStrength(evaluated);
  const decision = createDecisionFromStrength(finalStrength, claim.statement);

  return createAuditTrace({
    traceId: options.traceId ?? 'trace-0000aaaa',
    version: '0.1.0',
    createdAt: options.createdAt ?? '2024-01-01T00:00:00.000Z',
    claim,
    framework: evaluated,
    sources: orderedSources,
    decision,
    uncertainty: createMinimalUncertainty(
      'High confidence based on the synthetic evidence.'
    ),
    limitations: {
      scopeLimitations: ['Synthetic toy case only.'],
      temporalLimitations: ['Static example.'],
      sourceLimitations: ['Mock sources only.'],
      methodLimitations: ['DF-QuAD only.'],
    },
  });
}
