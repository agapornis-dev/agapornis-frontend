import { useEffect, useState } from 'react';
import { Check, Copy, KeyRound, Plus, Trash2 } from 'lucide-react';
import { requestJson } from '../../lib/http';
import { btn, ghostBtn, inp } from '../../lib/constants';
import { EmptyState, Panel, cn } from '../../components/ui';
import { useConfirm } from '../../components/feedback/FeedbackProvider';

type Invitation = {
  id: string;
  label?: string;
  email?: string;
  expiresAt: string;
  createdAt: string;
  usedAt?: string;
  usedByEmail?: string;
  status: 'available' | 'used' | 'expired';
};

export function RegistrationInvites({ apiBase, showToast }: { apiBase: string; showToast: (message: string, type: 'success' | 'error') => void }) {
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [label, setLabel] = useState('');
  const [email, setEmail] = useState('');
  const [expiresInHours, setExpiresInHours] = useState(168);
  const [createdKey, setCreatedKey] = useState('');
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);
  const confirm = useConfirm();

  const load = async () => {
    try {
      setInvitations(await requestJson(apiBase, '/auth/invitations', {}));
    } catch (error: any) {
      showToast(error.message, 'error');
    }
  };

  useEffect(() => { void load(); }, [apiBase]);

  const create = async () => {
    setBusy(true);
    try {
      const invitation = await requestJson(apiBase, '/auth/invitations', {}, {
        method: 'POST',
        body: JSON.stringify({ label, email, expiresInHours })
      });
      setCreatedKey(invitation.key);
      setLabel('');
      setEmail('');
      await load();
      showToast('Invitation key created', 'success');
    } catch (error: any) {
      showToast(error.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  const revoke = async (invitation: Invitation) => {
    if (!await confirm({
      title: 'Revoke invitation key?',
      description: `${invitation.label || 'This invitation'} will no longer create an account.`,
      confirmLabel: 'Revoke key',
      tone: 'danger'
    })) return;
    setBusy(true);
    try {
      await requestJson(apiBase, `/auth/invitations/${invitation.id}`, {}, { method: 'DELETE' });
      await load();
      showToast('Invitation key revoked', 'success');
    } catch (error: any) {
      showToast(error.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  const copy = async () => {
    await navigator.clipboard.writeText(createdKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <Panel className="mx-auto w-full max-w-[1400px] overflow-hidden border-[var(--border)]/60 bg-[var(--background)]/50 h-screen">
      <div className="flex items-center justify-between border-b border-[var(--border)]/60 bg-[var(--secondary)]/10 px-6 py-4">
        <div className="flex items-center gap-3"><KeyRound size={18} /><h3 className="text-sm font-bold">Account invitation keys</h3></div>
        <span className="text-xs font-semibold text-[var(--muted-foreground)]">Single use · stored hashed</span>
      </div>
      <div className="grid gap-5 p-6 lg:grid-cols-[1fr_1fr_12rem_auto] lg:items-end">
        <label className="grid gap-2">
          <span className="text-xs font-bold text-[var(--muted-foreground)]">Label</span>
          <input className={inp} value={label} onChange={event => setLabel(event.target.value)} placeholder="Customer or order reference" maxLength={160} />
        </label>
        <label className="grid gap-2">
          <span className="text-xs font-bold text-[var(--muted-foreground)]">Email (optional)</span>
          <input className={inp} type="email" value={email} onChange={event => setEmail(event.target.value)} placeholder="person@example.com" maxLength={255} />
        </label>
        <label className="grid gap-2">
          <span className="text-xs font-bold text-[var(--muted-foreground)]">Expires after</span>
          <select className={inp} value={expiresInHours} onChange={event => setExpiresInHours(Number(event.target.value))}>
            <option value={24}>24 hours</option>
            <option value={168}>7 days</option>
            <option value={720}>30 days</option>
          </select>
        </label>
        <button className={cn(btn, 'gap-2')} disabled={busy} onClick={() => void create()}><Plus size={15} /> Generate key</button>
      </div>

      {createdKey && (
        <div className="mx-6 mb-6 rounded-lg border border-emerald-400/20 bg-emerald-400/5 p-4">
          <p className="text-xs font-bold uppercase tracking-wider text-emerald-300">Copy this key now</p>
          <p className="mt-1 text-xs text-[var(--muted-foreground)]">It is shown once and cannot be recovered later.</p>
          <div className="mt-3 flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--background)] p-2">
            <code className="min-w-0 flex-1 break-all px-2 text-xs">{createdKey}</code>
            <button className={cn(ghostBtn, 'shrink-0 gap-2')} onClick={() => void copy()}>{copied ? <Check size={14} /> : <Copy size={14} />} {copied ? 'Copied' : 'Copy'}</button>
          </div>
        </div>
      )}

      <div className="border-t border-[var(--border)]/60">
        {invitations.length === 0 ? <EmptyState className="py-8 text-center">No invitation keys yet.</EmptyState> : (
          <div className="divide-y divide-[var(--border)]/50">
            {invitations.map(invitation => (
              <div key={invitation.id} className="flex items-center gap-4 px-6 py-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{invitation.label || 'Unlabelled invitation'}</p>
                  <p className="text-xs text-[var(--muted-foreground)]">
                    {invitation.email || 'Any email'} · {invitation.status === 'used'
                      ? `Used ${new Date(invitation.usedAt!).toLocaleString()} by ${invitation.usedByEmail || invitation.email}`
                      : `Expires ${new Date(invitation.expiresAt).toLocaleString()}`}
                  </p>
                </div>
                <span className={cn(
                  'rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider',
                  invitation.status === 'available' && 'border-emerald-400/30 bg-emerald-400/10 text-emerald-600 dark:text-emerald-300',
                  invitation.status === 'used' && 'border-blue-400/30 bg-blue-400/10 text-blue-600 dark:text-blue-300',
                  invitation.status === 'expired' && 'border-amber-400/30 bg-amber-400/10 text-amber-700 dark:text-amber-300'
                )}>{invitation.status}</span>
                {invitation.status !== 'used' && <button className={cn(ghostBtn, 'h-8 w-8 px-0 text-[var(--muted-foreground)] hover:text-[var(--destructive)]')} title="Revoke key" disabled={busy} onClick={() => void revoke(invitation)}><Trash2 size={15} /></button>}
              </div>
            ))}
          </div>
        )}
      </div>
    </Panel>
  );
}
