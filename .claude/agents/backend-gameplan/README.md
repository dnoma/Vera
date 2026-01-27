# Dual-Agent Gameplan — Features + Eval Testing (LegalBench / CoRAG)

This folder replaces the older 3-agent backend plans. The current focus is:
- Shipping evaluation-relevant **features** (prompt modes, baselines, comparison metrics, robustness).
- Enabling **manual eval testing** runs you can execute and track (no autonomous long/costly runs).

## Agent Assignments (2 Agents, No Overlap)

- Agent 1 — Features & Tooling: `agent-1-features.md`
  - Implements new product + eval-support features (prompt modes, retrieval baselines, reporting artifacts, robustness).
  - Adds tests for deterministic behavior and correctness of tooling.
  - Must not “run full evals”; only smoke tests and unit tests.

- Agent 2 — Eval Testing & Protocol: `agent-2-eval-testing.md`
  - Defines the benchmarking protocol and acceptance criteria.
  - Maintains runbooks for Tiered runs, controls, and legal-review packs.
  - Does not implement features except tiny doc/script changes needed for the protocol.

## Shared Rules

- Atomic steps: each meaningful feature ships with:
  1) tests/smoke validation
  2) a commit
  3) updated docs/runbooks if it changes workflow
- Prefer deterministic, offline-friendly tooling (except model calls).
- Keep datasets out of git (`data/legalbench/` stays ignored).

