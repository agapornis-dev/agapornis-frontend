export type HeadersMap = Record<string, string>;

export async function readResponse(res: Response) {
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) {
    throw new Error(data?.message || data?.error || data?.errorMessage || res.statusText);
  }

  return data;
}

export async function requestJson(apiBase: string, path: string, authHeaders: HeadersMap, opts: RequestInit = {}) {
  const method = String(opts.method || 'GET').toUpperCase();
  const body = !['GET', 'HEAD'].includes(method) && opts.body == null ? JSON.stringify({}) : opts.body;
  const headers = {
    'content-type': 'application/json',
    ...authHeaders,
    ...(opts.headers || {})
  };

  return readResponse(await fetch(`${apiBase || '/api'}${path}`, { ...opts, method, body, headers }));
}

export function agentServerPath(server: { nodeId: string; id: string }, suffix = '') {
  return `/agents/${encodeURIComponent(server.nodeId)}/servers/${encodeURIComponent(server.id)}${suffix}`;
}

export function withPathQuery(path: string, targetPath: string) {
  return `${path}?targetPath=${encodeURIComponent(targetPath)}`;
}
