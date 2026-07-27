import * as crypto from 'crypto';
import type { NextApiRequest, NextApiResponse } from 'next';

const CSRF_COOKIE = 'agapornis_csrf';
const CSRF_HEADER = 'x-csrf-token';
const CSRF_MAX_AGE_SECONDS = 60 * 60 * 8;
const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

export function issueCsrfToken(res: NextApiResponse) {
  const token = crypto.randomBytes(32).toString('base64url');
  const signed = `${token}.${signature(token)}`;
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  appendCookie(res, `${CSRF_COOKIE}=${encodeURIComponent(signed)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${CSRF_MAX_AGE_SECONDS}${secure}`);
  return token;
}

export function validateCsrfRequest(req: NextApiRequest) {
  const method = String(req.method || 'GET').toUpperCase();
  if (SAFE_METHODS.has(method)) return true;

  const token = firstHeader(req.headers[CSRF_HEADER]);
  const cookie = cookieValue(req.headers.cookie, CSRF_COOKIE);
  if (!token || !cookie) return false;

  const [cookieToken, cookieSignature] = cookie.split('.');
  if (!cookieToken || !cookieSignature || cookieToken !== token) return false;
  return timingSafeEqual(cookieSignature, signature(cookieToken));
}

function signature(token: string) {
  return crypto
    .createHmac('sha3-512', csrfSecret())
    .update(token)
    .digest('base64url');
}

function csrfSecret() {
  const configured = process.env.CSRF_SECRET || process.env.JWT_SECRET || process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET;
  if (configured) return configured;
  if (process.env.NODE_ENV === 'production') throw new Error('CSRF_SECRET is required in production');
  return 'agapornis-development-csrf-secret';
}

function timingSafeEqual(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return leftBuffer.length === rightBuffer.length && crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

function cookieValue(cookieHeader: string | undefined, name: string) {
  if (!cookieHeader) return '';
  for (const cookie of String(cookieHeader).split(';')) {
    const [rawKey, ...rawValue] = cookie.trim().split('=');
    if (rawKey === name) return decodeURIComponent(rawValue.join('='));
  }
  return '';
}

function firstHeader(value: unknown) {
  return Array.isArray(value) ? String(value[0] || '') : String(value || '');
}

function appendCookie(res: NextApiResponse, cookie: string) {
  const current = res.getHeader('Set-Cookie');
  const cookies = Array.isArray(current) ? current.map(String) : current ? [String(current)] : [];
  res.setHeader('Set-Cookie', [...cookies, cookie]);
}
