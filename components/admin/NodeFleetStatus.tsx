import { Activity, Clock3, Cpu, Gauge, HardDrive, MemoryStick, Radio, Timer } from 'lucide-react';
import { LiveConnectionState } from '../../hooks/useAgentHealth';
import { AgentHealth } from '../../lib/types';
import { formatBytes } from '../../lib/utils';
import { EmptyState, MetricCell, Panel, cn } from '../ui';
import { LiveStatus } from '../feedback/LoadingStates';

export function NodeFleetStatus({ agents, connection }: { agents: AgentHealth[]; connection: LiveConnectionState }) {
  const measured = agents.filter(agent => Number.isFinite(agent.availabilityPercentage));
  const timed = agents.filter(agent => Number.isFinite(agent.averageResponseTimeMs));
  const fleetAvailability = measured.length
    ? measured.reduce((sum, agent) => sum + Number(agent.availabilityPercentage), 0) / measured.length
    : 0;
  const averageLatency = timed.length
    ? timed.reduce((sum, agent) => sum + Number(agent.averageResponseTimeMs), 0) / timed.length
    : 0;
  const longestUptime = Math.max(0, ...agents.map(agent => Number(agent.uptimeSeconds || 0)));

  return (
    <section className="grid gap-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h3 className="text-xl font-extrabold tracking-tight text-[var(--foreground)]">
            Node health & response
          </h3>
          <p className="mt-1 text-sm font-medium text-[var(--muted-foreground)]/80">
            Live reachability, rolling response time, host uptime, and resource pressure for every node.
          </p>
        </div>
        <LiveStatus state={connection} />
      </div>

      <Panel className="overflow-hidden border-[var(--border)]/60 bg-[var(--background)]/50">
        <div className="flex items-center gap-3 border-b border-[var(--border)]/60 bg-[var(--secondary)]/10 px-6 py-4">
          <Gauge size={18} className="text-[var(--primary)]" />
          <h3 className="text-sm font-bold">Fleet pulse</h3>
        </div>
        <div className="grid divide-y divide-[var(--border)]/50 sm:grid-cols-2 sm:divide-x sm:divide-y-0 xl:grid-cols-4">
          <MetricCell label="Nodes online" value={`${agents.filter(agent => agent.healthy).length} / ${agents.length}`} accent />
          <MetricCell label="Rolling availability" value={measured.length ? `${fleetAvailability.toFixed(2)}%` : 'Collecting'} />
          <MetricCell label="Average response" value={timed.length ? `${Math.round(averageLatency)} ms` : 'Collecting'} />
          <MetricCell label="Longest host uptime" value={longestUptime ? formatDuration(longestUptime) : 'Unknown'} />
        </div>
      </Panel>

      {agents.length === 0 ? (
        <Panel>
          <EmptyState className="py-16 text-center">{connection === 'connecting' ? 'Connecting to node telemetry…' : 'No nodes are registered.'}</EmptyState>
        </Panel>
      ) : (
        <div className="grid gap-5">
          {agents.map(agent => <NodeCard key={agent.nodeId} agent={agent} />)}
        </div>
      )}
    </section>
  );
}

