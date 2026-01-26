import type { IncomingHttpHeaders } from 'http';

export type HttpMethod = 'GET' | 'POST';

export type RequestContext = {
  requestId: string;
  method: HttpMethod;
  path: string;
  headers: IncomingHttpHeaders;
};

export type RouteHandler<TBody = unknown> = (args: {
  ctx: RequestContext;
  params: Record<string, string>;
  body: TBody;
}) => Promise<{ statusCode: number; body: unknown }>;

type Route = {
  method: HttpMethod;
  pattern: string;
  regex: RegExp;
  paramNames: readonly string[];
  handler: RouteHandler;
};

function compilePattern(pattern: string): { regex: RegExp; paramNames: string[] } {
  const parts = pattern.split('/').filter(Boolean);
  const paramNames: string[] = [];
  const regexParts = parts.map(part => {
    if (part.startsWith(':')) {
      paramNames.push(part.slice(1));
      return '([^/]+)';
    }
    return part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  });
  const regex = new RegExp(`^/${regexParts.join('/')}/?$`);
  return { regex, paramNames };
}

export class Router {
  private readonly routes: Route[] = [];

  add(method: HttpMethod, pattern: string, handler: RouteHandler): void {
    const { regex, paramNames } = compilePattern(pattern);
    this.routes.push({ method, pattern, regex, paramNames, handler });
  }

  match(method: HttpMethod, path: string): { handler: RouteHandler; params: Record<string, string> } | null {
    for (const route of this.routes) {
      if (route.method !== method) continue;
      const m = route.regex.exec(path);
      if (!m) continue;

      const params: Record<string, string> = {};
      for (let i = 0; i < route.paramNames.length; i++) {
        const name = route.paramNames[i]!;
        params[name] = decodeURIComponent(m[i + 1] ?? '');
      }
      return { handler: route.handler, params };
    }
    return null;
  }
}

