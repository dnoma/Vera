Audit Expectations

An audit trace should provide enough evidence to reconstruct and contest the
reasoning process. Reviewers should be able to inspect inputs, transformations,
and outputs without relying on hidden context.

Minimum expectations
- Trace identity and timestamps are present.
- All arguments and relations are included and connect to the root.
- Sources are listed with metadata and content hashes.
- Uncertainty and limitations are explicit, even if minimal.
- Integrity hashes match canonicalized content.

Decision expectations
- Decision labels and thresholds are visible.
- The final strength aligns with the evaluated framework.
- Any conditions or caveats are stated clearly.

Contestation expectations
- If contestation is present, include the full challenge record.
- Recompute metadata should summarize what changed and why.

Validation expectations
- Audit traces should pass JSON schema validation.
- Framework validation should catch disconnected, cyclic, or invalid scores.
