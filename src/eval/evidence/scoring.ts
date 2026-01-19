import { segmentIntoEvidenceUnits, unitIdsOverlappingSpan } from './units.js';

export type EvidenceScores = {
  readonly predictedUnitIds: readonly string[];
  readonly goldUnitIds: readonly string[];
  readonly predictedUnitCount: number;
  readonly goldUnitCount: number;
  readonly coverage: number | null;
  readonly parsimonyPenalty: number | null;
  readonly minimalSufficiencyScore: number | null;
};

function uniqSorted(values: readonly string[]): readonly string[] {
  return [...new Set(values)].sort();
}

export function scoreMinimalSufficiency(params: {
  readonly contractText: string;
  readonly label: boolean;
  readonly predictedSpans: readonly { start: number; end: number }[];
  readonly goldSpans: readonly { start: number; end: number }[];
}): EvidenceScores {
  const units = segmentIntoEvidenceUnits(params.contractText);

  const predictedUnitIds = uniqSorted(
    params.predictedSpans.flatMap(span => unitIdsOverlappingSpan(units, span))
  );
  const goldUnitIds = uniqSorted(
    params.goldSpans.flatMap(span => unitIdsOverlappingSpan(units, span))
  );

  const predictedSet = new Set(predictedUnitIds);
  const goldSet = new Set(goldUnitIds);

  const intersectionCount = predictedUnitIds.filter(id => goldSet.has(id)).length;
  const extraneousCount = predictedUnitIds.filter(id => !goldSet.has(id)).length;

  // For negative labels, the minimal sufficient behaviour is: no evidence.
  if (!params.label) {
    const mss = predictedUnitIds.length === 0 ? 1 : 0;
    return {
      predictedUnitIds,
      goldUnitIds,
      predictedUnitCount: predictedUnitIds.length,
      goldUnitCount: goldUnitIds.length,
      coverage: null,
      parsimonyPenalty: null,
      minimalSufficiencyScore: mss,
    };
  }

  // For positive labels, CUAD supervision may still be missing/empty.
  if (goldUnitIds.length === 0) {
    return {
      predictedUnitIds,
      goldUnitIds,
      predictedUnitCount: predictedUnitIds.length,
      goldUnitCount: 0,
      coverage: null,
      parsimonyPenalty: null,
      minimalSufficiencyScore: null,
    };
  }

  const coverage = intersectionCount / goldUnitIds.length;
  const parsimonyPenalty = 1 / (1 + extraneousCount);
  const minimalSufficiencyScore = coverage * parsimonyPenalty;

  // Defensive clamp for floating point drift.
  const clamp01 = (x: number) => Math.max(0, Math.min(1, x));

  return {
    predictedUnitIds,
    goldUnitIds,
    predictedUnitCount: predictedUnitIds.length,
    goldUnitCount: goldUnitIds.length,
    coverage: clamp01(coverage),
    parsimonyPenalty: clamp01(parsimonyPenalty),
    minimalSufficiencyScore: clamp01(minimalSufficiencyScore),
  };
}

export type AuthorityTier = 'operative' | 'non_operative';

export function classifyAuthorityTier(unitText: string): AuthorityTier {
  const t = unitText.trim();
  const upper = t.toUpperCase();

  if (t.length === 0) return 'non_operative';
  if (upper.startsWith('WHEREAS')) return 'non_operative';
  if (upper.startsWith('RECITAL')) return 'non_operative';
  if (upper.startsWith('BACKGROUND')) return 'non_operative';
  if (upper.startsWith('TABLE OF CONTENTS')) return 'non_operative';

  const letters = t.replace(/[^A-Za-z]/g, '');
  const upperLetters = letters.replace(/[^A-Z]/g, '');
  const uppercaseRatio = letters.length === 0 ? 0 : upperLetters.length / letters.length;

  // Heuristic: short, mostly-uppercase lines are typically headings.
  if (t.length <= 80 && uppercaseRatio >= 0.85) return 'non_operative';

  return 'operative';
}

export function authorityAppropriatenessRate(params: {
  readonly contractText: string;
  readonly predictedSpans: readonly { start: number; end: number }[];
}): { readonly citedUnitCount: number; readonly operativeUnitCount: number; readonly rate: number | null } {
  const units = segmentIntoEvidenceUnits(params.contractText);
  const unitById = new Map(units.map(u => [u.id, u] as const));

  const citedUnitIds = uniqSorted(
    params.predictedSpans.flatMap(span => unitIdsOverlappingSpan(units, span))
  );
  if (citedUnitIds.length === 0) {
    return { citedUnitCount: 0, operativeUnitCount: 0, rate: null };
  }

  let operative = 0;
  for (const id of citedUnitIds) {
    const u = unitById.get(id);
    if (!u) continue;
    if (classifyAuthorityTier(u.text) === 'operative') operative++;
  }

  return { citedUnitCount: citedUnitIds.length, operativeUnitCount: operative, rate: operative / citedUnitIds.length };
}

