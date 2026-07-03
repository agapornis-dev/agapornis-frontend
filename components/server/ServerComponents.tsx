import { ReactNode, useEffect, useState } from 'react';
import {
  Play,
  Square,
  RotateCw,
  Trash2,
  Copy,
  Check,
  Terminal,
  Folder,
  Settings,
  Webhook,
  Database,
  Archive,
  CalendarClock,
  Server as ServerIcon,
  Cpu,
  Microchip,
  Activity,
  HardDrive,
  Users,
  Blocks
} from 'lucide-react';
import { ServerRecord, MetricsPoint } from '../../lib/types';
import { formatBytes } from '../../lib/utils';
import { btn, ghostBtn } from '../../lib/constants';
import { Badge, cn, Panel, Tabs } from '../ui';
import { ServerConsole } from './ServerConsole';

// ─── ServerItem ────────────────────────────────────────────────────────────────

export function ServerItem({
  server,
  selected,
  connectAddress,
  ownerLabel,
  onSelect
}: {
  server: ServerRecord;
  selected: boolean;
  connectAddress?: string;
  ownerLabel?: string;
  onSelect: () => void;
}) {
  const running = server.status === 'running';

  return (
    <button
      onClick={onSelect}
      className={cn(
        'group flex w-full flex-col gap-3 rounded-[var(--radius-panel)] border p-4 text-left transition-all duration-200 overflow-hidden',
        selected
          ? 'border-[var(--primary)]/30 bg-[var(--secondary)]/10 shadow-sm backdrop-blur-sm ring-1 ring-[var(--primary)]/20'
          : 'border-[var(--border)]/60 bg-[var(--background)]/50 hover:border-[var(--border)] hover:bg-[var(--secondary)]/10'
      )}
    >
      <div className="flex w-full items-start justify-between gap-3 min-w-0">
        <div className="flex items-start gap-3 min-w-0 flex-1">
          <div className={cn(
            'mt-0.5 shrink-0 rounded-lg border p-1.5 transition-colors',
            selected
              ? 'border-[var(--primary)]/30 bg-[var(--primary)]/10 text-[var(--primary)]'
              : 'border-[var(--border)]/60 bg-[var(--secondary)]/10 text-[var(--muted-foreground)] group-hover:text-[var(--foreground)]'
          )}>
            <ServerIcon size={16} />
          </div>
          <div className="min-w-0 flex-1">
            <p className={cn(
              'truncate text-sm font-bold tracking-tight transition-colors',
              selected ? 'text-[var(--primary)]' : 'text-[var(--foreground)] group-hover:text-[var(--primary)]'
            )}>
              {server.name || server.id}
            </p>
            <div className="mt-1 flex items-center gap-2 text-xs font-medium text-[var(--muted-foreground)]">
              <span className="flex items-center gap-1.5 truncate">
                <span className="relative flex h-2 w-2 shrink-0">
                  {running && (
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--success)] opacity-75" />
                  )}
                  <span className={cn(
                    'relative inline-flex h-2 w-2 rounded-full',
                    running ? 'bg-[var(--success)]' : 'bg-[var(--destructive)]'
                  )} />
                </span>
                <span className="truncate">{server.nodeId}</span>
              </span>
              <span className="shrink-0 text-[var(--border)]">&bull;</span>
              <span className="shrink-0">{server.assignedHostPort || '—'}</span>
            </div>
            {ownerLabel && (
              <p className="mt-1 truncate text-xs font-medium text-[var(--muted-foreground)]/70">
                {ownerLabel}
              </p>
            )}
          </div>
        </div>
        <Badge tone={running ? 'success' : 'danger'} className="shrink-0 text-[10px] uppercase tracking-wider">
          {server.status}
        </Badge>
      </div>

      {connectAddress && (
        <div className="ml-9 flex min-w-0 w-fit max-w-[calc(100%-2.25rem)] items-center rounded-lg border border-[var(--border)]/60 bg-[var(--secondary)]/10 px-2.5 py-1.5">
          <p className="truncate font-mono text-[11px] font-medium text-[var(--muted-foreground)]">
            {connectAddress}
          </p>
        </div>
      )}
    </button>
  );
}

// ─── StatCard ─────────────────────────────────────────────────────────────────

