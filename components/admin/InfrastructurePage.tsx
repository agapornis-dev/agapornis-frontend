import { useEffect, useMemo, useState } from 'react';
import { 
  MoveRight, 
  Server, 
  Loader2, 
  ArrowRightLeft, 
  ArrowDownUp,
  Info,
  CheckCircle2,
  AlertCircle,
  Zap,
  AlertTriangle,
  Search
} from 'lucide-react';
import { btn, inp } from '../../lib/constants';
import { Panel, EmptyState, cn } from '../ui';
import { ServerRecord } from '../../lib/types';
import { useConfirm } from '../feedback/FeedbackProvider';
import { requestJson } from '../../lib/http';

/* ── Self-contained screen (data fetching + transfer operations) ───── */

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

function storeOperation(op: StoredOperation) { try { window.sessionStorage.setItem(ACTIVE_OPERATION_KEY, JSON.stringify(op)); } catch {} }
function readStoredOperation(): StoredOperation | undefined { try { const r = window.sessionStorage.getItem(ACTIVE_OPERATION_KEY); return r ? JSON.parse(r) : undefined; } catch { return undefined; } }
function clearStoredOperation(expectedId?: string) { try { if (expectedId) { const c = readStoredOperation(); if (c?.id !== expectedId) return; } window.sessionStorage.removeItem(ACTIVE_OPERATION_KEY); } catch {} }

function waitForOperation(apiBase: string, initial: OperationJob, onProgress: (job: OperationJob) => void) {
  onProgress(initial);
  return new Promise<any>((resolve, reject) => {
    let settled = false; let polling = false;
    const source = new EventSource(`${apiBase || '/api'}/operations/${encodeURIComponent(initial.id)}/stream`);
    const finish = (job: OperationJob) => {
      if (settled) return; onProgress(job);
      if (job.status !== 'complete' && job.status !== 'failed') return;
      settled = true; source.close();
      if (job.status === 'complete') resolve(job.result); else reject(new Error(job.errorMessage || job.message || 'Operation failed'));
    };
    const receive = (event: Event) => { try { finish(JSON.parse((event as MessageEvent).data)); } catch {} };
    source.addEventListener('progress', receive); source.addEventListener('complete', receive); source.addEventListener('failed', receive);
    source.onerror = () => {
      if (settled || polling) return; source.close(); polling = true;
      void pollOperation(apiBase, initial.id, finish).catch(e => { if (!settled) { settled = true; reject(e); } });
    };
    finish(initial);
  });
}

async function pollOperation(apiBase: string, id: string, receive: (job: OperationJob) => void) {
  let failed = 0;
  while (true) {
    try { const job: OperationJob = await requestJson(apiBase, `/operations/${encodeURIComponent(id)}`, {}); failed = 0; receive(job); if (job.status === 'complete' || job.status === 'failed') return; }
    catch (e) { failed++; if (failed >= 30) throw e; }
    await new Promise(r => setTimeout(r, 1000));
  }
}

