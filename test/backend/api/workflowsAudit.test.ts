import { InMemoryAdvisorPacketStore } from '../../../src/backend/audit/store.js';
import { buildAdvisorPacket } from '../../../src/backend/audit/buildAdvisorPacket.js';
import { enforceGroundingOk } from '../../../src/backend/workflows/policy.js';

describe('workflows audit + policy', () => {
  test('advisor packet IDs are deterministic by request+route+input', () => {
    const packet1 = buildAdvisorPacket({
      requestId: 'req-1',
      route: 'POST /v1/citations/resolve',
      startedAt: 't1',
      finishedAt: 't2',
      input: { rawCitation: '[2020] SGCA 1' },
      output: { status: 'resolved' },
      evidence: [{ caseId: 'C1', paraId: 'p1', text: 'hello' }],
      policy: { fired: [], notes: [] },
    });
    const packet2 = buildAdvisorPacket({
      requestId: 'req-1',
      route: 'POST /v1/citations/resolve',
      startedAt: 't3',
      finishedAt: 't4',
      input: { rawCitation: '[2020] SGCA 1' },
      output: { status: 'resolved' },
      evidence: [{ caseId: 'C1', paraId: 'p1', text: 'hello' }],
      policy: { fired: [], notes: [] },
    });
    expect(packet1.packetId).toBe(packet2.packetId);
    expect(packet1.evidence[0]?.textHash).toBe(packet2.evidence[0]?.textHash);
  });

  test('in-memory packet store persists packets', async () => {
    const store = new InMemoryAdvisorPacketStore();
    const packet = buildAdvisorPacket({
      requestId: 'req-2',
      route: 'POST /v1/quotes/verify',
      startedAt: 't1',
      finishedAt: 't2',
      input: { caseId: 'C1', quote: 'q' },
      output: { status: 'exact' },
      evidence: [],
      policy: { fired: [], notes: [] },
    });
    await store.save(packet);
    const loaded = await store.get(packet.packetId);
    expect(loaded?.packetId).toBe(packet.packetId);
  });

  test('policy forces needs_context when grounding fails', () => {
    const res = enforceGroundingOk({
      verdict: 'supported',
      groundingOk: false,
    });
    expect(res.value.verdict).toBe('needs_context');
    expect(res.fired).toContain('proposition.grounding_failed');
  });
});

