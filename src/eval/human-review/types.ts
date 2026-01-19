export type HumanReview = {
  readonly schemaVersion: '0.1.0';
  readonly reviewId: string;
  readonly createdAt: string;
  readonly reviewer: {
    readonly role:
      | 'solicitor'
      | 'barrister'
      | 'paralegal'
      | 'psl'
      | 'law-graduate'
      | 'researcher'
      | 'other';
    readonly experienceBand: '0-2' | '3-5' | '6-10' | '10+';
    readonly jurisdiction?: string;
    readonly practiceArea?: string;
  };
  readonly case: {
    readonly dataset: string;
    readonly qaId: string;
    readonly contractTitle: string;
    readonly category: string;
    readonly method: 'baseline' | 'qbaf';
    readonly traceHash?: string;
  };
  readonly ratings: {
    readonly legalCorrectness: 1 | 2 | 3 | 4 | 5;
    readonly evidenceSufficiency: 1 | 2 | 3 | 4 | 5;
    readonly authorityAppropriateness: 1 | 2 | 3 | 4 | 5;
    readonly traceReviewability: 1 | 2 | 3 | 4 | 5;
    readonly uncertaintyAppropriateness: 1 | 2 | 3 | 4 | 5;
    readonly overallAdoptability: 1 | 2 | 3 | 4 | 5;
  };
  readonly notes: {
    readonly summary: string;
    readonly failureModes?: readonly (
      | 'misleading-citation'
      | 'insufficient-evidence'
      | 'over-citation'
      | 'missed-exception'
      | 'over-confident'
      | 'unreviewable-trace'
      | 'hidden-assumption'
      | 'brittle-outcome'
      | 'inappropriate-authority'
      | 'other'
    )[];
    readonly recommendations?: string;
  };
};

