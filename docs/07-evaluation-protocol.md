# Evaluation Protocol (Practitioner‑Facing)

This protocol is designed to be credible to legal tech reviewers (AI & Law / legal informatics) and to practitioner audiences (law firm innovation, risk, knowledge, and professional standards).

It combines:
- a modest offline benchmark (for repeatability),
- structured human review (for sufficiency, authority, and reviewability),
- a workflow test (for contestability and governance), and
- red teaming (for legal failure modes).

## Stage 1 — Offline benchmark (20–100 contracts)

**Aim:** Provide repeatable, comparable results on a modest corpus without implying leaderboard generalisation.

**Design**
- Select 20–100 contracts covering a small set of representative contract types and clause categories.
- Include positives and negatives per category; report class balance explicitly.
- Pre‑register: task definitions, thresholds, and the set of expected “required elements” per issue where applicable.
- Produce a decision pack for each (contract, question).

**Outputs to retain**
- Document hash and segmentation version.
- QBAF framework (arguments, relations, weights).
- Evidence map (argument → cited unit ids).
- Uncertainty and limitations.
- Decision + final strength.
- Integrity hashes and versions.

## Stage 2 — Structured human review rubric (legally trained reviewers)

**Aim:** Evaluate sufficiency, authority, and reviewability in terms that map to supervision and client defensibility.

**Reviewers**
- Use 2–3 legally trained reviewers (e.g. solicitors, PSLs, law grads with supervision).
- Measure inter‑rater agreement (e.g. Krippendorff’s alpha) on ordinal items.

**Rubric**
- Correctness (for the defined task)
- Evidence sufficiency (minimal sufficient support)
- Authority appropriateness (operative language vs non‑operative; external authority where relevant)
- Trace reviewability (can the chain be followed; assumptions explicit)
- Appropriateness of uncertainty/limitations

**Outputs**
- Per‑case rubric results (structured JSON).
- Disagreement analysis (where and why reviewers diverged).

## Stage 3 — Workflow test (review → challenge → recompute → export audit pack)

**Aim:** Demonstrate contestability and governance in a realistic flow.

**Task**
1) Review the decision and locate the decisive premise.
2) Apply at least one contestation (challenge premise, adjust weight, add counterargument, add missing evidence).
3) Recompute deterministically and compare the before/after trace.
4) Export an audit pack suitable for supervision and later scrutiny.

**Measures**
- Time to locate decisive premise.
- Number of contest actions required to reach an acceptable position.
- Whether recomputation behaves predictably.
- Whether the audit pack is complete and reviewer‑acceptable.

## Stage 4 — Red teaming (legal failure modes)

**Aim:** Identify and document failure modes that matter in legal practice.

**Targeted failures**
- Misleading citations (headers/definitions vs operative clauses).
- Missing exceptions/carve‑outs.
- Over‑generalisation from recitals.
- Hallucinated “authority” (where external authority is in scope).
- Over‑confident conclusions under missing evidence.

**Outputs**
- A failure mode register with severity, detectability, and mitigations.
- Recommended governance controls (e.g. mandatory limitations, minimum evidence validity).

## Reporting

Results should be presented as:
- a multi‑axis scorecard,
- a small set of headline governance metrics (e.g. reproducibility rate, audit completeness),
- qualitative exemplars (before/after contestation with audit excerpts),
- a clear statement of corpus scope and limitations.

