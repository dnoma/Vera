import { createHash } from 'crypto';

/**
 * Computes a deterministic SHA-256 hash of any value.
 *
 * The value is first serialized to a canonical JSON string
 * (sorted keys, no whitespace) before hashing.
 *
 * @param value - Any JSON-serializable value
 * @returns 64-character lowercase hex string
 *
 * @example
 * hash({ b: 2, a: 1 }) === hash({ a: 1, b: 2 }) // true (key order doesn't matter)
 */
export function hash(value: unknown): string {
  const canonical = canonicalize(value);
  return createHash('sha256').update(canonical, 'utf8').digest('hex');
}

/**
 * Computes a hash of multiple values combined.
 *
 * @param values - Array of values to hash together
 * @returns 64-character lowercase hex string
 */
export function hashMultiple(values: readonly unknown[]): string {
  return hash(values);
}

/**
 * Converts any value to a canonical JSON string.
 *
 * Properties:
 * - Object keys are sorted alphabetically (recursively)
 * - No whitespace
 * - Consistent handling of undefined (excluded from objects)
 * - Arrays maintain order
 *
 * @param value - Any JSON-serializable value
 * @returns Canonical JSON string
 */
export function canonicalize(value: unknown): string {
  return JSON.stringify(sortKeys(value));
}

/**
 * Recursively sorts object keys alphabetically.
 *
 * @param value - Any value
 * @returns Value with sorted keys (if object)
 */
function sortKeys(value: unknown): unknown {
  if (value === null || value === undefined) {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map(sortKeys);
  }

  if (typeof value === 'object') {
    const sorted: Record<string, unknown> = {};
    const keys = Object.keys(value as Record<string, unknown>).sort();
    for (const key of keys) {
      const v = (value as Record<string, unknown>)[key];
      if (v !== undefined) {
        sorted[key] = sortKeys(v);
      }
    }
    return sorted;
  }

  return value;
}

/**
 * Verifies that a value matches an expected hash.
 *
 * @param value - The value to verify
 * @param expectedHash - The expected SHA-256 hash
 * @returns true if hash matches, false otherwise
 */
export function verifyHash(value: unknown, expectedHash: string): boolean {
  return hash(value) === expectedHash.toLowerCase();
}
