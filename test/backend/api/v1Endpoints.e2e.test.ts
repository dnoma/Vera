import { createApiHandler } from '../../../src/backend/api/http/handler.js';
import { createV1Router } from '../../../src/backend/api/v1/router.js';
import { InMemoryAdvisorPacketStore } from '../../../src/backend/audit/store.js';
import { InMemoryReviewStore } from '../../../src/backend/workflows/reviews.js';
import {
  MockCaseRegistryPort,
  MockJudgmentTextPort,
  MockVerificationPort,
} from '../../../src/backend/workflows/mockPorts.js';
import { hash } from '../../../src/integrity/hash.js';

function makeHandler() {
  const caseRegistry = new MockCaseRegistryPort();
  const judgmentText = new MockJudgmentTextPort();
  const verification = new MockVerificationPort(judgmentText);
  const packetStore = new InMemoryAdvisorPacketStore();
  const reviewStore = new InMemoryReviewStore();

  const router = createV1Router({
    ports: { caseRegistry, judgmentText, verification },
    packetStore,
    reviewStore,
  });
  const handle = createApiHandler({ router, logger: { log: () => {} } });

  return { handle, packetStore };
}

describe('v1 endpoints (e2e, handler-level)', () => {
  test('citations/resolve: schema validation failure returns 400 with details', async () => {
    const { handle } = makeHandler();
    const res = await handle({
      method: 'POST',
      url: '/v1/citations/resolve',
      headers: { 'x-request-id': 'req-cite-400' },
      bodyText: JSON.stringify({}),
    });
    expect(res.statusCode).toBe(400);
    expect(res.body).toMatchObject({ error: 'Schema validation failed' });
  });

  test('citations/resolve: non-SG resolved case is downgraded to ambiguous by policy', async () => {
    const { handle, packetStore } = makeHandler();
    const res = await handle({
      method: 'POST',
      url: '/v1/citations/resolve',
      headers: { 'x-request-id': 'req-cite-uk' },
      bodyText: JSON.stringify({ rawCitation: 'UK' }),
    });
    expect(res.statusCode).toBe(200);
    expect(res.body).toMatchObject({ status: 'ambiguous' });

    const packetId = hash({
      requestId: 'req-cite-uk',
      route: 'POST /v1/citations/resolve',
      input: { requestId: 'req-cite-uk', rawCitation: 'UK' },
    });
    const packet = await packetStore.get(packetId);
    expect(packet?.policy.fired).toContain('case.non_sg');
  });

  test('quotes/verify: exact match returns exact and writes packet', async () => {
    const { handle, packetStore } = makeHandler();
    const res = await handle({
      method: 'POST',
      url: '/v1/quotes/verify',
      headers: { 'x-request-id': 'req-quote-1' },
      bodyText: JSON.stringify({ caseId: 'SG-CASE-1', quote: 'appeal is dismissed' }),
    });
    expect(res.statusCode).toBe(200);
    expect(res.body).toMatchObject({ status: 'exact' });

    const packetId = hash({
      requestId: 'req-quote-1',
      route: 'POST /v1/quotes/verify',
      input: {
        requestId: 'req-quote-1',
        caseId: 'SG-CASE-1',
        quote: 'appeal is dismissed',
      },
    });
    const packet = await packetStore.get(packetId);
    expect(packet?.route).toBe('POST /v1/quotes/verify');
    expect(packet?.evidence.length).toBeGreaterThan(0);
  });

  test('propositions/verify: empty evidence forces needs_context via schema+policy', async () => {
    const { handle, packetStore } = makeHandler();
    const res = await handle({
      method: 'POST',
      url: '/v1/propositions/verify',
      headers: { 'x-request-id': 'req-prop-1' },
      bodyText: JSON.stringify({ proposition: 'duty', evidence: [] }),
    });
    expect(res.statusCode).toBe(200);
    expect(res.body).toMatchObject({ verdict: 'needs_context', groundingOk: false });

    const packetId = hash({
      requestId: 'req-prop-1',
      route: 'POST /v1/propositions/verify',
      input: { requestId: 'req-prop-1', proposition: 'duty', evidence: [] },
    });
    const packet = await packetStore.get(packetId);
    expect(packet?.policy.fired).toContain('proposition.grounding_failed');
  });

  test('reviews: submit then get', async () => {
    const { handle, packetStore } = makeHandler();
    const submit = await handle({
      method: 'POST',
      url: '/v1/reviews/submit',
      headers: { 'x-request-id': 'req-review-1' },
      bodyText: JSON.stringify({ packetId: 'pkt-1', decision: 'approved', notes: 'ok' }),
    });
    expect(submit.statusCode).toBe(200);
    const reviewId = (submit.body as { reviewId: string }).reviewId;

    const get = await handle({
      method: 'GET',
      url: `/v1/reviews/${encodeURIComponent(reviewId)}`,
      headers: { 'x-request-id': 'req-review-2' },
      bodyText: '',
    });
    expect(get.statusCode).toBe(200);
    expect(get.body).toMatchObject({ reviewId, packetId: 'pkt-1', state: 'approved' });

    const submitPacketId = hash({
      requestId: 'req-review-1',
      route: 'POST /v1/reviews/submit',
      input: { packetId: 'pkt-1', decision: 'approved', notes: 'ok' },
    });
    expect(await packetStore.get(submitPacketId)).not.toBeNull();
  });

  test('reviews: get missing returns 404 and still writes an advisor packet', async () => {
    const { handle, packetStore } = makeHandler();
    const res = await handle({
      method: 'GET',
      url: '/v1/reviews/missing',
      headers: { 'x-request-id': 'req-review-missing' },
      bodyText: '',
    });
    expect(res.statusCode).toBe(404);

    const packetId = hash({
      requestId: 'req-review-missing',
      route: 'GET /v1/reviews/:id',
      input: { reviewId: 'missing' },
    });
    expect(await packetStore.get(packetId)).not.toBeNull();
  });
});

