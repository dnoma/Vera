import { mkdirSync, readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';
import { hash } from '../integrity/hash.js';
import { sortByKey } from '../integrity/ordering.js';
import { createDecisionFromStrength } from '../core/Decision.js';
import { createSource, createSourceMetadata } from '../core/Source.js';
import { getFinalStrength, classifyArgument } from '../core/ArgumentationFramework.js';
import { evaluateWithDFQuAD } from '../semantics/DFQuAD.js';
import { validateFramework } from '../validators/validateFramework.js';
import { validateAuditTrace } from '../validators/validateAuditTrace.js';
import { createAuditTrace } from '../core/AuditTrace.js';
import type {
  ArgumentationFramework,
  EvaluatedFramework,
} from '../core/types.js';
import { loadCuadExamples, listCuadCategories } from './cuad/loadCuad.js';
import { loadLegalBenchExamples } from './legalbench/loadLegalBench.js';
import type { LegalBenchReasoningType, LegalBenchTaskType } from './legalbench/types.js';
import { runLegalBenchEval, type LegalBenchEvalRun } from './legalbench/runner.js';
import { legalBenchMarkdownReport } from './legalbench/report.js';
import { writeLegalBenchPredictions } from './legalbench/predictions.js';
import { writeLegalBenchErrorPack } from './legalbench/errorPack.js';
import { computeCacheKey, readCache, writeCache } from './cache.js';
import { openAIChatJson } from './openai/client.js';
import { bestSpanTokenF1, clamp01, spanIsValid, safeJsonParse } from './metrics.js';
import { baselinePrompt, qbafPrompt } from './prompts.js';
import { markdownReport, summarize } from './report.js';
import { authorityAppropriatenessRate, scoreMinimalSufficiency } from './evidence/scoring.js';
import { aggregateHumanReviews, loadHumanReviews } from './human-review/aggregate.js';
import { selectStratifiedExamples } from './sampling/stratified.js';
import { counterargumentPresent, runEditSuite, traceCompletenessRate } from './contestation/editSuite.js';
import { minInterventionsToFlipDecision } from './contestation/auditability.js';
import type {
  BaselineModelOutput,
  CuadExample,
  EvalMethod,
  EvalRun,
  ExampleResult,
  ContestabilityCheck,
  OpenAIChatParams,
  QbafModelOutput,
} from './types.js';

type Args = {
  dataset: string;
  legalBenchRootDir: string;
  legalBenchSplit: string;
  legalBenchTasks: readonly string[] | undefined;
  legalBenchReasoningTypes: readonly LegalBenchReasoningType[] | undefined;
  legalBenchTaskTypes: readonly LegalBenchTaskType[] | undefined;
  legalBenchPerTask: number | undefined;
  legalBenchProgressEvery: number | undefined;
  legalBenchCheckpointEvery: number | undefined;
  legalBenchResume: boolean;
  legalBenchPromptMode: 'few-shot' | 'one-shot-rag';
  legalBenchNormalizeOutputs: boolean;
  legalBenchConcurrency: number;
  legalBenchWritePredictions: boolean;
  legalBenchErrorPack: boolean;
  legalBenchErrorPackOnly: boolean;
  legalBenchErrorPackTopN: number;
  legalBenchErrorPackSeed: string;
  legalBenchErrorPackIncludePrompt: boolean;
  legalBenchErrorPackFrom: string | undefined;
  outDir: string;
  methods: readonly EvalMethod[];
  model: string;
  temperature: number;
  limit: number | undefined;
  categories: readonly string[] | undefined;
  humanReviewsDir: string | undefined;
  stratified: boolean;
  contractLimit: number;
  perCategoryPerLabel: number;
  seed: string;
  updateReadme: boolean;
  dryRun: boolean;
};

const PROMPT_VERSION_BASELINE = 2;
const PROMPT_VERSION_QBAF = 4;

function parseArgs(argv: readonly string[]): Args {
  const args: Record<string, string | boolean> = {};
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (!a) continue;
    if (a.startsWith('--')) {
      const key = a.slice(2);
      const next = argv[i + 1];
      if (!next || next.startsWith('--')) {
        args[key] = true;
      } else {
        args[key] = next;
        i++;
      }
    }
  }

  const parseBool = (value: string | boolean | undefined, defaultValue: boolean): boolean => {
    if (value === undefined) return defaultValue;
    if (typeof value === 'boolean') return value;
    const normalized = value.toLowerCase().trim();
    if (normalized === 'true' || normalized === '1' || normalized === 'yes') return true;
    if (normalized === 'false' || normalized === '0' || normalized === 'no') return false;
    return defaultValue;
  };

  const methodsRaw = String(args['methods'] ?? 'both');
  const methods: EvalMethod[] =
    methodsRaw === 'both' ? ['baseline', 'qbaf'] : (methodsRaw.split(',') as EvalMethod[]);

  const categoriesRaw = args['categories'] ? String(args['categories']) : undefined;
  const categories = categoriesRaw ? categoriesRaw.split(',').map(s => s.trim()).filter(Boolean) : undefined;

  const lbTasksRaw = args['tasks'] ? String(args['tasks']) : undefined;
  const legalBenchTasks = lbTasksRaw
    ? lbTasksRaw.split(',').map(s => s.trim()).filter(Boolean)
    : undefined;

  const lbReasoningRaw = args['reasoningTypes'] ? String(args['reasoningTypes']) : undefined;
  const legalBenchReasoningTypes = lbReasoningRaw
    ? (lbReasoningRaw.split(',').map(s => s.trim()).filter(Boolean) as LegalBenchReasoningType[])
    : undefined;

  const lbTaskTypesRaw = args['taskTypes'] ? String(args['taskTypes']) : undefined;
  const legalBenchTaskTypes = lbTaskTypesRaw
    ? (lbTaskTypesRaw.split(',').map(s => s.trim()).filter(Boolean) as LegalBenchTaskType[])
    : undefined;

  const legalBenchPerTask = args['perTask'] ? Number(args['perTask']) : undefined;
  const legalBenchProgressEvery = args['progressEvery']
    ? Number(args['progressEvery'])
    : undefined;
  const legalBenchCheckpointEvery = args['checkpointEvery']
    ? Number(args['checkpointEvery'])
    : undefined;
  const legalBenchResume = Boolean(args['resume'] ?? false);
  const legalBenchPromptMode =
    String(args['promptMode'] ?? 'few-shot') === 'one-shot-rag'
      ? 'one-shot-rag'
      : 'few-shot';
  const legalBenchSplit = String(args['split'] ?? 'test');
  const legalBenchRootDir = String(args['legalBenchRootDir'] ?? 'data/legalbench');
  const legalBenchNormalizeOutputs = parseBool(args['normalizeOutputs'], false);
  const concurrencyRaw = args['concurrency'];
  const concurrencyValue =
    typeof concurrencyRaw === 'boolean' ? 1 : Number(concurrencyRaw ?? 1);
  const legalBenchConcurrency = Number.isFinite(concurrencyValue)
    ? Math.max(1, Math.floor(concurrencyValue))
    : 1;
  const legalBenchWritePredictions = parseBool(args['predictionsJsonl'], false);
  const legalBenchErrorPack = parseBool(args['errorPack'], false);
  const legalBenchErrorPackOnly = parseBool(args['errorPackOnly'], false);
  const errorPackTopN = Number(args['errorPackTopN'] ?? 10);
  const legalBenchErrorPackTopN = Number.isFinite(errorPackTopN)
    ? Math.max(1, Math.floor(errorPackTopN))
    : 10;
  const legalBenchErrorPackSeed = String(args['errorPackSeed'] ?? 'legalbench-error-pack');
  const legalBenchErrorPackIncludePrompt = parseBool(args['errorPackIncludePrompt'], false);
  const legalBenchErrorPackFrom = args['errorPackFrom']
    ? String(args['errorPackFrom'])
    : undefined;

  const stratified = Boolean(args['stratified'] ?? false);
  const contractLimit = Number(args['contractLimit'] ?? 20);
  const perCategoryPerLabel = Number(args['perCategoryPerLabel'] ?? 1);
  const seed = String(args['seed'] ?? 'vera-eval');

  return {
    dataset: String(args['dataset'] ?? 'CUAD_v1'),
    legalBenchRootDir,
    legalBenchSplit,
    legalBenchTasks,
    legalBenchReasoningTypes,
    legalBenchTaskTypes,
    legalBenchPerTask,
    legalBenchProgressEvery,
    legalBenchCheckpointEvery,
    legalBenchResume,
    legalBenchPromptMode,
    legalBenchNormalizeOutputs,
    legalBenchConcurrency,
    legalBenchWritePredictions,
    legalBenchErrorPack,
    legalBenchErrorPackOnly,
    legalBenchErrorPackTopN,
    legalBenchErrorPackSeed,
    legalBenchErrorPackIncludePrompt,
    legalBenchErrorPackFrom,
    outDir: String(args['outDir'] ?? 'eval-output'),
    methods,
    model: String(args['model'] ?? process.env['OPENAI_MODEL'] ?? 'gpt-4.1-mini'),
    temperature: Number(args['temperature'] ?? 0),
    limit: args['limit'] ? Number(args['limit']) : undefined,
    categories,
    humanReviewsDir: args['humanReviewsDir'] ? String(args['humanReviewsDir']) : undefined,
    stratified,
    contractLimit,
    perCategoryPerLabel,
    seed,
    updateReadme: Boolean(args['updateReadme'] ?? false),
    dryRun: Boolean(args['dryRun'] ?? false),
  };
}

