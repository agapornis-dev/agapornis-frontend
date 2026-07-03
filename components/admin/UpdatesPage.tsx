import { useEffect, useState } from 'react';
import { AlertCircle, CheckCircle2, DownloadCloud, PackageCheck, RefreshCw, Rocket, RotateCcw, ShieldCheck } from 'lucide-react';
import { btn } from '../../lib/constants';
import { EmptyState, MetricCell, Panel, cn } from '../ui';
import { requestJson } from '../../lib/http';
import { useConfirm } from '../feedback/FeedbackProvider';
import { useApiAction } from '../../hooks/useApiAction';

/* ── Self-contained screen (data fetching + UI) ─────────────────────── */

export function UpdatesScreen({ apiBase, showToast, canDeployPanel }: { apiBase: string; showToast: (msg: string, type: 'success' | 'error') => void; canDeployPanel: boolean }) {
  const [updates, setUpdates] = useState<any>(null);
  const [panelUpdate, setPanelUpdate] = useState<any>(null);
  const { busy, run } = useApiAction(showToast);
  const confirm = useConfirm();

  const fetchUpdates = async () => {
    const [nextUpdates, nextPanelUpdate] = await Promise.all([
      requestJson(apiBase, '/agents/updates', {}).catch(() => null),
      requestJson(apiBase, '/system/updates', {}).catch(() => null)
    ]);
    setUpdates(nextUpdates);
    setPanelUpdate(nextPanelUpdate);
  };

  useEffect(() => { void fetchUpdates(); }, [apiBase]);

  return (
    <UpdatesPage
      updates={updates} panelUpdate={panelUpdate} busy={busy} canDeployPanel={canDeployPanel}
      onApplyUpdate={async (nodeId) => { await run(async () => { const r: any = await requestJson(apiBase, `/agents/${nodeId}/update`, {}, { method: 'POST', body: JSON.stringify({}) }); return r; }, 'Update staged'); await fetchUpdates(); }}
      onCheckPanelUpdate={async () => { const result = await run(() => requestJson(apiBase, '/system/updates/check', {}, { method: 'POST' }), 'Release manifest refreshed'); if (result) setPanelUpdate(result); }}
      onDeployPanelUpdate={async () => {
        const accepted = await confirm({ title: 'Deploy panel update', description: 'Both API and frontend artifacts will be downloaded, checksum-verified, and handed to the configured deployment supervisor. Active requests may reconnect while replicas restart.', confirmLabel: 'Verify and deploy' });
        if (!accepted) return;
        await run(() => requestJson(apiBase, '/system/updates/deploy', {}, { method: 'POST' }), 'Panel update handed to the deployment supervisor');
        await fetchUpdates();
      }}
    />
  );
}

