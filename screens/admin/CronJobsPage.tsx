import { useState, useEffect } from 'react';
import { Clock, Play, Trash2, Info, Plus, Terminal } from 'lucide-react';
import { CronJobRecord, ServerRecord, WebhookTarget } from '../../lib/types';
import { btn, ghostBtn, inp } from '../../lib/constants';
import { Panel, PanelHeader, EmptyState, Field, cn } from '../../components/ui';
import { requestJson } from '../../lib/http';
import { parseObjectJson } from '../../lib/structured-input';
import { useApiAction } from '../../hooks/useApiAction';

/* ── Self-contained screen (data fetching + UI) ─────────────────────── */

export function CronJobsScreen({ apiBase, showToast }: { apiBase: string; showToast: (msg: string, type: 'success' | 'error') => void }) {
  const [data, setData] = useState({ jobs: [] as CronJobRecord[], servers: [] as ServerRecord[], webhookTargets: [] as WebhookTarget[] });
  const [loading, setLoading] = useState(true);
  const { busy, run } = useApiAction(showToast);

  const fetchAll = async () => {
    const results = await Promise.all([
      requestJson(apiBase, '/cronjobs', {}).catch(() => []),
      requestJson(apiBase, '/servers', {}).catch(() => []),
      requestJson(apiBase, '/webhooks/targets', {}).catch(() => [])
    ]);
    setData({ jobs: results[0], servers: results[1], webhookTargets: results[2] });
    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, [apiBase]);

  if (loading) return <div>Loading...</div>;

  return (
    <CronJobsPanel
      jobs={data.jobs} servers={data.servers} webhookTargets={data.webhookTargets} busy={busy}
      onCreate={(formData) => run(() => requestJson(apiBase, '/cronjobs', {}, { method: 'POST', body: JSON.stringify(formData) }), 'Cron job scheduled').then(() => fetchAll())}
      onRun={(id) => run(() => requestJson(apiBase, `/cronjobs/${id}/run`, {}, { method: 'POST' }), 'Cron job execution triggered').then(() => fetchAll())}
      onDelete={(id) => run(() => requestJson(apiBase, `/cronjobs/${id}`, {}, { method: 'DELETE' }), 'Cron job deleted').then(() => fetchAll())}
    />
  );
}

