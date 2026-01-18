import type {
  ArgumentationFramework,
  EvaluatedFramework,
  ArgumentId,
  SemanticsType,
} from '../core/types.js';

export type { SemanticsType } from '../core/types.js';

/**
 * Interface for gradual semantics implementations.
 */
export interface GradualSemantics {
  readonly type: SemanticsType;

  /**
   * Evaluates the framework and computes strengths for all arguments.
   * Returns an EvaluatedFramework with computedStrength set for each argument.
   */
  evaluate(framework: ArgumentationFramework): EvaluatedFramework;

  /**
   * Computes the strength of a single argument given its inputs.
   * Used internally and for testing.
   */
  computeStrength(
    baseScore: number,
    attackerStrengths: readonly number[],
    supporterStrengths: readonly number[]
  ): number;
}

/**
 * Result of evaluating a single argument.
 */
export interface ArgumentEvaluation {
  readonly argumentId: ArgumentId;
  readonly baseScore: number;
  readonly computedStrength: number;
  readonly attackerStrengths: readonly number[];
  readonly supporterStrengths: readonly number[];
}
