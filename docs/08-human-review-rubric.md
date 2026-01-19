# Human Review Rubric (Legally Trained Reviewers)

This rubric is intended to be completed by legally trained reviewers as part of the evaluation protocol. It is designed to capture the adoption‑relevant qualities that automated metrics cannot fully measure: sufficiency, authority, reviewability, and whether the output is defensible under supervision.

The canonical machine‑readable format is `schemas/human-review.schema.json`.

## Rating scale (1–5)

Use the following anchors consistently:

- **1 — Unacceptable:** would not rely on this; material issues; not defensible.
- **2 — Weak:** substantial problems; requires heavy re‑work to be safe.
- **3 — Mixed:** partly useful; needs correction and closer supervision.
- **4 — Strong:** largely acceptable; minor edits or clarifications required.
- **5 — Excellent:** reviewable, well‑grounded, and defensible with minimal edits.

## Dimensions (record all)

### Legal correctness (1–5)
Is the conclusion correct for the defined task?

Common failure modes:
- missed exception / carve‑out
- incorrect legal characterisation
- incorrect application of a definition

### Evidence sufficiency (1–5)
Is the cited material **minimally sufficient** to support the conclusion?

Look for:
- operative language cited (not just headings/recitals)
- key conditions and thresholds included
- exceptions and carve‑outs captured where relevant

### Authority appropriateness (1–5)
Is the support appropriately authoritative for the claim?

For contract‑only tasks:
- operative clause > definition > boilerplate/recital/header

For mixed‑authority tasks (when in scope):
- statute/regulator guidance/case law > secondary commentary > vendor policy

### Trace reviewability (1–5)
Can you follow the chain from sources → arguments → conclusion?

Look for:
- clear pro/con structure
- explicit assumptions
- ability to locate the decisive premise quickly

### Uncertainty & limitations appropriateness (1–5)
Is uncertainty handled responsibly?

Look for:
- missing evidence is acknowledged
- limitations are specific and actionable
- no false precision / over‑confidence

### Overall adoptability (1–5)
Would this output be acceptable in a supervised professional workflow?

Consider:
- review time
- correction effort
- defensibility if challenged later
- suitability for inclusion in a client‑facing memo (depending on the use case)

## Notes (free text)

Provide:
- a short summary of what is good/bad,
- any observed legal failure modes,
- recommended improvements (prompting, evidence mapping, graph structure, governance).

