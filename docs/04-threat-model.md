# Threat Model

This document outlines threats relevant to Vera and the mitigations built into
this reference implementation. It focuses on integrity, determinism, and
contestability.

## Assets

- Audit traces (inputs, reasoning structure, outputs).
- Integrity hashes used for tamper detection.
- Contestation metadata and recompute summaries.

## Threats and mitigations

### Tampering with traces
Threat: An attacker modifies a trace after it is generated.
Mitigation: Deterministic hashing of claim, framework, sources, uncertainty,
and trace content. Integrity fields allow detection of changes.

### Non-deterministic evaluation
Threat: Two runs yield different results for the same input.
Mitigation: Stable ordering of arguments and relations and pure functions.

### Invalid or inconsistent frameworks
Threat: Cycles, disconnected graphs, or invalid scores lead to undefined
behavior.
Mitigation: Structural validation and explicit invariant checks.

### Contestation abuse
Threat: Contestations introduce invalid references or break invariants.
Mitigation: Validation prior to apply and explicit error handling.

### Source misrepresentation
Threat: A source is altered while retaining the same identifier.
Mitigation: Content hashing of sources and explicit source metadata.

## Out of scope

- Adversarial model or data poisoning during training.
- Real-world provenance or legal authenticity of sources.
- Network level attacks or infrastructure compromise.
