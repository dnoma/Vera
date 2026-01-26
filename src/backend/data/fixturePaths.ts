import { existsSync } from 'fs';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

function repoRootFromHere(): string {
  const currentDir = dirname(fileURLToPath(import.meta.url));
  return resolve(currentDir, '../../..');
}

export function backendFixturePath(relativeFixturePath: string): string {
  const root = repoRootFromHere();
  const candidate = resolve(root, 'src/backend/fixtures', relativeFixturePath);
  if (!existsSync(candidate)) {
    throw new Error(`Backend fixture not found: ${relativeFixturePath}`);
  }
  return candidate;
}

export function tryBackendFixturePath(relativeFixturePath: string): string | undefined {
  const root = repoRootFromHere();
  const candidate = resolve(root, 'src/backend/fixtures', relativeFixturePath);
  return existsSync(candidate) ? candidate : undefined;
}
