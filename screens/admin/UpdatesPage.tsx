import { useEffect, useState, type ReactNode } from 'react';
import { 
  AlertCircle, 
  ArrowRight, 
  CheckCircle2, 
  DownloadCloud, 
  PackageCheck, 
  RefreshCw, 
  Rocket, 
  RotateCcw, 
  ShieldCheck 
} from 'lucide-react';
import { btn } from '../../lib/constants';
import { EmptyState, MetricCell, Panel, cn } from '../../components/ui';
import { requestJson } from '../../lib/http';
import { useConfirm } from '../../components/feedback/FeedbackProvider';
import { useApiAction } from '../../hooks/useApiAction';
import { LinuxUpdatesPanel, type LinuxUpdateResult } from '../../components/admin/LinuxUpdatesPanel';

type UpdateAction = (nodeId: string) => Promise<void>;

export function UpdatesScreen({ apiBase, showToast, canDeployPanel }: { apiBase: string; showToast: (msg: string, type: 'success' | 'error') => void; canDeployPanel: boolean }) {
  const [updates, setUpdates] = useState<any>(null);
  const [panelUpdate, setPanelUpdate] = useState<any>(null);
  const [linuxUpdates, setLinuxUpdates] = useState<Record<string, LinuxUpdateResult>>({});
  const [restartingAgent, setRestartingAgent] = useState<string | null>(null);
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

  const waitForAgentActivation = async (nodeId: string, previousVersion: string) => {
    let lastSnapshot: any;
    for (let attempt = 0; attempt < 30; attempt += 1) {
      await new Promise(resolve => window.setTimeout(resolve, 1500));
      try {
        const snapshot: any = await requestJson(apiBase, '/agents/updates', {});
        lastSnapshot = snapshot;
        const agent = (snapshot?.agents || []).find((item: any) => item.nodeId === nodeId);
        const status = agent?.status || {};
        const version = String(status.version || '');
        const unavailable = Boolean(status.errorMessage || status.error_message);
        const restartRequired = Boolean(status.restartRequired ?? status.restart_required);
        if (agent && !unavailable && !restartRequired && version && version !== previousVersion) {
          setUpdates(snapshot);
          return true;
        }
      } catch {
        // A disconnect is expected while systemd activates the staged binary.
      }
    }
    if (lastSnapshot) setUpdates(lastSnapshot);
    else await fetchUpdates();
    return false;
  };

  useEffect(() => { void fetchUpdates(); }, [apiBase]);

  const stageAgentUpdate: UpdateAction = async nodeId => {
    await run(
      () => requestJson(apiBase, `/agents/${encodeURIComponent(nodeId)}/update`, {}, { method: 'POST' }),
      'Update staged'
    );
    await fetchUpdates();
  };

  const restartAgentForUpdate: UpdateAction = async nodeId => {
    const accepted = await confirm({
      title: 'Restart agent to apply update',
      description: 'The agent will briefly disconnect, activate only the verified staged binary, and automatically restore the previous binary if the new version fails its health window.',
      confirmLabel: 'Restart and update'
    });
    if (!accepted) return;
    const previousVersion = String(
      (updates?.agents || []).find((agent: any) => agent.nodeId === nodeId)?.status?.version || ''
    );
    let requestError: any;
    setRestartingAgent(nodeId);
    try {
      try {
        await requestJson(apiBase, `/agents/${encodeURIComponent(nodeId)}/update/restart`, {}, { method: 'POST' });
      } catch (error) {
        requestError = error;
      }
      if (requestError?.status && requestError.status < 500) {
        showToast(requestError.message || 'Agent update was rejected', 'error');
        return;
      }
      const activated = await waitForAgentActivation(nodeId, previousVersion);
      if (activated) {
        showToast('Agent updated and reconnected', 'success');
      } else if (requestError) {
        showToast(requestError.message || 'Agent update could not be confirmed', 'error');
      } else {
        showToast('Agent restart was scheduled; reconnection is taking longer than expected', 'success');
      }
    } finally {
      setRestartingAgent(null);
    }
  };

  const previewLinuxUpdates: UpdateAction = async nodeId => {
    const result: any = await run(
      () => requestJson(apiBase, `/agents/${encodeURIComponent(nodeId)}/linux-updates`, {}),
      'Linux package list refreshed'
    );
    if (result) setLinuxUpdates(current => ({ ...current, [nodeId]: { ...result, applied: false } }));
  };

  const applyLinuxUpdates: UpdateAction = async nodeId => {
    const preview = linuxUpdates[nodeId];
    const packages = preview?.packages || [];
    if (!packages.length) return;
    const accepted = await confirm({
      title: `Update ${packages.length} Linux packages on ${nodeId}`,
      description: `The agent will recheck with ${preview.manager || 'the detected package manager'}, then run its fixed upgrade adapter. No command or package name is accepted from the browser. ${packages.slice(0, 5).map(item => item.name).join(', ')}${packages.length > 5 ? ', …' : ''}`,
      confirmLabel: 'Update Linux packages'
    });
    if (!accepted) return;
    const result: any = await run(
      () => requestJson(apiBase, `/agents/${encodeURIComponent(nodeId)}/linux-updates`, {}, { method: 'POST' }),
      'Linux package update completed'
    );
    if (result) setLinuxUpdates(current => ({ ...current, [nodeId]: { ...result, applied: true } }));
  };

  return (
    <UpdatesPage
      updates={updates}
      panelUpdate={panelUpdate}
      busy={busy || Boolean(restartingAgent)}
      canDeployPanel={canDeployPanel}
      onApplyUpdate={stageAgentUpdate}
      onRestartUpdate={restartAgentForUpdate}
      linuxUpdates={linuxUpdates}
      onPreviewLinuxUpdates={previewLinuxUpdates}
      onApplyLinuxUpdates={applyLinuxUpdates}
      onCheckPanelUpdate={async () => {
        const result = await run(() => requestJson(apiBase, '/system/updates/check', {}, { method: 'POST' }), 'Release manifests refreshed');
        if (result) setPanelUpdate(result);
      }}
      onDeployPanelUpdate={async () => {
        const automaticDeployment = Boolean(panelUpdate?.deployCommandConfigured);
        const managed = (panelUpdate?.managedComponents || ['api']).join(' and ');
        const accepted = await confirm({
          title: automaticDeployment ? 'Deploy available updates' : 'Stage available updates',
          description: automaticDeployment
            ? `Newer ${managed} releases managed on this host will be downloaded, checksum-verified, and handed to the native deployment supervisor.`
            : `Newer ${managed} releases managed on this host will be downloaded and checksum-verified, but they will remain staged until you manually start the native update supervisor.`,
          confirmLabel: automaticDeployment ? 'Verify and deploy' : 'Verify and stage'
        });
        if (!accepted) return;
        await run(
          () => requestJson(apiBase, '/system/updates/deploy', {}, { method: 'POST' }),
          automaticDeployment ? 'Panel update handed to the deployment supervisor' : 'Panel update verified and staged for manual installation'
        );
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
  onRestartUpdate,
  linuxUpdates,
  onPreviewLinuxUpdates,
  onApplyLinuxUpdates,
  onCheckPanelUpdate,
  onDeployPanelUpdate
}: {
  updates: any;
  panelUpdate: any;
  busy: boolean;
  canDeployPanel: boolean;
  onApplyUpdate: UpdateAction;
  onRestartUpdate: UpdateAction;
  linuxUpdates: Record<string, LinuxUpdateResult>;
  onPreviewLinuxUpdates: UpdateAction;
  onApplyLinuxUpdates: UpdateAction;
  onCheckPanelUpdate: () => Promise<void>;
  onDeployPanelUpdate: () => Promise<void>;
}) {
  const agents = updates?.agents || [];
  const restartRequired = agents.filter((agent: any) => Boolean(agent.canRestartUpdate)).length;
  const panelState = panelUpdate?.state || {};
  const apiRelease = panelUpdate?.components?.api || {};
  const frontendRelease = panelUpdate?.components?.frontend || {};
  const deploymentReady = Boolean(panelUpdate?.deployCommandConfigured);
  const managedComponents: string[] = panelUpdate?.managedComponents || ['api'];
  const unmanagedComponents = ['api', 'frontend'].filter(component => !managedComponents.includes(component));
  
  const releaseMessage = apiRelease.manifestError || frontendRelease.manifestError
    || [apiRelease.manifest?.releaseNotes, frontendRelease.manifest?.releaseNotes].filter(Boolean).join('\n\n')
    || 'The latest component releases have no release notes.';
  
  const targets = panelState.targetVersions || (panelState.targetVersion ? { api: panelState.targetVersion, frontend: panelState.targetVersion } : {});
  const hasPanelUpdate = Boolean(apiRelease.updateAvailable) || Boolean(frontendRelease.updateAvailable);

  return (
    <div className="mx-auto grid max-w-[1200px] gap-8 pb-12">
      <div>
        <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">Updates<span className="text-[var(--primary)]">.</span></h2>
        <p className="mt-2 text-sm font-medium text-[var(--muted-foreground)]/80">
          Deploy host-native panel releases and safely activate verified Rust agent updates.
        </p>
      </div>

      {/* --- PANEL UPDATES --- */}
      <Panel className="overflow-hidden border-[var(--border)]/60 bg-[var(--background)]/50">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border)]/60 bg-[var(--secondary)]/10 px-6 py-4">
          <div className="flex items-center gap-3">
            <Rocket size={18} className={hasPanelUpdate ? "text-[var(--primary)]" : "text-[var(--muted-foreground)]"} />
            <h3 className="text-sm font-bold">Host-Native Releases</h3>
          </div>
          <StatusPill status={panelState.status || (hasPanelUpdate ? 'update available' : 'up to date')} />
        </div>
        
        <div className="grid divide-y divide-[var(--border)]/50 sm:grid-cols-3 sm:divide-x sm:divide-y-0 p-2 sm:p-0">
          <UpgradeCell label="API Version" current={panelUpdate?.current?.api} latest={apiRelease.latestVersion} />
          <UpgradeCell label="Frontend Version" current={panelUpdate?.current?.frontend} latest={frontendRelease.latestVersion} />
          <MetricCell label="Deployment Mode" value={panelUpdate === null ? 'Checking' : deploymentReady ? 'Automatic' : 'Manual'} accent={deploymentReady} />
        </div>

        {/* Contextual Warnings moved inside the panel */}
        <div className="flex flex-col gap-3 px-6 pt-4">
          {!deploymentReady && panelUpdate !== null && (
            <Warning>Automatic deployment is unavailable. Releases can still be downloaded, verified, and staged, but they will not be installed until you manually run <code className="font-mono">sudo systemctl start agapornis-panel-update.service</code>.</Warning>
          )}
          {unmanagedComponents.length > 0 && panelUpdate !== null && (
            <Warning>The {unmanagedComponents.join(' and ')} installation is not managed by this updater host. Update it on the host where it is installed.</Warning>
          )}
        </div>

        <div className="grid gap-5 border-t border-[var(--border)]/50 p-6 mt-4 lg:grid-cols-[1fr_auto] lg:items-center">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-sm font-bold"><ShieldCheck size={16} className="text-[var(--success)]" /> Checksum-verified native rollout with health rollback</div>
            <p className="mt-2 max-w-3xl whitespace-pre-line text-xs leading-5 text-[var(--muted-foreground)]">{panelState.errorMessage || releaseMessage}</p>
            {Object.keys(targets).length > 0 && (
              <p className="mt-2 text-[10px] font-bold uppercase tracking-wider text-[var(--muted-foreground)]">
                Target {Object.entries(targets).map(([component, version]) => `${component} ${version}`).join(' · ')}
                {panelState.applyStartedAt ? ` · handed off ${new Date(panelState.applyStartedAt).toLocaleString()}` : ''}
              </p>
            )}
          </div>
          <div className="flex flex-wrap gap-2 lg:justify-end">
            <button className={cn(btn, 'gap-2 bg-[var(--foreground)] text-[var(--foreground)] hover:bg-[var(--foreground)]/70')} disabled={busy} onClick={onCheckPanelUpdate} type="button">
              <RefreshCw size={14} className={cn(busy && 'animate-spin')} /> Check releases
            </button>
            <button className={cn(btn, 'gap-2', hasPanelUpdate && 'bg-[var(--primary)] text-[var(--primary-foreground)]')} disabled={busy || !canDeployPanel || !panelUpdate?.deployableUpdateAvailable || ['staging', 'staged', 'applying'].includes(panelState.status)} onClick={onDeployPanelUpdate} title={!canDeployPanel ? 'Only the owner can stage panel updates' : undefined} type="button">
              <Rocket size={14} /> {deploymentReady ? 'Verify & deploy' : 'Verify & stage'}
            </button>
          </div>
        </div>
      </Panel>

      {/* --- AGENT READINESS --- */}
      <Panel className="overflow-hidden border-[var(--border)]/60 bg-[var(--background)]/50">
        <div className="flex items-center justify-between border-b border-[var(--border)]/60 bg-[var(--secondary)]/10 px-6 py-4">
          <div className="flex items-center gap-3">
            <PackageCheck size={18} />
            <h3 className="text-sm font-bold">Agent Fleet Configuration</h3>
          </div>
        </div>
        
        <div className="grid divide-y divide-[var(--border)]/50 sm:grid-cols-2 sm:divide-x sm:divide-y-0 xl:grid-cols-4">
          <MetricCell label="Latest release" value={updates === null ? 'Checking' : updates?.latestVersion || 'Unavailable'} mono accent={Boolean(updates?.latestVersion)} />
          <MetricCell label="SHA-256" value={updates === null ? 'Checking' : updates?.sha256Configured ? 'Configured' : 'Missing'} accent={Boolean(updates?.sha256Configured)} />
          <MetricCell label="Agents reporting" value={agents.length} />
          <MetricCell label="Restart pending" value={restartRequired} accent={restartRequired > 0} />
        </div>

        {!updates?.artifactUrlConfigured && updates !== null && (
          <div className="p-4 sm:px-6">
            <Warning>No Rust agent release manifest is available. Publish a tagged release in <code className="font-mono">agapornis-agent-rust</code>, or configure an artifact URL and SHA-256 manually.</Warning>
          </div>
        )}
      </Panel>

      {/* --- FLEET NODES --- */}
      <Panel className="overflow-hidden border-[var(--border)]/60 bg-[var(--background)]/50">
        <div className="flex items-center justify-between border-b border-[var(--border)]/60 bg-[var(--secondary)]/10 px-6 py-4">
          <div className="flex items-center gap-3"><DownloadCloud size={18} /><h3 className="text-sm font-bold">Fleet Nodes</h3></div>
          <span className="text-xs font-semibold text-[var(--muted-foreground)]">{agents.length} nodes reporting</span>
        </div>

        {agents.length === 0 ? (
          <EmptyState className="py-16 text-center">{updates === null ? 'Reading agent versions…' : 'No agents are registered.'}</EmptyState>
        ) : (
          <div className="divide-y divide-[var(--border)]/50">
            {agents.map((agent: any) => (
              <AgentUpdateRow
                key={agent.nodeId}
                agent={agent}
                busy={busy}
                artifactSourceReady={Boolean(updates?.artifactUrlConfigured)}
                onApplyUpdate={onApplyUpdate}
                onRestartUpdate={onRestartUpdate}
              />
            ))}
          </div>
        )}
      </Panel>

      <LinuxUpdatesPanel agents={agents} results={linuxUpdates} busy={busy} onPreview={onPreviewLinuxUpdates} onApply={onApplyLinuxUpdates} />

      <div className="flex items-center justify-center gap-2 text-xs text-[var(--muted-foreground)]">
        <CheckCircle2 size={14} className="text-[var(--success)]" /> Agent restart is available only for verified staged updates.
      </div>
    </div>
  );
}

