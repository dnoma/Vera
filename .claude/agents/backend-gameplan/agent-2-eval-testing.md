# Agent 2 — Eval Testing & Protocol (Manual Runs, Trackable Progress)

## Mission
Define a rigorous, lawyer-friendly evaluation protocol and “control” baselines that the team can run manually and compare over time.

## Core Principle: Paired Comparisons
For any claim “Vera is better than baseline”, require:
- Same tasks, same split, same model, same temperature
- Two prediction files (Vera + baseline)
- Compare with:
  - official task metrics (delta)
  - wins/losses/ties
  - confidence interval on accuracy-difference (bootstrap)
  - McNemar p-value (discordant pairs)

## Tier Definitions (Track Progress)

### Tier 0 (Sanity)
3 tasks, full-task scoring:
- `abercrombie`, `hearsay`, `personal_jurisdiction`

### Tier 1 (General Benchmark)
12 tasks (full-task scoring, representative mix):
- `abercrombie`
- `hearsay`
- `overruling`
- `ucc_v_common_law`
- `definition_extraction`
- `definition_classification`
- `citation_prediction_classification`
- `citation_prediction_open`
- `contract_nli_confidentiality_of_agreement`
- `contract_nli_no_licensing`
- `sara_numeric`
- `sara_entailment`

### Tier 2 (Scale / Realism)
Add a few heavier tasks (define after Tier 1 stabilizes).

## Required Controls (Baselines)
1) **Few-shot baseline**: `--promptMode few-shot` (current paper-style prompts)
2) **One-shot RAG control**: `--promptMode one-shot-rag`
   - retrieve 1 `train.tsv` example per test case, deterministic, log retrieval metadata

## Runbook (Manual)
1) Run Vera:
- `node dist/eval/run.js --dataset legalbench ... --promptMode few-shot --outDir eval-output/run-<name>-vera`
2) Run baseline:
- `node dist/eval/run.js --dataset legalbench ... --promptMode one-shot-rag --outDir eval-output/run-<name>-rag`
3) Convert outputs to JSONL (until F1 lands) and compare:
- `data/legalbench/.venv/bin/python scripts/legalbench-eval.py --predictions vera.jsonl --compare rag.jsonl --report docs/legalbench-results.md --run-name "<name>"`

## Acceptance Criteria Before Legal Review
- Tier 1: Vera beats baseline on:
  - macro avg delta > 0 (and CI excludes 0 for majority of tasks)
  - wins > losses on most tasks
- Error pack: at least N=20 sampled disagreements per task for human review
- Documented failure modes for weak tasks (citation_open, sara_numeric) and mitigations (normalization, stricter output constraints)

