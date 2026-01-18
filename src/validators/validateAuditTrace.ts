import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { Ajv2020 } from 'ajv/dist/2020.js';
import type { ErrorObject, ValidateFunction } from 'ajv';
import type { AuditTrace, ValidationError, ValidationResult } from '../core/types.js';

let cachedValidator: ValidateFunction<AuditTrace> | null = null;

function schemaPath(): string {
  const currentDir = dirname(fileURLToPath(import.meta.url));
  // Works from both `src/validators` (ts-jest / ts-node) and `dist/validators` (compiled output).
  return resolve(currentDir, '../../schemas/audit-trace.schema.json');
}

function getValidator(): ValidateFunction<AuditTrace> {
  if (!cachedValidator) {
    const schemaJson = readFileSync(schemaPath(), 'utf-8');
    const schema = JSON.parse(schemaJson) as Record<string, unknown>;

    const ajv = new Ajv2020({
      allErrors: true,
      strict: false,
      formats: { 'date-time': true },
    });
    cachedValidator = ajv.compile<AuditTrace>(schema);
  }

  return cachedValidator!;
}

function normalizeCode(keyword: string): string {
  return `SCHEMA_${keyword.replace(/[^a-zA-Z0-9]+/g, '_').toUpperCase()}`;
}

function toValidationErrors(
  errors: readonly ErrorObject[] | null | undefined
): ValidationError[] {
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

/**
 * Validates an audit trace against the JSON schema.
 */
export function validateAuditTrace(trace: AuditTrace): ValidationResult {
  const validator = getValidator();
  const valid = validator(trace);
  const errors = valid ? [] : toValidationErrors(validator.errors);

  return {
    valid: Boolean(valid),
    errors,
    checkedAt: new Date().toISOString(),
  };
}
