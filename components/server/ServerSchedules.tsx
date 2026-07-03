import { useEffect, useState } from 'react';
import { CalendarClock, Play, Pencil, Trash2, Plus, X, Check, Loader2 } from 'lucide-react';
import { ServerRecord, ServerSchedule } from '../../lib/types';
import { btn, ghostBtn, inp, label } from '../../lib/constants';
import { HeadersMap, agentServerPath, requestJson } from '../../lib/http';
import { cn } from '../ui';
import { useConfirm } from '../feedback/FeedbackProvider';

const ACTION_LABELS: Record<ServerSchedule['action'], string> = {
  restart: 'Restart server',
  start:   'Start server',
  stop:    'Stop server',
  command: 'Run command',
};

const INTERVAL_PRESETS = [
  { label: 'Every 5 minutes',  seconds: 300 },
  { label: 'Every 15 minutes', seconds: 900 },
  { label: 'Every 30 minutes', seconds: 1800 },
  { label: 'Every 1 hour',     seconds: 3600 },
  { label: 'Every 3 hours',    seconds: 10800 },
  { label: 'Every 6 hours',    seconds: 21600 },
  { label: 'Every 12 hours',   seconds: 43200 },
  { label: 'Every 24 hours',   seconds: 86400 },
  { label: 'Custom…',          seconds: 0 },
];

function intervalLabel(seconds: number) {
  const preset = INTERVAL_PRESETS.find(p => p.seconds === seconds && p.seconds > 0);
  if (preset) return preset.label;
  if (seconds < 60) return `Every ${seconds}s`;
  if (seconds < 3600) return `Every ${Math.floor(seconds / 60)}m`;
  if (seconds < 86400) return `Every ${Math.floor(seconds / 3600)}h`;
  return `Every ${Math.floor(seconds / 86400)}d`;
}

