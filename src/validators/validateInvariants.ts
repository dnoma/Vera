import type {
  ArgumentationFramework,
  EvaluatedFramework,
  InvariantCheckResult,
  InvariantName,
} from '../core/types.js';
import {
  isAcyclic,
  isConnected,
  isTreeStructure,
} from '../core/ArgumentationFramework.js';

function isEvaluatedFramework(
  input: ArgumentationFramework | EvaluatedFramework
): input is EvaluatedFramework {
  const record = input as unknown as Record<string, unknown>;
  return (
    typeof record['semanticsUsed'] === 'string' &&
    typeof record['evaluatedAt'] === 'string'
  );
}

function makeResult(
  invariant: InvariantName,
  passed: boolean,
  details?: string
): InvariantCheckResult {
  const result: InvariantCheckResult = {
    invariant,
    passed,
    ...(details ? { details } : {}),
  };

  return Object.freeze(result);
}

function validateBaseScores(
  framework: ArgumentationFramework
): InvariantCheckResult {
  const invalid = framework.arguments.filter(
    arg => arg.baseScore < 0 || arg.baseScore > 1
  );

  if (invalid.length === 0) {
    return makeResult('VALID_BASE_SCORES', true);
  }

  const ids = invalid.map(arg => arg.id).sort();
  return makeResult(
    'VALID_BASE_SCORES',
    false,
    `Invalid base scores for arguments: ${ids.join(', ')}`
  );
}

function validateComputedStrengths(
  framework: ArgumentationFramework | EvaluatedFramework
): InvariantCheckResult {
  if (!isEvaluatedFramework(framework)) {
    return makeResult('VALID_COMPUTED_STRENGTHS', true, 'No computed strengths');
  }

  const invalid = framework.arguments.filter(arg => {
    const strength = arg.computedStrength;
    return typeof strength !== 'number' || strength < 0 || strength > 1;
  });

  if (invalid.length === 0) {
    return makeResult('VALID_COMPUTED_STRENGTHS', true);
  }

  const ids = invalid.map(arg => arg.id).sort();
  return makeResult(
    'VALID_COMPUTED_STRENGTHS',
    false,
    `Invalid computed strengths for arguments: ${ids.join(', ')}`
  );
}

/**
 * Validates invariant properties over a framework.
 */
export function validateInvariants(
  input: ArgumentationFramework | EvaluatedFramework
): readonly InvariantCheckResult[] {
  const results = [
    makeResult('ACYCLIC', isAcyclic(input)),
    makeResult('CONNECTED', isConnected(input)),
    makeResult('TREE_STRUCTURE', isTreeStructure(input)),
    validateBaseScores(input),
    validateComputedStrengths(input),
  ];

  return Object.freeze(results);
}