function nowIso(): string {
  return new Date().toISOString();
}

function toBooleanAnswer(answer: 'yes' | 'no'): boolean {
  return answer === 'yes';
}

function makeSourceId(contractTitle: string): string {
  return `src-${hash(contractTitle).slice(0, 10)}`;
}

function makeEvalTraceId(params: {
  readonly runId: string;
  readonly method: EvalMethod;
  readonly qaId: string;
}): string {
  return `trace-${hash(params).slice(0, 24)}`;
}

function buildCuadSource(contractTitle: string, contractText: string) {
  const sourceId = makeSourceId(contractTitle);
  return createSource(
    `CUAD Contract: ${contractTitle}`,
    'Contract text from CUAD v1 (synthetic evaluation harness).',
    hash(contractText),
    createSourceMetadata('document', { tags: ['cuad', 'contract'] }),
    { id: sourceId }
  );
}

function spanValidityStats(
  contractText: string,
  spans: readonly { start: number; end: number }[]
): { checked: number; valid: number } {
  let checked = 0;
  let valid = 0;
  for (const span of spans) {
    checked++;
    if (spanIsValid(contractText, span)) valid++;
  }
  return { checked, valid };
}

function pickProConArguments(
  evaluated: EvaluatedFramework
): { pro: string | undefined; con: string | undefined } {
  const nonRoot = evaluated.arguments.filter(a => a.id !== evaluated.rootClaimId);
  const sorted = [...nonRoot].sort((a, b) => b.computedStrength - a.computedStrength);

  let pro: string | undefined;
  let con: string | undefined;
  for (const arg of sorted) {
    const role = classifyArgument(evaluated, arg.id);
    if (!pro && role === 'pro') pro = arg.id;
    if (!con && role === 'con') con = arg.id;
    if (pro && con) break;
  }
  return { pro, con };
}

