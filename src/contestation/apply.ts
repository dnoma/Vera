import { randomUUID } from 'crypto';
import type {
  ArgumentationFramework,
  Contestation,
  ContestationType,
  Argument,
  ArgumentId,
  Relation,
  RelationId,
  ContestationId,
} from '../core/types.js';
import { createFramework, getArgument } from '../core/ArgumentationFramework.js';
import { createArgument } from '../core/Argument.js';
import { sortByKey } from '../integrity/ordering.js';

/**
 * Generates a unique contestation ID.
 */
export function generateContestationId(): ContestationId {
  return `contest-${randomUUID()}`;
}

/**
 * Creates a base score modification contestation.
 */
export function createBaseScoreContestation(
  targetArgumentId: ArgumentId,
  newBaseScore: number,
  challenge: string,
  submittedBy?: string
): Contestation {
  if (newBaseScore < 0 || newBaseScore > 1) {
    throw new Error(`newBaseScore must be in [0,1], got ${newBaseScore}`);
  }

  const contestation: Contestation = {
    id: generateContestationId(),
    type: 'base_score_modification' as ContestationType,
    challenge,
    targetArgumentId,
    newBaseScore,
    submittedAt: new Date().toISOString(),
    ...(submittedBy ? { submittedBy } : {}),
  };

  return Object.freeze(contestation);
}

/**
 * Creates an argument addition contestation.
 */
export function createArgumentAdditionContestation(
  newArgument: Omit<Argument, 'computedStrength'>,
  newRelation: Relation,
  challenge: string,
  submittedBy?: string
): Contestation {
  const contestation: Contestation = {
    id: generateContestationId(),
    type: 'argument_addition' as ContestationType,
    challenge,
    newArgument: Object.freeze({ ...newArgument }),
    newRelation: Object.freeze({ ...newRelation }),
    submittedAt: new Date().toISOString(),
    ...(submittedBy ? { submittedBy } : {}),
  };

  return Object.freeze(contestation);
}

/**
 * Creates an argument removal contestation.
 */
export function createArgumentRemovalContestation(
  targetArgumentId: ArgumentId,
  challenge: string,
  submittedBy?: string
): Contestation {
  const contestation: Contestation = {
    id: generateContestationId(),
    type: 'argument_removal' as ContestationType,
    challenge,
    targetArgumentId,
    submittedAt: new Date().toISOString(),
    ...(submittedBy ? { submittedBy } : {}),
  };

  return Object.freeze(contestation);
}

/**
 * Creates a relation addition contestation.
 */
export function createRelationAdditionContestation(
  newRelation: Relation,
  challenge: string,
  submittedBy?: string
): Contestation {
  const contestation: Contestation = {
    id: generateContestationId(),
    type: 'relation_addition' as ContestationType,
    challenge,
    newRelation: Object.freeze({ ...newRelation }),
    submittedAt: new Date().toISOString(),
    ...(submittedBy ? { submittedBy } : {}),
  };

  return Object.freeze(contestation);
}

/**
 * Creates a relation removal contestation.
 */
export function createRelationRemovalContestation(
  targetRelationId: RelationId,
  challenge: string,
  submittedBy?: string
): Contestation {
  const contestation: Contestation = {
    id: generateContestationId(),
    type: 'relation_removal' as ContestationType,
    challenge,
    targetRelationId,
    submittedAt: new Date().toISOString(),
    ...(submittedBy ? { submittedBy } : {}),
  };

  return Object.freeze(contestation);
}

/**
 * Applies a contestation to a framework, returning a new modified framework.
 * Does not mutate the original framework.
 */
export function applyContestation(
  framework: ArgumentationFramework,
  contestation: Contestation
): ArgumentationFramework {
  switch (contestation.type) {
    case 'base_score_modification':
      return applyBaseScoreModification(framework, contestation);
    case 'argument_addition':
      return applyArgumentAddition(framework, contestation);
    case 'argument_removal':
      return applyArgumentRemoval(framework, contestation);
    case 'relation_addition':
      return applyRelationAddition(framework, contestation);
    case 'relation_removal':
      return applyRelationRemoval(framework, contestation);
    default:
      throw new Error(`Unsupported contestation type: ${contestation.type}`);
  }
}

function applyBaseScoreModification(
  framework: ArgumentationFramework,
  contestation: Contestation
): ArgumentationFramework {
  if (!contestation.targetArgumentId || contestation.newBaseScore === undefined) {
    throw new Error('Base score modification requires targetArgumentId and newBaseScore');
  }
  const newBaseScore = contestation.newBaseScore;

  const targetArg = getArgument(framework, contestation.targetArgumentId);
  if (!targetArg) {
    throw new Error(`Target argument ${contestation.targetArgumentId} not found`);
  }

  const newArguments = framework.arguments.map(arg => {
    if (arg.id === contestation.targetArgumentId) {
      return createArgument(arg.content, newBaseScore, {
        id: arg.id,
        sourceRefs: arg.sourceRefs,
        assumptions: arg.assumptions,
      });
    }
    return arg;
  });

  return createFramework(
    framework.rootClaimId,
    sortByKey(newArguments, 'id'),
    sortByKey(framework.relations, 'id')
  );
}

function applyArgumentAddition(
  framework: ArgumentationFramework,
  contestation: Contestation
): ArgumentationFramework {
  if (!contestation.newArgument || !contestation.newRelation) {
    throw new Error('Argument addition requires newArgument and newRelation');
  }

  const newArguments = [...framework.arguments, contestation.newArgument as Argument];
  const newRelations = [...framework.relations, contestation.newRelation];

  return createFramework(
    framework.rootClaimId,
    sortByKey(newArguments, 'id'),
    sortByKey(newRelations, 'id')
  );
}

function applyArgumentRemoval(
  framework: ArgumentationFramework,
  contestation: Contestation
): ArgumentationFramework {
  if (!contestation.targetArgumentId) {
    throw new Error('Argument removal requires targetArgumentId');
  }

  if (contestation.targetArgumentId === framework.rootClaimId) {
    throw new Error('Cannot remove root argument');
  }

  const newArguments = framework.arguments.filter(
    a => a.id !== contestation.targetArgumentId
  );
  const newRelations = framework.relations.filter(
    r => r.from !== contestation.targetArgumentId && r.to !== contestation.targetArgumentId
  );

  return createFramework(
    framework.rootClaimId,
    sortByKey(newArguments, 'id'),
    sortByKey(newRelations, 'id')
  );
}

function applyRelationAddition(
  framework: ArgumentationFramework,
  contestation: Contestation
): ArgumentationFramework {
  if (!contestation.newRelation) {
    throw new Error('Relation addition requires newRelation');
  }

  const newRelations = [...framework.relations, contestation.newRelation];
  return createFramework(
    framework.rootClaimId,
    sortByKey(framework.arguments, 'id'),
    sortByKey(newRelations, 'id')
  );
}

function applyRelationRemoval(
  framework: ArgumentationFramework,
  contestation: Contestation
): ArgumentationFramework {
  if (!contestation.targetRelationId) {
    throw new Error('Relation removal requires targetRelationId');
  }

  const newRelations = framework.relations.filter(
    r => r.id !== contestation.targetRelationId
  );

  return createFramework(
    framework.rootClaimId,
    sortByKey(framework.arguments, 'id'),
    sortByKey(newRelations, 'id')
  );
}
