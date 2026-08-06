import type { NextApiRequest, NextApiResponse } from 'next';
import {
  clearSessionCookie,
  clearTwoFactorChallengeCookie,
  serverApi,
  sessionTokenFromRequest,
  setSessionCookie,
  setTwoFactorChallengeCookie,
  twoFactorChallengeFromRequest,
  userAgentHeadersFromRequest
} from '../../../lib/server-api';
import { issueCsrfToken, validateCsrfRequest } from '../../../lib/csrf-server';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const action = String(req.query.action || '');
  return handleAuthAction(req, res, action);
}

export async function handleAuthAction(req: NextApiRequest, res: NextApiResponse, action: string) {
  if (!isSameOrigin(req)) return res.status(403).json({ error: 'cross-site request rejected' });
  if (action === 'csrf' && req.method === 'GET') {
    return res.status(200).json({ csrfToken: issueCsrfToken(res) });
  }
  if (!validateCsrfRequest(req)) return res.status(403).json({ error: 'csrf token validation failed' });

  try {
    if ((action === 'login' || action === 'register') && req.method === 'POST') {
      const data = await serverApi(`/auth/${action}`, '', {
        method: 'POST',
        headers: userAgentHeadersFromRequest(req),
        body: JSON.stringify(req.body || {})
      });
      if (data?.requiresTwoFactor && data?.challengeToken) {
        setTwoFactorChallengeCookie(res, data.challengeToken);
        return res.status(200).json({ requiresTwoFactor: true });
      }
      if (data?.requiresEmailVerification) {
        return res.status(200).json({
          requiresEmailVerification: true,
          message: 'Check your inbox and verify your email before signing in.'
        });
      }
      if (!data?.token) return res.status(502).json({ error: 'auth token missing from master API response' });

      setSessionCookie(res, data.token);
      return res.status(200).json({ user: data.user });
    }

    if (action === 'forgot-password' && req.method === 'POST') {
      const data = await serverApi('/auth/password-reset/request', '', {
        method: 'POST',
        body: JSON.stringify({ email: req.body?.email })
      });
      return res.status(200).json(data);
    }

    if (action === 'reset-password' && req.method === 'POST') {
      const data = await serverApi('/auth/password-reset/confirm', '', {
        method: 'POST',
        body: JSON.stringify({ token: req.body?.token, password: req.body?.password })
      });
      return res.status(200).json(data);
    }

    if (action === 'verify-email' && req.method === 'POST') {
      const data = await serverApi('/auth/email-verification/confirm', '', {
        method: 'POST',
        body: JSON.stringify({ token: req.body?.token })
      });
      return res.status(200).json(data);
    }

    if (action === '2fa-login' && req.method === 'POST') {
      const challengeToken = twoFactorChallengeFromRequest(req);
      if (!challengeToken) return res.status(401).json({ error: 'two-factor challenge expired' });
      const data = await serverApi('/auth/2fa/login', '', {
        method: 'POST',
        headers: userAgentHeadersFromRequest(req),
        body: JSON.stringify({ challengeToken, code: req.body?.code })
      });
      if (!data?.token) return res.status(401).json({ error: 'two-factor verification failed' });
      setSessionCookie(res, data.token);
      clearTwoFactorChallengeCookie(res);
      return res.status(200).json({ user: data.user });
    }

    if (action === 'session' && req.method === 'GET') {
      const token = sessionTokenFromRequest(req);
      if (!token) return res.status(401).json({ error: 'not signed in' });
      const user = await serverApi('/auth/me', token);
      return res.status(200).json({ user });
    }

    if (action === 'logout-all' && req.method === 'POST') {
      const token = sessionTokenFromRequest(req);
      if (!token) return res.status(401).json({ error: 'not signed in' });
      const data = await serverApi('/auth/sessions/revoke-all', token, { method: 'POST' });
      clearSessionCookie(res);
      clearTwoFactorChallengeCookie(res);
      return res.status(200).json(data);
    }

    if (action === 'logout' && req.method === 'POST') {
      clearSessionCookie(res);
      clearTwoFactorChallengeCookie(res);
      return res.status(200).json({ ok: true });
    }

    return res.status(404).json({ error: 'auth route not found' });
  } catch (error: any) {
    const status = action === 'session' ? 401 : 400;
    return res.status(status).json({ error: error?.message || 'auth request failed' });
  }
}

function isSameOrigin(req: NextApiRequest) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method || '')) return true;
  if (String(req.headers['sec-fetch-site'] || '') === 'cross-site') return false;
  const origin = String(req.headers.origin || '');
  if (!origin) return true;
  const host = String(req.headers['x-forwarded-host'] || req.headers.host || '').split(',')[0].trim();
  try { return new URL(origin).host === host; } catch { return false; }
}
