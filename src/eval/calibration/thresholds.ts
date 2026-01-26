import { DEFAULT_THRESHOLD } from '../../core/Decision.js';

export type LearnedThresholds = Record<string, number>;

/**
 * Learned per-task thresholds from the calibration split.
 *
 * Keys should be stable task identifiers (e.g. LegalBench task name, CUAD category).
 * Values must be in [0,1].
 */
export const LEARNED_THRESHOLDS: LearnedThresholds = Object.freeze({});

export function getLearnedThreshold(
  key: string,
  fallback: number = DEFAULT_THRESHOLD
): number {
  const threshold = LEARNED_THRESHOLDS[key] ?? fallback;
  if (threshold < 0 || threshold > 1) {
    throw new Error(
      `Learned threshold for "${key}" must be in [0,1], got ${threshold}`
    );
  }
  return threshold;
}

