import type { AdvisorPacketStore } from '../audit/store.js';
import { buildAdvisorPacket } from '../audit/buildAdvisorPacket.js';
import type { WorkflowPorts } from './ports.js';
import { enforceExactQuote, enforceGroundingOk, enforceSingaporeOnly } from './policy.js';

type WorkflowDeps = {
  ports: WorkflowPorts;
  packetStore: AdvisorPacketStore;
};

export async function resolveCitationWorkflow(
  deps: WorkflowDeps,
  input: { requestId: string; rawCitation: string }
): Promise<{ response: unknown; packetId: string }> {
  const startedAt = new Date().toISOString();
  const route = 'POST /v1/citations/resolve';
  let fired: string[] = [];
  let notes: string[] = [];

  try {
    const candidates = await deps.ports.caseRegistry.searchByCitation(input.rawCitation);
    const resolved = await deps.ports.verification.resolveCitation(input.rawCitation, candidates);

    if (resolved.status === 'resolved' && resolved.caseId) {
      const meta = await deps.ports.caseRegistry.getCase(resolved.caseId);
      const sg = enforceSingaporeOnly(meta);
      fired = fired.concat(sg.fired);
      notes = notes.concat(sg.notes);
      if (!sg.value.ok) {
        resolved.status = 'ambiguous';
        resolved.notes = [...resolved.notes, ...sg.notes];
        delete resolved.caseId;
      }
    }

    const finishedAt = new Date().toISOString();
    const packet = buildAdvisorPacket({
      requestId: input.requestId,
      route,
      startedAt,
      finishedAt,
      input,
      output: resolved,
      evidence: [],
      policy: { fired, notes },
    });
    await deps.packetStore.save(packet);
    return { response: resolved, packetId: packet.packetId };
  } catch (err) {
    const finishedAt = new Date().toISOString();
    const packet = buildAdvisorPacket({
      requestId: input.requestId,
      route,
      startedAt,
      finishedAt,
      input,
      output: { status: 'error' },
      evidence: [],
      policy: { fired, notes },
      error: { message: err instanceof Error ? err.message : 'Unknown error' },
    });
    await deps.packetStore.save(packet);
    return { response: { status: 'error', candidates: [], confidence: 0, notes: ['Internal error'] }, packetId: packet.packetId };
  }
}

export async function verifyQuoteWorkflow(
  deps: WorkflowDeps,
  input: { requestId: string; caseId: string; quote: string; paraHint?: string }
): Promise<{ response: unknown; packetId: string; evidence: Array<{ caseId: string; paraId: string; text: string }> }> {
  const startedAt = new Date().toISOString();
  const route = 'POST /v1/quotes/verify';
  let fired: string[] = [];
  let notes: string[] = [];

  try {
    const meta = await deps.ports.caseRegistry.getCase(input.caseId);
    const sg = enforceSingaporeOnly(meta);
    fired = fired.concat(sg.fired);
    notes = notes.concat(sg.notes);

    const raw = await deps.ports.verification.verifyQuote({
      caseId: input.caseId,
      quote: input.quote,
      ...(input.paraHint ? { paraHint: input.paraHint } : {}),
    });

    const exact = enforceExactQuote(raw);
    fired = fired.concat(exact.fired);
    notes = notes.concat(exact.notes);

    const evidence = exact.value.matches.slice(0, 3).map(m => ({ caseId: input.caseId, paraId: m.paraId, text: m.text }));

    const finishedAt = new Date().toISOString();
    const packet = buildAdvisorPacket({
      requestId: input.requestId,
      route,
      startedAt,
      finishedAt,
      input,
      output: exact.value,
      evidence,
      policy: { fired, notes },
    });
    await deps.packetStore.save(packet);
    return { response: exact.value, packetId: packet.packetId, evidence };
  } catch (err) {
    const finishedAt = new Date().toISOString();
    const packet = buildAdvisorPacket({
      requestId: input.requestId,
      route,
      startedAt,
      finishedAt,
      input,
      output: { status: 'error' },
      evidence: [],
      policy: { fired, notes },
      error: { message: err instanceof Error ? err.message : 'Unknown error' },
    });
    await deps.packetStore.save(packet);
    return { response: { status: 'error', matches: [], matchScore: 0, notes: ['Internal error'] }, packetId: packet.packetId, evidence: [] };
  }
}

export async function verifyPropositionWorkflow(
  deps: WorkflowDeps,
  input: { requestId: string; proposition: string; evidence: Array<{ caseId: string; paraId: string; text: string }> }
): Promise<{ response: unknown; packetId: string }> {
  const startedAt = new Date().toISOString();
  const route = 'POST /v1/propositions/verify';
  let fired: string[] = [];
  let notes: string[] = [];

  try {
    for (const e of input.evidence) {
      const meta = await deps.ports.caseRegistry.getCase(e.caseId);
      const sg = enforceSingaporeOnly(meta);
      fired = fired.concat(sg.fired);
      notes = notes.concat(sg.notes);
    }

    const raw = await deps.ports.verification.verifyProposition({
      proposition: input.proposition,
      evidence: input.evidence,
    });
    const grounded = enforceGroundingOk(raw);
    fired = fired.concat(grounded.fired);
    notes = notes.concat(grounded.notes);

    const finishedAt = new Date().toISOString();
    const packet = buildAdvisorPacket({
      requestId: input.requestId,
      route,
      startedAt,
      finishedAt,
      input,
      output: grounded.value,
      evidence: input.evidence,
      policy: { fired, notes },
    });
    await deps.packetStore.save(packet);
    return { response: grounded.value, packetId: packet.packetId };
  } catch (err) {
    const finishedAt = new Date().toISOString();
    const packet = buildAdvisorPacket({
      requestId: input.requestId,
      route,
      startedAt,
      finishedAt,
      input,
      output: { verdict: 'unknown', groundingOk: false },
      evidence: input.evidence,
      policy: { fired, notes },
      error: { message: err instanceof Error ? err.message : 'Unknown error' },
    });
    await deps.packetStore.save(packet);
    return {
      response: { verdict: 'unknown', supportSpans: [], counterSpans: [], confidence: 0, groundingOk: false },
      packetId: packet.packetId,
    };
  }
}

