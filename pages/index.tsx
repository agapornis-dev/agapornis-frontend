import { useState } from 'react';
import type { PanelPublicSettings, Session, UserScreen } from '../lib/types';
import { loadPublicSettings, loadSession } from '../lib/page-data';
import { readResponse } from '../lib/http';
import { AuthScreen } from '../components/auth/AuthScreen';
import { DashboardShell } from '../components/layout/DashboardShell';
import { useFeedback } from '../components/feedback/FeedbackProvider';
import { ProfileScreen } from '../components/screens/ProfileScreen';
import { ServersScreen } from '../components/screens/ServersScreen';
import { TicketsScreen } from '../components/screens/TicketsScreen';
import { MaintenancePage } from './maintenance';

const API_ROUTE = '/api/panel';

interface HomeProps {
  initialSession: Session | null;
  publicSettings: PanelPublicSettings;
  initialAuthError: string;
  initialTwoFactorRequired: boolean;
  initialServerId: string;
  initialScreen: UserScreen;
  initialMaintenanceLogin: boolean;
  initialTicketId: string;
  initialResetToken: string;
}

export default function Home({ 
  initialSession, 
  publicSettings, 
  initialAuthError, 
  initialTwoFactorRequired, 
  initialServerId,
  initialScreen,
  initialMaintenanceLogin,
  initialTicketId,
  initialResetToken
}: HomeProps) {
  const [session, setSession] = useState<Session | null>(initialSession);
  const [screen, setScreen] = useState<UserScreen>(initialScreen);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(initialAuthError || '');
  const { showToast } = useFeedback();

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({}) });
    setSession(null);
    setScreen('servers');
  };

  const handleAuthSubmit = async (mode: 'login' | 'register', form: any) => {
    setBusy(true);
    setMessage('');
    try {
      const response = await fetch(`/api/auth/${mode}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(form)
      });
      const data = await readResponse(response);
      if (data.requiresTwoFactor) return { requiresTwoFactor: true };
      showToast(`Signed in successfully as ${data.user.role}`, 'success');
      window.location.replace('/');
    } catch (error: any) {
      const errorText = error.message || 'Authentication failed';
      showToast(errorText, 'error');
      setMessage(errorText);
    } finally {
      setBusy(false);
    }
  };

  const handleTwoFactor = async (code: string) => {
    setBusy(true);
    try {
      const response = await fetch('/api/auth/2fa-login', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ code })
      });
      await readResponse(response);
      window.location.replace('/');
    } finally {
      setBusy(false);
    }
  };

  const handlePasswordResetRequest = async (email: string) => {
    setBusy(true);
    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email })
      });
      const data = await readResponse(response);
      setMessage(data.message);
    } finally {
      setBusy(false);
    }
  };

  const handlePasswordReset = async (token: string, password: string) => {
    setBusy(true);
    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ token, password })
      });
      await readResponse(response);
      window.history.replaceState({}, '', '/');
      setMessage('Password changed. You can now sign in.');
    } finally {
      setBusy(false);
    }
  };

  const isMaintenanceMode = publicSettings.maintenance.enabled;
  const canBypassMaintenance = session?.user?.role === 'admin' || session?.user?.role === 'owner';

  if (isMaintenanceMode && !canBypassMaintenance && !initialMaintenanceLogin) {
    return (
      <MaintenancePage
        title={publicSettings.maintenance.title}
        message={publicSettings.maintenance.message}
        estimatedCompletion={publicSettings.maintenance.estimatedCompletion}
        statusPageUrl={publicSettings.maintenance.statusPageUrl}
        administratorLoginUrl="/?maintenanceLogin=1"
        publicSettings={publicSettings}
      />
    );
  }

  if (!session || (isMaintenanceMode && !canBypassMaintenance && initialMaintenanceLogin)) {
    return (
      <AuthScreen
        busy={busy}
        message={message}
        settings={publicSettings}
        twoFactorRequired={initialTwoFactorRequired}
        resetToken={initialResetToken}
        onSubmit={handleAuthSubmit}
        onTwoFactor={handleTwoFactor}
        onRequestPasswordReset={handlePasswordResetRequest}
        onResetPassword={handlePasswordReset}
      />
    );
  }

  return (
    <DashboardShell
      session={session}
      screen={screen}
      setScreen={setScreen}
      publicSettings={publicSettings}
      onLogout={handleLogout}
    >
      {screen === 'profile' && <ProfileScreen apiBase={API_ROUTE} showToast={showToast} session={session} setSession={setSession} />}
      {screen === 'tickets' && publicSettings.support.ticketsEnabled && <TicketsScreen apiBase={API_ROUTE} showToast={showToast} session={session} staffMode={session.user.role !== 'user'} initialTicketId={initialTicketId} />}
      {screen === 'servers' && <ServersScreen apiBase={API_ROUTE} showToast={showToast} session={session} initialServerId={initialServerId} />}
    </DashboardShell>
  );
}

export async function getServerSideProps(context: any) {
  const [initialSession, publicSettings] = await Promise.all([
    loadSession(context.req),
    loadPublicSettings()
  ]);

  return {
    props: {
      initialSession,
      publicSettings,
      initialAuthError: String(context.query?.authError || ''),
      initialTwoFactorRequired: context.query?.twoFactor === '1',
      initialServerId: typeof context.query?.server === 'string' ? context.query.server : '',
      initialScreen: context.query?.screen === 'tickets' && publicSettings.support.ticketsEnabled ? 'tickets' : context.query?.screen === 'profile' ? 'profile' : 'servers',
      initialMaintenanceLogin: context.query?.maintenanceLogin === '1',
      initialTicketId: typeof context.query?.ticket === 'string' ? context.query.ticket : '',
      initialResetToken: typeof context.query?.resetToken === 'string' ? context.query.resetToken : ''
    }
  };
}
