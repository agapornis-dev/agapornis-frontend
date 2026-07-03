import type { IncomingMessage } from 'http';
import type { NextApiResponse } from 'next';

export const SESSION_COOKIE = 'agapornis_session';
export const TWO_FACTOR_COOKIE = 'agapornis_2fa_challenge';
const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 8;

export function apiBaseUrl() {
  return (process.env.AGAPORNIS_API_URL || 'http://localhost:3001/api').replace(/\/$/, '');
}

export function cookieValue(cookieHeader: string | undefined, name = SESSION_COOKIE) {
  if (!cookieHeader) return '';
  for (const cookie of String(cookieHeader).split(';')) {
    const [rawKey, ...rawValue] = cookie.trim().split('=');
    if (rawKey === name) return decodeURIComponent(rawValue.join('='));
  }

  return '';
}

export function sessionTokenFromRequest(req: IncomingMessage) {
  return cookieValue(req.headers.cookie);
}

export function setSessionCookie(res: NextApiResponse, token: string) {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  appendCookie(res, `${SESSION_COOKIE}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${COOKIE_MAX_AGE_SECONDS}${secure}`);
}

export function clearSessionCookie(res: NextApiResponse) {
  appendCookie(res, `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`);
}

export function twoFactorChallengeFromRequest(req: IncomingMessage) {
  return cookieValue(req.headers.cookie, TWO_FACTOR_COOKIE);
}

export function setTwoFactorChallengeCookie(res: NextApiResponse, token: string) {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  appendCookie(res, `${TWO_FACTOR_COOKIE}=${encodeURIComponent(token)}; Path=/api/auth; HttpOnly; SameSite=Strict; Max-Age=300${secure}`);
}

export function clearTwoFactorChallengeCookie(res: NextApiResponse) {
  appendCookie(res, `${TWO_FACTOR_COOKIE}=; Path=/api/auth; HttpOnly; SameSite=Strict; Max-Age=0`);
}

export function authHeaders(token: string) {
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function serverApi(path: string, token: string, init: RequestInit = {}) {
  const method = String(init.method || 'GET').toUpperCase();
  const body = !['GET', 'HEAD'].includes(method) && init.body == null ? JSON.stringify({}) : init.body;
  const headers = {
    'content-type': 'application/json',
    ...authHeaders(token),
    ...(init.headers || {})
  };

  const response = await fetch(`${apiBaseUrl()}${path}`, {
    ...init,
    method,
    body,
    headers,
    cache: 'no-store'
  });
  const text = await response.text();
  const data = text ? JSON.parse(text) : null;
  if (!response.ok) {
    throw new Error(data?.message || data?.error || data?.errorMessage || response.statusText);
  }

  return data;
}

function appendCookie(res: NextApiResponse, cookie: string) {
  const current = res.getHeader('Set-Cookie');
  const cookies = Array.isArray(current) ? current.map(String) : current ? [String(current)] : [];
  res.setHeader('Set-Cookie', [...cookies, cookie]);
}
