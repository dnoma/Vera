import { ApiError } from '../http/errors.js';
import { Router } from '../http/router.js';
import { validateAgainstSchema } from '../validation/schemaValidator.js';
import type { AdvisorPacketStore } from '../../audit/store.js';
import type { WorkflowPorts } from '../../workflows/ports.js';
import {
  resolveCitationWorkflow,
  verifyPropositionWorkflow,
  verifyQuoteWorkflow,
} from '../../workflows/workflows.js';
import type { ReviewStore } from '../../workflows/reviews.js';
import { createReviewId } from '../../workflows/reviews.js';
import { buildAdvisorPacket } from '../../audit/buildAdvisorPacket.js';

type Deps = {
  ports: WorkflowPorts;
  packetStore: AdvisorPacketStore;
  reviewStore: ReviewStore;
};

function assertValid(schema: string, payload: unknown): void {
  const result = validateAgainstSchema(schema, payload);
  if (!result.valid) {
    throw new ApiError('Schema validation failed', 400, { errors: result.errors });
  }
}

function assertOutput(schema: string, payload: unknown): void {
  const result = validateAgainstSchema(schema, payload);
  if (!result.valid) {
    throw new ApiError('Server output schema mismatch', 500, { errors: result.errors });
  }
}

export function createV1Router(deps: Deps): Router {
  const router = new Router();

  router.add('POST', '/v1/citations/resolve', async ({ ctx, body }) => {
    assertValid('citations-resolve.request.schema.json', body);
    const input = body as { rawCitation: string };
    const wf = await resolveCitationWorkflow(
      { ports: deps.ports, packetStore: deps.packetStore },
      { requestId: ctx.requestId, rawCitation: input.rawCitation }
    );
    assertOutput('citations-resolve.response.schema.json', wf.response);
    return { statusCode: 200, body: wf.response };
  });

  router.add('POST', '/v1/quotes/verify', async ({ ctx, body }) => {
    assertValid('quotes-verify.request.schema.json', body);
    const input = body as { caseId: string; quote: string; paraHint?: string };
    const wf = await verifyQuoteWorkflow(
      { ports: deps.ports, packetStore: deps.packetStore },
      { requestId: ctx.requestId, caseId: input.caseId, quote: input.quote, ...(input.paraHint ? { paraHint: input.paraHint } : {}) }
    );
    assertOutput('quotes-verify.response.schema.json', wf.response);
    return { statusCode: 200, body: wf.response };
  });

  router.add('POST', '/v1/propositions/verify', async ({ ctx, body }) => {
    assertValid('propositions-verify.request.schema.json', body);
    const input = body as {
      proposition: string;
      evidence: Array<{ caseId: string; paraId: string; text: string }>;
    };
    const wf = await verifyPropositionWorkflow(
      { ports: deps.ports, packetStore: deps.packetStore },
      { requestId: ctx.requestId, proposition: input.proposition, evidence: input.evidence }
    );
    assertOutput('propositions-verify.response.schema.json', wf.response);
    return { statusCode: 200, body: wf.response };
  });

  router.add('POST', '/v1/reviews/submit', async ({ ctx, body }) => {
    assertValid('reviews-submit.request.schema.json', body);
    const input = body as { packetId: string; decision: 'approved' | 'rejected' | 'needs_more_evidence'; notes?: string };
    const submittedAt = new Date().toISOString();
    const reviewId = createReviewId({ requestId: ctx.requestId, packetId: input.packetId, decision: input.decision });
    const review = {
      reviewId,
      state: input.decision,
      packetId: input.packetId,
      decision: input.decision,
      ...(input.notes ? { notes: input.notes } : {}),
      submittedAt,
    } as const;
    await deps.reviewStore.save(review);

    const response = review;
    assertOutput('reviews-submit.response.schema.json', response);

    const packet = buildAdvisorPacket({
      requestId: ctx.requestId,
      route: 'POST /v1/reviews/submit',
      startedAt: submittedAt,
      finishedAt: submittedAt,
      input,
      output: response,
      evidence: [],
      policy: { fired: [], notes: [] },
    });
    await deps.packetStore.save(packet);

    return { statusCode: 200, body: response };
  });

  router.add('GET', '/v1/reviews/:id', async ({ ctx, params }) => {
    const startedAt = new Date().toISOString();
    const review = await deps.reviewStore.get(params['id'] ?? '');
    if (!review) {
      const finishedAt = new Date().toISOString();
      const packet = buildAdvisorPacket({
        requestId: ctx.requestId,
        route: 'GET /v1/reviews/:id',
        startedAt,
        finishedAt,
        input: { reviewId: params['id'] ?? '' },
        output: { status: 404 },
        evidence: [],
        policy: { fired: [], notes: [] },
      });
      await deps.packetStore.save(packet);
      throw new ApiError('Not found', 404);
    }
    assertOutput('reviews-get.response.schema.json', review);
    const finishedAt = new Date().toISOString();
    const packet = buildAdvisorPacket({
      requestId: ctx.requestId,
      route: 'GET /v1/reviews/:id',
      startedAt,
      finishedAt,
      input: { reviewId: params['id'] ?? '' },
      output: review,
      evidence: [],
      policy: { fired: [], notes: [] },
    });
    await deps.packetStore.save(packet);

    return { statusCode: 200, body: review };
  });

  return router;
}
