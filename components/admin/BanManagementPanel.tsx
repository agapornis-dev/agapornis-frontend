import { useEffect, useMemo, useState } from 'react';
import { Ban, RefreshCw, ShieldOff, UserX } from 'lucide-react';
import { btn, ghostBtn, inp } from '../../lib/constants';
import { requestJson } from '../../lib/http';
import type { BanRecord, User } from '../../lib/types';
import { Badge, EmptyState, Field, Panel, cn } from '../ui';

export function BanManagementPanel({ apiBase, showToast }: { apiBase: string; showToast: (message: string, tone?: any) => void }) {
  const [bans, setBans] = useState<BanRecord[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ type: 'user' as BanRecord['type'], value: '', reason: '', durationHours: 0 });
  const activeCount = useMemo(() => bans.filter(ban => ban.active).length, [bans]);

  const load = async () => {
    setLoading(true);
    try {
      const [banData, userData] = await Promise.all([
        requestJson(apiBase, '/bans', {}),
        requestJson(apiBase, '/auth/users', {})
      ]);
      setBans(Array.isArray(banData) ? banData : []);
      setUsers(Array.isArray(userData) ? userData : []);
    } catch (error: any) {
      showToast(error.message || 'Could not load bans', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const createBan = async () => {
    setBusy(true);
    try {
      const created = await requestJson(apiBase, '/bans', {}, { method: 'POST', body: JSON.stringify(form) });
      setBans(current => [created, ...current]);
      setForm({ ...form, value: '', reason: '', durationHours: 0 });
      showToast('Access ban created', 'success');
    } catch (error: any) {
      showToast(error.message || 'Could not create ban', 'error');
    } finally {
      setBusy(false);
    }
  };

  const revoke = async (ban: BanRecord) => {
    setBusy(true);
    try {
      const updated = await requestJson(apiBase, `/bans/${encodeURIComponent(ban.id)}`, {}, { method: 'DELETE' });
      setBans(current => current.map(item => item.id === updated.id ? updated : item));
      showToast('Ban revoked', 'success');
    } catch (error: any) {
      showToast(error.message || 'Could not revoke ban', 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Panel className="overflow-hidden border-red-500/20 bg-[var(--background)]/50">
      <div className="flex flex-col gap-3 border-b border-[var(--border)]/60 bg-red-500/5 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3"><ShieldOff size={18} className="text-red-400" /><div><h3 className="text-sm font-bold">Panel access bans</h3><p className="mt-0.5 text-xs text-[var(--muted-foreground)]">Database-backed account, email, and exact-IP enforcement.</p></div></div>
        <div className="flex items-center gap-2"><Badge className="border-red-500/20 text-red-300">{activeCount} active</Badge><button className={ghostBtn} disabled={loading || busy} onClick={load} type="button"><RefreshCw size={14} className={cn('mr-2', loading && 'animate-spin')} />Refresh</button></div>
      </div>

      <div className="grid gap-5 border-b border-[var(--border)]/60 p-5 lg:grid-cols-[10rem_1fr_1.3fr_10rem_auto] lg:items-end">
        <Field label="Ban Type"><select className={inp} value={form.type} onChange={event => setForm({ ...form, type: event.target.value as BanRecord['type'], value: '' })}><option value="user">User account</option><option value="email">Email address</option><option value="ip">IP address</option></select></Field>
        <Field label={form.type === 'user' ? 'User' : form.type === 'email' ? 'Email address' : 'Exact IP address'}>
          {form.type === 'user' ? <select className={inp} value={form.value} onChange={event => setForm({ ...form, value: event.target.value })}><option value="">Select a user…</option>{users.map(user => <option key={user.id} value={user.id}>{user.name} · {user.email}</option>)}</select> : <input className={inp} value={form.value} onChange={event => setForm({ ...form, value: event.target.value })} placeholder={form.type === 'email' ? 'user@example.com' : '203.0.113.42'} />}
        </Field>
        <Field label="Reason"><input className={inp} maxLength={500} value={form.reason} onChange={event => setForm({ ...form, reason: event.target.value })} placeholder="Why is access being suspended?" /></Field>
        <Field label="Duration"><select className={inp} value={form.durationHours} onChange={event => setForm({ ...form, durationHours: Number(event.target.value) })}><option value={0}>Permanent</option><option value={1}>1 hour</option><option value={24}>24 hours</option><option value={168}>7 days</option><option value={720}>30 days</option></select></Field>
        <button className={cn(btn, 'bg-red-500 text-white hover:bg-red-400')} disabled={busy || !form.value || !form.reason.trim()} onClick={createBan} type="button"><Ban size={15} className="mr-2" />Ban</button>
      </div>

      {loading ? <EmptyState className="py-10 text-center">Loading bans…</EmptyState> : bans.length === 0 ? <EmptyState className="py-10 text-center">No access bans have been created.</EmptyState> : (
        <div className="divide-y divide-[var(--border)]/50">
          {bans.map(ban => <div key={ban.id} className="grid gap-3 px-5 py-4 md:grid-cols-[7rem_1fr_1.3fr_12rem_auto] md:items-center"><div><Badge tone={ban.active ? 'danger' : 'default'} className="capitalize">{ban.active ? ban.type : 'revoked'}</Badge></div><div className="min-w-0"><p className="truncate font-mono text-sm font-semibold">{ban.type === 'user' ? userLabel(users, ban.value) : ban.value}</p><p className="mt-1 text-xs text-[var(--muted-foreground)]">{ban.type === 'user' ? ban.value : ban.type}</p></div><p className="text-sm text-[var(--muted-foreground)]">{ban.reason}</p><div className="text-xs text-[var(--muted-foreground)]"><p>{formatDate(ban.createdAt)}</p><p>{ban.expiresAt ? `Until ${formatDate(ban.expiresAt)}` : 'No expiry'}</p></div><div className="md:text-right">{ban.active && <button className={ghostBtn} disabled={busy} onClick={() => revoke(ban)} type="button"><UserX size={14} className="mr-2" />Revoke</button>}</div></div>)}
        </div>
      )}
    </Panel>
  );
}

function userLabel(users: User[], userId: string) {
  const user = users.find(item => item.id === userId);
  return user ? `${user.name} · ${user.email}` : userId;
}

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date.toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : value;
}
