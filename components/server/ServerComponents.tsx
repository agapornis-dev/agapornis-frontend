import { ReactNode, useEffect, useState } from 'react';
import { motion, AnimatePresence, Transition } from 'framer-motion';
import {
  Play,
  Square,
  RotateCw,
  RefreshCw,
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
  Blocks,
  Snowflake,
  LockOpen,
  Clock3,
  TriangleAlert
} from 'lucide-react';
import { ServerRecord, MetricsPoint } from '../../lib/types';
import { formatBytes } from '../../lib/utils';
import { normalizeServerStatus, serverStatusDot, serverStatusLabel, serverStatusTone } from '../../lib/server-status';
import { Badge, cn, Panel, Tabs } from '../ui';
import { ServerConsole } from './ServerConsole';

// ─── Shared Transitions ────────────────────────────────────────────────────────

const standardTransition: Transition = { duration: 0.25, ease: 'easeOut' };
const fadeSlideUp = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -12 }
};

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
  const status = normalizeServerStatus(server.status);
  const running = status === 'running';
  const starting = status === 'starting';
  const tone = serverStatusTone(status);
  const dot = serverStatusDot(status);

  return (
    <motion.button
      layout
      transition={standardTransition}
      onClick={onSelect}
      className={cn(
        'group flex w-full flex-col gap-3 overflow-hidden rounded-[var(--radius-panel)] border p-4 text-left transition-all duration-200 xl:gap-2.5 xl:p-3.5',
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
                  {(running || starting) && (
                    <span className={cn('absolute inline-flex h-full w-full animate-ping rounded-full opacity-75', dot)} />
                  )}
                  <span className={cn(
                    'relative inline-flex h-2 w-2 rounded-full',
                    dot
                  )} />
                </span>
                <span className="truncate">{server.nodeId}</span>
              </span>
              <span className="shrink-0 text-[var(--border)]">&bull;</span>
              <span className="shrink-0">{server.assignedPorts?.length ? server.assignedPorts.join(', ') : server.assignedHostPort || '—'}</span>
            </div>
            {ownerLabel && (
              <p className="mt-1 truncate text-xs font-medium text-[var(--muted-foreground)]/70">
                {ownerLabel}
              </p>
            )}
          </div>
        </div>
        <Badge tone={tone} className="shrink-0 text-[10px] tracking-wider">
          {serverStatusLabel(server.status)}
        </Badge>
      </div>

      {connectAddress && (
        <div className="ml-9 flex min-w-0 w-fit max-w-[calc(100%-2.25rem)] items-center rounded-lg border border-[var(--border)]/60 bg-[var(--secondary)]/10 px-2.5 py-1.5">
          <p className="truncate font-mono text-[11px] font-medium text-[var(--muted-foreground)]">
            {connectAddress}
          </p>
        </div>
      )}
    </motion.button>
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
    <div className="relative flex h-full min-h-[140px] flex-col justify-between overflow-hidden px-5 py-5 transition-colors hover:bg-[var(--secondary)]/10 xl:min-h-[112px] xl:px-4 xl:py-3">
      <div className="relative z-10 flex flex-col h-full">
        <div>
          <div className="flex items-center gap-2 text-[var(--muted-foreground)]">
            {Icon && <Icon size={13} />}
            <p className="text-xs font-bold uppercase tracking-[0.12em]">{title}</p>
          </div>
          <p className="mt-2 text-2xl font-semibold tracking-tight text-[var(--foreground)] xl:mt-1 xl:text-xl 2xl:text-2xl">{value}</p>
          <div className="mt-1 h-3.5">
            {sub && (
              <p className="font-mono text-[10px] tracking-wide text-[var(--muted-foreground)] truncate">{sub}</p>
            )}
          </div>
        </div>
        <div className="mt-auto pt-4 xl:pt-2">
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

      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.15 }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
        className="absolute inset-x-0 bottom-0 z-0 h-1/2 pointer-events-none"
      >
        <svg viewBox={`0 0 ${w} ${h}`} className="h-full w-full" preserveAspectRatio="none">
          <path d={areaPath} fill="var(--primary)" opacity="0.2" />
          <path d={path} fill="none" stroke="var(--primary)" strokeWidth="0.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </motion.div>
    </div>
  );
}

