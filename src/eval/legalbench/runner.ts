import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';
import { hash } from '../../integrity/hash.js';
import type { OpenAIChatParams } from '../types.js';
import { openAIChatText } from '../openai/client.js';
import type { LegalBenchExample } from './types.js';
import { evaluateLegalBenchTask, type LegalBenchMetric } from './evaluation.js';
import { normalizeLegalBenchOutput } from './normalize.js';
import {
  buildQuestionText,
  formatOneShotDemo,
  loadOneShotRagIndex,
  selectBestOneShotDemo,
} from './oneShotRag.js';

export type LegalBenchExampleResult = {
  readonly id: string;
  readonly index: number;
  readonly task: string;
  readonly goldAnswer: string;
  readonly predicted: string | null;
  readonly predictedRaw?: string;
  readonly error?: string;
  readonly retrieval?: { readonly trainId: string; readonly score: number };
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
  readonly promptMode: 'few-shot' | 'one-shot-rag';
  readonly normalizeOutputs: boolean;
  readonly concurrency: number;
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
  readonly resumeFrom?: string;
  readonly promptMode?: 'few-shot' | 'one-shot-rag';
  readonly normalizeOutputs?: boolean;
  readonly concurrency?: number;
};

function nowIso(): string {
  return new Date().toISOString();
}

type PartialRun = {
  readonly runId: string;
  readonly startedAt: string;
  readonly datasetPath: string;
  readonly split: string;
  readonly openai: OpenAIChatParams;
  readonly normalizeOutputs?: boolean;
  readonly results: readonly LegalBenchExampleResult[];
};

