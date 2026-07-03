import { useEffect, useState } from 'react';
import { 
  Activity, AlertCircle, Box, Check, Copy, Cpu, Database, 
  HardDrive, Layers, Play, Plus, RotateCw, Square, Trash2 
} from 'lucide-react';
import { DatabaseType, ServerDatabase, ServerRecord } from '../../lib/types';
import { requestJson } from '../../lib/http';
import { btn, inp, label } from '../../lib/constants';
import { formatBytes } from '../../lib/utils';
import { Badge, EmptyState, cn } from '../ui';
import { useConfirm } from '../feedback/FeedbackProvider';

export function ServerDatabases({
  server,
  apiBase,
  authHeaders
}: {
  server: ServerRecord;
  apiBase: string;
  authHeaders: Record<string, string>;
}) {
  const [databases, setDatabases] = useState<ServerDatabase[]>([]);
  const [name, setName] = useState('default');
  const allowedTypes: DatabaseType[] = server.allowedDatabaseTypes?.length ? server.allowedDatabaseTypes : ['mariadb'];
  const [type, setType] = useState<DatabaseType>(allowedTypes[0]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [copied, setCopied] = useState('');
  const confirm = useConfirm();
  const limit = Number(server.databaseLimit || 0);
  const enabled = Boolean(server.databasesEnabled && limit > 0);

  async function load() {
    setError('');
    try {
      const data = await requestJson(apiBase, `/servers/${server.id}/databases`, authHeaders);
      setDatabases(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load databases');
    }
  }

  useEffect(() => {
    void load();
  }, [server.id]);

  useEffect(() => {
    if (!allowedTypes.includes(type)) setType(allowedTypes[0]);
  }, [server.id, server.allowedDatabaseTypes]);

  async function createDatabase() {
    if (!name.trim()) return;
    setBusy(true);
    setError('');
    try {
      const created = await requestJson(apiBase, `/servers/${server.id}/databases`, authHeaders, {
        method: 'POST',
        body: JSON.stringify({ name, type })
      });
      setDatabases(current => [created, ...current]);
      setName('default');
    } catch (err: any) {
      setError(err.message || 'Failed to create database');
    } finally {
      setBusy(false);
    }
  }

  async function deleteDatabase(database: ServerDatabase) {
    if (!await confirm({
      title: 'Delete this database?',
      description: `${database.databaseName} and its stored data will be permanently removed.`,
      confirmLabel: 'Delete database',
      tone: 'danger'
    })) return;
    setBusy(true);
    setError('');
    try {
      await requestJson(apiBase, `/servers/${server.id}/databases/${database.id}`, authHeaders, { method: 'DELETE', body: JSON.stringify({}) });
      setDatabases(current => current.filter(item => item.id !== database.id));
    } catch (err: any) {
      setError(err.message || 'Failed to delete database');
    } finally {
      setBusy(false);
    }
  }

  async function powerDatabase(database: ServerDatabase, action: 'start' | 'stop' | 'reset') {
    setBusy(true);
    setError('');
    try {
      const updated = await requestJson(apiBase, `/servers/${server.id}/databases/${database.id}/${action}`, authHeaders, { method: 'POST', body: JSON.stringify({}) });
      setDatabases(current => current.map(item => item.id === database.id ? updated : item));
    } catch (err: any) {
      setError(err.message || `Failed to ${action} database`);
    } finally {
      setBusy(false);
    }
  }

  async function testConnection(database: ServerDatabase) {
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const result = await requestJson(apiBase, `/servers/${server.id}/databases/${database.id}/connectivity/test`, authHeaders, { method: 'POST', body: JSON.stringify({}) });
      setNotice(`${database.name}: connection from the game server succeeded in ${Number(result.latencyMs || 0)} ms.`);
    } catch (err: any) {
      setError(err.message || 'Database connection test failed');
    } finally {
      setBusy(false);
    }
  }

  function copy(value: string, key: string) {
    void navigator.clipboard.writeText(value);
    setCopied(key);
    setTimeout(() => setCopied(''), 2000);
  }

  return (
    <div className="flex flex-col gap-8 p-6 lg:p-8">
      
      {/* Header & Creation Form */}
      <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
        <div className="max-w-md">
          <h2 className="text-xl font-bold text-[var(--foreground)]">Databases</h2>
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">
            Manage database containers associated with this server. Provision new instances or access credentials for existing ones.
          </p>
        </div>

        <div className="flex flex-col gap-2 rounded-lg border border-[var(--border)] bg-[var(--card)] p-4 shadow-sm shrink-0 w-full md:w-auto">
          <label className={cn(label, "text-xs mb-1")}>Create New Database</label>
          <div className="flex flex-col sm:flex-row gap-3">
            <input 
              className={cn(inp, 'w-full sm:w-48')} 
              value={name} 
              onChange={event => setName(event.target.value)} 
              placeholder="e.g. auth_db" 
              onKeyDown={e => e.key === 'Enter' && createDatabase()}
            />
            <select className={cn(inp, 'w-full sm:w-32')} value={type} onChange={event => setType(event.target.value as DatabaseType)}>
              {allowedTypes.map(databaseType => <option key={databaseType} value={databaseType}>{databaseType}</option>)}
            </select>
            <button 
              className={cn(btn, 'gap-2 shrink-0 justify-center w-full sm:w-auto')} 
              disabled={busy || !enabled || databases.length >= limit || !name.trim()} 
              onClick={createDatabase}
            >
              <Plus size={16} />
              Create
            </button>
          </div>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="flex items-center gap-3 rounded-md border border-[var(--destructive)]/20 bg-[var(--destructive)]/10 px-4 py-3 text-sm text-[var(--destructive)] shadow-sm animate-in fade-in slide-in-from-top-2">
          <AlertCircle size={16} className="shrink-0" />
          <p className="font-medium">{error}</p>
        </div>
      )}
      {notice && <div className="rounded-md border border-[var(--success)]/20 bg-[var(--success)]/10 px-4 py-3 text-sm font-medium text-[var(--success)]">{notice}</div>}

      {/* Individual Stats Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard 
          icon={<Layers size={18} />} 
          label="Allowance" 
          value={enabled ? `${databases.length} of ${limit} used` : 'Disabled'} 
        />
        <StatCard 
          icon={<Box size={18} />} 
          label="Allowed Types" 
          value={allowedTypes.join(', ')} 
          isMono
        />
        <StatCard 
          icon={<Cpu size={18} />} 
          label="Max Memory" 
          value={formatBytes(server.databaseMemoryBytes || 512 * 1024 * 1024)} 
        />
        <StatCard 
          icon={<HardDrive size={18} />} 
          label="Disk Limit" 
          value={formatBytes(server.databaseDiskLimitBytes || 1024 * 1024 * 1024)} 
        />
      </div>

      {/* Database Table or Empty State */}
      <div className="flex flex-col gap-4">
        {!databases.length ? (
          <EmptyState className="flex flex-col items-center justify-center p-12 text-center rounded-xl border-2 border-dashed border-[var(--border)] bg-[var(--secondary)]/5">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[var(--secondary)]/20 mb-4">
              <Database size={32} className="text-[var(--muted-foreground)] opacity-75" />
            </div>
            <h3 className="text-base font-semibold text-[var(--foreground)]">No databases found</h3>
            <p className="mt-2 text-sm text-[var(--muted-foreground)] max-w-sm">
              {enabled ? 'Get started by creating your first database container using the form above.' : 'Database containers are not enabled for this server plan.'}
            </p>
          </EmptyState>
        ) : (
          <div className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--card)] shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[950px] text-left text-sm">
                <thead className="bg-[var(--secondary)]/30 text-[11px] uppercase tracking-wider text-[var(--muted-foreground)] border-b border-[var(--border)]">
                  <tr>
                    <th className="px-5 py-4 font-semibold">Name & Type</th>
                    <th className="px-5 py-4 font-semibold">Database</th>
                    <th className="px-5 py-4 font-semibold">Username</th>
                    <th className="px-5 py-4 font-semibold">Password</th>
                    <th className="px-5 py-4 font-semibold">Endpoint</th>
                    <th className="px-5 py-4 font-semibold">Container Info</th>
                    <th className="px-5 py-4 font-semibold">Status</th>
                    <th className="px-5 py-4 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {databases.map(database => {
                    const endpoint = `${database.host}:${database.port}`;
                    return (
                      <tr key={database.id} className="transition-colors hover:bg-[var(--secondary)]/5 group">
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <Badge className="bg-[var(--primary)]/10 text-[var(--primary)] border-transparent shadow-none px-2 py-0.5">
                              {database.type}
                            </Badge>
                            <span className="font-semibold text-[var(--foreground)]">{database.name}</span>
                          </div>
                        </td>
                        <CopyCell value={database.databaseName} copied={copied === `${database.id}:db`} onCopy={() => copy(database.databaseName, `${database.id}:db`)} />
                        <CopyCell value={database.username} copied={copied === `${database.id}:user`} onCopy={() => copy(database.username, `${database.id}:user`)} />
                        <CopyCell value={database.password} copied={copied === `${database.id}:password`} onCopy={() => copy(database.password, `${database.id}:password`)} isPassword />
                        <CopyCell value={endpoint} copied={copied === `${database.id}:endpoint`} onCopy={() => copy(endpoint, `${database.id}:endpoint`)} />
                        <td className="px-5 py-4">
                          <div className="max-w-[160px]">
                            <p className="truncate font-mono text-[11px] text-[var(--foreground)]" title={database.containerId}>{database.containerId}</p>
                            <p className="mt-1 truncate text-[11px] text-[var(--muted-foreground)]" title={database.dockerImage}>{database.dockerImage}</p>
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <Badge tone={database.status === 'running' ? 'success' : 'default'} className="shadow-none">
                            {database.status || 'created'}
                          </Badge>
                        </td>
                        <td className="px-5 py-4 text-right">
                          <div className="inline-flex justify-end gap-1 rounded-lg border border-[var(--border)] bg-[var(--secondary)]/10 p-1">
                            <ActionButton
                              icon={<Activity size={15} />}
                              onClick={() => testConnection(database)}
                              disabled={busy || database.status !== 'running'}
                              title="Test connection from game server"
                              hoverColor="hover:bg-[var(--primary)]/20 hover:text-[var(--primary)]"
                            />
                            <ActionButton 
                              icon={<Play size={15} />} 
                              onClick={() => powerDatabase(database, 'start')} 
                              disabled={busy || database.status === 'running'} 
                              title="Start" 
                              hoverColor="hover:bg-[var(--success)]/20 hover:text-[var(--success)]"
                            />
                            <ActionButton 
                              icon={<Square size={15} />} 
                              onClick={() => powerDatabase(database, 'stop')} 
                              disabled={busy || database.status === 'stopped'} 
                              title="Stop" 
                              hoverColor="hover:bg-orange-500/20 hover:text-orange-500"
                            />
                            <ActionButton 
                              icon={<RotateCw size={15} />} 
                              onClick={() => powerDatabase(database, 'reset')} 
                              disabled={busy} 
                              title="Reset" 
                            />
                            <div className="w-px h-5 bg-[var(--border)] self-center mx-1" />
                            <ActionButton 
                              icon={<Trash2 size={15} />} 
                              onClick={() => deleteDatabase(database)} 
                              disabled={busy} 
                              title="Delete" 
                              hoverColor="hover:bg-[var(--destructive)]/20 hover:text-[var(--destructive)]"
                            />
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* --- Extracted Sub-Components for Cleanliness --- */

function StatCard({ icon, label, value, isMono = false }: { icon: React.ReactNode, label: string, value: string, isMono?: boolean }) {
  return (
    <div className="flex items-center gap-4 rounded-xl border border-[var(--border)] bg-[var(--card)] p-4 shadow-sm transition-shadow hover:shadow-md">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[var(--primary)]/10 text-[var(--primary)]">
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium text-[var(--muted-foreground)]">{label}</p>
        <p className={cn("mt-0.5 truncate font-semibold text-[var(--foreground)]", isMono && "font-mono text-xs")}>
          {value}
        </p>
      </div>
    </div>
  );
}

function CopyCell({ value, copied, onCopy, isPassword = false }: { value: string; copied: boolean; onCopy: () => void; isPassword?: boolean }) {
  return (
    <td className="px-5 py-4">
      <button 
        className="group flex w-full max-w-[150px] items-center justify-between gap-2 rounded-md border border-[var(--border)] bg-[var(--secondary)]/10 px-2.5 py-1.5 transition-all hover:bg-[var(--secondary)]/40 hover:border-[var(--muted-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]" 
        onClick={onCopy} 
        title="Click to copy"
      >
        <span className="truncate font-mono text-[11px] text-[var(--foreground)]">
          {isPassword && !copied ? '••••••••••••' : value}
        </span>
        <span className="shrink-0 text-[var(--muted-foreground)] transition-colors group-hover:text-[var(--foreground)]">
          {copied ? <Check size={14} className="text-[var(--success)]" /> : <Copy size={14} />}
        </span>
      </button>
    </td>
  );
}

function ActionButton({ icon, onClick, disabled, title, hoverColor = "hover:bg-[var(--secondary)] hover:text-[var(--foreground)]" }: { icon: React.ReactNode, onClick: () => void, disabled: boolean, title: string, hoverColor?: string }) {
  return (
    <button 
      className={cn("rounded-md p-1.5 text-[var(--muted-foreground)] transition-colors focus:outline-none", hoverColor, disabled && "opacity-50 cursor-not-allowed")} 
      disabled={disabled} 
      onClick={onClick}
      title={title}
    >
      {icon}
    </button>
  );
}
