/**
 * Vera public API.
 *
 * Re-exports core types and modules plus semantics/contestation utilities.
 */

export * from './core/types.js';
export * from './core/Claim.js';
export * from './core/Source.js';
export * from './core/Argument.js';
export * from './core/Relation.js';
export * from './core/Uncertainty.js';
export * from './core/Decision.js';
export * from './core/ArgumentationFramework.js';

export * from './integrity/index.js';
export * from './semantics/index.js';
export * from './contestation/index.js';
export * as validators from './validators/index.js';
