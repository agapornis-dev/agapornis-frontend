import { Eye, Filter, Search, ShieldAlert, ShieldCheck } from 'lucide-react';
import { useMemo, useState } from 'react';
import { LiveConnectionState } from '../../hooks/useAgentHealth';
import { CrowdSecAlert, CrowdSecNodeTelemetry } from '../../lib/types';
import { EmptyState, MetricCell, Panel, cn } from '../ui';
import { LiveStatus } from '../feedback/LoadingStates';
import { BanManagementPanel } from './BanManagementPanel';

type SortMode = 'newest' | 'oldest' | 'events';

export function SecurityEventsPage({ nodes, connection, apiBase, showToast }: { nodes: CrowdSecNodeTelemetry[]; connection: LiveConnectionState; apiBase: string; showToast: (message: string, tone?: any) => void }) {
  const [query, setQuery] = useState('');
  const [nodeFilter, setNodeFilter] = useState('all');
  const [severityFilter, setSeverityFilter] = useState('all');
  const [sort, setSort] = useState<SortMode>('newest');
  const allAlerts = useMemo(() => nodes.flatMap(node => node.alerts || []), [nodes]);
  const alerts = useMemo(() => {
    const search = query.trim().toLowerCase();
    return allAlerts
      .filter(alert => nodeFilter === 'all' || alert.nodeId === nodeFilter)
      .filter(alert => severityFilter === 'all' || alert.severity === severityFilter)
      .filter(alert => !search || [alert.scenario, alert.message, alert.sourceIp, alert.sourceValue, alert.sourceCountry, alert.sourceAsName, alert.nodeId]
        .some(value => String(value || '').toLowerCase().includes(search)))
      .sort((left, right) => {
        if (sort === 'events') return right.eventsCount - left.eventsCount;
        const difference = timestamp(right.createdAt) - timestamp(left.createdAt);
        return sort === 'newest' ? difference : -difference;
      });
  }, [allAlerts, nodeFilter, query, severityFilter, sort]);
  const activeNodes = nodes.filter(node => node.status === 'active');
  const highSignals = allAlerts.filter(alert => alert.severity === 'high').length;
  const affectedSources = new Set(allAlerts.map(alert => alert.sourceIp || alert.sourceValue).filter(Boolean)).size;

  return (
    <div className="mx-auto grid max-w-[1600px] gap-8 pb-12">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-[var(--muted-foreground)]">
            <Eye size={14} /> Read-only security visibility
          </div>
          <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">CrowdSec Events<span className="text-[var(--primary)]">.</span></h2>
          <p className="mt-2 max-w-3xl text-sm font-medium text-[var(--muted-foreground)]/80">
            Fleet-wide detections grouped for investigation. This dashboard cannot ban, delete, or change CrowdSec decisions.
          </p>
        </div>
        <LiveStatus state={connection} label="Security stream" />
      </div>

      <BanManagementPanel apiBase={apiBase} showToast={showToast} />

      <Panel className="overflow-hidden border-[var(--border)]/60 bg-[var(--background)]/50">
        <div className="flex items-center gap-3 border-b border-[var(--border)]/60 bg-[var(--secondary)]/10 px-6 py-4">
          <ShieldAlert size={18} />
          <h3 className="text-sm font-bold">Detection overview</h3>
        </div>
        <div className="grid divide-y divide-[var(--border)]/50 sm:grid-cols-2 sm:divide-x sm:divide-y-0 xl:grid-cols-4">
          <MetricCell label="Reporting nodes" value={`${activeNodes.length} / ${nodes.length}`} accent />
          <MetricCell label="Visible alerts" value={allAlerts.length} />
          <MetricCell label="High signals" value={highSignals} />
          <MetricCell label="Affected sources" value={affectedSources} />
        </div>
      </Panel>

      <Panel className="overflow-hidden border-[var(--border)]/60 bg-[var(--background)]/50">
        <div className="flex items-center justify-between border-b border-[var(--border)]/60 bg-[var(--secondary)]/10 px-6 py-4">
          <div className="flex items-center gap-3"><ShieldCheck size={18} /><h3 className="text-sm font-bold">Node coverage</h3></div>
          <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--muted-foreground)]">Linux · local opt-in</span>
        </div>
        {nodes.length === 0 ? (
          <EmptyState className="py-10 text-center">Connecting to registered nodes…</EmptyState>
        ) : (
          <div className="grid divide-y divide-[var(--border)]/50 md:grid-cols-2 md:divide-x md:divide-y-0 xl:grid-cols-3">
            {nodes.map(node => <NodeCoverage key={node.nodeId} node={node} />)}
          </div>
        )}
      </Panel>

      <Panel className="overflow-hidden border-[var(--border)]/60 bg-[var(--background)]/50">
        <div className="border-b border-[var(--border)]/60 bg-[var(--secondary)]/10 p-4">
          <div className="grid gap-3 lg:grid-cols-[1fr_12rem_11rem_11rem]">
            <label className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)]" size={15} />
              <input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search scenario, IP, country, node…" className="h-10 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] pl-9 pr-3 text-sm outline-none focus:border-[var(--foreground)]" />
            </label>
            <FilterSelect label="Node" value={nodeFilter} onChange={setNodeFilter} options={[['all', 'All nodes'], ...nodes.map(node => [node.nodeId, node.nodeId])]} />
            <FilterSelect label="Severity" value={severityFilter} onChange={setSeverityFilter} options={[["all", "All severity"], ["high", "High"], ["medium", "Medium"], ["low", "Low"]]} />
            <FilterSelect label="Sort" value={sort} onChange={value => setSort(value as SortMode)} options={[["newest", "Newest"], ["oldest", "Oldest"], ["events", "Event count"]]} />
          </div>
        </div>

        <div className="flex items-center justify-between border-b border-[var(--border)]/50 px-5 py-3 text-xs font-semibold text-[var(--muted-foreground)]">
          <span className="flex items-center gap-2"><Filter size={13} /> {alerts.length} matching alerts</span>
          <span>No response actions available</span>
        </div>

        {alerts.length === 0 ? (
          <EmptyState className="py-16 text-center">{allAlerts.length ? 'No alerts match the current filters.' : 'No CrowdSec alerts were returned by enabled nodes.'}</EmptyState>
        ) : (
          <div className="divide-y divide-[var(--border)]/50">
            {alerts.map((alert, index) => <AlertRow key={`${alert.nodeId}:${alert.id}:${index}`} alert={alert} />)}
          </div>
        )}
      </Panel>
    </div>
  );
}

