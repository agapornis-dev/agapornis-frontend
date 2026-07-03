import { useEffect, useState } from 'react';
import { Activity, RefreshCw } from 'lucide-react';
import { ActivityLogEntry, ServerRecord } from '../../lib/types';
import { HeadersMap, agentServerPath, requestJson } from '../../lib/http';
import { ghostBtn, label } from '../../lib/constants';
import { cn } from '../ui';

const EVENT_LABELS: Record<string, string> = {
  'server.created':         'Server created',
  'server.deleted':         'Server deleted',
  'server.started':         'Server started',
  'server.stopped':         'Server stopped',
  'server.restarted':       'Server restarted',
  'server.command':         'Command sent',
  'server.settings_updated':'Settings updated',
  'server.egg_changed':     'Egg changed',
  'server.transferred':     'Server transferred',
  'server.backup_created':  'Backup created',
  'server.backup_deleted':  'Backup deleted',
  'server.backup_restored': 'Backup restored',
};

const EVENT_COLORS: Record<string, string> = {
  'server.started':         'text-[var(--success)]',
  'server.stopped':         'text-[var(--destructive)]',
  'server.deleted':         'text-[var(--destructive)]',
  'server.restarted':       'text-orange-500',
  'server.command':         'text-[var(--primary)]',
  'server.backup_restored': 'text-orange-500',
};

function EventBadge({ event }: { event: string }) {
  const color = EVENT_COLORS[event] || 'text-[var(--muted-foreground)]';
  return (
    <span className={cn(
      'inline-block rounded px-1.5 py-0.5 text-xs font-mono font-medium bg-[var(--secondary)]',
      color
    )}>
      {EVENT_LABELS[event] || event}
    </span>
  );
}

function EntryRow({ entry }: { entry: ActivityLogEntry }) {
  const date = new Date(entry.createdAt);
  const timeStr = date.toLocaleString();

  return (
    <div className="flex flex-col gap-0.5 px-4 py-2.5 border-b border-[var(--border)]/60 hover:bg-[var(--secondary)]/30 transition-colors">
      <div className="flex flex-wrap items-center gap-2">
        <EventBadge event={entry.event} />
        {(entry.userName || entry.userEmail) && (
          <span className="text-xs text-[var(--foreground)]">{entry.userName || entry.userEmail}</span>
        )}
        {entry.event === 'server.command' && entry.meta?.command && (
          <code className="text-xs font-mono text-[var(--primary)] bg-[var(--primary)]/10 px-1.5 py-0.5 rounded truncate max-w-xs">
            {entry.meta.command}
          </code>
        )}
      </div>
      <div className="flex items-center gap-3 text-xs text-[var(--muted-foreground)]">
        <span>{timeStr}</span>
        {entry.nodeId && <span className="font-mono opacity-70">{entry.nodeId}</span>}
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
  const [loading, setLoading] = useState(false);
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
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)] bg-[var(--secondary)]/20">
        <div className="flex items-center gap-2">
          <Activity size={16} className="text-[var(--muted-foreground)]" />
          <span className="text-sm font-medium text-[var(--foreground)]">Activity Log</span>
          {entries.length > 0 && (
            <span className="text-xs text-[var(--muted-foreground)]">({entries.length} events)</span>
          )}
        </div>
        <button
          className={cn(ghostBtn, 'h-7 w-7 p-0')}
          onClick={() => void load()}
          disabled={loading}
          title="Refresh"
        >
          <RefreshCw size={14} className={cn(loading && 'animate-spin')} />
        </button>
      </div>

      {error && (
        <p className="px-4 py-3 text-sm text-[var(--destructive)]">{error}</p>
      )}

      {!error && entries.length === 0 && !loading && (
        <div className="flex flex-col items-center justify-center gap-2 py-16 text-[var(--muted-foreground)]">
          <Activity size={36} className="opacity-20" />
          <p className="text-sm">No activity recorded yet.</p>
        </div>
      )}

      <div className="overflow-y-auto flex-1 max-h-[560px]">
        {entries.map(entry => <EntryRow key={entry.id} entry={entry} />)}
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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const ACCOUNT_EVENT_LABELS: Record<string, string> = {
    'auth.login':            'Logged in',
    'auth.register':         'Account created',
    'auth.profile_updated':  'Profile updated',
    'auth.password_changed': 'Password changed',
    'user.role_changed':     'Role changed',
  };

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
    <div className="rounded-lg border border-[var(--border)] overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)] bg-[var(--secondary)]/30">
        <div className="flex items-center gap-2">
          <Activity size={16} className="text-[var(--muted-foreground)]" />
          <span className="text-sm font-semibold text-[var(--foreground)]">Account Activity</span>
        </div>
        <button className={cn(ghostBtn, 'h-7 w-7 p-0')} onClick={() => void load()} disabled={loading} title="Refresh">
          <RefreshCw size={14} className={cn(loading && 'animate-spin')} />
        </button>
      </div>

      {error && <p className="px-4 py-3 text-sm text-[var(--destructive)]">{error}</p>}

      {!error && entries.length === 0 && !loading && (
        <div className="flex items-center justify-center py-10 text-sm text-[var(--muted-foreground)]">
          No activity recorded yet.
        </div>
      )}

      <div className="max-h-[400px] overflow-y-auto divide-y divide-[var(--border)]/60">
        {entries.map(entry => (
          <div key={entry.id} className="flex items-center justify-between px-4 py-2.5 hover:bg-[var(--secondary)]/30">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-[var(--foreground)]">
                {ACCOUNT_EVENT_LABELS[entry.event] || entry.event}
              </span>
              {entry.meta?.role && (
                <span className="text-xs text-[var(--muted-foreground)]">→ {entry.meta.role}</span>
              )}
            </div>
            <div className="flex items-center gap-3 text-xs text-[var(--muted-foreground)]">
              {entry.ip && <span className="font-mono">{entry.ip}</span>}
              <span>{new Date(entry.createdAt).toLocaleString()}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
