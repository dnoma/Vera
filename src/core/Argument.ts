import { randomUUID } from 'crypto';
import type { Argument, ArgumentId, SourceId, Assumption } from './types.js';

/**
 * Generates a unique argument ID.
 */
export function generateArgumentId(): ArgumentId {
  return `arg-${randomUUID()}`;
}

/**
 * Creates a new Argument.
 *
 * @param content - The argument content/statement
 * @param baseScore - Intrinsic strength τ(α) ∈ [0,1]
 * @param options - Optional fields
 */
export function createArgument(
  content: string,
  baseScore: number,
  options: {
    id?: ArgumentId;
    sourceRefs?: readonly SourceId[];
    assumptions?: readonly Assumption[];
    computedStrength?: number;
  } = {}
): Argument {
  if (baseScore < 0 || baseScore > 1) {
    throw new Error(`baseScore must be in [0,1], got ${baseScore}`);
  }
  if (options.computedStrength !== undefined) {
    if (options.computedStrength < 0 || options.computedStrength > 1) {
      throw new Error(
        `computedStrength must be in [0,1], got ${options.computedStrength}`
      );
    }
  }

  const base: Argument = {
    id: options.id ?? generateArgumentId(),
    content,
    baseScore,
    sourceRefs: Object.freeze(options.sourceRefs ?? []),
    assumptions: Object.freeze(options.assumptions ?? []),
  };

  if (options.computedStrength !== undefined) {
    return Object.freeze({
      ...base,
      computedStrength: options.computedStrength,
    }) as Argument;
  }

  return Object.freeze(base) as Argument;
}

/**
 * Creates an Argument with a computed strength (for evaluated frameworks).
 */
export function withComputedStrength(
  argument: Argument,
  computedStrength: number
): Argument & { readonly computedStrength: number } {
  if (computedStrength < 0 || computedStrength > 1) {
    throw new Error(`computedStrength must be in [0,1], got ${computedStrength}`);
  }
  return Object.freeze({
    ...argument,
    computedStrength,
  }) as Argument & { readonly computedStrength: number };
}

/**
 * Creates an Assumption.
 */
export function createAssumption(
  statement: string,
  basis: string,
  isContestable: boolean = true,
  id?: string
): Assumption {
  return Object.freeze({
    id: id ?? `assumption-${randomUUID()}`,
    statement,
    basis,
    isContestable,
  });
}

/**
 * Validates an argument has required fields and valid scores.
 */
export function isValidArgument(arg: unknown): arg is Argument {
  if (typeof arg !== 'object' || arg === null) return false;
  const a = arg as Record<string, unknown>;
  return (
    typeof a['id'] === 'string' &&
    typeof a['content'] === 'string' &&
    typeof a['baseScore'] === 'number' &&
    a['baseScore'] >= 0 &&
    a['baseScore'] <= 1 &&
    Array.isArray(a['sourceRefs']) &&
    Array.isArray(a['assumptions'])
  );
}
