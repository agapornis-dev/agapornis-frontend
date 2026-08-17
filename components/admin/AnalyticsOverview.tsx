import { Activity, Cpu, HardDrive, MemoryStick, Server, ShieldAlert, Users } from 'lucide-react';
import { ArcElement, CategoryScale, Chart as ChartJS, Filler, Legend, LinearScale, LineElement, PointElement, Tooltip } from 'chart.js';
import { Doughnut, Line } from 'react-chartjs-2';
import { useMemo } from 'react';
import { LiveConnectionState } from '../../hooks/useAgentHealth';
import { AgentHealth, CrowdSecNodeTelemetry, ServerRecord, User } from '../../lib/types';
import { formatBytes } from '../../lib/utils';
import { EmptyState, MetricCell, Panel, cn } from '../ui';
import { LiveStatus } from '../feedback/LoadingStates';
import { NodeFleetStatus } from './NodeFleetStatus';

ChartJS.register(ArcElement, CategoryScale, LinearScale, LineElement, PointElement, Filler, Tooltip, Legend);

ChartJS.register({
  id: 'app-font',
  beforeInit(chart) {
    if (typeof window !== 'undefined') {
      chart.options.font.family = window.getComputedStyle(document.body).fontFamily;
    }
  }
});

function areaFill(color: string) {
  return (context: any) => {
    const { chart } = context;
    const { ctx, chartArea } = chart;
    if (!chartArea) return `${color}24`;

    const gradient = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
    gradient.addColorStop(0, `${color}38`);
    gradient.addColorStop(1, `${color}00`);
    return gradient;
  };
}

/* ── Self-contained screen (data fetching + UI) ─────────────────────── */

