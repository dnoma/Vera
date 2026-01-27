/**
 * LegalBench dataset loader (local clone)
 *
 * Loads tasks from `data/legalbench/tasks/<taskName>/` (HazyResearch/legalbench).
 * Each task directory includes:
 * - `base_prompt.txt` (few-shot prompt with {{placeholders}})
 * - `<split>.tsv` (typically `test.tsv`)
 *
 * This intentionally avoids HuggingFace dataset scripts to keep evaluation
 * deterministic and offline-friendly.
 */

import { readdirSync, readFileSync } from 'fs';
import { resolve } from 'path';
import type {
  LegalBenchExample,
  LegalBenchReasoningType,
  LegalBenchTask,
  LegalBenchTaskType,
} from './types.js';

type StringRow = Record<string, string>;

function listTaskDirs(rootDir: string): readonly string[] {
  const tasksDir = resolve(rootDir, 'tasks');
  return readdirSync(tasksDir, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .map(d => d.name)
    .sort((a, b) => a.localeCompare(b));
}

function readUtf8(path: string): string {
  return readFileSync(path, 'utf-8');
}

function parseTsv(content: string): readonly StringRow[] {
  const lines = content
    .split(/\r?\n/)
    .map(l => l.trimEnd())
    .filter(l => l.length > 0);
  if (lines.length === 0) return [];

  const header = parseDelimitedLine(lines[0]!, '\t');
  const rows: StringRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const values = parseDelimitedLine(lines[i]!, '\t');
    const row: StringRow = {};
    for (let j = 0; j < header.length; j++) {
      const key = header[j]!;
      row[key] = values[j] ?? '';
    }
    rows.push(row);
  }
  return rows;
}

function parseDelimitedLine(line: string, delimiter: string): string[] {
  const out: string[] = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]!;
    if (ch === '"') {
      const next = line[i + 1];
      if (inQuotes && next === '"') {
        cur += '"';
        i++;
        continue;
      }
      inQuotes = !inQuotes;
      continue;
    }
    if (!inQuotes && ch === delimiter) {
      out.push(cur);
      cur = '';
      continue;
    }
    cur += ch;
  }
  out.push(cur);
  return out;
}

function applyPromptTemplate(template: string, row: StringRow): string {
  return template.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_m, key) => {
    const val = row[String(key)] ?? '';
    return val;
  });
}

/**
 * Task metadata with reasoning types
 * Based on LegalBench paper categorization
 */
const TASK_METADATA: Record<
  string,
  { reasoningType: LegalBenchReasoningType; taskType: LegalBenchTaskType }
> = {
  // Issue Spotting tasks
  abercrombie: { reasoningType: 'issue-spotting', taskType: 'opinion' },
  corporate_lobbying: { reasoningType: 'issue-spotting', taskType: 'statute' },
  international_citizenship_questions: {
    reasoningType: 'issue-spotting',
    taskType: 'statute',
  },
  function_of_decision_section: { reasoningType: 'issue-spotting', taskType: 'opinion' },
  proa: { reasoningType: 'issue-spotting', taskType: 'opinion' },

  // Rule Recall tasks
  citation_prediction_classification: { reasoningType: 'rule-recall', taskType: 'opinion' },
  citation_prediction_open: { reasoningType: 'rule-recall', taskType: 'opinion' },
  definition_classification: { reasoningType: 'rule-recall', taskType: 'statute' },
  definition_extraction: { reasoningType: 'rule-recall', taskType: 'statute' },

  // Rule Application tasks
  contract_nli_confidentiality_of_agreement: { reasoningType: 'rule-application', taskType: 'contract' },
  contract_nli_explicit_identification: { reasoningType: 'rule-application', taskType: 'contract' },
  contract_nli_inclusion_of_verbally_conveyed_information: { reasoningType: 'rule-application', taskType: 'contract' },
  contract_nli_limited_use: { reasoningType: 'rule-application', taskType: 'contract' },
  contract_nli_no_licensing: { reasoningType: 'rule-application', taskType: 'contract' },
  contract_nli_notice_on_compelled_disclosure: { reasoningType: 'rule-application', taskType: 'contract' },
  contract_nli_permissible_acquirement_of_similar_information: { reasoningType: 'rule-application', taskType: 'contract' },
  contract_nli_permissible_copy: { reasoningType: 'rule-application', taskType: 'contract' },
  contract_nli_permissible_development_of_similar_information: { reasoningType: 'rule-application', taskType: 'contract' },
  'contract_nli_permissible_post-agreement_possession': { reasoningType: 'rule-application', taskType: 'contract' },
  contract_nli_return_of_confidential_information: { reasoningType: 'rule-application', taskType: 'contract' },
  contract_nli_sharing_with_employees: { reasoningType: 'rule-application', taskType: 'contract' },
  'contract_nli_sharing_with_third-parties': { reasoningType: 'rule-application', taskType: 'contract' },
  contract_nli_survival_of_obligations: { reasoningType: 'rule-application', taskType: 'contract' },

  // Interpretation tasks
  canada_tax_court_outcomes: { reasoningType: 'interpretation', taskType: 'opinion' },
  insurance_policy_interpretation: { reasoningType: 'interpretation', taskType: 'contract' },
  nys_judicial_ethics: { reasoningType: 'interpretation', taskType: 'opinion' },
  scalr: { reasoningType: 'interpretation', taskType: 'opinion' },
  ssla_company_defendants: { reasoningType: 'interpretation', taskType: 'opinion' },
  ssla_individual_defendants: { reasoningType: 'interpretation', taskType: 'opinion' },
  ssla_plaintiff: { reasoningType: 'interpretation', taskType: 'opinion' },

  // Rhetorical Understanding tasks
  legal_reasoning_causality: { reasoningType: 'rhetorical-understanding', taskType: 'opinion' },
  overruling: { reasoningType: 'rhetorical-understanding', taskType: 'opinion' },
  successor_liability: { reasoningType: 'rhetorical-understanding', taskType: 'opinion' },
};

