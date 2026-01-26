import { createApiHandler } from '../../../src/backend/api/http/handler.js';
import { Router } from '../../../src/backend/api/http/router.js';

describe('api server', () => {
  test('returns 404 JSON with request ID echo', async () => {
    const router = new Router();
    const handle = createApiHandler({ router, logger: { log: () => {} } });
    const res = await handle({
      method: 'GET',
      url: '/nope',
      headers: { 'x-request-id': 'req-test-1' },
      bodyText: '',
    });
    expect(res.statusCode).toBe(404);
    expect(res.headers['x-request-id']).toBe('req-test-1');
    expect(res.body).toEqual({ error: 'Not found' });
  });

  test('rejects invalid JSON bodies', async () => {
    const router = new Router();
    router.add('POST', '/nope', async () => ({ statusCode: 200, body: { ok: true } }));
    const handle = createApiHandler({ router, logger: { log: () => {} } });
    const res = await handle({
      method: 'POST',
      url: '/nope',
      headers: { 'x-request-id': 'req-test-2', 'content-type': 'application/json' },
      bodyText: '{',
    });
    expect(res.statusCode).toBe(400);
    expect(res.body).toEqual({ error: 'Invalid JSON body' });
  });
});
