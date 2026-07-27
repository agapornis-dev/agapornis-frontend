import { useEffect, useMemo, useState } from 'react';
import { AgentsPanel } from '../../components/admin/AgentsPanel';
import { useApiAction } from '../../hooks/useApiAction';
import { useLazyData } from '../../hooks/useLazyData';
import { requestJson } from '../../lib/http';

export function AgentsScreen({ apiBase, showToast }: { apiBase: string; showToast: (msg: string, type: 'success' | 'error') => void }) {
  const { data: agents, loading, refresh } = useLazyData<any[]>(apiBase, '/agents', {}, []);
  const { data: capacities, loading: capacityLoading, refresh: refreshCapacity } = useLazyData<any[]>(apiBase, '/servers/capacity', {}, []);
  const { data: locations } = useLazyData<any[]>(apiBase, '/locations', {}, []);
  const [bootstrapToken, setBootstrapToken] = useState<any>(null);
  const [allocations, setAllocations] = useState<Record<string, any[]>>({});
  const { busy, run } = useApiAction(showToast);

  const agentsWithCapacity = useMemo(() => {
    const byNode = new Map((capacities || []).map(c => [c.nodeId, c]));
    return (agents || []).map(a => ({ ...a, ...(byNode.get(a.nodeId) || {}) }));
  }, [agents, capacities]);

  useEffect(() => {
    let closed = false;
    Promise.all((agents || []).map(async a => [a.nodeId, await requestJson(apiBase, `/servers/capacity/${encodeURIComponent(a.nodeId)}/allocations`, {}).catch(() => [])] as const))
      .then(rows => { if (!closed) setAllocations(Object.fromEntries(rows)); });
    return () => { closed = true; };
  }, [apiBase, agents, capacities]);

  const refreshAll = () => { refresh(); refreshCapacity(); };

  if ((loading || capacityLoading) && !agents?.length) return <div>Loading...</div>;

  return (
    <AgentsPanel
      agents={agentsWithCapacity}
      locations={locations}
      allocations={allocations}
      bootstrapToken={bootstrapToken}
      busy={busy || loading}
      onAdd={async (data) => { await run(() => requestJson(apiBase, '/agents/register', {}, { method: 'POST', body: JSON.stringify(data) }), 'Agent successfully registered'); refreshAll(); }}
      onUpdatePlacement={async (nodeId, data) => { await run(() => requestJson(apiBase, `/agents/${encodeURIComponent(nodeId)}/placement`, {}, { method: 'PATCH', body: JSON.stringify(data) }), 'Node location and port policy saved'); refreshAll(); }}
      onRemove={async (nodeId) => { await run(() => requestJson(apiBase, `/agents/${nodeId}`, {}, { method: 'DELETE', body: JSON.stringify({}) }), 'Agent successfully removed'); refreshAll(); }}
      onGenerateToken={async () => { const data = await run(() => requestJson(apiBase, '/agents/bootstrap-token', {}, { method: 'POST' }), 'Bootstrap token generated successfully'); if (data) setBootstrapToken(data); }}
      onRotateCertificate={async (nodeId) => { await run(() => requestJson(apiBase, `/agents/${encodeURIComponent(nodeId)}/certificate/rotate`, {}, { method: 'POST' }), 'Certificate rotated and verified automatically.'); refresh(); }}
      onActivateCertificate={async (nodeId) => { await run(() => requestJson(apiBase, `/agents/${encodeURIComponent(nodeId)}/certificate/activate`, {}, { method: 'POST' }), 'New certificate activated; the old certificate is rejected.'); refresh(); }}
      onRevokeCertificate={async (nodeId) => { await run(() => requestJson(apiBase, `/agents/${encodeURIComponent(nodeId)}/certificate/revoke`, {}, { method: 'POST' }), 'Node certificate revoked.'); refresh(); }}
    />
  );
}
