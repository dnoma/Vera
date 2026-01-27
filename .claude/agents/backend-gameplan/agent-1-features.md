# Agent 1 — Features & Tooling (Ship Incrementally)

## Mission
Ship features that make “Vera vs baseline” claims defensible and reproducible, while keeping eval execution manual.

## Hard Boundaries
- You MAY modify:
  - `src/eval/**`
  - `scripts/**`
  - `docs/**`
  - `schemas/**` (only if needed for new artifacts)
- You MUST NOT commit datasets or secrets.

## Current Baseline (Already Shipped)
- LegalBench runner supports:
  - progress + checkpoint + resume
  - `--promptMode few-shot|one-shot-rag`
- Python scorer supports:
  - score-only-predicted-tasks by default
  - `--compare` for baseline vs primary (delta, wins/losses/ties, CI, McNemar)

## Next Features (Prioritized)

### F1) Deterministic “predictions.jsonl” emitter (no manual conversion)
Goal: remove ad-hoc conversion from `legalbench-latest.json` to JSONL.
- Add an option to write `eval-output/predictions.jsonl` next to `legalbench-latest.json`.
- Ensure ids align with `index` column (not row order).
- Acceptance:
  - deterministic ordering
  - includes `task`, `split`, `id` (numeric), `prediction`
  - optional `retrieval` metadata (if promptMode one-shot-rag)

### F2) Error pack export for legal review
Goal: produce a “disagreement pack” without rerunning the model.
- Input: `legalbench-latest.json`
- Output: `eval-output/legalbench-error-pack.md` (or `.jsonl`)
  - per task: top-N errors, include prompt (or prompt hash + source fields), gold, pred, retrieval metadata
- Acceptance:
  - stable sampling via seed
  - PII-safe (LegalBench only)

### F3) Output normalizers (task-specific)
Goal: stop losing points due to formatting.
- Implement optional post-processing per task (e.g. `citation_prediction_open`, `sara_numeric`, `definition_extraction`).
- Must be behind a flag: `--normalizeOutputs true|false`.
- Add tests showing normalization does not change already-correct outputs.

### F4) Concurrency (optional, guarded)
Goal: reduce wall time for large Tier runs.
- Add `--concurrency N` with safe defaults (N=1).
- Include rate-limit/backoff and deterministic ordering.
- Must preserve checkpoint/resume semantics.

## Commit Discipline
Ship each feature as:
1) focused diff + unit test(s)
2) `npm test -- <new tests>` and `npm run build`
3) commit with a narrow message