export function AnalyticsPage({
  servers,
  agents,
  users,
  database,
  connection,
  crowdSecNodes,
  crowdSecConnection,
}: {
  servers: ServerRecord[];
  agents: AgentHealth[];
  users: User[];
  database: any;
  connection: LiveConnectionState;
  crowdSecNodes: CrowdSecNodeTelemetry[];
  crowdSecConnection: LiveConnectionState;
}) {
  const running = servers.filter(server => server.status === 'running').length;
  const allocatedMemory = sum(servers, server => Number(server.memoryBytes || 0));
  const allocatedDisk = sum(servers, server => Number(server.diskLimitBytes || 0));
  const totalPhysicalMemory = sum(agents, agent => Number(agent.stats?.memory_total_bytes ?? agent.stats?.memoryTotalBytes ?? 0));
  const usedPhysicalMemory = sum(agents, agent => Number(agent.stats?.memory_usage_bytes ?? agent.stats?.memoryUsageBytes ?? 0));
  const totalPhysicalDisk = sum(agents, agent => Number(agent.stats?.disk_total_bytes ?? agent.stats?.diskTotalBytes ?? 0));
  const usedPhysicalDisk = sum(agents, agent => Number(agent.stats?.disk_usage_bytes ?? agent.stats?.diskUsageBytes ?? 0));
  const healthyAgents = agents.filter(agent => agent.healthy);
  const healthyNodes = healthyAgents.length;
  const totalCpuCores = sum(healthyAgents, cpuCount);
  const averageCpu = weightedAverage(healthyAgents, agent => Number(agent.stats?.cpu_percentage ?? agent.stats?.cpuPercentage ?? 0), cpuCount);
  const memoryPercentage = totalPhysicalMemory > 0 ? usedPhysicalMemory / totalPhysicalMemory * 100 : 0;
  const diskPercentage = totalPhysicalDisk > 0 ? usedPhysicalDisk / totalPhysicalDisk * 100 : 0;
  const ownership = users
    .map(user => ({ user, count: servers.filter(server => server.ownerUserId === user.id).length }))
    .filter(entry => entry.count > 0)
    .sort((left, right) => right.count - left.count);

  return (
    <div className="mx-auto grid max-w-[1600px] gap-8 pb-12">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight text-[var(--foreground)] sm:text-4xl">
            Overview<span className="text-[var(--primary)]">.</span>
          </h2>
          <p className="mt-2 text-sm font-medium text-[var(--muted-foreground)]/80">
            One place for fleet capacity, node health, response time, ownership, and control-plane status.
          </p>
        </div>
        <LiveStatus state={connection} />
      </div>

      <Panel className="overflow-hidden border-[var(--border)]/60 bg-[var(--background)]/50">
        <div className="flex items-center gap-3 border-b border-[var(--border)]/60 bg-[var(--secondary)]/10 px-6 py-4">
          <Activity size={18} />
          <h3 className="text-sm font-bold">Docker at a glance</h3>
        </div>
        <div className="grid divide-y divide-[var(--border)]/50 sm:grid-cols-2 sm:divide-x sm:divide-y-0 xl:grid-cols-6">
          <MetricCell label="Total servers" value={servers.length} />
          <MetricCell label="Running" value={`${running} / ${servers.length}`} accent />
          <MetricCell label="Healthy nodes" value={`${healthyNodes} / ${agents.length}`} accent={healthyNodes === agents.length && agents.length > 0} />
          <MetricCell label="Fleet CPU" value={`${averageCpu.toFixed(1)}%`} />
          <MetricCell label="Fleet RAM" value={`${memoryPercentage.toFixed(1)}%`} />
          <MetricCell label="Fleet storage" value={`${diskPercentage.toFixed(1)}%`} />
        </div>
        <div className="flex flex-wrap gap-x-6 gap-y-2 border-t border-[var(--border)]/50 px-5 py-3 text-xs text-[var(--muted-foreground)]">
          <span>{users.length} registered users</span>
          <span>CPU is core-weighted across {totalCpuCores} logical {totalCpuCores === 1 ? 'core' : 'cores'}</span>
          <span>{formatBytes(allocatedMemory)} RAM allocated</span>
          <span>{formatBytes(allocatedDisk)} storage allocated</span>
          <span>Database: {database === null ? 'checking' : database?.connected ? database.client || 'connected' : 'disconnected'}</span>
        </div>
      </Panel>

      <FleetResourceChart agents={agents} />

      <FleetResponseChart agents={agents} />

      <CrowdSecInsights nodes={crowdSecNodes} connection={crowdSecConnection} />

      <NodeFleetStatus agents={agents} connection={connection} />

      <div className="grid gap-8 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="grid gap-8">
          <Panel className="overflow-hidden border-[var(--border)]/60 bg-[var(--background)]/50">
            <div className="flex items-center justify-between border-b border-[var(--border)]/60 bg-[var(--secondary)]/10 px-6 py-4">
              <div className="flex items-center gap-3"><HardDrive size={18} /><h3 className="text-sm font-bold">Physical capacity</h3></div>
              <span className="text-xs font-semibold text-[var(--muted-foreground)]">Across {agents.length} nodes</span>
            </div>
            <div className="grid divide-y divide-[var(--border)]/50 md:grid-cols-2 md:divide-x md:divide-y-0">
              <CapacityDonut icon={MemoryStick} title="Memory" used={usedPhysicalMemory} total={totalPhysicalMemory} />
              <CapacityDonut icon={HardDrive} title="Storage" used={usedPhysicalDisk} total={totalPhysicalDisk} />
            </div>
          </Panel>

          <ServerStatePanel servers={servers} />
        </div>

        <Panel className="flex h-fit flex-col overflow-hidden border-[var(--border)]/60 bg-[var(--background)]/50">
          <div className="flex items-center justify-between border-b border-[var(--border)]/60 bg-[var(--secondary)]/10 px-6 py-4">
            <div className="flex items-center gap-3"><Users size={18} /><h3 className="text-sm font-bold">Server ownership</h3></div>
            <span className="text-xs font-semibold text-[var(--muted-foreground)]">{ownership.length} active owners</span>
          </div>
          {ownership.length === 0 ? (
            <EmptyState className="py-16 text-center">No assigned servers found.</EmptyState>
          ) : (
            <div className="divide-y divide-[var(--border)]/50">
              {ownership.slice(0, 10).map(({ user, count }) => (
                <div key={user.id} className="flex items-center gap-4 px-6 py-4 transition-colors hover:bg-[var(--secondary)]/10">
                  <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-[var(--border)] bg-[var(--secondary)]/30 text-sm font-extrabold">
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold">{user.name}</p>
                    <p className="truncate text-xs text-[var(--muted-foreground)]">{user.email}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-extrabold">{count}</p>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted-foreground)]">servers</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Panel>
      </div>
    </div>
  );
}

function FleetResourceChart({ agents }: { agents: AgentHealth[] }) {
  const longest = Math.max(0, ...agents.map(agent => agent.resourceHistory?.length || 0));
  const reference = agents.find(agent => agent.resourceHistory?.length === longest)?.resourceHistory || [];
  const alignedValue = (agent: AgentHealth, index: number, key: 'cpuPercentage' | 'memoryPercentage' | 'diskPercentage') => {
    const history = agent.resourceHistory || [];
    const sourceIndex = index - (longest - history.length);
    return sourceIndex >= 0 ? history[sourceIndex]?.[key] ?? null : null;
  };
  const series = (key: 'cpuPercentage' | 'memoryPercentage' | 'diskPercentage') => Array.from({ length: longest }, (_, index) => {
    if (key !== 'cpuPercentage') return averageNullable(agents.map(agent => alignedValue(agent, index, key)));
    return weightedAverageNullable(agents.map(agent => ({ value: alignedValue(agent, index, key), weight: cpuCount(agent) })));
  });
  const data = useMemo(() => ({
    labels: Array.from({ length: longest }, (_, index) => {
      const sample = reference[index];
      if (!sample?.at) return relativeTime((longest - index - 1) * 10);
      return new Date(sample.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    }),
    datasets: [
      { label: 'CPU', data: series('cpuPercentage'), borderColor: '#60a5fa', backgroundColor: areaFill('#60a5fa') },
      { label: 'RAM', data: series('memoryPercentage'), borderColor: '#c084fc', backgroundColor: areaFill('#c084fc') },
      { label: 'Storage', data: series('diskPercentage'), borderColor: '#34d399', backgroundColor: areaFill('#34d399') },
    ].map(dataset => ({ ...dataset, borderWidth: 2, pointRadius: 0, pointHoverRadius: 4, tension: 0.28, spanGaps: true, fill: 'origin' }))
  }), [agents, longest, reference]);
  const options = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index' as const, intersect: false },
    plugins: {
      legend: { position: 'bottom' as const, labels: { color: '#a3a3a3', usePointStyle: true, boxWidth: 8, padding: 18 } },
      tooltip: { callbacks: { label: (context: any) => ` ${context.dataset.label}: ${Number(context.parsed.y).toFixed(1)}%` } }
    },
    scales: {
      x: { grid: { display: false }, ticks: { color: '#737373', maxTicksLimit: 7, autoSkip: true } },
      y: {
        beginAtZero: true,
        suggestedMax: 100,
        grid: { color: '#262626' },
        ticks: { color: '#737373', callback: (value: any) => `${value}%` },
        title: { display: true, text: 'Fleet utilization', color: '#a3a3a3' }
      }
    }
  }), []);

  return (
    <Panel className="overflow-hidden border-[var(--border)]/60 bg-[var(--background)]/50">
      <div className="flex items-center justify-between border-b border-[var(--border)]/60 bg-[var(--secondary)]/10 px-6 py-4">
        <div className="flex items-center gap-3"><Cpu size={18} /><h3 className="text-sm font-bold">Fleet resource utilization</h3></div>
        <span className="text-xs font-semibold text-[var(--muted-foreground)]">CPU, RAM, and storage · rolling live window</span>
      </div>
      <div className="h-80 p-5">
        {longest < 2 ? <EmptyState className="grid h-full place-items-center text-center">Collecting resource samples from healthy nodes...</EmptyState> : <Line data={data} options={options} />}
      </div>
    </Panel>
  );
}

function CrowdSecInsights({ nodes, connection }: { nodes: CrowdSecNodeTelemetry[]; connection: LiveConnectionState }) {
  const alerts = nodes.flatMap(node => node.alerts || []);
  const activeNodes = nodes.filter(node => node.status === 'active').length;
  const highSignals = alerts.filter(alert => alert.severity === 'high').length;
  const sources = new Set(alerts.map(alert => alert.sourceIp || alert.sourceValue).filter(Boolean)).size;
  const totalEvents = sum(alerts, alert => Number(alert.eventsCount || 0));
  const remediations = alerts.filter(alert => alert.remediation).length;
  const scenarios = Array.from(alerts.reduce((counts, alert) => {
    const key = alert.scenario || alert.message || 'Unclassified';
    counts.set(key, (counts.get(key) || 0) + Number(alert.eventsCount || 1));
    return counts;
  }, new Map<string, number>()).entries()).sort((left, right) => right[1] - left[1]).slice(0, 6);
  const largest = Math.max(1, ...scenarios.map(([, count]) => count));

  return (
    <Panel className="overflow-hidden border-[var(--border)]/60 bg-[var(--background)]/50">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border)]/60 bg-[var(--secondary)]/10 px-6 py-4">
        <div className="flex items-center gap-3"><ShieldAlert size={18} /><h3 className="text-sm font-bold">CrowdSec security analytics</h3></div>
        <LiveStatus state={connection} />
      </div>
      <div className="grid divide-y divide-[var(--border)]/50 sm:grid-cols-2 sm:divide-x sm:divide-y-0 xl:grid-cols-5">
        <MetricCell label="Reporting nodes" value={`${activeNodes} / ${nodes.length}`} accent={activeNodes > 0} />
        <MetricCell label="Visible alerts" value={alerts.length} />
        <MetricCell label="High severity" value={highSignals} />
        <MetricCell label="Affected sources" value={sources} />
        <MetricCell label="Observed events" value={totalEvents} />
      </div>
      <div className="grid border-t border-[var(--border)]/50 lg:grid-cols-[1fr_260px]">
        <div className="grid gap-4 p-6">
          <div className="flex items-center justify-between text-xs font-semibold text-[var(--muted-foreground)]"><span>Top detection scenarios</span><span>{scenarios.length} shown</span></div>
          {scenarios.length === 0 ? <EmptyState className="py-8 text-center">No CrowdSec detections are currently visible.</EmptyState> : scenarios.map(([scenario, count]) => (
            <div key={scenario}>
              <div className="mb-2 flex items-center justify-between gap-4 text-xs"><span className="truncate font-semibold">{scenario}</span><span className="text-[var(--muted-foreground)]">{count}</span></div>
              <div className="h-1.5 overflow-hidden rounded-full bg-[var(--secondary)]"><div className="h-full rounded-full bg-red-400" style={{ width: `${count / largest * 100}%` }} /></div>
            </div>
          ))}
        </div>
        <div className="border-t border-[var(--border)]/50 p-6 lg:border-l lg:border-t-0">
          <p className="text-xs font-semibold text-[var(--muted-foreground)]">Remediation signals</p>
          <p className="mt-2 text-3xl font-extrabold">{remediations}</p>
          <p className="mt-2 text-xs leading-5 text-[var(--muted-foreground)]">Read-only visibility from locally enabled Linux nodes. Actions remain unavailable from the panel.</p>
        </div>
      </div>
    </Panel>
  );
}

function FleetResponseChart({ agents }: { agents: AgentHealth[] }) {
  const palette = ['#34d399', '#60a5fa', '#c084fc', '#fbbf24', '#fb7185', '#22d3ee', '#a3e635', '#f97316'];
  const longest = Math.max(0, ...agents.map(agent => agent.responseTimeHistoryMs?.length || 0));
  const intervalSeconds = Math.max(1, Math.round((agents.find(agent => agent.analyticsWindowSeconds)?.analyticsWindowSeconds || 300) / 60));
  const data = useMemo(() => ({
    labels: Array.from({ length: longest }, (_, index) => relativeTime((longest - index - 1) * intervalSeconds)),
    datasets: agents.map((agent, index) => {
      const history = agent.responseTimeHistoryMs || [];
      return {
        label: agent.nodeId,
        data: [...Array(Math.max(0, longest - history.length)).fill(null), ...history],
        borderColor: palette[index % palette.length],
        backgroundColor: areaFill(palette[index % palette.length]),
        borderWidth: 2,
        pointRadius: 0,
        pointHoverRadius: 4,
        tension: 0.3,
        spanGaps: false,
        fill: 'origin'
      };
    })
  }), [agents, intervalSeconds, longest]);
  const options = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index' as const, intersect: false },
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: { color: '#a3a3a3', usePointStyle: true, boxWidth: 8, padding: 18 }
      },
      tooltip: {
        callbacks: { label: (context: any) => ` ${context.dataset.label}: ${Math.round(context.parsed.y)} ms` }
      }
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { color: '#737373', maxTicksLimit: 6, autoSkip: true }
      },
      y: {
        beginAtZero: true,
        grid: { color: '#262626' },
        ticks: { color: '#737373', callback: (value: any) => `${value} ms` },
        title: { display: true, text: 'Response time', color: '#a3a3a3' }
      }
    }
  }), [longest]);

  return (
    <Panel className="overflow-hidden border-[var(--border)]/60 bg-[var(--background)]/50">
      <div className="flex items-center justify-between border-b border-[var(--border)]/60 bg-[var(--secondary)]/10 px-6 py-4">
        <div className="flex items-center gap-3"><Activity size={18} /><h3 className="text-sm font-bold">Fleet response time</h3></div>
        <span className="text-xs font-semibold text-[var(--muted-foreground)]">All nodes · lower is better</span>
      </div>
      <div className="h-80 p-5">
        {longest < 2 ? <EmptyState className="grid h-full place-items-center text-center">Collecting response samples from the fleet…</EmptyState> : <Line data={data} options={options} />}
      </div>
    </Panel>
  );
}

