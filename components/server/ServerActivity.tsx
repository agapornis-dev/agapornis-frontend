import { useEffect, useState } from 'react';
import { 
  Activity, RefreshCw, Play, Square, RotateCcw, 
  Terminal, Settings, Archive, ArrowRightLeft, 
  Database, Shield, User, Key, LogIn, RefreshCwIcon, TriangleAlert
} from 'lucide-react';
import { ActivityLogEntry, ServerRecord } from '../../lib/types';
import { HeadersMap, agentServerPath, requestJson } from '../../lib/http';
import { ghostBtn } from '../../lib/constants';
import { cn } from '../ui';

// -------------------------------------------------------
// Configuration & Mapping
// -------------------------------------------------------

type EventConfig = { label: string; color: string; icon: any; row?: string };

const EVENT_CONFIG: Record<string, EventConfig> = {
  'server.created':         { label: 'Server created', color: 'text-[var(--primary)] bg-[var(--primary)]/10', icon: Database },
  'server.deleted':         { label: 'Server deleted', color: 'text-[var(--destructive)] bg-[var(--destructive)]/10', icon: Archive },
  'server.started':         { label: 'Server started', color: 'text-[var(--success)] bg-[var(--success)]/10', icon: Play },
  'server.stopped':         { label: 'Server stopped', color: 'text-[var(--destructive)] bg-[var(--destructive)]/10', icon: Square },
  'server.restarted':       { label: 'Server restarted', color: 'text-orange-500 bg-orange-500/10', icon: RotateCcw },
  'server.command':         { label: 'Command sent', color: 'text-[var(--foreground)] bg-[var(--secondary)]', icon: Terminal },
  'server.settings_updated':{ label: 'Settings updated', color: 'text-blue-500 bg-blue-500/10', icon: Settings },
  'server.egg_changed':     { label: 'Egg changed', color: 'text-purple-500 bg-purple-500/10', icon: Database },
  'server.transferred':     { label: 'Server transferred', color: 'text-teal-500 bg-teal-500/10', icon: ArrowRightLeft },
  'server.backup_created':  { label: 'Backup created', color: 'text-indigo-500 bg-indigo-500/10', icon: Shield },
  'server.backup_deleted':  { label: 'Backup deleted', color: 'text-rose-500 bg-rose-500/10', icon: Archive },
  'server.backup_restored': { label: 'Backup restored', color: 'text-orange-500 bg-orange-500/10', icon: RotateCcw },
  'server.containers_updated': { label: 'Packages updated', color: 'text-indigo-500 bg-indigo-500/10', icon: RefreshCwIcon },
  'server.schedule_removed_after_failures': {
    label: 'Schedule removed after repeated failures',
    color: 'bg-amber-500/15 text-amber-600 dark:text-amber-300',
    icon: TriangleAlert,
    row: 'bg-amber-500/[0.04] hover:bg-amber-500/[0.08]'
  },
};

const ACCOUNT_EVENT_CONFIG: Record<string, { label: string, icon: any }> = {
  'auth.login':             { label: 'Logged in', icon: LogIn },
  'auth.register':          { label: 'Account created', icon: User },
  'auth.profile_updated':   { label: 'Profile updated', icon: Settings },
  'auth.password_changed':  { label: 'Password changed', icon: Key },
  'auth.sessions_revoked':  { label: 'All sessions revoked', icon: Shield },
  'user.role_changed':      { label: 'Role changed', icon: Shield },
};

// -------------------------------------------------------
// Shared Components
// -------------------------------------------------------

function SkeletonRow() {
  return (
    <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)]/60 animate-pulse">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-[var(--secondary)]" />
        <div className="space-y-2">
          <div className="h-3 w-24 bg-[var(--secondary)] rounded" />
          <div className="h-2 w-32 bg-[var(--secondary)]/50 rounded" />
        </div>
      </div>
      <div className="h-2 w-20 bg-[var(--secondary)] rounded" />
    </div>
  );
}

// -------------------------------------------------------
// Server Activity
// -------------------------------------------------------

