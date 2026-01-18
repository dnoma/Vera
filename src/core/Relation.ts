import { randomUUID } from 'crypto';
import type { Relation, RelationId, ArgumentId, RelationType } from './types.js';

/**
 * Generates a unique relation ID.
 */
export function generateRelationId(): RelationId {
  return `rel-${randomUUID()}`;
}

/**
 * Creates an attack relation (from undermines to).
 */
export function createAttack(
  from: ArgumentId,
  to: ArgumentId,
  id?: RelationId
): Relation {
  return Object.freeze({
    id: id ?? generateRelationId(),
    from,
    to,
    type: 'attack' as RelationType,
  });
}

/**
 * Creates a support relation (from strengthens to).
 */
export function createSupport(
  from: ArgumentId,
  to: ArgumentId,
  id?: RelationId
): Relation {
  return Object.freeze({
    id: id ?? generateRelationId(),
    from,
    to,
    type: 'support' as RelationType,
  });
}

/**
 * Creates a relation with explicit type.
 */
export function createRelation(
  from: ArgumentId,
  to: ArgumentId,
  type: RelationType,
  id?: RelationId
): Relation {
  return Object.freeze({
    id: id ?? generateRelationId(),
    from,
    to,
    type,
  });
}

/**
 * Checks if a relation is an attack.
 */
export function isAttack(relation: Relation): boolean {
  return relation.type === 'attack';
}

/**
 * Checks if a relation is a support.
 */
export function isSupport(relation: Relation): boolean {
  return relation.type === 'support';
}

/**
 * Validates a relation has required fields.
 */
export function isValidRelation(rel: unknown): rel is Relation {
  if (typeof rel !== 'object' || rel === null) return false;
  const r = rel as Record<string, unknown>;
  return (
    typeof r['id'] === 'string' &&
    typeof r['from'] === 'string' &&
    typeof r['to'] === 'string' &&
    (r['type'] === 'attack' || r['type'] === 'support')
  );
}
