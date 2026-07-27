import { useEffect, useState } from 'react';
import {
  Webhook, Send, Trash2, Plus, Bell,
  MessageSquare, Globe, CheckCircle2, AlertCircle, Zap, Check
} from 'lucide-react';
import { ServerRecord, WebhookTarget } from '../../lib/types';
import { agentServerPath, HeadersMap, requestJson } from '../../lib/http';
import { btn, ghostBtn, inp } from '../../lib/constants';
import { Field, cn } from '../ui';
import { useConfirm } from '../feedback/FeedbackProvider';

const AVAILABLE_EVENTS = [
  { id: 'server.created', label: 'Created' },
  { id: 'server.started', label: 'Started' },
  { id: 'server.stopped', label: 'Stopped' },
  { id: 'server.restarted', label: 'Restarted' },
  { id: 'server.egg_changed', label: 'Egg Changed' },
  { id: 'server.deleted', label: 'Deleted' }
];

export function ServerWebhooks({
  server,
  apiBase,
  authHeaders
}: {
  server: ServerRecord;
  apiBase: string;
  authHeaders: HeadersMap;
}) {
  const [targets, setTargets] = useState<WebhookTarget[]>([]);
  const [message, setMessage] = useState({ text: '', type: 'info' });
  const [busy, setBusy] = useState(false);
  const confirm = useConfirm();
  const [form, setForm] = useState({
    name: 'Server status',
    provider: 'discord',
    url: '',
    chatId: '',
    events: ['server.started', 'server.stopped']
  });

  useEffect(() => {
    void refresh();
  }, [server.id, apiBase]);

  async function api(path: string, opts: RequestInit = {}) {
    return requestJson(apiBase, path, authHeaders, opts);
  }

  async function refresh() {
    try {
      const data = await api(agentServerPath(server, '/webhooks'));
      setTargets(Array.isArray(data) ? data : []);
    } catch (err) {
      setTargets([]);
    }
  }

  async function run(action: () => Promise<string>, isSilent = false) {
    setBusy(true);
    if (!isSilent) setMessage({ text: '', type: 'info' });
    
    try {
      const result = await action();
      if (!isSilent) setMessage({ text: result, type: 'success' });
      await refresh();
    } catch (error: any) {
      setMessage({ text: error.message, type: 'error' });
    } finally {
      setBusy(false);
      if (!isSilent) {
        setTimeout(() => setMessage({ text: '', type: 'info' }), 4000);
      }
    }
  }

  const toggleEvent = (eventId: string) => {
    setForm(prev => ({
      ...prev,
      events: prev.events.includes(eventId)
        ? prev.events.filter(id => id !== eventId)
        : [...prev.events, eventId]
    }));
  };

  const getProviderIcon = (provider: string) => {
    switch (provider) {
      case 'discord': return <MessageSquare size={16} className="text-indigo-400" />;
      case 'telegram': return <Send size={16} className="text-blue-400" />;
      default: return <Globe size={16} className="text-emerald-400" />;
    }
  };

  return (
    <div className="grid gap-8 p-6 mx-auto max-w-5xl">
      
      {/* Create Webhook Form */}
      <div className="rounded-xl border border-[var(--border)] bg-[var(--background)] shadow-sm overflow-hidden">
        <div className="flex items-center gap-2 border-b border-[var(--border)] bg-[var(--secondary)]/10 px-5 py-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--primary)]/10 text-[var(--primary)]">
            <Plus size={18} />
          </div>
          <div>
            <h3 className="font-semibold text-sm text-[var(--foreground)]">Add New Webhook</h3>
            <p className="text-xs text-[var(--muted-foreground)]">Send automated HTTP requests to external services.</p>
          </div>
        </div>
        
        <form
          className="p-5"
          onSubmit={e => {
            e.preventDefault();
            if (form.events.length === 0) {
              setMessage({ text: 'Please select at least one trigger event.', type: 'error' });
              return;
            }
            void run(async () => {
              await api(agentServerPath(server, '/webhooks'), {
                method: 'POST',
                body: JSON.stringify(form)
              });
              setForm(current => ({ ...current, url: '', chatId: '' }));
              return 'Server webhook added successfully';
            });
          }}
        >
          <div className="grid gap-6 md:grid-cols-2">
            <Field label="Configuration Name">
              <input className={inp} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Discord Alerts" required />
            </Field>
            
            <Field label="Provider">
              <select className={inp} value={form.provider} onChange={e => setForm({ ...form, provider: e.target.value })}>
                <option value="discord">Discord</option>
                <option value="telegram">Telegram</option>
                <option value="generic">Generic JSON</option>
              </select>
            </Field>
            
            <div className={cn("transition-all", form.provider === 'telegram' ? "md:col-span-1" : "md:col-span-2")}>
              <Field label="Webhook URL">
                <input className={inp} type="url" value={form.url} onChange={e => setForm({ ...form, url: e.target.value })} placeholder="https://..." required />
              </Field>
            </div>

            {form.provider === 'telegram' && (
              <Field label="Telegram Chat ID">
                <input className={inp} value={form.chatId} onChange={e => setForm({ ...form, chatId: e.target.value })} placeholder="e.g. -10012345678" required />
              </Field>
            )}

            {/* Interactive Events Toggles */}
            <div className="md:col-span-2 mt-2">
              <label className="mb-3 block text-sm font-medium text-[var(--foreground)]">Trigger Events</label>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {AVAILABLE_EVENTS.map(event => {
                  const isActive = form.events.includes(event.id);
                  return (
                    <button
                      key={event.id}
                      type="button"
                      onClick={() => toggleEvent(event.id)}
                      className={cn(
                        "flex items-center gap-2.5 rounded-lg border px-3 py-2.5 text-sm transition-all focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:ring-offset-1 focus:ring-offset-[var(--background)]",
                        isActive
                          ? "border-[var(--primary)]/50 bg-[var(--primary)]/10 text-[var(--primary)] shadow-sm"
                          : "border-[var(--border)] bg-[var(--secondary)]/5 text-[var(--muted-foreground)] hover:bg-[var(--secondary)]/20 hover:text-[var(--foreground)]"
                      )}
                    >
                      <div className={cn(
                        "flex h-4 w-4 shrink-0 items-center justify-center rounded-[4px] border",
                        isActive ? "bg-[var(--primary)] border-[var(--primary)] text-white" : "border-[var(--muted-foreground)]/40"
                      )}>
                        {isActive && <Check size={12} strokeWidth={3} />}
                      </div>
                      <span className="font-medium truncate">{event.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="mt-6 flex flex-col-reverse items-center justify-between gap-4 rounded-lg bg-[var(--secondary)]/10 p-4 border border-[var(--border)] sm:flex-row">
            <div className="flex-1 min-h-[24px]">
              {message.text && (
                <div className={cn(
                  "flex items-center gap-2 text-sm font-medium animate-in fade-in slide-in-from-bottom-1",
                  message.type === 'success' ? "text-[var(--success)]" : "text-[var(--destructive)]"
                )}>
                  {message.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                  {message.text}
                </div>
              )}
            </div>
            <button className={cn(btn, "w-full sm:w-auto gap-2 px-6 shadow-sm")} disabled={busy}>
              <Plus size={16} /> Add Webhook
            </button>
          </div>
        </form>
      </div>

      {/* Active Webhooks List */}
      <div className="rounded-xl border border-[var(--border)] bg-[var(--background)] shadow-sm overflow-hidden flex flex-col">
        <div className="flex items-center justify-between border-b border-[var(--border)] bg-[var(--secondary)]/10 px-5 py-4">
          <div className="flex items-center gap-2">
            <Webhook size={18} className="text-[var(--muted-foreground)]" />
            <h3 className="font-semibold text-[var(--foreground)]">Active Configurations</h3>
          </div>
          <span className="flex h-6 px-2.5 items-center justify-center rounded-full bg-[var(--primary)]/10 text-[var(--primary)] text-xs font-bold tracking-wide">
            {targets.length} {targets.length === 1 ? 'ACTIVE' : 'ACTIVE'}
          </span>
        </div>

        <div className="divide-y divide-[var(--border)] max-h-[500px] overflow-y-auto">
          {targets.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center px-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[var(--secondary)]/20 mb-4">
                <Bell size={28} className="text-[var(--muted-foreground)] opacity-50" />
              </div>
              <h4 className="text-sm font-semibold text-[var(--foreground)]">No webhooks active</h4>
              <p className="text-xs text-[var(--muted-foreground)] mt-1 max-w-[250px]">
                You haven't configured any event notifications for this server yet.
              </p>
            </div>
          ) : (
            targets.map(target => (
              <div key={target.id} className="group flex flex-col gap-4 p-5 hover:bg-[var(--secondary)]/5 transition-colors md:flex-row md:items-center md:justify-between">
                <div className="flex items-start gap-3.5 min-w-0 flex-1">
                  <div className="mt-0.5 flex shrink-0 h-9 w-9 items-center justify-center rounded-lg bg-[var(--secondary)]/30 border border-[var(--border)] shadow-sm">
                    {getProviderIcon(target.provider)}
                  </div>
                  <div className="min-w-0 pr-4">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-bold text-[var(--foreground)] truncate">{target.name}</p>
                      <span className="text-[10px] uppercase font-bold text-[var(--muted-foreground)] tracking-wider bg-[var(--secondary)] px-1.5 py-0.5 rounded">
                        {target.provider}
                      </span>
                    </div>
                    <p
                      className="
                        truncate
                        font-mono
                        text-[11px]
                        text-[var(--muted-foreground)]
                        mt-1
                        blur-md
                        hover:blur-none
                        transition-all
                        duration-200
                      "
                    >
                      {target.url}
                    </p>
                    <div className="mt-2.5 flex flex-wrap gap-1.5">
                      {(target.events || []).map(ev => (
                        <span key={ev} className="inline-flex items-center rounded-md border border-[var(--primary)]/20 bg-[var(--primary)]/5 px-2 py-0.5 text-[10px] font-medium text-[var(--primary)]">
                          {ev.replace('server.', '')}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
                
                <div className="flex shrink-0 items-center gap-2 border-t border-[var(--border)] pt-4 md:border-t-0 md:pt-0 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity focus-within:opacity-100">
                  <button 
                    className={cn(ghostBtn, "gap-2 text-[var(--muted-foreground)] hover:bg-[var(--secondary)] hover:text-[var(--foreground)]")} 
                    disabled={busy} 
                    onClick={() => void run(async () => {
                      await api(agentServerPath(server, `/webhooks/${target.id}/test`), { method: 'POST' });
                      return `Test payload sent to ${target.name}`;
                    })}
                    title="Send test payload"
                  >
                    <Zap size={16} /> <span className="md:hidden text-xs">Test</span>
                  </button>
                  <div className="w-px h-4 bg-[var(--border)] hidden md:block" />
                  <button 
                    className={cn(ghostBtn, "gap-2 text-[var(--muted-foreground)] hover:bg-[var(--destructive)]/10 hover:text-[var(--destructive)]")} 
                    disabled={busy} 
                    onClick={async () => {
                      if (await confirm({
                        title: 'Delete this webhook?',
                        description: `“${target.name}” will stop receiving server notifications.`,
                        confirmLabel: 'Delete webhook',
                        tone: 'danger'
                      })) {
                        void run(async () => {
                          await api(agentServerPath(server, `/webhooks/${target.id}`), { method: 'DELETE' });
                          return 'Webhook deleted successfully';
                        });
                      }
                    }}
                    title="Delete webhook"
                  >
                    <Trash2 size={16} /> <span className="md:hidden text-xs">Delete</span>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
