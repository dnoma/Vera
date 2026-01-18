/**
 * Comparator function type for sorting.
 */
export type Comparator<T> = (a: T, b: T) => number;

/**
 * Creates a comparator that sorts by a specific key.
 *
 * @param key - The key to sort by
 * @returns Comparator function
 *
 * @example
 * const items = [{ id: 'b' }, { id: 'a' }];
 * items.sort(byKey('id')); // [{ id: 'a' }, { id: 'b' }]
 */
export function byKey<T, K extends keyof T>(key: K): Comparator<T> {
  return (a: T, b: T): number => {
    const aVal = a[key];
    const bVal = b[key];

    if (aVal < bVal) return -1;
    if (aVal > bVal) return 1;
    return 0;
  };
}

/**
 * Creates a comparator that sorts by multiple keys in order.
 *
 * @param keys - The keys to sort by, in priority order
 * @returns Comparator function
 *
 * @example
 * const items = [{ a: 1, b: 2 }, { a: 1, b: 1 }];
 * items.sort(byKeys('a', 'b')); // [{ a: 1, b: 1 }, { a: 1, b: 2 }]
 */
export function byKeys<T>(...keys: (keyof T)[]): Comparator<T> {
  return (a: T, b: T): number => {
    for (const key of keys) {
      const aVal = a[key];
      const bVal = b[key];
      if (aVal < bVal) return -1;
      if (aVal > bVal) return 1;
    }
    return 0;
  };
}

/**
 * Returns a new array sorted by the given comparator.
 * Does not mutate the original array.
 *
 * @param array - The array to sort
 * @param comparator - The comparator function
 * @returns New sorted array
 */
export function sortBy<T>(
  array: readonly T[],
  comparator: Comparator<T>
): readonly T[] {
  return [...array].sort(comparator);
}

/**
 * Returns a new array sorted by a specific key.
 * Does not mutate the original array.
 *
 * @param array - The array to sort
 * @param key - The key to sort by
 * @returns New sorted array
 */
export function sortByKey<T, K extends keyof T>(
  array: readonly T[],
  key: K
): readonly T[] {
  return sortBy(array, byKey(key));
}

/**
 * Stable sort that preserves order of equal elements.
 * Uses the index as a tiebreaker.
 *
 * @param array - The array to sort
 * @param comparator - The comparator function
 * @returns New sorted array with stable ordering
 */
export function stableSort<T>(
  array: readonly T[],
  comparator: Comparator<T>
): readonly T[] {
  const indexed = array.map((item, index) => ({ item, index }));
  indexed.sort((a, b) => {
    const result = comparator(a.item, b.item);
    if (result !== 0) return result;
    return a.index - b.index; // Stable: preserve original order for equal elements
  });
  return indexed.map(({ item }) => item);
}

/**
 * Groups array elements by a key function.
 * Returns a Map with deterministic iteration order (sorted keys).
 *
 * @param array - The array to group
 * @param keyFn - Function to extract the grouping key
 * @returns Map from key to array of elements
 */
export function groupBy<T, K extends string | number>(
  array: readonly T[],
  keyFn: (item: T) => K
): Map<K, readonly T[]> {
  const groups = new Map<K, T[]>();

  for (const item of array) {
    const key = keyFn(item);
    const existing = groups.get(key);
    if (existing) {
      existing.push(item);
    } else {
      groups.set(key, [item]);
    }
  }

  // Return with sorted keys for determinism
  const sortedKeys = [...groups.keys()].sort();
  const result = new Map<K, readonly T[]>();
  for (const key of sortedKeys) {
    result.set(key, groups.get(key)!);
  }

  return result;
}

/**
 * Returns unique elements from an array, preserving first occurrence order.
 *
 * @param array - The array to deduplicate
 * @param keyFn - Optional function to extract uniqueness key
 * @returns New array with unique elements
 */
export function unique<T>(
  array: readonly T[],
  keyFn?: (item: T) => unknown
): readonly T[] {
  const seen = new Set<unknown>();
  const result: T[] = [];

  for (const item of array) {
    const key = keyFn ? keyFn(item) : item;
    if (!seen.has(key)) {
      seen.add(key);
      result.push(item);
    }
  }

  return result;
}

/**
 * Deep freezes an object to prevent mutation.
 * Returns the same object (now frozen).
 *
 * @param obj - The object to freeze
 * @returns The frozen object
 */
export function deepFreeze<T>(obj: T): Readonly<T> {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }

  Object.freeze(obj);

  for (const key of Object.keys(obj)) {
    const value = (obj as Record<string, unknown>)[key];
    if (value !== null && typeof value === 'object' && !Object.isFrozen(value)) {
      deepFreeze(value);
    }
  }

  return obj as Readonly<T>;
}
