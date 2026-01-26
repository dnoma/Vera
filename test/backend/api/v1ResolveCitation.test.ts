import { createApiHandler } from '../../../src/backend/api/http/handler.js';
import { InMemoryAdvisorPacketStore } from '../../../src/backend/audit/store.js';
import { InMemoryReviewStore } from '../../../src/backend/workflows/reviews.js';
import { createV1Router } from '../../../src/backend/api/v1/router.js';
import { MockCaseRegistryPort, MockJudgmentTextPort, MockVerificationPort } from '../../../src/backend/workflows/mockPorts.js';
import { hash } from '../../../src/integrity/hash.js';

describe('v1 API (smoke)', () => {
  test('POST /v1/citations/resolve returns schema-valid response and saves advisor packet', async () => {
    const caseRegistry = new MockCaseRegistryPort();
    const judgmentText = new MockJudgmentTextPort();
    const verification = new MockVerificationPort(judgmentText);
    const packetStore = new InMemoryAdvisorPacketStore();
    const reviewStore = new InMemoryReviewStore();

    const router = createV1Router({ ports: { caseRegistry, judgmentText, verification }, packetStore, reviewStore });
    const handle = createApiHandler({ router, logger: { log: () => {} }, requestIdGenerator: () => 'req-1' });

    const res = await handle({
      method: 'POST',
      url: '/v1/citations/resolve',
      headers: {},
      bodyText: JSON.stringify({ rawCitation: 'SGCA-1' }),
    });

    expect(res.statusCode).toBe(200);
    expect((res.body as { status: string }).status).toBe('resolved');

    const expectedPacketId = hash({
      requestId: 'req-1',
      route: 'POST /v1/citations/resolve',
      input: { requestId: 'req-1', rawCitation: 'SGCA-1' },
    });
    const packet = await packetStore.get(expectedPacketId);
    expect(packet?.requestId).toBe('req-1');
  });
});