function applyBaseScoreChange(
  framework: ArgumentationFramework,
  argumentId: string,
  newBaseScore: number
): ArgumentationFramework {
  const newArguments = framework.arguments.map(a =>
    a.id === argumentId ? { ...a, baseScore: newBaseScore } : a
  );
  return { ...framework, arguments: sortByKey(newArguments, 'id') };
}

function checkProperty1(
  original: EvaluatedFramework,
  base: ArgumentationFramework,
  targetId: string,
  isPro: boolean
): { holds: boolean; details: string } {
  const before = getFinalStrength(original);
  const target = base.arguments.find(a => a.id === targetId);
  if (!target) {
    return { holds: false, details: `missing argument ${targetId}` };
  }
  const bumped = clamp01(target.baseScore + 0.1);
  const modified = applyBaseScoreChange(base, targetId, bumped);
  const afterEvaluated = evaluateWithDFQuAD(modified);
  const after = getFinalStrength(afterEvaluated);
  const holds = isPro ? after >= before - 1e-12 : after <= before + 1e-12;
  const details = `before=${before.toFixed(4)} after=${after.toFixed(4)} target=${targetId} base ${target.baseScore.toFixed(2)}->${bumped.toFixed(2)}`;
  return { holds, details };
}

function computeMaxSingleArgumentDelta(
  framework: ArgumentationFramework,
  beforeStrength: number
): number | undefined {
  const candidates = framework.arguments.filter(a => a.id !== framework.rootClaimId);
  if (candidates.length === 0) return undefined;

  let maxDelta = 0;
  for (const arg of candidates) {
    for (const newScore of [0, 1]) {
      if (arg.baseScore === newScore) continue;
      const modified = applyBaseScoreChange(framework, arg.id, newScore);
      const afterStrength = getFinalStrength(evaluateWithDFQuAD(modified));
      maxDelta = Math.max(maxDelta, Math.abs(afterStrength - beforeStrength));
    }
  }
  return maxDelta;
}

