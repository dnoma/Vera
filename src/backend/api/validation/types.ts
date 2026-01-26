import type { ErrorObject } from 'ajv';

export type SchemaValidationError = {
  code: string;
  message: string;
  severity: 'error';
  path?: string;
};

export type SchemaValidationResult = {
  valid: boolean;
  errors: SchemaValidationError[];
};

export type AjvError = ErrorObject;

