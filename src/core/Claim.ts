import { randomUUID } from 'crypto';
import type { Claim, ClaimId, Timestamp } from './types.js';

/**
 * Generates a unique claim ID.
 */
export function generateClaimId(): ClaimId {
  return `claim-${randomUUID()}`;
}

/**
 * Creates a new Claim.
 *
 * @param statement - The claim statement being evaluated
 * @param context - Context or background for the claim
 * @param id - Optional custom ID (generates one if not provided)
 * @param createdAt - Optional timestamp (uses current time if not provided)
 */
export function createClaim(
  statement: string,
  context: string,
  id?: ClaimId,
  createdAt?: Timestamp
): Claim {
  return Object.freeze({
    id: id ?? generateClaimId(),
    statement,
    context,
    createdAt: createdAt ?? new Date().toISOString(),
  });
}

/**
 * Validates a claim has required fields.
 */
export function isValidClaim(claim: unknown): claim is Claim {
  if (typeof claim !== 'object' || claim === null) return false;
  const c = claim as Record<string, unknown>;
  return (
    typeof c['id'] === 'string' &&
    typeof c['statement'] === 'string' &&
    typeof c['context'] === 'string' &&
    typeof c['createdAt'] === 'string' &&
    c['statement'].length > 0
  );
}