function computeAuditabilitySignals(
  baseFramework: ArgumentationFramework,
  evaluated: EvaluatedFramework
): NonNullable<ExampleResult['auditability']> {
  const beforeStrength = getFinalStrength(evaluated);

  const maxSingleArgumentDelta = computeMaxSingleArgumentDelta(baseFramework, beforeStrength);
  const interventions = minInterventionsToFlipDecision(baseFramework, evaluated);

  return {
    ...(maxSingleArgumentDelta !== undefined ? { maxSingleArgumentDelta } : {}),
    minBaseScoreInterventionsToFlip: interventions.minBaseScoreInterventionsToFlip,
    minBoundedInterventionsToFlip: interventions.minBoundedInterventionsToFlip,
    ...(!interventions.boundedFlippable ? { note: interventions.note } : {}),
  };
}

async function runBaseline(
  example: CuadExample,
  openai: OpenAIChatParams,
  apiKey: string,
  cacheDir: string
): Promise<ExampleResult> {
  try {
    const { system, user } = baselinePrompt(example);
    const request = {
      method: 'baseline',
      promptVersion: PROMPT_VERSION_BASELINE,
      model: openai.model,
      temperature: openai.temperature,
      qaId: example.qaId,
      question: example.question,
      contractTitle: example.contractTitle,
    };
    const key = computeCacheKey(request);
    const cached = readCache<{ content: string }>(cacheDir, key);

    const response =
      cached ??
      (await openAIChatJson(
        {
          model: openai.model,
          temperature: openai.temperature,
          messages: [
            { role: 'system', content: system },
            { role: 'user', content: user },
          ],
        },
        apiKey
      ));
    if (!cached) writeCache(cacheDir, key, response);

    const parsed = safeJsonParse<BaselineModelOutput>(response.content);
    if (!parsed.ok) {
      return {
        qaId: example.qaId,
        contractTitle: example.contractTitle,
        category: example.category,
        label: example.label,
        method: 'baseline',
        predicted: null,
        error: `JSON parse failed: ${parsed.error}`,
        evidenceSpansChecked: 0,
        evidenceSpansValid: 0,
        evidenceTokenOverlapF1: null,
        evidenceUnitCount: 0,
        evidenceGoldUnitCount: 0,
        minimalSufficiencyScore: null,
        authorityAppropriatenessRate: null,
      };
    }

    const output = parsed.value;
    const answer =
      output.answer === 'yes' || output.answer === 'no' ? output.answer : 'no';
    const evidenceSpans = Array.isArray(output.evidenceSpans)
      ? output.evidenceSpans
          .map(s => ({ start: Number(s.start), end: Number(s.end) }))
          .filter(s => Number.isFinite(s.start) && Number.isFinite(s.end))
      : [];
    const { checked, valid } = spanValidityStats(example.contractText, evidenceSpans);
    const f1 = bestSpanTokenF1(
      example.contractText,
      evidenceSpans,
      example.goldSpans
    );
    const mss = scoreMinimalSufficiency({
      contractText: example.contractText,
      label: example.label,
      predictedSpans: evidenceSpans,
      goldSpans: example.goldSpans,
    });
    const authority = authorityAppropriatenessRate({
      contractText: example.contractText,
      predictedSpans: evidenceSpans,
    });

    return {
      qaId: example.qaId,
      contractTitle: example.contractTitle,
      category: example.category,
      label: example.label,
      method: 'baseline',
      predicted: toBooleanAnswer(answer),
      evidenceSpansChecked: checked,
      evidenceSpansValid: valid,
      evidenceTokenOverlapF1: f1,
      evidenceUnitCount: mss.predictedUnitCount,
      evidenceGoldUnitCount: mss.goldUnitCount,
      minimalSufficiencyScore: mss.minimalSufficiencyScore,
      authorityAppropriatenessRate: authority.rate,
    };
  } catch (e) {
    return {
      qaId: example.qaId,
      contractTitle: example.contractTitle,
      category: example.category,
      label: example.label,
      method: 'baseline',
      predicted: null,
      error: e instanceof Error ? e.message : String(e),
      evidenceSpansChecked: 0,
      evidenceSpansValid: 0,
      evidenceTokenOverlapF1: null,
      evidenceUnitCount: 0,
      evidenceGoldUnitCount: 0,
      minimalSufficiencyScore: null,
      authorityAppropriatenessRate: null,
    };
  }
}

