import { randomUUID } from 'crypto';
import type {
  ArgumentationFramework,
  EvaluatedFramework,
  Contestation,
  RecomputeMetadata,
  TraceId,
  ArgumentId,
} from '../core/types.js';
import { getFinalStrength } from '../core/ArgumentationFramework.js';
import {
  DEFAULT_THRESHOLD,
  DEFAULT_INDETERMINATE_ZONE,
  computeLabelWithZone,
} from '../core/Decision.js';
import { evaluateWithDFQuAD } from '../semantics/DFQuAD.js';
import { applyContestation } from './apply.js';

/**
 * Generates a unique trace ID.
 */
export function generateTraceId(): TraceId {
  return `trace-${randomUUID()}`;
}

/**
 * Recomputes a framework after applying a contestation.
 * Returns the new evaluated framework and recompute metadata.
 */
export function recomputeFramework(
  originalFramework: ArgumentationFramework,
  originalEvaluated: EvaluatedFramework,
  contestation: Contestation
): {
  framework: EvaluatedFramework;
  metadata: RecomputeMetadata;
} {
  const modifiedFramework = applyContestation(originalFramework, contestation);
  const newEvaluated = evaluateWithDFQuAD(modifiedFramework);

  const originalStrength = getFinalStrength(originalEvaluated);
  const newStrength = getFinalStrength(newEvaluated);
  const strengthDelta = newStrength - originalStrength;

  const changedArgumentIds = findChangedArguments(
    originalEvaluated,
    newEvaluated,
    contestation
  );

  const originalDecision = computeLabelWithZone(
    originalStrength,
    DEFAULT_THRESHOLD,
    DEFAULT_INDETERMINATE_ZONE
  );
  const newDecision = computeLabelWithZone(
    newStrength,
    DEFAULT_THRESHOLD,
    DEFAULT_INDETERMINATE_ZONE
  );
  const decisionChanged = originalDecision !== newDecision;

  const diffSummary = generateDiffSummary(
    contestation,
    originalStrength,
    newStrength,
    decisionChanged
  );

  const metadata: RecomputeMetadata = Object.freeze({
    priorTraceId: generateTraceId(),
    triggeredBy: contestation.id,
    changedArgumentIds: Object.freeze(changedArgumentIds),
    recomputedAt: new Date().toISOString(),
    strengthDelta,
    decisionChanged,
    diffSummary,
  });

  return { framework: newEvaluated, metadata };
}

function findChangedArguments(
  original: EvaluatedFramework,
  modified: EvaluatedFramework,
  contestation: Contestation
): ArgumentId[] {
  const changed: ArgumentId[] = [];

  if (contestation.targetArgumentId) {
    changed.push(contestation.targetArgumentId);
  }

  if (contestation.newArgument?.id) {
    changed.push(contestation.newArgument.id);
  }

  const originalStrengths = new Map(
    original.arguments.map(a => [a.id, a.computedStrength])
  );

  for (const arg of modified.arguments) {
    const originalStrength = originalStrengths.get(arg.id);
    if (originalStrength !== undefined && originalStrength !== arg.computedStrength) {
      if (!changed.includes(arg.id)) {
        changed.push(arg.id);
      }
    }
  }

  return [...new Set(changed)].sort();
}

function generateDiffSummary(
  contestation: Contestation,
  originalStrength: number,
  newStrength: number,
  decisionChanged: boolean
): string {
  const delta = newStrength - originalStrength;
  const deltaStr = delta >= 0 ? `+${delta.toFixed(3)}` : delta.toFixed(3);

  let summary = `Contestation applied: ${contestation.type}. `;
  summary += `Strength: ${originalStrength.toFixed(3)} -> ${newStrength.toFixed(3)} (${deltaStr}). `;

  if (decisionChanged) {
    summary += 'Decision changed.';
  } else {
    summary += 'Decision unchanged.';
  }

  return summary;
}

/**
 * Validates that a contestation can be applied to a framework.
 */
export function validateContestation(
  framework: ArgumentationFramework,
  contestation: Contestation
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  switch (contestation.type) {
    case 'base_score_modification':
      if (!contestation.targetArgumentId) {
        errors.push('Missing targetArgumentId');
      } else {
        const arg = framework.arguments.find(a => a.id === contestation.targetArgumentId);
        if (!arg) {
          errors.push(`Target argument ${contestation.targetArgumentId} not found`);
        }
      }
      if (contestation.newBaseScore === undefined) {
        errors.push('Missing newBaseScore');
      } else if (contestation.newBaseScore < 0 || contestation.newBaseScore > 1) {
        errors.push('newBaseScore must be in [0,1]');
      }
      break;

    case 'argument_addition':
      if (!contestation.newArgument) {
        errors.push('Missing newArgument');
      }
      if (!contestation.newRelation) {
        errors.push('Missing newRelation');
      }
      if (contestation.newArgument?.id) {
        const exists = framework.arguments.some(a => a.id === contestation.newArgument!.id);
        if (exists) {
          errors.push(`Argument ${contestation.newArgument.id} already exists`);
        }
      }
      break;

    case 'argument_removal':
      if (!contestation.targetArgumentId) {
        errors.push('Missing targetArgumentId');
      } else if (contestation.targetArgumentId === framework.rootClaimId) {
        errors.push('Cannot remove root argument');
      }
      break;

    case 'relation_removal':
      if (!contestation.targetRelationId) {
        errors.push('Missing targetRelationId');
      } else {
        const rel = framework.relations.find(r => r.id === contestation.targetRelationId);
        if (!rel) {
          errors.push(`Target relation ${contestation.targetRelationId} not found`);
        }
      }
      break;

    case 'relation_addition':
      if (!contestation.newRelation) {
        errors.push('Missing newRelation');
      } else {
        const relExists = framework.relations.some(r => r.id === contestation.newRelation!.id);
        if (relExists) {
          errors.push(`Relation ${contestation.newRelation.id} already exists`);
        }
        const argIds = new Set(framework.arguments.map(a => a.id));
        if (!argIds.has(contestation.newRelation.from)) {
          errors.push(`Relation references unknown argument ${contestation.newRelation.from}`);
        }
        if (!argIds.has(contestation.newRelation.to)) {
          errors.push(`Relation references unknown argument ${contestation.newRelation.to}`);
        }
      }
      break;

    default:
      errors.push(`Unsupported contestation type: ${contestation.type}`);
      break;
  }

  return { valid: errors.length === 0, errors };
}
