import type { EvalRun, EvalSummary } from './types.js';

function pct(value: number | null): string {
  if (value === null) return 'n/a';
  return `${(value * 100).toFixed(1)}%`;
}

function row(axis: string, metric: string, a: string, b: string): string {
  return `| ${axis} | ${metric} | ${a} | ${b} |`;
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

    const evidenceUnitCounts = results
      .map(r => r.evidenceUnitCount)
      .filter((v): v is number => Number.isFinite(v));
    const evidenceUnitCountMedian =
      evidenceUnitCounts.length === 0 ? null : median(evidenceUnitCounts);

    const mssValues = results
      .map(r => r.minimalSufficiencyScore)
      .filter((v): v is number => typeof v === 'number');
    const minimalSufficiencyScoreMedian =
      mssValues.length === 0 ? null : median(mssValues);

    const authorityValues = results
      .map(r => r.authorityAppropriatenessRate)
      .filter((v): v is number => typeof v === 'number');
    const authorityAppropriatenessRate =
      authorityValues.length === 0 ? null : authorityValues.reduce((a, b) => a + b, 0) / authorityValues.length;

    const reproducible = results
      .map(r => r.traceReproducible)
      .filter((v): v is boolean => typeof v === 'boolean');
    const traceReproducibilityRate =
      reproducible.length === 0 ? null : reproducible.filter(v => v).length / reproducible.length;

    const completenessValues = results
      .map(r => r.traceCompletenessRate)
      .filter((v): v is number => typeof v === 'number');
    const traceCompletenessRate =
      completenessValues.length === 0 ? null : completenessValues.reduce((a, b) => a + b, 0) / completenessValues.length;

    const counterargumentValues = results
      .map(r => r.counterargumentPresent)
      .filter((v): v is boolean => typeof v === 'boolean');
    const counterargumentPresentRate =
      counterargumentValues.length === 0 ? null : counterargumentValues.filter(v => v).length / counterargumentValues.length;

    const editPassValues = results
      .map(r => r.editSuitePassRate)
      .filter((v): v is number => typeof v === 'number');
    const editSuitePassRate =
      editPassValues.length === 0 ? null : editPassValues.reduce((a, b) => a + b, 0) / editPassValues.length;

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
      evidenceUnitCountMedian,
      minimalSufficiencyScoreMedian,
      authorityAppropriatenessRate,
      traceReproducibilityRate,
      traceCompletenessRate,
      counterargumentPresentRate,
      editSuitePassRate,
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

function median(values: readonly number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) return sorted[mid]!;
  return (sorted[mid - 1]! + sorted[mid]!) / 2;
}

export function markdownReport(run: EvalRun): string {
  const summaries = run.summaries;
  const baseline = summaries.find(s => s.method === 'baseline');
  const qbaf = summaries.find(s => s.method === 'qbaf');

  const bAcc = baseline ? pct(baseline.accuracy) : 'n/a';
  const qAcc = qbaf ? pct(qbaf.accuracy) : 'n/a';

  const bSpanValid = baseline ? pct(baseline.evidenceSpanValidityRate) : 'n/a';
  const qSpanValid = qbaf ? pct(qbaf.evidenceSpanValidityRate) : 'n/a';

  const bMss =
    baseline && baseline.minimalSufficiencyScoreMedian !== null
      ? baseline.minimalSufficiencyScoreMedian.toFixed(3)
      : 'n/a';
  const qMss =
    qbaf && qbaf.minimalSufficiencyScoreMedian !== null
      ? qbaf.minimalSufficiencyScoreMedian.toFixed(3)
      : 'n/a';

  const bUnits = baseline && baseline.evidenceUnitCountMedian !== null ? baseline.evidenceUnitCountMedian.toFixed(1) : 'n/a';
  const qUnits = qbaf && qbaf.evidenceUnitCountMedian !== null ? qbaf.evidenceUnitCountMedian.toFixed(1) : 'n/a';

  const bAuth = baseline ? pct(baseline.authorityAppropriatenessRate) : 'n/a';
  const qAuth = qbaf ? pct(qbaf.authorityAppropriatenessRate) : 'n/a';

  const qTraceComplete = qbaf ? pct(qbaf.traceCompletenessRate) : 'n/a';
  const qCounter = qbaf ? pct(qbaf.counterargumentPresentRate) : 'n/a';
  const qEditPass = qbaf ? pct(qbaf.editSuitePassRate) : 'n/a';
  const qRepro = qbaf ? pct(qbaf.traceReproducibilityRate) : 'n/a';

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
    `**Evaluation Scorecard (Governance‑First)**`,
    '',
    `- Dataset: \`${run.datasetPath}\``,
    `- Model: \`${run.openai.model}\` (temperature=${run.openai.temperature})`,
    `- Contracts: ${run.contractCount}, Categories: ${run.categoryCount}`,
    '',
    '| Axis | Metric | Baseline (Structured JSON) | QBAF (Graph + DF‑QuAD) |',
    '|---|---|---:|---:|',
    row('Correctness', 'Issue accuracy', bAcc, qAcc),
    row('Evidence', 'Evidence validity (span pointers)', bSpanValid, qSpanValid),
    row('Evidence', 'Minimal sufficiency (median)', bMss, qMss),
    row('Evidence', 'Evidence units cited (median)', bUnits, qUnits),
    row('Evidence', 'Authority appropriateness (operative)', bAuth, qAuth),
    row('Trace', 'Trace completeness (cited or assumption)', 'n/a', qTraceComplete),
    row('Contestability', 'Counterargument present', 'n/a', qCounter),
    row('Contestability', 'Edit suite directional pass rate', 'n/a', qEditPass),
    row('Governance', 'Trace reproducibility (hash stable)', 'n/a', qRepro),
    row('Governance', 'AuditTrace schema pass rate', 'n/a', qSchema),
    row('Robustness', 'Monotonicity checks hold (P1)', 'n/a', qContest),
    row('Robustness', 'Base-score flippable rate', 'n/a', qFlippable),
    row('Robustness', 'Max single-argument delta (avg)', 'n/a', qMaxDelta),
    row('Auditability', 'Min interventions to flip (avg, if flippable)', 'n/a', qInterventions),
    '',
    '_Generated by `npm run eval`._',
  ].join('\n');

  if (!run.humanReviewSummary) return header;

  const h = run.humanReviewSummary;
  const qbafOverall = h.byMethod.qbaf.mean.overallAdoptability;
  const baseOverall = h.byMethod.baseline.mean.overallAdoptability;
  const qbafAlpha = h.byMethod.qbaf.iaaAlphaOrdinal.overallAdoptability;
  const baseAlpha = h.byMethod.baseline.iaaAlphaOrdinal.overallAdoptability;

  const human = [
    '',
    '**Human Review (Rubric Summary)**',
    '',
    `- Reviews loaded: ${h.totalReviews} (invalid: ${h.invalidReviews})`,
    '',
    '| Metric | Baseline | QBAF |',
    '|---|---:|---:|',
    `| Reviews | ${h.byMethod.baseline.reviews} | ${h.byMethod.qbaf.reviews} |`,
    `| Mean overall adoptability (1–5) | ${baseOverall === null ? 'n/a' : baseOverall.toFixed(2)} | ${qbafOverall === null ? 'n/a' : qbafOverall.toFixed(2)} |`,
    `| IAA α (ordinal, overall adoptability) | ${baseAlpha === null ? 'n/a' : baseAlpha.toFixed(2)} | ${qbafAlpha === null ? 'n/a' : qbafAlpha.toFixed(2)} |`,
  ].join('\n');

  return `${header}\n${human}`;
}
