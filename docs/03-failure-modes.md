Failure Modes

This document summarizes common failure modes and how Vera exposes them.

Modeling failures
- Disconnected arguments: the framework is not connected to the root claim.
- Cycles: the framework is not acyclic, so strengths cannot be evaluated.
- Invalid base or computed scores: scores fall outside [0,1].

Data failures
- Missing sources for referenced arguments.
- Outdated or incorrect source metadata.
- Unused sources that should have been referenced.

Semantics failures
- Non-deterministic evaluation order in branching structures.
- Incorrect aggregation or combination logic.
- Mismatch between computed strengths and decision outputs.

Integrity failures
- Hashes do not match canonicalized data.
- TraceHash computed from non-deterministic ordering.
- Tampered fields that break verification.

Operational failures
- Schema validation errors due to missing required fields.
- Incomplete uncertainty or limitation disclosures.
