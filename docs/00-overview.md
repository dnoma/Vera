Vera Overview

Vera is a reference implementation for contestable, audit-ready AI reasoning.
It models reasoning as a Quantitative Bipolar Argumentation Framework (QBAF),
computes dialectical strengths, and assembles a verifiable audit trace.

Core concepts
- Claim: the statement under evaluation.
- Arguments: supporting or attacking nodes with base scores.
- Relations: directed support or attack links between arguments.
- Framework: a connected, acyclic structure rooted at the claim.
- Semantics: DF-QuAD computes computedStrength for each argument.
- AuditTrace: the full, immutable record including sources, uncertainty,
  decision, limitations, and integrity hashes.

Typical workflow
1. Define the claim, sources, and arguments.
2. Build the framework and compute strengths with DF-QuAD.
3. Derive a decision and assemble the audit trace.
4. Validate the trace against the schema.

Determinism
Vera favors deterministic outputs. Ordering is normalized where possible,
and integrity hashes are computed from canonicalized data.