function nextRunLabel(iso?: string) {
  if (!iso) return '—';
  const delta = new Date(iso).getTime() - Date.now();
  if (delta < 0) return 'soon';
  const m = Math.floor(delta / 60000);
  if (m < 60) return `in ${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `in ${h}h`;
  return `in ${Math.floor(h / 24)}d`;
}

type FormState = {
  name: string;
  action: ServerSchedule['action'];
  command: string;
  presetSeconds: number;
  customSeconds: string;
  enabled: boolean;
};

const blank: FormState = {
  name: '',
  action: 'restart',
  command: '',
  presetSeconds: 3600,
  customSeconds: '',
  enabled: true,
};

function formToPayload(f: FormState) {
  const intervalSeconds = f.presetSeconds === 0 ? Number(f.customSeconds) : f.presetSeconds;
  return {
    name: f.name.trim(),
    action: f.action,
    command: f.action === 'command' ? f.command.trim() : undefined,
    intervalSeconds,
    enabled: f.enabled,
  };
}

export function ServerSchedules({
  server,
  apiBase,
  authHeaders,
}: {
  server: ServerRecord;
  apiBase: string;
  authHeaders: HeadersMap;
}) {
  const [schedules, setSchedules] = useState<ServerSchedule[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(blank);
  const [saving, setSaving] = useState(false);
  const [runningId, setRunningId] = useState<string | null>(null);
  const confirm = useConfirm();

  const base = agentServerPath(server, '/schedules');

  async function load() {
    setLoading(true);
    try {
      const data: ServerSchedule[] = await requestJson(apiBase, base, authHeaders) as any;
      setSchedules(Array.isArray(data) ? data : []);
    } catch (e: any) {
      setMessage(e.message || 'Failed to load schedules');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, [server.id]);

  function openCreate() {
    setEditId(null);
    setForm(blank);
    setShowForm(true);
    setMessage('');
  }

  function openEdit(s: ServerSchedule) {
    const preset = INTERVAL_PRESETS.find(p => p.seconds === s.intervalSeconds && p.seconds > 0);
    setEditId(s.id);
    setForm({
      name: s.name,
      action: s.action,
      command: s.command || '',
      presetSeconds: preset ? s.intervalSeconds : 0,
      customSeconds: preset ? '' : String(s.intervalSeconds),
      enabled: s.enabled,
    });
    setShowForm(true);
    setMessage('');
  }

  function cancelForm() {
    setShowForm(false);
    setEditId(null);
    setForm(blank);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage('');
    try {
      const payload = formToPayload(form);
      if (editId) {
        const updated: ServerSchedule = await requestJson(
          apiBase, base + '/' + editId, authHeaders, { method: 'PATCH', body: JSON.stringify(payload) }
        ) as any;
        setSchedules(prev => prev.map(s => s.id === editId ? updated : s));
      } else {
        const created: ServerSchedule = await requestJson(
          apiBase, base, authHeaders, { method: 'POST', body: JSON.stringify(payload) }
        ) as any;
        setSchedules(prev => [...prev, created]);
      }
      cancelForm();
    } catch (e: any) {
      setMessage(e.message || 'Failed to save schedule');
    } finally {
      setSaving(false);
    }
  }

  async function toggle(s: ServerSchedule) {
    try {
      const updated: ServerSchedule = await requestJson(
        apiBase, base + '/' + s.id, authHeaders,
        { method: 'PATCH', body: JSON.stringify({ enabled: !s.enabled }) }
      ) as any;
      setSchedules(prev => prev.map(x => x.id === s.id ? updated : x));
    } catch (e: any) {
      setMessage(e.message || 'Failed to toggle schedule');
    }
  }

  async function remove(s: ServerSchedule) {
    if (!await confirm({
      title: 'Delete this schedule?',
      description: `“${s.name}” will no longer run automatically.`,
      confirmLabel: 'Delete schedule',
      tone: 'danger'
    })) return;
    try {
      await requestJson(apiBase, base + '/' + s.id, authHeaders, { method: 'DELETE' });
      setSchedules(prev => prev.filter(x => x.id !== s.id));
    } catch (e: any) {
      setMessage(e.message || 'Failed to delete schedule');
    }
  }

  async function runNow(s: ServerSchedule) {
    setRunningId(s.id);
    setMessage('');
    try {
      await requestJson(apiBase, base + '/' + s.id + '/run', authHeaders, { method: 'POST' });
      setMessage(`"${s.name}" ran successfully`);
    } catch (e: any) {
      setMessage(e.message || 'Failed to run schedule');
    } finally {
      setRunningId(null);
    }
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-[var(--foreground)]">Schedules</h3>
          <p className="text-xs text-[var(--muted-foreground)] mt-0.5">Automated tasks that run on this server at regular intervals.</p>
        </div>
        {!showForm && (
          <button className={cn(btn, 'gap-2')} onClick={openCreate}>
            <Plus size={16} /> New Schedule
          </button>
        )}
      </div>

      {/* Feedback */}
      {message && (
        <p className={cn(
          'rounded-md border px-4 py-3 text-sm',
          message.toLowerCase().includes('fail') || message.toLowerCase().includes('error')
            ? 'border-[var(--destructive)]/30 bg-[var(--destructive)]/10 text-[var(--destructive)]'
            : 'border-[var(--success)]/30 bg-[var(--success)]/10 text-[var(--success)]'
        )}>
          {message}
        </p>
      )}

      {/* Form */}
      {showForm && (
        <form onSubmit={save} className="rounded-lg border border-[var(--border)] bg-[var(--secondary)]/30 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold text-[var(--foreground)]">
              {editId ? 'Edit Schedule' : 'New Schedule'}
            </h4>
            <button type="button" className={ghostBtn} onClick={cancelForm}><X size={16} /></button>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className={label}>Name</label>
              <input
                className={inp}
                placeholder="e.g. Daily restart"
                value={form.name}
                required
                onChange={e => setForm({ ...form, name: e.target.value })}
              />
            </div>

            <div className="space-y-1.5">
              <label className={label}>Action</label>
              <select
                className={inp}
                value={form.action}
                onChange={e => setForm({ ...form, action: e.target.value as ServerSchedule['action'] })}
              >
                {(Object.keys(ACTION_LABELS) as ServerSchedule['action'][]).map(a => (
                  <option key={a} value={a}>{ACTION_LABELS[a]}</option>
                ))}
              </select>
            </div>

            {form.action === 'command' && (
              <div className="sm:col-span-2 space-y-1.5">
                <label className={label}>Command</label>
                <input
                  className={cn(inp, 'font-mono')}
                  placeholder="say Server restarts in 5 minutes"
                  value={form.command}
                  required
                  onChange={e => setForm({ ...form, command: e.target.value })}
                />
              </div>
            )}

            <div className="space-y-1.5">
              <label className={label}>Interval</label>
              <select
                className={inp}
                value={form.presetSeconds}
                onChange={e => setForm({ ...form, presetSeconds: Number(e.target.value), customSeconds: '' })}
              >
                {INTERVAL_PRESETS.map(p => (
                  <option key={p.seconds} value={p.seconds}>{p.label}</option>
                ))}
              </select>
            </div>

            {form.presetSeconds === 0 && (
              <div className="space-y-1.5">
                <label className={label}>Custom interval (seconds, min 60)</label>
                <input
                  className={inp}
                  type="number"
                  min={60}
                  placeholder="3600"
                  value={form.customSeconds}
                  required
                  onChange={e => setForm({ ...form, customSeconds: e.target.value })}
                />
              </div>
            )}

            <div className="flex items-center gap-2 sm:col-span-2">
              <input
                type="checkbox"
                id="schedule-enabled"
                checked={form.enabled}
                onChange={e => setForm({ ...form, enabled: e.target.checked })}
              />
              <label htmlFor="schedule-enabled" className="text-sm text-[var(--foreground)] cursor-pointer">
                Enabled
              </label>
            </div>
          </div>

          <div className="flex gap-2 pt-1">
            <button type="submit" className={cn(btn, 'gap-2')} disabled={saving}>
              {saving ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />}
              {editId ? 'Save changes' : 'Create schedule'}
            </button>
            <button type="button" className={ghostBtn} onClick={cancelForm}>Cancel</button>
          </div>
        </form>
      )}

      {/* Schedule list */}
      {loading ? (
        <div className="flex items-center justify-center py-12 text-[var(--muted-foreground)]">
          <Loader2 size={24} className="animate-spin mr-2" /> Loading schedules…
        </div>
      ) : schedules.length === 0 && !showForm ? (
        <div className="flex flex-col items-center justify-center gap-3 py-16 text-center text-[var(--muted-foreground)]">
          <CalendarClock size={40} className="opacity-20" />
          <p className="text-sm">No schedules yet.</p>
          <p className="text-xs">Create a schedule to automatically restart the server, run commands, or change its power state.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {schedules.map(s => (
            <div
              key={s.id}
              className={cn(
                'flex flex-wrap items-center gap-3 rounded-lg border px-4 py-3 transition-colors',
                s.enabled
                  ? 'border-[var(--border)] bg-[var(--background)] hover:bg-[var(--secondary)]/40'
                  : 'border-[var(--border)]/50 bg-[var(--secondary)]/10 opacity-60'
              )}
            >
              {/* Toggle */}
              <button
                title={s.enabled ? 'Disable' : 'Enable'}
                onClick={() => toggle(s)}
                className={cn(
                  'flex-shrink-0 h-5 w-9 rounded-full transition-colors relative',
                  s.enabled ? 'bg-[var(--success)]' : 'bg-[var(--border)]'
                )}
              >
                <span className={cn(
                  'absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform',
                  s.enabled ? 'left-4' : 'left-0.5'
                )} />
              </button>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-[var(--foreground)] truncate">{s.name}</p>
                <p className="text-xs text-[var(--muted-foreground)] truncate">
                  {ACTION_LABELS[s.action]}{s.action === 'command' && s.command ? `: ${s.command}` : ''} · {intervalLabel(s.intervalSeconds)}
                  {s.enabled && s.nextRunAt && (
                    <span className="ml-2 text-[var(--muted-foreground)]/70">next run {nextRunLabel(s.nextRunAt)}</span>
                  )}
                  {s.lastRunAt && (
                    <span className="ml-2 text-[var(--muted-foreground)]/50">last ran {new Date(s.lastRunAt).toLocaleString()}</span>
                  )}
                </p>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <button
                  title="Run now"
                  className={cn(ghostBtn, 'h-9 w-9 p-0 text-[var(--muted-foreground)] hover:text-[var(--foreground)]')}
                  disabled={runningId === s.id}
                  onClick={() => runNow(s)}
                >
                  {runningId === s.id
                    ? <Loader2 size={32} className="animate-spin" />
                    : <Play size={32} />
                  }
                </button>
                <button
                  title="Edit"
                  className={cn(ghostBtn, 'h-9 w-9 p-0 text-[var(--muted-foreground)] hover:text-[var(--foreground)]')}
                  onClick={() => openEdit(s)}
                >
                  <Pencil size={32} />
                </button>
                <button
                  title="Delete"
                  className={cn(ghostBtn, 'h-9 w-9 p-0 text-[var(--muted-foreground)] hover:text-[var(--destructive)] hover:border-[var(--destructive)]/30')}
                  onClick={() => remove(s)}
                >
                  <Trash2 size={32} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
