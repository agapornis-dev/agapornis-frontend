import { useEffect, useState } from 'react';
import { Activity, Database, HardDrive, MemoryStick, Server, Users } from 'lucide-react';
import { ArcElement, CategoryScale, Chart as ChartJS, Filler, Legend, LinearScale, LineElement, PointElement, Tooltip } from 'chart.js';
import { Doughnut, Line } from 'react-chartjs-2';
import { useMemo } from 'react';
import { LiveConnectionState } from '../../hooks/useAgentHealth';
import { useAgentHealth } from '../../hooks/useAgentHealth';
import { AgentHealth, ServerRecord, User } from '../../lib/types';
import { formatBytes } from '../../lib/utils';
import { requestJson } from '../../lib/http';
import { EmptyState, MetricCell, Panel, cn } from '../ui';
import { LiveStatus, ScreenLoading } from '../feedback/LoadingStates';
import { NodeFleetStatus } from './NodeStatusPage';

ChartJS.register(ArcElement, CategoryScale, LinearScale, LineElement, PointElement, Filler, Tooltip, Legend);

/* ── Self-contained screen (data fetching + UI) ─────────────────────── */

export function AnalyticsScreen({ apiBase, showToast }: { apiBase: string; showToast: (message: string, type: 'success' | 'error') => void }) {
  const [data, setData] = useState<{ servers: ServerRecord[]; users: User[]; database: any } | null>(null);
  const { agents, connection } = useAgentHealth(apiBase);

  useEffect(() => {
    let closed = false;
    void Promise.all([
      requestJson(apiBase, '/servers', {}),
      requestJson(apiBase, '/auth/users', {}),
      requestJson(apiBase, '/system/database', {}).catch(() => null)
    ]).then(([servers, users, database]) => !closed && setData({ servers, users, database }))
      .catch(error => showToast(error.message, 'error'));
    return () => { closed = true; };
  }, [apiBase, showToast]);

  if (!data) return <ScreenLoading title="Building fleet analytics" detail="Loading server and ownership data while node telemetry connects in the background." />;
  return <AnalyticsPage {...data} agents={agents} connection={connection} />;
}

export function AnalyticsPage({
  servers,
  agents,
  users,
  database,
  connection
}: {
  servers: ServerRecord[];
  agents: AgentHealth[];
  users: User[];
  database: any;
  connection: LiveConnectionState;
}) {
  const running = servers.filter(server => server.status === 'running').length;
  const allocatedMemory = sum(servers, server => Number(server.memoryBytes || 0));
  const allocatedDisk = sum(servers, server => Number(server.diskLimitBytes || 0));
  const totalPhysicalMemory = sum(agents, agent => Number(agent.stats?.memory_total_bytes ?? agent.stats?.memoryTotalBytes ?? 0));
  const usedPhysicalMemory = sum(agents, agent => Number(agent.stats?.memory_usage_bytes ?? agent.stats?.memoryUsageBytes ?? 0));
  const totalPhysicalDisk = sum(agents, agent => Number(agent.stats?.disk_total_bytes ?? agent.stats?.diskTotalBytes ?? 0));
  const usedPhysicalDisk = sum(agents, agent => Number(agent.stats?.disk_usage_bytes ?? agent.stats?.diskUsageBytes ?? 0));
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
        <LiveStatus state={connection} label="Fleet telemetry" />
      </div>

      <Panel className="overflow-hidden border-[var(--border)]/60 bg-[var(--background)]/50">
        <div className="flex items-center gap-3 border-b border-[var(--border)]/60 bg-[var(--secondary)]/10 px-6 py-4">
          <Activity size={18} />
          <h3 className="text-sm font-bold">Docker at a glance</h3>
        </div>
        <div className="grid divide-y divide-[var(--border)]/50 sm:grid-cols-2 sm:divide-x sm:divide-y-0 xl:grid-cols-6">
          <MetricCell label="Total servers" value={servers.length} />
          <MetricCell label="Running" value={`${running} / ${servers.length}`} accent />
          <MetricCell label="Registered users" value={users.length} />
          <MetricCell label="Allocated RAM" value={formatBytes(allocatedMemory)} />
          <MetricCell label="Allocated disk" value={formatBytes(allocatedDisk)} />
          <MetricCell
            label="Database"
            value={database === null ? 'Checking' : database?.connected ? database.client || 'Connected' : 'Disconnected'}
            accent={Boolean(database?.connected)}
          />
        </div>
      </Panel>

      <FleetResponseChart agents={agents} />

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
        backgroundColor: `${palette[index % palette.length]}18`,
        borderWidth: 2,
        pointRadius: 0,
        pointHoverRadius: 4,
        tension: 0.3,
        spanGaps: false
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
