import type {
  ArgumentationFramework,
  EvaluatedFramework,
  ArgumentId,
  Argument,
} from '../core/types.js';
import {
  getAttackers,
  getSupporters,
  createEvaluatedFramework,
} from '../core/ArgumentationFramework.js';
import { sortByKey } from '../integrity/ordering.js';
import type { GradualSemantics, ArgumentEvaluation } from './types.js';

/**
 * DF-QuAD (Discontinuity-free Quantitative Argumentation Debate) semantics.
 *
 * Based on Rago et al. [2016] as described in the ArgLLM paper.
 * Computes dialectical strengths by propagating from leaves to root.
 */
export class DFQuADSemantics implements GradualSemantics {
  readonly type = 'df-quad' as const;

  /**
   * Aggregation function F.
   * Combines multiple attacker/supporter strengths into a single value.
   *
   * F(v₁, ..., vₙ) = 1 - ∏ᵢ₌₁ⁿ (1 - vᵢ)
   *
   * If no values: F() = 0
   */
  aggregate(strengths: readonly number[]): number {
    if (strengths.length === 0) {
      return 0;
    }

    let product = 1;
    for (const v of strengths) {
      product *= 1 - v;
    }
    return 1 - product;
  }

  /**
   * Combination function C.
   * Combines base score with aggregated attack and support.
   *
   * If va = vs:  C(v₀, va, vs) = v₀
   * If va > vs:  C(v₀, va, vs) = v₀ - v₀ · |vs - va|
   * If va < vs:  C(v₀, va, vs) = v₀ + (1 - v₀) · |vs - va|
   */
  combine(baseScore: number, attackAgg: number, supportAgg: number): number {
    if (attackAgg === supportAgg) {
      return baseScore;
    }

    const diff = Math.abs(supportAgg - attackAgg);

    if (attackAgg > supportAgg) {
      return baseScore - baseScore * diff;
    }

    return baseScore + (1 - baseScore) * diff;
  }

  /**
   * Computes the strength of a single argument.
   */
  computeStrength(
    baseScore: number,
    attackerStrengths: readonly number[],
    supporterStrengths: readonly number[]
  ): number {
    const va = this.aggregate(attackerStrengths);
    const vs = this.aggregate(supporterStrengths);
    return this.combine(baseScore, va, vs);
  }

  /**
   * Evaluates the entire framework using bottom-up propagation.
   * Starts from leaves and propagates to root.
   */
  evaluate(framework: ArgumentationFramework): EvaluatedFramework {
    const strengths = new Map<ArgumentId, number>();
    const order = this.getEvaluationOrder(framework);

    for (const argumentId of order) {
      const arg = framework.arguments.find(a => a.id === argumentId);
      if (!arg) {
        throw new Error(`Argument ${argumentId} not found in framework`);
      }

      const attackers = sortByKey(getAttackers(framework, argumentId), 'id');
      const supporters = sortByKey(getSupporters(framework, argumentId), 'id');

      const attackerStrengths = attackers.map(a => {
        const strength = strengths.get(a.id);
        if (strength === undefined) {
          throw new Error(`Attacker ${a.id} strength not yet computed`);
        }
        return strength;
      });

      const supporterStrengths = supporters.map(a => {
        const strength = strengths.get(a.id);
        if (strength === undefined) {
          throw new Error(`Supporter ${a.id} strength not yet computed`);
        }
        return strength;
      });

      const strength = this.computeStrength(
        arg.baseScore,
        attackerStrengths,
        supporterStrengths
      );

      strengths.set(argumentId, strength);
    }

    return createEvaluatedFramework(framework, strengths, 'df-quad');
  }

  /**
   * Returns arguments in evaluation order (leaves first, root last).
   * Uses deterministic topological sort based on relation direction.
   */
  private getEvaluationOrder(framework: ArgumentationFramework): ArgumentId[] {
    const inDegree = new Map<ArgumentId, number>();
    const adjacency = new Map<ArgumentId, ArgumentId[]>();

    for (const arg of framework.arguments) {
      inDegree.set(arg.id, 0);
      adjacency.set(arg.id, []);
    }

    for (const rel of framework.relations) {
      adjacency.get(rel.from)?.push(rel.to);
      inDegree.set(rel.to, (inDegree.get(rel.to) ?? 0) + 1);
    }

    const queue: ArgumentId[] = [];
    const result: ArgumentId[] = [];

    const sortedArgs = sortByKey(framework.arguments, 'id');
    for (const arg of sortedArgs) {
      if ((inDegree.get(arg.id) ?? 0) === 0) {
        queue.push(arg.id);
      }
    }
    queue.sort();

    while (queue.length > 0) {
      const current = queue.shift()!;
      result.push(current);

      const neighbors = adjacency.get(current) ?? [];
      const sortedNeighbors = [...neighbors].sort();
      for (const neighbor of sortedNeighbors) {
        const newDegree = (inDegree.get(neighbor) ?? 0) - 1;
        inDegree.set(neighbor, newDegree);
        if (newDegree === 0) {
          queue.push(neighbor);
          queue.sort();
        }
      }
    }

    if (result.length !== framework.arguments.length) {
      throw new Error('Framework contains cycles, cannot evaluate');
    }

    return result;
  }

  /**
   * Gets detailed evaluation for a single argument (for debugging/explanation).
   */
  getArgumentEvaluation(
    framework: ArgumentationFramework,
    argumentId: ArgumentId,
    strengths: Map<ArgumentId, number>
  ): ArgumentEvaluation {
    const arg = framework.arguments.find(a => a.id === argumentId);
    if (!arg) {
      throw new Error(`Argument ${argumentId} not found`);
    }

    const attackers = sortByKey(getAttackers(framework, argumentId), 'id');
    const supporters = sortByKey(getSupporters(framework, argumentId), 'id');

    const attackerStrengths = attackers.map(a => strengths.get(a.id) ?? a.baseScore);
    const supporterStrengths = supporters.map(a => strengths.get(a.id) ?? a.baseScore);

    const computedStrength = this.computeStrength(
      arg.baseScore,
      attackerStrengths,
      supporterStrengths
    );

    return {
      argumentId,
      baseScore: arg.baseScore,
      computedStrength,
      attackerStrengths,
      supporterStrengths,
    };
  }
}

/**
 * Creates a new DF-QuAD semantics instance.
 */
export function createDFQuADSemantics(): DFQuADSemantics {
  return new DFQuADSemantics();
}

/**
 * Convenience function to evaluate a framework using DF-QuAD.
 */
export function evaluateWithDFQuAD(
  framework: ArgumentationFramework
): EvaluatedFramework {
  return createDFQuADSemantics().evaluate(framework);
}