function relativeTime(seconds: number) {
  if (seconds <= 0) return 'Now';
  if (seconds >= 60) return `-${Math.round(seconds / 60)}m`;
  return `-${seconds}s`;
}

function CapacityDonut({ icon: Icon, title, used, total }: { icon: typeof HardDrive; title: string; used: number; total: number }) {
  const data = useMemo(() => ({
    labels: ['Used', 'Available'],
    datasets: [{
      data: [used, Math.max(0, total - used)],
      backgroundColor: ['#f7f7f7', '#171717'],
      borderColor: ['#f7f7f7', '#262626'],
      borderWidth: 1
    }]
  }), [total, used]);
  const options = useMemo(() => ({
    cutout: '76%',
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: { callbacks: { label: (context: any) => ` ${context.label}: ${formatBytes(context.parsed)}` } }
    }
  }), []);
  const percentage = total > 0 ? used / total * 100 : 0;

  return (
    <div className="grid min-h-52 grid-cols-[8rem_1fr] items-center gap-5 p-6">
      <div className="relative h-32 w-32">
        {total > 0 ? <Doughnut data={data} options={options} /> : <div className="h-full rounded-full border border-dashed border-[var(--border)]" />}
        <div className="pointer-events-none absolute inset-0 grid place-items-center text-center">
          <span className="text-lg font-extrabold">{percentage.toFixed(0)}%</span>
        </div>
      </div>
      <div className="min-w-0">
        <p className="flex items-center gap-2 text-sm font-bold"><Icon size={15} /> {title}</p>
        <p className="mt-3 text-xl font-extrabold tracking-tight">{formatBytes(used)}</p>
        <p className="text-xs text-[var(--muted-foreground)]">of {formatBytes(total)} used</p>
      </div>
    </div>
  );
}

