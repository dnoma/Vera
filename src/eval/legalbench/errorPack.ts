import { writeFileSync } from 'fs';
import { hash } from '../../integrity/hash.js';
import { legalBenchPredictionOutcome } from './evaluation.js';
import { extractLegalBenchIndex } from './ids.js';
import type { LegalBenchExample } from './types.js';
import type { LegalBenchEvalRun } from './runner.js';

type ErrorItem = {
  readonly task: string;
  readonly split: string;
  readonly id: number;
  readonly prediction: string;
  readonly predictionRaw?: string;
  readonly gold: string;
  readonly retrieval?: { readonly trainId: string; readonly score: number };
  readonly promptHash: string;
  readonly source: { readonly text: string; readonly question: string };
  readonly prompt?: string;
};

type TaskErrors = {
  readonly task: string;
  readonly totalErrors: number;
  readonly sampled: readonly ErrorItem[];
};

type ErrorPackOptions = {
  readonly topN: number;
  readonly seed: string;
  readonly includePrompt: boolean;
  readonly sourcePath?: string;
};

function coerceResultIndex(id: string, index: number | undefined): number {
  if (typeof index === 'number' && Number.isFinite(index)) return index;
  const fromId = extractLegalBenchIndex(id);
  if (fromId !== undefined) return fromId;
  return 0;
}

function seedFromString(seed: string): number {
  return Number.parseInt(hash(seed).slice(0, 8), 16);
}

function mulberry32(seed: number): () => number {
  let t = seed;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), t | 1);
    r ^= r + Math.imul(r ^ (r >>> 7), r | 61);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

function sampleWithSeed<T>(items: readonly T[], n: number, seed: string): readonly T[] {
  if (items.length <= n) return items;
  const arr = [...items];
  const rng = mulberry32(seedFromString(seed));
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j]!, arr[i]!];
  }
  return arr.slice(0, n);
}

function buildTaskErrors(
  run: LegalBenchEvalRun,
  examples: readonly LegalBenchExample[],
  options: ErrorPackOptions
): readonly TaskErrors[] {
  const exampleByTaskIndex = new Map<string, Map<number, LegalBenchExample>>();
  for (const ex of examples) {
    const byIndex = exampleByTaskIndex.get(ex.task) ?? new Map<number, LegalBenchExample>();
    byIndex.set(ex.index, ex);
    exampleByTaskIndex.set(ex.task, byIndex);
  }

  const errorsByTask = new Map<string, ErrorItem[]>();
  for (const result of run.results) {
    const idx = coerceResultIndex(result.id, result.index);
    const outcome = legalBenchPredictionOutcome({
      task: result.task,
      prediction: result.predicted,
      answer: result.goldAnswer,
    });
    if (outcome !== 'incorrect') continue;
    const ex = exampleByTaskIndex.get(result.task)?.get(idx);
    const prompt = ex?.prompt ?? '';
    const error: ErrorItem = {
      task: result.task,
      split: run.split,
      id: idx,
      prediction: result.predicted ?? '',
      ...(result.predictedRaw ? { predictionRaw: result.predictedRaw } : {}),
      gold: result.goldAnswer,
      ...(result.retrieval ? { retrieval: result.retrieval } : {}),
      promptHash: hash(prompt),
      source: { text: ex?.text ?? '', question: ex?.question ?? '' },
      ...(options.includePrompt ? { prompt } : {}),
    };
    const arr = errorsByTask.get(result.task) ?? [];
    arr.push(error);
    errorsByTask.set(result.task, arr);
  }

  const tasks = [...errorsByTask.keys()].sort((a, b) => a.localeCompare(b));
  return tasks.map(task => {
    const errors = errorsByTask.get(task) ?? [];
    const sampled = sampleWithSeed(errors, options.topN, `${options.seed}:${task}`);
    return { task, totalErrors: errors.length, sampled };
  });
}

export function writeLegalBenchErrorPack(
  path: string,
  run: LegalBenchEvalRun,
  examples: readonly LegalBenchExample[],
  options: ErrorPackOptions
): void {
  const lines: string[] = [];
  const normalizeOutputs = run.normalizeOutputs ?? false;
  lines.push('# LegalBench Error Pack');
  lines.push('');
  lines.push(`- Run id: \`${run.runId}\``);
  lines.push(`- Model: \`${run.openai.model}\` (temperature=${run.openai.temperature})`);
  lines.push(`- Prompt mode: \`${run.promptMode}\``);
  lines.push(`- Normalize outputs: \`${normalizeOutputs}\``);
  lines.push(`- Top N per task: \`${options.topN}\``);
  lines.push(`- Seed: \`${options.seed}\``);
  if (options.sourcePath) lines.push(`- Source run: \`${options.sourcePath}\``);
  lines.push('');

  const tasks = buildTaskErrors(run, examples, options);
  for (const task of tasks) {
    if (task.totalErrors === 0) continue;
    lines.push(`## ${task.task}`);
    lines.push(`- Errors: ${task.totalErrors} (sampled ${task.sampled.length})`);
    lines.push('');
    for (const err of task.sampled) {
      lines.push('```json');
      lines.push(JSON.stringify(err, null, 2));
      lines.push('```');
      lines.push('');
    }
  }

  writeFileSync(path, `${lines.join('\n')}\n`, 'utf-8');
}
