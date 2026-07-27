import { useMemo, useRef, useState, useEffect } from 'react';
import { BookTemplate, Download, FileJson, Search, Trash2, UploadCloud, X, Package, Layers, Settings2, FileCode2, FolderTree, Plus, Folder } from 'lucide-react';
import { btn, ghostBtn, inp } from '../../lib/constants';
import { Panel, EmptyState, cn, formControlClass } from '../../components/ui';
import { defaultEggJson } from '../../lib/utils';
import { useConfirm } from '../../components/feedback/FeedbackProvider';
// Note: groupEggsByNest might not be needed anymore with the tabbed approach, but kept if you use it elsewhere.
import { useLazyData } from '../../hooks/useLazyData';
import { requestJson } from '../../lib/http';
import { useApiAction } from '../../hooks/useApiAction';

/* ── Self-contained screen (data fetching + UI) ─────────────────────── */

export function EggsScreen({ apiBase, showToast }: { apiBase: string; showToast: (msg: string, type: 'success' | 'error') => void }) {
  const { data: eggs, loading, refresh } = useLazyData<any[]>(apiBase, '/eggs', {}, []);
  const { data: catalog, loading: catalogLoading, refresh: refreshCatalog } = useLazyData<any[]>(apiBase, '/eggs/catalog', {}, []);
  const { data: nests, loading: nestsLoading, refresh: refreshNests } = useLazyData<any[]>(apiBase, '/eggs/nests', {}, []);
  const { busy, run } = useApiAction(showToast);

  const refreshAll = () => Promise.all([refresh(), refreshCatalog(), refreshNests()]);

  if (loading && !eggs?.length) return <div className="p-4 text-[var(--muted-foreground)] animate-pulse">Loading environments...</div>;

  return (
    <EggsPanel
      eggs={eggs || []}
      nests={nests || []}
      catalog={catalog || []}
      busy={busy || loading || catalogLoading || nestsLoading}
      onImport={async (json) => { await run(() => requestJson(apiBase, '/eggs/import', {}, { method: 'POST', body: json }), 'Template (Egg) successfully imported'); await refreshAll(); }}
      onImportFiles={async (files) => {
        const parsed = [];
        for (const file of files) {
          try { parsed.push(JSON.parse(await file.text())); }
          catch { showToast(`${file.name} does not contain valid JSON`, 'error'); return false; }
        }
        const result = await run(() => requestJson(apiBase, '/eggs/import/batch', {}, { method: 'POST', body: JSON.stringify({ eggs: parsed }) }));
        if (result) { showToast(`${result.imported} egg${result.imported === 1 ? '' : 's'} imported`, 'success'); await refreshAll(); return true; }
        return false;
      }}
      onCatalogInstall={async (catalogId) => { await run(() => requestJson(apiBase, `/eggs/catalog/${encodeURIComponent(catalogId)}/install`, {}, { method: 'POST' }), 'Egg installed from the Pterodactyl catalog'); await refreshAll(); }}
      onRemove={async (eggId) => { await run(() => requestJson(apiBase, `/eggs/${encodeURIComponent(eggId)}`, {}, { method: 'DELETE' }), 'Egg removed'); await refreshAll(); }}
      onCreateNest={async (name) => { await run(() => requestJson(apiBase, '/eggs/nests', {}, { method: 'POST', body: JSON.stringify({ name }) }), 'Nest created'); await refreshNests(); }}
      onAssignNest={async (eggId, nestId) => { await run(() => requestJson(apiBase, `/eggs/${encodeURIComponent(eggId)}/nest`, {}, { method: 'PATCH', body: JSON.stringify({ nestId }) })); await Promise.all([refresh(), refreshNests()]); }}
      onRemoveNest={async (nestId) => { await run(() => requestJson(apiBase, `/eggs/nests/${encodeURIComponent(nestId)}`, {}, { method: 'DELETE' }), 'Nest removed; its eggs were moved to Uncategorized'); await Promise.all([refresh(), refreshNests()]); }}
    />
  );
}