async function runQbaf(
  example: CuadExample,
  openai: OpenAIChatParams,
  apiKey: string,
  cacheDir: string,
  runContext: { readonly runId: string; readonly startedAt: string }
): Promise<ExampleResult> {
  try {
    const source = buildCuadSource(example.contractTitle, example.contractText);
    const sourceId = source.id;

    const { system, user } = qbafPrompt(example, sourceId);
    const request = {
      method: 'qbaf',
      promptVersion: PROMPT_VERSION_QBAF,
      model: openai.model,
      temperature: openai.temperature,
      qaId: example.qaId,
      category: example.category,
      contractTitle: example.contractTitle,
    };
    const key = computeCacheKey(request);
    const cached = readCache<{ content: string }>(cacheDir, key);

    const response =
      cached ??
      (await openAIChatJson(
        {
          model: openai.model,
          temperature: openai.temperature,
          messages: [
            { role: 'system', content: system },
            { role: 'user', content: user },
          ],
        },
        apiKey
      ));
    if (!cached) writeCache(cacheDir, key, response);

    const parsed = safeJsonParse<QbafModelOutput>(response.content);
    if (!parsed.ok) {
      return {
        qaId: example.qaId,
        contractTitle: example.contractTitle,
        category: example.category,
        label: example.label,
        method: 'qbaf',
        predicted: null,
        error: `JSON parse failed: ${parsed.error}`,
        evidenceSpansChecked: 0,
        evidenceSpansValid: 0,
        evidenceTokenOverlapF1: null,
        evidenceUnitCount: 0,
        evidenceGoldUnitCount: 0,
        minimalSufficiencyScore: null,
        authorityAppropriatenessRate: null,
      };
    }

    const output = parsed.value;
    const framework = output.framework;
    const evidence = output.evidence ?? [];

    const evidenceSpans = evidence
      .flatMap(e => (e.evidenceSpans ?? []).map(s => ({ start: Number(s.start), end: Number(s.end) })))
      .filter(s => Number.isFinite(s.start) && Number.isFinite(s.end));
    const { checked, valid } = spanValidityStats(example.contractText, evidenceSpans);
    const f1 = bestSpanTokenF1(
      example.contractText,
      evidenceSpans,
      example.goldSpans
    );
    const mss = scoreMinimalSufficiency({
      contractText: example.contractText,
      label: example.label,
      predictedSpans: evidenceSpans,
      goldSpans: example.goldSpans,
    });
    const authority = authorityAppropriatenessRate({
      contractText: example.contractText,
      predictedSpans: evidenceSpans,
    });

    const evaluated = evaluateWithDFQuAD(framework);
    const finalStrength = getFinalStrength(evaluated);
    const decision = createDecisionFromStrength(
      finalStrength,
      `Contract contains ${example.category}`
    );

    const trace = createAuditTrace({
      traceId: makeEvalTraceId({ runId: runContext.runId, method: 'qbaf', qaId: example.qaId }),
      version: '0.1.0',
      createdAt: runContext.startedAt,
      claim: {
        id: `claim-${hash(example.qaId).slice(0, 8)}`,
        statement: `This contract contains a clause related to "${example.category}".`,
        context: `CUAD v1 evaluation: ${example.contractTitle}`,
        createdAt: runContext.startedAt,
      },
      framework: evaluated,
      sources: [source],
      decision,
      uncertainty: {
        unknowns: [],
        riskFlags: [],
        confidenceStatement: 'Evaluation harness output.',
      },
      limitations: {
        scopeLimitations: [],
        temporalLimitations: [],
        sourceLimitations: [],
        methodLimitations: [],
      },
    });

    const schemaResult = validateAuditTrace(trace);
    const frameworkResult = validateFramework(evaluated);

    const { pro, con } = pickProConArguments(evaluated);
    const checks: ContestabilityCheck[] = [];

    const baseFramework: ArgumentationFramework = framework;
    if (pro) {
      const res = checkProperty1(evaluated, baseFramework, pro, true);
      checks.push({
        property: 'P1_pro_increase',
        holds: res.holds,
        details: res.details,
      });
    }
    if (con) {
      const res = checkProperty1(evaluated, baseFramework, con, false);
      checks.push({
        property: 'P1_con_increase',
        holds: res.holds,
        details: res.details,
      });
    }

    const trace2 = createAuditTrace({
      traceId: makeEvalTraceId({ runId: runContext.runId, method: 'qbaf', qaId: example.qaId }),
      version: '0.1.0',
      createdAt: runContext.startedAt,
      claim: {
        id: `claim-${hash(example.qaId).slice(0, 8)}`,
        statement: `This contract contains a clause related to "${example.category}".`,
        context: `CUAD v1 evaluation: ${example.contractTitle}`,
        createdAt: runContext.startedAt,
      },
      framework: evaluated,
      sources: [source],
      decision,
      uncertainty: {
        unknowns: [],
        riskFlags: [],
        confidenceStatement: 'Evaluation harness output.',
      },
      limitations: {
        scopeLimitations: [],
        temporalLimitations: [],
        sourceLimitations: [],
        methodLimitations: [],
      },
    });

    const editSuite = runEditSuite(baseFramework, evaluated);

    return {
      qaId: example.qaId,
      contractTitle: example.contractTitle,
      category: example.category,
      label: example.label,
      method: 'qbaf',
      predicted: decision.label === 'supported',
      evidenceSpansChecked: checked,
      evidenceSpansValid: valid,
      evidenceTokenOverlapF1: f1,
      evidenceUnitCount: mss.predictedUnitCount,
      evidenceGoldUnitCount: mss.goldUnitCount,
      minimalSufficiencyScore: mss.minimalSufficiencyScore,
      authorityAppropriatenessRate: authority.rate,
      schemaValidation: schemaResult,
      frameworkValidation: frameworkResult,
      evaluatedFramework: evaluated,
      traceHash: trace.integrity.traceHash,
      traceReproducible: trace.integrity.traceHash === trace2.integrity.traceHash,
      traceCompletenessRate: traceCompletenessRate(evaluated),
      counterargumentPresent: counterargumentPresent(evaluated),
      editSuitePassRate: editSuite.passRate,
      editSuiteDetails: editSuite.details,
      contestability: checks,
      auditability: computeAuditabilitySignals(baseFramework, evaluated),
    };
  } catch (e) {
    return {
      qaId: example.qaId,
      contractTitle: example.contractTitle,
      category: example.category,
      label: example.label,
      method: 'qbaf',
      predicted: null,
      error: e instanceof Error ? e.message : String(e),
      evidenceSpansChecked: 0,
      evidenceSpansValid: 0,
      evidenceTokenOverlapF1: null,
      evidenceUnitCount: 0,
      evidenceGoldUnitCount: 0,
      minimalSufficiencyScore: null,
      authorityAppropriatenessRate: null,
    };
  }
}

