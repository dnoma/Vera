/** Unique identifier for audit traces. Format: "trace-{uuid}" */
export type TraceId = string;

/** Unique identifier for arguments in the framework. Format: "arg-{uuid}" */
export type ArgumentId = string;

/** Unique identifier for sources. Format: "src-{uuid}" */
export type SourceId = string;

/** Unique identifier for relations. Format: "rel-{uuid}" */
export type RelationId = string;

/** Unique identifier for claims. Format: "claim-{uuid}" */
export type ClaimId = string;

/** Unique identifier for contestations. Format: "contest-{uuid}" */
export type ContestationId = string;

/** ISO 8601 timestamp string */
export type Timestamp = string;

/** SHA-256 hash as 64-character hex string */
export type ContentHash = string;

/** Semantic version string (e.g., "1.0.0") */
export type Version = string;

/**
 * The statement being evaluated by the argumentation framework.
 * This is the root of the reasoning structure.
 */
export interface Claim {
  readonly id: ClaimId;
  readonly statement: string;
  readonly context: string;
  readonly createdAt: Timestamp;
}

/** Type of source material */
export type SourceType =
  | 'policy'
  | 'regulation'
  | 'guidance'
  | 'precedent'
  | 'reference'
  | 'document';

/**
 * Metadata associated with a source.
 */
export interface SourceMetadata {
  readonly type: SourceType;
  readonly version?: Version;
  readonly effectiveDate?: Timestamp;
  readonly expirationDate?: Timestamp;
  readonly jurisdiction?: string;
  readonly tags: readonly string[];
}

/**
 * Source material referenced in reasoning.
 * All sources in this reference implementation are mocked.
 */
export interface Source {
  readonly id: SourceId;
  readonly title: string;
  readonly description: string;
  readonly contentHash: ContentHash;
  readonly retrievedAt: Timestamp;
  readonly metadata: SourceMetadata;
}

/**
 * An explicit assumption made during reasoning.
 * Assumptions are primary targets for contestation.
 */
export interface Assumption {
  readonly id: string;
  readonly statement: string;
  readonly basis: string;
  readonly isContestable: boolean;
}

/**
 * An argument in the argumentation framework (node in the QBAF).
 *
 * @property baseScore - Intrinsic strength τ(α) ∈ [0,1], assigned before dialectical evaluation
 * @property computedStrength - Dialectical strength σ(α) ∈ [0,1], computed by gradual semantics
 */
export interface Argument {
  readonly id: ArgumentId;
  readonly content: string;
  readonly baseScore: number;
  readonly computedStrength?: number;
  readonly sourceRefs: readonly SourceId[];
  readonly assumptions: readonly Assumption[];
}

/** Type of dialectical relation between arguments */
export type RelationType = 'attack' | 'support';

/**
 * A directed relation between two arguments.
 *
 * Attack: The source argument undermines the target argument.
 * Support: The source argument strengthens the target argument.
 */
export interface Relation {
  readonly id: RelationId;
  readonly from: ArgumentId;
  readonly to: ArgumentId;
  readonly type: RelationType;
}

/**
 * A Quantitative Bipolar Argumentation Framework (QBAF).
 *
 * Structure: QBAF = ⟨A, R⁻, R⁺, τ⟩
 * - A: set of arguments
 * - R⁻: attack relations
 * - R⁺: support relations
 * - τ: base score function (stored in each Argument)
 *
 * Constraints (validated separately):
 * - Must be acyclic (tree structure)
 * - Single path from any argument to root
 * - All arguments reachable from root claim
 */
export interface ArgumentationFramework {
  readonly rootClaimId: ArgumentId;
  readonly arguments: readonly Argument[];
  readonly relations: readonly Relation[];
}

/**
 * Classification of an argument relative to the root claim.
 *
 * Pro: Even number of attacks on path to root (supports the claim)
 * Con: Odd number of attacks on path to root (opposes the claim)
 */
export type ArgumentRole = 'pro' | 'con';

/**
 * Framework with computed strengths after semantic evaluation.
 */
export interface EvaluatedFramework extends ArgumentationFramework {
  readonly arguments: readonly (Argument & { readonly computedStrength: number })[];
  readonly semanticsUsed: SemanticsType;
  readonly evaluatedAt: Timestamp;
}

/** Severity level for risk assessment */
export type Severity = 'low' | 'medium' | 'high' | 'critical';

/**
 * An explicit unknown factor in the reasoning.
 */
export interface Unknown {
  readonly id: string;
  readonly description: string;
  readonly impact: string;
  readonly mitigationStrategy?: string;
}

/**
 * A risk flag indicating potential issues.
 */
export interface RiskFlag {
  readonly id: string;
  readonly description: string;
  readonly severity: Severity;
  readonly relatedArgumentIds: readonly ArgumentId[];
}

/**
 * Explicit uncertainty in the reasoning.
 * Must always be present, even if minimal.
 */
export interface Uncertainty {
  readonly unknowns: readonly Unknown[];
  readonly riskFlags: readonly RiskFlag[];
  readonly confidenceStatement: string;
}

