import type {
  Decision,
  DecisionLabel,
} from './types.js';

/**
 * Default threshold for decision labeling.
 * Claims with finalStrength > threshold are 'supported'.
 * Claims with finalStrength < (1 - threshold) are 'contested'.
 * Otherwise 'indeterminate'.
 */
export const DEFAULT_THRESHOLD = 0.5;

/**
 * Indeterminate zone width around 0.5.
 * Used for more nuanced three-way decisions.
 */
export const DEFAULT_INDETERMINATE_ZONE = 0.1;

/**
 * Computes a decision label from a final strength value.
 *
 * Simple binary decision:
 * - strength > threshold -> 'supported'
 * - strength <= threshold -> 'contested'
 *
 * @param finalStrength - The computed strength sigma(root) in [0,1]
 * @param threshold - Decision threshold (default 0.5)
 */
export function computeLabel(
  finalStrength: number,
  threshold: number = DEFAULT_THRESHOLD
): DecisionLabel {
  if (finalStrength < 0 || finalStrength > 1) {
    throw new Error(`finalStrength must be in [0,1], got ${finalStrength}`);
  }
  if (threshold < 0 || threshold > 1) {
    throw new Error(`threshold must be in [0,1], got ${threshold}`);
  }

  return finalStrength > threshold ? 'supported' : 'contested';
}

/**
 * Computes a three-way decision label with an indeterminate zone.
 *
 * - strength > (threshold + zone/2) -> 'supported'
 * - strength < (threshold - zone/2) -> 'contested'
 * - otherwise -> 'indeterminate'
 *
 * @param finalStrength - The computed strength sigma(root) in [0,1]
 * @param threshold - Center of the decision boundary (default 0.5)
 * @param indeterminateZone - Width of indeterminate zone (default 0.1)
 */
export function computeLabelWithZone(
  finalStrength: number,
  threshold: number = DEFAULT_THRESHOLD,
  indeterminateZone: number = DEFAULT_INDETERMINATE_ZONE
): DecisionLabel {
  if (finalStrength < 0 || finalStrength > 1) {
    throw new Error(`finalStrength must be in [0,1], got ${finalStrength}`);
  }

  const upperBound = threshold + indeterminateZone / 2;
  const lowerBound = threshold - indeterminateZone / 2;

  if (finalStrength > upperBound) {
    return 'supported';
  } else if (finalStrength < lowerBound) {
    return 'contested';
  } else {
    return 'indeterminate';
  }
}

/**
 * Generates a conclusion string based on the decision label.
 */
export function generateConclusion(
  label: DecisionLabel,
  claimStatement: string
): string {
  switch (label) {
    case 'supported':
      return `The claim "${claimStatement}" is supported by the argumentation framework.`;
    case 'contested':
      return `The claim "${claimStatement}" is contested by the argumentation framework.`;
    case 'indeterminate':
      return `The claim "${claimStatement}" has indeterminate support in the argumentation framework.`;
  }
}

/**
 * Creates a Decision object.
 *
 * @param finalStrength - The computed strength sigma(root) in [0,1]
 * @param conclusion - Human-readable conclusion
 * @param threshold - Decision threshold used (default 0.5)
 * @param conditions - Optional conditions qualifying the decision
 */
export function createDecision(
  finalStrength: number,
  conclusion: string,
  threshold: number = DEFAULT_THRESHOLD,
  conditions?: readonly string[]
): Decision {
  const label = computeLabel(finalStrength, threshold);

  const base: Decision = {
    label,
    finalStrength,
    threshold,
    conclusion,
  };

  if (conditions) {
    return Object.freeze({
      ...base,
      conditions: Object.freeze([...conditions]),
    }) as Decision;
  }

  return Object.freeze(base) as Decision;
}

/**
 * Creates a Decision with auto-generated conclusion.
 *
 * @param finalStrength - The computed strength sigma(root) in [0,1]
 * @param claimStatement - The claim statement for conclusion generation
 * @param threshold - Decision threshold (default 0.5)
 * @param useZone - Whether to use three-way labeling (default false)
 */
export function createDecisionFromStrength(
  finalStrength: number,
  claimStatement: string,
  threshold: number = DEFAULT_THRESHOLD,
  useZone: boolean = false
): Decision {
  const label = useZone
    ? computeLabelWithZone(finalStrength, threshold)
    : computeLabel(finalStrength, threshold);

  const conclusion = generateConclusion(label, claimStatement);

  return Object.freeze({
    label,
    finalStrength,
    threshold,
    conclusion,
  }) as Decision;
}

/**
 * Checks if a decision indicates support for the claim.
 */
export function isSupported(decision: Decision): boolean {
  return decision.label === 'supported';
}

/**
 * Checks if a decision indicates the claim is contested.
 */
export function isContested(decision: Decision): boolean {
  return decision.label === 'contested';
}

/**
 * Checks if a decision is indeterminate.
 */
export function isIndeterminate(decision: Decision): boolean {
  return decision.label === 'indeterminate';
}

/**
 * Computes the confidence level of a decision.
 * Returns how far the strength is from the threshold (0 = at threshold, 0.5 = max).
 */
export function getConfidenceLevel(decision: Decision): number {
  return Math.abs(decision.finalStrength - decision.threshold);
}

/**
 * Validates a decision object.
 */
export function isValidDecision(dec: unknown): dec is Decision {
  if (typeof dec !== 'object' || dec === null) return false;
  const d = dec as Record<string, unknown>;
  return (
    (d['label'] === 'supported' ||
      d['label'] === 'contested' ||
      d['label'] === 'indeterminate') &&
    typeof d['finalStrength'] === 'number' &&
    d['finalStrength'] >= 0 &&
    d['finalStrength'] <= 1 &&
    typeof d['threshold'] === 'number' &&
    d['threshold'] >= 0 &&
    d['threshold'] <= 1 &&
    typeof d['conclusion'] === 'string'
  );
}
