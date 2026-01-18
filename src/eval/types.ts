import type {
  ArgumentationFramework,
  EvaluatedFramework,
  ValidationResult,
} from '../core/types.js';

export type CuadLabel = {
  readonly contractTitle: string;
  readonly category: string;
  readonly label: boolean;
};

export type CuadExample = CuadLabel & {
  readonly contractText: string;
  readonly question: string;
  readonly qaId: string;
  readonly goldSpans: readonly { readonly start: number; readonly end: number }[];
};

export type EvalMethod = 'baseline' | 'qbaf';

export type OpenAIChatParams = {
  readonly model: string;
  readonly temperature: number;
};

export type BaselineModelOutput = {
  readonly answer: 'yes' | 'no';
  readonly confidence: number;
  readonly evidenceSpans: readonly { readonly start: number; readonly end: number; readonly reason: string }[];
};

export type QbafModelOutput = {
  readonly framework: ArgumentationFramework;
  readonly evidence: readonly {
    readonly argumentId: string;
    readonly evidenceSpans: readonly { readonly start: number; readonly end: number; readonly reason: string }[];
  }[];
};

export type ContestabilityCheck = {
  readonly property: 'P1_pro_increase' | 'P1_con_increase';
  readonly holds: boolean;
  readonly details: string;
};

export type ExampleResult = {
  readonly qaId: string;
  readonly contractTitle: string;
  readonly category: string;
  readonly label: boolean;
  readonly method: EvalMethod;
  readonly predicted: boolean | null;
  readonly error?: string;

  readonly evidenceSpansChecked: number;
  readonly evidenceSpansValid: number;
  readonly evidenceTokenOverlapF1: number | null;

  readonly frameworkValidation?: ValidationResult;
  readonly schemaValidation?: ValidationResult;
  readonly evaluatedFramework?: EvaluatedFramework;

  readonly contestability?: readonly ContestabilityCheck[];
  readonly auditability?: {
    readonly minInterventionsToFlip?: number;
    readonly maxSingleArgumentDelta?: number;
    readonly note?: string;
  };
};

export type EvalSummary = {
  readonly method: EvalMethod;
  readonly total: number;
  readonly predicted: number;
  readonly accuracy: number | null;
  readonly evidenceSpanValidityRate: number | null;
  readonly evidenceSpanTokenF1: number | null;
  readonly schemaPassRate: number | null;
  readonly frameworkValidRate: number | null;
  readonly contestabilityHoldRate: number | null;
  readonly avgMinInterventionsToFlip: number | null;
  readonly avgMaxSingleArgumentDelta: number | null;
  readonly baseScoreFlippableRate: number | null;
};

export type EvalRun = {
  readonly runId: string;
  readonly startedAt: string;
  readonly finishedAt: string;
  readonly datasetPath: string;
  readonly contractCount: number;
  readonly categoryCount: number;
  readonly methods: readonly EvalMethod[];
  readonly openai: OpenAIChatParams;
  readonly results: readonly ExampleResult[];
  readonly summaries: readonly EvalSummary[];
  readonly notes?: string;
};
