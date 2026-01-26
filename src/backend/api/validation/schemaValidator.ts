import { existsSync, readFileSync } from 'fs';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';
import { Ajv2020 } from 'ajv/dist/2020.js';
import type { ErrorObject, ValidateFunction } from 'ajv';
import type { SchemaValidationError, SchemaValidationResult } from './types.js';

type JsonSchema = Record<string, unknown>;

const cachedValidators = new Map<string, ValidateFunction>();

function schemasDir(): string {
  const currentDir = dirname(fileURLToPath(import.meta.url));
  const candidates = [
    resolve(currentDir, '../../../../schemas/backend-api'),
    resolve(currentDir, '../../../../../schemas/backend-api'),
  ];

  for (const dir of candidates) {
    if (existsSync(dir)) {
      return dir;
    }
  }

  return candidates[0]!;
}

function getAjv(): Ajv2020 {
  return new Ajv2020({
    allErrors: true,
    strict: false,
    formats: { 'date-time': true },
  });
}

function normalizeCode(keyword: string): string {
  return `SCHEMA_${keyword.replace(/[^a-zA-Z0-9]+/g, '_').toUpperCase()}`;
}

function toValidationErrors(
  errors: readonly ErrorObject[] | null | undefined
): SchemaValidationError[] {
  if (!errors || errors.length === 0) {
    return [];
  }

  return errors.map(err => {
    const base = {
      code: normalizeCode(err.keyword),
      message: err.message ?? 'Schema validation error',
      severity: 'error' as const,
    };
    if (err.instancePath) {
      return { ...base, path: err.instancePath };
    }
    return base;
  });
}

function getValidator(schemaFilename: string): ValidateFunction {
  const existing = cachedValidators.get(schemaFilename);
  if (existing) {
    return existing;
  }

  const schemaPath = resolve(schemasDir(), schemaFilename);
  const schemaJson = readFileSync(schemaPath, 'utf-8');
  const schema = JSON.parse(schemaJson) as JsonSchema;

  const ajv = getAjv();
  const validator = ajv.compile(schema);
  cachedValidators.set(schemaFilename, validator);
  return validator;
}

export function validateAgainstSchema(
  schemaFilename: string,
  payload: unknown
): SchemaValidationResult {
  const validator = getValidator(schemaFilename);
  const valid = validator(payload);
  const errors = valid ? [] : toValidationErrors(validator.errors);
  return { valid: Boolean(valid), errors };
}