export function InfrastructureScreen({ apiBase, showToast }: { apiBase: string; showToast: (msg: string, type: 'success' | 'error') => void }) {
  const [data, setData] = useState({ agents: [] as any[], servers: [] as ServerRecord[] });
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [transferProgress, setTransferProgress] = useState<TransferProgress | null>(null);

  const fetchAll = async () => {
    const results = await Promise.all([requestJson(apiBase, '/agents', {}).catch(() => []), requestJson(apiBase, '/servers', {}).catch(() => [])]);
    setData({ agents: results[0], servers: results[1] }); setLoading(false);
  };

  useEffect(() => { fetchAll(); }, [apiBase]);

  useEffect(() => {
    const stored = readStoredOperation(); if (!stored) return;
    let active = true; setBusy(true);
    const reconnecting: OperationJob = { id: stored.id, status: 'queued', phase: 'reconnecting', progress: 5, message: 'Reconnecting to the active transfer' };
    void waitForOperation(apiBase, reconnecting, update => { if (active) setTransferProgress({ mode: stored.mode, ...update }); })
      .then(async result => { if (!active) return; const count = stored.mode === 'node' ? `${Number(result?.serversMigrated || 0)} servers` : 'Server'; showToast(`${count} and attached data transferred to ${stored.targetNodeId}`, 'success'); await fetchAll(); })
      .catch(e => { if (active) showToast(e.message || 'Transfer failed', 'error'); })
      .finally(() => { clearStoredOperation(stored.id); if (active) setBusy(false); });
    return () => { active = false; };
  }, [apiBase]);

  const handleTransfer = async (nodeId: string, serverId: string, targetNodeId: string) => {
    setBusy(true);
    try {
      const job: OperationJob = await requestJson(apiBase, `/agents/${encodeURIComponent(nodeId)}/servers/${encodeURIComponent(serverId)}/transfer`, {}, { method: 'POST', body: JSON.stringify({ targetNodeId }) });
      storeOperation({ id: job.id, mode: 'server', targetNodeId });
      const result = await waitForOperation(apiBase, job, update => setTransferProgress({ mode: 'server', ...update }));
      const dbCount = Number(result?.databasesTransferred || 0);
      const note = result?.cleanupPending ? ' Source cleanup is still pending.' : '';
      showToast(`Server, local backups, and ${dbCount} database${dbCount === 1 ? '' : 's'} transferred to ${targetNodeId}.${note}`, 'success');
      await fetchAll();
    } catch (e: any) { showToast(e.message, 'error'); throw e; }
    finally { clearStoredOperation(); setBusy(false); }
  };

  const handleMigrate = async (sourceNodeId: string, targetNodeId: string) => {
    setBusy(true);
    try {
      const job: OperationJob = await requestJson(apiBase, `/agents/${encodeURIComponent(sourceNodeId)}/servers/migrate`, {}, { method: 'POST', body: JSON.stringify({ targetNodeId }) });
      storeOperation({ id: job.id, mode: 'node', targetNodeId });
      const result = await waitForOperation(apiBase, job, update => setTransferProgress({ mode: 'node', ...update }));
      const pending = Number(result?.cleanupPendingServers || 0);
      const note = pending > 0 ? ` Source cleanup remains pending for ${pending} server${pending === 1 ? '' : 's'}.` : '';
      showToast(`${Number(result?.serversMigrated || 0)} servers and their attached data migrated to ${targetNodeId}.${note}`, 'success');
      await fetchAll();
    } catch (e: any) { showToast(e.message, 'error'); throw e; }
    finally { clearStoredOperation(); setBusy(false); }
  };

  if (loading) return <div>Loading...</div>;
  return <InfrastructurePanel agents={data.agents} servers={data.servers} busy={busy} progress={transferProgress} onTransferServer={handleTransfer} onMigrateNode={handleMigrate} />;
}

export interface TransferProgress {
  mode: 'server' | 'node';
  status: 'queued' | 'running' | 'complete' | 'failed';
  phase: string;
  progress: number;
  message: string;
  errorMessage?: string;
}

