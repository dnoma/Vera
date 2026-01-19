import { readFileSync, readdirSync } from 'fs';
import { resolve } from 'path';
import { validateHumanReview } from './validateHumanReview.js';
import type { HumanReview } from './types.js';
import { krippendorffAlphaOrdinalSquared } from './iaa.js';

export type HumanReviewDimension =
  | 'legalCorrectness'
  | 'evidenceSufficiency'
  | 'authorityAppropriateness'
  | 'traceReviewability'
  | 'uncertaintyAppropriateness'
  | 'overallAdoptability';

export type HumanReviewAggregates = {
  readonly totalReviews: number;
  readonly invalidReviews: number;
  readonly byMethod: Readonly<Record<'baseline' | 'qbaf', {
    readonly reviews: number;
    readonly mean: Readonly<Record<HumanReviewDimension, number | null>>;
    readonly iaaAlphaOrdinal: Readonly<Record<HumanReviewDimension, number | null>>;
  }>>;
};

const DIMENSIONS: readonly HumanReviewDimension[] = [
  'legalCorrectness',
  'evidenceSufficiency',
  'authorityAppropriateness',
  'traceReviewability',
  'uncertaintyAppropriateness',
  'overallAdoptability',
];

function mean(values: readonly number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

export function loadHumanReviews(dir: string): readonly HumanReview[] {
  const files = readdirSync(dir).filter(f => f.endsWith('.json'));
  const reviews: HumanReview[] = [];
  for (const f of files) {
    const p = resolve(dir, f);
    const raw = readFileSync(p, 'utf-8');
    const parsed = JSON.parse(raw) as HumanReview;
    reviews.push(parsed);
  }
  return reviews;
}

export function aggregateHumanReviews(reviews: readonly HumanReview[]): HumanReviewAggregates {
  const valid: HumanReview[] = [];
  let invalid = 0;
  for (const r of reviews) {
    const res = validateHumanReview(r);
    if (!res.valid) {
      invalid++;
      continue;
    }
    valid.push(r);
  }

  const compute = (method: 'baseline' | 'qbaf') => {
    const subset = valid.filter(r => r.case.method === method);
    return {
      reviews: subset.length,
      mean: Object.fromEntries(
        DIMENSIONS.map(d => [d, mean(subset.map(r => r.ratings[d]))])
      ) as HumanReviewAggregates['byMethod'][typeof method]['mean'],
      iaaAlphaOrdinal: Object.fromEntries(
        DIMENSIONS.map(d => {
          const records = subset.map(r => ({
            itemId: `${r.case.dataset}::${r.case.qaId}::${r.case.method}`,
            raterId: r.reviewId,
            value: r.ratings[d],
          }));
          return [d, krippendorffAlphaOrdinalSquared(records)];
        })
      ) as HumanReviewAggregates['byMethod'][typeof method]['iaaAlphaOrdinal'],
    };
  };

  return {
    totalReviews: reviews.length,
    invalidReviews: invalid,
    byMethod: {
      baseline: compute('baseline'),
      qbaf: compute('qbaf'),
    },
  };
}
