import { useEffect, useMemo, useState } from 'react';
import {
  Bell, Copy, PackagePlus, Save, Trash2, Webhook,
  Zap, Server, Cpu, HardDrive, CheckCircle2, XCircle,
  Plus, Activity, Database, Archive, Check, Settings2
} from 'lucide-react';
import { ServerPlan, WebhookTarget } from '../../lib/types';
import { btn, ghostBtn, inp } from '../../lib/constants';
import { Panel, PanelHeader, EmptyState, Field, cn, formControlClass } from '../../components/ui';
import { useConfirm } from '../../components/feedback/FeedbackProvider';
import { AllowedEggNestPicker, EggSelectOptions } from '../../components/admin/EggNestFields';
import { requestJson } from '../../lib/http';
import { parseObjectJson, parseVariablesText, variablesText } from '../../lib/structured-input';
import { useApiAction } from '../../hooks/useApiAction';

/* ── Self-contained screen (data fetching + UI) ─────────────────────── */

export function WebhooksScreen({ apiBase, showToast }: { apiBase: string; showToast: (msg: string, type: 'success' | 'error') => void }) {
  const [data, setData] = useState({ targets: [] as any[], events: [] as any[], plans: [] as any[], eggs: [] as any[], agents: [] as any[] });
  const [loading, setLoading] = useState(true);
  const { busy, run } = useApiAction(showToast);

  const fetchAll = async () => {
    const results = await Promise.all([
      requestJson(apiBase, '/webhooks/targets', {}).catch(() => []),
      requestJson(apiBase, '/webhooks/events', {}).catch(() => []),
      requestJson(apiBase, '/server-plans', {}).catch(() => []),
      requestJson(apiBase, '/eggs', {}).catch(() => []),
      requestJson(apiBase, '/agents', {}).catch(() => [])
    ]);
    setData({ targets: results[0], events: results[1], plans: results[2], eggs: results[3], agents: results[4] });
    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, [apiBase]);

  if (loading) return <div>Loading...</div>;

  return (
    <WebhooksPanel
      apiBase={apiBase}
      targets={data.targets} events={data.events} plans={data.plans} eggs={data.eggs} agents={data.agents}
      busy={busy}
      onCreate={(formData) => run(() => requestJson(apiBase, '/webhooks/targets', {}, { method: 'POST', body: JSON.stringify(formData) }), 'Webhook target added').then(() => fetchAll())}
      onDelete={(id) => run(() => requestJson(apiBase, `/webhooks/targets/${id}`, {}, { method: 'DELETE' }), 'Webhook target deleted').then(() => fetchAll())}
      onTest={(id) => run(() => requestJson(apiBase, `/webhooks/test/${id}`, {}, { method: 'POST', body: JSON.stringify({ ok: true }) }), 'Test payload sent').then(() => fetchAll())}
      onCreatePlan={(formData) => run(() => requestJson(apiBase, '/server-plans', {}, { method: 'POST', body: JSON.stringify(formData) }), 'Server plan created').then(() => fetchAll())}
      onUpdatePlan={(id, formData) => run(() => requestJson(apiBase, `/server-plans/${id}`, {}, { method: 'PATCH', body: JSON.stringify(formData) }), 'Server plan updated').then(() => fetchAll())}
      onDeletePlan={(id) => run(() => requestJson(apiBase, `/server-plans/${id}`, {}, { method: 'DELETE' }), 'Server plan deleted').then(() => fetchAll())}
    />
  );
}

const blankPlan = {
  id: '',
  name: '',
  enabled: true,
  externalIds: '',
  eggId: '',
  eggChangeAllowed: false,
  allowedEggIds: [] as string[],
  location: '',
  nodeId: 'auto-least-memory',
  memoryMb: '1024',
  diskMb: '10240',
  cpuLimitPercentage: '100',
  cpuPinnedThreads: '',
  swapMemoryMb: '0',
  swapMemoryStorage: 'general' as 'server' | 'general',
  portCount: '1',
  databasesEnabled: false,
  databaseLimit: '0',
  databaseMemoryMb: '512',
  databaseDiskMb: '1024',
  databaseCpuLimitPercentage: '50',
  allowedDatabaseTypes: ['mariadb'] as Array<'mysql' | 'mariadb' | 'postgres'>,
  databasePortRangeMode: 'game' as 'game' | 'separate',
  databasePortRangeStart: '33060',
  databasePortRangeEnd: '33160',
  dockerImage: '',
  backupLimit: '0',
  variablesText: ''
};

const customInputStyle = formControlClass();

