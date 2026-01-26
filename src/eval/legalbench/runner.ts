import { mkdirSync, writeFileSync } from 'fs';
import { resolve } from 'path';
import { hash } from '../../integrity/hash.js';
import type { OpenAIChatParams } from '../types.js';
import { openAIChatText } from '../openai/client.js';
import type { LegalBenchExample } from './types.js';
import { evaluateLegalBenchTask, type LegalBenchMetric } from './evaluation.js';

export type LegalBenchExampleResult = {
  readonly id: string;
  readonly task: string;
  readonly goldAnswer: string;
  readonly predicted: string | null;
  readonly error?: string;
};

export type LegalBenchTaskSummary = {
  readonly task: string;
  readonly reasoningType: string;
  readonly taskType: string;
  readonly total: number;
  readonly predicted: number;
  readonly metric: LegalBenchMetric['metric'];
  readonly score: number | null;
};

export type LegalBenchEvalRun = {
  readonly runId: string;
  readonly startedAt: string;
  readonly finishedAt: string;
  readonly datasetPath: string;
  readonly split: string;
  readonly tasks: readonly string[];
  readonly openai: OpenAIChatParams;
  readonly results: readonly LegalBenchExampleResult[];
  readonly taskSummaries: readonly LegalBenchTaskSummary[];
  readonly overall: {
    readonly total: number;
    readonly predicted: number;
    readonly macroScore: number | null;
  };
};

type RunLegalBenchParams = {
  readonly datasetPath: string;
  readonly split: string;
  readonly outDir: string;
  readonly examples: readonly LegalBenchExample[];
  readonly openai: OpenAIChatParams;
  readonly apiKey: string;
  readonly progressEvery?: number;
  readonly checkpointEvery?: number;
};

function nowIso(): string {
  return new Date().toISOString();
}

export async function runLegalBenchEval(
  params: RunLegalBenchParams
): Promise<LegalBenchEvalRun> {
  const startedAt = nowIso();
  const runId = `legalbench-${hash({ startedAt, model: params.openai.model }).slice(0, 10)}`;

  const progressEvery = params.progressEvery ?? 50;
  const checkpointEvery = params.checkpointEvery ?? 250;

  const results: LegalBenchExampleResult[] = [];
  const total = params.examples.length;
  for (let i = 0; i < total; i++) {
    const ex = params.examples[i]!;
    try {
      const resp = await openAIChatText(
        {
          model: params.openai.model,
          temperature: params.openai.temperature,
          messages: [
            {
              role: 'system',
              content:
                'Answer the final question. Reply with only the answer text (no JSON, no markdown).',
            },
            { role: 'user', content: ex.prompt },
          ],
        },
        params.apiKey
      );
      results.push({
        id: ex.id,
        task: ex.task,
        goldAnswer: ex.goldAnswer,
        predicted: resp.content.trim(),
      });
    } catch (err) {
      results.push({
        id: ex.id,
        task: ex.task,
        goldAnswer: ex.goldAnswer,
        predicted: null,
        error: err instanceof Error ? err.message : String(err),
      });
    }

    const done = i + 1;
    if (progressEvery > 0 && (done === 1 || done % progressEvery === 0 || done === total)) {
      // eslint-disable-next-line no-console
      console.log(
        JSON.stringify(
          {
            event: 'legalbench.progress',
            runId,
            done,
            total,
            pct: Number(((done / total) * 100).toFixed(2)),
            predicted: results.filter(r => r.predicted !== null).length,
          },
          null,
          0
        )
      );
    }

    if (checkpointEvery > 0 && done % checkpointEvery === 0) {
      mkdirSync(params.outDir, { recursive: true });
      const partial = {
        runId,
        startedAt,
        datasetPath: params.datasetPath,
        split: params.split,
        openai: params.openai,
        results,
      };
      writeFileSync(
        resolve(params.outDir, 'legalbench-partial.json'),
        JSON.stringify(partial, null, 2),
        'utf-8'
      );
    }
  }

  const byTask = new Map<string, LegalBenchExampleResult[]>();
  for (const r of results) {
    const arr = byTask.get(r.task) ?? [];
    arr.push(r);
    byTask.set(r.task, arr);
  }

  const taskSummaries: LegalBenchTaskSummary[] = [];
  for (const [task, taskResults] of [...byTask.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
    const examples = params.examples.filter(e => e.task === task);
    const any = examples[0];
    const predicted = taskResults.filter(r => r.predicted !== null).length;

    let metric: LegalBenchMetric | null = null;
    try {
      metric = evaluateLegalBenchTask({
        task,
        generations: taskResults.map(r => r.predicted ?? ''),
        answers: taskResults.map(r => r.goldAnswer),
      });
    } catch {
      metric = null;
    }

    taskSummaries.push({
      task,
      reasoningType: any?.reasoningType ?? 'unknown',
      taskType: any?.taskType ?? 'unknown',
      total: taskResults.length,
      predicted,
      metric: metric?.metric ?? 'balanced_accuracy',
      score: metric ? metric.score : null,
    });
  }

  const macroScores = taskSummaries.map(s => s.score).filter((x): x is number => typeof x === 'number');
  const macroScore =
    macroScores.length === 0
      ? null
      : macroScores.reduce((s, x) => s + x, 0) / macroScores.length;

  const run: LegalBenchEvalRun = {
    runId,
    startedAt,
    finishedAt: nowIso(),
    datasetPath: params.datasetPath,
    split: params.split,
    tasks: [...byTask.keys()].sort((a, b) => a.localeCompare(b)),
    openai: params.openai,
    results,
    taskSummaries,
    overall: {
      total: results.length,
      predicted: results.filter(r => r.predicted !== null).length,
      macroScore,
    },
  };

  mkdirSync(params.outDir, { recursive: true });
  const outPath = resolve(params.outDir, 'legalbench-latest.json');
  writeFileSync(outPath, JSON.stringify(run, null, 2), 'utf-8');

  return run;
}
