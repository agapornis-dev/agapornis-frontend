import { useState } from 'react';
import type { AdminScreen, PanelPublicSettings, Session } from '../lib/types';
import { loadPublicSettings, loadSession } from '../lib/page-data';
import { useFeedback } from '../components/feedback/FeedbackProvider';
import { AdminShell } from '../components/layout/AdminShell';
import { AgentsScreen } from '../components/screens/AgentsScreen';
import { AnalyticsScreen } from '../components/screens/AnalyticsScreen';
import { CreateServerScreen } from '../components/screens/CreateServerScreen';
import { CronJobsScreen } from '../components/screens/CronJobsScreen';
import { EggsScreen } from '../components/screens/EggsScreen';
import { InfrastructureScreen } from '../components/screens/InfrastructureScreen';
import { SettingsScreen } from '../components/screens/SettingsScreen';
import { UpdatesScreen } from '../components/screens/UpdatesScreen';
import { UsersScreen } from '../components/screens/UsersScreen';
import { WebhooksScreen } from '../components/screens/WebhooksScreen';
import { SecurityEventsScreen } from '../components/screens/SecurityEventsScreen';
import { RegistrationInvitesScreen } from '@/components/screens/RegistrationInvitesScreen';
import { TicketsScreen } from '../components/screens/TicketsScreen';
import { LocationsScreen } from '../components/screens/LocationsScreen';

const API_ROUTE = '/api/panel';

export default function AdminPage({ session, initialPublicSettings }: { session: Session; initialPublicSettings: PanelPublicSettings }) {
  const [screen, setScreen] = useState<AdminScreen>('analytics');
  const [publicSettings, setPublicSettings] = useState(initialPublicSettings);
  const { showToast } = useFeedback();
  const common = { apiBase: API_ROUTE, showToast };

  const logout = async () => {
    await fetch('/api/auth/logout', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({}) });
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
      case 'registrationInvites': return <RegistrationInvitesScreen {...common} />;
      case 'webhooks': return <WebhooksScreen {...common} />;
      case 'cronjobs': return <CronJobsScreen {...common} />;
      case 'security': return <SecurityEventsScreen apiBase={API_ROUTE} showToast={showToast} />;
      case 'updates': return <UpdatesScreen {...common} canDeployPanel={session.user.role === 'owner'} />;
      case 'infrastructure': return <InfrastructureScreen {...common} />;
      case 'settings': return <SettingsScreen {...common} updatePublicSettings={setPublicSettings} />;
      case 'analytics': return <AnalyticsScreen {...common} />;
    }
  };

  return (
    <AdminShell
      session={session}
      screen={screen}
      setScreen={setScreen}
      publicSettings={publicSettings}
      onLogout={logout}
    >
      {renderScreen()}
    </AdminShell>
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