function ServerStatePanel({ servers }: { servers: ServerRecord[] }) {
  const states = Array.from(servers.reduce((map, server) => {
    const state = String(server.status || 'unknown').toLowerCase();
    map.set(state, (map.get(state) || 0) + 1);
    return map;
  }, new Map<string, number>()).entries()).sort(([left], [right]) => left === 'running' ? -1 : right === 'running' ? 1 : left.localeCompare(right));

  return (
    <Panel className="overflow-hidden border-[var(--border)]/60 bg-[var(--background)]/50">
      <div className="flex items-center gap-3 border-b border-[var(--border)]/60 bg-[var(--secondary)]/10 px-6 py-4">
        <Server size={18} /><h3 className="text-sm font-bold">Server states</h3>
      </div>
      {states.length === 0 ? <EmptyState className="py-12 text-center">No servers registered.</EmptyState> : (
        <div className="grid gap-4 p-6">
          {states.map(([state, count]) => {
            const percentage = servers.length ? count / servers.length * 100 : 0;
            return (
              <div key={state}>
                <div className="mb-2 flex items-center justify-between text-xs font-semibold">
                  <span className="capitalize text-[var(--muted-foreground)]">{state}</span>
                  <span>{count}</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-[var(--secondary)]">
                  <div className={cn('h-full rounded-full', state === 'running' ? 'bg-[var(--success)]' : 'bg-[var(--foreground)]')} style={{ width: `${percentage}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Panel>
  );
}

function sum<T>(rows: T[], value: (row: T) => number) {
  return rows.reduce((total, row) => total + value(row), 0);
}

function cpuCount(agent: AgentHealth) {
  return Math.max(1, Number(agent.stats?.cpu_count ?? agent.stats?.cpuCount ?? 1));
}

function weightedAverage<T>(rows: T[], value: (row: T) => number, weight: (row: T) => number) {
  const totalWeight = sum(rows, weight);
  return totalWeight ? sum(rows, row => value(row) * weight(row)) / totalWeight : 0;
}

function averageNullable(values: Array<number | null>) {
  const present = values.filter((value): value is number => value !== null && Number.isFinite(value));
  return present.length ? present.reduce((total, value) => total + value, 0) / present.length : null;
}

function weightedAverageNullable(values: Array<{ value: number | null; weight: number }>) {
  const present = values.filter(entry => entry.value !== null && Number.isFinite(entry.value) && entry.weight > 0);
  const weight = sum(present, entry => entry.weight);
  return weight ? sum(present, entry => entry.value! * entry.weight) / weight : null;
}
