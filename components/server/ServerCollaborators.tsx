import { useEffect, useState } from 'react';
import { Mail, Trash2, UserPlus, Users, Shield, ShieldAlert, Key } from 'lucide-react';
import { HeadersMap, agentServerPath, requestJson } from '../../lib/http';
import { User, ServerRecord } from '../../lib/types';
import { btn, ghostBtn, inp } from '../../lib/constants';
import { EmptyState, Field, Panel, cn, formControlClass } from '../ui';

type CollaboratorPermission = 'read_only' | 'operator' | 'custom';
const permissionScopes = [
  ['console.view', 'View console'], ['console.send', 'Send console commands'], ['files.view', 'View files'], ['files.write', 'Edit files'],
  ['power', 'Start, stop, restart'], ['settings', 'Settings and variables'], ['databases', 'Databases'], ['webhooks', 'Webhooks'], ['backups', 'Backups'], ['schedules', 'Schedules']
] as const;
type PermissionScope = typeof permissionScopes[number][0];
type CollaboratorMember = User & { permission: CollaboratorPermission; permissions: PermissionScope[] };

export function ServerCollaborators({
  server,
  apiBase,
  authHeaders,
  canManage,
  showToast
}: {
  server: ServerRecord;
  apiBase: string;
  authHeaders: HeadersMap;
  canManage: boolean;
  showToast: (message: string, type: 'success' | 'error') => void;
}) {
  const [members, setMembers] = useState<CollaboratorMember[]>([]);
  const [email, setEmail] = useState('');
  const [permission, setPermission] = useState<CollaboratorPermission>('read_only');
  const [permissions, setPermissions] = useState<PermissionScope[]>(['console.view']);
  const [busy, setBusy] = useState(false);

  async function load() {
    try {
      setMembers(await requestJson(apiBase, agentServerPath(server, '/collaborators'), authHeaders));
    } catch (error: any) {
      showToast(error.message, 'error');
    }
  }

  useEffect(() => { void load(); }, [server.id]);

  async function add() {
    setBusy(true);
    try {
      await requestJson(apiBase, agentServerPath(server, '/collaborators'), authHeaders, {
        method: 'POST',
        body: JSON.stringify({ email, permission, permissions })
      });
      setEmail('');
      await load();
      showToast('Server access granted', 'success');
    } catch (error: any) {
      showToast(error.message, 'error');
    } finally {
      setBusy(false);
    }
  }

  // Added isSilentUpdate flag to prevent UI flickering and network race conditions during rapid checkbox clicks
  async function changePermission(userId: string, nextPermission: CollaboratorPermission, nextScopes: PermissionScope[] = [], isSilentUpdate = false) {
    if (!isSilentUpdate) setBusy(true);
    try {
      await requestJson(apiBase, agentServerPath(server, `/collaborators/${encodeURIComponent(userId)}`), authHeaders, {
        method: 'PATCH',
        body: JSON.stringify({ permission: nextPermission, permissions: nextScopes })
      });
      
      // Only reload data and show toast if this is a major structural change (like changing the main role)
      if (!isSilentUpdate) {
        await load();
        showToast('Server permission updated', 'success');
      }
    } catch (error: any) {
      if (isSilentUpdate) void load(); // Revert optimistic UI on failure
      showToast(error.message, 'error');
    } finally {
      if (!isSilentUpdate) setBusy(false);
    }
  }

  async function remove(userId: string) {
    setBusy(true);
    try {
      await requestJson(apiBase, agentServerPath(server, `/collaborators/${encodeURIComponent(userId)}`), authHeaders, { method: 'DELETE' });
      await load();
      showToast('Server access removed', 'success');
    } catch (error: any) {
      showToast(error.message, 'error');
    } finally {
      setBusy(false);
    }
  }

  const customInputStyle = formControlClass();

  return (
    <div className="mx-auto grid max-w-4xl gap-10 pb-12 pt-12">

      {canManage && (
        <Panel className="overflow-hidden border-[var(--border)]/60 bg-[var(--background)]/50 backdrop-blur-sm">
          <div className="flex items-center gap-3 border-b border-[var(--border)]/60 bg-[var(--secondary)]/10 px-6 py-4">
            <UserPlus size={18} className="text-[var(--primary)]" />
            <h3 className="text-sm font-bold tracking-wide text-[var(--foreground)]">Invite Collaborator</h3>
          </div>
          
          <div className="p-6">
            <div className="grid gap-4 sm:grid-cols-[1fr_200px_auto] sm:items-end">
              <Field label="User Email Address">
                <div className="relative group">
                  <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)] transition-colors group-focus-within:text-[var(--primary)]" />
                  <input 
                    className={cn(inp, customInputStyle, 'w-full pl-10')} 
                    type="email" 
                    value={email} 
                    onChange={event => setEmail(event.target.value)} 
                    placeholder="teammate@example.com" 
                  />
                </div>
              </Field>
              
              <Field label="Role">
                <select 
                  className={cn(inp, customInputStyle)} 
                  value={permission} 
                  onChange={event => setPermission(event.target.value as CollaboratorPermission)}
                >
                  <option value="read_only">Read Only</option>
                  <option value="operator">Operator (Full)</option>
                  <option value="custom">Custom Permissions</option>
                </select>
              </Field>
              
              <button 
                className={cn(btn, "group relative flex h-10 items-center gap-2 rounded-lg bg-[var(--foreground)] px-6 text-sm font-bold text-[var(--background)] transition-all hover:bg-[var(--foreground)]/90 disabled:opacity-50")} 
                disabled={busy || !email.trim()} 
                onClick={() => void add()}
              >
                <UserPlus size={16} className="transition-transform group-hover:scale-110" /> 
                Add User
              </button>
            </div>

            {/* Custom Permissions Sub-Panel */}
            {permission === 'custom' && (
              <div className="mt-6 animate-in fade-in slide-in-from-top-2 rounded-lg border border-[var(--border)]/60 bg-[var(--secondary)]/10 p-5">
                <h4 className="mb-4 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[var(--muted-foreground)]">
                  <Key size={14} /> Granular Access Configuration
                </h4>
                <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                  {permissionScopes.map(([scope, label]) => (
                    <label key={scope} className="flex cursor-pointer items-start gap-3 rounded-md p-1.5 transition-colors hover:bg-[var(--secondary)]/30">
                      <div className="relative flex items-center pt-0.5">
                        <input 
                          type="checkbox" 
                          className="peer sr-only"
                          checked={permissions.includes(scope)} 
                          onChange={event => setPermissions(current => event.target.checked ? [...current, scope] : current.filter(value => value !== scope))} 
                        />
                        <div className="h-4 w-4 rounded border border-[var(--border)] bg-[var(--background)] transition-all peer-checked:border-[var(--primary)] peer-checked:bg-[var(--primary)]" />
                      </div>
                      <span className="text-xs font-medium text-[var(--foreground)]">{label}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>
        </Panel>
      )}

      {/* Member List Panel */}
      <div className="flex flex-col gap-4">
        <h3 className="flex items-center justify-between px-1 text-sm font-bold tracking-wide text-[var(--foreground)]">
          <span className="flex items-center gap-2"><Users size={16} /> Active Collaborators</span>
          <span className="text-[var(--muted-foreground)]">{members.length} Member{members.length === 1 ? '' : 's'}</span>
        </h3>

        {members.length === 0 ? (
          <Panel className="border-[var(--border)]/60 bg-[var(--background)]/50 backdrop-blur-sm">
            <EmptyState className="py-16">No collaborators have been granted access.</EmptyState>
          </Panel>
        ) : (
          <Panel className="overflow-hidden border-[var(--border)]/60 bg-[var(--background)]/50 backdrop-blur-sm">
            <div className="divide-y divide-[var(--border)]/50">
              {members.map(member => (
                <div key={member.id} className="flex flex-col transition-colors hover:bg-[var(--secondary)]/5">
                  
                  {/* Primary Row */}
                  <div className="flex items-center justify-between gap-4 px-6 py-4">
                    <div className="flex min-w-0 items-center gap-4">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--secondary)]/50 ring-1 ring-[var(--border)] text-sm font-bold text-[var(--foreground)] uppercase">
                        {member.name.charAt(0)}
                      </div>
                      <div className="flex flex-col">
                        <p className="truncate text-sm font-bold text-[var(--foreground)]">{member.name}</p>
                        <p className="truncate text-xs font-medium text-[var(--muted-foreground)]">{member.email}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      {canManage ? (
                        <select 
                          className={cn(inp, customInputStyle, 'h-9 w-[160px] text-xs')} 
                          value={member.permission} 
                          disabled={busy} 
                          onChange={event => void changePermission(member.id, event.target.value as CollaboratorPermission, member.permissions)}
                        >
                          <option value="read_only">Read Only</option>
                          <option value="operator">Operator</option>
                          <option value="custom">Custom Access</option>
                        </select>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 rounded-md border border-[var(--border)] bg-[var(--secondary)]/30 px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-[var(--muted-foreground)]">
                          {member.permission === 'operator' ? <ShieldAlert size={12}/> : <Shield size={12}/>}
                          {member.permission === 'operator' ? 'Operator' : member.permission === 'custom' ? `${member.permissions?.length || 0} Permissions` : 'Read Only'}
                        </span>
                      )}

                      {canManage && (
                        <button 
                          className="group/remove flex h-9 w-9 items-center justify-center rounded-lg border border-transparent text-[var(--muted-foreground)] transition-all hover:border-red-500/20 hover:bg-red-500/10 hover:text-red-500 focus:outline-none" 
                          title="Revoke access" 
                          disabled={busy} 
                          onClick={() => void remove(member.id)}
                        >
                          <Trash2 size={16} className="transition-transform group-hover/remove:scale-110"/>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Inline Edit Custom Permissions */}
                  {canManage && member.permission === 'custom' && (
                    <div className="border-t border-[var(--border)]/50 bg-[var(--secondary)]/10 px-6 py-5">
                       <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 sm:pl-14">
                        {permissionScopes.map(([scope, label]) => (
                          <label key={scope} className="flex cursor-pointer items-start gap-3 rounded-md p-1 transition-colors hover:bg-[var(--secondary)]/30">
                            <div className="relative flex items-center pt-[3px]">
                              <input 
                                type="checkbox" 
                                className="peer sr-only"
                                checked={member.permissions?.includes(scope) || false} 
                                onChange={event => { 
                                  const isChecked = event.target.checked;
                                  
                                  // 1. Functional state update fixes the stale closure bug.
                                  setMembers(currentList => {
                                    const target = currentList.find(m => m.id === member.id);
                                    if (!target) return currentList;
                                    
                                    const currentScopes = target.permissions || [];
                                    const nextScopes = isChecked 
                                      ? [...currentScopes, scope] 
                                      : currentScopes.filter(value => value !== scope);
                                    
                                    // 2. Fire the network request silently. Passing 'true' prevents await load() overwrites.
                                    void changePermission(member.id, 'custom', nextScopes, true); 
                                    
                                    // 3. Update the UI instantly.
                                    return currentList.map(item => item.id === member.id ? { ...item, permissions: nextScopes } : item); 
                                  });
                                }} 
                              />
                              <div className="h-3.5 w-3.5 rounded-sm border border-[var(--border)] bg-[var(--background)] transition-all peer-checked:border-[var(--primary)] peer-checked:bg-[var(--primary)]" />
                            </div>
                            <span className="text-[11px] font-medium text-[var(--muted-foreground)] transition-colors peer-checked:text-[var(--foreground)]">{label}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </Panel>
        )}
      </div>
    </div>
  );
}
