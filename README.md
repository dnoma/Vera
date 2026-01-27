# Vera

Reference implementation for contestable, audit-ready reasoning traces based on
Quantitative Bipolar Argumentation Frameworks (QBAFs).

Vera is designed for teams who need to show their work:
deterministic reasoning structure, explicit uncertainty/limitations, and an
immutable audit trace with integrity hashes.

## Features

- Deterministic argumentation frameworks with gradual semantics (DF-QuAD).
- Contestation workflow for applying challenges and recomputing outcomes.
- Explicit uncertainty, limitations, and decision labeling.
- JSON Schema validation plus invariant checks for structural safety.
- Deterministic integrity hashing for tamper detection.

This repository intentionally uses synthetic data (mock sources) and focuses on
mechanics rather than domain-specific content.

## What Partners Can Evaluate Quickly

- Determinism: `test/determinism.test.ts`
- Contestability properties: `test/contestability.test.ts`
- Schema validation: `schemas/audit-trace.schema.json` + `test/schema.test.ts`
- End-to-end example: `npm run example` (source: `src/examples/toy-case.ts`)
- Dataset eval harness (CUAD v1): `npm run eval` (see below)

## Quickstart

Install dependencies, build, and run checks:

```bash
npm install
npm run build
npm test
npm run example
```

## Minimal Example (Library-Style Usage)

Create a framework, evaluate it, and produce an audit trace:

```ts
import {
  createClaim,
  createArgument,
  createFramework,
  evaluateWithDFQuAD,
  createDecisionFromStrength,
  createMinimalUncertainty,
  createSource,
  createSourceMetadata,
  getFinalStrength,
  createAuditTrace,
  validators,
} from 'vera';

const claim = createClaim('The policy is compliant.', 'Example context', 'claim-1');
const root = createArgument('Root argument', 0.7, { id: 'arg-root' });
const framework = createFramework('arg-root', [root], []);

const evaluated = evaluateWithDFQuAD(framework);
const finalStrength = getFinalStrength(evaluated);
const decision = createDecisionFromStrength(finalStrength, claim.statement);

const source = createSource(
  'Policy Document',
  'Primary policy reference',
  '0'.repeat(64),
  createSourceMetadata('policy', { tags: ['policy'] }),
  { id: 'src-policy' }
);

const trace = createAuditTrace({
  version: '1.0.0',
  claim,
  framework: evaluated,
  sources: [source],
  decision,
  uncertainty: createMinimalUncertainty('High confidence.'),
  limitations: {
    scopeLimitations: [],
    temporalLimitations: [],
    sourceLimitations: [],
    methodLimitations: [],
  },
});

const schemaResult = validators.validateAuditTrace(trace);
if (!schemaResult.valid) {
  throw new Error(schemaResult.errors.map(e => e.message).join('; '));
}

console.log(trace.traceId, trace.decision.label);
```

If you’re running from this repo directly (without publishing/installing), you
can import from `./dist/index.js` after `npm run build`, or just run the
end-to-end toy case via `npm run example`.

## Contestation (Challenge → Recompute)

Contestation utilities help model “what if this assumption/base score/edge
changes?” workflows:

```ts
import {
  createBaseScoreContestation,
  predictContestationEffect,
  recomputeFramework,
} from 'vera';

const contestation = createBaseScoreContestation('arg-pro', 0.9, 'Boost pro');
const predicted = predictContestationEffect(framework, contestation);
const { framework: recomputed, metadata } = recomputeFramework(framework, evaluated, contestation);
```

## Tests

```bash
npm test
```

## Evaluation: Governance‑First Scorecard (CUAD v1 corpus)

This repo includes an `eval/` harness that compares:
- Baseline: structured JSON classification with evidence pointers (a pragmatic baseline for legal extraction workflows)
- QBAF: graph-based reasoning (arguments + counter-arguments), evaluated with DF‑QuAD and assembled into an `AuditTrace`

Setup:
- Ensure `CUAD_v1/` is present at repo root (expects `CUAD_v1/CUAD_v1.json`).
- Set `OPENAI_API_KEY`.

Run a small smoke eval:

```bash
OPENAI_API_KEY=... npm run eval -- --dataset CUAD_v1 --methods both --limit 20
```

Optional: include human review rubric files (see `schemas/human-review.schema.json` and `eval-assets/human-review.template.json`):

```bash
OPENAI_API_KEY=... npm run eval -- --dataset CUAD_v1 --methods both --limit 20 --humanReviewsDir eval-reviews
```

Inspect dataset metadata without calling the model:

```bash
npm run eval -- --dryRun --dataset CUAD_v1
```

Outputs:
- `eval-output/latest.json` (full results)
- `eval-output/README-snippet.md` (markdown summary suitable for README)
- `eval-output/cache/` (request/response cache for replayable scoring; gitignored)

Notes on scoring:
- The scorecard is **multi‑axis** and is intentionally not reducible to a single number.
- Evidence is scored for **validity and minimal sufficiency** (reviewable units), not verbosity.
- Governance metrics include determinism/reproducibility, contestation edit-suite behaviour, and audit trace integrity checks.

Latest results:

<!-- EVAL_RESULTS_START -->

**Evaluation Scorecard (Governance‑First)**

- Dataset: `CUAD_v1`
- Model: `gpt-4.1-mini` (temperature=0)
- Contracts: 18, Categories: 21
- Baseline completion: 40/40 (errors: 0)
- QBAF completion: 40/40 (errors: 0)

