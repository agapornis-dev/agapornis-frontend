import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { CalendarDays, ChevronRight, KeyRound, Search, Server, Shield, Trash2, UserRound, Users, Mail, History } from 'lucide-react';
import { btn, inp } from '../../lib/constants';
import { EmptyState, Panel, cn, formControlClass } from '../../components/ui';
import { ActivityLogEntry, ServerRecord, User, UserRole } from '../../lib/types';
import { useConfirm } from '../../components/feedback/FeedbackProvider';
import { useLazyData } from '../../hooks/useLazyData';
import { requestJson } from '../../lib/http';
import { useApiAction } from '../../hooks/useApiAction';

/* ── Self-contained screen (data fetching + UI) ─────────────────────── */

export function UsersScreen({ apiBase, showToast, currentUserId }: { apiBase: string; showToast: (msg: string, type: 'success' | 'error') => void; currentUserId: string }) {
  const { data: users, loading, refresh } = useLazyData<User[]>(apiBase, '/auth/users', {}, []);
  const [selected, setSelected] = useState<UserDetails | null>(null);
  const { busy, run } = useApiAction(showToast);
  const confirm = useConfirm();

  useEffect(() => {
    if (!selected && users?.[0]) void selectUser(users[0].id);
  }, [users]);

  async function selectUser(id: string) {
    try { setSelected(await requestJson(apiBase, `/auth/users/${id}`, {})); }
    catch (e: any) { showToast(e.message, 'error'); }
  }

  return (
    <UsersPanel
      users={users || []}
      selected={selected}
      currentUserId={currentUserId}
      busy={busy}
      onSelect={id => void selectUser(id)}
      onRoleChange={async (id, role) => {
        await run(async () => { await requestJson(apiBase, `/auth/users/${id}/role`, {}, { method: 'PATCH', body: JSON.stringify({ role }) }); await selectUser(id); refresh(); }, 'User role updated');
      }}
      onDelete={async (id) => {
        const userName = users?.find(u => u.id === id)?.name || selected?.name || 'This user';
        if (!await confirm({ title: 'Delete this user?', description: `${userName} will permanently lose access to the panel. This cannot be undone.`, confirmLabel: 'Delete user', tone: 'danger' })) return;
        await run(async () => { await requestJson(apiBase, `/auth/users/${id}`, {}, { method: 'DELETE' }); setSelected(null); refresh(); }, 'User deleted');
      }}
    />
  );
}

export type UserDetails = User & {
  servers: ServerRecord[];
  activity: ActivityLogEntry[];
};

