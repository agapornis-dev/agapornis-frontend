import { useState, useEffect } from 'react';
import { Clock, Webhook, Play, Trash2, Zap, AlertCircle } from 'lucide-react';
import { CronJobRecord, ServerRecord, WebhookTarget } from '../../lib/types';
import { btn, dangerBtn, ghostBtn, inp } from '../../lib/constants';
import { Panel, PanelHeader, EmptyState, Field, cn } from '../../components/ui';
import { parseObjectJson } from '../../lib/structured-input';

export function AutomationPage({
  apiBase, jobs, servers, webhookTargets, events, busy,
  onCreateCron, onRunCron, onDeleteCron, onCreateWebhook, onDeleteWebhook, onTestWebhook
}: {
  apiBase: string; jobs: CronJobRecord[]; servers: ServerRecord[]; webhookTargets: WebhookTarget[]; events: any[]; busy: boolean;
  onCreateCron: (data: any) => Promise<void>; onRunCron: (id: string) => Promise<void>; onDeleteCron: (id: string) => Promise<void>;
  onCreateWebhook: (data: any) => Promise<void>; onDeleteWebhook: (id: string) => Promise<void>; onTestWebhook: (id: string) => Promise<void>;
}) {
  const [cronForm, setCronForm] = useState({ name: '', intervalSeconds: '3600', action: 'server.restart', serverId: servers[0]?.id || '', webhookTargetId: '', eventType: 'cron.server_restart', payload: '{}' });
  const [hookForm, setHookForm] = useState({ name: '', provider: 'whmcs', url: '', secret: '', events: 'whmcs.server.provisioned', headers: '' });

  return (
    <div className="grid gap-6 xl:grid-cols-2">
      
      {/* CRON JOBS */}
      <Panel>
        <PanelHeader title={<div className="flex items-center gap-2"><Clock size={18}/> Scheduled Jobs (Cron)</div>} aside={jobs.length.toString()} />
        <form className="p-5 grid gap-4 border-b border-[var(--border)] bg-[var(--secondary)]/5" onSubmit={e => {
          e.preventDefault();
          onCreateCron({
            name: cronForm.name, intervalSeconds: Number(cronForm.intervalSeconds), action: cronForm.action,
            serverId: cronForm.serverId, webhookTargetId: cronForm.webhookTargetId || undefined,
            eventType: cronForm.eventType, payload: cronForm.action === 'server.restart' ? {} : parseObjectJson(cronForm.payload)
          });
        }}>
          <div className="grid md:grid-cols-2 gap-4">
            <Field label="Job Name"><input className={inp} placeholder="Daily Restart" value={cronForm.name} onChange={e => setCronForm({ ...cronForm, name: e.target.value })} required/></Field>
            <Field label="Interval (Seconds)"><input type="number" className={inp} value={cronForm.intervalSeconds} onChange={e => setCronForm({ ...cronForm, intervalSeconds: e.target.value })} required/></Field>
            <Field label="Action"><select className={inp} value={cronForm.action} onChange={e => setCronForm({ ...cronForm, action: e.target.value })}><option value="server.restart">Restart Server</option><option value="webhook.dispatch">Dispatch Webhook</option></select></Field>
            <Field label="Event Type Signature"><input className={inp} value={cronForm.eventType} onChange={e => setCronForm({ ...cronForm, eventType: e.target.value })} required/></Field>
            
            {cronForm.action === 'server.restart' ? (
              <div className="md:col-span-2"><Field label="Target Server"><select className={inp} value={cronForm.serverId} onChange={e => setCronForm({ ...cronForm, serverId: e.target.value })}>{servers.map(s => <option key={s.id} value={s.id}>{s.name} ({s.nodeId})</option>)}</select></Field></div>
            ) : (
              <>
                <Field label="Target Webhook"><select className={inp} value={cronForm.webhookTargetId} onChange={e => setCronForm({ ...cronForm, webhookTargetId: e.target.value })}><option value="">All matching targets</option>{webhookTargets.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}</select></Field>
                <div className="md:col-span-2"><Field label="JSON Payload"><textarea className={cn(inp, "font-mono text-xs")} value={cronForm.payload} onChange={e => setCronForm({ ...cronForm, payload: e.target.value })}/></Field></div>
              </>
            )}
          </div>
          <button className={cn(btn, "w-full")} disabled={busy}>Schedule Job</button>
        </form>
        
        <div className="divide-y divide-[var(--border)] max-h-[500px] overflow-y-auto">
          {jobs.length === 0 ? <EmptyState className="p-8">No scheduled jobs.</EmptyState> : jobs.map(job => (
            <div key={job.id} className="flex items-center justify-between p-4 hover:bg-[var(--secondary)]/10">
              <div>
                <h4 className="font-semibold text-[var(--foreground)] text-sm">{job.name}</h4>
                <div className="flex gap-2 text-xs text-[var(--muted-foreground)] mt-1">
                  <span className="bg-[var(--secondary)] px-2 py-0.5 rounded">{job.eventType}</span>
                  <span>Every {job.intervalSeconds}s</span>
                </div>
                <p className="text-xs text-[var(--muted-foreground)] mt-1 font-mono">Next: {job.nextRunAt || 'Not scheduled'}</p>
              </div>
              <div className="flex gap-2">
                <button className={cn(ghostBtn, "p-2")} onClick={() => onRunCron(job.id)} disabled={busy} title="Run Now"><Play size={16}/></button>
                <button className={cn(ghostBtn, "p-2 text-[var(--destructive)] hover:bg-[var(--destructive)]/10")} onClick={() => onDeleteCron(job.id)} disabled={busy} title="Delete"><Trash2 size={16}/></button>
              </div>
            </div>
          ))}
        </div>
      </Panel>

      {/* WEBHOOKS (Global/WHMCS) */}
      <div className="grid gap-6 content-start">
        <Panel>
          <PanelHeader title={<div className="flex items-center gap-2"><Webhook size={18}/> Integration Targets</div>} aside={webhookTargets.length.toString()} />
          <form className="p-5 grid gap-4 border-b border-[var(--border)] bg-[var(--secondary)]/5" onSubmit={e => {
            e.preventDefault();
            onCreateWebhook({ ...hookForm, headers: parseObjectJson(hookForm.headers), events: hookForm.events.split(',').map(i => i.trim()).filter(Boolean) });
          }}>
             <div className="grid md:grid-cols-2 gap-4">
               <Field label="Integration Name"><input className={inp} value={hookForm.name} onChange={e => setHookForm({ ...hookForm, name: e.target.value })} required/></Field>
               <Field label="Provider"><select className={inp} value={hookForm.provider} onChange={e => setHookForm({ ...hookForm, provider: e.target.value })}><option value="whmcs">WHMCS</option><option value="generic">Generic JSON</option></select></Field>
               <div className="md:col-span-2"><Field label="Endpoint URL"><input type="url" className={inp} value={hookForm.url} onChange={e => setHookForm({ ...hookForm, url: e.target.value })} required/></Field></div>
               <Field label="Subscribed Events (CSV)"><input className={inp} value={hookForm.events} onChange={e => setHookForm({ ...hookForm, events: e.target.value })} required/></Field>
               <Field label="Signing Secret"><input className={inp} value={hookForm.secret} onChange={e => setHookForm({ ...hookForm, secret: e.target.value })}/></Field>
             </div>
             <button className={cn(btn, "w-full")} disabled={busy}>Register Webhook</button>
          </form>

          <div className="divide-y divide-[var(--border)] max-h-64 overflow-y-auto">
            {webhookTargets.length === 0 ? <EmptyState className="p-4">No webhook targets.</EmptyState> : webhookTargets.map(t => (
              <div key={t.id} className="flex items-center justify-between p-4 hover:bg-[var(--secondary)]/10">
                <div className="min-w-0">
                  <h4 className="font-semibold text-sm">{t.name} <span className="text-xs font-normal text-[var(--muted-foreground)] ml-2">({t.provider})</span></h4>
                  <p className="text-xs font-mono text-[var(--muted-foreground)] truncate mt-1">{t.url}</p>
                </div>
                <div className="flex gap-2">
                  <button className={cn(ghostBtn, "p-2")} onClick={() => onTestWebhook(t.id)} disabled={busy}><Zap size={16}/></button>
                  <button className={cn(ghostBtn, "p-2 text-[var(--destructive)]")} onClick={() => onDeleteWebhook(t.id)} disabled={busy}><Trash2 size={16}/></button>
                </div>
              </div>
            ))}
          </div>
        </Panel>

        <Panel>
          <PanelHeader title={<div className="flex items-center gap-2"><AlertCircle size={18}/> Delivery History</div>} />
          <div className="divide-y divide-[var(--border)] max-h-60 overflow-y-auto">
             {events.length === 0 ? <EmptyState className="p-4">No deliveries yet.</EmptyState> : events.slice(0, 10).map(ev => (
              <div key={ev.id} className="p-3 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-[var(--foreground)]">{ev.event_type || ev.eventType}</p>
                  <p className="text-xs text-[var(--muted-foreground)] font-mono mt-0.5">Status: {ev.status_code || ev.statusCode}</p>
                </div>
                <span className={cn("text-xs font-bold px-2 py-1 rounded", ev.success ? "bg-[var(--success)]/10 text-[var(--success)]" : "bg-[var(--destructive)]/10 text-[var(--destructive)]")}>
                  {ev.success ? 'Delivered' : 'Failed'}
                </span>
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </div>
  );
}
