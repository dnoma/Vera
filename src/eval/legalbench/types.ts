/**
 * LegalBench dataset types
 * Dataset: nguha/legalbench on HuggingFace
 * 162 tasks across 6 reasoning types
 */

export type LegalBenchReasoningType =
  | 'issue-spotting'
  | 'rule-recall'
  | 'rule-application'
  | 'rule-conclusion'
  | 'interpretation'
  | 'rhetorical-understanding';

export type LegalBenchTaskType =
  | 'contract'
  | 'statute'
  | 'opinion'
  | 'mixed';

export type LegalBenchExample = {
  readonly id: string;
  /** Row index (0-based) from the TSV `index` column. */
  readonly index: number;
  readonly task: string;
  readonly reasoningType: LegalBenchReasoningType;
  readonly taskType: LegalBenchTaskType;
  readonly text: string;
  readonly question: string;
  /** Present only for binary tasks. */
  readonly label?: boolean;
  /** Fully rendered prompt for the paper-style few-shot evaluation. */
  readonly prompt: string;
  /** Raw ground-truth answer string from the TSV. */
  readonly goldAnswer: string;
};

export type LegalBenchTask = {
  readonly name: string;
  readonly reasoningType: LegalBenchReasoningType;
  readonly taskType: LegalBenchTaskType;
  readonly description: string;
  readonly exampleCount: number;
};

export type LegalBenchDataset = {
  readonly tasks: readonly LegalBenchTask[];
  readonly examples: readonly LegalBenchExample[];
};
