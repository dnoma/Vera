import { validateHumanReview } from '../src/eval/human-review/validateHumanReview.js';

describe('human review schema', () => {
  test('valid human review passes schema validation', () => {
    const review = {
      schemaVersion: '0.1.0',
      reviewId: 'review-1234abcd',
      createdAt: '2026-01-01T00:00:00.000Z',
      reviewer: {
        role: 'solicitor',
        experienceBand: '3-5',
        jurisdiction: 'England & Wales',
        practiceArea: 'Commercial',
      },
      case: {
        dataset: 'CUAD_v1',
        qaId: 'example-qa',
        contractTitle: 'Example Contract',
        category: 'Termination',
        method: 'qbaf',
        traceHash: 'a'.repeat(64),
      },
      ratings: {
        legalCorrectness: 4,
        evidenceSufficiency: 4,
        authorityAppropriateness: 4,
        traceReviewability: 4,
        uncertaintyAppropriateness: 4,
        overallAdoptability: 4,
      },
      notes: {
        summary: 'Clear trace; evidence appears sufficient.',
        failureModes: ['other'],
        recommendations: 'Improve citation targeting to operative clause.',
      },
    } as const;

    const result = validateHumanReview(review);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  test('invalid human review is rejected', () => {
    const review = {
      schemaVersion: '0.1.0',
      reviewId: 'not-a-review-id',
      createdAt: 'not-a-date',
      reviewer: { role: 'solicitor', experienceBand: '3-5' },
      case: { dataset: 'CUAD_v1', qaId: 'x', contractTitle: 'x', category: 'x', method: 'qbaf' },
      ratings: {
        legalCorrectness: 7,
        evidenceSufficiency: 3,
        authorityAppropriateness: 3,
        traceReviewability: 3,
        uncertaintyAppropriateness: 3,
        overallAdoptability: 3,
      },
      notes: { summary: 'x' },
    } as const;

    const result = validateHumanReview(review as unknown as Parameters<typeof validateHumanReview>[0]);
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });
});
