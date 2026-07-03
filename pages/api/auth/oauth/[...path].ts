import type { NextApiRequest, NextApiResponse } from 'next';
import * as crypto from 'crypto';
import { cookieValue, serverApi, setSessionCookie, setTwoFactorChallengeCookie } from '../../../../lib/server-api';

const FLOW_COOKIE = 'agapornis_oauth_flow';
const FLOW_MAX_AGE_SECONDS = 10 * 60;

type Provider = 'google' | 'discord';

type OAuthFlow = {
  provider: Provider;
  state: string;
  verifier: string;
  redirectUri: string;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const action = Array.isArray(req.query.path) ? req.query.path[0] : req.query.path;

  try {
    if (req.method !== 'GET') return res.status(405).json({ error: 'method not allowed' });
    if (action === 'start') return start(req, res);
    if (action === 'callback') return callback(req, res);
    return res.status(404).json({ error: 'OAuth route not found' });
  } catch (error: any) {
    clearFlowCookie(res);
    return res.redirect(`/?authError=${encodeURIComponent(error?.message || 'Social login failed')}`);
  }
}

async function start(req: NextApiRequest, res: NextApiResponse) {
  const provider = providerValue(req.query.provider);
  const state = crypto.randomBytes(32).toString('base64url');
  const verifier = crypto.randomBytes(48).toString('base64url');
  const codeChallenge = crypto.createHash('sha256').update(verifier).digest('base64url');
  const redirectUri = `${requestOrigin(req)}/api/auth/oauth/callback`;
  const flow: OAuthFlow = { provider, state, verifier, redirectUri };

  const query = new URLSearchParams({ redirectUri, state, codeChallenge });
  const data = await serverApi(`/auth/social/${provider}/authorize?${query}`, '');
  if (!data?.url) throw new Error('OAuth authorization URL is missing');

  setFlowCookie(res, flow);
  return res.redirect(data.url);
}

async function callback(req: NextApiRequest, res: NextApiResponse) {
  if (req.query.error) throw new Error(String(req.query.error_description || req.query.error));
  const flow = readFlow(req);
  if (!flow || !req.query.state || !constantTimeEqual(flow.state, String(req.query.state))) {
    throw new Error('OAuth state validation failed');
  }

  const data = await serverApi(`/auth/social/${flow.provider}/exchange`, '', {
    method: 'POST',
    body: JSON.stringify({
      code: String(req.query.code || ''),
      redirectUri: flow.redirectUri,
      codeVerifier: flow.verifier
    })
  });
  if (data?.requiresTwoFactor && data?.challengeToken) {
    setTwoFactorChallengeCookie(res, data.challengeToken);
    clearFlowCookie(res, true);
    return res.redirect('/?twoFactor=1');
  }
  if (!data?.token) throw new Error('OAuth session token is missing');

  setSessionCookie(res, data.token);
  clearFlowCookie(res, true);
  return res.redirect('/');
}

function providerValue(value: unknown): Provider {
  if (value === 'google' || value === 'discord') return value;
  throw new Error('unsupported OAuth provider');
}

function requestOrigin(req: NextApiRequest) {
  const forwardedProto = headerValue(req.headers['x-forwarded-proto']);
  const protocol = forwardedProto || (process.env.NODE_ENV === 'production' ? 'https' : 'http');
  const host = headerValue(req.headers['x-forwarded-host']) || req.headers.host;
  if (!host) throw new Error('request host is missing');
  return `${protocol}://${host}`;
}

function headerValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : String(value || '').split(',')[0].trim();
}

function setFlowCookie(res: NextApiResponse, flow: OAuthFlow) {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  const value = Buffer.from(JSON.stringify(flow), 'utf8').toString('base64url');
  res.setHeader('Set-Cookie', `${FLOW_COOKIE}=${value}; Path=/api/auth/oauth; HttpOnly; SameSite=Lax; Max-Age=${FLOW_MAX_AGE_SECONDS}${secure}`);
}

function clearFlowCookie(res: NextApiResponse, append = false) {
  const cookie = `${FLOW_COOKIE}=; Path=/api/auth/oauth; HttpOnly; SameSite=Lax; Max-Age=0`;
  if (!append) {
    res.setHeader('Set-Cookie', cookie);
    return;
  }

  const current = res.getHeader('Set-Cookie');
  const cookies = Array.isArray(current) ? current.map(String) : current ? [String(current)] : [];
  res.setHeader('Set-Cookie', [...cookies, cookie]);
}

function readFlow(req: NextApiRequest): OAuthFlow | null {
  try {
    const encoded = cookieValue(req.headers.cookie, FLOW_COOKIE);
    return encoded ? JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8')) : null;
  } catch {
    return null;
  }
}

function constantTimeEqual(left: string, right: string) {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
