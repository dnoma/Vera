import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { dirname, resolve } from 'path';
import { canonicalize, hash } from '../integrity/hash.js';

export type CacheKey = string;

export function computeCacheKey(request: unknown): CacheKey {
  return hash(request);
}

export function cachePath(cacheDir: string, key: CacheKey): string {
  return resolve(cacheDir, `${key}.json`);
}

export function readCache<T>(cacheDir: string, key: CacheKey): T | undefined {
  const path = cachePath(cacheDir, key);
  if (!existsSync(path)) return undefined;
  const raw = readFileSync(path, 'utf-8');
  return JSON.parse(raw) as T;
}

export function writeCache(cacheDir: string, key: CacheKey, value: unknown): void {
  mkdirSync(cacheDir, { recursive: true });
  const path = cachePath(cacheDir, key);
  const dir = dirname(path);
  mkdirSync(dir, { recursive: true });
  writeFileSync(path, canonicalize(value), 'utf-8');
}

