import { useEffect, useState } from 'react';
import { requestJson } from '../../lib/http';
import { ServerRecord, User } from '../../lib/types';
import { AnalyticsPage } from '../admin/AnalyticsPage';
import { useAgentHealth } from '../../hooks/useAgentHealth';
import { ScreenLoading } from '../feedback/LoadingStates';

export function AnalyticsScreen({ apiBase, showToast }: { apiBase: string; showToast: (message: string, type: 'success' | 'error') => void }) {
  const [data, setData] = useState<{ servers: ServerRecord[]; users: User[]; database: any } | null>(null);
  const { agents, connection } = useAgentHealth(apiBase);

  useEffect(() => {
    let closed = false;
    void Promise.all([
      requestJson(apiBase, '/servers', {}),
      requestJson(apiBase, '/auth/users', {}),
      requestJson(apiBase, '/system/database', {}).catch(() => null)
    ]).then(([servers, users, database]) => !closed && setData({ servers, users, database }))
      .catch(error => showToast(error.message, 'error'));
    return () => { closed = true; };
  }, [apiBase, showToast]);

  if (!data) return <ScreenLoading title="Building fleet analytics" detail="Loading server and ownership data while node telemetry connects in the background." />;
  return <AnalyticsPage {...data} agents={agents} connection={connection} />;
}