export function UpdatesPage({
  updates,
  panelUpdate,
  busy,
  canDeployPanel,
  onApplyUpdate,
  onCheckPanelUpdate,
  onDeployPanelUpdate
}: {
  updates: any;
  panelUpdate: any;
  busy: boolean;
  canDeployPanel: boolean;
  onApplyUpdate: (nodeId: string) => Promise<void>;
  onCheckPanelUpdate: () => Promise<void>;
  onDeployPanelUpdate: () => Promise<void>;
}) {
  const agents = updates?.agents || [];
  const restartRequired = agents.filter((agent: any) => Boolean(agent.status?.restart_required ?? agent.status?.restartRequired)).length;
  const panelState = panelUpdate?.state || {};
  const panelManifest = panelUpdate?.manifest;
  const deploymentReady = Boolean(panelUpdate?.deployCommandConfigured);

  return (
    <div className="mx-auto grid max-w-[1200px] gap-8 pb-12">
      <div>
        <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">Updates<span className="text-[var(--primary)]">.</span></h2>
        <p className="mt-2 text-sm font-medium text-[var(--muted-foreground)]/80">
          Verify and deploy coordinated panel releases, then manage node-agent versions across the fleet.
        </p>
      </div>

      <Panel className="overflow-hidden border-[var(--border)]/60 bg-[var(--background)]/50">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border)]/60 bg-[var(--secondary)]/10 px-6 py-4">
          <div className="flex items-center gap-3"><Rocket size={18} /><h3 className="text-sm font-bold">API & frontend release</h3></div>
          <span className={cn('rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider', panelState.status === 'failed' ? 'border-red-400/20 bg-red-400/5 text-red-300' : panelState.status === 'completed' ? 'border-emerald-400/20 bg-emerald-400/5 text-emerald-300' : 'border-[var(--border)] text-[var(--muted-foreground)]')}>{panelState.status || 'idle'}</span>
        </div>
        <div className="grid divide-y divide-[var(--border)]/50 sm:grid-cols-2 sm:divide-x sm:divide-y-0 xl:grid-cols-4">
          <MetricCell label="API installed" value={panelUpdate?.current?.api || (panelUpdate === null ? 'Checking' : 'Unknown')} mono />
          <MetricCell label="Frontend installed" value={panelUpdate?.current?.frontend || (panelUpdate === null ? 'Checking' : 'Unknown')} mono />
          <MetricCell label="Latest release" value={panelManifest?.version || 'Unavailable'} mono accent={Boolean(panelUpdate?.updateAvailable)} />
          <MetricCell label="Deployment hook" value={panelUpdate === null ? 'Checking' : panelUpdate?.deployCommandConfigured ? 'Ready' : 'Missing'} accent={Boolean(panelUpdate?.deployCommandConfigured)} />
        </div>
        <div className="grid gap-5 border-t border-[var(--border)]/50 p-6 lg:grid-cols-[1fr_auto] lg:items-center">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-sm font-bold"><ShieldCheck size={16} className="text-[var(--success)]" /> Checksum-verified coordinated rollout</div>
            <p className="mt-2 max-w-3xl whitespace-pre-line text-xs leading-5 text-[var(--muted-foreground)]">
              {panelUpdate?.manifestError || panelState.errorMessage || panelManifest?.releaseNotes || 'The latest GitHub release has no release notes.'}
            </p>
            {panelState.targetVersion && <p className="mt-2 text-[10px] font-bold uppercase tracking-wider text-[var(--muted-foreground)]">Target {panelState.targetVersion}{panelState.applyStartedAt ? ` · handed off ${new Date(panelState.applyStartedAt).toLocaleString()}` : ''}</p>}
          </div>
          <div className="flex flex-wrap gap-2 lg:justify-end">
            <button className={cn(btn, 'gap-2 bg-[var(--secondary)] text-[var(--foreground)] hover:bg-[var(--secondary)]/70')} disabled={busy} onClick={onCheckPanelUpdate} type="button"><RefreshCw size={14} className={cn(busy && 'animate-spin')} /> Check release</button>
            <button className={cn(btn, 'gap-2')} disabled={busy || !canDeployPanel || !deploymentReady || !panelUpdate?.updateAvailable || ['staging', 'applying'].includes(panelState.status)} onClick={onDeployPanelUpdate} title={!canDeployPanel ? 'Only the owner can deploy panel updates' : undefined} type="button"><Rocket size={14} /> Verify & deploy</button>
          </div>
        </div>
      </Panel>

      {!deploymentReady && panelUpdate !== null && (
        <div className="flex gap-3 rounded-lg border border-amber-400/20 bg-amber-400/5 p-4 text-sm text-amber-200">
          <AlertCircle className="mt-0.5 shrink-0" size={17} />
          <p>The release source is built in. Set <code className="font-mono">AGAPORNIS_PANEL_UPDATE_COMMAND</code> to enable deployment; it receives verified API/frontend release details through environment variables.</p>
        </div>
      )}

      <Panel className="overflow-hidden border-[var(--border)]/60 bg-[var(--background)]/50">
        <div className="flex items-center gap-3 border-b border-[var(--border)]/60 bg-[var(--secondary)]/10 px-6 py-4">
          <PackageCheck size={18} /><h3 className="text-sm font-bold">Agent update readiness</h3>
        </div>
        <div className="grid divide-y divide-[var(--border)]/50 sm:grid-cols-2 sm:divide-x sm:divide-y-0 xl:grid-cols-4">
          <MetricCell label="Release source" value={updates === null ? 'Checking' : updates?.artifactUrlConfigured ? 'Configured' : 'Missing'} accent={Boolean(updates?.artifactUrlConfigured)} />
          <MetricCell label="SHA-256" value={updates === null ? 'Checking' : updates?.sha256Configured ? 'Configured' : 'Missing'} accent={Boolean(updates?.sha256Configured)} />
          <MetricCell label="Agents reporting" value={agents.length} />
          <MetricCell label="Restart required" value={restartRequired} />
        </div>
      </Panel>

      {!updates?.artifactUrlConfigured && updates !== null && (
        <div className="flex gap-3 rounded-lg border border-amber-400/20 bg-amber-400/5 p-4 text-sm text-amber-200">
          <AlertCircle className="mt-0.5 shrink-0" size={17} />
          <p>Set <code className="font-mono">AGAPORNIS_AGENT_UPDATE_URL</code> before staging releases. Production updates also require <code className="font-mono">AGAPORNIS_AGENT_UPDATE_SHA256</code>.</p>
        </div>
      )}

      <Panel className="overflow-hidden border-[var(--border)]/60 bg-[var(--background)]/50">
        <div className="flex items-center justify-between border-b border-[var(--border)]/60 bg-[var(--secondary)]/10 px-6 py-4">
          <div className="flex items-center gap-3"><DownloadCloud size={18} /><h3 className="text-sm font-bold">Fleet versions</h3></div>
          <span className="text-xs font-semibold text-[var(--muted-foreground)]">{agents.length} nodes</span>
        </div>

        {agents.length === 0 ? (
          <EmptyState className="py-16 text-center">{updates === null ? 'Reading agent versions…' : 'No agents are registered.'}</EmptyState>
        ) : (
          <div className="divide-y divide-[var(--border)]/50">
            {agents.map((agent: any) => {
              const status = agent.status || {};
              const pendingRestart = Boolean(status.restart_required ?? status.restartRequired);
              const errorMessage = status.error_message || status.errorMessage;
              return (
                <div key={agent.nodeId} className="grid gap-5 p-6 transition-colors hover:bg-[var(--secondary)]/10 lg:grid-cols-[1fr_1fr_auto] lg:items-center">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={cn('h-2 w-2 rounded-full', errorMessage ? 'bg-[var(--destructive)]' : 'bg-[var(--success)]')} />
                      <p className="truncate font-bold">{agent.nodeId}</p>
                    </div>
                    <p className="mt-1 truncate text-xs text-[var(--muted-foreground)]">{agent.fqdn || agent.grpcAddress || 'Address unavailable'}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted-foreground)]">Version</p>
                      <p className="mt-1 font-mono font-semibold">{status.version || 'Unknown'}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted-foreground)]">Runtime</p>
                      <p className="mt-1 truncate font-mono font-semibold">{status.runtime_identifier || status.runtimeIdentifier || 'Unknown'}</p>
                    </div>
                  </div>

                  <button
                    className={cn(btn, 'inline-flex min-w-36 items-center justify-center gap-2 rounded-lg bg-[var(--secondary)] px-4 py-2 text-xs font-bold hover:bg-[var(--primary)] hover:text-[var(--primary-foreground)]')}
                    disabled={busy || !updates?.artifactUrlConfigured || Boolean(errorMessage)}
                    onClick={() => onApplyUpdate(agent.nodeId)}
                    type="button"
                  >
                    <RefreshCw size={14} className={cn(busy && 'animate-spin')} /> Stage update
                  </button>

                  {(pendingRestart || errorMessage) && (
                    <div className={cn('lg:col-span-3 flex items-center gap-2 rounded-lg border px-3 py-2 text-xs', errorMessage ? 'border-red-400/20 bg-red-400/5 text-red-300' : 'border-amber-400/20 bg-amber-400/5 text-amber-300')}>
                      {errorMessage ? <AlertCircle size={14} /> : <RotateCcw size={14} />}
                      <span>{errorMessage || `Restart pending for ${status.pending_artifact || status.pendingArtifact || 'the staged release'}`}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Panel>

      <div className="flex items-center gap-2 text-xs text-[var(--muted-foreground)]">
        <CheckCircle2 size={14} className="text-[var(--success)]" /> Updates are downloaded and staged by the agent; this page does not replace the running binary silently.
      </div>
    </div>
  );
}
