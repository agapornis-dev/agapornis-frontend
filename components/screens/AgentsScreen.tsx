import React, { useEffect, useMemo, useState } from 'react';
import { useLazyData } from '../../hooks/useLazyData';
import { AgentsPanel } from '../admin/AgentsPage';
import { requestJson } from '../../lib/http';

export function AgentsScreen({ apiBase, showToast }: { apiBase: string, showToast: (msg: string, type: 'success' | 'error') => void }) {
  const { data: agents, loading, refresh } = useLazyData<any[]>(apiBase, '/agents', {}, []);
  const { data: capacities, loading: capacityLoading, refresh: refreshCapacity } = useLazyData<any[]>(apiBase, '/servers/capacity', {}, []);
  const { data: locations } = useLazyData<any[]>(apiBase, '/locations', {}, []);
  const [bootstrapToken, setBootstrapToken] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const [allocations, setAllocations] = useState<Record<string, any[]>>({});
  const agentsWithCapacity = useMemo(() => {
    const byNode = new Map((capacities || []).map(capacity => [capacity.nodeId, capacity]));
    return (agents || []).map(agent => ({ ...agent, ...(byNode.get(agent.nodeId) || {}) }));
  }, [agents, capacities]);
  useEffect(() => {
    let closed = false;
    Promise.all((agents || []).map(async agent => [agent.nodeId, await requestJson(apiBase, `/servers/capacity/${encodeURIComponent(agent.nodeId)}/allocations`, {}).catch(() => [])] as const))
      .then(rows => { if (!closed) setAllocations(Object.fromEntries(rows)); });
    return () => { closed = true; };
  }, [apiBase, agents, capacities]);

  const handleAdd = async (data: any) => {
    setBusy(true);
    try {
      await requestJson(apiBase, '/agents/register', {}, { method: 'POST', body: JSON.stringify(data) });
      showToast('Agent successfully registered', 'success');
      refresh();
      refreshCapacity();
    } catch (e: any) {
      showToast(e.message, 'error');
    } finally { setBusy(false); }
  };

  const handleRemove = async (nodeId: string) => {
    setBusy(true);
    try {
      await requestJson(apiBase, `/agents/${nodeId}`, {}, { method: 'DELETE', body: JSON.stringify({}) });
      showToast('Agent successfully removed', 'success');
      refresh();
      refreshCapacity();
    } catch (e: any) {
      showToast(e.message, 'error');
    } finally { setBusy(false); }
  };

  const handleGenerateToken = async () => {
    setBusy(true);
    try {
      const data = await requestJson(apiBase, '/agents/bootstrap-token', {}, { method: 'POST' });
      setBootstrapToken(data);
      showToast('Bootstrap token generated successfully', 'success');
    } catch (e: any) {
      showToast(e.message, 'error');
    } finally { setBusy(false); }
  };

  const handleRotateCertificate = async (nodeId: string) => {
    setBusy(true);
    try {
      await requestJson(apiBase, `/agents/${encodeURIComponent(nodeId)}/certificate/rotate`, {}, { method: 'POST' });
      showToast('Certificate rotated and verified automatically.', 'success');
      refresh();
    } catch (e: any) {
      showToast(e.message, 'error');
    } finally { setBusy(false); }
  };

  const handleUpdatePlacement = async (nodeId: string, data: any) => {
    setBusy(true);
    try {
      await requestJson(apiBase, `/agents/${encodeURIComponent(nodeId)}/placement`, {}, { method: 'PATCH', body: JSON.stringify(data) });
      showToast('Node location and port policy saved', 'success');
      refresh();
      refreshCapacity();
    } catch (e: any) {
      showToast(e.message, 'error');
    } finally { setBusy(false); }
  };

  const handleActivateCertificate = async (nodeId: string) => {
    setBusy(true);
    try {
      await requestJson(apiBase, `/agents/${encodeURIComponent(nodeId)}/certificate/activate`, {}, { method: 'POST' });
      showToast('New certificate activated; the old certificate is rejected.', 'success');
      refresh();
    } catch (e: any) {
      showToast(e.message, 'error');
    } finally { setBusy(false); }
  };

  const handleRevokeCertificate = async (nodeId: string) => {
    setBusy(true);
    try {
      await requestJson(apiBase, `/agents/${encodeURIComponent(nodeId)}/certificate/revoke`, {}, { method: 'POST' });
      showToast('Node certificate revoked.', 'success');
      refresh();
    } catch (e: any) {
      showToast(e.message, 'error');
    } finally { setBusy(false); }
  };

  if ((loading || capacityLoading) && !agents?.length) return <div>Loading...</div>;

  return (
    <AgentsPanel 
      agents={agentsWithCapacity} 
      locations={locations}
      allocations={allocations}
      bootstrapToken={bootstrapToken}
      busy={busy || loading}
      onAdd={handleAdd}
      onUpdatePlacement={handleUpdatePlacement}
      onRemove={handleRemove}
      onGenerateToken={handleGenerateToken}
      onRotateCertificate={handleRotateCertificate}
      onActivateCertificate={handleActivateCertificate}
      onRevokeCertificate={handleRevokeCertificate}
    />
  );
}
