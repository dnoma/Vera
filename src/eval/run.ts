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
import { computeCacheKey, readCache, writeCache } from './cache.js';
import { openAIChatJson } from './openai/client.js';
import { bestSpanTokenF1, clamp01, spanIsValid, safeJsonParse } from './metrics.js';
import { baselinePrompt, qbafPrompt } from './prompts.js';
import { markdownReport, summarize } from './report.js';
import { authorityAppropriatenessRate, scoreMinimalSufficiency } from './evidence/scoring.js';
import { aggregateHumanReviews, loadHumanReviews } from './human-review/aggregate.js';
import { selectStratifiedExamples } from './sampling/stratified.js';
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

  const methodsRaw = String(args['methods'] ?? 'both');
  const methods: EvalMethod[] =
    methodsRaw === 'both' ? ['baseline', 'qbaf'] : (methodsRaw.split(',') as EvalMethod[]);

  const categoriesRaw = args['categories'] ? String(args['categories']) : undefined;
  const categories = categoriesRaw ? categoriesRaw.split(',').map(s => s.trim()).filter(Boolean) : undefined;

  const stratified = Boolean(args['stratified'] ?? false);
  const contractLimit = Number(args['contractLimit'] ?? 20);
  const perCategoryPerLabel = Number(args['perCategoryPerLabel'] ?? 1);
  const seed = String(args['seed'] ?? 'vera-eval');

  return {
    dataset: String(args['dataset'] ?? 'CUAD_v1'),
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

function labelFromStrength(
  strength: number,
  threshold: number = 0.5
): 'supported' | 'contested' {
  return strength > threshold ? 'supported' : 'contested';
}

function minInterventionsToFlipDecision(
  framework: ArgumentationFramework,
  beforeLabel: 'supported' | 'contested'
): number | undefined {
  const candidates = framework.arguments
    .filter(a => a.id !== framework.rootClaimId)
    .map(a => a.id);

  // Brute-force over small graphs: each argument is either unchanged, set to 0, or set to 1.
  // With <= 6 non-root args, this is at most 3^6 = 729 evaluations.
  const choices = [undefined, 0, 1] as const;

  let best: number | undefined;

  function search(index: number, modified: ArgumentationFramework, changedCount: number): void {
    if (best !== undefined && changedCount >= best) return;

    if (index >= candidates.length) {
      const after = getFinalStrength(evaluateWithDFQuAD(modified));
      const afterLabel = labelFromStrength(after);
      if (afterLabel !== beforeLabel) {
        best = changedCount;
      }
      return;
    }

    const id = candidates[index]!;
    const original = framework.arguments.find(a => a.id === id);
    const originalScore = original?.baseScore;

    for (const choice of choices) {
      if (choice === undefined) {
        search(index + 1, modified, changedCount);
        continue;
      }

      const next = applyBaseScoreChange(modified, id, choice);
      const didChange = originalScore !== undefined && originalScore !== choice;
      search(index + 1, next, changedCount + (didChange ? 1 : 0));
    }
  }

  search(0, framework, 0);
  return best;
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
  const beforeLabel = labelFromStrength(beforeStrength);

  const maxSingleArgumentDelta = computeMaxSingleArgumentDelta(baseFramework, beforeStrength);
  const minInterventionsToFlip = minInterventionsToFlipDecision(baseFramework, beforeLabel);

  return {
    ...(maxSingleArgumentDelta !== undefined ? { maxSingleArgumentDelta } : {}),
    ...(minInterventionsToFlip !== undefined ? { minInterventionsToFlip } : {}),
    ...(minInterventionsToFlip === undefined
      ? { note: 'No label flip found via base-score-only perturbations.' }
      : {}),
  };
}

function traceCompletenessRate(evaluated: EvaluatedFramework): number {
  const nonRoot = evaluated.arguments.filter(a => a.id !== evaluated.rootClaimId);
  if (nonRoot.length === 0) return 1;
  const compliant = nonRoot.filter(a => a.sourceRefs.length > 0 || a.assumptions.length > 0);
  return compliant.length / nonRoot.length;
}

function counterargumentPresent(evaluated: EvaluatedFramework): boolean {
  if (evaluated.relations.some(r => r.type === 'attack')) return true;
  for (const arg of evaluated.arguments) {
    if (arg.id === evaluated.rootClaimId) continue;
    if (classifyArgument(evaluated, arg.id) === 'con') return true;
  }
  return false;
}

function runEditSuite(
  baseFramework: ArgumentationFramework,
  evaluated: EvaluatedFramework
): {
  passRate: number | null;
  details: readonly {
    readonly scenarioId: string;
    readonly passed: boolean;
    readonly beforeStrength: number;
    readonly afterStrength: number;
    readonly delta: number;
  }[];
} {
  const beforeStrength = getFinalStrength(evaluated);
  const { pro, con } = pickProConArguments(evaluated);
  const details: {
    readonly scenarioId: string;
    readonly passed: boolean;
    readonly beforeStrength: number;
    readonly afterStrength: number;
    readonly delta: number;
  }[] = [];

  const eps = 1e-12;

  if (pro) {
    const modified = applyBaseScoreChange(baseFramework, pro, 0);
    const afterStrength = getFinalStrength(evaluateWithDFQuAD(modified));
    const passed = afterStrength <= beforeStrength + eps;
    details.push({
      scenarioId: 'downweight_top_pro_to_0',
      passed,
      beforeStrength,
      afterStrength,
      delta: afterStrength - beforeStrength,
    });
  }

  if (con) {
    const modified = applyBaseScoreChange(baseFramework, con, 1);
    const afterStrength = getFinalStrength(evaluateWithDFQuAD(modified));
    const passed = afterStrength <= beforeStrength + eps;
    details.push({
      scenarioId: 'upweight_top_con_to_1',
      passed,
      beforeStrength,
      afterStrength,
      delta: afterStrength - beforeStrength,
    });
  }

  // Add a reviewer-introduced counterargument that attacks the root claim.
  // This should not increase support for the root claim.
  const addedArgId = `arg-edit-${hash({ root: baseFramework.rootClaimId, beforeStrength }).slice(0, 8)}`;
  const addedRelId = `rel-edit-${hash({ addedArgId }).slice(0, 8)}`;
  const addedAssumptionId = `assumption-${hash({ addedArgId }).slice(0, 10)}`;
  const addition: ArgumentationFramework = {
    ...baseFramework,
    arguments: sortByKey(
      [
        ...baseFramework.arguments,
        {
          id: addedArgId,
          content: 'Reviewer-added counterargument: the cited clause may not meet the required element or is subject to an exception.',
          baseScore: 0.7,
          sourceRefs: [],
          assumptions: [
            {
              id: addedAssumptionId,
              statement: 'Reviewer-introduced counterargument for sensitivity testing.',
              basis: 'Evaluation edit suite (not sourced to the contract).',
              isContestable: true,
            },
          ],
        },
      ],
      'id'
    ),
    relations: sortByKey(
      [
        ...baseFramework.relations,
        {
          id: addedRelId,
          from: addedArgId,
          to: baseFramework.rootClaimId,
          type: 'attack',
        },
      ],
      'id'
    ),
  };
  const afterStrength = getFinalStrength(evaluateWithDFQuAD(addition));
  details.push({
    scenarioId: 'add_counterargument_attack_root',
    passed: afterStrength <= beforeStrength + eps,
    beforeStrength,
    afterStrength,
    delta: afterStrength - beforeStrength,
  });

  if (details.length === 0) return { passRate: null, details };
  const passRate = details.filter(d => d.passed).length / details.length;
  return { passRate, details };
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
