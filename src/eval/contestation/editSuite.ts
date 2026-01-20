import type { ArgumentationFramework, EvaluatedFramework } from '../../core/types.js';
import { evaluateWithDFQuAD } from '../../semantics/DFQuAD.js';
import { getFinalStrength, classifyArgument } from '../../core/ArgumentationFramework.js';
import { sortByKey } from '../../integrity/ordering.js';
import { hash } from '../../integrity/hash.js';

export type EditScenarioResult = {
  readonly scenarioId: string;
  readonly passed: boolean;
  readonly beforeStrength: number;
  readonly afterStrength: number;
  readonly delta: number;
};

export function pickProConArguments(
  evaluated: EvaluatedFramework
): { pro: string | undefined; con: string | undefined } {
  const nonRoot = evaluated.arguments.filter(a => a.id !== evaluated.rootClaimId);
  const sorted = [...nonRoot].sort((a, b) => b.computedStrength - a.computedStrength);

  let pro: string | undefined;
  let con: string | undefined;
  for (const arg of sorted) {
    const role = classifyArgument(evaluated, arg.id);
    if (!pro && role === 'pro') pro = arg.id;
    if (!con && role === 'con') con = arg.id;
    if (pro && con) break;
  }
  return { pro, con };
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

function flipOutgoingRelationType(
  framework: ArgumentationFramework,
  argumentId: string
): ArgumentationFramework {
  const outgoing = framework.relations.filter(r => r.from === argumentId);
  if (outgoing.length !== 1) return framework;
  const rel = outgoing[0]!;
  const flippedType = rel.type === 'support' ? 'attack' : 'support';
  const newRelId = `rel-flip-${hash({ relId: rel.id, flippedType }).slice(0, 8)}`;
  const kept = framework.relations.filter(r => r.id !== rel.id);
  return { ...framework, relations: sortByKey([...kept, { ...rel, id: newRelId, type: flippedType }], 'id') };
}

function addCounterargumentAttackRoot(framework: ArgumentationFramework): ArgumentationFramework {
  const addedArgId = `arg-edit-${hash({ root: framework.rootClaimId, op: 'add_con' }).slice(0, 8)}`;
  const addedRelId = `rel-edit-${hash({ addedArgId, op: 'add_con_rel' }).slice(0, 8)}`;
  const addedAssumptionId = `assumption-${hash({ addedArgId }).slice(0, 10)}`;

  return {
    ...framework,
    arguments: sortByKey(
      [
        ...framework.arguments,
        {
          id: addedArgId,
          content: 'Reviewer-added counterargument: possible exception or unmet element.',
          baseScore: 0.7,
          sourceRefs: [],
          assumptions: [
            {
              id: addedAssumptionId,
              statement: 'Reviewer-introduced counterargument for edit-suite testing.',
              basis: 'Evaluation harness (not sourced).',
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
        { id: addedRelId, from: addedArgId, to: framework.rootClaimId, type: 'attack' },
      ],
      'id'
    ),
  };
}

export function traceCompletenessRate(evaluated: EvaluatedFramework): number {
  const nonRoot = evaluated.arguments.filter(a => a.id !== evaluated.rootClaimId);
  if (nonRoot.length === 0) return 1;
  const compliant = nonRoot.filter(a => a.sourceRefs.length > 0 || a.assumptions.length > 0);
  return compliant.length / nonRoot.length;
}

export function counterargumentPresent(evaluated: EvaluatedFramework): boolean {
  if (evaluated.relations.some(r => r.type === 'attack')) return true;
  for (const arg of evaluated.arguments) {
    if (arg.id === evaluated.rootClaimId) continue;
    if (classifyArgument(evaluated, arg.id) === 'con') return true;
  }
  return false;
}

export function runEditSuite(
  baseFramework: ArgumentationFramework,
  evaluated: EvaluatedFramework
): { passRate: number | null; details: readonly EditScenarioResult[] } {
  const beforeStrength = getFinalStrength(evaluated);
  const { pro, con } = pickProConArguments(evaluated);
  const details: EditScenarioResult[] = [];
  const eps = 1e-12;

  if (pro) {
    {
      const modified = applyBaseScoreChange(baseFramework, pro, 0);
      const afterStrength = getFinalStrength(evaluateWithDFQuAD(modified));
      details.push({
        scenarioId: 'downweight_top_pro_to_0',
        passed: afterStrength <= beforeStrength + eps,
        beforeStrength,
        afterStrength,
        delta: afterStrength - beforeStrength,
      });
    }

    {
      const modified = flipOutgoingRelationType(baseFramework, pro);
      const afterStrength = getFinalStrength(evaluateWithDFQuAD(modified));
      details.push({
        scenarioId: 'flip_top_pro_relation_type',
        passed: afterStrength <= beforeStrength + eps,
        beforeStrength,
        afterStrength,
        delta: afterStrength - beforeStrength,
      });
    }
  }

  if (con) {
    const modified = applyBaseScoreChange(baseFramework, con, 1);
    const afterStrength = getFinalStrength(evaluateWithDFQuAD(modified));
    details.push({
      scenarioId: 'upweight_top_con_to_1',
      passed: afterStrength <= beforeStrength + eps,
      beforeStrength,
      afterStrength,
      delta: afterStrength - beforeStrength,
    });
  }

  {
    const modified = addCounterargumentAttackRoot(baseFramework);
    const afterStrength = getFinalStrength(evaluateWithDFQuAD(modified));
    details.push({
      scenarioId: 'add_counterargument_attack_root',
      passed: afterStrength <= beforeStrength + eps,
      beforeStrength,
      afterStrength,
      delta: afterStrength - beforeStrength,
    });
  }

  if (details.length === 0) return { passRate: null, details };
  return { passRate: details.filter(d => d.passed).length / details.length, details };
}