function NodeCard({ agent }: { agent: AgentHealth }) {
  const stats = agent.stats || {};
  const cpu = number(stats.cpu_percentage ?? stats.cpuPercentage);
  const memoryUsed = number(stats.memory_usage_bytes ?? stats.memoryUsageBytes);
  const memoryTotal = number(stats.memory_total_bytes ?? stats.memoryTotalBytes);
  const diskUsed = number(stats.disk_usage_bytes ?? stats.diskUsageBytes);
  const diskTotal = number(stats.disk_total_bytes ?? stats.diskTotalBytes);
  const status = String(stats.status || (agent.healthy ? 'healthy' : 'offline'));
  const statusAge = agent.observedStatusSince
    ? Math.max(0, (Date.now() - new Date(agent.observedStatusSince).getTime()) / 1000)
    : 0;

  return (
    <Panel className="overflow-hidden border-[var(--border)]/60 bg-[var(--background)]/50">
      <div className="flex flex-col gap-4 border-b border-[var(--border)]/60 bg-[var(--secondary)]/10 px-6 py-5 md:flex-row md:items-center md:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <span className={cn('relative flex h-3 w-3 shrink-0 rounded-full', agent.healthy ? 'bg-[var(--success)]' : status === 'connecting' ? 'bg-amber-400' : 'bg-[var(--destructive)]')}>
            {agent.healthy && <span className="absolute inset-0 animate-ping rounded-full bg-[var(--success)] opacity-50" />}
          </span>
          <div className="min-w-0">
            <h3 className="truncate text-lg font-extrabold tracking-tight">{agent.nodeId}</h3>
            <p className="truncate text-xs font-medium text-[var(--muted-foreground)]">{agent.fqdn || agent.grpcAddress || 'Address unavailable'}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
          <span className={cn('rounded-full border px-3 py-1', agent.healthy ? 'border-emerald-400/20 bg-emerald-400/10 text-emerald-300' : 'border-red-400/20 bg-red-400/10 text-red-300')}>
            {status === 'connecting' ? 'Connecting' : agent.healthy ? 'Operational' : 'Offline'}
          </span>
          {statusAge > 0 && <span className="text-[var(--muted-foreground)]">for {formatDuration(statusAge)}</span>}
        </div>
      </div>

      <div className="grid gap-0 xl:grid-cols-[1.05fr_1fr]">
        <div className="grid grid-cols-2 border-b border-[var(--border)]/50 xl:border-b-0 xl:border-r">
          <StatusMetric icon={Timer} label="Latest response" value={agent.responseTimeMs === undefined ? 'No response' : `${Math.round(agent.responseTimeMs)} ms`} />
          <StatusMetric icon={Radio} label="Rolling average" value={agent.averageResponseTimeMs === undefined ? 'Collecting' : `${Math.round(agent.averageResponseTimeMs)} ms`} />
          <StatusMetric icon={Clock3} label="Host uptime" value={agent.uptimeSeconds ? formatDuration(agent.uptimeSeconds) : 'Unknown'} />
          <StatusMetric icon={Activity} label="Window availability" value={agent.availabilityPercentage === undefined ? 'Collecting' : `${agent.availabilityPercentage.toFixed(2)}%`} />
        </div>

        <div className="grid gap-5 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-[var(--muted-foreground)]">Response trend</p>
              <p className="mt-1 text-[10px] text-[var(--muted-foreground)]/70">
                {agent.checksInWindow || 0} checks · rolling {formatDuration(agent.analyticsWindowSeconds || 0)} window
              </p>
            </div>
            <LatencySparkline values={agent.responseTimeHistoryMs || []} />
          </div>
          <ResourceBar icon={Cpu} label="CPU" percent={cpu} detail={`${cpu.toFixed(1)}%`} />
          <ResourceBar icon={MemoryStick} label="Memory" percent={ratio(memoryUsed, memoryTotal)} detail={`${formatBytes(memoryUsed)} / ${formatBytes(memoryTotal)}`} />
          <ResourceBar icon={HardDrive} label="Disk" percent={ratio(diskUsed, diskTotal)} detail={`${formatBytes(diskUsed)} / ${formatBytes(diskTotal)}`} />
          {!agent.healthy && (stats.error_message || stats.errorMessage) && (
            <p className="rounded-lg border border-red-400/20 bg-red-400/5 px-3 py-2 font-mono text-xs text-red-300">
              {stats.error_message || stats.errorMessage}
            </p>
          )}
        </div>
      </div>
    </Panel>
  );
}

function StatusMetric({ icon: Icon, label, value }: { icon: typeof Timer; label: string; value: string }) {
  return (
    <div className="border-b border-r border-[var(--border)]/50 p-5 last:border-b-0">
      <p className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-[var(--muted-foreground)]"><Icon size={13} /> {label}</p>
      <p className="mt-2 text-lg font-extrabold tracking-tight">{value}</p>
    </div>
  );
}

function ResourceBar({ icon: Icon, label, percent, detail }: { icon: typeof Cpu; label: string; percent: number; detail: string }) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between text-xs font-semibold">
        <span className="flex items-center gap-2 text-[var(--muted-foreground)]"><Icon size={13} /> {label}</span>
        <span>{detail}</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-[var(--secondary)]">
        <div className={cn('h-full rounded-full transition-[width] duration-700', percent > 90 ? 'bg-[var(--destructive)]' : 'bg-[var(--foreground)]')} style={{ width: `${Math.min(100, percent)}%` }} />
      </div>
    </div>
  );
}

function LatencySparkline({ values }: { values: Array<number | null> }) {
  const numeric = values.filter((value): value is number => value !== null && Number.isFinite(value));
  if (numeric.length < 2) return <span className="text-xs text-[var(--muted-foreground)]">Collecting</span>;
  const width = 180;
  const height = 42;
  const maximum = Math.max(1, ...numeric);
  const points = values.map((value, index) => value === null ? null : `${values.length === 1 ? 0 : index / (values.length - 1) * width},${height - value / maximum * (height - 4) - 2}`);
  const segments: string[] = [];
  let segment: string[] = [];
  for (const point of points) {
    if (point) segment.push(point);
    else if (segment.length) { segments.push(segment.join(' ')); segment = []; }
  }
  if (segment.length) segments.push(segment.join(' '));
  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-11 w-44" role="img" aria-label="Recent response time trend">
      <line x1="0" y1={height - 1} x2={width} y2={height - 1} stroke="var(--border)" />
      {segments.map((polyline, index) => <polyline key={index} points={polyline} fill="none" stroke="var(--foreground)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />)}
    </svg>
  );
}

function number(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
}

function ratio(used: number, total: number) {
  return total > 0 ? Math.min(100, used / total * 100) : 0;
}

function formatDuration(seconds: number) {
  if (!Number.isFinite(seconds) || seconds <= 0) return '0s';
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor(seconds % 86400 / 3600);
  const minutes = Math.floor(seconds % 3600 / 60);
  if (days) return `${days}d ${hours}h`;
  if (hours) return `${hours}h ${minutes}m`;
  if (minutes) return `${minutes}m ${Math.floor(seconds % 60)}s`;
  return `${Math.floor(seconds)}s`;
}
