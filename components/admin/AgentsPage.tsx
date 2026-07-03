import { useMemo, useState } from 'react';
import { Network, KeyRound, Trash2, Copy, Check, Info, RotateCw, ShieldCheck, ShieldX, Server, ShieldAlert, Fingerprint, MapPin, Settings2, ChevronDown } from 'lucide-react';
import { btn, inp } from '../../lib/constants';
import { Panel, EmptyState, cn } from '../ui';
import { useConfirm } from '../feedback/FeedbackProvider';

function isCertificateManaged(agent: any) {
  if (typeof agent.certificateManaged === 'boolean') return agent.certificateManaged;
  return Boolean(
    agent.secure === true ||
    agent.certificateFingerprint ||
    agent.pendingCertificateFingerprint ||
    agent.certificateRevokedAt
  );
}

export function AgentsPanel({
  agents,
  locations,
  allocations,
  bootstrapToken, 
  busy, 
  onAdd, 
  onUpdatePlacement,
  onRemove,
  onGenerateToken,
  onRotateCertificate,
  onActivateCertificate,
  onRevokeCertificate
}: {
  agents: any[]; 
  locations: any[];
  allocations: Record<string, any[]>;
  bootstrapToken?: { token: string; expiresIn: string; message: string }; 
  busy: boolean;
  onAdd: (data: any) => Promise<void>;
  onUpdatePlacement: (nodeId: string, data: any) => Promise<void>;
  onRemove: (nodeId: string) => Promise<void>;
  onGenerateToken: () => Promise<void>;
  onRotateCertificate: (nodeId: string) => Promise<void>;
  onActivateCertificate: (nodeId: string) => Promise<void>;
  onRevokeCertificate: (nodeId: string) => Promise<void>;
}) {
  const [form, setForm] = useState({ nodeId: '', fqdn: '', grpcPort: '5001', location: '', portRangeStart: '25565', portRangeEnd: '26000', memoryLimitMb: '', diskLimitMb: '', memoryOverallocationMb: '0', diskOverallocationMb: '0' }); 
  const [copied, setCopied] = useState(false);
  const [expandedNodes, setExpandedNodes] = useState<Record<string, boolean>>({});
  const confirm = useConfirm();
  
  const agentGroups = useMemo(() => {
    const groups = new Map<string, any[]>();
    for (const agent of agents) {
      const location = String(agent.location || 'unconfigured').trim().toLocaleLowerCase() || 'unconfigured';
      groups.set(location, [...(groups.get(location) || []), agent]);
    }
    return Array.from(groups.entries())
      .map(([location, nodes]) => ({ location, nodes: nodes.sort((a, b) => String(a.nodeId).localeCompare(String(b.nodeId))) }))
      .sort((a, b) => a.location.localeCompare(b.location));
  }, [agents]);

  const copyToClipboard = () => {
    if (!bootstrapToken?.token) return;
    navigator.clipboard.writeText(bootstrapToken.token);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const customInputStyle = "bg-[var(--secondary)]/10 border-[var(--border)]/60 transition-all focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)]/30 font-medium";

  return (
<div className="mx-auto grid w-full max-w-[1400px] gap-6 px-3 pb-8 sm:px-4 sm:gap-8 lg:gap-10 lg:px-0 lg:pb-12">
      
      {/* Typographical Page Header */}
      <div className="flex flex-col gap-2">
        <h2 className="text-3xl font-extrabold tracking-tight text-[var(--foreground)] sm:text-4xl">
          Network Nodes<span className="text-[var(--primary)]">.</span>
        </h2>
        <p className="text-sm font-medium text-[var(--muted-foreground)]/80">
          Provision, authenticate, and manage edge nodes across the infrastructure.
        </p>
      </div>

      <div className="grid min-w-0 gap-6 lg:grid-cols-[minmax(0,1fr)_400px] lg:gap-8 lg:items-start">
        
        {/* Left Column: Management */}
        <div className="flex min-w-0 flex-col gap-6 lg:gap-8">
          
          {/* Add Agent Panel */}
          <Panel className="overflow-hidden border-[var(--border)]/60 bg-[var(--background)]/50 backdrop-blur-sm">
            <div className="flex items-center gap-3 border-b border-[var(--border)]/60 bg-[var(--secondary)]/10 px-6 py-4">
              <Network size={18} className="text-[var(--primary)]" />
              <h3 className="text-sm font-bold tracking-wide text-[var(--foreground)]">Register New Node</h3>
            </div>
            
            <form className="p-6 grid gap-8" onSubmit={e => {
              e.preventDefault();
              onAdd({ nodeId: form.nodeId, fqdn: form.fqdn, grpcPort: Number(form.grpcPort), location: form.location, portRangeStart: Number(form.portRangeStart), portRangeEnd: Number(form.portRangeEnd), memoryLimitMb: form.memoryLimitMb || undefined, diskLimitMb: form.diskLimitMb || undefined, memoryOverallocationMb: Number(form.memoryOverallocationMb), diskOverallocationMb: Number(form.diskOverallocationMb), secure: true });
            }}>
              
              {/* Group 1: Identity & Routing (4 cols) */}
              <div className="flex flex-col gap-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--muted-foreground)]">Identity & Routing</h4>
                <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-[var(--muted-foreground)]">Node Identity (ID)</label>
                    <input className={cn(inp, customInputStyle, "font-mono")} placeholder="node-us-east-1" value={form.nodeId} onChange={e => setForm({ ...form, nodeId: e.target.value })} required />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-[var(--muted-foreground)]">Location</label>
                    <select className={cn(inp, customInputStyle)} value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} required>
                      <option value="">Select location</option>
                      {locations.map(location => <option key={location.id} value={location.id}>{location.name}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-[var(--muted-foreground)]">FQDN / IP Address</label>
                    <input className={cn(inp, customInputStyle, "font-mono")} placeholder="node.example.com" value={form.fqdn} onChange={e => setForm({ ...form, fqdn: e.target.value })} required />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-[var(--muted-foreground)]">mTLS gRPC Port</label>
                    <input className={cn(inp, customInputStyle, "font-mono")} type="number" placeholder="5001" value={form.grpcPort} onChange={e => setForm({ ...form, grpcPort: e.target.value })} required />
                  </div>
                </div>
              </div>

              {/* Group 2: Hardware & Capacity (3 cols -> 2 rows of 3) */}
              <div className="flex flex-col gap-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--muted-foreground)]">Hardware & Capacity</h4>
                <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-[var(--muted-foreground)]">RAM limit (MB)</label>
                    <input className={cn(inp, customInputStyle, 'font-mono')} type="number" min="1" placeholder="Detected total" value={form.memoryLimitMb} onChange={e => setForm({ ...form, memoryLimitMb: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-[var(--muted-foreground)]">Disk limit (MB)</label>
                    <input className={cn(inp, customInputStyle, 'font-mono')} type="number" min="1" placeholder="Detected total" value={form.diskLimitMb} onChange={e => setForm({ ...form, diskLimitMb: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-[var(--muted-foreground)]">Game Port Start</label>
                    <input className={cn(inp, customInputStyle, "font-mono")} type="number" min="1" max="65535" value={form.portRangeStart} onChange={e => setForm({ ...form, portRangeStart: e.target.value })} required />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-[var(--muted-foreground)]">RAM over-allocation (MB)</label>
                    <input className={cn(inp, customInputStyle, 'font-mono')} type="number" min="0" value={form.memoryOverallocationMb} onChange={e => setForm({ ...form, memoryOverallocationMb: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-[var(--muted-foreground)]">Disk over-allocation (MB)</label>
                    <input className={cn(inp, customInputStyle, 'font-mono')} type="number" min="0" value={form.diskOverallocationMb} onChange={e => setForm({ ...form, diskOverallocationMb: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-[var(--muted-foreground)]">Game Port End</label>
                    <input className={cn(inp, customInputStyle, "font-mono")} type="number" min="1" max="65535" value={form.portRangeEnd} onChange={e => setForm({ ...form, portRangeEnd: e.target.value })} required />
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-2 border-t border-[var(--border)]/50">
                <button 
                  className={cn(btn, "group relative flex items-center gap-2 rounded-lg bg-[var(--foreground)] px-6 py-2.5 text-sm font-bold text-[var(--background)] transition-all hover:bg-[var(--foreground)]/90 disabled:opacity-50")} 
                  disabled={busy}
                >
                  <Server size={16} className="transition-transform group-hover:scale-110" />
                  Register Agent
                </button>
              </div>
            </form>
          </Panel>

          {/* Connected Agents List */}
          <div className="flex flex-col gap-4">
            <h3 className="text-sm font-bold tracking-wide text-[var(--foreground)] px-1 flex justify-between">
              <span>Active Fleet</span>
              <span className="text-[var(--muted-foreground)]">{agents.length} Nodes</span>
            </h3>
            <div className="flex min-w-0 flex-col gap-3 sm:gap-4">
              {agents.length === 0 ? (
                <Panel className="border-[var(--border)]/60 bg-[var(--background)]/50 backdrop-blur-sm">
                  <EmptyState className="py-12 sm:py-16">
                    No agents connected to the controller.
                  </EmptyState>
                </Panel>
              ) : agentGroups.map(group => (
                <details
                  key={group.location}
                  open
                  className="group/location overflow-hidden rounded-xl border border-[var(--border)]/60 bg-[var(--background)]/30"
                >
                  <summary className="flex min-w-0 cursor-pointer list-none items-center justify-between gap-3 bg-[var(--secondary)]/15 px-3 py-3 transition-colors hover:bg-[var(--secondary)]/25 sm:px-4 [&::-webkit-details-marker]:hidden">
                    <span className="flex min-w-0 items-center gap-2 text-sm font-bold text-[var(--foreground)]">
                      <MapPin size={15} className="shrink-0" />
                      <span className="truncate capitalize">{group.location}</span>
                    </span>

                    <span className="shrink-0 text-xs font-semibold text-[var(--muted-foreground)]">
                      {group.nodes.length} node{group.nodes.length === 1 ? '' : 's'}
                    </span>
                  </summary>

                  <div className="grid gap-3 border-t border-[var(--border)]/50 p-2 sm:p-3">
                    {group.nodes.map(agent => {
                      const isExpanded = expandedNodes[agent.nodeId];
                      const agentAllocations = allocations[agent.nodeId] || [];

                      return (
                        <Panel
                          key={agent.nodeId}
                          className="group min-w-0 overflow-hidden border-[var(--border)]/60 bg-[var(--background)]/50 backdrop-blur-sm transition-all hover:border-[var(--border)] hover:bg-[var(--secondary)]/5"
                        >
                          {/* Always-visible Header */}
                          <div className={cn(
                            "p-4 transition-all sm:p-6",
                            isExpanded ? "pb-3 sm:pb-4" : ""
                          )}>
                            <div className="grid min-w-0 gap-4 sm:flex sm:items-start sm:justify-between sm:gap-6">
                              {/* Identity & Network */}
                              <div className="min-w-0">
                                <div className="flex min-w-0 items-start gap-3">
                                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--secondary)]/30 ring-1 ring-[var(--border)] sm:h-10 sm:w-10">
                                    <Server size={18} className="text-[var(--foreground)]" />
                                  </div>

                                  <div className="min-w-0">
                                    <h4 className="truncate text-base font-bold tracking-tight text-[var(--foreground)] sm:text-lg">
                                      {agent.nodeId}
                                    </h4>

                                    <p className="truncate font-mono text-xs text-[var(--muted-foreground)]/80">
                                      {agent.fqdn || agent.grpcAddress || 'Unknown IP'}
                                      <span className="text-[var(--border)]">:</span>
                                      <span className="text-[var(--primary)]">
                                        {agent.grpcPort || '5001'}
                                      </span>
                                    </p>
                                  </div>
                                </div>

                                {/* Certificate Status Pill */}
                                <div className="mt-3 flex flex-wrap items-center gap-2">
                                  <span className={cn(
                                    "inline-flex max-w-full items-center gap-1.5 rounded-md border px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest",
                                    agent.certificateRevokedAt
                                      ? "border-[var(--destructive)]/30 bg-[var(--destructive)]/10 text-[var(--destructive)]"
                                      : agent.pendingCertificateFingerprint
                                        ? "border-amber-500/30 bg-amber-500/10 text-amber-500"
                                        : agent.certificateFingerprint || isCertificateManaged(agent)
                                          ? "border-[var(--success)]/30 bg-[var(--success)]/10 text-[var(--success)]"
                                          : "border-[var(--border)] bg-[var(--secondary)]/30 text-[var(--muted-foreground)]"
                                  )}>
                                    {agent.certificateRevokedAt ? <ShieldX size={12} /> : <Fingerprint size={12} />}

                                    <span className="truncate">
                                      {agent.certificateRevokedAt
                                        ? 'Revoked'
                                        : agent.pendingCertificateFingerprint
                                          ? 'Rotation Pending'
                                          : agent.certificateFingerprint
                                            ? 'Active Certificate'
                                            : isCertificateManaged(agent)
                                              ? 'Managed'
                                              : 'Legacy / Unmanaged'}
                                    </span>
                                  </span>

                                  {agent.certificateExpiresAt && (
                                    <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
                                      Exp: {new Date(agent.certificateExpiresAt).toLocaleDateString()}
                                    </span>
                                  )}
                                </div>
                              </div>

                              {/* Header Actions */}
                              <div className="grid grid-cols-[1fr_auto] gap-2 sm:flex sm:shrink-0 sm:items-center">
                                <button
                                  type="button"
                                  onClick={() => setExpandedNodes(prev => ({
                                    ...prev,
                                    [agent.nodeId]: !prev[agent.nodeId]
                                  }))}
                                  className={cn(
                                    "flex h-10 items-center justify-center gap-2 rounded-lg border px-3 text-sm font-medium transition-all focus:outline-none sm:h-auto sm:px-4 sm:py-2",
                                    isExpanded
                                      ? "border-[var(--primary)]/30 bg-[var(--primary)]/10 text-[var(--primary)]"
                                      : "border-[var(--border)]/60 bg-[var(--secondary)]/10 text-[var(--foreground)] hover:border-[var(--border)] hover:bg-[var(--secondary)]/30"
                                  )}
                                >
                                  <Settings2 size={16} />
                                  <span>{isExpanded ? 'Hide Config' : 'Configure'}</span>
                                  <ChevronDown
                                    size={14}
                                    className={cn("hidden transition-transform duration-200 sm:block", isExpanded && "rotate-180")}
                                  />
                                </button>

                                <button
                                  type="button"
                                  className="group/remove flex h-10 w-10 items-center justify-center rounded-lg border border-transparent text-[var(--muted-foreground)] transition-all hover:border-red-500/20 hover:bg-red-500/10 hover:text-red-500 focus:outline-none"
                                  onClick={async () => {
                                    if (await confirm({
                                      title: 'Remove this node?',
                                      description: `${agent.nodeId} will be permanently removed from the controller.`,
                                      confirmLabel: 'Remove node',
                                      tone: 'danger'
                                    })) void onRemove(agent.nodeId);
                                  }}
                                  title="Remove Node"
                                >
                                  <Trash2 size={18} className="transition-transform group-hover/remove:scale-110" />
                                </button>
                              </div>
                            </div>
                          </div>

                          {/* Collapsible Content */}
                          <div className={cn(
                            "grid transition-[grid-template-rows] duration-300 ease-in-out",
                            isExpanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
                          )}>
                            <div className="min-w-0 overflow-hidden">
                              <div className="px-3 pb-4 pt-1 sm:px-6 sm:pb-6 sm:pt-2">
                                {/* Agent Placement Update Form */}
                                <form
                                  className="grid gap-3 rounded-lg border border-[var(--border)]/60 bg-[var(--secondary)]/10 p-3 sm:grid-cols-2 sm:p-4 xl:grid-cols-4 sm:items-end"
                                  onSubmit={event => {
                                    event.preventDefault();

                                    const values = new FormData(event.currentTarget);

                                    void onUpdatePlacement(agent.nodeId, {
                                      location: values.get('location'),
                                      portRangeStart: Number(values.get('portRangeStart')),
                                      portRangeEnd: Number(values.get('portRangeEnd')),
                                      memoryLimitMb: values.get('memoryLimitMb') || '',
                                      diskLimitMb: values.get('diskLimitMb') || '',
                                      memoryOverallocationMb: Number(values.get('memoryOverallocationMb')),
                                      diskOverallocationMb: Number(values.get('diskOverallocationMb')),
                                      maintenanceMode: values.get('maintenanceMode') === 'on'
                                    });
                                  }}
                                >
                                  <label className="grid gap-1.5 text-xs font-semibold text-[var(--muted-foreground)]">
                                    <span className="flex items-center gap-1.5">
                                      <MapPin size={13} /> Location
                                    </span>

                                    <select
                                      name="location"
                                      className={cn(inp, customInputStyle)}
                                      defaultValue={String(agent.location || "")}
                                      required
                                    >
                                      <option value="">Select</option>

                                      {locations.map(location => (
                                        <option key={location.id} value={String(location.id)}>
                                          {location.name}
                                        </option>
                                      ))}
                                    </select>
                                  </label>

                                  <label className="grid gap-1.5 text-xs font-semibold text-[var(--muted-foreground)]">
                                    <span>Port range start</span>
                                    <input
                                      name="portRangeStart"
                                      className={cn(inp, customInputStyle, 'font-mono')}
                                      type="number"
                                      min="1"
                                      max="65535"
                                      defaultValue={agent.portRangeStart || ''}
                                      required
                                    />
                                  </label>

                                  <label className="grid gap-1.5 text-xs font-semibold text-[var(--muted-foreground)]">
                                    <span>Port range end</span>
                                    <input
                                      name="portRangeEnd"
                                      className={cn(inp, customInputStyle, 'font-mono')}
                                      type="number"
                                      min="1"
                                      max="65535"
                                      defaultValue={agent.portRangeEnd || ''}
                                      required
                                    />
                                  </label>

                                  <label className="flex h-10 items-center gap-2 rounded-md border border-[var(--border)] bg-[var(--background)]/50 px-3 text-xs font-semibold">
                                    <input
                                      name="maintenanceMode"
                                      type="checkbox"
                                      defaultChecked={Boolean(agent.maintenanceMode)}
                                    />
                                    Maintenance mode
                                  </label>

                                  <label className="grid gap-1.5 text-xs font-semibold text-[var(--muted-foreground)]">
                                    <span>RAM limit (MB)</span>
                                    <input
                                      name="memoryLimitMb"
                                      className={cn(inp, customInputStyle, 'font-mono')}
                                      type="number"
                                      min="1"
                                      defaultValue={agent.memoryLimitBytes ? Math.round(Number(agent.memoryLimitBytes) / 1024 / 1024) : ''}
                                      placeholder={`Auto: ${Math.round(Number(agent.memoryPhysicalBytes || 0) / 1024 / 1024)} MB`}
                                    />
                                  </label>

                                  <label className="grid gap-1.5 text-xs font-semibold text-[var(--muted-foreground)]">
                                    <span>RAM extra (MB)</span>
                                    <input
                                      name="memoryOverallocationMb"
                                      className={cn(inp, customInputStyle, 'font-mono')}
                                      type="number"
                                      min="0"
                                      defaultValue={Math.round(Number(agent.memoryOverallocationBytes || 0) / 1024 / 1024)}
                                    />
                                  </label>

                                  <label className="grid gap-1.5 text-xs font-semibold text-[var(--muted-foreground)]">
                                    <span>Disk limit (MB)</span>
                                    <input
                                      name="diskLimitMb"
                                      className={cn(inp, customInputStyle, 'font-mono')}
                                      type="number"
                                      min="1"
                                      defaultValue={agent.diskLimitBytes ? Math.round(Number(agent.diskLimitBytes) / 1024 / 1024) : ''}
                                      placeholder={`Auto: ${Math.round(Number(agent.diskPhysicalBytes || 0) / 1024 / 1024)} MB`}
                                    />
                                  </label>

                                  <label className="grid gap-1.5 text-xs font-semibold text-[var(--muted-foreground)]">
                                    <span>Disk extra (MB)</span>
                                    <input
                                      name="diskOverallocationMb"
                                      className={cn(inp, customInputStyle, 'font-mono')}
                                      type="number"
                                      min="0"
                                      defaultValue={Math.round(Number(agent.diskOverallocationBytes || 0) / 1024 / 1024)}
                                    />
                                  </label>

                                  <div className="mt-2 grid gap-4 sm:col-span-2 xl:col-span-4 lg:flex lg:items-center lg:justify-between">
                                    <div className="grid gap-2">
                                      <p className={cn(
                                        'text-xs',
                                        agent.exhausted
                                          ? 'font-semibold text-[var(--destructive)]'
                                          : 'text-[var(--muted-foreground)]'
                                      )}>
                                        {!agent.portRangeStart || !agent.portRangeEnd
                                          ? 'Provisioning is blocked until a valid game port range is configured.'
                                          : agent.exhausted
                                            ? `Port range exhausted: all ${agent.total || 0} ports are assigned.`
                                            : `${agent.available ?? agent.total ?? 0} of ${agent.total ?? 0} game ports available.`}
                                      </p>

                                      <div className="grid gap-1 text-[11px] text-[var(--muted-foreground)] sm:flex sm:flex-wrap sm:gap-4">
                                        <span>
                                          RAM:{' '}
                                          <b className="text-[var(--foreground)]">
                                            {formatCapacity(agent.memoryAllocatedBytes)} / {formatCapacity(agent.memoryCapacityBytes)}
                                          </b>
                                        </span>

                                        <span>
                                          Disk:{' '}
                                          <b className="text-[var(--foreground)]">
                                            {formatCapacity(agent.diskAllocatedBytes)} / {formatCapacity(agent.diskCapacityBytes)}
                                          </b>
                                        </span>

                                        <span>
                                          Status:{' '}
                                          <b className={agent.maintenanceMode ? 'text-amber-400' : 'text-[var(--foreground)]'}>
                                            {agent.maintenanceMode ? 'Maintenance' : `${agent.serverCount || 0} servers`}
                                          </b>
                                        </span>
                                      </div>
                                    </div>

                                    <button
                                      className={cn(btn, 'h-10 w-full whitespace-nowrap px-6 text-xs sm:h-9 sm:w-auto')}
                                      disabled={busy}
                                    >
                                      Save changes
                                    </button>
                                  </div>
                                </form>

                                {/* Allocations */}
                                <details className="mt-4 overflow-hidden rounded-lg border border-[var(--border)]/60 bg-[var(--background)]/40">
                                  <summary className="flex cursor-pointer items-center justify-between gap-3 px-3 py-3 text-xs font-bold uppercase tracking-wider text-[var(--muted-foreground)] sm:px-4">
                                    <span>Port allocations</span>
                                    <span>{agentAllocations.length}</span>
                                  </summary>

                                  {!agentAllocations.length ? (
                                    <p className="border-t border-[var(--border)] p-4 text-xs text-[var(--muted-foreground)]">
                                      No ports are assigned on this node.
                                    </p>
                                  ) : (
                                    <>
                                      {/* Mobile allocation cards */}
                                      <div className="grid gap-2 border-t border-[var(--border)] p-3 md:hidden">
                                        {agentAllocations.map(row => (
                                          <div
                                            key={`${row.kind || 'server'}:${row.databaseId || row.serverId}`}
                                            className="rounded-lg border border-[var(--border)]/60 bg-[var(--secondary)]/10 p-3"
                                          >
                                            <div className="flex min-w-0 items-start justify-between gap-3">
                                              <div className="min-w-0">
                                                <p className="truncate text-sm font-bold text-[var(--foreground)]">
                                                  {row.name}
                                                </p>

                                                <p className="mt-1 truncate text-[11px] text-[var(--muted-foreground)]">
                                                  {row.kind === 'database' ? `Database for ${row.serverId}` : row.serverId}
                                                </p>
                                              </div>

                                              <span className="shrink-0 rounded-md bg-[var(--background)] px-2 py-1 font-mono text-xs font-bold text-[var(--primary)]">
                                                {row.port || '—'}
                                              </span>
                                            </div>

                                            <div className="mt-3 grid grid-cols-2 gap-2 text-[11px] text-[var(--muted-foreground)]">
                                              <span className="truncate">
                                                Address:{' '}
                                                <b className="font-mono text-[var(--foreground)]">
                                                  {row.ipAddress || agent.fqdn || '—'}
                                                </b>
                                              </span>

                                              <span>
                                                Type:{' '}
                                                <b className="text-[var(--foreground)]">
                                                  {row.kind || 'server'}
                                                </b>
                                              </span>

                                              <span>
                                                RAM:{' '}
                                                <b className="text-[var(--foreground)]">
                                                  {formatCapacity(row.memoryBytes)}
                                                </b>
                                              </span>

                                              <span>
                                                Disk:{' '}
                                                <b className="text-[var(--foreground)]">
                                                  {formatCapacity(row.diskLimitBytes)}
                                                </b>
                                              </span>
                                            </div>
                                          </div>
                                        ))}
                                      </div>

                                      {/* Desktop table */}
                                      <div className="hidden overflow-x-auto border-t border-[var(--border)] md:block">
                                        <table className="w-full min-w-[760px] text-left text-xs">
                                          <thead className="text-[var(--muted-foreground)]">
                                            <tr>
                                              <th className="px-4 py-2">Network address</th>
                                              <th className="px-4 py-2">Port</th>
                                              <th className="px-4 py-2">Workload</th>
                                              <th className="px-4 py-2">RAM</th>
                                              <th className="px-4 py-2">Disk</th>
                                            </tr>
                                          </thead>

                                          <tbody>
                                            {agentAllocations.map(row => (
                                              <tr
                                                key={`${row.kind || 'server'}:${row.databaseId || row.serverId}`}
                                                className="border-t border-[var(--border)]/50"
                                              >
                                                <td className="px-4 py-2 font-mono">
                                                  {row.ipAddress || agent.fqdn || '—'}
                                                </td>

                                                <td className="px-4 py-2 font-mono">
                                                  {row.port || '—'}
                                                </td>

                                                <td className="px-4 py-2">
                                                  <span className={cn(
                                                    'mr-2 rounded px-1.5 py-0.5 text-[9px] font-bold uppercase',
                                                    row.kind === 'database'
                                                      ? 'bg-sky-500/10 text-sky-400'
                                                      : 'bg-[var(--secondary)] text-[var(--muted-foreground)]'
                                                  )}>
                                                    {row.kind || 'server'}
                                                  </span>

                                                  <span className="font-semibold">{row.name}</span>

                                                  <span className="ml-2 text-[var(--muted-foreground)]">
                                                    {row.kind === 'database' ? `for ${row.serverId}` : row.serverId}
                                                  </span>
                                                </td>

                                                <td className="px-4 py-2">
                                                  {formatCapacity(row.memoryBytes)}
                                                </td>

                                                <td className="px-4 py-2">
                                                  {formatCapacity(row.diskLimitBytes)}
                                                </td>
                                              </tr>
                                            ))}
                                          </tbody>
                                        </table>
                                      </div>
                                    </>
                                  )}
                                </details>
                              </div>

                              {/* Contextual Actions Bar */}
                              <div className="grid gap-2 border-t border-[var(--border)]/50 bg-[var(--secondary)]/5 px-3 py-3 sm:flex sm:flex-wrap sm:items-center sm:px-6">
                                <button
                                  type="button"
                                  className="flex items-center justify-center gap-2 rounded-md px-3 py-2 text-xs font-semibold text-[var(--muted-foreground)] transition-colors hover:bg-[var(--secondary)] hover:text-[var(--foreground)] disabled:opacity-50 sm:py-1.5"
                                  disabled={busy}
                                  onClick={() => onRotateCertificate(agent.nodeId)}
                                >
                                  <RotateCw size={14} />
                                  Rotate Cert
                                </button>

                                {agent.pendingCertificateFingerprint && (
                                  <button
                                    type="button"
                                    className="flex items-center justify-center gap-2 rounded-md px-3 py-2 text-xs font-semibold text-[var(--success)] transition-colors hover:bg-[var(--success)]/10 disabled:opacity-50 sm:py-1.5"
                                    disabled={busy}
                                    onClick={async () => {
                                      if (await confirm({
                                        title: 'Activate the new certificate?',
                                        description: `The pending certificate for ${agent.nodeId} will become active immediately. The old certificate will stop working.`,
                                        confirmLabel: 'Activate certificate'
                                      })) void onActivateCertificate(agent.nodeId);
                                    }}
                                  >
                                    <ShieldCheck size={14} />
                                    Activate New
                                  </button>
                                )}

                                {!agent.certificateRevokedAt && isCertificateManaged(agent) && (
                                  <button
                                    type="button"
                                    className="flex items-center justify-center gap-2 rounded-md px-3 py-2 text-xs font-semibold text-[var(--destructive)] transition-colors hover:bg-[var(--destructive)]/10 disabled:opacity-50 sm:py-1.5"
                                    disabled={busy}
                                    onClick={async () => {
                                      if (await confirm({
                                        title: 'Revoke the active certificate?',
                                        description: `The controller will lose access to ${agent.nodeId} until a new certificate is installed.`,
                                        confirmLabel: 'Revoke certificate',
                                        tone: 'danger'
                                      })) void onRevokeCertificate(agent.nodeId);
                                    }}
                                  >
                                    <ShieldX size={14} />
                                    Revoke
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        </Panel>
                      );
                    })}
                  </div>
                </details>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Provisioning & Guides */}
        <div className="flex min-w-0 flex-col gap-6 lg:gap-8">
          
          {/* Agent Provisioning Panel */}
          <Panel className="overflow-hidden border-[var(--border)]/60 bg-[var(--background)]/50 backdrop-blur-sm">
            <div className="flex items-center gap-3 border-b border-[var(--border)]/60 bg-[var(--secondary)]/10 px-6 py-4">
              <KeyRound size={18} className="text-[var(--primary)]" />
              <h3 className="text-sm font-bold tracking-wide text-[var(--foreground)]">Agent Provisioning</h3>
            </div>
            
            <div className="flex flex-col gap-6 p-6">
              <p className="text-sm font-medium text-[var(--muted-foreground)]/90 leading-relaxed">
                Generate a single-use bootstrap token to authenticate a new agent during its initial setup wizard. 
                The agent uses this token to securely request mTLS certificates.
              </p>

              {bootstrapToken ? (
                <div className="flex flex-col gap-3 animate-in fade-in slide-in-from-bottom-2">
                  <div className="group relative flex flex-col items-center justify-center rounded-xl border border-[var(--primary)]/30 bg-[var(--primary)]/5 p-6 transition-colors hover:border-[var(--primary)]/50">
                    <span className="font-mono text-xl font-bold tracking-widest text-[var(--primary)] break-all text-center">
                      {bootstrapToken.token}
                    </span>
                    <button 
                      onClick={copyToClipboard}
                      className="absolute right-3 top-3 rounded-md bg-[var(--background)] p-2 text-[var(--primary)] shadow-sm ring-1 ring-[var(--border)] transition-all hover:bg-[var(--primary)] hover:text-[var(--primary-foreground)]"
                      title="Copy token"
                    >
                      {copied ? <Check size={16} /> : <Copy size={16} />}
                    </button>
                  </div>
                  <div className="flex items-center justify-between px-1">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--muted-foreground)]">
                      Valid for 1 Hour • Single Use
                    </p>
                    <button 
                      onClick={onGenerateToken} 
                      disabled={busy}
                      className="text-[11px] font-bold uppercase tracking-wider text-[var(--primary)] transition-colors hover:text-[var(--foreground)]"
                    >
                      Regenerate
                    </button>
                  </div>
                </div>
              ) : (
                <button 
                  onClick={onGenerateToken} 
                  disabled={busy}
                  className={cn(btn, "w-full py-3 bg-[var(--primary)] text-[var(--primary-foreground)] font-bold text-sm hover:bg-[var(--primary)]/90")}
                >
                  Generate Bootstrap Token
                </button>
              )}
            </div>
          </Panel>

          {/* Network & DNS Guide Panel */}
          <Panel className="overflow-hidden border-[var(--border)]/60 bg-[var(--background)]/50 backdrop-blur-sm">
            <div className="flex items-center gap-3 border-b border-[var(--border)]/60 bg-[var(--secondary)]/10 px-6 py-4">
              <Info size={18} className="text-[var(--foreground)]" />
              <h3 className="text-sm font-bold tracking-wide text-[var(--foreground)]">Architecture Guide</h3>
            </div>
            
            <div className="flex flex-col gap-6 p-6">
              
              <div className="flex flex-col gap-2">
                <h5 className="flex items-center gap-2 text-sm font-bold text-[var(--foreground)]">
                  <ShieldAlert size={14} className="text-amber-500" />
                  Cloudflare & Proxies
                </h5>
                <p className="text-xs font-medium text-[var(--muted-foreground)]/90 leading-relaxed pl-5 border-l-2 border-[var(--border)] ml-1.5">
                  If using a domain name, ensure the DNS record is set to <strong>DNS Only (Grey Cloud)</strong>. Reverse proxies like Cloudflare strip the mTLS certificates required for secure Master-to-Agent communication.
                </p>
              </div>
              
              <div className="flex flex-col gap-2">
                <h5 className="flex items-center gap-2 text-sm font-bold text-[var(--foreground)]">
                  <Network size={14} className="text-blue-500" />
                  Port Separation
                </h5>
                <div className="flex flex-col gap-3 pl-5 border-l-2 border-[var(--border)] ml-1.5">
                  <p className="text-xs font-medium text-[var(--muted-foreground)]/90 leading-relaxed">
                    <strong className="text-[var(--foreground)] font-mono">Port 5001:</strong> Dedicated exclusively for internal mTLS communication between the Panel and Agent.
                  </p>
                  <p className="text-xs font-medium text-[var(--muted-foreground)]/90 leading-relaxed">
                    <strong className="text-[var(--foreground)] font-mono">Port 443:</strong> Reserved for public web services (like Let's Encrypt, webmaps, or FastDL) if configured manually.
                  </p>
                </div>
              </div>

            </div>
          </Panel>

        </div>
      </div>
    </div>
  );
}

function formatCapacity(bytes: unknown) {
  const value = Number(bytes || 0);
  return value >= 1024 ** 3 ? `${(value / 1024 ** 3).toFixed(1)} GB` : `${Math.round(value / 1024 ** 2)} MB`;
}