/**
 * Core exports for Vera.
 */

export * from './types.js';
export * from './Claim.js';
export * from './Source.js';
export * from './Argument.js';
export * from './Relation.js';
export * from './Uncertainty.js';
export * from './Decision.js';
export * from './ArgumentationFramework.js';

export { createAuditTrace, generateTraceId as generateAuditTraceId } from './AuditTrace.js';