function StatCard({
  title,
  value,
  pct,
  sub,
  data,
  max,
  minCeiling,
  icon: Icon
}: {
  title: string;
  value: string;
  pct?: number;
  sub?: string;
  data: number[];
  max?: number;
  minCeiling?: number;
  icon?: React.ElementType;
}) {
  const w = 200, h = 40;
  const ceiling = Math.max(max || 0, minCeiling || 0, ...data, 1);
  const pts = data.length ? data : [0];

  const path = pts.map((v, i) => {
    const x = pts.length === 1 ? 0 : (i / (pts.length - 1)) * w;
    const y = h - (Math.min(v, ceiling) / ceiling) * h;
    return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
  }).join(' ');

  const areaPath = `${path} L ${w} ${h} L 0 ${h} Z`;

  return (
    <div className="relative flex h-full flex-col justify-between overflow-hidden px-5 py-5 transition-colors hover:bg-[var(--secondary)]/10">
      <div className="relative z-10 flex flex-col h-full">
        <div>
          <div className="flex items-center gap-2 text-[var(--muted-foreground)]">
            {Icon && <Icon size={13} />}
            <p className="text-xs font-bold uppercase tracking-[0.12em]">{title}</p>
          </div>
          <p className="mt-2 text-2xl font-extrabold tracking-tight text-[var(--foreground)]">{value}</p>
          <div className="mt-1 h-3.5">
            {sub && (
              <p className="font-mono text-[10px] tracking-wide text-[var(--muted-foreground)] truncate">{sub}</p>
            )}
          </div>
        </div>
        <div className="mt-auto pt-4">
          {pct !== undefined ? (
            <div className="h-1 w-full overflow-hidden rounded-full bg-[var(--border)]/40">
              <div
                className={cn(
                  'h-full transition-all duration-500',
                  pct > 90 ? 'bg-[var(--destructive)]' : pct > 75 ? 'bg-orange-500' : 'bg-[var(--primary)]'
                )}
                style={{ width: `${Math.min(pct, 100).toFixed(1)}%` }}
              />
            </div>
          ) : (
            <div className="h-1 w-full" />
          )}
        </div>
      </div>

      {/* Background sparkline */}
      <div className="absolute inset-x-0 bottom-0 z-0 h-1/2 opacity-[0.15] pointer-events-none">
        <svg viewBox={`0 0 ${w} ${h}`} className="h-full w-full" preserveAspectRatio="none">
          <path d={areaPath} fill="var(--primary)" opacity="0.2" />
          <path d={path} fill="none" stroke="var(--primary)" strokeWidth="0.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
    </div>
  );
}

// ─── ServerDetail ──────────────────────────────────────────────────────────────

