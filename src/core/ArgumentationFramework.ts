import type {
  ArgumentationFramework,
  EvaluatedFramework,
  Argument,
  ArgumentId,
  Relation,
  RelationType,
  ArgumentRole,
  SemanticsType,
  Timestamp,
} from './types.js';

/**
 * Creates a new ArgumentationFramework.
 *
 * @param rootClaimId - ID of the root claim argument
 * @param args - Array of arguments in the framework
 * @param relations - Array of relations between arguments
 */
export function createFramework(
  rootClaimId: ArgumentId,
  args: readonly Argument[],
  relations: readonly Relation[]
): ArgumentationFramework {
  // Validate root exists
  const rootExists = args.some(a => a.id === rootClaimId);
  if (!rootExists) {
    throw new Error(`Root argument ${rootClaimId} not found in arguments`);
  }

  return Object.freeze({
    rootClaimId,
    arguments: Object.freeze([...args]),
    relations: Object.freeze([...relations]),
  });
}

/**
 * Internal helper to build lookup maps for efficient traversal.
 */
interface FrameworkMaps {
  argumentById: Map<ArgumentId, Argument>;
  attackers: Map<ArgumentId, ArgumentId[]>;
  supporters: Map<ArgumentId, ArgumentId[]>;
  attackedBy: Map<ArgumentId, ArgumentId[]>;
  supportedBy: Map<ArgumentId, ArgumentId[]>;
}

function buildMaps(framework: ArgumentationFramework): FrameworkMaps {
  const argumentById = new Map<ArgumentId, Argument>();
  const attackers = new Map<ArgumentId, ArgumentId[]>();
  const supporters = new Map<ArgumentId, ArgumentId[]>();
  const attackedBy = new Map<ArgumentId, ArgumentId[]>();
  const supportedBy = new Map<ArgumentId, ArgumentId[]>();

  // Build argument map
  for (const arg of framework.arguments) {
    argumentById.set(arg.id, arg);
    attackers.set(arg.id, []);
    supporters.set(arg.id, []);
    attackedBy.set(arg.id, []);
    supportedBy.set(arg.id, []);
  }

  // Build relation maps
  for (const rel of framework.relations) {
    if (rel.type === 'attack') {
      attackers.get(rel.to)?.push(rel.from);
      attackedBy.get(rel.from)?.push(rel.to);
    } else {
      supporters.get(rel.to)?.push(rel.from);
      supportedBy.get(rel.from)?.push(rel.to);
    }
  }

  return { argumentById, attackers, supporters, attackedBy, supportedBy };
}

// Cache for maps (weak reference to allow GC)
const mapsCache = new WeakMap<ArgumentationFramework, FrameworkMaps>();

function getMaps(framework: ArgumentationFramework): FrameworkMaps {
  let maps = mapsCache.get(framework);
  if (!maps) {
    maps = buildMaps(framework);
    mapsCache.set(framework, maps);
  }
  return maps;
}

/**
 * Gets an argument by ID.
 */
export function getArgument(
  framework: ArgumentationFramework,
  argumentId: ArgumentId
): Argument | undefined {
  return getMaps(framework).argumentById.get(argumentId);
}

/**
 * Gets all arguments that attack the given argument.
 * These are arguments with attack relations pointing TO the target.
 */
export function getAttackers(
  framework: ArgumentationFramework,
  argumentId: ArgumentId
): readonly Argument[] {
  const maps = getMaps(framework);
  const attackerIds = maps.attackers.get(argumentId) ?? [];
  return attackerIds
    .map(id => maps.argumentById.get(id))
    .filter((a): a is Argument => a !== undefined);
}

/**
 * Gets all arguments that support the given argument.
 * These are arguments with support relations pointing TO the target.
 */
export function getSupporters(
  framework: ArgumentationFramework,
  argumentId: ArgumentId
): readonly Argument[] {
  const maps = getMaps(framework);
  const supporterIds = maps.supporters.get(argumentId) ?? [];
  return supporterIds
    .map(id => maps.argumentById.get(id))
    .filter((a): a is Argument => a !== undefined);
}

/**
 * Gets the path from an argument to the root claim.
 * Returns array of [argumentId, relationType] pairs representing the path.
 * Empty array if argument is the root.
 * Undefined if no path exists (disconnected).
 */
export function getPathToRoot(
  framework: ArgumentationFramework,
  argumentId: ArgumentId
): readonly { argumentId: ArgumentId; relationType: RelationType }[] | undefined {
  if (argumentId === framework.rootClaimId) {
    return [];
  }

  const maps = getMaps(framework);
  const visited = new Set<ArgumentId>();
  const path: { argumentId: ArgumentId; relationType: RelationType }[] = [];

  function dfs(currentId: ArgumentId): boolean {
    if (currentId === framework.rootClaimId) {
      return true;
    }

    if (visited.has(currentId)) {
      return false; // Cycle or already visited
    }
    visited.add(currentId);

    // Check what this argument attacks or supports
    for (const rel of framework.relations) {
      if (rel.from === currentId) {
        path.push({ argumentId: rel.to, relationType: rel.type });
        if (dfs(rel.to)) {
          return true;
        }
        path.pop();
      }
    }

    return false;
  }

  if (dfs(argumentId)) {
    return path;
  }

  return undefined; // No path found
}