| Axis | Metric | Baseline (Structured JSON) | QBAF (Graph + DF‑QuAD) |
|---|---|---:|---:|
| Correctness | Issue accuracy | 72.5% | 45.0% |
| Evidence | Evidence validity (span pointers) | 100.0% | 100.0% |
| Evidence | Minimal sufficiency (median) | 0.000 | 0.000 |
| Evidence | Evidence units cited (median) | 0.0 | 6.0 |
| Evidence | Authority appropriateness (operative) | 83.1% | 75.1% |
| Trace | Trace completeness (cited or assumption) | n/a | 96.7% |
| Contestability | Counterargument present | n/a | 100.0% |
| Contestability | Edit suite directional pass rate | n/a | 100.0% |
| Governance | Trace reproducibility (hash stable) | n/a | 100.0% |
| Governance | AuditTrace schema pass rate | n/a | 100.0% |
| Robustness | Monotonicity checks hold (P1) | n/a | 100.0% |
| Robustness | Base-score flippable rate | n/a | 100.0% |
| Robustness | Bounded-intervention flippable rate | n/a | 100.0% |
| Robustness | Max single-argument delta (avg) | n/a | 0.237 |
| Auditability | Min interventions to flip (avg, if flippable) | n/a | 1.02 |

_Generated by `npm run eval`._

<!-- EVAL_RESULTS_END -->

## Evaluation: LegalBench (General Benchmark Tiers)

Vera also includes a LegalBench runner intended for staged benchmarking before legal review.

**What “Tier 1” means**
- A small, representative **multi-task** benchmark (not the full 162-task suite).
- **Full-task scoring** end-to-end: for each included task, the run answers every row in `test.tsv` and scores using LegalBench’s official task evaluators.
- Purpose: a stable progress signal across task types (classification, entailment, extraction, citation).

**Tier 1 task slate (12 tasks)**
`abercrombie`, `hearsay`, `overruling`, `ucc_v_common_law`, `definition_extraction`, `definition_classification`,
`citation_prediction_classification`, `citation_prediction_open`, `contract_nli_confidentiality_of_agreement`,
`contract_nli_no_licensing`, `sara_numeric`, `sara_entailment`.

**How to run Tier 1**

```bash
OPENAI_API_KEY=... node dist/eval/run.js \
  --dataset legalbench \
  --legalBenchRootDir data/legalbench \
  --split test \
  --tasks abercrombie,hearsay,overruling,ucc_v_common_law,definition_extraction,definition_classification,citation_prediction_classification,citation_prediction_open,contract_nli_confidentiality_of_agreement,contract_nli_no_licensing,sara_numeric,sara_entailment \
  --outDir eval-output \
  --model gpt-4.1-mini \
  --temperature 0 \
  --progressEvery 50 \
  --checkpointEvery 200 \
  --promptMode few-shot
```

**Baselines / controls**

One-shot RAG control (retrieve 1 example from `train.tsv` per test case; deterministic):

```bash
OPENAI_API_KEY=... node dist/eval/run.js \
  --dataset legalbench \
  --legalBenchRootDir data/legalbench \
  --split test \
  --tasks abercrombie,hearsay,overruling,ucc_v_common_law,definition_extraction,definition_classification,citation_prediction_classification,citation_prediction_open,contract_nli_confidentiality_of_agreement,contract_nli_no_licensing,sara_numeric,sara_entailment \
  --outDir eval-output \
  --model gpt-4.1-mini \
  --temperature 0 \
  --progressEvery 50 \
  --checkpointEvery 200 \
  --promptMode one-shot-rag
```

**Resume long runs**

If a run is interrupted, resume from `eval-output/legalbench-partial.json`:

```bash
OPENAI_API_KEY=... node dist/eval/run.js \
  --dataset legalbench \
  --legalBenchRootDir data/legalbench \
  --split test \
  --tasks abercrombie,hearsay,overruling,ucc_v_common_law,definition_extraction,definition_classification,citation_prediction_classification,citation_prediction_open,contract_nli_confidentiality_of_agreement,contract_nli_no_licensing,sara_numeric,sara_entailment \
  --outDir eval-output \
  --model gpt-4.1-mini \
  --temperature 0 \
  --progressEvery 50 \
  --checkpointEvery 200 \
  --resume
```

**Compare Vera vs baseline (win-rate + deltas)**

After you convert each run to JSONL (see `docs/legalbench-results.md`), append a comparison table:

```bash
data/legalbench/.venv/bin/python scripts/legalbench-eval.py \
  --predictions vera.jsonl \
  --compare baseline.jsonl \
  --report docs/legalbench-results.md \
  --run-name "vera vs one-shot-rag"
```

**Latest Tier 1 results (gpt-4.1-mini, temperature=0)**
- Run: `2026-01-26 14:57:19Z` (see `docs/legalbench-results.md`)
- Coverage (weighted): `0.9996`
- Macro avg: `0.7063`
- Weighted avg: `0.8665`
- Notable lows: `citation_prediction_open` (`0.0755`), `sara_numeric` (`0.0312`) — both are strict-format tasks where exact-match scoring is sensitive to output normalization.

## Documentation

- `docs/00-overview.md`
- `docs/01-audit-expectations.md`
- `docs/02-contestability.md`
- `docs/03-failure-modes.md`
- `docs/04-threat-model.md`
- `docs/05-invariants.md`
- `docs/06-evaluation-framework.md`
- `docs/07-evaluation-protocol.md`
- `docs/08-human-review-rubric.md`

## Project Layout

- `src/core/`: domain model (Claim/Argument/Relation), frameworks, AuditTrace assembly
- `src/semantics/`: DF-QuAD gradual semantics
- `src/contestation/`: apply/predict/recompute contestations
- `src/validators/`: framework validation, invariants, schema validation
- `src/integrity/`: canonical hashing + stable ordering helpers
- `schemas/`: JSON Schema for AuditTrace
- `src/examples/`, `test/`, `docs/`: runnable toy case, tests, and partner-facing docs

## License

MIT. See `LICENSE`.
