import type { ArgumentationFramework, EvaluatedFramework } from '../../core/types.js';
import { evaluateWithDFQuAD } from '../../semantics/DFQuAD.js';
import { getFinalStrength } from '../../core/ArgumentationFramework.js';
import { sortByKey } from '../../integrity/ordering.js';
import { hash } from '../../integrity/hash.js';

type DecisionLabel = 'supported' | 'contested';

function labelFromStrength(strength: number, threshold: number = 0.5): DecisionLabel {
  return strength > threshold ? 'supported' : 'contested';
}

function applyBaseScoreChange(
  framework: ArgumentationFramework,
  argumentId: string,
  newBaseScore: number
): ArgumentationFramework {
  const newArguments = framework.arguments.map(a =>
    a.id === argumentId ? { ...a, baseScore: newBaseScore } : a
  );
  return { ...framework, arguments: sortByKey(newArguments, 'id') };
}

function applyAddCounterargumentAttackRoot(framework: ArgumentationFramework): ArgumentationFramework {
  const addedArgId = `arg-edit-${hash({ root: framework.rootClaimId, op: 'add_con' }).slice(0, 8)}`;
  const addedRelId = `rel-edit-${hash({ addedArgId, op: 'add_con_rel' }).slice(0, 8)}`;
  const addedAssumptionId = `assumption-${hash({ addedArgId }).slice(0, 10)}`;

  if (framework.arguments.some(a => a.id === addedArgId)) return framework;
  if (framework.relations.some(r => r.id === addedRelId)) return framework;

  return {
    ...framework,
    arguments: sortByKey(
      [
        ...framework.arguments,
        {
          id: addedArgId,
          content:
            'Reviewer-added counterargument: the clause may not satisfy the required element or is subject to an exception.',
          baseScore: 0.7,
          sourceRefs: [],
          assumptions: [
            {
              id: addedAssumptionId,
              statement: 'Reviewer-introduced counterargument for sensitivity testing.',
              basis: 'Evaluation auditability search (not sourced).',
              isContestable: true,
            },
          ],
        },
      ],
      'id'
    ),
    relations: sortByKey(
      [
        ...framework.relations,
        { id: addedRelId, from: addedArgId, to: framework.rootClaimId, type: 'attack' as const },
      ],
      'id'
    ),
  };
}

function applyFlipOutgoingRelationType(
  framework: ArgumentationFramework,
  argumentId: string
): ArgumentationFramework {
  const outgoing = framework.relations.filter(r => r.from === argumentId);
  if (outgoing.length !== 1) return framework;

  const rel = outgoing[0]!;
  const flippedType = rel.type === 'support' ? ('attack' as const) : ('support' as const);
  const newRelId = `rel-flip-${hash({ relId: rel.id, flippedType }).slice(0, 8)}`;

  const kept = framework.relations.filter(r => r.id !== rel.id);
  const replaced = [...kept, { ...rel, id: newRelId, type: flippedType }];
  return { ...framework, relations: sortByKey(replaced, 'id') };
}

export type MinInterventionsResult = {
  readonly minBaseScoreInterventionsToFlip: number | null;
  readonly minBoundedInterventionsToFlip: number | null;
  readonly baseScoreFlippable: boolean;
  readonly boundedFlippable: boolean;
  readonly note?: string;
};

function minBaseScoreInterventionsToFlip(
  framework: ArgumentationFramework,
  beforeLabel: DecisionLabel
): number | null {
  const candidates = framework.arguments
    .filter(a => a.id !== framework.rootClaimId)
    .map(a => a.id);

  const choices = [undefined, 0, 1] as const;
  let best: number | null = null;

  function search(index: number, modified: ArgumentationFramework, changedCount: number): void {
    if (best !== null && changedCount >= best) return;

    if (index >= candidates.length) {
      const afterStrength = getFinalStrength(evaluateWithDFQuAD(modified));
      const afterLabel = labelFromStrength(afterStrength);
      if (afterLabel !== beforeLabel) {
        best = changedCount;
      }
      return;
    }

    const id = candidates[index]!;
    const original = framework.arguments.find(a => a.id === id);
    const originalScore = original?.baseScore;

    for (const choice of choices) {
      if (choice === undefined) {
        search(index + 1, modified, changedCount);
        continue;
      }
      const next = applyBaseScoreChange(modified, id, choice);
      const didChange = originalScore !== undefined && originalScore !== choice;
      search(index + 1, next, changedCount + (didChange ? 1 : 0));
    }
  }

  search(0, framework, 0);
  return best;
}

/**
 * Computes the minimal number of simple interventions required to flip the decision label.
 *
 * Interventions considered (each cost 1):
 * - Set one argument baseScore to 0 or 1
 * - Flip the type of one existing outgoing relation (support <-> attack)
 * - Add a reviewer-introduced counterargument attacking the root
 *
 * This is an auditability proxy: it estimates whether errors are correctable
 * through bounded, reviewable edits with deterministic recomputation.
 */
export function minInterventionsToFlipDecision(
  base: ArgumentationFramework,
  evaluated: EvaluatedFramework,
  maxDepth: number = 2
): MinInterventionsResult {
  const beforeStrength = getFinalStrength(evaluated);
  const beforeLabel = labelFromStrength(beforeStrength);

  const minBase = minBaseScoreInterventionsToFlip(base, beforeLabel);

  type State = { readonly framework: ArgumentationFramework; readonly cost: number };
  const queue: State[] = [{ framework: base, cost: 0 }];
  const visited = new Set<string>();

  const keyOf = (f: ArgumentationFramework): string =>
    hash({
      rootClaimId: f.rootClaimId,
      arguments: f.arguments.map(a => ({ id: a.id, baseScore: a.baseScore })),
      relations: f.relations.map(r => ({ id: r.id, from: r.from, to: r.to, type: r.type })),
    });

  while (queue.length > 0) {
    const state = queue.shift()!;
    const k = keyOf(state.framework);
    if (visited.has(k)) continue;
    visited.add(k);

    if (state.cost > 0) {
      const afterStrength = getFinalStrength(evaluateWithDFQuAD(state.framework));
      const afterLabel = labelFromStrength(afterStrength);
      if (afterLabel !== beforeLabel) {
        return {
          minBaseScoreInterventionsToFlip: minBase,
          minBoundedInterventionsToFlip: state.cost,
          baseScoreFlippable: minBase !== null,
          boundedFlippable: true,
        };
      }
    }

    if (state.cost >= maxDepth) continue;

    // Generate neighbours.
    const candidates = state.framework.arguments
      .filter(a => a.id !== state.framework.rootClaimId)
      .map(a => a.id);

    // Base score perturbations.
    for (const id of candidates) {
      for (const score of [0, 1]) {
        const next = applyBaseScoreChange(state.framework, id, score);
        queue.push({ framework: next, cost: state.cost + 1 });
      }
      const flipped = applyFlipOutgoingRelationType(state.framework, id);
      queue.push({ framework: flipped, cost: state.cost + 1 });
    }

    // Add counterargument.
    queue.push({ framework: applyAddCounterargumentAttackRoot(state.framework), cost: state.cost + 1 });
  }

  return {
    minBaseScoreInterventionsToFlip: minBase,
    minBoundedInterventionsToFlip: null,
    baseScoreFlippable: minBase !== null,
    boundedFlippable: false,
    note: 'No label flip found within bounded interventions.',
  };
}
