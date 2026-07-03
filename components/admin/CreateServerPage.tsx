import { useEffect, useMemo, useState } from 'react';
import { Server, Cpu, LayoutTemplate, Database, Search, Zap, Check, ChevronDown, Archive, AlertTriangle, MapPin } from 'lucide-react';
import { AgentHealth, User } from '../../lib/types';
import { btn, inp } from '../../lib/constants';
import { Panel, Field, cn } from '../ui';
import { LiveStatus } from '../feedback/LoadingStates';
import { LiveConnectionState } from '../../hooks/useAgentHealth';
import { AllowedEggNestPicker, EggSelectOptions } from './EggNestFields';

function parseVariablesText(value: string) {
  return value.split('\n').map(line => line.trim()).filter(line => line && !line.startsWith('#'))
    .reduce<Record<string, string>>((acc, line) => {
      const idx = line.indexOf('=');
      if (idx <= 0) return acc;
      acc[line.slice(0, idx).trim().toUpperCase()] = line.slice(idx + 1).trim();
      return acc;
    }, {});
}

function generateCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const bytes = crypto.getRandomValues(new Uint8Array(10));
  const code = Array.from(bytes, b => chars[b % chars.length]).join('');
  return `${code.slice(0, 5)}-${code.slice(5, 10)}-AG`;
}

// Premium Searchable Dropdown for Users
function UserSelect({ users, value, onChange }: { users: User[], value: string, onChange: (id: string) => void }) {
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);

  const selectedUser = users.find(u => u.id === value);
  const displayValue = selectedUser ? `${selectedUser.name} (${selectedUser.email})` : 'Assign to Me';

  const filtered = users.filter(u =>
    u.name.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="relative">
      <div className="relative group">
        <input
          className={cn(inp, "w-full pl-10 pr-10 bg-[var(--secondary)]/10 border-[var(--border)]/60 transition-all focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)]/30 font-medium cursor-pointer")}
          value={open ? search : displayValue}
          onChange={e => { setSearch(e.target.value); setOpen(true); }}
          onFocus={() => { setSearch(''); setOpen(true); }}
          onBlur={() => setTimeout(() => setOpen(false), 200)}
          placeholder={displayValue}
        />
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)] transition-colors group-focus-within:text-[var(--primary)] pointer-events-none" />
        <ChevronDown size={16} className={cn("absolute right-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)] transition-transform duration-200 pointer-events-none", open && "rotate-180")} />
      </div>

      {open && (
        <div className="absolute z-50 w-full mt-2 bg-[var(--background)]/90 backdrop-blur-xl border border-[var(--border)]/60 rounded-xl shadow-2xl max-h-56 overflow-y-auto p-1 animate-in fade-in zoom-in-95 duration-200">
          <div
            className="flex items-center px-3 py-2.5 cursor-pointer rounded-lg hover:bg-[var(--primary)]/10 text-sm font-semibold transition-colors text-[var(--primary)]"
            onMouseDown={(e) => { e.preventDefault(); onChange(''); setOpen(false); }}
          >
            Assign to Me (Default)
          </div>
          <div className="h-px w-full bg-[var(--border)]/50 my-1" />
          {filtered.map(u => (
            <div
              key={u.id}
              className="flex flex-col px-3 py-2 cursor-pointer rounded-lg hover:bg-[var(--secondary)]/50 text-sm transition-colors text-[var(--foreground)]"
              onMouseDown={(e) => { e.preventDefault(); onChange(u.id); setOpen(false); }}
            >
              <span className="font-bold">{u.name}</span>
              <span className="text-xs text-[var(--muted-foreground)]">{u.email}</span>
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="px-3 py-4 text-center text-sm text-[var(--muted-foreground)]">No matching users</div>
          )}
        </div>
      )}
    </div>
  );
}