function getTaskMetadata(taskName: string): {
  reasoningType: LegalBenchReasoningType;
  taskType: LegalBenchTaskType;
} {
  return TASK_METADATA[taskName] ?? {
    reasoningType: 'rule-application',
    taskType: 'mixed',
  };
}

function pickAnswer(row: StringRow): string {
  return (
    row['answer'] ??
    row['label'] ??
    row['gold_label'] ??
    row['gold'] ??
    ''
  );
}

function maybeBinaryLabel(answer: string): boolean | undefined {
  const a = answer.trim().toLowerCase();
  if (a === 'yes' || a === 'true' || a === '1' || a === 'entailment') return true;
  if (a === 'no' || a === 'false' || a === '0' || a === 'not-entailment' || a === 'contradiction') return false;
  return undefined;
}

export type LoadLegalBenchOptions = {
  /** Root directory containing `tasks/` (default `data/legalbench`) */
  rootDir?: string;
  /** Tasks to load (default: all) */
  tasks?: readonly string[];
  /** Reasoning types to filter by */
  reasoningTypes?: readonly LegalBenchReasoningType[];
  /** Task types to filter by */
  taskTypes?: readonly LegalBenchTaskType[];
  /** Split to load (default: test) */
  split?: string;
  /** Max examples per task (default: unlimited) */
  perTask?: number;
};

export function loadLegalBenchExamples(
  options: LoadLegalBenchOptions = {}
): readonly LegalBenchExample[] {
  const rootDir = options.rootDir ?? 'data/legalbench';
  const split = options.split ?? 'test';
  const perTask = options.perTask;

  const available = listTaskDirs(rootDir);
  const tasksToLoad = options.tasks?.length
    ? available.filter(t => options.tasks!.includes(t))
    : available;

  const examples: LegalBenchExample[] = [];
  for (const taskName of tasksToLoad) {
    const { reasoningType, taskType } = getTaskMetadata(taskName);
    if (options.reasoningTypes?.length && !options.reasoningTypes.includes(reasoningType)) {
      continue;
    }
    if (options.taskTypes?.length && !options.taskTypes.includes(taskType)) {
      continue;
    }

    const taskDir = resolve(rootDir, 'tasks', taskName);
    const basePromptPath = resolve(taskDir, 'base_prompt.txt');
    const tsvPath = resolve(taskDir, `${split}.tsv`);

    const template = readUtf8(basePromptPath);
    const rows = parseTsv(readUtf8(tsvPath));

    let used = 0;
    for (let i = 0; i < rows.length; i++) {
      if (perTask !== undefined && used >= perTask) break;
      const row = rows[i]!;
      const goldAnswer = pickAnswer(row);
      if (!goldAnswer) continue;

      const rawIndex = row['index'] ?? String(i);
      const parsedIndex = Number(rawIndex);
      const rowIndex = Number.isFinite(parsedIndex) ? parsedIndex : i;

      const prompt = applyPromptTemplate(template, row);
      const text = row['text'] ?? '';
      const question = row['question'] ?? '';
      const label = maybeBinaryLabel(goldAnswer);

      examples.push({
        id: `${taskName}-${rowIndex}`,
        index: rowIndex,
        task: taskName,
        reasoningType,
        taskType,
        text,
        question,
        ...(label !== undefined ? { label } : {}),
        prompt,
        goldAnswer,
      });
      used++;
    }
  }

  return examples;
}

export function listLegalBenchTasks(
  examples: readonly LegalBenchExample[]
): readonly LegalBenchTask[] {
  const taskMap = new Map<string, LegalBenchTask>();
  for (const e of examples) {
    if (!taskMap.has(e.task)) {
      taskMap.set(e.task, {
        name: e.task,
        reasoningType: e.reasoningType,
        taskType: e.taskType,
        description: `LegalBench task: ${e.task}`,
        exampleCount: 0,
      });
    }
    const t = taskMap.get(e.task)!;
    taskMap.set(e.task, { ...t, exampleCount: t.exampleCount + 1 });
  }
  return [...taskMap.values()].sort((a, b) => a.name.localeCompare(b.name));
}
