import { useState } from 'react';
import Head from 'next/head';
import type { AdminScreen, PanelPublicSettings, Session } from '../lib/types';
import { loadPublicSettings, loadSession } from '../lib/page-data';
import { useFeedback } from '../components/feedback/FeedbackProvider';
import { AdminShell } from '../components/layout/AdminShell';
import { AgentsScreen } from '../screens/admin/AgentsPage';
import { AnalyticsScreen } from '../screens/admin/AnalyticsPage';
import { CreateServerScreen } from '../screens/admin/CreateServerPage';
import { CronJobsScreen } from '../screens/admin/CronJobsPage';
import { EggsScreen } from '../screens/admin/EggsPage';
import { InfrastructureScreen } from '../screens/admin/InfrastructurePage';
import { SettingsScreen } from '../screens/admin/PanelSettingsPage';
import { UpdatesScreen } from '../screens/admin/UpdatesPage';
import { UsersScreen } from '../screens/admin/UsersPage';
import { WebhooksScreen } from '../screens/admin/WebhooksPage';
import { SecurityEventsScreen } from '../screens/admin/SecurityEventsPage';
import { RegistrationInvites } from '../screens/admin/RegistrationInvites';
import { TicketsScreen } from '../screens/panel/TicketsScreen';
import { LocationsScreen } from '../screens/panel/LocationsScreen';
import { PanelLogsScreen } from '../screens/admin/PanelLogsPage';
import { csrfHeaders, clearCsrfToken } from '../lib/csrf';

const API_ROUTE = '/api/panel';

const SCREEN_TITLES: Record<AdminScreen, string> = {
  create: 'Create Server',
  agents: 'Agents',
  locations: 'Locations',
  eggs: 'Eggs',
  users: 'Users',
  supportTickets: 'Support Tickets',
  registrationInvites: 'Registration Invites',
  webhooks: 'Webhooks',
  cronjobs: 'Cron Jobs',
  security: 'Security Events',
  panelLogs: 'API Panel Logs',
  updates: 'Updates',
  infrastructure: 'Infrastructure',
  settings: 'Settings',
  analytics: 'Analytics',
};

export default function AdminPage({ session, initialPublicSettings }: { session: Session; initialPublicSettings: PanelPublicSettings }) {
  const [screen, setScreen] = useState<AdminScreen>('analytics');
  const [publicSettings, setPublicSettings] = useState(initialPublicSettings);
  const { showToast } = useFeedback();
  const common = { apiBase: API_ROUTE, showToast };
  const siteName = publicSettings.branding.name || 'Panel';

  const logout = async () => {
    await fetch('/api/auth/logout', { method: 'POST', headers: { 'content-type': 'application/json', ...await csrfHeaders('POST') }, body: JSON.stringify({}) });
    clearCsrfToken();
    window.location.replace('/');
  };
  const renderScreen = () => {
    switch (screen) {
      case 'create': return <CreateServerScreen {...common} sessionUserId={session.user.id} onSuccess={() => window.location.assign('/')} />;
      case 'agents': return <AgentsScreen {...common} />;
      case 'locations': return <LocationsScreen {...common} />;
      case 'eggs': return <EggsScreen {...common} />;
      case 'users': return <UsersScreen {...common} currentUserId={session.user.id} />;
      case 'supportTickets': return <TicketsScreen {...common} session={session} staffMode />;
      case 'registrationInvites': return <RegistrationInvites {...common} />;
      case 'webhooks': return <WebhooksScreen {...common} />;
      case 'cronjobs': return <CronJobsScreen {...common} />;
      case 'security': return <SecurityEventsScreen apiBase={API_ROUTE} showToast={showToast} />;
      case 'panelLogs': return <PanelLogsScreen apiBase={API_ROUTE} showToast={showToast} />;
      case 'updates': return <UpdatesScreen {...common} canDeployPanel={session.user.role === 'owner'} />;
      case 'infrastructure': return <InfrastructureScreen {...common} />;
      case 'settings': return <SettingsScreen {...common} updatePublicSettings={setPublicSettings} />;
      case 'analytics': return <AnalyticsScreen {...common} />;
    }
  };
  return (
    <>
      <Head>
        <title>{`${SCREEN_TITLES[screen]} | ${siteName}`}</title>
        <meta name="robots" content="noindex, nofollow" />
      </Head>
      <AdminShell
        session={session}
        screen={screen}
        setScreen={setScreen}
        publicSettings={publicSettings}
        onLogout={logout}
      >
        {renderScreen()}
      </AdminShell>
    </>
  );
}

export async function getServerSideProps(context: any) {
  const session = await loadSession(context.req);
  if (!session || !['owner', 'admin'].includes(session.user.role)) {
    return { redirect: { destination: '/', permanent: false } };
  }
  return {
    props: {
      session,
      initialPublicSettings: await loadPublicSettings()
    }
  };
}
