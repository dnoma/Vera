import { createServer } from 'http';
import type { IncomingMessage, ServerResponse } from 'http';
import type { Logger } from './logger.js';
import { createConsoleJsonLogger } from './logger.js';
import { Router } from './router.js';
import { createApiHandler } from './handler.js';

export type ApiServerOptions = {
  router?: Router;
  logger?: Logger;
  maxBodyBytes?: number;
};

function readBodyText(req: IncomingMessage, maxBodyBytes: number): Promise<string> {
  return new Promise((resolve, reject) => {
    let bytes = 0;
    const chunks: Buffer[] = [];

    req.on('data', (chunk: Buffer) => {
      bytes += chunk.length;
      if (bytes > maxBodyBytes) {
        reject(new Error('Request body too large'));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });

    req.on('end', () => {
      if (chunks.length === 0) {
        resolve('');
        return;
      }
      const raw = Buffer.concat(chunks).toString('utf-8');
      resolve(raw);
    });

    req.on('error', (err: unknown) => reject(err));
  });
}

export function createApiServer(options?: ApiServerOptions) {
  const router = options?.router ?? new Router();
  const logger = options?.logger ?? createConsoleJsonLogger();
  const maxBodyBytes = options?.maxBodyBytes ?? 1_000_000;
  const handle = createApiHandler({ router, logger });

  const server = createServer(async (req: IncomingMessage, res: ServerResponse) => {
    try {
      const bodyText = req.method === 'POST' ? await readBodyText(req, maxBodyBytes) : '';
      const result = await handle({
        method: req.method,
        url: req.url,
        headers: req.headers,
        bodyText,
      });
      res.statusCode = result.statusCode;
      for (const [k, v] of Object.entries(result.headers)) {
        res.setHeader(k, v);
      }
      res.end(JSON.stringify(result.body));
    } catch {
      res.statusCode = 413;
      res.setHeader('content-type', 'application/json; charset=utf-8');
      res.end(JSON.stringify({ error: 'Request body too large' }));
    }
  });

  return { server, router };
}
