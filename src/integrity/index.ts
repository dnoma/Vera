/**
 * Integrity utilities for deterministic hashing and stable ordering.
 *
 * These utilities ensure that audit traces are:
 * - Deterministic: Same input always produces same output
 * - Verifiable: Hashes can be recomputed and compared
 * - Immutable: Deep freezing prevents accidental mutation
 *
 * @module integrity
 */

export {
  hash,
  hashMultiple,
  canonicalize,
  verifyHash,
} from './hash.js';

export {
  byKey,
  byKeys,
  sortBy,
  sortByKey,
  stableSort,
  groupBy,
  unique,
  deepFreeze,
  type Comparator,
} from './ordering.js';
