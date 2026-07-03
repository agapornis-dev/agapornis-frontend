import { useEffect, useState } from 'react';
import { Archive, Cloud, Download, RotateCcw, ShieldCheck, Trash2, Plus, Loader2 } from 'lucide-react';
import { ServerRecord } from '../../lib/types';
import { formatBytes } from '../../lib/utils';
import { btn, ghostBtn } from '../../lib/constants';
import { HeadersMap, agentServerPath, requestJson } from '../../lib/http';
import { cn } from '../ui';
import { useConfirm } from '../feedback/FeedbackProvider';

type BackupEntry = {
  backup_id?: string;
  backupId?: string;
  size_bytes?: number | string;
  sizeBytes?: number | string;
  created_at?: string;
  createdAt?: string;
  checksum_sha256?: string;
  checksumSha256?: string;
  checksum_type?: string;
  checksumType?: string;
  storage?: string;
  encrypted?: boolean;
  last_verified_at?: string;
  lastVerifiedAt?: string;
};

function normalizeBackup(b: BackupEntry) {
  return {
    id: b.backup_id || b.backupId || '',
    sizeBytes: Number(b.size_bytes ?? b.sizeBytes ?? 0),
    createdAt: b.created_at || b.createdAt || '',
    checksumSha256: b.checksum_sha256 || b.checksumSha256 || '',
    checksumType: b.checksum_type || b.checksumType || '',
    storage: b.storage === 's3' ? 's3' : 'local',
    encrypted: Boolean(b.encrypted),
    lastVerifiedAt: b.last_verified_at || b.lastVerifiedAt || '',
  };
}