export function WebhooksPanel({
  apiBase,
  targets,
  events,
  plans,
  eggs,
  agents,
  busy,
  onCreate,
  onDelete,
  onTest,
  onCreatePlan,
  onUpdatePlan,
  onDeletePlan
}: {
  apiBase: string;
  targets: WebhookTarget[];
  events: any[];
  plans: ServerPlan[];
  eggs: any[];
  agents: any[];
  busy: boolean;
  onCreate: (data: any) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onTest: (id: string) => Promise<void>;
  onCreatePlan: (data: any) => Promise<void>;
  onUpdatePlan: (id: string, data: any) => Promise<void>;
  onDeletePlan: (id: string) => Promise<void>;
}) {
  const [targetForm, setTargetForm] = useState({
    name: 'Billing notifications',
    provider: 'generic',
    url: '',
    chatId: '',
    secret: '',
    events: 'billing.server.provisioned,billing.server.removed',
    headers: ''
  });
  const [planForm, setPlanForm] = useState(blankPlan);
  const [editingPlanId, setEditingPlanId] = useState('');
  const confirm = useConfirm();
  const endpointBase = `API_URL/api/billing`;
  const firstEgg = eggs[0];
  const locations = useMemo(() => Array.from(new Set(agents.map(agent => String(agent.location || '').trim().toLocaleLowerCase()).filter(Boolean))).sort(), [agents]);
  const locationNodes = agents.filter(agent => String(agent.location || '').trim().toLocaleLowerCase() === planForm.location);
  const [activeTab, setActiveTab] = useState('general');
  useEffect(() => {
    if (!planForm.eggId && firstEgg?.id) {
      setPlanForm(current => ({
        ...current,
        eggId: firstEgg.id,
        allowedEggIds: Array.from(new Set([...current.allowedEggIds, firstEgg.id]))
      }));
    }
  }, [firstEgg?.id, planForm.eggId]);

  useEffect(() => {
    if (!planForm.location && locations.length) {
      setPlanForm(current => ({ ...current, location: locations[0] }));
    }
  }, [locations, planForm.location]);

  useEffect(() => {
    if (!planForm.eggId || planForm.allowedEggIds.includes(planForm.eggId)) return;
    setPlanForm(current => ({
      ...current,
      allowedEggIds: Array.from(new Set([...current.allowedEggIds, current.eggId]))
    }));
  }, [planForm.eggId]);

  function selectPlan(plan: ServerPlan) {
    const pinnedNode = agents.find(agent => agent.nodeId === plan.nodeId);
    setEditingPlanId(plan.id);
    setPlanForm({
      id: plan.id,
      name: plan.name,
      enabled: plan.enabled,
      externalIds: (plan.externalIds || []).join(', '),
      eggId: plan.eggId,
      eggChangeAllowed: Boolean(plan.eggChangeAllowed),
      allowedEggIds: plan.allowedEggIds?.length ? plan.allowedEggIds : [plan.eggId],
      location: plan.location || String(pinnedNode?.location || '').trim().toLocaleLowerCase() || locations[0] || '',
      nodeId: plan.nodeId,
      memoryMb: String(plan.memoryMb),
      diskMb: String(plan.diskMb),
      cpuLimitPercentage: String(plan.cpuLimitPercentage),
      cpuPinnedThreads: plan.cpuPinnedThreads || '',
      swapMemoryMb: String(plan.swapMemoryMb || 0),
      swapMemoryStorage: plan.swapMemoryStorage || 'general',
      portCount: String(plan.portCount || 1),
      databasesEnabled: Boolean(plan.databasesEnabled),
      databaseLimit: String(plan.databaseLimit || 0),
      databaseMemoryMb: String(plan.databaseMemoryMb || 512),
      databaseDiskMb: String(plan.databaseDiskMb || 1024),
      databaseCpuLimitPercentage: String(plan.databaseCpuLimitPercentage || 50),
      allowedDatabaseTypes: plan.allowedDatabaseTypes?.length ? plan.allowedDatabaseTypes : ['mariadb'],
      databasePortRangeMode: plan.databasePortRangeMode || 'separate',
      databasePortRangeStart: String(plan.databasePortRangeStart || 33060),
      databasePortRangeEnd: String(plan.databasePortRangeEnd || 33160),
      dockerImage: plan.dockerImage || '',
      backupLimit: String(plan.backupLimit ?? 0),
      variablesText: variablesText(plan.variables)
    });
  }

  function planPayload() {
    return {
      id: planForm.id,
      name: planForm.name,
      enabled: planForm.enabled,
      externalIds: planForm.externalIds.split(',').map(item => item.trim()).filter(Boolean),
      eggId: planForm.eggId,
      eggChangeAllowed: planForm.eggChangeAllowed,
      allowedEggIds: Array.from(new Set([planForm.eggId, ...planForm.allowedEggIds].filter(Boolean))),
      location: planForm.location.trim().toLocaleLowerCase(),
      nodeId: planForm.nodeId,
      memoryMb: Number(planForm.memoryMb),
      diskMb: Number(planForm.diskMb),
      cpuLimitPercentage: Number(planForm.cpuLimitPercentage),
      cpuPinnedThreads: planForm.cpuPinnedThreads,
      swapMemoryMb: Number(planForm.swapMemoryMb),
      swapMemoryStorage: planForm.swapMemoryStorage,
      portCount: Number(planForm.portCount),
      databasesEnabled: planForm.databasesEnabled,
      databaseLimit: Number(planForm.databaseLimit),
      databaseMemoryMb: Number(planForm.databaseMemoryMb),
      databaseDiskMb: Number(planForm.databaseDiskMb),
      databaseCpuLimitPercentage: Number(planForm.databaseCpuLimitPercentage),
      allowedDatabaseTypes: planForm.allowedDatabaseTypes,
      databasePortRangeMode: planForm.databasePortRangeMode,
      databasePortRangeStart: Number(planForm.databasePortRangeStart),
      databasePortRangeEnd: Number(planForm.databasePortRangeEnd),
      dockerImage: planForm.dockerImage || undefined,
      backupLimit: Number(planForm.backupLimit),
      variables: parseVariablesText(planForm.variablesText)
    };
  }

  return (
    <div className="mx-auto max-w-[1200px] grid gap-10 pb-12">
      {/* ── BILLING PLANS ── */}
<Panel className="overflow-hidden border-[var(--border)]/60 bg-[var(--background)]/50 backdrop-blur-sm flex flex-col h-full w-full">
        {/* Master-Detail Grid Layout */}
        <div className="flex flex-col xl:flex-row h-full w-full min-h-0">
          
          {/* LEFT SIDEBAR: Plan Navigation & List */}
          <div className="w-full xl:w-[320px] flex flex-col border-b xl:border-b-0 xl:border-r border-[var(--border)]/50 bg-[var(--secondary)]/5 shrink-0 xl:h-full">
            {/* Sidebar Header */}
            <div className="flex items-center justify-between px-5 py-6 border-b border-[var(--border)]/50 shrink-0">
              <div className="flex items-center gap-3">
                <PackagePlus size={18} className="text-[var(--primary)]" />
                <h3 className="text-base font-bold tracking-wide text-[var(--foreground)]">Billing Plans</h3>
              </div>
              <span className="bg-[var(--secondary)]/20 text-[var(--foreground)] px-2 py-0.5 rounded-md text-xs font-bold">
                {plans.length}
              </span>
            </div>

            {/* Create New Action */}
            <div className="p-4 border-b border-[var(--border)]/50 shrink-0">
              <button
                type="button"
                className="w-full flex items-center justify-center gap-2 rounded-lg bg-[var(--primary)]/10 text-[var(--primary)] px-4 py-2.5 text-sm font-bold transition-all hover:bg-[var(--primary)]/20"
                onClick={() => {
                  setEditingPlanId('');
                  setPlanForm({ ...blankPlan, location: locations[0] || '', eggId: firstEgg?.id || '', allowedEggIds: firstEgg?.id ? [firstEgg.id] : [] });
                  setActiveTab('general');
                }}
              >
                <Plus size={16} /> Create New Plan
              </button>
            </div>

            {/* Configured Plans List */}
            <div className="flex-1 overflow-y-auto min-h-[250px] xl:min-h-0">
              {plans.length === 0 ? (
                <EmptyState className="p-8 text-sm">No plans configured yet.</EmptyState>
              ) : (
                <div className="divide-y divide-[var(--border)]/30">
                  {plans.map(plan => {
                    const isEditing = editingPlanId === plan.id;
                    return (
                      <div
                        key={plan.id}
                        className={cn(
                          'group flex items-start justify-between gap-3 p-4 transition-all border-l-4 cursor-pointer',
                          isEditing
                            ? 'bg-[var(--background)] border-l-[var(--primary)] shadow-sm'
                            : 'hover:bg-[var(--background)]/50 border-l-transparent'
                        )}
                        onClick={() => {
                          selectPlan(plan);
                          setActiveTab('general');
                        }}
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <p className={cn("truncate text-sm font-bold transition-colors", isEditing ? "text-[var(--primary)]" : "text-[var(--foreground)]")}>
                              {plan.name}
                            </p>
                            {!plan.enabled && (
                              <span className="text-[10px] bg-[var(--destructive)]/10 text-[var(--destructive)] px-1.5 py-0.5 rounded font-medium">Disabled</span>
                            )}
                          </div>
                          <p className="truncate font-mono text-[11px] text-[var(--muted-foreground)] mt-1">{plan.id}</p>
                          <div className="mt-2 flex flex-wrap gap-1.5 text-[10px] text-[var(--muted-foreground)] font-medium">
                            <span className="bg-[var(--secondary)]/20 px-1.5 py-0.5 rounded">{plan.memoryMb} MB RAM</span>
                            <span className="bg-[var(--secondary)]/20 px-1.5 py-0.5 rounded">{plan.diskMb} MB Disk</span>
                          </div>
                        </div>
                        
                        <button
                          className="p-1.5 text-[var(--muted-foreground)] hover:text-[var(--destructive)] hover:bg-[var(--destructive)]/10 rounded-md transition-colors opacity-0 group-hover:opacity-100"
                          disabled={busy}
                          onClick={async (e) => {
                            e.stopPropagation();
                            if (await confirm({
                              title: 'Delete this plan?',
                              description: `"${plan.name}" will no longer be available for provisioning.`,
                              confirmLabel: 'Delete',
                              tone: 'danger'
                            })) void onDeletePlan(plan.id);
                          }}
                          title="Delete plan"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* RIGHT MAIN AREA: Editor & Endpoints */}
          <div className="flex-1 flex flex-col relative bg-[var(--background)] min-w-0 min-h-0 xl:h-full">
            
            {/* Top Bar: Title & Integration Endpoints Collapsible/Banner */}
            <div className="px-6 sm:px-8 py-5 border-b border-[var(--border)]/50 flex flex-col gap-4 bg-[var(--secondary)]/5 shrink-0">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold tracking-tight text-[var(--foreground)]">
                  {editingPlanId ? `Editing: ${planForm.name}` : 'Create a New Plan'}
                </h2>
              </div>
              
              <details className="group rounded-lg border border-[var(--border)]/60 bg-[var(--background)] overflow-hidden">
                <summary className="flex cursor-pointer items-center justify-between px-4 py-3 text-sm font-semibold text-[var(--foreground)] hover:bg-[var(--secondary)]/5 transition-colors list-none [&::-webkit-details-marker]:hidden">
                  <div className="flex items-center gap-2">
                    <Webhook size={16} className="text-[var(--primary)]" />
                    <span>Integration Endpoints & Webhooks</span>
                  </div>
                  <div className="text-[var(--muted-foreground)] group-open:rotate-180 transition-transform">
                    <svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M4.18179 6.18181C4.35753 6.00608 4.64245 6.00608 4.81819 6.18181L7.49999 8.86362L10.1818 6.18181C10.3575 6.00608 10.6424 6.00608 10.8182 6.18181C10.9939 6.35755 10.9939 6.64247 10.8182 6.81821L7.81819 9.81821C7.73379 9.9026 7.61934 9.95001 7.49999 9.95001C7.38064 9.95001 7.26618 9.9026 7.18179 9.81821L4.18179 6.81821C4.00605 6.64247 4.00605 6.35755 4.18179 6.18181Z" fill="currentColor" fillRule="evenodd" clipRule="evenodd"></path></svg>
                  </div>
                </summary>
                <div className="p-4 border-t border-[var(--border)]/60 space-y-4">
                  <p className="text-xs leading-relaxed text-[var(--muted-foreground)]">
                    Authenticate using header <code className="text-[var(--foreground)] font-light">x-agapornis-secret</code>. 
                    Provisioning accepts <code className="text-[var(--foreground)] font-light">portCount</code>. Freeze/unfreeze accept <code className="text-[var(--foreground)] font-light">serverId</code>.
                  </p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {['/provision', '/whmcs', '/paymenter', '/freeze', '/unfreeze'].map(path => (
                      <button
                        key={path}
                        className="group flex items-center justify-between gap-3 rounded border border-[var(--border)]/60 bg-[var(--secondary)]/5 px-3 py-2 text-left font-mono text-[11px] text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:border-[var(--muted-foreground)]/40 transition-all"
                        onClick={() => navigator.clipboard?.writeText(`${endpointBase}${path}`)}
                        title="Copy URL"
                      >
                        <span className="truncate">{endpointBase}{path}</span>
                        <Copy size={13} className="shrink-0 opacity-50 group-hover:opacity-100" />
                      </button>
                    ))}
                  </div>

                  {/* cURL Example Block */}
                  <div className="mt-4 rounded-md border border-[var(--border)]/50 bg-[#0f111a] overflow-hidden shadow-inner">
                    <div className="flex items-center justify-between px-3 py-2 bg-black/40 border-b border-white/5">
                      <span className="text-[10px] font-mono font-semibold tracking-wider text-zinc-400 uppercase">cURL Example (WHMCS)</span>
                      <button
                        type="button"
                        onClick={() => {
                          const curl = `curl -X POST ${endpointBase}/whmcs \\\n  -H "Content-Type: application/json" \\\n  -H "x-agapornis-secret: your_secret_key" \\\n  -d '{\n  "action": "remove",\n  "productId": "12",\n  "serviceId": "9001",\n  "email": "new-customer@example.com",\n  "name": "New Customer"\n}'`;
                          navigator.clipboard?.writeText(curl);
                        }}
                        className="text-zinc-500 hover:text-white transition-colors"
                        title="Copy cURL command"
                      >
                        <Copy size={14} />
                      </button>
                    </div>
                    <pre className="p-4 text-[11.5px] leading-relaxed font-mono text-zinc-300 overflow-x-auto whitespace-pre">
                      <span className="text-pink-400">curl</span> -X POST {endpointBase}/whmcs \<br/>
                      {'  '}-H <span className="text-green-300">"Content-Type: application/json"</span> \<br/>
                      {'  '}-H <span className="text-green-300">"x-agapornis-secret: your_secret_key"</span> \<br/>
                      {'  '}-d <span className="text-yellow-300">'{'{'}<br/>
                      {'  "action": "remove",\n  "productId": "12",\n  "serviceId": "9001",\n  "email": "new-customer@example.com",\n  "name": "New Customer"\n}'}'</span>
                    </pre>
                  </div>

                </div>
              </details>
            </div>

            {/* Tab Navigation */}
            <div className="flex items-center space-x-1 px-6 sm:px-8 border-b border-[var(--border)]/50 pt-2 bg-[var(--background)] shrink-0">
              {[
                { id: 'general', label: 'General Settings', icon: Server },
                { id: 'resources', label: 'Hardware & DB', icon: Cpu },
                { id: 'advanced', label: 'Advanced', icon: Settings2 },
              ].map(tab => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition-colors",
                    activeTab === tab.id 
                      ? "border-[var(--primary)] text-[var(--primary)]" 
                      : "border-transparent text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:border-[var(--border)]"
                  )}
                >
                  <tab.icon size={16} />
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Form Content */}
            <form
              className="flex flex-col flex-1 relative min-h-0"
              onSubmit={event => {
                event.preventDefault();
                const payload = planPayload();
                if (editingPlanId) onUpdatePlan(editingPlanId, payload);
                else onCreatePlan(payload);
              }}
            >
              <div className="p-6 sm:p-8 overflow-y-auto flex-1 min-h-0">
                
                {/* --- TAB: GENERAL SETTINGS --- */}
                {activeTab === 'general' && (
                  <div className="flex flex-col gap-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <div className="grid gap-6 md:grid-cols-2">
                      <Field label="Plan Key (Unique ID)">
                        <input className={cn(inp, customInputStyle, 'font-mono tracking-widest text-[var(--muted-foreground)]')} value={planForm.id} disabled={Boolean(editingPlanId)} onChange={event => setPlanForm({ ...planForm, id: event.target.value })} placeholder="minecraft-starter" required />
                      </Field>
                      <Field label="Display Name">
                        <input className={cn(inp, customInputStyle)} value={planForm.name} onChange={event => setPlanForm({ ...planForm, name: event.target.value })} placeholder="Minecraft Starter" required />
                      </Field>
                      <div className="md:col-span-2">
                        <Field label="WHMCS / Paymenter Product IDs">
                          <input className={cn(inp, customInputStyle)} value={planForm.externalIds} onChange={event => setPlanForm({ ...planForm, externalIds: event.target.value })} placeholder="e.g. 12, minecraft-starter, product-uuid" />
                        </Field>
                      </div>
                      <Field label="Target Egg">
                        <select className={cn(inp, customInputStyle)} value={planForm.eggId} onChange={event => setPlanForm({ ...planForm, eggId: event.target.value })}>
                          <EggSelectOptions eggs={eggs} />
                        </select>
                      </Field>
                      <Field label="Target Location">
                        <select className={cn(inp, customInputStyle)} value={planForm.location} onChange={event => setPlanForm({ ...planForm, location: event.target.value, nodeId: 'auto-least-memory' })}>
                          {locations.length === 0 && <option value="">No configured locations</option>}
                          {locations.map(location => <option key={location} value={location}>{location}</option>)}
                        </select>
                      </Field>
                      <div className="md:col-span-2">
                        <Field label="Target Node">
                          <select className={cn(inp, customInputStyle)} value={planForm.nodeId} onChange={event => setPlanForm({ ...planForm, nodeId: event.target.value })}>
                            <option value="auto-least-memory">Automatic in location (Least Memory)</option>
                            {locationNodes.map(agent => <option key={agent.nodeId} value={agent.nodeId}>{agent.nodeId}</option>)}
                          </select>
                          <p className="mt-1.5 text-xs text-[var(--muted-foreground)]">Pin paid orders to one node or balance them across the selected location.</p>
                        </Field>
                      </div>
                    </div>

                    {/* Egg Swap Toggle */}
                    <div className="flex flex-col gap-4 rounded-xl border border-[var(--border)]/60 bg-[var(--secondary)]/5 p-5">
                      <label className="group flex cursor-pointer items-start gap-4">
                        <div className="relative flex items-center pt-0.5">
                          <input type="checkbox" className="peer sr-only" checked={planForm.eggChangeAllowed} onChange={event => setPlanForm({ ...planForm, eggChangeAllowed: event.target.checked })} />
                          {/* Modern Switch UI */}
                          <div className="w-9 h-5 bg-[var(--border)] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[var(--success)]"></div>
                        </div>
                        <div className="flex flex-col">
                          <span className="font-bold text-[var(--foreground)] transition-colors group-hover:text-[var(--primary)]">Allow customers to swap templates (Eggs)</span>
                          <span className="mt-0.5 text-xs font-medium text-[var(--muted-foreground)]">The plan's target egg is always permitted. Select additional allowed destinations below.</span>
                        </div>
                      </label>

                      {planForm.eggChangeAllowed && (
                        <div className="mt-2 animate-in fade-in slide-in-from-top-2">
                          <AllowedEggNestPicker eggs={eggs} primaryEggId={planForm.eggId} allowedEggIds={planForm.allowedEggIds} onChange={allowedEggIds => setPlanForm(current => ({ ...current, allowedEggIds }))} />
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* --- TAB: HARDWARE & DB --- */}
                {activeTab === 'resources' && (
                  <div className="flex flex-col gap-10 animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
                      <Field label="Memory (MB)">
                        <input className={cn(inp, customInputStyle, 'font-mono')} type="number" min={1} value={planForm.memoryMb} onChange={event => setPlanForm({ ...planForm, memoryMb: event.target.value })} />
                      </Field>
                      <Field label="Disk (MB)">
                        <input className={cn(inp, customInputStyle, 'font-mono')} type="number" min={1} value={planForm.diskMb} onChange={event => setPlanForm({ ...planForm, diskMb: event.target.value })} />
                      </Field>
                      <Field label="CPU Limit (%)">
                        <input className={cn(inp, customInputStyle, 'font-mono')} type="number" min={1} value={planForm.cpuLimitPercentage} onChange={event => setPlanForm({ ...planForm, cpuLimitPercentage: event.target.value })} />
                        <p className="mt-1.5 text-xs text-[var(--muted-foreground)]">100% = one CPU thread; 200% = two threads.</p>
                      </Field>
                      <Field label="Network Ports">
                        <input className={cn(inp, customInputStyle, 'font-mono')} type="number" min={1} max={32} value={planForm.portCount} onChange={event => setPlanForm({ ...planForm, portCount: event.target.value })} />
                      </Field>
                    </div>
                    <div className="rounded-lg border border-[var(--border)]/60 bg-[var(--secondary)]/10 p-5">
                      <Field label="Pinned CPU Threads"><input className={cn(inp, customInputStyle, 'font-mono')} value={planForm.cpuPinnedThreads} onChange={event => setPlanForm({ ...planForm, cpuPinnedThreads: event.target.value })} placeholder="Disabled — e.g. 0, 1, or 2-4,6" /><p className="mt-1.5 text-xs text-[var(--muted-foreground)]">Leave empty to disable pinning. Values are logical thread IDs on the target node.</p></Field>
                    </div>
                    <div className="grid gap-6 rounded-lg border border-[var(--border)]/60 bg-[var(--secondary)]/10 p-5 md:grid-cols-2">
                      <Field label="Swap Memory (MB)"><input className={cn(inp, customInputStyle, 'font-mono')} type="number" min={0} value={planForm.swapMemoryMb} onChange={event => setPlanForm({ ...planForm, swapMemoryMb: event.target.value })} /></Field>
                      <Field label="Charge Swap To"><select className={cn(inp, customInputStyle)} value={planForm.swapMemoryStorage} disabled={Number(planForm.swapMemoryMb) <= 0} onChange={event => setPlanForm({ ...planForm, swapMemoryStorage: event.target.value as 'server' | 'general' })}><option value="general">General storage</option><option value="server">Server storage quota</option></select></Field>
                      <p className="text-xs text-[var(--muted-foreground)] md:col-span-2">Swap is separate from CPU pinning and disabled at 0 MB. Server storage subtracts swap from the package disk quota; general storage consumes node-wide storage.</p>
                    </div>

                    <hr className="border-[var(--border)]/50" />

                    <div className="flex flex-col gap-6">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <Database size={18} className="text-[var(--primary)]" />
                          <h4 className="text-base font-bold tracking-wide text-[var(--foreground)]">Database Constraints</h4>
                        </div>
                        <label className="group flex cursor-pointer items-center gap-3">
                          <span className="text-sm font-semibold text-[var(--foreground)] transition-colors group-hover:text-[var(--primary)]">Enable Databases</span>
                          <div className="relative flex items-center pt-0.5">
                            <input type="checkbox" className="peer sr-only" checked={planForm.databasesEnabled} onChange={event => setPlanForm({ ...planForm, databasesEnabled: event.target.checked })} />
                            <div className="w-9 h-5 bg-[var(--border)] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[var(--primary)]"></div>
                          </div>
                        </label>
                      </div>
                      
                      <div className={cn("grid gap-6 md:grid-cols-2 xl:grid-cols-4 transition-opacity", planForm.databasesEnabled ? "opacity-100" : "opacity-40 pointer-events-none")}>
                        <Field label="Max Databases">
                          <input className={cn(inp, customInputStyle, 'font-mono')} type="number" min={0} value={planForm.databaseLimit} onChange={event => setPlanForm({ ...planForm, databaseLimit: event.target.value })} />
                        </Field>
                        <Field label="Allowed DB Types">
                          <div className="flex h-[38px] flex-wrap items-center gap-4 rounded-md border border-[var(--input)] bg-[var(--background)] px-3">
                            {(['mysql', 'mariadb', 'postgres'] as const).map(type => (
                              <label key={type} className="flex items-center gap-2 text-sm capitalize cursor-pointer">
                                <input type="checkbox" className="accent-[var(--primary)]" checked={planForm.allowedDatabaseTypes.includes(type)} onChange={event => { const next = event.target.checked ? [...planForm.allowedDatabaseTypes, type] : planForm.allowedDatabaseTypes.filter(value => value !== type); if (next.length) setPlanForm({ ...planForm, allowedDatabaseTypes: next }); }} />
                                {type}
                              </label>
                            ))}
                          </div>
                        </Field>
                        <Field label="DB RAM (MB)">
                          <input className={cn(inp, customInputStyle, 'font-mono')} type="number" min={1} value={planForm.databaseMemoryMb} onChange={event => setPlanForm({ ...planForm, databaseMemoryMb: event.target.value })} />
                        </Field>
                        <Field label="DB Disk (MB)">
                          <input className={cn(inp, customInputStyle, 'font-mono')} type="number" min={1} value={planForm.databaseDiskMb} onChange={event => setPlanForm({ ...planForm, databaseDiskMb: event.target.value })} />
                        </Field>
                        <Field label="DB CPU (%)">
                          <input className={cn(inp, customInputStyle, 'font-mono')} type="number" min={1} value={planForm.databaseCpuLimitPercentage} onChange={event => setPlanForm({ ...planForm, databaseCpuLimitPercentage: event.target.value })} />
                        </Field>
                        <Field label="DB Port Allocation">
                          <select className={cn(inp, customInputStyle)} value={planForm.databasePortRangeMode} onChange={event => setPlanForm({ ...planForm, databasePortRangeMode: event.target.value as 'game' | 'separate' })}>
                            <option value="game">Game-port range</option>
                            <option value="separate">Separate range</option>
                          </select>
                        </Field>
                        {planForm.databasePortRangeMode === 'separate' && (
                          <div className="grid grid-cols-2 gap-2">
                            <Field label="Start"><input className={cn(inp, customInputStyle, 'font-mono')} type="number" min={1} value={planForm.databasePortRangeStart} onChange={event => setPlanForm({ ...planForm, databasePortRangeStart: event.target.value })} /></Field>
                            <Field label="End"><input className={cn(inp, customInputStyle, 'font-mono')} type="number" min={1} value={planForm.databasePortRangeEnd} onChange={event => setPlanForm({ ...planForm, databasePortRangeEnd: event.target.value })} /></Field>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* --- TAB: ADVANCED --- */}
                {activeTab === 'advanced' && (
                  <div className="grid gap-6 md:grid-cols-2 animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <Field label="Custom Docker Image">
                      <input className={cn(inp, customInputStyle, 'font-mono text-sm')} value={planForm.dockerImage} onChange={event => setPlanForm({ ...planForm, dockerImage: event.target.value })} placeholder="Leave blank for egg default" />
                    </Field>
                    <Field label={<span className="flex items-center gap-1.5"><Archive size={13} className="text-[var(--muted-foreground)]" />Max Backups <span className="text-[var(--muted-foreground)] font-normal">(0 = disabled)</span></span>}>
                      <input className={cn(inp, customInputStyle, 'font-mono')} type="number" min={0} value={planForm.backupLimit} onChange={event => setPlanForm({ ...planForm, backupLimit: event.target.value })} />
                    </Field>
                    <div className="md:col-span-2">
                      <Field label="Environment Variables (KEY=VALUE)">
                        <textarea
                          className={cn(inp, customInputStyle, 'min-h-[160px] font-mono text-sm leading-relaxed p-4 resize-y')}
                          value={planForm.variablesText}
                          onChange={event => setPlanForm({ ...planForm, variablesText: event.target.value })}
                          placeholder={'EULA=TRUE\nMAX_PLAYERS=20'}
                        />
                      </Field>
                    </div>
                  </div>
                )}
              </div>

              {/* STICKY ACTION FOOTER */}
              <div className="sticky bottom-0 bg-[var(--background)]/90 backdrop-blur border-t border-[var(--border)]/50 p-6 flex flex-col sm:flex-row items-center justify-between gap-4 shrink-0 z-10">
                <label className="group flex cursor-pointer items-center gap-3">
                  <div className="relative flex items-center pt-0.5">
                    <input type="checkbox" className="peer sr-only" checked={planForm.enabled} onChange={event => setPlanForm({ ...planForm, enabled: event.target.checked })} />
                    <div className="w-9 h-5 bg-[var(--border)] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[var(--success)]"></div>
                  </div>
                  <span className="text-sm font-semibold text-[var(--foreground)] transition-colors group-hover:text-[var(--primary)]">Plan is Active</span>
                </label>
                
                <button
                  type="submit"
                  className={cn(btn, 'group relative flex w-full sm:w-auto items-center justify-center gap-2 rounded-lg bg-[var(--foreground)] px-8 py-3 text-sm font-bold text-[var(--background)] transition-all hover:bg-[var(--foreground)]/90 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed')}
                  disabled={busy}
                >
                  {editingPlanId ? (
                    <><Save size={16} className="transition-transform group-hover:scale-110 group-hover:text-[var(--primary)]" /> Save Changes</>
                  ) : (
                    <><Plus size={16} className="transition-transform group-hover:scale-110 group-hover:text-[var(--primary)]" /> Create Plan</>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </Panel>

      {/* ── OUTBOUND NOTIFICATIONS + DELIVERY HISTORY ── */}
      <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_420px]">

        {/* Outbound Notifications */}
        <Panel className="overflow-hidden border-[var(--border)]/60 bg-[var(--background)]/50 backdrop-blur-sm flex flex-col">
          <div className="flex items-center justify-between px-6 sm:px-8 pt-6 sm:pt-8 pb-5 border-b border-[var(--border)]/50">
            <div className="flex items-center gap-3">
              <Bell size={18} className="text-[var(--primary)]" />
              <h3 className="text-base font-bold tracking-wide text-[var(--foreground)]">Outbound Notifications</h3>
            </div>
            <span className="bg-[var(--secondary)]/20 text-[var(--foreground)] px-2.5 py-0.5 rounded-full text-xs font-medium">
              {targets.length} targets
            </span>
          </div>

          <form
            className="p-6 sm:p-8 grid gap-6 border-b border-[var(--border)]/50"
            onSubmit={event => {
              event.preventDefault();
              onCreate({
                ...targetForm,
                headers: parseObjectJson(targetForm.headers),
                events: targetForm.events.split(',').map(item => item.trim()).filter(Boolean)
              });
            }}
          >
            <div className="grid md:grid-cols-2 gap-6">
              <Field label="Target Name">
                <input className={cn(inp, customInputStyle)} value={targetForm.name} onChange={event => setTargetForm({ ...targetForm, name: event.target.value })} placeholder="e.g. Discord Alerts" required />
              </Field>
              <Field label="Provider">
                <select className={cn(inp, customInputStyle)} value={targetForm.provider} onChange={event => setTargetForm({ ...targetForm, provider: event.target.value })}>
                  <option value="generic">Generic JSON Webhook</option>
                  <option value="discord">Discord</option>
                  <option value="telegram">Telegram</option>
                </select>
              </Field>
              <div className="md:col-span-2">
                <Field label="Webhook URL">
                  <input type="url" className={cn(inp, customInputStyle)} value={targetForm.url} onChange={event => setTargetForm({ ...targetForm, url: event.target.value })} placeholder="https://..." required />
                </Field>
              </div>
              {targetForm.provider === 'telegram' && (
                <Field label="Telegram Chat ID">
                  <input className={cn(inp, customInputStyle, 'font-mono')} value={targetForm.chatId} onChange={event => setTargetForm({ ...targetForm, chatId: event.target.value })} placeholder="-10012345678" />
                </Field>
              )}
              <Field label="Signing Secret">
                <input className={cn(inp, customInputStyle)} value={targetForm.secret} onChange={event => setTargetForm({ ...targetForm, secret: event.target.value })} placeholder="Optional secret key" />
              </Field>
              <div className="md:col-span-2">
                <Field label="Trigger Events (comma-separated)">
                  <input className={cn(inp, customInputStyle, 'font-mono text-sm')} value={targetForm.events} onChange={event => setTargetForm({ ...targetForm, events: event.target.value })} placeholder="billing.server.provisioned, billing.server.removed" />
                </Field>
              </div>
              <div className="md:col-span-2">
                <Field label="Custom Headers (JSON)">
                  <textarea
                    className={cn(inp, customInputStyle, 'min-h-[80px] font-mono text-sm leading-relaxed p-4 resize-y')}
                    value={targetForm.headers}
                    onChange={event => setTargetForm({ ...targetForm, headers: event.target.value })}
                    placeholder='{"Authorization": "Bearer token123"}'
                  />
                </Field>
              </div>
            </div>
            <div className="border-t border-[var(--border)]/50 pt-6 flex items-center justify-between">
              <p className="text-xs font-medium text-[var(--muted-foreground)]">Webhooks fire on every matching event.</p>
              <button
                className={cn(btn, 'group relative flex items-center gap-2 rounded-lg bg-[var(--foreground)] px-8 py-3 text-sm font-bold text-[var(--background)] transition-all hover:bg-[var(--foreground)]/90 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/50')}
                disabled={busy}
              >
                <Plus size={16} className="transition-transform group-hover:scale-110 group-hover:text-[var(--primary)]" />
                Add Webhook
              </button>
            </div>
          </form>

          <div className="divide-y divide-[var(--border)]/50 max-h-[450px] overflow-y-auto flex-1 bg-[var(--background)]">
            {targets.length === 0 ? (
              <EmptyState className="p-10">No outbound notifications configured.</EmptyState>
            ) : targets.map(target => (
              <div key={target.id} className="group flex items-start justify-between p-4 hover:bg-[var(--secondary)]/5 transition-colors">
                <div className="min-w-0 flex-1 pr-4">
                  <div className="flex items-center gap-2">
                    <h4 className="font-bold text-sm text-[var(--foreground)]">{target.name}</h4>
                    <span className="text-[10px] uppercase tracking-wider font-bold bg-[var(--secondary)]/20 text-[var(--foreground)] px-1.5 py-0.5 rounded">
                      {target.provider || 'generic'}
                    </span>
                  </div>
                  <p className="text-xs text-[var(--muted-foreground)] font-mono truncate mt-1">{target.url}</p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {(target.events || ['*']).map((event: string) => (
                      <span key={event} className="bg-[var(--secondary)]/10 border border-[var(--border)]/60 px-2 py-0.5 rounded text-[10px] font-mono text-[var(--muted-foreground)]">
                        {event}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="flex gap-px shrink-0 bg-[var(--background)] rounded-lg border border-[var(--border)]/60 opacity-0 group-hover:opacity-100 transition-opacity shadow-sm overflow-hidden">
                  <button
                    className="p-2 text-[var(--foreground)] hover:bg-[var(--secondary)]/20 transition-colors"
                    onClick={() => onTest(target.id)}
                    disabled={busy}
                    title="Send test event"
                  >
                    <Zap size={15} />
                  </button>
                  <div className="w-px bg-[var(--border)]/60" />
                  <button
                    className="p-2 text-[var(--destructive)] hover:bg-[var(--destructive)]/10 transition-colors"
                    onClick={async () => {
                      if (await confirm({
                        title: 'Delete this webhook?',
                        description: `Notifications will no longer be sent to "${target.name}".`,
                        confirmLabel: 'Delete webhook',
                        tone: 'danger'
                      })) void onDelete(target.id);
                    }}
                    disabled={busy}
                    title="Delete target"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </Panel>

        {/* Delivery History */}
        <Panel className="overflow-hidden border-[var(--border)]/60 bg-[var(--background)]/50 backdrop-blur-sm flex flex-col">
          <div className="flex items-center justify-between px-6 sm:px-8 pt-6 sm:pt-8 pb-5 border-b border-[var(--border)]/50">
            <div className="flex items-center gap-3">
              <Activity size={18} className="text-[var(--primary)]" />
              <h3 className="text-base font-bold tracking-wide text-[var(--foreground)]">Delivery History</h3>
            </div>
            <span className="bg-[var(--secondary)]/20 text-[var(--foreground)] px-2.5 py-0.5 rounded-full text-xs font-medium">
              {events.length} events
            </span>
          </div>
          <div className="divide-y divide-[var(--border)]/50 max-h-[850px] overflow-y-auto flex-1 bg-[var(--background)]">
            {events.length === 0 ? (
              <EmptyState className="p-10">No deliveries recorded yet.</EmptyState>
            ) : events.slice(0, 20).map(event => {
              const isSuccess = event.success;
              return (
                <div key={event.id} className="p-4 flex items-center justify-between hover:bg-[var(--secondary)]/5 transition-colors gap-3">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="mt-0.5 shrink-0">
                      {isSuccess
                        ? <CheckCircle2 size={16} className="text-[var(--success)]" />
                        : <XCircle size={16} className="text-[var(--destructive)]" />}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-[var(--foreground)] truncate">{event.event_type || event.eventType}</p>
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className={cn(
                          'text-[10px] font-mono px-1.5 py-0.5 rounded border',
                          isSuccess
                            ? 'border-[var(--success)]/30 text-[var(--success)] bg-[var(--success)]/5'
                            : 'border-[var(--destructive)]/30 text-[var(--destructive)] bg-[var(--destructive)]/5'
                        )}>
                          HTTP {event.status_code || event.statusCode || 0}
                        </span>
                        {(event.createdAt || event.created_at) && (
                          <span className="text-[11px] text-[var(--muted-foreground)]">
                            {new Date(event.createdAt || event.created_at).toLocaleString()}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </Panel>
      </div>
    </div>
  );
}
