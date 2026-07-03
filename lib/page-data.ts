import type { IncomingMessage } from 'http';
import type { PanelPublicSettings, Session } from './types';
import { serverApi, sessionTokenFromRequest } from './server-api';

const fallbackSettings: PanelPublicSettings = {
  branding: {
    name: 'Agapornis',
    panelName: 'Control Panel',
    publicUrl: '',
    tagline: 'A quiet workspace',
    footerTagline: 'High-performance infrastructure tailored for game server management.'
  },
  registration: { enabled: true, inviteRequired: false },
  maintenance: { enabled: false, title: "We'll be right back.", message: 'Scheduled maintenance is in progress.', estimatedCompletion: '', statusPageUrl: '' },
  announcement: { enabled: false, title: '', message: '', tone: 'info', linkLabel: '', linkUrl: '' },
  support: { ticketsEnabled: true, notificationsEnabled: true },
  rateLimit: { enabled: true },
  captcha: { provider: 'none', siteKey: '', requireOnLogin: false, requireOnRegister: false, enabled: false },
  socialAuth: { google: { enabled: false }, discord: { enabled: false } },
  passwordReset: { enabled: false }
};

export async function loadSession(req: IncomingMessage): Promise<Session | null> {
  const token = sessionTokenFromRequest(req);
  if (!token) return null;

  try {
    return { user: await serverApi('/auth/me', token) };
  } catch {
    return null;
  }
}

export async function loadPublicSettings(): Promise<PanelPublicSettings> {
  try {
    const settings = await serverApi('/settings/public', '');
    return {
      ...settings,
      maintenance: settings.maintenance || fallbackSettings.maintenance,
      announcement: settings.announcement || fallbackSettings.announcement,
      support: settings.support || fallbackSettings.support,
      socialAuth: settings.socialAuth || fallbackSettings.socialAuth,
      passwordReset: settings.passwordReset || fallbackSettings.passwordReset
    };
  } catch {
    return fallbackSettings;
  }
}