function NodeCoverage({ node }: { node: CrowdSecNodeTelemetry }) {
  const active = node.status === 'active';
  const tone = active ? 'text-emerald-300 bg-emerald-400/10 border-emerald-400/20' : node.status === 'disabled' ? 'text-[var(--muted-foreground)] bg-[var(--secondary)] border-[var(--border)]' : 'text-amber-300 bg-amber-400/10 border-amber-400/20';
  return (
    <div className="min-w-0 p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-bold">{node.nodeId}</p>
          <p className="truncate text-xs text-[var(--muted-foreground)]">{node.fqdn || 'No FQDN'}</p>
        </div>
        <span className={cn('rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider', tone)}>{node.status}</span>
      </div>
      <p className="mt-4 text-sm font-semibold">{node.alerts?.length || 0} alerts visible</p>
      {node.status === 'disabled' && (
        <p className="mt-2 text-xs leading-5 text-[var(--muted-foreground)]">
          Enable locally with <code className="text-[var(--foreground)]">AGAPORNIS_CROWDSEC_ENABLED=true</code> or the agent config file.
        </p>
      )}
      {node.errorMessage && <p className="mt-2 break-words text-xs leading-5 text-amber-300/80">{node.errorMessage}</p>}
    </div>
  );
}

function AlertRow({ alert }: { alert: CrowdSecAlert }) {
  const source = alert.sourceIp || alert.sourceValue || 'Unknown source';
  return (
    <article className="grid gap-4 px-5 py-5 transition-colors hover:bg-[var(--secondary)]/10 lg:grid-cols-[8rem_1.2fr_1fr_10rem_9rem] lg:items-center">
      <div>
        <SeverityBadge severity={alert.severity} />
        {alert.simulated && <p className="mt-1 text-[10px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">simulated</p>}
      </div>
      <div className="min-w-0">
        <p className="truncate text-sm font-bold">{alert.scenario || alert.message || 'CrowdSec detection'}</p>
        <p className="mt-1 text-xs text-[var(--muted-foreground)]">{alert.nodeId} · {formatDate(alert.createdAt)}</p>
      </div>
      <div className="min-w-0">
        <p className="truncate font-mono text-sm font-semibold">{source}</p>
        <p className="mt-1 truncate text-xs text-[var(--muted-foreground)]">{[alert.sourceCountry, alert.sourceAsName].filter(Boolean).join(' · ') || alert.sourceScope || 'No enrichment'}</p>
      </div>
      <div>
        <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted-foreground)]">Events</p>
        <p className="mt-1 text-sm font-bold">{alert.eventsCount}</p>
      </div>
      <div>
        <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted-foreground)]">Decision</p>
        <p className="mt-1 text-sm font-bold">{alert.decisionType || (alert.remediation ? 'remediation' : 'observe')}</p>
        {alert.decisionDuration && <p className="text-xs text-[var(--muted-foreground)]">{alert.decisionDuration}</p>}
      </div>
    </article>
  );
}

function SeverityBadge({ severity }: { severity: CrowdSecAlert['severity'] }) {
  const styles = severity === 'high'
    ? 'border-red-400/20 bg-red-400/10 text-red-300'
    : severity === 'medium'
      ? 'border-amber-400/20 bg-amber-400/10 text-amber-300'
      : 'border-sky-400/20 bg-sky-400/10 text-sky-300';
  return <span className={cn('inline-flex rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider', styles)}>{severity}</span>;
}

function FilterSelect({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: string[][] }) {
  return (
    <label className="relative">
      <span className="sr-only">{label}</span>
      <select value={value} onChange={event => onChange(event.target.value)} className="h-10 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 text-sm font-medium outline-none focus:border-[var(--foreground)]">
        {options.map(([option, text]) => <option key={option} value={option}>{text}</option>)}
      </select>
    </label>
  );
}

function timestamp(value?: string) {
  const parsed = value ? new Date(value).getTime() : 0;
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatDate(value?: string) {
  if (!value) return 'Unknown time';
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date.toLocaleString() : value;
}
