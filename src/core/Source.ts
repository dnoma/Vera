import { randomUUID } from 'crypto';
import type {
  Source,
  SourceId,
  SourceMetadata,
  SourceType,
  ContentHash,
  Timestamp,
  Version,
} from './types.js';

/**
 * Generates a unique source ID.
 */
export function generateSourceId(): SourceId {
  return `src-${randomUUID()}`;
}

/**
 * Creates source metadata.
 */
export function createSourceMetadata(
  type: SourceType,
  options: {
    version?: Version;
    effectiveDate?: Timestamp;
    expirationDate?: Timestamp;
    jurisdiction?: string;
    tags?: readonly string[];
  } = {}
): SourceMetadata {
  const metadata: SourceMetadata = {
    type,
    tags: Object.freeze(options.tags ?? []),
    ...(options.version !== undefined ? { version: options.version } : {}),
    ...(options.effectiveDate !== undefined
      ? { effectiveDate: options.effectiveDate }
      : {}),
    ...(options.expirationDate !== undefined
      ? { expirationDate: options.expirationDate }
      : {}),
    ...(options.jurisdiction !== undefined
      ? { jurisdiction: options.jurisdiction }
      : {}),
  };

  return Object.freeze(metadata) as SourceMetadata;
}

/**
 * Creates a new Source.
 *
 * @param title - Source title
 * @param description - Source description
 * @param contentHash - SHA-256 hash of the source content
 * @param metadata - Source metadata
 * @param options - Optional fields
 */
export function createSource(
  title: string,
  description: string,
  contentHash: ContentHash,
  metadata: SourceMetadata,
  options: {
    id?: SourceId;
    retrievedAt?: Timestamp;
  } = {}
): Source {
  return Object.freeze({
    id: options.id ?? generateSourceId(),
    title,
    description,
    contentHash,
    retrievedAt: options.retrievedAt ?? new Date().toISOString(),
    metadata,
  });
}

/**
 * Creates a mock source for testing/examples.
 * Generates a placeholder content hash.
 */
export function createMockSource(
  title: string,
  type: SourceType,
  options: {
    description?: string;
    tags?: readonly string[];
  } = {}
): Source {
  const mockHash = '0'.repeat(64);
  const metadataOptions: { tags?: readonly string[] } = {};
  if (options.tags !== undefined) {
    metadataOptions.tags = options.tags;
  }
  return createSource(
    title,
    options.description ?? `Mock source: ${title}`,
    mockHash,
    createSourceMetadata(type, metadataOptions)
  );
}

/**
 * Validates a source has required fields.
 */
export function isValidSource(source: unknown): source is Source {
  if (typeof source !== 'object' || source === null) return false;
  const s = source as Record<string, unknown>;
  return (
    typeof s['id'] === 'string' &&
    typeof s['title'] === 'string' &&
    typeof s['description'] === 'string' &&
    typeof s['contentHash'] === 'string' &&
    typeof s['retrievedAt'] === 'string' &&
    typeof s['metadata'] === 'object' &&
    s['metadata'] !== null
  );
}