function tryLoadResume(params: RunLegalBenchParams): PartialRun | null {
  const path = params.resumeFrom;
  if (!path) return null;
  if (!existsSync(path)) return null;

  try {
    const parsed = JSON.parse(readFileSync(path, 'utf-8')) as PartialRun;
    if (!parsed || typeof parsed !== 'object') return null;
    if (parsed.datasetPath !== params.datasetPath) return null;
    if (parsed.split !== params.split) return null;
    if (parsed.openai?.model !== params.openai.model) return null;
    if (parsed.openai?.temperature !== params.openai.temperature) return null;
    if (
      parsed.normalizeOutputs !== undefined &&
      parsed.normalizeOutputs !== (params.normalizeOutputs ?? false)
    ) {
      return null;
    }
    if (!Array.isArray(parsed.results)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export async function runLegalBenchEval(
  params: RunLegalBenchParams
): Promise<LegalBenchEvalRun> {
  const resume = tryLoadResume(params);
  const startedAt = resume?.startedAt ?? nowIso();
  const runId =
    resume?.runId ??
    `legalbench-${hash({ startedAt, model: params.openai.model }).slice(0, 10)}`;

  const progressEvery = params.progressEvery ?? 50;
  const checkpointEvery = params.checkpointEvery ?? 250;
  const promptMode = params.promptMode ?? 'few-shot';
  const normalizeOutputs = params.normalizeOutputs ?? false;
  const concurrency = Math.max(1, Math.floor(params.concurrency ?? 1));
  const ragIndexByTask = new Map<string, ReturnType<typeof loadOneShotRagIndex>>();

  const exampleById = new Map(params.examples.map(e => [e.id, e]));
  const resultsById = new Map<string, LegalBenchExampleResult>();
  const coerceIndex = (id: string, fallback: number): number => {
    const fromId = Number(id.split('-').slice(-1)[0]);
    if (Number.isFinite(fromId)) return fromId;
    return fallback;
  };
  if (resume?.results) {
    for (const r of resume.results) {
      const ex = exampleById.get(r.id);
      const index = typeof r.index === 'number' ? r.index : coerceIndex(r.id, ex?.index ?? 0);
      resultsById.set(r.id, { ...r, index });
    }
  }
  const completedIds = new Set(resultsById.keys());
  const total = params.examples.length;
  let predictedCount = [...resultsById.values()].filter(r => r.predicted !== null).length;
  let completedCount = completedIds.size;
  const pending = params.examples.filter(ex => !completedIds.has(ex.id));
  let nextIndex = 0;

  const orderedResults = (): LegalBenchExampleResult[] =>
    params.examples
      .map(ex => resultsById.get(ex.id))
      .filter((r): r is LegalBenchExampleResult => Boolean(r));

  const isRetryableError = (err: unknown): boolean => {
    const msg = err instanceof Error ? err.message : String(err);
    return (
      /OpenAI error (429|500|502|503|504)/.test(msg) ||
      /ECONNRESET|ETIMEDOUT|ENOTFOUND|fetch failed|rate limit/i.test(msg)
    );
  };

  const sleep = (ms: number): Promise<void> =>
    new Promise(resolve => {
      setTimeout(resolve, ms);
    });

  const withRetries = async <T>(fn: () => Promise<T>): Promise<T> => {
    const maxAttempts = 5;
    let attempt = 0;
    while (true) {
      attempt++;
      try {
        return await fn();
      } catch (err) {
        if (!isRetryableError(err) || attempt >= maxAttempts) throw err;
        const base = 500;
        const max = 8000;
        const jitter = Math.random() * 200;
        const delay = Math.min(max, base * 2 ** (attempt - 1)) + jitter;
        await sleep(delay);
      }
    }
  };

  const runExample = async (ex: LegalBenchExample): Promise<LegalBenchExampleResult> => {
    let retrieval: { trainId: string; score: number } | undefined;
    let prompt = ex.prompt;
    if (promptMode === 'one-shot-rag') {
      if (!ragIndexByTask.has(ex.task)) {
        ragIndexByTask.set(ex.task, loadOneShotRagIndex(params.datasetPath, ex.task));
      }
      const idx = ragIndexByTask.get(ex.task) ?? null;
      if (idx) {
        const queryText = buildQuestionText({ text: ex.text, question: ex.question });
        const demo = selectBestOneShotDemo(idx, queryText);
        if (demo) {
          retrieval = { trainId: demo.trainId, score: demo.score };
          prompt = `${formatOneShotDemo(demo)}\n\n${ex.prompt}`;
        }
      }
    }

    try {
      const resp = await withRetries(() =>
        openAIChatText(
          {
            model: params.openai.model,
            temperature: params.openai.temperature,
            messages: [
              {
                role: 'system',
                content:
                  'Answer the final question. Reply with only the answer text (no JSON, no markdown).',
              },
              { role: 'user', content: prompt },
            ],
          },
          params.apiKey
        )
      );
      const raw = resp.content.trim();
      const normalized = normalizeOutputs ? normalizeLegalBenchOutput(ex.task, raw) : raw;
      return {
        id: ex.id,
        index: ex.index,
        task: ex.task,
        goldAnswer: ex.goldAnswer,
        predicted: normalized,
        ...(normalizeOutputs ? { predictedRaw: raw } : {}),
        ...(retrieval ? { retrieval } : {}),
      };
    } catch (err) {
      return {
        id: ex.id,
        index: ex.index,
        task: ex.task,
        goldAnswer: ex.goldAnswer,
        predicted: null,
        error: err instanceof Error ? err.message : String(err),
        ...(retrieval ? { retrieval } : {}),
      };
    }
  };

  const onComplete = (result: LegalBenchExampleResult): void => {
    resultsById.set(result.id, result);
    completedIds.add(result.id);
    completedCount += 1;
    if (result.predicted !== null) predictedCount += 1;

    if (
      progressEvery > 0 &&
      (completedCount === 1 || completedCount % progressEvery === 0 || completedCount === total)
    ) {
      // eslint-disable-next-line no-console
      console.log(
        JSON.stringify(
          {
            event: 'legalbench.progress',
            runId,
            done: completedCount,
            total,
            pct: Number(((completedCount / total) * 100).toFixed(2)),
            predicted: predictedCount,
          },
          null,
          0
        )
      );
    }

    if (checkpointEvery > 0 && completedCount % checkpointEvery === 0) {
      mkdirSync(params.outDir, { recursive: true });
      const partial = {
        runId,
        startedAt,
        datasetPath: params.datasetPath,
        split: params.split,
        openai: params.openai,
        normalizeOutputs,
        results: orderedResults(),
      };
      writeFileSync(
        resolve(params.outDir, 'legalbench-partial.json'),
        JSON.stringify(partial, null, 2),
        'utf-8'
      );
    }
  };

  const worker = async (): Promise<void> => {
    while (true) {
      const ex = pending[nextIndex];
      if (!ex) return;
      nextIndex += 1;
      const result = await runExample(ex);
      onComplete(result);
    }
  };

  const workers = Array.from({ length: Math.min(concurrency, pending.length) }, () => worker());
  await Promise.all(workers);

  const results = orderedResults();

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
    promptMode,
    normalizeOutputs,
    concurrency,
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