export function ServerBackups({
  server,
  apiBase,
  authHeaders
}: {
  server: ServerRecord;
  apiBase: string;
  authHeaders: HeadersMap;
}) {
  const [backups, setBackups] = useState<ReturnType<typeof normalizeBackup>[]>([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [policy, setPolicy] = useState({ s3Enabled: false, defaultStorage: 'local', encryptionRequired: true });
  const [storage, setStorage] = useState<'local' | 's3'>('local');
  const confirm = useConfirm();

  const backupsUrl = agentServerPath(server, '/backups');

  async function load() {
    setLoading(true);
    setMessage('');
    try {
      const [resp, loadedPolicy]: any[] = await Promise.all([
        requestJson(apiBase, backupsUrl, authHeaders),
        requestJson(apiBase, '/settings/backup-policy', authHeaders).catch(() => policy)
      ]);
      const raw: BackupEntry[] = resp?.data?.backups ?? resp?.backups ?? [];
      setBackups(raw.map(normalizeBackup));
      setPolicy(loadedPolicy);
      setStorage(loadedPolicy?.s3Enabled && loadedPolicy?.defaultStorage === 's3' ? 's3' : 'local');
    } catch (e: any) {
      setMessage(e.message || 'Failed to load backups');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, [server.id]);

  async function createBackup() {
    setBusy('create');
    setMessage('');
    try {
      await requestJson(apiBase, backupsUrl, authHeaders, { method: 'POST', body: JSON.stringify({ storage }) });
      setMessage('Backup created successfully');
      await load();
    } catch (e: any) {
      setMessage(e.message || 'Failed to create backup');
    } finally {
      setBusy(null);
    }
  }

  async function restoreBackup(backup: ReturnType<typeof normalizeBackup>) {
    if (!await confirm({
      title: 'Restore this backup?',
      description: `${backup.id}\n\nThe server will be stopped while its files are restored.`,
      confirmLabel: 'Restore backup'
    })) return;
    setBusy(`restore-${backup.id}`);
    setMessage('');
    try {
      await requestJson(apiBase, `${backupsUrl}/${encodeURIComponent(backup.id)}/restore?storage=${backup.storage}`, authHeaders, { 
        method: 'POST',
        body: JSON.stringify({ expectedChecksum: backup.checksumSha256 || undefined })
      });
      setMessage('Backup restored — server stopped for consistency');
    } catch (e: any) {
      setMessage(e.message || 'Failed to restore backup');
    } finally {
      setBusy(null);
    }
  }

  async function deleteBackup(backupId: string, backupStorage: string) {
    if (!await confirm({
      title: 'Delete this backup?',
      description: `${backupId}\n\nThis backup will be permanently removed and cannot be recovered.`,
      confirmLabel: 'Delete backup',
      tone: 'danger'
    })) return;
    setBusy(`delete-${backupId}`);
    setMessage('');
    try {
      await requestJson(apiBase, `${backupsUrl}/${encodeURIComponent(backupId)}?storage=${backupStorage}`, authHeaders, { method: 'DELETE' });
      setMessage('Backup deleted');
      setBackups(prev => prev.filter(b => b.id !== backupId));
    } catch (e: any) {
      setMessage(e.message || 'Failed to delete backup');
    } finally {
      setBusy(null);
    }
  }

  async function verifyBackup(backup: ReturnType<typeof normalizeBackup>) {
    setBusy(`verify-${backup.id}`);
    setMessage('');
    try {
      await requestJson(apiBase, `${backupsUrl}/${encodeURIComponent(backup.id)}/verify?storage=${backup.storage}`, authHeaders, { method: 'POST' });
      setMessage('Backup was downloaded, decrypted, integrity-checked, and extracted successfully');
      await load();
    } catch (e: any) { setMessage(e.message || 'Backup restore test failed'); }
    finally { setBusy(null); }
  }

  function downloadUrl(backupId: string, backupStorage: string) {
    return `${apiBase}${backupsUrl}/${encodeURIComponent(backupId)}/download?storage=${backupStorage}`;
  }

  const isBusy = (key: string) => busy === key;

  return (
    <div className="p-6 space-y-6">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-[var(--foreground)]">Backups</h4>
        <div className="flex items-center gap-2">
        {policy.s3Enabled && <select className="rounded-md border border-[var(--border)] bg-[var(--card)] px-2 py-1.5 text-xs" value={storage} onChange={event => setStorage(event.target.value as 'local' | 's3')}><option value="local">Local</option><option value="s3">S3 encrypted</option></select>}
        <button
          className={cn(btn, 'gap-2')}
          disabled={busy !== null}
          onClick={createBackup}
        >
          {isBusy('create') ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <Plus size={16} />
          )}
          Create Backup
        </button>
        </div>
      </div>

      {/* Status message */}
      {message && (
        <p className={cn(
          'rounded-md border px-3 py-2 text-sm',
          message.toLowerCase().includes('fail') || message.toLowerCase().includes('error')
            ? 'border-[var(--destructive)]/30 bg-[var(--destructive)]/10 text-[var(--destructive)]'
            : 'border-[var(--success)]/30 bg-[var(--success)]/10 text-[var(--success)]'
        )}>
          {message}
        </p>
      )}

      {/* Backup list */}
      {loading ? (
        <div className="flex items-center justify-center py-12 text-[var(--muted-foreground)]">
          <Loader2 size={20} className="animate-spin mr-2" />
          <span className="text-sm">Loading backups…</span>
        </div>
      ) : backups.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-12 text-center">
          <Archive size={32} className="text-[var(--muted-foreground)]" />
          <p className="text-sm font-medium text-[var(--foreground)]">No backups yet</p>
          <p className="text-xs text-[var(--muted-foreground)]">Create your first backup to protect your server data.</p>
        </div>
      ) : (
        <div className="divide-y divide-[var(--border)] rounded-lg border border-[var(--border)] overflow-hidden">
          {backups.map(b => (
            <div key={b.id} className="flex items-center justify-between gap-4 bg-[var(--card)] px-4 py-3 hover:bg-[var(--secondary)]/40 transition-colors">
              <div className="min-w-0 flex-1 space-y-0.5">
                <p className="truncate font-mono text-xs font-medium text-[var(--foreground)]">{b.id}</p>
                <p className="text-xs text-[var(--muted-foreground)] flex items-center flex-wrap gap-x-3 gap-y-1">
                  <span>{b.createdAt ? new Date(b.createdAt).toLocaleString() : '—'}</span>
                  {b.sizeBytes > 0 && <span>{formatBytes(b.sizeBytes)}</span>}
                  {b.checksumSha256 && (
                    <span 
                      className="font-mono text-[10px] opacity-60 bg-[var(--secondary)] px-1.5 py-0.5 rounded"
                      title={`SHA-256: ${b.checksumSha256}`}
                    >
                      sha256:{b.checksumSha256.substring(0, 8)}
                    </span>
                  )}
                  <span className="inline-flex items-center gap-1 rounded bg-[var(--secondary)] px-1.5 py-0.5 text-[10px]"><Cloud size={10} />{b.storage}{b.encrypted ? ' · encrypted' : ''}</span>
                  {b.lastVerifiedAt && <span className="text-[10px] text-[var(--success)]">restore-tested {new Date(b.lastVerifiedAt).toLocaleString()}</span>}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                {/* Download — direct browser download via auth cookie */}
                <a
                  href={downloadUrl(b.id, b.storage)}
                  download
                  className={cn(ghostBtn, 'gap-1.5 text-xs text-[var(--muted-foreground)] hover:text-[var(--foreground)]')}
                  title="Download backup"
                >
                  <Download size={14} />
                </a>

                <button className={cn(ghostBtn, 'text-[var(--muted-foreground)] hover:text-[var(--success)]')} disabled={busy !== null} onClick={() => void verifyBackup(b)} title="Test restore in isolated temporary storage">
                  {isBusy(`verify-${b.id}`) ? <Loader2 size={14} className="animate-spin" /> : <ShieldCheck size={14} />}
                </button>

                <button
                  className={cn(ghostBtn, 'gap-1.5 text-xs text-[var(--muted-foreground)] hover:text-orange-500')}
                  disabled={busy !== null}
                  onClick={() => void restoreBackup(b)}
                  title="Restore backup"
                >
                  {isBusy(`restore-${b.id}`) ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <RotateCcw size={14} />
                  )}
                </button>

                <button
                  className={cn(ghostBtn, 'gap-1.5 text-xs text-[var(--muted-foreground)] hover:bg-[var(--destructive)] hover:text-white')}
                  disabled={busy !== null}
                  onClick={() => void deleteBackup(b.id, b.storage)}
                  title="Delete backup"
                >
                  {isBusy(`delete-${b.id}`) ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <Trash2 size={14} />
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