/* --- REFACTORED SUB-COMPONENTS --- */

function AgentUpdateRow({ agent, busy, artifactSourceReady, onApplyUpdate, onRestartUpdate }: { agent: any; busy: boolean; artifactSourceReady: boolean; onApplyUpdate: UpdateAction; onRestartUpdate: UpdateAction }) {
  const status = agent.status || {};
  const pendingRestart = Boolean(status.restart_required ?? status.restartRequired);
  const pendingArtifact = String(status.pending_artifact || status.pendingArtifact || '').trim();
  const errorMessage = status.error_message || status.errorMessage;
  const updateAvailable = Boolean(agent.updateAvailable);
  
  const actionableRestart = pendingRestart && updateAvailable;
  const canRestartUpdate = Boolean(agent.canRestartUpdate && actionableRestart && pendingArtifact);
  const canStageUpdate = Boolean(agent.updateAvailable && artifactSourceReady && !pendingRestart);
  
  const isUpToDate = !updateAvailable && !pendingRestart;

  return (
    <div className="grid gap-5 p-6 transition-colors hover:bg-[var(--secondary)]/10 lg:grid-cols-[1.5fr_1.5fr_auto] lg:items-center">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className={cn('h-2 w-2 rounded-full', errorMessage ? 'bg-[var(--destructive)]' : actionableRestart ? 'bg-amber-400 animate-pulse' : 'bg-[var(--success)]')} />
          <p className="truncate font-bold">{agent.nodeId}</p>
        </div>
        <p className="mt-1 truncate text-xs text-[var(--muted-foreground)]">{agent.fqdn || agent.grpcAddress || 'Address unavailable'} · {status.runtime_identifier || status.runtimeIdentifier || 'Unknown OS'}</p>
      </div>

      <div>
        <UpgradeCell 
          label="Version Status" 
          current={status.version} 
          latest={agent.latestVersion} 
          inline 
        />
      </div>

      <div className="flex flex-col items-end gap-2">
        {isUpToDate ? (
          <div className="flex h-9 items-center gap-2 px-4 text-sm font-bold text-[var(--success)]">
            <CheckCircle2 size={16} /> Up to date
          </div>
        ) : (
          <button
            className={cn(
              btn, 
              'inline-flex min-w-40 items-center justify-center gap-2 rounded-lg px-4 py-2 text-xs font-bold transition-all', 
              canRestartUpdate ? 'bg-amber-400 text-amber-950 hover:bg-amber-300 shadow-md shadow-amber-400/20' : 'bg-[var(--secondary)] hover:bg-[var(--primary)] hover:text-[var(--primary-foreground)]'
            )}
            disabled={busy || Boolean(errorMessage) || (!canRestartUpdate && !canStageUpdate)}
            onClick={() => canRestartUpdate ? onRestartUpdate(agent.nodeId) : onApplyUpdate(agent.nodeId)}
            type="button"
          >
            {canRestartUpdate ? <RotateCcw size={14} /> : <RefreshCw size={14} className={cn(busy && 'animate-spin')} />}
            {canRestartUpdate ? 'Restart & apply' : canStageUpdate ? 'Stage update' : 'Unavailable'}
          </button>
        )}
      </div>

      {(actionableRestart || errorMessage) && (
        <div className={cn('flex items-center gap-2 rounded-lg border px-3 py-2 text-xs lg:col-span-3', errorMessage ? 'border-red-400/20 bg-red-400/5 text-red-700 dark:text-red-300' : 'border-amber-400/20 bg-amber-400/5 text-amber-800 dark:text-amber-200')}>
          {errorMessage ? <AlertCircle size={14} /> : <RotateCcw size={14} />}
          <span>{errorMessage || (canRestartUpdate ? `Verified update staged at ${pendingArtifact}. Ready for restart.` : 'A restart is reported, but no valid staged update artifact is available.')}</span>
        </div>
      )}
    </div>
  );
}

