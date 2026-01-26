import { hash } from '../../integrity/hash.js';

export type ReviewDecision = 'approved' | 'rejected' | 'needs_more_evidence';
export type ReviewState = 'draft' | ReviewDecision;

export type Review = {
  reviewId: string;
  state: ReviewState;
  packetId: string;
  decision: ReviewDecision;
  notes?: string;
  submittedAt: string;
};

export type ReviewStore = {
  save(review: Review): Promise<void>;
  get(reviewId: string): Promise<Review | null>;
};

export class InMemoryReviewStore implements ReviewStore {
  private readonly reviews = new Map<string, Review>();

  async save(review: Review): Promise<void> {
    this.reviews.set(review.reviewId, review);
  }

  async get(reviewId: string): Promise<Review | null> {
    return this.reviews.get(reviewId) ?? null;
  }
}

export function createReviewId(input: { requestId: string; packetId: string; decision: ReviewDecision }): string {
  return hash(input);
}