function updateReadme(readmePath: string, markdown: string): void {
  const start = '<!-- EVAL_RESULTS_START -->';
  const end = '<!-- EVAL_RESULTS_END -->';
  const file = readFileSync(readmePath, 'utf-8');
  const startIdx = file.indexOf(start);
  const endIdx = file.indexOf(end);
  if (startIdx === -1 || endIdx === -1 || endIdx <= startIdx) {
    return;
  }
  const before = file.slice(0, startIdx + start.length);
  const after = file.slice(endIdx);
  const updated = `${before}\n\n${markdown}\n\n${after}`;
  writeFileSync(readmePath, updated, 'utf-8');
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv);
  const apiKey = process.env['OPENAI_API_KEY'];

  if (args.dataset.toLowerCase() === 'legalbench') {
    const errorPackFrom =
      args.legalBenchErrorPackFrom ?? resolve(args.outDir, 'legalbench-latest.json');

    if (args.legalBenchErrorPackOnly) {
      const run = JSON.parse(readFileSync(errorPackFrom, 'utf-8')) as LegalBenchEvalRun;
      const runRootDir = String(run.datasetPath ?? args.legalBenchRootDir);
      const runSplit = String(run.split ?? args.legalBenchSplit);
      const examples = loadLegalBenchExamples({
        rootDir: runRootDir,
        split: runSplit,
      });
      mkdirSync(args.outDir, { recursive: true });
      const outPath = resolve(args.outDir, 'legalbench-error-pack.md');
      writeLegalBenchErrorPack(outPath, run, examples, {
        topN: args.legalBenchErrorPackTopN,
        seed: args.legalBenchErrorPackSeed,
        includePrompt: args.legalBenchErrorPackIncludePrompt,
        sourcePath: errorPackFrom,
      });
      // eslint-disable-next-line no-console
      console.log(`Wrote ${outPath}`);
      return;
    }

    const examples = loadLegalBenchExamples({
      rootDir: args.legalBenchRootDir,
      split: args.legalBenchSplit,
      ...(args.legalBenchTasks ? { tasks: args.legalBenchTasks } : {}),
      ...(args.legalBenchReasoningTypes
        ? { reasoningTypes: args.legalBenchReasoningTypes }
        : {}),
      ...(args.legalBenchTaskTypes ? { taskTypes: args.legalBenchTaskTypes } : {}),
      ...(args.legalBenchPerTask !== undefined
        ? { perTask: args.legalBenchPerTask }
        : {}),
    });

    if (args.dryRun) {
      // eslint-disable-next-line no-console
      console.log(
        JSON.stringify(
          {
            dataset: 'legalbench',
            rootDir: args.legalBenchRootDir,
            split: args.legalBenchSplit,
            tasks: [...new Set(examples.map(e => e.task))].sort((a, b) =>
              a.localeCompare(b)
            ),
            examples: examples.length,
          },
          null,
          2
        )
      );
      return;
    }

    if (!apiKey) throw new Error('OPENAI_API_KEY is required for eval runs');

    const run = await runLegalBenchEval({
      datasetPath: args.legalBenchRootDir,
      split: args.legalBenchSplit,
      outDir: args.outDir,
      examples,
      openai: { model: args.model, temperature: args.temperature },
      apiKey,
      ...(args.legalBenchProgressEvery !== undefined
        ? { progressEvery: args.legalBenchProgressEvery }
        : {}),
      ...(args.legalBenchCheckpointEvery !== undefined
        ? { checkpointEvery: args.legalBenchCheckpointEvery }
        : {}),
      ...(args.legalBenchResume
        ? { resumeFrom: resolve(args.outDir, 'legalbench-partial.json') }
        : {}),
      promptMode: args.legalBenchPromptMode,
      normalizeOutputs: args.legalBenchNormalizeOutputs,
      concurrency: args.legalBenchConcurrency,
    });

    mkdirSync(args.outDir, { recursive: true });
    const md = legalBenchMarkdownReport(run);
    writeFileSync(
      resolve(args.outDir, 'LegalBench-README-snippet.md'),
      md,
      'utf-8'
    );
    if (args.legalBenchWritePredictions) {
      writeLegalBenchPredictions(resolve(args.outDir, 'predictions.jsonl'), run);
    }
    if (args.legalBenchErrorPack) {
      writeLegalBenchErrorPack(resolve(args.outDir, 'legalbench-error-pack.md'), run, examples, {
        topN: args.legalBenchErrorPackTopN,
        seed: args.legalBenchErrorPackSeed,
        includePrompt: args.legalBenchErrorPackIncludePrompt,
        sourcePath: resolve(args.outDir, 'legalbench-latest.json'),
      });
    }
    // eslint-disable-next-line no-console
    console.log(`Wrote ${resolve(args.outDir, 'legalbench-latest.json')}`);
    return;
  }

  const examplesAll = loadCuadExamples(args.dataset);
  const categoriesAll = listCuadCategories(examplesAll);
  const selectedCategories = args.categories ?? categoriesAll;

  const examplesFiltered = examplesAll.filter(e => selectedCategories.includes(e.category));

  let examples: readonly CuadExample[];
  if (args.stratified) {
    const { selected } = selectStratifiedExamples(examplesFiltered, {
      seed: args.seed,
      contractLimit: args.contractLimit,
      perCategoryPerLabel: args.perCategoryPerLabel,
      categories: selectedCategories,
    });
    examples = args.limit !== undefined ? selected.slice(0, args.limit) : selected;
  } else {
    const sliced = args.limit !== undefined ? examplesFiltered.slice(0, args.limit) : examplesFiltered;
    examples = sliced;
  }

  const openai: OpenAIChatParams = { model: args.model, temperature: args.temperature };

  const runId = `eval-${hash({ startedAt: nowIso(), model: openai.model, methods: args.methods }).slice(0, 10)}`;
  const startedAt = nowIso();
  const cacheDir = resolve(args.outDir, 'cache');
  const results: ExampleResult[] = [];

  if (args.dryRun) {
    // eslint-disable-next-line no-console
    console.log(
      JSON.stringify(
        {
          dataset: args.dataset,
          contracts: new Set(examplesAll.map(e => e.contractTitle)).size,
          categories: categoriesAll.length,
          selectedCategories: selectedCategories.length,
          examples: examples.length,
          stratified: args.stratified
            ? { contractLimit: args.contractLimit, perCategoryPerLabel: args.perCategoryPerLabel, seed: args.seed }
            : false,
        },
        null,
        2
      )
    );
    return;
  }

  if (!apiKey) throw new Error('OPENAI_API_KEY is required for eval runs');

  for (const example of examples) {
    for (const method of args.methods) {
      if (method === 'baseline') {
        results.push(await runBaseline(example, openai, apiKey, cacheDir));
      } else {
        results.push(await runQbaf(example, openai, apiKey, cacheDir, { runId, startedAt }));
      }
    }
  }

  const finishedAt = nowIso();
  const runBase: Omit<EvalRun, 'summaries'> = {
    runId,
    startedAt,
    finishedAt,
    datasetPath: args.dataset,
    contractCount: new Set(examples.map(e => e.contractTitle)).size,
    categoryCount: new Set(examples.map(e => e.category)).size,
    methods: args.methods,
    openai,
    results,
  };
  const summaries = summarize({ ...runBase, summaries: [] });

  const humanReviewSummary = args.humanReviewsDir
    ? aggregateHumanReviews(loadHumanReviews(resolve(args.humanReviewsDir)))
    : undefined;

  const run: EvalRun = { ...runBase, summaries, ...(humanReviewSummary ? { humanReviewSummary } : {}) };

  mkdirSync(args.outDir, { recursive: true });
  const outJson = resolve(args.outDir, `${runId}.json`);
  writeFileSync(outJson, JSON.stringify(run, null, 2), 'utf-8');
  writeFileSync(resolve(args.outDir, 'latest.json'), JSON.stringify(run, null, 2), 'utf-8');

  const md = markdownReport(run);
  writeFileSync(resolve(args.outDir, 'README-snippet.md'), md, 'utf-8');

  if (args.updateReadme) {
    // no-op by default unless markers are present
    updateReadme(resolve(process.cwd(), 'README.md'), md);
  }

  // eslint-disable-next-line no-console
  console.log(`Wrote ${outJson}`);
}

main().catch(err => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