export function InfrastructurePanel({
  agents,
  servers,
  busy,
  progress,
  onTransferServer,
  onMigrateNode
}: {
  agents: any[];
  servers: ServerRecord[];
  busy: boolean;
  progress: TransferProgress | null;
  onTransferServer: (nodeId: string, serverId: string, targetNodeId: string) => Promise<void>;
  onMigrateNode: (sourceNodeId: string, targetNodeId: string) => Promise<void>;
}) {
  const [serverTransfer, setServerTransfer] = useState({ serverId: '', targetNodeId: '' });
  const [nodeTransfer, setNodeTransfer] = useState({ sourceNodeId: '', targetNodeId: '' });
  const [serverBusy, setServerBusy] = useState(false);
  const [nodeBusy, setNodeBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [serverSearch, setServerSearch] = useState('');
  const confirm = useConfirm();

  const selectedServer = servers.find(s => s.id === serverTransfer.serverId);
  const filteredServers = useMemo(() => {
    const query = serverSearch.trim().toLowerCase();
    if (!query) return servers;
    return servers.filter(server => [server.name, server.id, server.nodeId, server.ownerUserId, server.status]
      .some(value => String(value || '').toLowerCase().includes(query)));
  }, [servers, serverSearch]);
  const sourceServerCount = nodeTransfer.sourceNodeId 
    ? servers.filter(s => s.nodeId === nodeTransfer.sourceNodeId).length 
    : 0;

  const isErrorMsg = message.toLowerCase().includes('fail') || message.toLowerCase().includes('error');
  const customInputStyle = "bg-[var(--secondary)]/10 border-[var(--border)]/60 transition-all focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)]/30 font-medium";

  async function handleServerTransfer(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedServer) return;
    setServerBusy(true);
    setMessage('');
    try {
      await onTransferServer(selectedServer.nodeId, selectedServer.id, serverTransfer.targetNodeId);
      setMessage(`Server "${selectedServer.name || selectedServer.id}" successfully transferred to ${serverTransfer.targetNodeId}`);
      setServerTransfer({ serverId: '', targetNodeId: '' });
      setServerSearch('');
    } catch (err: any) {
      setMessage(err.message || 'Transfer failed');
    } finally {
      setServerBusy(false);
    }
  }

  async function handleNodeMigrate(e: React.FormEvent) {
    e.preventDefault();
    if (!await confirm({
      title: `Migrate ${sourceServerCount} server${sourceServerCount === 1 ? '' : 's'}?`,
      description: `All servers, local backups, and attached databases on ${nodeTransfer.sourceNodeId} will move to ${nodeTransfer.targetNodeId} one by one. This may take a while.`,
      confirmLabel: 'Start migration',
      tone: 'danger'
    })) return;
    
    setNodeBusy(true);
    setMessage('');
    try {
      await onMigrateNode(nodeTransfer.sourceNodeId, nodeTransfer.targetNodeId);
      setMessage(`All servers successfully migrated from ${nodeTransfer.sourceNodeId} to ${nodeTransfer.targetNodeId}`);
      setNodeTransfer({ sourceNodeId: '', targetNodeId: '' });
    } catch (err: any) {
      setMessage(err.message || 'Migration failed');
    } finally {
      setNodeBusy(false);
    }
  }

  const nodeIds = agents.map((a: any) => a.nodeId as string);

  return (
    <div className="mx-auto grid max-w-[1000px] gap-10 pb-12">
      
      {/* Typographical Page Header */}
      <div className="flex flex-col gap-2">
        <h2 className="text-3xl font-extrabold tracking-tight text-[var(--foreground)] sm:text-4xl">
          Transfers<span className="text-[var(--primary)]">.</span>
        </h2>
        <p className="text-sm font-medium text-[var(--muted-foreground)]/80">
          Migrate individual servers or evacuate entire nodes with zero-downtime data streaming.
        </p>
      </div>

      {/* Global Status Message */}
      {message && (
        <div className={cn(
          'flex items-center gap-3 rounded-xl border px-5 py-4 animate-in fade-in slide-in-from-top-2 shadow-lg',
          isErrorMsg
            ? 'border-[var(--destructive)]/40 bg-[var(--destructive)]/10 text-[var(--destructive)]'
            : 'border-[var(--success)]/40 bg-[var(--success)]/10 text-[var(--success)]'
        )}>
          {isErrorMsg ? (
            <AlertCircle size={20} className="shrink-0" />
          ) : (
            <CheckCircle2 size={20} className="shrink-0" />
          )}
          <p className="text-sm font-bold tracking-wide">{message}</p>
        </div>
      )}

      <div className="grid gap-10">
        {/* Single-server transfer */}
        <Panel className="overflow-hidden border-[var(--border)]/60 bg-[var(--background)]/50 backdrop-blur-sm">
          <div className="flex items-center gap-3 border-b border-[var(--border)]/60 bg-[var(--secondary)]/10 px-6 py-4">
            <MoveRight size={18} className="text-[var(--primary)]" />
            <h3 className="text-sm font-bold tracking-wide text-[var(--foreground)]">Transfer Single Server</h3>
          </div>
          
          <div className="px-6 py-4 text-sm font-medium text-[var(--muted-foreground)]/90 border-b border-[var(--border)]/50 leading-relaxed bg-[var(--background)]">
            Move a server with its live files, node-local backups, and attached databases. Data streams directly between agents via mTLS, bypassing the core API.
          </div>
          
          {agents.length < 2 ? (
            <EmptyState className="py-16">
              <span className="text-[var(--muted-foreground)] px-6 py-4">At least two registered agents are required to perform a transfer.</span>
            </EmptyState>
          ) : (
            <form className="p-6 sm:p-8" onSubmit={handleServerTransfer}>
              <fieldset disabled={busy || serverBusy} className="flex flex-col gap-8">
                
                <div className="flex flex-col sm:flex-row sm:items-center gap-6">
                  
                  <div className="flex-1 flex flex-col gap-2">
                    <div className="flex items-center justify-between gap-3">
                      <label className="text-xs font-bold text-[var(--foreground)]">Server to Transfer</label>
                      <span className="text-[10px] font-semibold text-[var(--muted-foreground)]">{filteredServers.length} match{filteredServers.length === 1 ? '' : 'es'}</span>
                    </div>
                    <div className="relative">
                      <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)]" />
                      <input
                        className={cn(inp, customInputStyle, 'w-full pl-9')}
                        value={serverSearch}
                        onChange={event => {
                          const value = event.target.value;
                          setServerSearch(value);
                          if (serverTransfer.serverId) {
                            const selected = servers.find(server => server.id === serverTransfer.serverId);
                            const query = value.trim().toLowerCase();
                            if (selected && query && ![selected.name, selected.id, selected.nodeId, selected.ownerUserId, selected.status]
                              .some(field => String(field || '').toLowerCase().includes(query))) {
                              setServerTransfer(current => ({ ...current, serverId: '', targetNodeId: '' }));
                            }
                          }
                        }}
                        placeholder="Search name, ID, owner, node, or status..."
                        aria-label="Search servers to transfer"
                      />
                    </div>
                    <select
                      className={cn(inp, customInputStyle)}
                      value={serverTransfer.serverId}
                      onChange={e => setServerTransfer(p => ({ ...p, serverId: e.target.value }))}
                      required
                    >
                      <option value="">Select source server…</option>
                      {filteredServers.map(s => (
                        <option key={s.id} value={s.id}>
                          {s.name || s.id} — {s.id} ({s.nodeId})
                        </option>
                      ))}
                    </select>
                    {serverSearch && filteredServers.length === 0 && (
                      <p className="text-xs font-medium text-[var(--muted-foreground)]">No servers match “{serverSearch}”.</p>
                    )}
                  </div>

                  <div className="flex shrink-0 justify-center text-[var(--muted-foreground)]/40 sm:pt-6">
                    <ArrowRightLeft size={24} className="hidden sm:block" />
                    <ArrowDownUp size={24} className="sm:hidden" />
                  </div>

                  <div className="flex-1 flex flex-col gap-2">
                    <label className="text-xs font-bold text-[var(--foreground)]">Destination Node</label>
                    <select
                      className={cn(inp, customInputStyle)}
                      value={serverTransfer.targetNodeId}
                      onChange={e => setServerTransfer(p => ({ ...p, targetNodeId: e.target.value }))}
                      required
                    >
                      <option value="">Select target node…</option>
                      {nodeIds
                        .filter(id => !selectedServer || id !== selectedServer.nodeId)
                        .map(id => (
                          <option key={id} value={id}>{id}</option>
                        ))}
                    </select>
                  </div>

                </div>

                {selectedServer && serverTransfer.targetNodeId && (
                  <div className="flex items-start gap-4 rounded-xl border border-[var(--primary)]/30 bg-[var(--primary)]/5 p-5 animate-in fade-in slide-in-from-bottom-2">
                    <Info size={18} className="mt-0.5 shrink-0 text-[var(--primary)]" />
                    <p className="text-sm font-medium leading-relaxed text-[var(--muted-foreground)]">
                      <span className="font-bold text-[var(--foreground)]">{selectedServer.name || selectedServer.id}</span>
                      {' '}and its persistent data will be exported from <span className="font-bold text-[var(--primary)]">{selectedServer.nodeId}</span> and provisioned onto <span className="font-bold text-[var(--primary)]">{serverTransfer.targetNodeId}</span>.
                    </p>
                  </div>
                )}

                {progress?.mode === 'server' && <TransferProgressCard progress={progress} />}

                <div className="flex justify-end pt-4 border-t border-[var(--border)]/50">
                  <button 
                    className={cn(btn, "group relative flex items-center gap-2 rounded-lg bg-[var(--foreground)] px-8 py-3 text-sm font-bold text-[var(--background)] transition-all hover:bg-[var(--foreground)]/90 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none")} 
                    disabled={!serverTransfer.serverId || !serverTransfer.targetNodeId}
                  >
                    {serverBusy ? <Loader2 size={18} className="animate-spin" /> : <Zap size={18} className="transition-transform group-hover:scale-110 group-hover:text-[var(--primary)]" />}
                    {serverBusy ? 'Streaming Data…' : 'Initiate Transfer'}
                  </button>
                </div>
              </fieldset>
            </form>
          )}
        </Panel>

        {/* Full-node migration */}
        <Panel className="overflow-hidden border-orange-500/20 bg-[var(--background)]/50 backdrop-blur-sm">
          <div className="flex items-center gap-3 border-b border-orange-500/20 bg-orange-500/5 px-6 py-4">
            <Server size={18} className="text-orange-500" />
            <h3 className="text-sm font-bold tracking-wide text-[var(--foreground)]">Node Evacuation (Migrate Entire Node)</h3>
          </div>
          
          <div className="px-6 py-4 text-sm font-medium text-[var(--muted-foreground)]/90 border-b border-[var(--border)]/50 leading-relaxed bg-[var(--background)]">
            Sequentially migrate every server, volume, and attached database off a specific node. Strongly recommended before decommissioning hardware.
          </div>
          
          {agents.length < 2 ? (
            <EmptyState className="py-16">
              <span className="text-[var(--muted-foreground)] px-6 py-4">At least two registered agents are required to perform an evacuation.</span>
            </EmptyState>
          ) : (
            <form className="p-6 sm:p-8" onSubmit={handleNodeMigrate}>
              <fieldset disabled={busy || nodeBusy} className="flex flex-col gap-8">
                
                <div className="flex flex-col sm:flex-row sm:items-center gap-6">
                  
                  <div className="flex-1 flex flex-col gap-2">
                    <label className="text-xs font-bold text-[var(--foreground)]">Source Node (To Evacuate)</label>
                    <select
                      className={cn(inp, customInputStyle)}
                      value={nodeTransfer.sourceNodeId}
                      onChange={e => setNodeTransfer(p => ({ ...p, sourceNodeId: e.target.value }))}
                      required
                    >
                      <option value="">Select source node…</option>
                      {nodeIds.map(id => (
                        <option key={id} value={id}>{id}</option>
                      ))}
                    </select>
                  </div>

                  <div className="flex shrink-0 justify-center text-[var(--muted-foreground)]/40 sm:pt-6">
                    <ArrowRightLeft size={24} className="hidden sm:block" />
                    <ArrowDownUp size={24} className="sm:hidden" />
                  </div>

                  <div className="flex-1 flex flex-col gap-2">
                    <label className="text-xs font-bold text-[var(--foreground)]">Destination Node</label>
                    <select
                      className={cn(inp, customInputStyle)}
                      value={nodeTransfer.targetNodeId}
                      onChange={e => setNodeTransfer(p => ({ ...p, targetNodeId: e.target.value }))}
                      required
                    >
                      <option value="">Select target node…</option>
                      {nodeIds
                        .filter(id => id !== nodeTransfer.sourceNodeId)
                        .map(id => (
                          <option key={id} value={id}>{id}</option>
                        ))}
                    </select>
                  </div>

                </div>

                {nodeTransfer.sourceNodeId && (
                  <div className="flex items-start gap-4 rounded-xl border border-orange-500/30 bg-orange-500/5 p-5 animate-in fade-in slide-in-from-bottom-2">
                    <AlertTriangle size={18} className="mt-0.5 shrink-0 text-orange-500" />
                    <p className="text-sm font-medium leading-relaxed text-[var(--muted-foreground)]">
                      <strong className="text-[var(--foreground)] font-bold text-base">{sourceServerCount}</strong> server{sourceServerCount === 1 ? '' : 's'} currently on <span className="font-bold text-[var(--foreground)]">{nodeTransfer.sourceNodeId}</span> will be mass-migrated
                      {nodeTransfer.targetNodeId ? (
                        <span> to <span className="font-bold text-[var(--foreground)]">{nodeTransfer.targetNodeId}</span>.</span>
                      ) : (
                        <span>.</span>
                      )}
                    </p>
                  </div>
                )}

                {progress?.mode === 'node' && <TransferProgressCard progress={progress} />}

                <div className="flex justify-end pt-4 border-t border-[var(--border)]/50">
                  <button
                    className={cn(btn, 'group relative flex items-center gap-2 rounded-lg px-8 py-3 text-sm font-bold border-orange-500/40 bg-orange-500/10 text-orange-500 transition-all hover:bg-orange-500 hover:text-black disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none')}
                    disabled={!nodeTransfer.sourceNodeId || !nodeTransfer.targetNodeId || sourceServerCount === 0}
                  >
                    {nodeBusy ? <Loader2 size={18} className="animate-spin" /> : <Server size={18} className="transition-transform group-hover:scale-110" />}
                    {nodeBusy ? 'Evacuating Node…' : 'Evacuate Node'}
                  </button>
                </div>
              </fieldset>
            </form>
          )}
        </Panel>

      </div>
    </div>
  );
}