export function CronJobsPanel({
  jobs, servers, webhookTargets, busy, onCreate, onRun, onDelete
}: {
  jobs: CronJobRecord[]; servers: ServerRecord[]; webhookTargets: WebhookTarget[]; busy: boolean;
  onCreate: (data: any) => Promise<void>;
  onRun: (id: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}) {
  const firstServer = servers[0];
  const [form, setForm] = useState({
    name: 'Restart server',
    intervalSeconds: '3600',
    action: 'server.restart',
    command: '',
    serverId: firstServer?.id || '',
    webhookTargetId: '',
    eventType: 'cron.server_restart',
    payload: '{}'
  });

  useEffect(() => {
    if (!form.serverId && firstServer?.id) setForm(current => ({ ...current, serverId: firstServer.id }));
  }, [firstServer?.id, form.serverId]);

  const selectedServer = servers.find(server => server.id === form.serverId);

  return (
    <div className="grid gap-6 mx-auto max-w-5xl xl:grid-cols-[minmax(0,1fr)_350px]">
      
      {/* MAIN COLUMN: Cron Jobs List & Form */}
      <div className="grid gap-6 content-start">
        <Panel>
          <PanelHeader title={<div className="flex items-center gap-2"><Clock size={18}/> Scheduled Jobs (Cron)</div>} aside={jobs.length.toString()} />
          
          <form className="p-5 grid gap-4 border-b border-[var(--border)] bg-[var(--secondary)]/5" onSubmit={e => {
            e.preventDefault();
            const payload = form.action === 'server.restart' ? {} : parseObjectJson(form.payload);
            onCreate({
              name: form.name,
              intervalSeconds: Number(form.intervalSeconds),
              action: form.action,
              nodeId: selectedServer?.nodeId,
              serverId: selectedServer?.id,
              webhookTargetId: form.webhookTargetId || undefined,
              eventType: form.eventType,
              payload
            });
          }}>
            <div className="grid md:grid-cols-2 gap-4">
              <Field label="Job Name">
                <input className={inp} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
              </Field>
              <Field label="Run Interval (Seconds)">
                <input type="number" className={inp} value={form.intervalSeconds} onChange={e => setForm({ ...form, intervalSeconds: e.target.value })} required />
              </Field>
              <Field label="Execution Action">
                <select className={inp} value={form.action} onChange={e => setForm({ ...form, action: e.target.value })}>
                  <option value="server.restart">Restart Server</option>
                  <option value="server.start">Start Server</option>
                  <option value="server.stop">Stop Server</option>
                  <option value="server.command">Send Command to Server</option>
                  <option value="webhook.dispatch">Dispatch Webhook Payload</option>
                </select>
              </Field>
              <Field label="Event Signature">
                <input className={inp} value={form.eventType} onChange={e => setForm({ ...form, eventType: e.target.value })} required />
              </Field>
              
              {['server.restart', 'server.start', 'server.stop', 'server.command'].includes(form.action) && (
                <div className="md:col-span-2 border-t border-[var(--border)] pt-4 mt-2 grid gap-4">
                  <Field label="Target Server">
                    <select className={inp} value={form.serverId} onChange={e => setForm({ ...form, serverId: e.target.value })}>
                      {servers.map(server => <option key={server.id} value={server.id}>{server.name || server.id} ({server.nodeId})</option>)}
                    </select>
                  </Field>
                  {form.action === 'server.command' && (
                    <Field label={<span className="flex items-center gap-1.5"><Terminal size={12} /> Command</span>}>
                      <input className={cn(inp, 'font-mono')} placeholder="say Server restarts in 5 minutes" value={form.command} required onChange={e => setForm({ ...form, command: e.target.value })} />
                    </Field>
                  )}
                </div>
              )}

              {!['server.restart', 'server.start', 'server.stop', 'server.command'].includes(form.action) && (
                <>
                  <div className="md:col-span-2 border-t border-[var(--border)] pt-4 mt-2">
                    <Field label="Target Webhook">
                      <select className={inp} value={form.webhookTargetId} onChange={e => setForm({ ...form, webhookTargetId: e.target.value })}>
                        <option value="">Broadcast to all matching targets</option>
                        {webhookTargets.map(target => <option key={target.id} value={target.id}>{target.name}</option>)}
                      </select>
                    </Field>
                  </div>
                  <div className="md:col-span-2">
                    <Field label="Custom Payload (JSON)">
                      <textarea className={cn(inp, "min-h-[100px] font-mono text-xs")} value={form.payload} onChange={e => setForm({ ...form, payload: e.target.value })} />
                    </Field>
                  </div>
                </>
              )}
            </div>
            
            <div className="flex justify-end pt-2">
              <button className={cn(btn, "px-6 gap-2")} disabled={busy}><Plus size={16}/> Create Cron Job</button>
            </div>
          </form>
          
          <div className="divide-y divide-[var(--border)] max-h-[500px] overflow-y-auto">
            {jobs.length === 0 ? <EmptyState className="p-8">No cron jobs configured.</EmptyState> : jobs.map(job => (
              <div key={job.id} className="flex items-center justify-between p-4 hover:bg-[var(--secondary)]/10 transition-colors">
                <div className="min-w-0">
                  <h4 className="font-semibold text-sm text-[var(--foreground)]">{job.name}</h4>
                  <div className="mt-1 flex items-center gap-2 text-xs text-[var(--muted-foreground)]">
                    <span className="bg-[var(--secondary)]/50 border border-[var(--border)] px-1.5 py-0.5 rounded font-mono">
                      {job.eventType}
                    </span>
                    <span>•</span>
                    <span>Runs every {job.intervalSeconds}s</span>
                  </div>
                  <p className="mt-1.5 text-xs text-[var(--muted-foreground)] font-mono">Next Execution: {job.nextRunAt || 'Pending schedule...'}</p>
                </div>
                <div className="flex gap-2 shrink-0 ml-4">
                  <button className={cn(ghostBtn, "p-2")} onClick={() => onRun(job.id)} disabled={busy} title="Force Run Now"><Play size={16}/></button>
                  <button className={cn(ghostBtn, "p-2 text-[var(--destructive)] hover:bg-[var(--destructive)]/10")} onClick={() => onDelete(job.id)} disabled={busy} title="Delete Job"><Trash2 size={16}/></button>
                </div>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      {/* SIDEBAR COLUMN: Context/Info */}
      <div className="grid gap-6 content-start">
        {form.action === 'server.restart' && (
          <Panel>
            <PanelHeader title={<div className="flex items-center gap-2"><Info size={18}/> Server Context</div>} />
            <div className="p-4 grid gap-3 bg-[var(--secondary)]/5">
              <div className="rounded-md border border-[var(--border)] p-3 bg-[var(--background)]">
                <p className="text-xs text-[var(--muted-foreground)] mb-1 uppercase tracking-wider font-semibold">Selected Target</p>
                <p className="text-sm font-medium text-[var(--foreground)] truncate">{selectedServer?.name || selectedServer?.id || 'No server selected'}</p>
              </div>
              
              <div className="rounded-md border border-[var(--border)] p-3 bg-[var(--background)]">
                <p className="text-xs text-[var(--muted-foreground)] mb-1 uppercase tracking-wider font-semibold">Allocated Node</p>
                <p className="text-sm font-medium text-[var(--foreground)] truncate font-mono">{selectedServer?.nodeId || 'N/A'}</p>
              </div>
              
              <div className="mt-2 text-xs text-[var(--muted-foreground)] leading-relaxed flex items-start gap-2">
                <Info size={14} className="shrink-0 mt-0.5" />
                <p>This job will automatically dispatch a restart command to the selected daemon node at the specified interval.</p>
              </div>
            </div>
          </Panel>
        )}
      </div>
      
    </div>
  );
}