/**
 * Type of contestation challenge.
 */
export type ContestationType =
  | 'base_score_modification'
  | 'argument_addition'
  | 'argument_removal'
  | 'relation_addition'
  | 'relation_removal'
  | 'assumption_challenge'
  | 'source_challenge';

/**
 * A structured challenge to the reasoning.
 * Contestations trigger recomputation of the framework.
 */
export interface Contestation {
  readonly id: ContestationId;
  readonly type: ContestationType;
  readonly challenge: string;
  readonly targetArgumentId?: ArgumentId;
  readonly targetRelationId?: RelationId;
  readonly targetAssumptionId?: string;
  readonly targetSourceId?: SourceId;
  readonly newBaseScore?: number;
  readonly newArgument?: Omit<Argument, 'computedStrength'>;
  readonly newRelation?: Relation;
  readonly submittedAt: Timestamp;
  readonly submittedBy?: string;
}

/**
 * Predicted effect of applying a contestation.
 */
export type ContestationEffect =
  | 'will_increase'
  | 'will_decrease'
  | 'no_effect'
  | 'indeterminate';

/**
 * Metadata about a recompute triggered by contestation or update.
 */
export interface RecomputeMetadata {
  readonly priorTraceId: TraceId;
  readonly triggeredBy: ContestationId | 'source_update' | 'manual';
  readonly changedArgumentIds: readonly ArgumentId[];
  readonly recomputedAt: Timestamp;
  readonly strengthDelta: number;
  readonly decisionChanged: boolean;
  readonly diffSummary: string;
}

/** Decision label derived from final strength */
export type DecisionLabel = 'supported' | 'contested' | 'indeterminate';

/**
 * Decision derived from the evaluated framework.
 */
export interface Decision {
  readonly label: DecisionLabel;
  readonly finalStrength: number;
  readonly threshold: number;
  readonly conclusion: string;
  readonly conditions?: readonly string[];
}

/**
 * Explicit limitations of the reasoning.
 */
export interface Limitations {
  readonly scopeLimitations: readonly string[];
  readonly temporalLimitations: readonly string[];
  readonly sourceLimitations: readonly string[];
  readonly methodLimitations: readonly string[];
}

/** Status of human review */
export type ReviewStatus =
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'requires_changes';

/**
 * Human review information.
 */
export interface HumanReview {
  readonly status: ReviewStatus;
  readonly reviewerId?: string;
  readonly reviewedAt?: Timestamp;
  readonly comments?: string;
  readonly requiredActions?: readonly string[];
}

/**
 * Integrity fields for tamper detection.
 * All hashes computed using deterministic serialization.
 */
export interface IntegrityFields {
  readonly claimHash: ContentHash;
  readonly frameworkHash: ContentHash;
  readonly sourcesHash: ContentHash;
  readonly uncertaintyHash: ContentHash;
  readonly traceHash: ContentHash;
}

/**
 * Supported gradual semantics algorithms.
 */
export type SemanticsType = 'df-quad' | 'quadratic-energy';

/**
 * Complete audit trace - the primary output of Vera.
 *
 * An audit trace captures the entire reasoning process in a
 * contestable, deterministic, and verifiable format.
 */
export interface AuditTrace {
  // Identity
  readonly traceId: TraceId;
  readonly version: Version;
  readonly createdAt: Timestamp;

  // The reasoning
  readonly claim: Claim;
  readonly framework: EvaluatedFramework;

  // Sources
  readonly sources: readonly Source[];
  readonly unusedSourceIds: readonly SourceId[];

  // Decision
  readonly decision: Decision;

  // Uncertainty (required)
  readonly uncertainty: Uncertainty;

  // Contestation (if this is a recompute)
  readonly contestation?: Contestation;
  readonly recomputeMetadata?: RecomputeMetadata;

  // Human oversight
  readonly humanReview?: HumanReview;

  // Limitations (required)
  readonly limitations: Limitations;

  // Integrity
  readonly integrity: IntegrityFields;
}

/**
 * Validation error detail.
 */
export interface ValidationError {
  readonly code: string;
  readonly message: string;
  readonly path?: string;
  readonly severity: 'error' | 'warning';
}

/**
 * Result of validating an audit trace or framework.
 */
export interface ValidationResult {
  readonly valid: boolean;
  readonly errors: readonly ValidationError[];
  readonly checkedAt: Timestamp;
}

/**
 * Invariant names for the system.
 */
export type InvariantName =
  | 'ACYCLIC'
  | 'TREE_STRUCTURE'
  | 'CONNECTED'
  | 'VALID_BASE_SCORES'
  | 'VALID_COMPUTED_STRENGTHS'
  | 'SOURCES_REFERENCED'
  | 'UNCERTAINTY_PRESENT'
  | 'DETERMINISTIC';

/**
 * Result of checking a single invariant.
 */
export interface InvariantCheckResult {
  readonly invariant: InvariantName;
  readonly passed: boolean;
  readonly details?: string;
}