function formatUptime(seconds = 0) {
  seconds = Number(seconds);

  if (!Number.isFinite(seconds) || seconds <= 0) {
    return 'Offline';
  }

  const totalSeconds = Math.floor(seconds);

  const days = Math.floor(totalSeconds / 86_400);
  const hours = Math.floor((totalSeconds % 86_400) / 3_600);
  const minutes = Math.floor((totalSeconds % 3_600) / 60);
  const secs = totalSeconds % 60;

  const pad = (value: number) => String(value).padStart(2, '0');

  if (days > 0) {
    return `${days}d ${pad(hours)}:${pad(minutes)}:${pad(secs)}`;
  }

  return `${pad(hours)}:${pad(minutes)}:${pad(secs)}`;
}

// ─── ServerDetail ──────────────────────────────────────────────────────────────

export function ServerDetail({
  server, emitter, consoleHistory, metrics, busy, canDelete, canOperate, canFreeze, supportMode, connectAddress,
  filesView, modsView, settingsView, databasesView, webhooksView, backupsView, schedulesView,
  activityView, collaboratorsView,
  onStart, onRestart, onContainerUpdate, onStop, onFreeze, onUnfreeze, onDelete, onSendCommand
}: {
  server: ServerRecord;
  emitter: EventTarget;
  consoleHistory: string[];
  metrics: MetricsPoint[];
  busy: boolean;
  canDelete: boolean;
  canOperate: boolean;
  canFreeze: boolean;
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
  onContainerUpdate: () => void;
  onStop: () => void;
  onFreeze: () => void;
  onUnfreeze: () => void;
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
  const status = normalizeServerStatus(server.status);
  const running = status === 'running';
  const starting = status === 'starting';
  const frozen = status === 'frozen';
  const tone = serverStatusTone(status);
  const dot = serverStatusDot(status);
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
    if (item.value === 'variables') return allowed('settings');
    if (item.value === 'webhooks') return allowed('webhooks');
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

  const statCards = [
    {
      title: 'CPU Usage',
      icon: Cpu,
      value: `${(latest?.cpu || 0).toFixed(1)} %`,
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
    },
    {
      title: 'Uptime',
      icon: Clock3,
      value: formatUptime(latest?.uptimeSeconds),
      sub: latest?.uptimeSeconds ? 'Current container session' : 'Starts counting when running',
      data: metrics.map(p => p.uptimeSeconds || 0)
    }
  ];

  return (
    <Panel className="flex h-full min-h-0 flex-col overflow-hidden border-[var(--border)]/70 bg-[var(--card)] shadow-sm">

      {/* ── Header ── */}
      <div className="flex shrink-0 flex-col gap-4 border-b border-[var(--border)]/50 p-4 sm:p-5 lg:flex-row lg:items-center lg:justify-between xl:px-5 xl:py-4">
        <div className="min-w-0 flex-1 space-y-2">
          {/* Eyebrow */}
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--primary)]">Server</p>

          <div className="flex flex-wrap items-center gap-3">
            <h3 className="max-w-full truncate text-2xl font-semibold tracking-tight text-[var(--foreground)] 2xl:text-3xl">
              {server.name || server.id}<span className="text-[var(--primary)]">.</span>
            </h3>
            <Badge
              tone={tone}
              className="px-2.5 py-0.5 text-[10px] tracking-wider font-bold shrink-0"
            >
              {serverStatusLabel(server.status)}
            </Badge>
            {server.access && (
              <Badge className="px-2.5 py-0.5 text-[10px] uppercase tracking-wider font-bold shrink-0">
                {server.access.relationship === 'owner'
                  ? 'Your server'
                  : server.access.relationship === 'collaborator'
                    ? server.access.permission === 'operator' ? 'Shared · operator' : 'Shared · read only'
                    : server.access.canWrite ? 'Staff access' : 'Staff · read only'}
              </Badge>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3 text-sm min-w-0">
            {/* Status dot + port */}
            <span className="flex items-center gap-2 font-medium text-[var(--muted-foreground)] shrink-0">
              <span className="relative flex h-2 w-2 shrink-0">
                {(running || starting) && (
                  <span className={cn('absolute inline-flex h-full w-full animate-ping rounded-full opacity-75', dot)} />
                )}
                <span className={cn(
                  'relative inline-flex h-2 w-2 rounded-full',
                  dot
                )} />
              </span>
              Ports {server.assignedPorts?.length ? server.assignedPorts.join(', ') : server.assignedHostPort || 'none'}
            </span>

            {/* Connect address chip */}
            {connectAddress && (
              <div className="flex items-center gap-2 rounded-lg border border-[var(--border)]/60 bg-[var(--secondary)]/10 px-3 py-1.5 transition-colors hover:border-[var(--primary)]/30 min-w-0 max-w-full">
                <span className="font-mono text-xs font-medium text-[var(--foreground)] truncate">{connectAddress}</span>
                <button
                  onClick={handleCopy}
                  className="shrink-0 rounded-md p-0.5 text-[var(--muted-foreground)] transition-colors hover:bg-[var(--secondary)]/20 hover:text-[var(--foreground)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)]/50"
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

        {/* ── Redesigned Power & Admin Controls ── */}
        <div className="mt-1 flex w-full shrink-0 flex-col items-stretch gap-2 sm:flex-row sm:items-center lg:mt-0 lg:w-auto">
          
          {/* Primary Power Group */}
          <div className="flex items-center gap-1 rounded-[var(--radius-panel)] border border-[var(--border)]/60 bg-[var(--secondary)]/10 p-1 backdrop-blur-sm">
            <button
              className={cn(
                'flex-1 sm:flex-none flex items-center justify-center gap-2 rounded-md px-3 py-2 sm:py-1.5 text-sm font-bold transition-colors',
                'bg-[var(--success)]/10 text-[var(--success)] hover:bg-[var(--success)] hover:text-black',
                'disabled:opacity-40 disabled:hover:bg-[var(--success)]/10 disabled:hover:text-[var(--success)] disabled:cursor-not-allowed'
              )}
              disabled={busy || frozen || running || starting || !allowed('power')}
              onClick={onStart}
            >
              <Play size={14} className={cn(busy && 'animate-pulse')} /> Start
            </button>

            <button
              className={cn(
                'flex-1 sm:flex-none flex items-center justify-center gap-2 rounded-md px-3 py-2 sm:py-1.5 text-sm font-bold transition-colors',
                'bg-orange-500/10 text-orange-400 hover:bg-orange-500 hover:text-black',
                'disabled:opacity-40 disabled:hover:bg-orange-500/10 disabled:hover:text-orange-400 disabled:cursor-not-allowed'
              )}
              disabled={busy || frozen || (!running && !starting) || !allowed('power')}
              onClick={onRestart}
            >
              <RotateCw size={14} className={cn(busy && 'animate-spin')} /> Restart
            </button>

            <button
              className={cn(
                'flex-1 sm:flex-none flex items-center justify-center gap-2 rounded-md px-3 py-2 sm:py-1.5 text-sm font-bold transition-colors',
                'bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-black',
                'disabled:opacity-40 disabled:hover:bg-red-500/10 disabled:hover:text-red-500 disabled:cursor-not-allowed'
              )}
              disabled={busy || frozen || (!running && !starting) || !allowed('power')}
              onClick={onStop}
            >
              <Square size={13} fill="currentColor" /> Stop
            </button>
          </div>

          {/* Secondary Admin Group (Icon-only with tooltips) */}
          <div className="flex items-center justify-center gap-1 rounded-[var(--radius-panel)] border border-[var(--border)]/60 bg-[var(--secondary)]/10 p-1 backdrop-blur-sm">
            <button
              className={cn(
                'flex items-center justify-center rounded-md p-2 transition-colors',
                'text-sky-300/70 hover:bg-sky-500/10 hover:text-sky-300',
                'disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-sky-300/70 disabled:cursor-not-allowed'
              )}
              disabled={busy || frozen || starting || status === 'provisioning' || !allowed('power')}
              onClick={onContainerUpdate}
              title="Update Packages: Refresh the configured images to install their latest package patches. Files and database contents are retained, and stopped servers remain stopped."
            >
              <RefreshCw size={16} className={cn(busy && 'animate-spin')} />
            </button>

            {canFreeze && (
              <button
                className={cn(
                  'flex items-center justify-center rounded-md p-2 transition-colors',
                  frozen
                    ? 'text-yellow-400/70 hover:bg-yellow-500/10 hover:text-yellow-400'
                    : 'text-[var(--muted-foreground)] hover:bg-[var(--secondary)]/50 hover:text-[var(--foreground)]',
                  'disabled:opacity-40 disabled:hover:bg-transparent disabled:cursor-not-allowed'
                )}
                disabled={busy}
                onClick={frozen ? onUnfreeze : onFreeze}
                title={frozen ? 'Unfreeze Server' : 'Freeze Server'}
              >
                {frozen ? <LockOpen size={16} /> : <Snowflake size={16} />}
              </button>
            )}

            {canDelete && (
              <button
                className={cn(
                  'flex items-center justify-center rounded-md p-2 transition-colors',
                  'text-red-400/70 hover:bg-red-500/10 hover:text-red-400',
                  'disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-red-400/70 disabled:cursor-not-allowed'
                )}
                disabled={busy}
                onClick={onDelete}
                title="Delete Server"
              >
                <Trash2 size={16} />
              </button>
            )}
          </div>
        </div>
      </div>

      {frozen && (
        <div className="flex items-start gap-3 border-b border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-200/90 sm:px-6 md:px-8">
          <TriangleAlert size={16} className="mt-0.5 shrink-0 text-amber-400" />
          <p className="min-w-0 flex-1 leading-relaxed">
            <span className="font-bold text-amber-300">Server frozen</span> — This server is frozen by an administrator. Files and activity remain visible, but all changes and power actions are locked. This could be due to billing problem or a other cause, and you may need to contact support for assistance.
          </p>
        </div>
      )}

      {/* ── Metrics Grid ── */}
      <div
        className="grid w-full shrink-0 snap-x snap-mandatory grid-flow-col auto-cols-[minmax(9.5rem,48vw)] overflow-x-auto overscroll-x-contain border-b border-[var(--border)]/50 lg:grid-flow-row lg:auto-cols-auto lg:grid-cols-5 lg:overflow-visible"
        aria-label="Server metrics"
      >
        {statCards.map((card, idx) => (
          <motion.div
            key={`${server.id}-${card.title}`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...standardTransition, delay: idx * 0.05 }}
            className={cn(
              'h-full w-full snap-start border-[var(--border)]/50 bg-[var(--background)]/30',
              idx < statCards.length - 1 && 'border-r lg:border-r-0',
              idx > 0 && 'lg:border-l'
            )}
          >
            <StatCard {...card} />
          </motion.div>
        ))}
      </div>

      {/* ── Tabs ── */}
      <div className="w-full shrink-0 touch-pan-x overflow-x-auto overscroll-x-contain whitespace-nowrap border-b border-[var(--border)]/50 bg-[var(--secondary)]/5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <Tabs
          value={tab}
          items={tabs}
          onChange={value => setTab(value as typeof tab)}
        />
      </div>

      {/* ── Tab content ── */}
      <div
        className={cn(
          'relative h-[clamp(22rem,65dvh,38rem)] min-h-0 flex-none bg-[var(--background)] lg:h-0 lg:flex-1',
          tab === 'console'
            ? 'overflow-hidden'
            : 'touch-pan-y overflow-x-hidden overflow-y-auto overscroll-y-contain [scrollbar-gutter:stable] [-webkit-overflow-scrolling:touch]'
        )}
        tabIndex={tab === 'console' ? undefined : 0}
        aria-label={tab === 'console' ? undefined : `${tab} tab content`}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={tab}
            {...fadeSlideUp}
            transition={standardTransition}
            className={tab === 'console' || tab === 'files' ? 'h-full min-h-0' : 'min-h-full'}
          >
            {tab === 'console'   ? <ServerConsole key={server.id} emitter={emitter} history={consoleHistory} onSendCommand={onSendCommand} readOnly={frozen || !allowed('console.send')} className="h-full min-h-0 border-0" />
            : tab === 'files'    ? filesView
            : tab === 'mods'     ? modsView
            : tab === 'variables' ? settingsView
            : tab === 'databases' ? databasesView
            : tab === 'webhooks'  ? webhooksView
            : tab === 'backups'   ? backupsView
            : tab === 'schedules' ? schedulesView
            : tab === 'activity'  ? activityView
            : collaboratorsView}
          </motion.div>
        </AnimatePresence>
      </div>
    </Panel>
  );
}
