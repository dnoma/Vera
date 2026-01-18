import { createToyAuditTrace } from './toy-case.js';

const trace = createToyAuditTrace();

const summary = {
  traceId: trace.traceId,
  decision: trace.decision,
  integrity: trace.integrity,
  unusedSourceIds: trace.unusedSourceIds,
};

console.log(JSON.stringify(summary, null, 2));