export function UsersPanel({
  users,
  selected,
  currentUserId,
  busy,
  onSelect,
  onRoleChange,
  onDelete
}: {
  users: User[];
  selected: UserDetails | null;
  currentUserId: string;
  busy: boolean;
  onSelect: (id: string) => void;
  onRoleChange: (id: string, role: UserRole) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}) {
  const [query, setQuery] = useState('');
  
  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return users;
    return users.filter(user => `${user.name} ${user.email} ${user.role}`.toLowerCase().includes(needle));
  }, [query, users]);

  const customInputStyle = formControlClass();

  return (
    <div className="mx-auto grid h-[calc(100vh-8rem)] min-h-[600px] max-w-[1400px] gap-8 xl:grid-cols-[400px_1fr]">
      
      {/* Users Master List */}
      <Panel className="flex h-full flex-col overflow-hidden border-[var(--border)]/60 bg-[var(--background)]/50 backdrop-blur-sm">
        <div className="flex shrink-0 items-center justify-between border-b border-[var(--border)]/60 bg-[var(--secondary)]/10 px-6 py-4">
          <div className="flex items-center gap-3">
            <Users size={18} className="text-[var(--primary)]" />
            <h3 className="text-sm font-bold tracking-wide text-[var(--foreground)]">Directory</h3>
          </div>
          <span className="rounded-full bg-[var(--secondary)]/50 px-3 py-1 text-xs font-bold text-[var(--foreground)]">
            {users.length} Users
          </span>
        </div>
        
        <div className="shrink-0 border-b border-[var(--border)]/60 p-4">
          <div className="group relative">
            <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)] transition-colors group-focus-within:text-[var(--primary)]" />
            <input
              className={cn(inp, customInputStyle, "h-10 w-full pl-10")}
              value={query}
              onChange={event => setQuery(event.target.value)}
              placeholder="Search by name, email, or role..."
            />
          </div>
        </div>

        <div className="flex-1 divide-y divide-[var(--border)]/50 overflow-y-auto">
          {filtered.length === 0 ? (
            <EmptyState className="py-16">No matching users found.</EmptyState>
          ) : (
            filtered.map(user => (
              <button
                key={user.id}
                type="button"
                onClick={() => onSelect(user.id)}
                className={cn(
                  'group flex w-full items-center gap-4 px-6 py-4 text-left transition-all hover:bg-[var(--secondary)]/20',
                  selected?.id === user.id && 'bg-[var(--primary)]/5 hover:bg-[var(--primary)]/10'
                )}
              >
                <div className={cn(
                  "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border text-sm font-bold transition-colors",
                  selected?.id === user.id 
                    ? "border-[var(--primary)] bg-[var(--primary)] text-[var(--primary-foreground)]" 
                    : "border-[var(--border)] bg-[var(--secondary)]"
                )}>
                  {user.name.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-[var(--foreground)]">{user.name}</p>
                  <p className="truncate text-xs font-medium text-[var(--muted-foreground)]">{user.email}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--primary)]">{user.role}</p>
                  <p className="text-xs font-medium text-[var(--muted-foreground)]">{user.serverCount || 0} Srv</p>
                </div>
              </button>
            ))
          )}
        </div>
      </Panel>

      {/* User Details Panel */}
      <Panel className="flex h-full flex-col overflow-hidden border-[var(--border)]/60 bg-[var(--background)]/50 backdrop-blur-sm">
        {!selected ? (
          <div className="flex h-full flex-col items-center justify-center">
            <EmptyState className="py-0">
              <UserRound size={48} className="mx-auto mb-4 text-[var(--muted-foreground)] opacity-20" />
              <p className="text-sm font-medium text-[var(--muted-foreground)]">Select a user to inspect their account details.</p>
            </EmptyState>
          </div>
        ) : (
          <div className="flex h-full flex-col overflow-hidden">
            {/* Header Section */}
            <div className="flex shrink-0 flex-wrap items-center justify-between gap-6 border-b border-[var(--border)]/60 bg-[var(--secondary)]/5 p-8">
              <div className="flex items-center gap-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--primary)]/10 text-2xl font-bold text-[var(--primary)] ring-1 ring-[var(--primary)]/20">
                  {selected.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h2 className="text-2xl font-extrabold tracking-tight text-[var(--foreground)]">{selected.name}</h2>
                  <p className="flex items-center gap-1.5 text-sm font-medium text-[var(--muted-foreground)]"><Mail size={12}/> {selected.email}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <select
                  className={cn(inp, customInputStyle, "min-h-10 px-4 capitalize")}
                  value={selected.role}
                  disabled={busy}
                  onChange={event => void onRoleChange(selected.id, event.target.value as UserRole)}
                  aria-label="User role"
                >
                  <option value="user">User</option>
                  <option value="support">Support</option>
                  <option value="admin">Admin</option>
                  <option value="owner">Owner</option>
                </select>
                <button
                  className={cn(btn, 'flex h-10 w-10 items-center justify-center bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white')}
                  title="Delete user"
                  disabled={busy || selected.id === currentUserId || selected.servers.some(server => server.ownerUserId === selected.id)}
                  onClick={() => void onDelete(selected.id)}
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>

            {/* Metrics Row */}
            <div className="grid shrink-0 grid-cols-2 divide-x divide-[var(--border)]/60 border-b border-[var(--border)]/60 lg:grid-cols-4">
              <Info icon={CalendarDays} label="Created" value={formatDate(selected.createdAt)} />
              <Info icon={Shield} label="Last Login" value={formatDate(selected.lastLoginAt)} />
              <Info icon={Server} label="Server Access" value={String(selected.servers.length)} />
              <Info icon={KeyRound} label="Auth Methods" value={signInMethods(selected)} />
            </div>

            {/* Sub-Panels (Scrollable Area) */}
            {/* Fix 1: Changed 'overflow-y-auto' to 'min-h-0' so the wrapper doesn't try to scroll itself */}
            <div className="flex-1 min-h-0 p-8">
              <div className="grid h-full gap-8 md:grid-cols-2">
                {/* Fix 2: Added 'min-h-0' to the sections to allow internal elements to handle overflow properly */}
                <section className="flex h-full min-h-0 flex-col gap-4">
                  <h3 className="flex shrink-0 items-center gap-2 text-sm font-bold uppercase tracking-widest text-[var(--foreground)]">
                    <Server size={14} className="text-[var(--primary)]"/> Server Inventory
                  </h3>
                  {selected.servers.length === 0 ? (
                    <div className="rounded-xl border border-[var(--border)]/50 bg-[var(--secondary)]/10 p-6 text-center text-sm text-[var(--muted-foreground)]">No servers assigned.</div>
                  ) : (
                    <div className="flex-1 overflow-y-auto divide-y divide-[var(--border)]/50 rounded-xl border border-[var(--border)]/60 bg-[var(--secondary)]/5">
                      {selected.servers.map(server => (
                        <Link
                          key={server.id}
                          href={{ pathname: '/', query: { server: server.id } }}
                          className="group flex items-center justify-between gap-4 px-4 py-3 text-sm transition-colors hover:bg-[var(--primary)]/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--primary)]"
                          title={`Open ${server.name || server.id}`}
                        >
                          <span className="min-w-0">
                            <span className="block truncate font-semibold text-[var(--foreground)] transition-colors group-hover:text-[var(--primary)]">{server.name || server.id}</span>
                            <span className="block truncate font-mono text-[10px] text-[var(--muted-foreground)]">{server.id}</span>
                          </span>
                          <div className="flex items-center gap-2">
                            <span className={cn('rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider', server.access?.relationship === 'owner' ? 'bg-emerald-400/10 text-emerald-300' : 'bg-sky-400/10 text-sky-300')}>
                              {server.access?.relationship === 'owner' ? 'Owner' : server.access?.permission === 'operator' ? 'Shared · operator' : 'Shared · read only'}
                            </span>
                            <span className="rounded bg-[var(--secondary)] px-2 py-0.5 font-mono text-[10px] font-bold">{server.nodeId}</span>
                            <ChevronRight size={15} className="text-[var(--muted-foreground)] transition-transform group-hover:translate-x-0.5 group-hover:text-[var(--primary)]" />
                          </div>
                        </Link>
                      ))}
                    </div>
                  )}
                </section>

                {/* Fix 3: Added 'min-h-0' here as well, so this section can also scroll cleanly */}
                <section className="flex h-full min-h-0 flex-col gap-4">
                  <h3 className="flex shrink-0 items-center gap-2 text-sm font-bold uppercase tracking-widest text-[var(--foreground)]">
                    <History size={14} className="text-[var(--primary)]"/> Activity Log
                  </h3>
                  {selected.activity.length === 0 ? (
                    <div className="rounded-xl border border-[var(--border)]/50 bg-[var(--secondary)]/10 p-6 text-center text-sm text-[var(--muted-foreground)]">No recent history.</div>
                  ) : (
                    <div className="flex-1 overflow-y-auto divide-y divide-[var(--border)]/50 rounded-xl border border-[var(--border)]/60 bg-[var(--secondary)]/5">
                      {selected.activity.slice(0, 20).map(entry => (
                        <div key={entry.id} className="flex items-center justify-between gap-4 px-4 py-3 text-[11px]">
                          <span className="truncate font-medium text-[var(--foreground)]">{entry.event}</span>
                          <span className="shrink-0 font-mono text-[var(--muted-foreground)]">{formatDate(entry.createdAt)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              </div>
            </div>
          </div>
        )}
      </Panel>
    </div>
  );
}

function Info({ icon: Icon, label, value }: { icon: typeof CalendarDays; label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1 p-5">
      <div className="mb-1 flex items-center gap-2 text-[var(--muted-foreground)]">
        <Icon size={14} /> 
        <span className="text-[10px] font-bold uppercase tracking-widest">{label}</span>
      </div>
      <p className="tracking-tight text-sm font-bold text-[var(--foreground)]">{value}</p>
    </div>
  );
}

function formatDate(value?: string) {
  return value ? new Date(value).toLocaleDateString() : 'Never';
}

function signInMethods(user: User) {
  const methods = [
    ...(user.passwordEnabled ? ['Password'] : []),
    ...(user.authProviders || []).map(provider => provider[0].toUpperCase() + provider.slice(1)),
    ...(user.twoFactorEnabled ? ['2FA'] : [])
  ];
  return methods.join(', ') || 'None';
}
