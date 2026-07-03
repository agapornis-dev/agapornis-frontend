'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import {
  Boxes,
  ChevronLeft,
  ChevronRight,
  Download,
  Package,
  RefreshCw,
  Search,
  Trash2,
} from 'lucide-react';
import type { ServerRecord } from '../../lib/types';
import { agentServerPath, requestJson } from '../../lib/http';
import { btn, dangerBtn, ghostBtn, inp } from '../../lib/constants';
import { Badge, EmptyState, Field, Tabs, cn } from '../ui';
import { useConfirm } from '../feedback/FeedbackProvider';

type BrowserTab = 'mods' | 'modpacks' | 'installed';

export function ServerMods({
  server,
  apiBase,
  authHeaders,
  readOnly,
}: {
  server: ServerRecord;
  apiBase: string;
  authHeaders: Record<string, string>;
  readOnly?: boolean;
}) {
  const confirm = useConfirm();
  const [tab, setTab] = useState<BrowserTab>('mods');
  const [queryInput, setQueryInput] = useState('');
  const [query, setQuery] = useState('');
  const [provider, setProvider] = useState('all');
  const [gameVersion, setGameVersion] = useState('');
  const [loader, setLoader] = useState('');
  const [pageSize, setPageSize] = useState(20);
  const [page, setPage] = useState(1);
  const [catalog, setCatalog] = useState<any>(null);
  const [versions, setVersions] = useState<any[]>([]);
  const [installed, setInstalled] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [workingId, setWorkingId] = useState('');
  const [message, setMessage] = useState('');

  const basePath = agentServerPath(server, '/mods');
  const projectType = tab === 'modpacks' ? 'modpack' : 'mod';
  const totalPages = Math.max(1, Math.ceil(Number(catalog?.total || 0) / pageSize));
  const enabledProviders = useMemo(
    () => (catalog?.providers || []).filter((item: any) => item.enabled),
    [catalog],
  );

  useEffect(() => {
    setTab('mods');
    setPage(1);
    setCatalog(null);
    setInstalled([]);
    setGameVersion('');
    setLoader('');
    void loadRuntimeVersions();
  }, [server.id]);

  useEffect(() => {
    if (tab === 'installed') void loadInstalled();
    else void loadCatalog();
  }, [tab, page, pageSize, provider, gameVersion, loader, query, server.id]);

  async function loadRuntimeVersions() {
    try {
      const data = await requestJson(
        apiBase,
        agentServerPath(server, '/version-catalog'),
        authHeaders,
      );
      setVersions(data?.selected?.versions || []);
    } catch {
      setVersions([]);
    }
  }

  async function loadCatalog() {
    setLoading(true);
    setMessage('');
    try {
      const params = new URLSearchParams({
        projectType,
        provider,
        page: String(page),
        pageSize: String(pageSize),
      });
      if (query) params.set('query', query);
      if (gameVersion) params.set('gameVersion', gameVersion);
      if (loader) params.set('loader', loader);
      const data = await requestJson(apiBase, `${basePath}/catalog?${params}`, authHeaders);
      setCatalog(data);
      if (!gameVersion && data?.profile?.gameVersion) setGameVersion(data.profile.gameVersion);
      if (!loader && data?.profile?.loader) setLoader(data.profile.loader);
      if (provider !== 'all' && !data?.providers?.some((item: any) => item.id === provider && item.enabled)) {
        setProvider('all');
      }
    } catch (error: any) {
      setMessage(error?.message || 'Could not load the mod catalog.');
      setCatalog(null);
    } finally {
      setLoading(false);
    }
  }

  async function loadInstalled() {
    setLoading(true);
    setMessage('');
    try {
      const data = await requestJson(apiBase, `${basePath}/installed`, authHeaders);
      setInstalled(data?.items || []);
    } catch (error: any) {
      setMessage(error?.message || 'Could not list installed mods.');
      setInstalled([]);
    } finally {
      setLoading(false);
    }
  }

  function search(event: FormEvent) {
    event.preventDefault();
    setPage(1);
    setQuery(queryInput.trim());
  }

  async function install(item: any) {
    if (readOnly) return;
    if (!await confirm({
      title: `Install ${item.title}?`,
      description: projectType === 'modpack'
        ? 'The compatible server pack will be extracted into the server root. Existing files with the same names may be replaced.'
        : `The newest compatible ${gameVersion || 'Minecraft'} ${loader || ''} build will be added to the mods folder.`,
      confirmLabel: projectType === 'modpack' ? 'Install server pack' : 'Install mod',
      tone: projectType === 'modpack' ? 'danger' : undefined,
    })) return;
    setWorkingId(`${item.provider}:${item.projectId}`);
    setMessage('');
    try {
      const result = await requestJson(apiBase, `${basePath}/install`, authHeaders, {
        method: 'POST',
        body: JSON.stringify({
          provider: item.provider,
          projectId: item.projectId,
          projectType,
          gameVersion: gameVersion || undefined,
          loader: loader || undefined,
        }),
      });
      setMessage(`${result.title || item.title} installed successfully.`);
      if (projectType === 'mod') await loadInstalled();
    } catch (error: any) {
      setMessage(`Error: ${error?.message || 'Installation failed.'}`);
    } finally {
      setWorkingId('');
    }
  }

  async function remove(item: any) {
    if (readOnly) return;
    if (!await confirm({
      title: `Remove ${item.name}?`,
      description: 'The mod file will be permanently deleted from this server.',
      confirmLabel: 'Remove mod',
      tone: 'danger',
    })) return;
    setWorkingId(item.path);
    try {
      await requestJson(
        apiBase,
        `${basePath}/installed`,
        authHeaders,
        { method: 'DELETE', body: JSON.stringify({ fileName: item.name }) },
      );
      setMessage(`${item.name} removed.`);
      await loadInstalled();
    } catch (error: any) {
      setMessage(`Error: ${error?.message || 'Removal failed.'}`);
    } finally {
      setWorkingId('');
    }
  }

  return (
    <div className="mx-auto grid max-w-6xl gap-5 p-4 sm:p-6">
      <div>
        <h3 className="text-xl font-semibold tracking-tight">Minecraft content</h3>
        <p className="mt-1 text-sm text-[var(--muted-foreground)]">
          Browse compatible mods and server packs, then manage everything already installed.
        </p>
      </div>

      <div className="overflow-x-auto pb-1">
        <Tabs
          value={tab}
          onChange={value => { setPage(1); setTab(value as BrowserTab); }}
          items={[
            { value: 'mods', label: <><Package size={14} /> Mods</> },
            { value: 'modpacks', label: <><Boxes size={14} /> Modpacks</> },
            { value: 'installed', label: <><Download size={14} /> Installed mods</> },
          ]}
        />
      </div>

      {tab !== 'installed' && (
        <div className="grid gap-4 rounded-lg border border-[var(--border)] bg-[var(--secondary)]/10 p-4">
          <form className="flex gap-2" onSubmit={search}>
            <div className="relative flex-1">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)]" />
              <input
                className={cn(inp, 'w-full pl-9')}
                value={queryInput}
                onChange={event => setQueryInput(event.target.value)}
                placeholder={tab === 'mods' ? 'Search mods by name or author' : 'Search modpacks'}
              />
            </div>
            <button className={btn} type="submit"><Search size={14} /> Search</button>
          </form>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Field label="Provider">
              <select className={inp} value={provider} onChange={event => { setPage(1); setProvider(event.target.value); }}>
                <option value="all">All enabled sources</option>
                {(catalog?.providers || []).map((item: any) => (
                  <option key={item.id} value={item.id} disabled={!item.enabled}>
                    {item.name}{item.enabled ? '' : ' (not configured)'}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Minecraft version">
              <select className={inp} value={gameVersion} onChange={event => { setPage(1); setGameVersion(event.target.value); }}>
                <option value="">Server default</option>
                {versions.map(version => <option key={version.id} value={version.id}>{version.label}</option>)}
              </select>
            </Field>
            <Field label="Mod loader">
              <select className={inp} value={loader} onChange={event => { setPage(1); setLoader(event.target.value); }}>
                <option value="">Any loader</option>
                {['fabric', 'forge', 'neoforge', 'quilt'].map(value => <option key={value} value={value}>{value[0].toUpperCase() + value.slice(1)}</option>)}
              </select>
            </Field>
            <Field label="Page size">
              <select className={inp} value={pageSize} onChange={event => { setPage(1); setPageSize(Number(event.target.value)); }}>
                {[10, 20, 30, 50].map(value => <option key={value} value={value}>{value} results</option>)}
              </select>
            </Field>
          </div>

          {catalog?.profile && (
            <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--muted-foreground)]">
              <span>Runtime:</span>
              <Badge>{catalog.profile.provider}</Badge>
              {catalog.profile.gameVersion && <Badge>{catalog.profile.gameVersion}</Badge>}
              {catalog.profile.loader && <Badge>{catalog.profile.loader}</Badge>}
              <span className="ml-auto">{enabledProviders.length} source{enabledProviders.length === 1 ? '' : 's'} enabled</span>
            </div>
          )}
        </div>
      )}

      {message && (
        <div className={cn(
          'rounded-md border p-3 text-sm',
          message.startsWith('Error:')
            ? 'border-[var(--destructive)]/30 bg-[var(--destructive)]/5 text-[var(--destructive)]'
            : 'border-[var(--border)] bg-[var(--secondary)]/10 text-[var(--foreground)]',
        )}>{message}</div>
      )}

      {loading ? (
        <div className="flex items-center justify-center gap-2 py-16 text-sm text-[var(--muted-foreground)]">
          <RefreshCw size={17} className="animate-spin" /> Loading Minecraft content…
        </div>
      ) : tab === 'installed' ? (
        installed.length ? (
          <div className="divide-y divide-[var(--border)] overflow-hidden rounded-lg border border-[var(--border)]">
            {installed.map(item => (
              <div key={item.path} className="flex items-center gap-3 bg-[var(--card)] px-4 py-3">
                <Package size={17} className="shrink-0 text-[var(--primary)]" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{item.name}</p>
                  <p className="text-xs text-[var(--muted-foreground)]">{formatBytes(item.size)} · {item.enabled ? 'Enabled' : 'Disabled'}</p>
                </div>
                {!readOnly && (
                  <button className={dangerBtn} disabled={workingId === item.path} onClick={() => void remove(item)}>
                    <Trash2 size={13} /> Remove
                  </button>
                )}
              </div>
            ))}
          </div>
        ) : <EmptyState className="py-16 text-center">No mod JARs are installed in the mods directory.</EmptyState>
      ) : (catalog?.items || []).length ? (
        <>
          <div className="grid gap-3 md:grid-cols-2">
            {catalog.items.map((item: any) => {
              const id = `${item.provider}:${item.projectId}`;
              return (
                <div key={id} className="flex gap-4 rounded-lg border border-[var(--border)] bg-[var(--card)] p-4">
                  {item.iconUrl ? (
                    <img src={item.iconUrl} alt="" className="h-14 w-14 shrink-0 rounded-lg object-cover" />
                  ) : (
                    <div className="grid h-14 w-14 shrink-0 place-items-center rounded-lg bg-[var(--secondary)]"><Package size={20} /></div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h4 className="truncate text-sm font-semibold">{item.title}</h4>
                        <p className="text-xs text-[var(--muted-foreground)]">{item.author || 'Unknown author'} · {formatCount(item.downloads)} downloads</p>
                      </div>
                      <Badge>{item.provider}</Badge>
                    </div>
                    <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-[var(--muted-foreground)]">{item.description}</p>
                    <div className="mt-3 flex justify-end">
                      <button
                        className={btn}
                        disabled={readOnly || Boolean(workingId)}
                        onClick={() => void install(item)}
                      >
                        {workingId === id ? <RefreshCw size={13} className="animate-spin" /> : <Download size={13} />}
                        Install
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs text-[var(--muted-foreground)]">
              Page {page} of {totalPages} · {Number(catalog.total || 0).toLocaleString()} results
            </p>
            <div className="flex gap-2">
              <button className={ghostBtn} disabled={page <= 1} onClick={() => setPage(value => Math.max(1, value - 1))}><ChevronLeft size={14} /> Previous</button>
              <button className={ghostBtn} disabled={page >= totalPages} onClick={() => setPage(value => value + 1)}>Next <ChevronRight size={14} /></button>
            </div>
          </div>
        </>
      ) : (
        <EmptyState className="py-16 text-center">No compatible {projectType === 'mod' ? 'mods' : 'modpacks'} matched these filters.</EmptyState>
      )}
    </div>
  );
}

function formatBytes(value: number) {
  if (!value) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const index = Math.min(units.length - 1, Math.floor(Math.log(value) / Math.log(1024)));
  return `${(value / 1024 ** index).toFixed(index ? 1 : 0)} ${units[index]}`;
}

function formatCount(value: number) {
  return new Intl.NumberFormat(undefined, { notation: 'compact', maximumFractionDigits: 1 }).format(value || 0);
}
