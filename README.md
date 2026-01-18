# Vera

Reference implementation for contestable, audit-ready reasoning traces based on
Quantitative Bipolar Argumentation Frameworks (QBAFs).

## Features

- Deterministic argumentation frameworks with gradual semantics.
- Contestation workflow for applying and predicting challenges.
- Explicit uncertainty and decision labeling.
- Integrity hashing for audit trace tamper detection.

## Quickstart

Install dependencies and build:

```bash
npm install
npm run build
```

## Minimal example

Create a framework, evaluate it, and produce an audit trace:

```ts
import {
  createClaim,
  createArgument,
  createFramework,
  createDecisionFromStrength,
  createMinimalUncertainty,
  createSource,
  createSourceMetadata,
  getFinalStrength,
} from './src/core/index.js';
import { evaluateWithDFQuAD } from './src/semantics/index.js';
import { createAuditTrace } from './src/core/AuditTrace.js';

const claim = createClaim('The policy is compliant.', 'Example context', 'claim-1');
const root = createArgument('Root argument', 0.7, { id: 'arg-root' });
const framework = createFramework('arg-root', [root], []);

const evaluated = evaluateWithDFQuAD(framework);
const finalStrength = getFinalStrength(evaluated);
const decision = createDecisionFromStrength(finalStrength, claim.statement);

const source = createSource(
  'Policy Document',
  'Primary policy reference',
  '0'.repeat(64),
  createSourceMetadata('policy', { tags: ['policy'] }),
  { id: 'src-policy' }
);

const trace = createAuditTrace({
  version: '1.0.0',
  claim,
  framework: evaluated,
  sources: [source],
  decision,
  uncertainty: createMinimalUncertainty('High confidence.'),
  limitations: {
    scopeLimitations: [],
    temporalLimitations: [],
    sourceLimitations: [],
    methodLimitations: [],
  },
});

console.log(trace.traceId, trace.decision.label);
```

## Tests

```bash
npm test
```

## Documentation

- docs/02-contestability.md
- docs/04-threat-model.md
- docs/05-invariants.md
