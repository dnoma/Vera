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
};

export type EvalMethod = 'baseline' | 'qbaf';

export type OpenAIChatParams = {
  readonly model: string;
  readonly temperature: number;
};

export type BaselineModelOutput = {
  readonly answer: 'yes' | 'no';
  readonly confidence: number;
  readonly citations: readonly { readonly quote: string; readonly reason: string }[];
};

export type QbafModelOutput = {
  readonly framework: ArgumentationFramework;
  readonly evidence: readonly {
    readonly argumentId: string;
    readonly quotes: readonly { readonly quote: string; readonly reason: string }[];
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

  readonly citationsChecked: number;
  readonly citationsMatched: number;

  readonly frameworkValidation?: ValidationResult;
  readonly schemaValidation?: ValidationResult;
  readonly evaluatedFramework?: EvaluatedFramework;

  readonly contestability?: readonly ContestabilityCheck[];
};

export type EvalSummary = {
  readonly method: EvalMethod;
  readonly total: number;
  readonly predicted: number;
  readonly accuracy: number | null;
  readonly citationMatchRate: number | null;
  readonly schemaPassRate: number | null;
  readonly frameworkValidRate: number | null;
  readonly contestabilityHoldRate: number | null;
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
