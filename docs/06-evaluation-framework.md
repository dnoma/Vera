# Evaluation Framework (Governance‑First Legal Reasoning)

This project is designed to support adoption in regulated legal workflows. The evaluation goal is therefore **not** to maximise overlap with dataset annotations, but to demonstrate that outputs are:

- legally correct for the task,
- grounded in sufficient and appropriately authoritative source material,
- reviewable by a legally trained practitioner,
- contestable (a reviewer can challenge premises and recompute deterministically),
- robust and appropriately sensitive to key premises and missing evidence, and
- auditable and governable (reproducible, integrity‑protected, and traceable).

The unit of evaluation is a **decision pack** for a single task:

1) input source(s) (e.g. contract),
2) the system’s structured reasoning output (QBAF graph + decision + uncertainty),
3) the deterministic recomputation artefacts, and
4) an audit pack (integrity hashes + change log).

This is deliberately aligned to what law firm reviewers and regulated adopters scrutinise: *can we supervise, challenge, and defend this output later?*

## Multi‑Axis Scorecard

The scorecard is multi‑axis by design. It must not be collapsed into a single number.

### Axis A — Legal correctness & issue spotting

**Intent:** Is the conclusion correct for the defined task and does it surface the relevant issues?

**Suggested metrics**
- **Issue accuracy** (and balanced accuracy): per issue/category; report false positives separately.
- **Element coverage** (where applicable): for structured issues with required elements (e.g. “termination for convenience” → notice, timing, party).

**Legal failure modes**
- Missed exception / carve‑out.
- Over‑broad issue spotting (review noise).
- Incorrect legal characterisation (wrong clause type).

**Why this matters**
- Professional responsibility attaches to correctness and supervision; high false positives increase review cost and reduce trust.

### Axis B — Evidentiary sufficiency & authority

**Intent:** Are citations reproducible, sufficient, and appropriately authoritative for the claim?

**Suggested metrics**
- **Evidence validity rate:** citations resolve to stable, reproducible locations; no misleading truncation.
- **Minimal sufficiency score:** rewards *minimal sufficient* evidence and penalises over‑citation.
- **Authority appropriateness:** citations come from operative language when required (vs recitals/headers/boilerplate), and from higher‑tier authority when the task requires it.

**Legal failure modes**
- Misleading citation (header/definition cited while operative clause differs).
- Insufficient support (conclusion asserted without operative clause).
- “Citation smokescreen” (verbosity that slows review and creates false confidence).

**Why this matters**
- Defensibility depends on reproducible and sufficient support, not token overlap or quantity of quotations.

### Axis C — Trace quality (reviewability)

**Intent:** Can a legally trained reviewer follow the chain from sources → arguments → conclusion?

**Suggested metrics**
- **Trace completeness:** every non‑trivial claim is either cited to a source or explicitly marked as an assumption/unknown.
- **Assumption hygiene:** assumptions are explicit, scoped, and challengeable (not hidden).
- **Graph legibility:** structural constraints that aid review (bounded size, clear pro/con separation, stable identifiers).

**Legal failure modes**
- Unreviewable trace (cannot locate decisive premise).
- Hidden assumptions (decisive premise not labelled).
- Category error (mixing factual extraction and normative judgement without separation).

**Why this matters**
- Supervision requires that reviewers can efficiently locate, understand, and challenge the basis for a conclusion.

### Axis D — Contestability (challenge → recompute → audit)

**Intent:** Can a reviewer challenge the reasoning and observe deterministic recomputation with a stable audit trail?

**Suggested metrics**
- **Contest action coverage:** supports practical contest moves (challenge premise, adjust weight, add counterargument, add missing evidence, record limitation).
- **Counterfactual sensitivity pass rate:** outcome changes when key premises are edited (and remains stable when irrelevant edits are made).
- **Recomputation integrity:** deterministic recomputation and integrity hashes update correctly.

**Legal failure modes**
- Non‑actionable contestation (edits do not propagate).
- Chaotic/brittle contestation (irrelevant changes cause large shifts).
- Missing audit trail for edits (cannot defend later).

**Why this matters**
- Contestability is a supervision mechanism: review and correction should be possible without re‑running an opaque model.

### Axis E — Robustness & sensitivity

**Intent:** Is the outcome appropriately sensitive to key premises and missing evidence, and appropriately insensitive to noise?

**Suggested metrics**
- **Key‑premise sensitivity:** expected directional change when key pro/con premises are perturbed.
- **Missing‑evidence stress test:** removing a key evidence unit should reduce confidence, add limitations, or change the conclusion.
- **Single‑argument influence:** maximum decision change from perturbing one argument within bounded limits.

**Legal failure modes**
- Over‑confident conclusion under missing evidence.
- Outcome inertia (does not change when key premise flips).
- One‑node brittleness (single dubious argument dominates).

**Why this matters**
- In practice, evidence varies in quality; the system must degrade safely and predictably.

### Axis F — Auditability & governance

**Intent:** Can this be operated under scrutiny with reproducibility, integrity, and clear governance assumptions?

**Suggested metrics**
- **Trace reproducibility rate:** same input + same recorded parameters yields the same trace hash.
- **Audit pack completeness:** export contains sources, citations, graph, decision, uncertainty/limitations, change log, integrity hashes, versions.
- **Governance assumptions coverage:** explicit statements about access controls, who can contest, and what constitutes an authorised change.

**Legal failure modes**
- Non‑reproducible reasoning (cannot reconstruct).
- Broken chain of custody (sources not hashed or retained).
- Governance ambiguity (who changed what and why is unclear).

**Why this matters**
- These are adoption thresholds in regulated environments.

## Evidence Scoring Without Verbosity Incentives

Token overlap is a poor proxy for evidentiary quality and penalises minimal sufficient citations.

Recommended approach:

1) **Separate validity from sufficiency**
- Validity: citation pointers are reproducible and non‑misleading.
- Sufficiency: the cited material is enough to support the claim.

2) **Score over reviewable units**
- Prefer sentence/clause/section units rather than token spans.
- Map citations to these units; deduplicate.

3) **Minimal sufficiency scoring**
- Reward covering the minimal required evidence units.
- Penalise unnecessary evidence units, rather than rewarding length.

4) **Calibrate strictness by use case**
- Internal research: tolerate softer matching and broader units if limitations are explicit.
- Client‑facing / regulated: require operative clause units and stricter validity checks.

## Reporting Guidance

The evaluation should produce:
- a **multi‑axis scorecard** (not a single number),
- a small set of **headline governance metrics** suitable for an abstract, and
- qualitative exemplars showing **before/after contestation** with audit excerpts.