export function CreateServerPanel({
  agents, agentStats, eggs, users, sessionUserId, busy, onSubmit, telemetryConnection
}: {
  agents: any[]; agentStats: AgentHealth[]; eggs: any[]; users: User[]; sessionUserId: string; busy: boolean;
  onSubmit: (data: any) => Promise<void>;
  telemetryConnection: LiveConnectionState;
}) {
  const [form, setForm] = useState({
    location: '', nodeId: 'auto-least-memory', eggId: '', serverId: `${generateCode()}`,
    name: '', userId: '', memoryMb: '1024', cpuLimitPercentage: '100', cpuCores: '', diskMb: '10240', dockerImage: '', variablesText: '',
    eggChangeAllowed: false, allowedEggIds: [] as string[],
    databasesEnabled: false, databaseLimit: '1', databaseMemoryMb: '512', databaseDiskMb: '1024',
    databaseCpuLimitPercentage: '50', allowedDatabaseTypes: ['mariadb'] as Array<'mysql' | 'mariadb' | 'postgres'>,
    databasePortRangeMode: 'game' as 'game' | 'separate', databasePortRangeStart: '33060', databasePortRangeEnd: '33160',
    backupLimit: '0'
  });
  const [variableValues, setVariableValues] = useState<Record<string, string>>({});
  
  const selectedEgg = useMemo(() => eggs.find(egg => egg.id === (form.eggId || eggs[0]?.id)), [eggs, form.eggId]);
  const eggVariables = selectedEgg?.variables?.filter((v: any) => v.userEditable !== false) || [];
  const dockerImages = selectedEgg?.dockerImages?.length ? selectedEgg.dockerImages : (selectedEgg?.images || []).map((img: string) => ({ label: img, image: img }));
  const statsByNode = useMemo(() => new Map(agentStats.map(agent => [agent.nodeId, agent])), [agentStats]);
  const locations = useMemo(() => Array.from(new Set(agents.map(agent => String(agent.location || '').trim().toLocaleLowerCase()).filter(Boolean))).sort(), [agents]);
  const selectedLocation = form.location || locations[0] || '';
  const locationNodes = agents.filter(agent => String(agent.location || '').trim().toLocaleLowerCase() === selectedLocation);
  const selectedNodeId = form.nodeId && form.nodeId !== 'auto-least-memory' ? form.nodeId : '';
  const targetNodes = selectedNodeId ? locationNodes.filter(agent => agent.nodeId === selectedNodeId) : locationNodes;
  const portEligibleNodes = targetNodes.filter(agent => agent.portRangeStart && agent.portRangeEnd && !agent.exhausted);
  const availableLocationNodes = portEligibleNodes.filter(agent => statsByNode.get(agent.nodeId)?.healthy);
  const availablePorts = availableLocationNodes.reduce((sum, agent) => sum + Number(agent.available ?? (agent.portRangeEnd - agent.portRangeStart + 1)), 0);
  const placementBlocked = !selectedLocation || availableLocationNodes.length === 0;
  
  const placementBlockReason = !selectedLocation
    ? 'No node location has been configured.'
    : portEligibleNodes.length === 0
      ? selectedNodeId
        ? 'The selected node has no available game port in its configured range.'
        : 'Every node is missing a valid game port range or its configured range is exhausted. Update the node policy before deploying.'
      : selectedNodeId
        ? 'The selected node is not healthy or does not have enough live capacity.'
        : 'No healthy node is currently available in this location.';

  useEffect(() => {
    if (locations.length && !locations.includes(form.location)) setForm(current => ({ ...current, location: locations[0] }));
  }, [locations, form.location]);

  useEffect(() => {
    if (form.nodeId === 'auto-least-memory') return;
    if (!locationNodes.some(agent => agent.nodeId === form.nodeId)) {
      setForm(current => ({ ...current, nodeId: 'auto-least-memory' }));
    }
  }, [form.nodeId, selectedLocation, locationNodes]);

  useEffect(() => {
    const next: Record<string, string> = {};
    for (const v of eggVariables) next[v.envVariable] = variableValues[v.envVariable] ?? v.defaultValue ?? '';
    setVariableValues(next);
  }, [selectedEgg?.id]);

  useEffect(() => {
    const firstImage = dockerImages[0]?.image || '';
    setForm(current => current.dockerImage === firstImage ? current : { ...current, dockerImage: firstImage });
  }, [selectedEgg?.id]);

  useEffect(() => {
    const primaryEggId = selectedEgg?.id;
    if (!primaryEggId) return;
    setForm(current => current.allowedEggIds.includes(primaryEggId)
      ? current
      : { ...current, allowedEggIds: [...current.allowedEggIds, primaryEggId] });
  }, [selectedEgg?.id]);

  const customInputStyle = "bg-[var(--secondary)]/10 border-[var(--border)]/60 transition-all focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)]/30 font-medium";

  return (
    <div className="mx-auto max-w-[1200px] grid gap-10 pb-12">
      
      {/* Typographical Page Header */}
      <div className="flex flex-col gap-2">
        <h2 className="text-3xl font-extrabold tracking-tight text-[var(--foreground)] sm:text-4xl">
          Deploy Server<span className="text-[var(--primary)]">.</span>
        </h2>
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-[var(--muted-foreground)]/80">
            Provision a new instance to the fleet. Capacity is calculated in real-time.
          </p>
          <LiveStatus state={telemetryConnection} label="Telemetry" />
        </div>
      </div>

      <Panel className="overflow-hidden border-[var(--border)]/60 bg-[var(--background)]/50 backdrop-blur-sm">
        <form className="p-6 sm:p-8 grid gap-12" onSubmit={e => {
          e.preventDefault();
          onSubmit({
            eggId: form.eggId || eggs[0]?.id, serverId: form.serverId, name: form.name || form.serverId, userId: form.userId || sessionUserId,
            memoryMb: Number(form.memoryMb), cpuLimitPercentage: Number(form.cpuLimitPercentage), cpuCores: form.cpuCores ? Number(form.cpuCores) : undefined,
            diskMb: Number(form.diskMb), dockerImage: form.dockerImage || dockerImages[0]?.image, location: selectedLocation, nodeId: form.nodeId,
            eggChangeAllowed: form.eggChangeAllowed,
            allowedEggIds: Array.from(new Set([form.eggId || eggs[0]?.id, ...form.allowedEggIds].filter(Boolean))),
            databasesEnabled: form.databasesEnabled,
            databaseLimit: form.databasesEnabled ? Number(form.databaseLimit) : 0,
            databaseMemoryMb: Number(form.databaseMemoryMb),
            databaseDiskMb: Number(form.databaseDiskMb),
            databaseCpuLimitPercentage: Number(form.databaseCpuLimitPercentage),
            allowedDatabaseTypes: form.allowedDatabaseTypes,
            databasePortRangeMode: form.databasePortRangeMode,
            databasePortRangeStart: Number(form.databasePortRangeStart),
            databasePortRangeEnd: Number(form.databasePortRangeEnd),
            backupLimit: Number(form.backupLimit),
            variables: { ...variableValues, ...parseVariablesText(form.variablesText) }
          });
        }}>
          
          {/* Section 1: Target - Refactored for symmetry */}
          <div className="flex flex-col gap-6">
            <div className="flex items-center gap-3 border-b border-[var(--border)]/50 pb-3">
              <LayoutTemplate size={18} className="text-[var(--primary)]"/>
              <h3 className="text-base font-bold tracking-wide text-[var(--foreground)]">Deployment Target</h3>
            </div>
            
            {/* Identity Sub-Grid (3 Columns) */}
            <div className="grid gap-6 md:grid-cols-3">
              <Field label="Display Name">
                <input className={cn(inp, customInputStyle)} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder={`e.g. ${form.serverId}`} />
              </Field>
              <Field label="Internal Identifier (ID)">
                <input className={cn(inp, customInputStyle, "font-mono tracking-widest text-[var(--muted-foreground)]")} value={form.serverId} onChange={e => setForm({ ...form, serverId: e.target.value })} />
              </Field>
              <Field label="Assign Owner">
                <UserSelect users={users} value={form.userId} onChange={(id) => setForm({ ...form, userId: id })} />
              </Field>
            </div>

            {/* Infrastructure Sub-Grid (2 Columns) */}
            <div className="grid gap-6 md:grid-cols-2">
              <Field label="Location">
                <select className={cn(inp, customInputStyle)} value={selectedLocation} onChange={e => setForm({ ...form, location: e.target.value, nodeId: 'auto-least-memory' })} disabled={locations.length === 0}>
                  {locations.length === 0 && <option value="">No configured locations</option>}
                  {locations.map(location => <option key={location} value={location}>{location}</option>)}
                </select>
                <p className="mt-1.5 flex items-center gap-1.5 text-xs text-[var(--muted-foreground)]"><MapPin size={12} /> Normalized to lowercase</p>
              </Field>
              
              <Field label="Target Node">
                <select className={cn(inp, customInputStyle)} value={form.nodeId} onChange={e => setForm({ ...form, nodeId: e.target.value })} disabled={!selectedLocation}>
                  <option value="auto-least-memory">Automatic (least memory)</option>
                  {locationNodes.map(agent => <option key={agent.nodeId} value={agent.nodeId}>{agent.nodeId}</option>)}
                </select>
                <p className="mt-1.5 text-xs text-[var(--muted-foreground)]">Pin to a node or auto-balance.</p>
              </Field>

              <Field label="Server Template (Egg)">
                <select className={cn(inp, customInputStyle)} value={form.eggId} onChange={e => setForm({ ...form, eggId: e.target.value })}>
                  <EggSelectOptions eggs={eggs} />
                </select>
              </Field>

              <Field label="Container Image">
                <select className={cn(inp, customInputStyle)} value={form.dockerImage} onChange={e => setForm({ ...form, dockerImage: e.target.value })}>
                  {dockerImages.map((img: any) => <option key={img.image} value={img.image}>{img.label}</option>)}
                </select>
              </Field>
            </div>

            {/* Template Description */}
            {selectedEgg?.description && (
              <div className="rounded-lg border border-[var(--border)]/60 bg-[var(--secondary)]/10 p-3 text-sm leading-relaxed text-[var(--muted-foreground)]">
                {selectedEgg.description}
              </div>
            )}

            {/* Capacity Status */}
            <div className={cn('flex items-start gap-3 rounded-lg border p-4 text-sm mt-2', placementBlocked ? 'border-[var(--destructive)]/40 bg-[var(--destructive)]/10 text-[var(--destructive)]' : 'border-[var(--border)]/60 bg-[var(--secondary)]/10 text-[var(--muted-foreground)]')}>
              {placementBlocked ? <AlertTriangle size={18} className="mt-0.5 shrink-0" /> : <Server size={18} className="mt-0.5 shrink-0 text-[var(--primary)]" />}
              <div>
                <p className="font-semibold text-[var(--foreground)]">{placementBlocked ? 'Provisioning unavailable' : selectedNodeId ? `${selectedNodeId} is available` : `${availableLocationNodes.length} node${availableLocationNodes.length === 1 ? '' : 's'} available`}</p>
                <p className="mt-0.5 text-xs">{placementBlocked ? placementBlockReason : selectedNodeId ? `${availablePorts} unassigned game ports remain.` : `${availablePorts} unassigned game ports remain across ${selectedLocation}.`}</p>
              </div>
            </div>

            {/* Premium Egg Swap Toggle */}
            <div className="mt-2 flex flex-col gap-4 rounded-xl border border-[var(--border)]/60 bg-[var(--secondary)]/5 p-5">
              <label className="group flex cursor-pointer items-start gap-4">
                <div className="relative flex items-center pt-0.5">
                  <input type="checkbox" className="peer sr-only" checked={form.eggChangeAllowed} onChange={e => setForm({ ...form, eggChangeAllowed: e.target.checked })} />
                  <div className="h-5 w-5 rounded border border-[var(--border)] bg-[var(--background)] transition-all peer-checked:border-[var(--primary)] peer-checked:bg-[var(--primary)] group-hover:border-[var(--primary)]/50" />
                  <Check size={14} className="absolute left-1/2 top-[11px] -translate-x-1/2 -translate-y-1/2 text-[var(--primary-foreground)] opacity-0 transition-opacity peer-checked:opacity-100" />
                </div>
                <div className="flex flex-col">
                  <span className="font-bold text-[var(--foreground)] transition-colors group-hover:text-[var(--primary)]">Allow owner to swap templates (Eggs)</span>
                  <span className="mt-0.5 text-xs font-medium text-[var(--muted-foreground)]">The deployed template is inherently permitted. Select additional allowed destinations below.</span>
                </div>
              </label>

              {form.eggChangeAllowed && (
                <div className="mt-2 animate-in fade-in slide-in-from-top-2">
                  <AllowedEggNestPicker
                    eggs={eggs}
                    primaryEggId={selectedEgg?.id}
                    allowedEggIds={form.allowedEggIds}
                    onChange={allowedEggIds => setForm(current => ({ ...current, allowedEggIds }))}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Section 2: Resources - Refactored for 4-column symmetry */}
          <div className="flex flex-col gap-6">
            <div className="flex items-center gap-3 border-b border-[var(--border)]/50 pb-3">
              <Cpu size={18} className="text-[var(--primary)]"/>
              <h3 className="text-base font-bold tracking-wide text-[var(--foreground)]">Hardware Allocation</h3>
            </div>
            
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              <Field label="Memory Limit (MB)">
                <input className={cn(inp, customInputStyle, "font-mono")} type="number" value={form.memoryMb} onChange={e => setForm({ ...form, memoryMb: e.target.value })} />
              </Field>
              <Field label="Disk Space (MB)">
                <input className={cn(inp, customInputStyle, "font-mono")} type="number" value={form.diskMb} onChange={e => setForm({ ...form, diskMb: e.target.value })} />
              </Field>
              <Field label="CPU Limit (%)">
                <input className={cn(inp, customInputStyle, "font-mono")} type="number" value={form.cpuLimitPercentage} onChange={e => setForm({ ...form, cpuLimitPercentage: e.target.value })} />
              </Field>
              <Field label="CPU Cores (Threads)">
                <input className={cn(inp, customInputStyle, "font-mono")} value={form.cpuCores} onChange={e => setForm({ ...form, cpuCores: e.target.value })} placeholder="e.g. 1, 2" />
              </Field>
            </div>
          </div>

          {/* Section 3: Services & retention - Added items-start */}
          <div className="flex flex-col gap-6">
            <div className="flex items-center gap-3 border-b border-[var(--border)]/50 pb-3">
              <Database size={18} className="text-[var(--primary)]"/>
              <h3 className="text-base font-bold tracking-wide text-[var(--foreground)]">Services & Retention</h3>
            </div>

            <div className="grid gap-4 md:grid-cols-2 items-start">
              <div className="rounded-lg border border-[var(--border)]/60 bg-[var(--secondary)]/10 p-5">
                <label className="flex cursor-pointer items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 font-semibold text-[var(--foreground)]"><Database size={17} /> Databases</div>
                    <p className="mt-1 text-xs leading-relaxed text-[var(--muted-foreground)]">Allow this server to create managed database containers.</p>
                  </div>
                  <input type="checkbox" checked={form.databasesEnabled} onChange={e => setForm({ ...form, databasesEnabled: e.target.checked })} />
                </label>
                {form.databasesEnabled && (
                  <div className="mt-5 grid gap-4 animate-in fade-in slide-in-from-top-1">
                    <Field label="Maximum databases">
                      <input className={cn(inp, customInputStyle, 'font-mono')} type="number" min={1} value={form.databaseLimit} onChange={e => setForm({ ...form, databaseLimit: e.target.value })} />
                    </Field>
                    <Field label="Allowed database types">
                      <div className="flex flex-wrap gap-3">
                        {(['mysql', 'mariadb', 'postgres'] as const).map(type => (
                          <label key={type} className="flex items-center gap-2 text-sm capitalize">
                            <input type="checkbox" checked={form.allowedDatabaseTypes.includes(type)} onChange={event => {
                              const next = event.target.checked ? [...form.allowedDatabaseTypes, type] : form.allowedDatabaseTypes.filter(value => value !== type);
                              if (next.length) setForm({ ...form, allowedDatabaseTypes: next });
                            }} />
                            {type}
                          </label>
                        ))}
                      </div>
                    </Field>
                    <Field label="Database port allocation">
                      <select className={cn(inp, customInputStyle)} value={form.databasePortRangeMode} onChange={event => setForm({ ...form, databasePortRangeMode: event.target.value as 'game' | 'separate' })}>
                        <option value="game">Use node game-port range</option>
                        <option value="separate">Use separate database range</option>
                      </select>
                    </Field>
                    {form.databasePortRangeMode === 'separate' && <div className="grid grid-cols-2 gap-3">
                      <Field label="Port start"><input className={cn(inp, customInputStyle, 'font-mono')} type="number" min={1} value={form.databasePortRangeStart} onChange={e => setForm({ ...form, databasePortRangeStart: e.target.value })} /></Field>
                      <Field label="Port end"><input className={cn(inp, customInputStyle, 'font-mono')} type="number" min={1} value={form.databasePortRangeEnd} onChange={e => setForm({ ...form, databasePortRangeEnd: e.target.value })} /></Field>
                    </div>}
                  </div>
                )}
              </div>

              <div className="rounded-lg border border-[var(--border)]/60 bg-[var(--secondary)]/10 p-5">
                <div className="flex items-center gap-2 font-semibold text-[var(--foreground)]"><Archive size={17} /> Backups</div>
                <p className="mb-5 mt-1 text-xs leading-relaxed text-[var(--muted-foreground)]">Set how many backups may be retained for this server.</p>
                <Field label="Maximum backups (0 disables)">
                  <input className={cn(inp, customInputStyle, 'font-mono')} type="number" min={0} value={form.backupLimit} onChange={e => setForm({ ...form, backupLimit: e.target.value })} />
                </Field>
              </div>
            </div>
          </div>

          {/* Section 4: Environment */}
          <div className="flex flex-col gap-6">
            <div className="flex items-center gap-3 border-b border-[var(--border)]/50 pb-3">
              <Database size={18} className="text-[var(--primary)]"/>
              <h3 className="text-base font-bold tracking-wide text-[var(--foreground)]">Environment Runtime</h3>
            </div>
            
            <div className="grid gap-6 md:grid-cols-2">
              {eggVariables.map((v: any) => (
                <Field key={v.envVariable} label={v.envVariable}>
                  <input className={cn(inp, customInputStyle, "font-mono text-sm tracking-wide")} value={variableValues[v.envVariable] ?? ''} placeholder={v.defaultValue} onChange={e => setVariableValues({ ...variableValues, [v.envVariable]: e.target.value })} />
                </Field>
              ))}
              
              <div className="md:col-span-2 mt-2">
                <Field label="Additional Custom Variables (KEY=VALUE)">
                  <textarea 
                    className={cn(inp, customInputStyle, "min-h-[120px] font-mono text-sm leading-relaxed p-4 resize-y")} 
                    value={form.variablesText} 
                    onChange={e => setForm({ ...form, variablesText: e.target.value })} 
                    placeholder={"EULA=TRUE\nDIFFICULTY=normal\nMAX_PLAYERS=32"} 
                  />
                </Field>
              </div>
            </div>
          </div>

          {/* Action Footer */}
          <div className="border-t border-[var(--border)]/50 pt-8 flex items-center justify-between">
            <p className="text-xs font-medium text-[var(--muted-foreground)]">
              Double-check resource limits before deploying.
            </p>
            <button 
              className={cn(btn, "group relative flex items-center gap-2 rounded-lg bg-[var(--foreground)] px-8 py-3 text-sm font-bold text-[var(--background)] transition-all hover:bg-[var(--foreground)]/90 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/50")} 
              disabled={busy || placementBlocked}
            >
              <Zap size={16} className="transition-transform group-hover:scale-110 group-hover:text-[var(--primary)]" />
              Deploy Instance
            </button>
          </div>
        </form>
      </Panel>
    </div>
  );
}
