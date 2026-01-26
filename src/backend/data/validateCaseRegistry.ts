import { readFileSync } from 'fs';
import { Ajv2020 } from 'ajv/dist/2020.js';
import type { ErrorObject, ValidateFunction } from 'ajv';
import type { CaseMeta } from './types.js';
import { schemaPath } from './schemaPaths.js';

let cachedRegistryValidator: ValidateFunction<readonly CaseMeta[]> | null = null;

function getRegistryValidator(): ValidateFunction<readonly CaseMeta[]> {
  if (!cachedRegistryValidator) {
    const registrySchemaJson = readFileSync(schemaPath('case-registry.schema.json'), 'utf-8');
    const registrySchema = JSON.parse(registrySchemaJson) as Record<string, unknown>;
    const caseMetaSchemaJson = readFileSync(schemaPath('case-meta.schema.json'), 'utf-8');
    const caseMetaSchema = JSON.parse(caseMetaSchemaJson) as Record<string, unknown>;

    const ajv = new Ajv2020({
      allErrors: true,
      strict: false,
      formats: { date: true },
    });

    ajv.addSchema(caseMetaSchema);
    cachedRegistryValidator = ajv.compile<readonly CaseMeta[]>(registrySchema);
  }

  return cachedRegistryValidator!;
}

function formatErrors(errors: readonly ErrorObject[] | null | undefined): string {
  if (!errors || errors.length === 0) {
    return '';
  }
  return errors
    .map(e => `${e.instancePath || '(root)'} ${e.message ?? 'schema validation error'}`.trim())
    .join('; ');
}

/**
 * Validates a case registry JSON payload against the data-layer schema.
 * Throws on invalid input to keep downstream lookup deterministic.
 */
export function assertValidCaseRegistry(payload: unknown): asserts payload is readonly CaseMeta[] {
  const validator = getRegistryValidator();
  const valid = validator(payload);
  if (!valid) {
    throw new Error(`Invalid case registry payload: ${formatErrors(validator.errors)}`);
  }
}

