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

## Evaluation: CUAD v1 (Baseline vs QBAF)

This repo includes an `eval/` harness that compares:
- Baseline: linear, narrative-style reasoning constrained to **structured JSON** output
- QBAF: graph-based reasoning constrained to **structured JSON** output, evaluated with DF-QuAD and assembled into an `AuditTrace`

Setup:
- Ensure `CUAD_v1/` is present at repo root (expects `CUAD_v1/CUAD_v1.json`).
- Set `OPENAI_API_KEY`.

Run a small smoke eval:

```bash
OPENAI_API_KEY=... npm run eval -- --dataset CUAD_v1 --methods both --limit 20
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
- The harness uses CUAD’s native *span supervision*: models are asked to return character offsets into the contract text.
- “Evidence span token F1” compares predicted evidence spans to CUAD’s gold answer spans for that question/category.
- QBAF auditability proxies are computed by deterministically perturbing argument base scores and re-evaluating: (a) flippable rate (can any base-score-only intervention flip the label?), (b) max single-argument delta (sensitivity), and (c) min interventions to flip when flippable.

Latest results:

<!-- EVAL_RESULTS_START -->

**CUAD v1 Evaluation**

- Dataset: `CUAD_v1`
- Model: `gpt-4.1-mini` (temperature=0)
- Contracts: 1, Categories: 2

| Metric | Baseline (Linear JSON) | QBAF (Graph + DF-QuAD) |
|---|---:|---:|
| Accuracy | 100.0% | 100.0% |
| Evidence span validity | 100.0% | 100.0% |
| Evidence span token F1 (vs CUAD) | 0.352 | 0.244 |
| QBAF: schema/framework pass rate | n/a | 100.0% |
| QBAF: contestability checks hold | n/a | 100.0% |
| QBAF: base-score flippable rate | n/a | 0.0% |
| QBAF: avg max single-arg delta | n/a | 0.006 |
| QBAF: avg min interventions to flip | n/a | n/a |

_Generated by `npm run eval`._

<!-- EVAL_RESULTS_END -->

## Documentation

- `docs/00-overview.md`
- `docs/01-audit-expectations.md`
- `docs/02-contestability.md`
- `docs/03-failure-modes.md`
- `docs/04-threat-model.md`
- `docs/05-invariants.md`

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