// Elevated Progress Card Component
function TransferProgressCard({ progress }: { progress: TransferProgress }) {
  const value = Math.max(0, Math.min(100, Math.round(progress.progress || 0)));
  const failed = progress.status === 'failed';
  const complete = progress.status === 'complete';
  const phase = progress.phase.replace(/^server-/, '').replace(/-/g, ' ');

  return (
    <div className={cn(
      'flex flex-col gap-4 rounded-xl border p-5 transition-all shadow-sm',
      failed
        ? 'border-[var(--destructive)]/40 bg-[var(--destructive)]/5'
        : complete
          ? 'border-[var(--success)]/40 bg-[var(--success)]/5'
          : 'border-[var(--border)]/60 bg-[var(--secondary)]/10'
    )}>
      <div className="flex items-start gap-4">
        <div className="shrink-0 mt-0.5">
          {failed ? (
            <AlertCircle size={20} className="text-[var(--destructive)]" />
          ) : complete ? (
            <CheckCircle2 size={20} className="text-[var(--success)]" />
          ) : (
            <Loader2 size={20} className="animate-spin text-[var(--primary)]" />
          )}
        </div>
        
        <div className="flex-1 flex flex-col gap-1 min-w-0">
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs font-bold uppercase tracking-widest text-[var(--foreground)]">{phase}</span>
            <span className="font-mono text-sm font-bold text-[var(--foreground)] tracking-tight">{value}%</span>
          </div>
          <p className="text-sm font-medium text-[var(--muted-foreground)] leading-relaxed">
            {progress.errorMessage || progress.message}
          </p>
        </div>
      </div>

      {/* Sleek Progress Bar */}
      <div
        className="h-2 w-full overflow-hidden rounded-full bg-[var(--secondary)]/40 ring-1 ring-inset ring-[var(--border)]/40"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={value}
        aria-label={progress.message}
      >
        <div
          className={cn(
            'h-full rounded-full transition-all duration-500 ease-out', 
            failed ? 'bg-[var(--destructive)]' : complete ? 'bg-[var(--success)]' : 'bg-[var(--primary)]'
          )}
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}