/**
 * Classifies an argument as 'pro' or 'con' relative to the root claim.
 *
 * Pro: Even number of attacks on the path to root (supports the claim)
 * Con: Odd number of attacks on the path to root (opposes the claim)
 *
 * Based on ArgLLM paper definition:
 * - pro(Q) = {α ∈ A | ∃p ∈ paths(α, α*), with |p ∩ R⁻| even}
 * - con(Q) = {α ∈ A | ∃p ∈ paths(α, α*), with |p ∩ R⁻| odd}
 */
export function classifyArgument(
  framework: ArgumentationFramework,
  argumentId: ArgumentId
): ArgumentRole | undefined {
  if (argumentId === framework.rootClaimId) {
    return 'pro'; // Root is always pro to itself
  }

  const path = getPathToRoot(framework, argumentId);
  if (path === undefined) {
    return undefined; // Disconnected argument
  }

  const attackCount = path.filter(p => p.relationType === 'attack').length;
  return attackCount % 2 === 0 ? 'pro' : 'con';
}

/**
 * Gets all leaf arguments (arguments with no attackers or supporters).
 */
export function getLeaves(
  framework: ArgumentationFramework
): readonly Argument[] {
  const maps = getMaps(framework);
  return framework.arguments.filter(arg => {
    const hasAttackers = (maps.attackers.get(arg.id)?.length ?? 0) > 0;
    const hasSupporters = (maps.supporters.get(arg.id)?.length ?? 0) > 0;
    return !hasAttackers && !hasSupporters;
  });
}

/**
 * Checks if the framework is acyclic.
 */
export function isAcyclic(framework: ArgumentationFramework): boolean {
  const visited = new Set<ArgumentId>();
  const recursionStack = new Set<ArgumentId>();

  function hasCycle(argumentId: ArgumentId): boolean {
    visited.add(argumentId);
    recursionStack.add(argumentId);

    // Get all arguments this one points to
    for (const rel of framework.relations) {
      if (rel.from === argumentId) {
        if (!visited.has(rel.to)) {
          if (hasCycle(rel.to)) {
            return true;
          }
        } else if (recursionStack.has(rel.to)) {
          return true; // Back edge found = cycle
        }
      }
    }

    recursionStack.delete(argumentId);
    return false;
  }

  for (const arg of framework.arguments) {
    if (!visited.has(arg.id)) {
      if (hasCycle(arg.id)) {
        return false;
      }
    }
  }

  return true;
}

/**
 * Checks if all arguments are connected to the root.
 */
export function isConnected(framework: ArgumentationFramework): boolean {
  for (const arg of framework.arguments) {
    if (arg.id === framework.rootClaimId) continue;
    const path = getPathToRoot(framework, arg.id);
    if (path === undefined) {
      return false; // Disconnected argument
    }
  }
  return true;
}

/**
 * Checks if the framework has a valid tree structure.
 * (Single path from each argument to root)
 */
export function isTreeStructure(framework: ArgumentationFramework): boolean {
  // Each non-root argument should have exactly one outgoing relation
  for (const arg of framework.arguments) {
    if (arg.id === framework.rootClaimId) continue;

    const outgoing = framework.relations.filter(r => r.from === arg.id);
    if (outgoing.length !== 1) {
      return false; // Must have exactly one outgoing relation
    }
  }

  return isAcyclic(framework) && isConnected(framework);
}

/**
 * Validates framework structural constraints.
 */
export function validateFramework(framework: ArgumentationFramework): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // Check root exists
  const root = getArgument(framework, framework.rootClaimId);
  if (!root) {
    errors.push(`Root argument ${framework.rootClaimId} not found`);
  }

  // Check all relations reference valid arguments
  const argIds = new Set(framework.arguments.map(a => a.id));
  for (const rel of framework.relations) {
    if (!argIds.has(rel.from)) {
      errors.push(`Relation ${rel.id} references unknown argument ${rel.from}`);
    }
    if (!argIds.has(rel.to)) {
      errors.push(`Relation ${rel.id} references unknown argument ${rel.to}`);
    }
  }

  // Check acyclic
  if (!isAcyclic(framework)) {
    errors.push('Framework contains cycles');
  }

  // Check connected
  if (!isConnected(framework)) {
    errors.push('Framework has disconnected arguments');
  }

  // Check base scores
  for (const arg of framework.arguments) {
    if (arg.baseScore < 0 || arg.baseScore > 1) {
      errors.push(`Argument ${arg.id} has invalid baseScore: ${arg.baseScore}`);
    }
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Creates an EvaluatedFramework from a framework with computed strengths.
 */
export function createEvaluatedFramework(
  framework: ArgumentationFramework,
  computedStrengths: Map<ArgumentId, number>,
  semanticsUsed: SemanticsType,
  evaluatedAt?: Timestamp
): EvaluatedFramework {
  const evaluatedArgs = framework.arguments.map(arg => {
    const strength = computedStrengths.get(arg.id);
    if (strength === undefined) {
      throw new Error(`Missing computed strength for argument ${arg.id}`);
    }
    return Object.freeze({
      ...arg,
      computedStrength: strength,
    });
  });

  return Object.freeze({
    rootClaimId: framework.rootClaimId,
    arguments: Object.freeze(evaluatedArgs),
    relations: framework.relations,
    semanticsUsed,
    evaluatedAt: evaluatedAt ?? new Date().toISOString(),
  });
}

/**
 * Gets the final strength of the root claim from an evaluated framework.
 */
export function getFinalStrength(framework: EvaluatedFramework): number {
  const root = framework.arguments.find(a => a.id === framework.rootClaimId);
  if (!root) {
    throw new Error(`Root argument ${framework.rootClaimId} not found`);
  }
  return root.computedStrength;
}
