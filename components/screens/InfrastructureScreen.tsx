import React, { useEffect, useState } from 'react';
import { InfrastructurePanel, TransferProgress } from '../admin/InfrastructurePage';
import { requestJson } from '../../lib/http';

interface OperationJob {
  id: string;
  status: 'queued' | 'running' | 'complete' | 'failed';
  phase: string;
  progress: number;
  message: string;
  errorMessage?: string;
  result?: any;
}

interface StoredOperation {
  id: string;
  mode: 'server' | 'node';
  targetNodeId: string;
}

const ACTIVE_OPERATION_KEY = 'agapornis.active-transfer-operation';

export function InfrastructureScreen({ apiBase, showToast }: { apiBase: string, showToast: any }) {
  const [data, setData] = useState({ agents: [], servers: [] });
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [transferProgress, setTransferProgress] = useState<TransferProgress | null>(null);

  const fetchAll = async () => {
    const results = await Promise.all([
      requestJson(apiBase, '/agents', {}).catch(() => []),
      requestJson(apiBase, '/servers', {}).catch(() => [])
    ]);
    setData({ agents: results[0], servers: results[1] });
    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, [apiBase]);

  useEffect(() => {
    const stored = readStoredOperation();
    if (!stored) return;
    let active = true;
    setBusy(true);
    const reconnecting: OperationJob = {
      id: stored.id,
      status: 'queued',
      phase: 'reconnecting',
      progress: 5,
      message: 'Reconnecting to the active transfer'
    };
    void waitForOperation(apiBase, reconnecting, update => {
      if (active) setTransferProgress({ mode: stored.mode, ...update });
    }).then(async result => {
      if (!active) return;
      const count = stored.mode === 'node' ? `${Number(result?.serversMigrated || 0)} servers` : 'Server';
      showToast(`${count} and attached data transferred to ${stored.targetNodeId}`, 'success');
      await fetchAll();
    }).catch(error => {
      if (active) showToast(error.message || 'Transfer failed', 'error');
    }).finally(() => {
      clearStoredOperation(stored.id);
      if (active) setBusy(false);
    });
    return () => { active = false; };
  }, [apiBase]);

  const handleTransfer = async (nodeId: string, serverId: string, targetNodeId: string) => {
    setBusy(true);
    try {
      const job: OperationJob = await requestJson(apiBase, `/agents/${encodeURIComponent(nodeId)}/servers/${encodeURIComponent(serverId)}/transfer`, {}, { method: 'POST', body: JSON.stringify({ targetNodeId }) });
      storeOperation({ id: job.id, mode: 'server', targetNodeId });
      const result = await waitForOperation(apiBase, job, update => setTransferProgress({ mode: 'server', ...update }));
      const databaseCount = Number(result?.databasesTransferred || 0);
      const cleanupNote = result?.cleanupPending ? ' Source cleanup is still pending.' : '';
      showToast(`Server, local backups, and ${databaseCount} database${databaseCount === 1 ? '' : 's'} transferred to ${targetNodeId}.${cleanupNote}`, 'success');
      await fetchAll();
    } catch (e: any) {
      showToast(e.message, 'error');
      throw e;
    } finally {
      clearStoredOperation();
      setBusy(false);
    }
  };

  const handleMigrate = async (sourceNodeId: string, targetNodeId: string) => {
    setBusy(true);
    try {
      const job: OperationJob = await requestJson(apiBase, `/agents/${encodeURIComponent(sourceNodeId)}/servers/migrate`, {}, { method: 'POST', body: JSON.stringify({ targetNodeId }) });
      storeOperation({ id: job.id, mode: 'node', targetNodeId });
      const result = await waitForOperation(apiBase, job, update => setTransferProgress({ mode: 'node', ...update }));
      const cleanupPending = Number(result?.cleanupPendingServers || 0);
      const cleanupNote = cleanupPending > 0 ? ` Source cleanup remains pending for ${cleanupPending} server${cleanupPending === 1 ? '' : 's'}.` : '';
      showToast(`${Number(result?.serversMigrated || 0)} servers and their attached data migrated to ${targetNodeId}.${cleanupNote}`, 'success');
      await fetchAll();
    } catch (e: any) {
      showToast(e.message, 'error');
      throw e;
    } finally {
      clearStoredOperation();
      setBusy(false);
    }
  };

  if (loading) return <div>Loading...</div>;

  return <InfrastructurePanel agents={data.agents} servers={data.servers} busy={busy} progress={transferProgress} onTransferServer={handleTransfer} onMigrateNode={handleMigrate} />;
}

function waitForOperation(apiBase: string, initial: OperationJob, onProgress: (job: OperationJob) => void) {
  onProgress(initial);
  return new Promise<any>((resolve, reject) => {
    let settled = false;
    let polling = false;
    const source = new EventSource(`${apiBase || '/api'}/operations/${encodeURIComponent(initial.id)}/stream`);

    const finish = (job: OperationJob) => {
      if (settled) return;
      onProgress(job);
      if (job.status !== 'complete' && job.status !== 'failed') return;
      settled = true;
      source.close();
      if (job.status === 'complete') resolve(job.result);
      else reject(new Error(job.errorMessage || job.message || 'Operation failed'));
    };

    const receive = (event: Event) => {
      try { finish(JSON.parse((event as MessageEvent).data) as OperationJob); }
      catch { /* A reconnect or polling fallback will recover the current state. */ }
    };

    source.addEventListener('progress', receive);
    source.addEventListener('complete', receive);
    source.addEventListener('failed', receive);
    source.onerror = () => {
      if (settled || polling) return;
      source.close();
      polling = true;
      void pollOperation(apiBase, initial.id, finish).catch(error => {
        if (settled) return;
        settled = true;
        reject(error);
      });
    };
    finish(initial);
  });
}

async function pollOperation(apiBase: string, id: string, receive: (job: OperationJob) => void) {
  let failedAttempts = 0;
  while (true) {
    try {
      const job: OperationJob = await requestJson(apiBase, `/operations/${encodeURIComponent(id)}`, {});
      failedAttempts = 0;
      receive(job);
      if (job.status === 'complete' || job.status === 'failed') return;
    } catch (error) {
      failedAttempts++;
      if (failedAttempts >= 30) throw error;
    }
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
}

function storeOperation(operation: StoredOperation) {
  try { window.sessionStorage.setItem(ACTIVE_OPERATION_KEY, JSON.stringify(operation)); }
  catch { /* Progress still works for the current page without session storage. */ }
}

function readStoredOperation(): StoredOperation | undefined {
  try {
    const raw = window.sessionStorage.getItem(ACTIVE_OPERATION_KEY);
    return raw ? JSON.parse(raw) as StoredOperation : undefined;
  } catch { return undefined; }
}

function clearStoredOperation(expectedId?: string) {
  try {
    if (expectedId) {
      const current = readStoredOperation();
      if (current?.id !== expectedId) return;
    }
    window.sessionStorage.removeItem(ACTIVE_OPERATION_KEY);
  } catch { /* Ignore unavailable session storage. */ }
}