export function EggsPanel({ eggs, nests, catalog, busy, onImport, onImportFiles, onCatalogInstall, onRemove, onCreateNest, onAssignNest, onRemoveNest }: {
  eggs: any[];
  nests: any[];
  catalog: any[];
  busy: boolean;
  onImport: (json: string) => Promise<void>;
  onImportFiles: (files: File[]) => Promise<boolean>;
  onCatalogInstall: (catalogId: string) => Promise<void>;
  onRemove: (eggId: string) => Promise<void>;
  onCreateNest: (name: string) => Promise<void>;
  onAssignNest: (eggId: string, nestId: string) => Promise<void>;
  onRemoveNest: (nestId: string) => Promise<void>;
}) {
  const [eggJson, setEggJson] = useState(defaultEggJson);
  const [eggFiles, setEggFiles] = useState<File[]>([]);
  const fileInput = useRef<HTMLInputElement>(null);
  
  const [search, setSearch] = useState('');
  const [newNestName, setNewNestName] = useState('');
  const [activeNestId, setActiveNestId] = useState<string | 'all'>('all');
  
  const confirm = useConfirm();
  const customInputStyle = formControlClass();

  // If active nest gets deleted, fallback to 'all'
  useEffect(() => {
    if (activeNestId !== 'all' && !nests.find(n => n.id === activeNestId)) {
      setActiveNestId('all');
    }
  }, [nests, activeNestId]);

  // Unified Filtering: Search + Active Tab
  const filteredEggs = useMemo(() => {
    let result = eggs;
    if (activeNestId !== 'all') {
      result = result.filter(egg => (egg.nestId || 'uncategorized') === activeNestId);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(egg => `${egg.name} ${egg.id}`.toLowerCase().includes(q));
    }
    return result;
  }, [eggs, search, activeNestId]);

  const availableCatalog = useMemo(() => catalog.filter(item => !item.installed), [catalog]);

  const clearEggFiles = () => {
    setEggFiles([]);
    if (fileInput.current) fileInput.current.value = '';
  };

  return (
    <div className="mx-auto max-w-[1600px] grid gap-8 pb-12">
      
      {/* Typographical Page Header */}
      <div className="flex flex-col gap-2">
        <h2 className="text-3xl font-extrabold tracking-tight text-[var(--foreground)] sm:text-4xl">
          Templates<span className="text-[var(--primary)]">.</span>
        </h2>
        <p className="text-sm font-medium text-[var(--muted-foreground)]/80">
          Manage server execution environments, configure nests, and browse the starter catalog.
        </p>
      </div>

      <div className="grid gap-8 xl:grid-cols-[1.3fr_0.7fr] items-start">
        
        {/* Left Column: Unified Environment Library */}
        <div className="flex flex-col gap-6 order-2 xl:order-1">
          <Panel className="flex flex-col overflow-hidden border-[var(--border)]/60 bg-[var(--background)]/50 backdrop-blur-sm shadow-sm min-h-[600px]">
            
            {/* Header & Action Bar */}
            <div className="flex flex-col gap-4 border-b border-[var(--border)]/60 bg-[var(--secondary)]/10 p-5">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <FolderTree size={20} className="text-[var(--primary)]" />
                  <h3 className="text-base font-bold tracking-wide text-[var(--foreground)]">Environment Library</h3>
                </div>
                <div className="flex flex-wrap items-center gap-3 flex-1 sm:justify-end">
                  <div className="relative group w-full sm:w-64">
                    <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)] transition-colors group-focus-within:text-[var(--primary)] pointer-events-none" />
                    <input 
                      className={cn(inp, customInputStyle, "pl-9 h-9 w-full text-sm")} 
                      value={search} 
                      onChange={event => setSearch(event.target.value)} 
                      placeholder="Search templates..." 
                    />
                  </div>
                  <div className="flex gap-2 w-full sm:w-auto">
                    <input 
                      className={cn(inp, customInputStyle, 'h-9 w-full sm:w-48 text-sm')} 
                      value={newNestName} 
                      onChange={event => setNewNestName(event.target.value)} 
                      placeholder="New nest name..." 
                      onKeyDown={e => {
                        if (e.key === 'Enter' && newNestName.trim() && !busy) {
                          onCreateNest(newNestName.trim());
                          setNewNestName('');
                        }
                      }}
                    />
                    <button 
                      className={cn(btn, 'h-9 px-3 gap-1.5 whitespace-nowrap')} 
                      disabled={busy || !newNestName.trim()} 
                      onClick={async () => { await onCreateNest(newNestName.trim()); setNewNestName(''); }}
                    >
                      <Plus size={14} /> Add
                    </button>
                  </div>
                </div>
              </div>

              {/* Nest Tabs (Scrollable) */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1 mt-2 scrollbar-hide">
                <button
                  onClick={() => setActiveNestId('all')}
                  className={cn("flex items-center gap-2 shrink-0 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all border", 
                    activeNestId === 'all' 
                      ? "bg-[var(--primary)] text-[var(--primary-foreground)] border-[var(--primary)] shadow-md" 
                      : "bg-[var(--background)] text-[var(--muted-foreground)] border-[var(--border)]/50 hover:border-[var(--primary)]/40 hover:text-[var(--foreground)]"
                  )}
                >
                  All Templates
                  <span className={cn("px-1.5 py-0.5 rounded-full text-[10px]", activeNestId === 'all' ? "bg-black/20" : "bg-[var(--secondary)]")}>
                    {eggs.length}
                  </span>
                </button>

                {nests.map(nest => (
                  <div key={nest.id} className={cn("flex items-center shrink-0 rounded-full text-xs font-bold transition-all border",
                    activeNestId === nest.id 
                      ? "bg-[var(--secondary)]/80 text-[var(--foreground)] border-[var(--border)] shadow-sm" 
                      : "bg-[var(--background)] text-[var(--muted-foreground)] border-[var(--border)]/50 hover:border-[var(--primary)]/40 hover:text-[var(--foreground)]"
                  )}>
                    <button 
                      onClick={() => setActiveNestId(nest.id)} 
                      className="flex items-center gap-2 pl-3.5 pr-2 py-1.5"
                    >
                      <Folder size={12} className={activeNestId === nest.id ? "text-[var(--primary)]" : "opacity-60"} />
                      {nest.name}
                      <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-[var(--background)] border border-[var(--border)]/50">
                        {nest.eggCount || 0}
                      </span>
                    </button>
                    {nest.id !== 'uncategorized' && activeNestId === nest.id && (
                      <button 
                        onClick={() => void onRemoveNest(nest.id)} 
                        className="pr-3 pl-1 py-1.5 text-[var(--muted-foreground)] hover:text-red-500 transition-colors"
                        title="Delete Nest"
                      >
                        <X size={13} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Grid Content Area */}
            <div className="flex-1 overflow-y-auto bg-[var(--background)] p-4 sm:p-5">
              {filteredEggs.length === 0 ? (
                <EmptyState className="py-24">
                  <span className="text-[var(--muted-foreground)]">
                    {search ? 'No environments match your search in this nest.' : 'No environments found in this nest.'}
                  </span>
                </EmptyState>
              ) : (
                <div className="grid grid-cols-1 2xl:grid-cols-2 gap-4">
                  {filteredEggs.map(egg => (
                    <div key={egg.id} className="group flex flex-col justify-between gap-4 p-4 rounded-xl border border-[var(--border)]/60 bg-[var(--secondary)]/10 transition-all hover:bg-[var(--secondary)]/20 hover:border-[var(--primary)]/30 hover:shadow-sm relative overflow-hidden">
                      
                      {/* Card Header */}
                      <div className="flex items-start justify-between gap-4 z-10">
                        <div className="flex flex-col gap-1.5 min-w-0">
                          <h4 className="text-base font-bold text-[var(--foreground)] tracking-tight truncate pr-4">{egg.name || egg.id}</h4>
                          <p className="text-[11px] font-mono text-[var(--muted-foreground)]/70 truncate">ID: {egg.id}</p>
                        </div>
                        
                        <button 
                          className="flex items-center justify-center shrink-0 w-8 h-8 rounded-md bg-[var(--background)] border border-[var(--border)]/60 text-[var(--muted-foreground)] transition-all hover:border-red-500/30 hover:bg-red-500/10 hover:text-red-500 focus:outline-none" 
                          disabled={busy} 
                          onClick={async () => {
                            if (await confirm({
                              title: 'Remove this template?',
                              description: `${egg.name || egg.id} will no longer be available for new servers.`,
                              confirmLabel: 'Remove Template',
                              tone: 'danger'
                            })) void onRemove(egg.id);
                          }} 
                          title="Remove Template"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                      
                      {/* Card Footer (Badges & Nest Assignment) */}
                      <div className="flex flex-wrap items-center gap-2 z-10 pt-2 border-t border-[var(--border)]/40 mt-auto">
                        <div className="relative group/select">
                          <select
                            className={cn(inp, 'h-7 pl-2 pr-6 py-0 text-[11px] font-medium bg-[var(--background)] border-[var(--border)]/60 hover:border-[var(--primary)]/50 appearance-none cursor-pointer focus:ring-1 focus:ring-[var(--primary)]/40')}
                            value={egg.nestId || 'uncategorized'}
                            disabled={busy}
                            onChange={event => void onAssignNest(egg.id, event.target.value)}
                            title="Assign to Nest"
                          >
                            {nests.map(nest => <option key={nest.id} value={nest.id}>{nest.name}</option>)}
                          </select>
                          <FolderTree size={10} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)] pointer-events-none group-hover/select:text-[var(--primary)]" />
                        </div>

                        <span className="flex items-center gap-1.5 rounded-md bg-[var(--secondary)]/40 px-2 py-1 text-[11px] font-semibold text-[var(--foreground)]/80 border border-transparent">
                          <Layers size={11} className="text-[var(--primary)]" />
                          {egg.dockerImages?.length || egg.images?.length || 0}
                        </span>
                        
                        <span className="flex items-center gap-1.5 rounded-md bg-[var(--secondary)]/40 px-2 py-1 text-[11px] font-semibold text-[var(--foreground)]/80 border border-transparent">
                          <Settings2 size={11} className="text-[var(--primary)]" />
                          {egg.variables?.length || 0}
                        </span>
                        
                        {egg.install?.hasScript && (
                          <span className="flex items-center gap-1.5 rounded-md border border-amber-500/20 bg-amber-500/5 px-2 py-1 text-[11px] font-semibold text-amber-500/90 ml-auto">
                            <FileCode2 size={11} />
                            Script
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Panel>
        </div>

        {/* Right Column: Catalog & Import */}
        <div className="flex flex-col gap-6 order-1 xl:order-2">
          
          {/* Catalog Panel */}
          <Panel className="overflow-hidden border-[var(--border)]/60 bg-[var(--background)]/50 backdrop-blur-sm shadow-sm">
            <div className="flex items-center justify-between border-b border-[var(--border)]/60 bg-[var(--secondary)]/10 px-5 py-4">
              <div className="flex items-center gap-3">
                <Package size={18} className="text-[var(--primary)]" />
                <h3 className="text-sm font-bold tracking-wide text-[var(--foreground)]">Starter Catalog</h3>
              </div>
              <span className="text-xs font-semibold text-[var(--muted-foreground)] bg-[var(--background)] px-2 py-0.5 rounded-full border border-[var(--border)]/50">
                {availableCatalog.length}
              </span>
            </div>
            
            <div className="divide-y divide-[var(--border)]/50 max-h-[400px] overflow-y-auto">
              {availableCatalog.length === 0 ? (
                <EmptyState className="py-12 text-sm">All starter templates are installed.</EmptyState>
              ) : availableCatalog.map(item => (
                <div key={item.id} className="group flex flex-col gap-2 p-4 transition-colors hover:bg-[var(--secondary)]/10">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex flex-col min-w-0">
                      <p className="text-sm font-bold text-[var(--foreground)] truncate">{item.name}</p>
                      <p className="mt-0.5 text-[10px] font-bold uppercase tracking-widest text-[var(--primary)]">{item.category}</p>
                    </div>
                    <button 
                      className={cn(btn, 'shrink-0 gap-1.5 px-3 py-1.5 text-[11px] bg-[var(--primary)] text-[var(--foreground)] hover:bg-[var(--primary)]/40 hover:text-[var(--primary-foreground)] shadow-sm')} 
                      disabled={busy} 
                      onClick={() => void onCatalogInstall(item.id)}
                    >
                      <Download size={12} /> Install
                    </button>
                  </div>
                  <p className="text-xs font-medium leading-relaxed text-[var(--muted-foreground)]/80 line-clamp-2">{item.description}</p>
                </div>
              ))}
            </div>
          </Panel>

          {/* Import Panel */}
          <Panel className="overflow-hidden border-[var(--border)]/60 bg-[var(--background)]/50 backdrop-blur-sm shadow-sm">
            <div className="flex items-center gap-3 border-b border-[var(--border)]/60 bg-[var(--secondary)]/10 px-5 py-4">
              <UploadCloud size={18} className="text-[var(--primary)]" />
              <h3 className="text-sm font-bold tracking-wide text-[var(--foreground)]">Import Configuration</h3>
            </div>
            
            <div className="flex flex-col gap-6 p-5">
              
              {/* File Dropzone */}
              <div className="flex flex-col gap-3">
                <input
                  id="egg-file-import"
                  ref={fileInput}
                  className="sr-only"
                  type="file"
                  accept=".json,application/json"
                  multiple
                  onChange={event => setEggFiles(Array.from(event.target.files || []))}
                />
                <label 
                  htmlFor="egg-file-import" 
                  className="group flex min-h-[100px] cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-[var(--border)] bg-[var(--secondary)]/5 transition-all hover:border-[var(--primary)]/50 hover:bg-[var(--primary)]/5"
                >
                  <UploadCloud size={20} className="text-[var(--muted-foreground)] transition-colors group-hover:text-[var(--primary)]" />
                  <span className="text-sm font-semibold text-[var(--foreground)]">{eggFiles.length ? 'Select Different Files' : 'Upload JSON Files'}</span>
                </label>

                {eggFiles.length > 0 && (
                  <div className="flex flex-col overflow-hidden rounded-lg border border-[var(--border)]/60 bg-[var(--secondary)]/20 animate-in fade-in slide-in-from-top-2">
                    <div className="flex items-center justify-between border-b border-[var(--border)]/60 px-3 py-2 bg-[var(--secondary)]/40">
                      <span className="text-[11px] font-bold text-[var(--foreground)]">{eggFiles.length} File{eggFiles.length === 1 ? '' : 's'} Queued</span>
                      <button className="text-[var(--muted-foreground)] transition-colors hover:text-red-500" onClick={clearEggFiles} type="button">
                        <X size={12} />
                      </button>
                    </div>
                    <div className="flex max-h-28 flex-col gap-1 overflow-y-auto px-3 py-2">
                      {eggFiles.map((file, index) => (
                        <p key={`${file.name}-${index}`} className="truncate py-0.5 font-mono text-[10px] text-[var(--muted-foreground)] flex items-center gap-2">
                          <FileJson size={10} className="text-[var(--primary)] shrink-0"/> {file.name}
                        </p>
                      ))}
                    </div>
                  </div>
                )}

                <button 
                  className={cn(btn, 'w-full py-2 shadow-sm text-xs')} 
                  disabled={busy || eggFiles.length === 0} 
                  onClick={async () => {
                    if (await onImportFiles(eggFiles)) clearEggFiles();
                  }} 
                  type="button"
                >
                  Import {eggFiles.length || ''} File{eggFiles.length === 1 ? '' : 's'}
                </button>
              </div>

              <div className="flex items-center gap-4 text-[10px] font-bold uppercase tracking-widest text-[var(--muted-foreground)]/40">
                <span className="h-px flex-1 bg-[var(--border)]" />
                Raw JSON
                <span className="h-px flex-1 bg-[var(--border)]" />
              </div>

              {/* Raw JSON Input */}
              <div className="flex flex-col gap-3">
                <div className="relative group overflow-hidden rounded-xl border border-[var(--border)]/60 shadow-inner focus-within:border-[var(--primary)] focus-within:ring-1 focus-within:ring-[var(--primary)]/30 transition-all">
                  <FileJson className="absolute top-3 right-3 text-[var(--muted-foreground)] opacity-20 transition-opacity group-focus-within:opacity-100 group-focus-within:text-[var(--primary)]" size={16} />
                  <textarea 
                    className={cn(inp, "min-h-[200px] w-full resize-y border-none bg-[#0a0a0a] p-4 font-mono text-[11px] leading-relaxed text-emerald-400 focus:ring-0")} 
                    value={eggJson} 
                    onChange={e => setEggJson(e.target.value)} 
                    spellCheck={false}
                  />
                </div>
                <button 
                  className={cn(btn, "w-full py-2 bg-[var(--secondary)] text-[var(--foreground)] hover:bg-[var(--primary)] hover:text-[var(--primary-foreground)] text-xs")} 
                  disabled={busy} 
                  onClick={() => onImport(eggJson)}
                >
                  Import Pasted Template
                </button>
              </div>

            </div>
          </Panel>

        </div>
      </div>
    </div>
  );
}