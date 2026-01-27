import { writeFileSync } from 'fs';
import type { LegalBenchEvalRun } from './runner.js';

export type LegalBenchPredictionRow = {
  readonly task: string;
  readonly split: string;
  readonly id: number;
  readonly prediction: string;
  readonly retrieval?: { readonly trainId: string; readonly score: number };
  readonly meta?: Record<string, unknown>;
};

function coerceResultIndex(id: string, index: number | undefined): number {
  if (typeof index === 'number' && Number.isFinite(index)) return index;
  const fromId = Number(id.split('-').slice(-1)[0]);
  if (Number.isFinite(fromId)) return fromId;
  return 0;
}

export function buildLegalBenchPredictions(run: LegalBenchEvalRun): LegalBenchPredictionRow[] {
  const meta = {
    runId: run.runId,
    model: run.openai.model,
    temperature: run.openai.temperature,
    promptMode: run.promptMode,
    normalizeOutputs: run.normalizeOutputs,
    startedAt: run.startedAt,
    finishedAt: run.finishedAt,
  };

  const rows = run.results.map(result => ({
    task: result.task,
    split: run.split,
    id: coerceResultIndex(result.id, result.index),
    prediction: result.predicted ?? '',
    ...(result.retrieval ? { retrieval: result.retrieval } : {}),
    meta,
  }));

  return rows.sort((a, b) => {
    const t = a.task.localeCompare(b.task);
    if (t !== 0) return t;
    return a.id - b.id;
  });
}

export function predictionsToJsonl(rows: readonly LegalBenchPredictionRow[]): string {
  return `${rows.map(r => JSON.stringify(r)).join('\n')}\n`;
}

export function writeLegalBenchPredictions(path: string, run: LegalBenchEvalRun): void {
  const rows = buildLegalBenchPredictions(run);
  writeFileSync(path, predictionsToJsonl(rows), 'utf-8');
}
