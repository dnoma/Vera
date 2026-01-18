# Invariants

This document describes invariants enforced over argumentation frameworks and
how to validate them.

## Invariants covered

- ACYCLIC: The framework has no cycles.
- CONNECTED: Every argument has a path to the root claim.
- TREE_STRUCTURE: Each non-root argument has exactly one outgoing relation.
- VALID_BASE_SCORES: Base scores are within [0, 1].
- VALID_COMPUTED_STRENGTHS: Computed strengths are within [0, 1] for evaluated
  frameworks.

## Validation entrypoint

Use `validateInvariants` from `src/validators/validateInvariants.ts`. It accepts
an `ArgumentationFramework` or `EvaluatedFramework` and returns a list of
invariant check results.

The function is deterministic and does not mutate inputs. Results are frozen to
prevent accidental modification.

## Notes

- Computed strength checks are only meaningful for evaluated frameworks.
- Structural invariants are checked using traversal utilities in
  `src/core/ArgumentationFramework.ts`.
