import { readFileSync } from 'fs';
import type { CaseMeta, LawNetDocId } from './types.js';
import { backendFixturePath, tryBackendFixturePath } from './fixturePaths.js';

export interface LawNetClient {
  fetchCaseText(lawnetDocId: string): Promise<string>;
  fetchCaseMetadata?(lawnetDocId: string): Promise<Partial<CaseMeta>>;
}

export function toLawNetId(lawnetDocId: LawNetDocId): string {
  return typeof lawnetDocId === 'string' ? lawnetDocId : lawnetDocId.id;
}

/**
 * Fixture-backed LawNet connector for local-only tests.
 *
 * Determinism guarantees:
 * - Reads exact fixture files by ID (no network, no heuristics).
 * - Throws if a fixture is missing to avoid silent fallbacks.
 */
export class FixtureLawNetClient implements LawNetClient {
  async fetchCaseText(lawnetDocId: string): Promise<string> {
    return readFileSync(backendFixturePath(`lawnet/${lawnetDocId}.txt`), 'utf-8');
  }

  async fetchCaseMetadata(lawnetDocId: string): Promise<Partial<CaseMeta>> {
    const metaPath = tryBackendFixturePath(`lawnet/${lawnetDocId}.meta.json`);
    if (!metaPath) {
      return {};
    }
    const raw = readFileSync(metaPath, 'utf-8');
    return JSON.parse(raw) as Partial<CaseMeta>;
  }
}

