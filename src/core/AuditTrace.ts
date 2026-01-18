import { randomUUID } from 'crypto';
import type {
  ArgumentationFramework,
  AuditTrace,
  Claim,
  Contestation,
  Decision,
  EvaluatedFramework,
  HumanReview,
  IntegrityFields,
  Limitations,
  RecomputeMetadata,
  Source,
  Timestamp,
  TraceId,
  Uncertainty,
  Version,
} from './types.js';
import { hash } from '../integrity/hash.js';
import { deepFreeze, sortByKey } from '../integrity/ordering.js';
import { evaluateWithDFQuAD } from '../semantics/DFQuAD.js';
import { validateFramework } from '../validators/validateFramework.js';

export interface AuditTraceInput {
  readonly traceId?: TraceId;
  readonly version: Version;
  readonly createdAt?: Timestamp;
  readonly claim: Claim;
  readonly framework: ArgumentationFramework | EvaluatedFramework;
  readonly sources: readonly Source[];
  readonly decision: Decision;
  readonly uncertainty: Uncertainty;
  readonly limitations: Limitations;
  readonly contestation?: Contestation;
  readonly recomputeMetadata?: RecomputeMetadata;
  readonly humanReview?: HumanReview;
}

type TraceBase = Omit<
  AuditTrace,
  'integrity' | 'contestation' | 'recomputeMetadata' | 'humanReview'
>;

function isEvaluatedFramework(
  framework: ArgumentationFramework | EvaluatedFramework
): framework is EvaluatedFramework {
  return 'semanticsUsed' in framework && 'evaluatedAt' in framework;
}

function assertScoreRange(value: number, label: string): void {
  if (value < 0 || value > 1) {
    throw new Error(`${label} must be in [0,1], got ${value}`);
  }
}

function ensureRequired(input: AuditTraceInput): void {
  if (!input.claim) {
    throw new Error('claim is required');
  }
  if (!input.framework) {
    throw new Error('framework is required');
  }
  if (!input.sources) {
    throw new Error('sources is required');
  }
  if (!input.decision) {
    throw new Error('decision is required');
  }
  if (!input.uncertainty) {
    throw new Error('uncertainty is required');
  }
  if (!input.limitations) {
    throw new Error('limitations is required');
  }
  if (!input.version) {
    throw new Error('version is required');
  }
}

function validateScores(framework: EvaluatedFramework | ArgumentationFramework): void {
  for (const arg of framework.arguments) {
    assertScoreRange(arg.baseScore, `Argument ${arg.id} baseScore`);
    if (arg.computedStrength !== undefined) {
      assertScoreRange(
        arg.computedStrength,
        `Argument ${arg.id} computedStrength`
      );
    }
  }
}

/**
 * Generates a unique audit trace ID.
 */
export function generateTraceId(): TraceId {
  return `trace-${randomUUID()}`;
}

/**
 * Creates a complete AuditTrace with deterministic integrity hashes.
 */
export function createAuditTrace(input: AuditTraceInput): AuditTrace {
  ensureRequired(input);

  const evaluatedFramework = isEvaluatedFramework(input.framework)
    ? input.framework
    : evaluateWithDFQuAD(input.framework);

  validateScores(evaluatedFramework);
  assertScoreRange(input.decision.finalStrength, 'Decision finalStrength');
  assertScoreRange(input.decision.threshold, 'Decision threshold');

  const frameworkValidation = validateFramework(evaluatedFramework);
  if (!frameworkValidation.valid) {
    const message = frameworkValidation.errors
      .map(err => `${err.code}: ${err.message}`)
      .join('; ');
    throw new Error(`Framework validation failed: ${message}`);
  }

  const sourcesSorted = sortByKey(input.sources, 'id');
  const usedSourceIds = new Set<string>();
  for (const arg of evaluatedFramework.arguments) {
    for (const sourceId of arg.sourceRefs) {
      usedSourceIds.add(sourceId);
    }
  }

  const unusedSourceIds = sourcesSorted
    .map(source => source.id)
    .filter(sourceId => !usedSourceIds.has(sourceId));

  const base: TraceBase = {
    traceId: input.traceId ?? generateTraceId(),
    version: input.version,
    createdAt: input.createdAt ?? new Date().toISOString(),
    claim: input.claim,
    framework: evaluatedFramework,
    sources: sourcesSorted,
    unusedSourceIds,
    decision: input.decision,
    uncertainty: input.uncertainty,
    limitations: input.limitations,
  };

  let traceWithoutIntegrity: Omit<AuditTrace, 'integrity'> = base;
  if (input.contestation !== undefined) {
    traceWithoutIntegrity = {
      ...traceWithoutIntegrity,
      contestation: input.contestation,
    };
  }
  if (input.recomputeMetadata !== undefined) {
    traceWithoutIntegrity = {
      ...traceWithoutIntegrity,
      recomputeMetadata: input.recomputeMetadata,
    };
  }
  if (input.humanReview !== undefined) {
    traceWithoutIntegrity = {
      ...traceWithoutIntegrity,
      humanReview: input.humanReview,
    };
  }

  const integrity: IntegrityFields = {
    claimHash: hash(input.claim),
    frameworkHash: hash(evaluatedFramework),
    sourcesHash: hash(sourcesSorted),
    uncertaintyHash: hash(input.uncertainty),
    traceHash: hash(traceWithoutIntegrity),
  };

  const auditTrace: AuditTrace = {
    ...traceWithoutIntegrity,
    integrity,
  };

  return deepFreeze(auditTrace);
}
