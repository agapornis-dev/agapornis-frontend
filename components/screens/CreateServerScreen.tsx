import React, { useEffect, useState } from 'react';
import { CreateServerPanel } from '../admin/CreateServerPage';
import { requestJson } from '../../lib/http';
import { useAgentHealth, LiveConnectionState } from '../../hooks/useAgentHealth';
import { ProvisioningLoading, ProvisioningView, ScreenLoading } from '../feedback/LoadingStates';

export function CreateServerScreen({ apiBase, showToast, sessionUserId, onSuccess }: { apiBase: string, showToast: any, sessionUserId: string, onSuccess: () => void }) {
  const [data, setData] = useState<{ agents: any[]; eggs: any[]; users: any[] } | null>(null);
  const [job, setJob] = useState<ProvisioningView | null>(null);
  const [progressConnection, setProgressConnection] = useState<LiveConnectionState>('connecting');
  const { agents: agentStats, connection: telemetryConnection } = useAgentHealth(apiBase);

  useEffect(() => {
    let closed = false;
    Promise.all([
      requestJson(apiBase, '/agents', {}).catch(() => []),
      requestJson(apiBase, '/eggs', {}).catch(() => []),
      requestJson(apiBase, '/auth/users', {}).catch(() => []),
      requestJson(apiBase, '/servers/capacity', {}).catch(() => [])
    ]).then(([agents, eggs, users, capacities]) => {
      const byNode = new Map<string, any>(capacities.map((capacity: any) => [capacity.nodeId, capacity]));
      if (!closed) setData({ agents: agents.map((agent: any) => ({ ...agent, ...(byNode.get(agent.nodeId) || {}) })), eggs, users });
    });
    return () => { closed = true; };
  }, [apiBase]);

  useEffect(() => {
    if (!job?.id || job.status === 'complete' || job.status === 'failed') return;
    let closed = false;
    const source = new EventSource(`${apiBase || '/api'}/provisioning/${encodeURIComponent(job.id)}/stream`);
    const accept = (event: Event) => {
      try {
        const next = JSON.parse((event as MessageEvent).data) as ProvisioningView;
        if (!closed) setJob(next);
      } catch {
        // Wait for the next valid progress event.
      }
    };
    source.onopen = () => !closed && setProgressConnection('live');
    source.addEventListener('progress', accept);
    source.addEventListener('failed', event => {
      accept(event);
      source.close();
    });
    source.addEventListener('complete', event => {
      accept(event);
      source.close();
      showToast('Server created and assigned successfully', 'success');
      window.setTimeout(onSuccess, 700);
    });
    source.onerror = () => !closed && setProgressConnection('reconnecting');
    return () => {
      closed = true;
      source.close();
    };
  }, [apiBase, job?.id, job?.status, onSuccess, showToast]);

  const handleSubmit = async (formData: any) => {
    try {
      const created = await requestJson(apiBase, '/servers/from-egg/provision', {}, { method: 'POST', body: JSON.stringify(formData) });
      setProgressConnection('connecting');
      setJob(created);
    } catch (e: any) {
      showToast(e.message, 'error');
    }
  };

  if (!data) return <ScreenLoading title="Preparing the provisioner" detail="Loading templates, agents, and account assignments." />;
  if (job) return <ProvisioningLoading job={job} connection={progressConnection} onDismiss={() => setJob(null)} />;

  return (
    <CreateServerPanel
      agents={data.agents} agentStats={agentStats} eggs={data.eggs} users={data.users}
      sessionUserId={sessionUserId} busy={false} onSubmit={handleSubmit} telemetryConnection={telemetryConnection}
    />
  );
}
