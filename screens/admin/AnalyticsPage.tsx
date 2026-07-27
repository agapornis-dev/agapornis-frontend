import { useEffect, useState } from 'react';
import { useAgentHealth } from '../../hooks/useAgentHealth';
import { requestJson } from '../../lib/http';
import { ServerRecord, User } from '../../lib/types';
import { AnalyticsPage } from '../../components/admin/AnalyticsOverview';
import { ScreenLoading } from '../../components/feedback/LoadingStates';
import { useCrowdSecTelemetry } from '../../hooks/useCrowdSecTelemetry';

export function AnalyticsScreen({ apiBase, showToast }: { apiBase: string; showToast: (message: string, type: 'success' | 'error') => void }) {
  const [data, setData] = useState<{ servers: ServerRecord[]; users: User[]; database: any } | null>(null);
  const { agents, connection } = useAgentHealth(apiBase);
  const { nodes: crowdSecNodes, connection: crowdSecConnection } = useCrowdSecTelemetry(apiBase);

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
  return <AnalyticsPage {...data} agents={agents} connection={connection} crowdSecNodes={crowdSecNodes} crowdSecConnection={crowdSecConnection} />;
}
