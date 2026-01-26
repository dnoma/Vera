import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

function repoRootFromHere(): string {
  const currentDir = dirname(fileURLToPath(import.meta.url));
  return resolve(currentDir, '../../..');
}

export function schemaPath(relativeSchemaPath: string): string {
  return resolve(repoRootFromHere(), 'schemas/backend-data', relativeSchemaPath);
}

