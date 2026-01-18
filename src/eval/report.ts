import type { EvalRun, EvalSummary } from './types.js';

function pct(value: number | null): string {
  if (value === null) return 'n/a';
  return `${(value * 100).toFixed(1)}%`;
}

function row(label: string, a: string, b: string): string {
  return `| ${label} | ${a} | ${b} |`;
}

export function summarize(run: EvalRun): readonly EvalSummary[] {
  const byMethod = new Map<string, EvalSummary>();

  for (const method of run.methods) {
    const results = run.results.filter(r => r.method === method);
    const total = results.length;
    const predictedResults = results.filter(r => r.predicted !== null);
    const predicted = predictedResults.length;
    const correct = predictedResults.filter(r => r.predicted === r.label).length;

    const spansChecked = results.reduce((sum, r) => sum + r.evidenceSpansChecked, 0);
    const spansValid = results.reduce((sum, r) => sum + r.evidenceSpansValid, 0);
    const f1Values = results
      .map(r => r.evidenceTokenOverlapF1)
      .filter((v): v is number => typeof v === 'number');

    const accuracy = predicted === 0 ? null : correct / predicted;
    const evidenceSpanValidityRate = spansChecked === 0 ? null : spansValid / spansChecked;
    const evidenceSpanTokenF1 = f1Values.length === 0 ? null : f1Values.reduce((a, b) => a + b, 0) / f1Values.length;

    const schemaChecks = results
      .map(r => r.schemaValidation)
      .filter((v): v is NonNullable<typeof v> => v !== undefined);
    const schemaPassRate =
      schemaChecks.length === 0
        ? null
        : schemaChecks.filter(v => v.valid).length / schemaChecks.length;

    const frameworkChecks = results
      .map(r => r.frameworkValidation)
      .filter((v): v is NonNullable<typeof v> => v !== undefined);
    const frameworkValidRate =
      frameworkChecks.length === 0
        ? null
        : frameworkChecks.filter(v => v.valid).length / frameworkChecks.length;

    const contestabilityChecks = results
      .flatMap(r => r.contestability ?? [])
      .filter(c => c.property === 'P1_pro_increase' || c.property === 'P1_con_increase');
    const contestabilityHoldRate =
      contestabilityChecks.length === 0
        ? null
        : contestabilityChecks.filter(c => c.holds).length / contestabilityChecks.length;

    const auditabilityRecords = results
      .map(r => r.auditability)
      .filter((v): v is NonNullable<typeof v> => v !== undefined);

    const interventions = results
      .map(r => r.auditability?.minInterventionsToFlip)
      .filter((v): v is number => typeof v === 'number');
    const avgMinInterventionsToFlip =
      interventions.length === 0
        ? null
        : interventions.reduce((a, b) => a + b, 0) / interventions.length;

    const maxDeltas = results
      .map(r => r.auditability?.maxSingleArgumentDelta)
      .filter((v): v is number => typeof v === 'number');
    const avgMaxSingleArgumentDelta =
      maxDeltas.length === 0
        ? null
        : maxDeltas.reduce((a, b) => a + b, 0) / maxDeltas.length;

    const baseScoreFlippableRate =
      auditabilityRecords.length === 0
        ? null
        : auditabilityRecords.filter(a => a.minInterventionsToFlip !== undefined).length /
          auditabilityRecords.length;

    byMethod.set(method, {
      method,
      total,
      predicted,
      accuracy,
      evidenceSpanValidityRate,
      evidenceSpanTokenF1,
      schemaPassRate,
      frameworkValidRate,
      contestabilityHoldRate,
      avgMinInterventionsToFlip,
      avgMaxSingleArgumentDelta,
      baseScoreFlippableRate,
    });
  }

  return run.methods.map(m => byMethod.get(m)!);
}

export function markdownReport(run: EvalRun): string {
  const summaries = run.summaries;
  const baseline = summaries.find(s => s.method === 'baseline');
  const qbaf = summaries.find(s => s.method === 'qbaf');

  const bAcc = baseline ? pct(baseline.accuracy) : 'n/a';
  const qAcc = qbaf ? pct(qbaf.accuracy) : 'n/a';

  const bF1 = baseline ? (baseline.evidenceSpanTokenF1 === null ? 'n/a' : baseline.evidenceSpanTokenF1.toFixed(3)) : 'n/a';
  const qF1 = qbaf ? (qbaf.evidenceSpanTokenF1 === null ? 'n/a' : qbaf.evidenceSpanTokenF1.toFixed(3)) : 'n/a';

  const bSpanValid = baseline ? pct(baseline.evidenceSpanValidityRate) : 'n/a';
  const qSpanValid = qbaf ? pct(qbaf.evidenceSpanValidityRate) : 'n/a';

  const qSchema = qbaf ? pct(qbaf.schemaPassRate) : 'n/a';
  const qContest = qbaf ? pct(qbaf.contestabilityHoldRate) : 'n/a';
  const qFlippable = qbaf ? pct(qbaf.baseScoreFlippableRate) : 'n/a';
  const qMaxDelta =
    qbaf && qbaf.avgMaxSingleArgumentDelta !== null
      ? qbaf.avgMaxSingleArgumentDelta.toFixed(3)
      : 'n/a';
  const qInterventions =
    qbaf && qbaf.avgMinInterventionsToFlip !== null
      ? qbaf.avgMinInterventionsToFlip.toFixed(2)
      : 'n/a';

  const header = [
    `**CUAD v1 Evaluation**`,
    '',
    `- Dataset: \`${run.datasetPath}\``,
    `- Model: \`${run.openai.model}\` (temperature=${run.openai.temperature})`,
    `- Contracts: ${run.contractCount}, Categories: ${run.categoryCount}`,
    '',
    '| Metric | Baseline (Linear JSON) | QBAF (Graph + DF-QuAD) |',
    '|---|---:|---:|',
    row('Accuracy', bAcc, qAcc),
    row('Evidence span validity', bSpanValid, qSpanValid),
    row('Evidence span token F1 (vs CUAD)', bF1, qF1),
    row('QBAF: schema/framework pass rate', 'n/a', qSchema),
    row('QBAF: contestability checks hold', 'n/a', qContest),
    row('QBAF: base-score flippable rate', 'n/a', qFlippable),
    row('QBAF: avg max single-arg delta', 'n/a', qMaxDelta),
    row('QBAF: avg min interventions to flip', 'n/a', qInterventions),
    '',
    '_Generated by `npm run eval`._',
  ].join('\n');

  return header;
}