function ServerEntryRow({ entry }: { entry: ActivityLogEntry }) {
  const date = new Date(entry.createdAt);
  const config: EventConfig = EVENT_CONFIG[entry.event] || {
    label: entry.event, 
    color: 'text-[var(--muted-foreground)] bg-[var(--secondary)]', 
    icon: Activity 
  };
  const Icon = config.icon;
  const scheduleRemoved = entry.event === 'server.schedule_removed_after_failures';
  const scheduleName = String(entry.meta?.scheduleName || 'Unnamed schedule');
  const parsedFailureCount = Number(entry.meta?.failureCount);
  const failureCount = Number.isFinite(parsedFailureCount) && parsedFailureCount > 0
    ? parsedFailureCount
    : 3;
  const failureReason = String(entry.meta?.reason || '').trim();

  return (
    <div className={cn(
      'flex flex-col justify-between gap-3 border-b border-[var(--border)]/60 px-4 py-3 transition-colors hover:bg-[var(--secondary)]/20 sm:flex-row sm:items-center',
      config.row
    )}>
      <div className="flex min-w-0 flex-1 items-start gap-3 sm:items-center">
        <div className={cn("p-1.5 rounded-md shrink-0", config.color)}>
          <Icon size={14} />
        </div>
        
        <div className="flex flex-col min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-[var(--foreground)] truncate">
              {config.label}
            </span>
            {entry.event === 'server.command' && entry.meta?.command && (
              <code className="text-[10px] font-mono text-[var(--muted-foreground)] bg-[var(--secondary)] px-1.5 py-0.5 rounded truncate max-w-[150px] sm:max-w-xs">
                 {entry.meta.command}
              </code>
            )}
          </div>
          
          {(entry.userName || entry.userEmail) && (
            <span className="text-xs text-[var(--muted-foreground)] truncate">
              by {entry.userName || entry.userEmail}
            </span>
          )}

          {scheduleRemoved && (
            <div className="mt-1.5 max-w-3xl text-xs leading-5 text-[var(--muted-foreground)]">
              <p>
                <span className="font-semibold text-[var(--foreground)]">“{scheduleName}”</span>
                {' '}was automatically removed after {failureCount} consecutive failed {failureCount === 1 ? 'attempt' : 'attempts'}.
              </p>
              {failureReason && (
                <p className="mt-0.5 break-words font-mono text-[11px] text-amber-700 dark:text-amber-200/80">
                  Last error: {failureReason}
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="flex sm:flex-col items-center sm:items-end gap-2 sm:gap-0.5 shrink-0 ml-9 sm:ml-0 text-xs text-[var(--muted-foreground)]">
        <span>{date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
        {entry.nodeId && <span className="font-mono text-[10px] opacity-60">Node: {entry.nodeId}</span>}
      </div>
    </div>
  );
}

export function ServerActivity({
  server,
  apiBase,
  authHeaders,
}: {
  server: ServerRecord;
  apiBase: string;
  authHeaders: HeadersMap;
}) {
  const [entries, setEntries] = useState<ActivityLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function load() {
    setLoading(true);
    setError('');
    try {
      const data = await requestJson(
        apiBase,
        agentServerPath(server, '/activity'),
        authHeaders
      );
      setEntries(Array.isArray(data) ? data : []);
    } catch (e: any) {
      setError(e.message || 'Failed to load activity');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, [server.id]);

  return (
    <div className="flex flex-col h-full bg-[var(--background)] border border-[var(--border)] rounded-lg overflow-hidden shadow-sm">
      <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)] bg-[var(--secondary)]/10">
        <div className="flex items-center gap-2">
          <Activity size={16} className="text-[var(--primary)]" />
          <h3 className="text-sm font-semibold text-[var(--foreground)]">Activity Log</h3>
          {!loading && entries.length > 0 && (
            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-[var(--secondary)] text-[var(--muted-foreground)]">
              {entries.length}
            </span>
          )}
        </div>
      <button
        type="button" // Prevents accidental form submissions
        className={cn(
          ghostBtn, 
          'h-10 w-10 p-0 flex items-center justify-center text-[var(--muted-foreground)] hover:text-[var(--foreground)] disabled:opacity-50 disabled:cursor-not-allowed'
        )}
        onClick={() => void load()}
        disabled={loading}
        title="Refresh"
      >
        {/* Wrap the icon in a span to handle the spin animation safely */}
        <span className={cn("flex items-center justify-center", loading && "animate-spin")}>
          <RefreshCw size={14} />
        </span>
      </button>
      
      </div>

      {error && (
        <div className="px-4 py-3 m-4 text-sm border rounded bg-[var(--destructive)]/10 border-[var(--destructive)]/20 text-[var(--destructive)]">
          {error}
        </div>
      )}

      <div className="overflow-y-auto flex-1 max-h-[560px]">
        {loading && entries.length === 0 ? (
          Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)
        ) : entries.length === 0 && !error ? (
          <div className="flex flex-col items-center justify-center gap-3 py-16 text-[var(--muted-foreground)]">
            <div className="p-3 rounded-full bg-[var(--secondary)]/30">
              <Activity size={24} className="opacity-50" />
            </div>
            <p className="text-sm">No activity recorded yet.</p>
          </div>
        ) : (
          entries.map(entry => <ServerEntryRow key={entry.id} entry={entry} />)
        )}
      </div>
    </div>
  );
}

// -------------------------------------------------------
// Account activity (used in ProfilePage)
// -------------------------------------------------------

export function AccountActivity({
  apiBase,
  authHeaders,
}: {
  apiBase: string;
  authHeaders: HeadersMap;
}) {
  const [entries, setEntries] = useState<ActivityLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function load() {
    setLoading(true);
    setError('');
    try {
      const data = await requestJson(apiBase, '/auth/activity', authHeaders);
      setEntries(Array.isArray(data) ? data : []);
    } catch (e: any) {
      setError(e.message || 'Failed to load activity');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--background)] overflow-hidden shadow-sm">
      <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)] bg-[var(--secondary)]/10">
        <div className="flex items-center gap-2">
          <Shield size={16} className="text-[var(--primary)]" />
          <h3 className="text-sm font-semibold text-[var(--foreground)]">Account Security Log</h3>
        </div>
      <button
        type="button" // Prevents accidental form submissions
        className={cn(
          ghostBtn, 
          'h-10 w-10 p-0 flex items-center justify-center text-[var(--muted-foreground)] hover:text-[var(--foreground)] disabled:opacity-50 disabled:cursor-not-allowed'
        )}
        onClick={() => void load()}
        disabled={loading}
        title="Refresh"
      >
        {/* Wrap the icon in a span to handle the spin animation safely */}
        <span className={cn("flex items-center justify-center", loading && "animate-spin")}>
          <RefreshCw size={14} />
        </span>
      </button>
      </div>

      {error && (
        <div className="px-4 py-3 m-4 text-sm border rounded bg-[var(--destructive)]/10 border-[var(--destructive)]/20 text-[var(--destructive)]">
          {error}
        </div>
      )}

      <div className="max-h-[400px] overflow-y-auto divide-y divide-[var(--border)]/60">
        {loading && entries.length === 0 ? (
           Array.from({ length: 3 }).map((_, i) => <SkeletonRow key={i} />)
        ) : entries.length === 0 && !error ? (
          <div className="flex flex-col items-center justify-center py-12 text-[var(--muted-foreground)]">
            <p className="text-sm">No security events found.</p>
          </div>
        ) : (
          entries.map(entry => {
            const config = ACCOUNT_EVENT_CONFIG[entry.event] || { label: entry.event, icon: Activity };
            const Icon = config.icon;
            
            return (
              <div key={entry.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-4 py-3 hover:bg-[var(--secondary)]/20 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="p-1.5 rounded-md bg-[var(--secondary)] text-[var(--foreground)]">
                    <Icon size={14} />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-[var(--foreground)]">
                      {config.label}
                    </span>
                    {entry.meta?.role && (
                      <span className="text-xs text-[var(--muted-foreground)]">Role updated to: <strong className="font-medium">{entry.meta.role}</strong></span>
                    )}
                  </div>
                </div>
                
                <div className="flex sm:flex-col items-center sm:items-end gap-2 sm:gap-0.5 ml-9 sm:ml-0 text-xs text-[var(--muted-foreground)]">
                  {entry.ip && <span className="font-mono bg-[var(--secondary)] px-1.5 py-0.5 rounded">{entry.ip}</span>}
                  <span>{new Date(entry.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
