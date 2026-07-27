import { AlertCircle, PackageCheck, RefreshCw, ShieldCheck } from 'lucide-react';
import { btn } from '../../lib/constants';
import { EmptyState, Panel, cn } from '../ui';

type UpdateAction = (nodeId: string) => Promise<void>;
type PackageUpgrade = { name: string; current_version?: string; candidate_version?: string };
export type LinuxUpdateResult = {
  message: string; packages: PackageUpgrade[]; reboot_required?: boolean; applied?: boolean;
  distribution?: string; manager?: string; preview_command?: string; apply_command?: string;
};

export function LinuxUpdatesPanel({ agents, results, busy, onPreview, onApply }: {
  agents: any[]; results: Record<string, LinuxUpdateResult>; busy: boolean;
  onPreview: UpdateAction; onApply: UpdateAction;
}) {
  return <Panel className="overflow-hidden border-[var(--border)]/60 bg-[var(--background)]/50">
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border)]/60 bg-[var(--secondary)]/10 px-6 py-4">
      <div className="flex items-center gap-3"><ShieldCheck size={18} /><h3 className="text-sm font-bold">Linux OS Packages</h3></div>
      <span className="text-xs font-semibold text-[var(--muted-foreground)]">Fixed APT, Pacman, DNF, and APK adapters</span>
    </div>
    {agents.length === 0 ? <EmptyState className="py-12 text-center">No Linux nodes are registered.</EmptyState> : <div className="divide-y divide-[var(--border)]/50">
      {agents.map(agent => <LinuxUpdateRow key={agent.nodeId} agent={agent} result={results[agent.nodeId]} busy={busy} onPreview={onPreview} onApply={onApply} />)}
    </div>}
    <div className="border-t border-[var(--border)]/50 px-6 py-3 text-xs text-[var(--muted-foreground)]">The agent detects <code>/etc/os-release</code>; requests contain no executable, arguments, or package names.</div>
  </Panel>;
}

function LinuxUpdateRow({ agent, result, busy, onPreview, onApply }: {
  agent: any; result?: LinuxUpdateResult; busy: boolean; onPreview: UpdateAction; onApply: UpdateAction;
}) {
  const packages = result?.packages || [];
  return <div className="grid gap-4 p-6 lg:grid-cols-[1fr_auto] lg:items-center">
    <div><p className="font-bold">{agent.nodeId}</p><p className="mt-1 text-xs text-[var(--muted-foreground)]">{result ? `${result.distribution || 'Linux'} · ${result.manager || 'package manager'} · ${result.message}` : 'Check this node to detect its distribution and see exactly which packages would change.'}</p></div>
    <div className="flex flex-wrap gap-2 lg:justify-end">
      <button className={cn(btn, 'gap-2')} disabled={busy} onClick={() => onPreview(agent.nodeId)} type="button"><RefreshCw size={14} /> {result ? 'Recheck' : 'Check packages'}</button>
      {!result?.applied && packages.length > 0 && <button className={cn(btn, 'gap-2 bg-amber-400 text-amber-950 hover:bg-amber-300')} disabled={busy} onClick={() => onApply(agent.nodeId)} type="button"><PackageCheck size={14} /> Update {packages.length}</button>}
    </div>
    {result && <div className="grid gap-3 lg:col-span-2">
      <div className="grid gap-1 rounded-lg border border-[var(--border)] bg-[var(--secondary)]/10 p-3 font-mono text-[11px] text-[var(--muted-foreground)]"><span>Preview: {result.preview_command}</span><span>Apply: {result.apply_command}</span></div>
      {packages.length > 0 && <div className="max-h-52 overflow-auto rounded-lg border border-[var(--border)] bg-[var(--secondary)]/10">
        <div className="grid grid-cols-[1fr_1fr_1fr] gap-3 border-b border-[var(--border)] px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-[var(--muted-foreground)]"><span>Package</span><span>Current</span><span>{result.applied ? 'Installed' : 'Candidate'}</span></div>
        {packages.map((item, index) => <div key={`${item.name}-${index}`} className="grid grid-cols-[1fr_1fr_1fr] gap-3 border-b border-[var(--border)]/50 px-3 py-2 font-mono text-xs last:border-0"><span className="truncate">{item.name}</span><span className="truncate text-[var(--muted-foreground)]">{item.current_version || '—'}</span><span className="truncate text-[var(--primary)]">{item.candidate_version}</span></div>)}
      </div>}
      {result.reboot_required && <div className="flex gap-3 rounded-lg border border-amber-400/20 bg-amber-400/5 p-4 text-sm text-amber-800 dark:text-amber-200"><AlertCircle className="mt-0.5 shrink-0" size={17} /><p>A reboot is required to finish applying Linux updates on this node.</p></div>}
    </div>}
  </div>;
}