export function ServerDetail({
  server, emitter, consoleHistory, metrics, busy, canDelete, canOperate, supportMode, connectAddress,
  filesView, modsView, settingsView, databasesView, webhooksView, backupsView, schedulesView,
  activityView, collaboratorsView,
  onStart, onRestart, onStop, onDelete, onSendCommand
}: {
  server: ServerRecord;
  emitter: EventTarget;
  consoleHistory: string[];
  metrics: MetricsPoint[];
  busy: boolean;
  canDelete: boolean;
  canOperate: boolean;
  supportMode?: boolean;
  connectAddress?: string;
  filesView: ReactNode;
  modsView?: ReactNode;
  settingsView: ReactNode;
  databasesView: ReactNode;
  webhooksView: ReactNode;
  backupsView: ReactNode;
  schedulesView: ReactNode;
  activityView: ReactNode;
  collaboratorsView: ReactNode;
  onStart: () => void;
  onRestart: () => void;
  onStop: () => void;
  onDelete: () => void;
  onSendCommand: (cmd: string) => Promise<void>;
}) {
  const [tab, setTab] = useState<'console' | 'files' | 'mods' | 'variables' | 'databases' | 'webhooks' | 'backups' | 'schedules' | 'activity' | 'access'>('console');
  const [copied, setCopied] = useState(false);

  const latest = metrics[metrics.length - 1];
  const memPct = latest?.memoryLimit ? (latest.memory / latest.memoryLimit) * 100 : 0;
  const diskLimit = latest?.diskLimit || server.diskLimitBytes || 0;
  const diskPct = diskLimit ? ((latest?.diskUsage || 0) / diskLimit) * 100 : undefined;
  const netSeries = metrics.map(p => p.networkRead + p.networkWrite);
  const running = server.status === 'running';
  const granted = new Set(server.access?.permissions || []);
  const full = server.access?.relationship !== 'collaborator' || server.access?.permission === 'operator';
  const allowed = (scope: string) => full || granted.has(scope);

  const tabs = [
    { value: 'console',   label: <div className="flex items-center gap-2"><Terminal size={14} /> Console</div> },
    { value: 'files',     label: <div className="flex items-center gap-2"><Folder size={14} /> Files</div> },
    ...(modsView ? [{ value: 'mods', label: <div className="flex items-center gap-2"><Blocks size={14} /> Mods</div> }] : []),
    { value: 'variables', label: <div className="flex items-center gap-2"><Settings size={14} /> Variables</div> },
    { value: 'databases', label: <div className="flex items-center gap-2"><Database size={14} /> Databases</div> },
    { value: 'webhooks',  label: <div className="flex items-center gap-2"><Webhook size={14} /> Webhooks</div> },
    { value: 'backups',   label: <div className="flex items-center gap-2"><Archive size={14} /> Backups</div> },
    { value: 'schedules', label: <div className="flex items-center gap-2"><CalendarClock size={14} /> Schedules</div> },
    { value: 'activity',  label: <div className="flex items-center gap-2"><Activity size={14} /> Activity</div> },
    { value: 'access',    label: <div className="flex items-center gap-2"><Users size={14} /> Access</div> }
  ].filter(item => {
    if (supportMode) return ['console', 'files', 'activity'].includes(item.value);
    if (item.value === 'console') return allowed('console.view');
    if (item.value === 'files') return allowed('files.view');
    if (item.value === 'mods') return allowed('files.view');
    if (item.value === 'variables' || item.value === 'webhooks') return allowed('settings');
    if (item.value === 'databases') return allowed('databases');
    if (item.value === 'backups') return allowed('backups');
    if (item.value === 'schedules') return allowed('schedules');
    return ['activity', 'access'].includes(item.value);
  });
  useEffect(() => {
    if (!tabs.some(item => item.value === tab) && tabs[0]) setTab(tabs[0].value as typeof tab);
  }, [server.id, server.access?.permission, server.access?.permissions?.join(',')]);

  const handleCopy = () => {
    if (!connectAddress) return;
    navigator.clipboard.writeText(connectAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Panel className="overflow-hidden border-[var(--border)]/60 bg-[var(--background)]/50 backdrop-blur-sm flex flex-col h-full">

      {/* ── Header ── */}
      <div className="flex flex-col gap-5 border-b border-[var(--border)]/50 p-6 md:flex-row md:items-center md:justify-between">
        <div className="min-w-0 space-y-2">
          {/* Eyebrow */}
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--primary)]">Server</p>

          <div className="flex flex-wrap items-center gap-3">
            <h3 className="text-3xl font-extrabold tracking-tight text-[var(--foreground)] truncate">
              {server.name || server.id}<span className="text-[var(--primary)]">.</span>
            </h3>
            <Badge
              tone={running ? 'success' : 'danger'}
              className="px-2.5 py-0.5 text-[10px] uppercase tracking-wider font-bold"
            >
              {server.status}
            </Badge>
            {server.access && (
              <Badge className="px-2.5 py-0.5 text-[10px] uppercase tracking-wider font-bold">
                {server.access.relationship === 'owner'
                  ? 'Your server'
                  : server.access.relationship === 'collaborator'
                    ? server.access.permission === 'operator' ? 'Shared · operator' : 'Shared · read only'
                    : server.access.canWrite ? 'Staff access' : 'Staff · read only'}
              </Badge>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3 text-sm">
            {/* Status dot + port */}
            <span className="flex items-center gap-2 font-medium text-[var(--muted-foreground)]">
              <span className="relative flex h-2 w-2 shrink-0">
                {running && (
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--success)] opacity-75" />
                )}
                <span className={cn(
                  'relative inline-flex h-2 w-2 rounded-full',
                  running ? 'bg-[var(--success)]' : 'bg-[var(--destructive)]'
                )} />
              </span>
              Port {server.assignedHostPort || 'none'}
            </span>

            {/* Connect address chip */}
            {connectAddress && (
              <div className="flex items-center gap-2 rounded-lg border border-[var(--border)]/60 bg-[var(--secondary)]/10 px-3 py-1.5 transition-colors hover:border-[var(--primary)]/30">
                <span className="font-mono text-xs font-medium text-[var(--foreground)]">{connectAddress}</span>
                <button
                  onClick={handleCopy}
                  className="rounded-md p-0.5 text-[var(--muted-foreground)] transition-colors hover:bg-[var(--secondary)]/20 hover:text-[var(--foreground)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)]/50"
                  title="Copy to clipboard"
                >
                  {copied
                    ? <Check size={13} className="text-[var(--success)]" />
                    : <Copy size={13} />
                  }
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Power controls */}
        <div className="flex flex-wrap items-center gap-1.5 rounded-[var(--radius-panel)] border border-[var(--border)]/60 bg-[var(--secondary)]/10 p-1.5 shrink-0 backdrop-blur-sm">
          <button
            className={cn(
              btn,
              'gap-2 rounded-lg border-transparent bg-[var(--success)]/10 text-[var(--success)] text-sm font-bold',
              'hover:bg-[var(--success)] hover:text-black focus:ring-1 focus:ring-[var(--success)]/50',
              'disabled:opacity-40 disabled:cursor-not-allowed'
            )}
            disabled={busy || running || !allowed('power')}
            onClick={onStart}
          >
            <Play size={14} className={cn(busy && 'animate-pulse')} /> Start
          </button>

          <button
            className={cn(
              btn,
              'gap-2 rounded-lg border-transparent bg-orange-500/10 text-orange-400 text-sm font-bold',
              'hover:bg-orange-500 hover:text-black focus:ring-1 focus:ring-orange-500/50',
              'disabled:opacity-40 disabled:cursor-not-allowed'
            )}
            disabled={busy || !running || !allowed('power')}
            onClick={onRestart}
          >
            <RotateCw size={14} className={cn(busy && 'animate-spin')} /> Restart
          </button>

          <button
            className={cn(
              btn,
              'gap-2 rounded-lg border-transparent bg-[var(--destructive)]/10 text-[var(--destructive)] text-sm font-bold',
              'hover:bg-[var(--destructive)] hover:text-white focus:ring-1 focus:ring-[var(--destructive)]/50',
              'disabled:opacity-40 disabled:cursor-not-allowed'
            )}
            disabled={busy || !running || !allowed('power')}
            onClick={onStop}
          >
            <Square size={13} fill="currentColor" /> Stop
          </button>

          {canDelete && (
            <>
              <div className="mx-1 h-6 w-px bg-[var(--border)]/60" />
              <button
                className={cn(
                  ghostBtn,
                  'rounded-lg px-2.5 text-[var(--muted-foreground)]',
                  'hover:bg-[var(--destructive)]/10 hover:text-[var(--destructive)]',
                  'focus:ring-1 focus:ring-[var(--destructive)]/50',
                  'disabled:opacity-40 disabled:cursor-not-allowed'
                )}
                disabled={busy}
                onClick={onDelete}
                title="Delete server"
              >
                <Trash2 size={15} />
              </button>
            </>
          )}
        </div>
      </div>

      {/* ── Metrics Grid ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 border-b border-[var(--border)]/50 divide-y divide-[var(--border)]/50 sm:divide-y-0 md:divide-x md:divide-[var(--border)]/50">
        {[
          {
            title: 'CPU Usage',
            icon: Cpu,
            value: `${Math.round(latest?.cpu || 0)}%`,
            pct: latest?.cpu || 0,
            data: metrics.map(p => p.cpu),
            max: 100
          },
          {
            title: 'Memory',
            icon: Microchip,
            value: `${Math.round(memPct)}%`,
            pct: memPct,
            sub: latest ? `${formatBytes(latest.memory)} / ${formatBytes(latest.memoryLimit)}` : 'Waiting…',
            data: metrics.map(p => p.memory),
            max: latest?.memoryLimit
          },
          {
            title: 'Network',
            icon: Activity,
            value: latest ? formatBytes(latest.networkRead + latest.networkWrite) : '0 B',
            sub: latest ? `↓ ${formatBytes(latest.networkRead)}  ↑ ${formatBytes(latest.networkWrite)}` : undefined,
            data: netSeries,
            minCeiling: 1024 * 1024
          },
          {
            title: 'Disk',
            icon: HardDrive,
            value: latest ? formatBytes(latest.diskUsage) : '0 B',
            pct: diskPct,
            sub: diskLimit ? `${formatBytes(latest?.diskUsage || 0)} / ${formatBytes(diskLimit)}` : undefined,
            data: metrics.map(p => p.diskUsage),
            max: diskLimit
          }
        ].map(card => (
          <div key={card.title} className="bg-[var(--background)]/30 h-full">
            <StatCard {...card} />
          </div>
        ))}
      </div>

      {/* ── Tabs ── */}
      <div className="w-full border-b border-[var(--border)]/50 bg-[var(--secondary)]/5 overflow-x-auto whitespace-nowrap touch-pan-x overscroll-x-contain [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        <Tabs
          value={tab}
          items={tabs}
          onChange={value => setTab(value as typeof tab)}
        />
      </div>

      {/* ── Tab content ── */}
      <div className="flex-1 bg-[var(--background)] min-h-[500px]">
        {tab === 'console'   ? <ServerConsole key={server.id} emitter={emitter} history={consoleHistory} onSendCommand={onSendCommand} readOnly={!allowed('console.send')} />
        : tab === 'files'     ? filesView
        : tab === 'mods'      ? modsView
        : tab === 'variables' ? settingsView
        : tab === 'databases' ? databasesView
        : tab === 'webhooks'  ? webhooksView
        : tab === 'backups'   ? backupsView
        : tab === 'schedules' ? schedulesView
        : tab === 'activity'  ? activityView
        : collaboratorsView}
      </div>
    </Panel>
  );
}
