import type {
  ArgumentationFramework,
  EvaluatedFramework,
  ValidationError,
  ValidationResult,
} from '../core/types.js';
import {
  getArgument,
  isAcyclic,
  isConnected,
} from '../core/ArgumentationFramework.js';
import { sortByKey } from '../integrity/ordering.js';

type FrameworkLike = ArgumentationFramework | EvaluatedFramework;

function createError(
  code: string,
  message: string,
  path?: string
): ValidationError {
  const base = {
    code,
    message,
    severity: 'error' as const,
  };
  if (path !== undefined) {
    return { ...base, path };
  }
  return base;
}

/**
 * Validates an argumentation framework and returns structured errors.
 */
export function validateFramework(framework: FrameworkLike): ValidationResult {
  const errors: ValidationError[] = [];

  const root = getArgument(framework, framework.rootClaimId);
  if (!root) {
    errors.push(
      createError(
        'ROOT_NOT_FOUND',
        `Root argument ${framework.rootClaimId} not found`,
        'rootClaimId'
      )
    );
  }

  const sortedArguments = sortByKey(framework.arguments, 'id');
  const sortedRelations = sortByKey(framework.relations, 'id');
  const argumentIds = new Set(sortedArguments.map(arg => arg.id));

  for (const rel of sortedRelations) {
    if (!argumentIds.has(rel.from)) {
      errors.push(
        createError(
          'UNKNOWN_ARGUMENT',
          `Relation ${rel.id} references unknown argument ${rel.from}`,
          `relations[id=${rel.id}].from`
        )
      );
    }
    if (!argumentIds.has(rel.to)) {
      errors.push(
        createError(
          'UNKNOWN_ARGUMENT',
          `Relation ${rel.id} references unknown argument ${rel.to}`,
          `relations[id=${rel.id}].to`
        )
      );
    }
  }

  for (const arg of sortedArguments) {
    if (arg.baseScore < 0 || arg.baseScore > 1) {
      errors.push(
        createError(
          'INVALID_BASE_SCORE',
          `Argument ${arg.id} has invalid baseScore: ${arg.baseScore}`,
          `arguments[id=${arg.id}].baseScore`
        )
      );
    }
    if (arg.computedStrength !== undefined) {
      if (arg.computedStrength < 0 || arg.computedStrength > 1) {
        errors.push(
          createError(
            'INVALID_COMPUTED_STRENGTH',
            `Argument ${arg.id} has invalid computedStrength: ${arg.computedStrength}`,
            `arguments[id=${arg.id}].computedStrength`
          )
        );
      }
    }
  }

  for (const arg of sortedArguments) {
    if (arg.id === framework.rootClaimId) continue;
    const outgoing = sortedRelations.filter(rel => rel.from === arg.id);
    if (outgoing.length !== 1) {
      errors.push(
        createError(
          'INVALID_TREE_DEGREE',
          `Argument ${arg.id} must have exactly one outgoing relation`,
          `arguments[id=${arg.id}]`
        )
      );
    }
  }

  if (!isAcyclic(framework)) {
    errors.push(
      createError('FRAMEWORK_CYCLE', 'Framework contains cycles', 'relations')
    );
  }

  if (!isConnected(framework)) {
    errors.push(
      createError(
        'FRAMEWORK_DISCONNECTED',
        'Framework has disconnected arguments',
        'arguments'
      )
    );
  }

  return {
    valid: errors.length === 0,
    errors,
    checkedAt: new Date().toISOString(),
  };
}
