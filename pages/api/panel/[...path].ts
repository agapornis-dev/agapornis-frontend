import type { NextApiRequest, NextApiResponse } from 'next';
import { Readable } from 'stream';
import { pipeline } from 'stream/promises';
import { apiBaseUrl, sessionTokenFromRequest } from '../../../lib/server-api';
import { validateCsrfRequest } from '../../../lib/csrf-server';
import packageJson from '../../../package.json';

const FRONTEND_VERSION = String(process.env.AGAPORNIS_FRONTEND_VERSION || packageJson.version || 'unknown');

export const config = {
  api: {
    bodyParser: false
  }
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!isSameOrigin(req)) return res.status(403).json({ error: 'cross-site request rejected' });
  if (!validateCsrfRequest(req)) return res.status(403).json({ error: 'csrf token validation failed' });
  const token = sessionTokenFromRequest(req);
  if (!token) return res.status(401).json({ error: 'not signed in' });

  const incoming = new URL(req.url || '/', 'http://localhost');
  const path = incoming.pathname.replace(/^\/api\/panel\/?/, '');
  const target = new URL(`${apiBaseUrl()}/${path}`);
  const upstream = new AbortController();
  const abortUpstream = () => {
    if (!upstream.signal.aborted && !res.writableEnded) upstream.abort();
  };
  req.once('aborted', abortUpstream);
  res.once('close', abortUpstream);

  for (const [key, value] of incoming.searchParams.entries()) {
    target.searchParams.append(key, value);
  }

  const fileTargetPath = incoming.searchParams.get('targetPath') || incoming.searchParams.get('path');
  if (fileTargetPath) {
    if (!target.searchParams.has('targetPath')) target.searchParams.set('targetPath', fileTargetPath);
    if (!target.searchParams.has('path')) target.searchParams.set('path', fileTargetPath);
  }

  try {
    const binaryUpload = req.headers['content-type']?.startsWith('application/octet-stream');
    const body = ['GET', 'HEAD'].includes(req.method || '')
      ? undefined
      : binaryUpload
        ? uploadStream(req)
        : await rawBody(req).then(raw => raw.length === 0 ? Buffer.from('{}') : raw);
    const response = await fetch(target, {
      method: req.method,
      headers: proxyHeaders(req, token),
      body: body as any,
      ...(binaryUpload ? { duplex: 'half' } : {}),
      cache: 'no-store',
      signal: upstream.signal
    } as any);

    res.status(response.status);
    copyHeaders(response, res);
    if (response.headers.get('content-type')?.includes('text/event-stream')) {
      // Next.js must pass SSE bytes through as they arrive. Explicit identity
      // encoding prevents its compression layer from waiting for a larger
      // buffer before releasing the first console frame.
      res.setHeader('Content-Encoding', 'identity');
      res.setHeader('Cache-Control', 'no-cache, no-transform');
      res.setHeader('X-Accel-Buffering', 'no');
      res.socket?.setNoDelay(true);
      res.flushHeaders();
    }

    if (!response.body) return res.end();
    await pipeline(Readable.fromWeb(response.body as any), res);
  } catch (error: any) {
    if (isExpectedDisconnect(error, upstream, res)) return;
    console.error('Panel proxy request failed', error);
    if (!res.headersSent) {
      res.status(error?.statusCode || 502).json({ error: error?.statusCode === 413 ? 'request body too large' : 'panel proxy failed' });
    } else {
      res.end();
    }
  } finally {
    req.off('aborted', abortUpstream);
    res.off('close', abortUpstream);
  }
}

function uploadStream(req: NextApiRequest) {
  const maximum = Number(process.env.AGAPORNIS_MAX_FILE_UPLOAD_BYTES || 2 * 1024 * 1024 * 1024);
  const declared = Number(req.headers['content-length'] || 0);
  if (declared > maximum) {
    const error: any = new Error('request body too large');
    error.statusCode = 413;
    throw error;
  }
  return req;
}

function isExpectedDisconnect(error: any, upstream: AbortController, res: NextApiResponse) {
  if (!upstream.signal.aborted && !res.destroyed) return false;
  return error?.name === 'AbortError' || error?.code === 'ABORT_ERR' || error?.code === 'ERR_STREAM_PREMATURE_CLOSE';
}

function proxyHeaders(req: NextApiRequest, token: string) {
  const headers: Record<string, string> = {
    authorization: `Bearer ${token}`,
    'x-agapornis-frontend-version': FRONTEND_VERSION,
  };

  const contentType = req.headers['content-type'];
  if (contentType) headers['content-type'] = Array.isArray(contentType) ? contentType[0] : contentType;
  else if (!['GET', 'HEAD'].includes(req.method || '')) headers['content-type'] = 'application/json';

  const accept = req.headers.accept;
  if (accept) headers.accept = Array.isArray(accept) ? accept[0] : accept;

  return headers;
}

function copyHeaders(response: Response, res: NextApiResponse) {
  const allowed = new Set([
    'cache-control',
    'content-disposition',
    'content-security-policy',
    'content-type',
    'permissions-policy',
    'referrer-policy',
    'x-accel-buffering',
    'x-content-type-options',
    'x-frame-options'
  ]);
  for (const [key, value] of response.headers.entries()) {
    if (!allowed.has(key.toLowerCase())) continue;
    res.setHeader(key, value);
  }
}

function rawBody(req: NextApiRequest) {
  return new Promise<Buffer>((resolve, reject) => {
    const chunks: Buffer[] = [];
    const maxBytes = Number(process.env.PANEL_PROXY_MAX_BODY_BYTES || 128 * 1024 * 1024);
    let size = 0;
    let rejected = false;
    req.on('data', chunk => {
      if (rejected) return;
      const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
      size += buffer.length;
      if (size > maxBytes) {
        const error: any = new Error('request body too large');
        error.statusCode = 413;
        rejected = true;
        reject(error);
        return;
      }
      chunks.push(buffer);
    });
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

function isSameOrigin(req: NextApiRequest) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method || '')) return true;
  const fetchSite = String(req.headers['sec-fetch-site'] || '');
  if (fetchSite === 'cross-site') return false;
  const origin = String(req.headers.origin || '');
  if (!origin) return true;
  const forwardedHost = String(req.headers['x-forwarded-host'] || '').split(',')[0].trim();
  const host = forwardedHost || req.headers.host;
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}