/** * New Component: Visually maps the upgrade path (e.g., v1.1.0 -> v1.2.0) 
 */
function UpgradeCell({ label, current, latest, inline = false }: { label: string; current: string; latest: string, inline?: boolean }) {
  const isChecking = current === 'Checking' || current === undefined || current === null;
  const isUpToDate = current === latest || !latest || latest === 'Unavailable';

  return (
    <div className={cn("flex flex-col gap-1 p-4 lg:px-6", inline && "p-0 lg:px-0")}>
      <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted-foreground)]">{label}</span>
      {isChecking ? (
        <span className="font-mono text-sm text-[var(--muted-foreground)]">Checking...</span>
      ) : isUpToDate ? (
        <div className="flex items-center gap-2 font-mono text-sm font-semibold text-[var(--muted-foreground)]">
           {current || 'Unknown'}
        </div>
      ) : (
        <div className="flex items-center gap-2 font-mono text-sm">
          <span className="text-[var(--muted-foreground)]">{current || 'Unknown'}</span>
          <ArrowRight size={14} className="text-[var(--primary)]" />
          <span className="font-bold text-[var(--primary)]">{latest}</span>
        </div>
      )}
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const isError = ['failed', 'error'].includes(status);
  const isSuccess = ['completed', 'up to date'].includes(status);
  const isActionable = ['update available', 'staged', 'pending'].includes(status);
  
  return (
    <span className={cn(
      'flex items-center gap-1.5 rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-wider transition-colors', 
      isError && 'border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-400',
      isSuccess && 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
      isActionable && 'border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400',
      !isError && !isSuccess && !isActionable && 'border-[var(--border)] text-[var(--muted-foreground)]'
    )}>
      {isActionable && <span className="relative flex h-1.5 w-1.5"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span><span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-amber-500"></span></span>}
      {status}
    </span>
  );
}

function Warning({ children }: { children: ReactNode }) {
  return (
    <div className="flex gap-3 rounded-lg border border-amber-400/20 bg-amber-400/5 p-4 text-sm text-amber-800 dark:text-amber-200">
      <AlertCircle className="mt-0.5 shrink-0" size={17} />
      <p>{children}</p>
    </div>
  );
}
