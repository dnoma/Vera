/**
 * Contestation module for applying and predicting the effects of challenges.
 *
 * @module contestation
 */

export {
  generateContestationId,
  createBaseScoreContestation,
  createArgumentAdditionContestation,
  createArgumentRemovalContestation,
  createRelationAdditionContestation,
  createRelationRemovalContestation,
  applyContestation,
} from './apply.js';

export {
  predictContestationEffect,
  areEffectsCompatible,
  getArgumentRole,
} from './predict.js';

export {
  generateTraceId,
  recomputeFramework,
  validateContestation,
} from './recompute.js';
