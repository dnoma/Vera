import type {
  ArgumentationFramework,
  Contestation,
  ContestationEffect,
  ArgumentId,
  ArgumentRole,
} from '../core/types.js';
import { classifyArgument, getArgument } from '../core/ArgumentationFramework.js';
import { applyContestation } from './apply.js';

/**
 * Predicts the effect of a contestation on the root claim's strength.
 *
 * Based on ArgLLM paper Properties 1 and 2:
 * - Increasing a pro argument's base score -> will not decrease root strength
 * - Increasing a con argument's base score -> will not increase root strength
 * - Adding a pro argument -> will not decrease root strength
 * - Adding a con argument -> will not increase root strength
 *
 * Returns:
 * - 'will_increase': Root strength will increase (or stay same)
 * - 'will_decrease': Root strength will decrease (or stay same)
 * - 'no_effect': Predicted to have no effect
 * - 'indeterminate': Cannot predict (complex scenario)
 */
export function predictContestationEffect(
  framework: ArgumentationFramework,
  contestation: Contestation
): ContestationEffect {
  switch (contestation.type) {
    case 'base_score_modification':
      return predictBaseScoreEffect(framework, contestation);
    case 'argument_addition':
      return predictArgumentAdditionEffect(framework, contestation);
    case 'argument_removal':
      return predictArgumentRemovalEffect(framework, contestation);
    case 'relation_addition':
    case 'relation_removal':
      return 'indeterminate';
    default:
      return 'indeterminate';
  }
}

function predictBaseScoreEffect(
  framework: ArgumentationFramework,
  contestation: Contestation
): ContestationEffect {
  if (!contestation.targetArgumentId || contestation.newBaseScore === undefined) {
    return 'indeterminate';
  }

  const targetArg = getArgument(framework, contestation.targetArgumentId);
  if (!targetArg) {
    return 'indeterminate';
  }

  const role = classifyArgument(framework, contestation.targetArgumentId);
  if (!role) {
    return 'indeterminate';
  }

  const isIncreasing = contestation.newBaseScore > targetArg.baseScore;

  if (contestation.newBaseScore === targetArg.baseScore) {
    return 'no_effect';
  }

  if (role === 'pro') {
    return isIncreasing ? 'will_increase' : 'will_decrease';
  }
  return isIncreasing ? 'will_decrease' : 'will_increase';
}

function predictArgumentAdditionEffect(
  framework: ArgumentationFramework,
  contestation: Contestation
): ContestationEffect {
  if (!contestation.newArgument || !contestation.newRelation) {
    return 'indeterminate';
  }

  try {
    const modifiedFramework = applyContestation(framework, contestation);
    const newArgId = contestation.newArgument.id;

    if (!newArgId) {
      return 'indeterminate';
    }

    const role = classifyArgument(modifiedFramework, newArgId);
    if (!role) {
      return 'indeterminate';
    }

    return role === 'pro' ? 'will_increase' : 'will_decrease';
  } catch {
    return 'indeterminate';
  }
}

function predictArgumentRemovalEffect(
  framework: ArgumentationFramework,
  contestation: Contestation
): ContestationEffect {
  if (!contestation.targetArgumentId) {
    return 'indeterminate';
  }

  const role = classifyArgument(framework, contestation.targetArgumentId);
  if (!role) {
    return 'indeterminate';
  }

  return role === 'pro' ? 'will_decrease' : 'will_increase';
}

/**
 * Checks if two contestation effects are compatible.
 * (Both increase, both decrease, or one is no_effect)
 */
export function areEffectsCompatible(
  effect1: ContestationEffect,
  effect2: ContestationEffect
): boolean {
  if (effect1 === 'no_effect' || effect2 === 'no_effect') {
    return true;
  }
  if (effect1 === 'indeterminate' || effect2 === 'indeterminate') {
    return true;
  }
  return effect1 === effect2;
}

/**
 * Gets the role of an argument in the framework.
 */
export function getArgumentRole(
  framework: ArgumentationFramework,
  argumentId: ArgumentId
): ArgumentRole | undefined {
  return classifyArgument(framework, argumentId);
}
