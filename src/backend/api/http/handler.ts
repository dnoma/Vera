import { randomUUID } from 'crypto';
import { ApiError } from './errors.js';
import type { Logger } from './logger.js';
import type { HttpMethod, RequestContext } from './router.js';
import type { Router } from './router.js';

export type HandlerInput = {
  method: string | undefined;
  url: string | undefined;
  headers: Record<string, string | string[] | undefined>;
  bodyText: string;
};

export type HandlerOutput = {
  statusCode: number;
  headers: Record<string, string>;
  body: unknown;
};

type ApiHandlerOptions = {
  router: Router;
  logger: Logger;
  requestIdGenerator?: () => string;
};

function isHttpMethod(method: string | undefined): method is HttpMethod {
  return method === 'GET' || method === 'POST';
}

export function createApiHandler(options: ApiHandlerOptions) {
  const requestIdGenerator = options.requestIdGenerator ?? randomUUID;

  return async function handle(input: HandlerInput): Promise<HandlerOutput> {
    const requestId = (input.headers['x-request-id'] as string | undefined) ?? requestIdGenerator();
    const headers = {
      'x-request-id': requestId,
      'content-type': 'application/json; charset=utf-8',
    };

    try {
      if (!isHttpMethod(input.method)) {
        throw new ApiError('Method not allowed', 405);
      }

      const url = new URL(input.url ?? '/', 'http://localhost');
      const path = url.pathname;

      const match = options.router.match(input.method, path);
      if (!match) {
        throw new ApiError('Not found', 404);
      }

      let body: unknown = null;
      if (input.method === 'POST') {
        if (input.bodyText.trim() === '') {
          body = null;
        } else {
          try {
            body = JSON.parse(input.bodyText);
          } catch {
            throw new ApiError('Invalid JSON body', 400);
          }
        }
      }

      const ctx: RequestContext = {
        requestId,
        method: input.method,
        path,
        headers: input.headers,
      };

      const result = await match.handler({ ctx, params: match.params, body });
      options.logger.log('info', 'request.complete', {
        requestId,
        method: input.method,
        path,
        statusCode: result.statusCode,
      });
      return { statusCode: result.statusCode, headers, body: result.body };
    } catch (err) {
      const apiErr = err instanceof ApiError ? err : new ApiError('Internal server error', 500);
      options.logger.log('error', 'request.error', {
        requestId,
        method: input.method,
        path: input.url ?? '/',
        statusCode: apiErr.statusCode,
        error: apiErr.message,
      });
      return {
        statusCode: apiErr.statusCode,
        headers,
        body: {
          error: apiErr.message,
          ...(apiErr.details ? { details: apiErr.details } : {}),
        },
      };
    }
  };
}

