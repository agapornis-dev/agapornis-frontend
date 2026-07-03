import { useMemo, useRef, useState } from 'react';
import { BookTemplate, ChevronDown, ChevronRight, Download, FileJson, Search, Trash2, UploadCloud, X, Package, Layers, Settings2, FileCode2, FolderTree, Plus } from 'lucide-react';
import { btn, ghostBtn, inp } from '../../lib/constants';
import { Panel, EmptyState, cn } from '../ui';
import { defaultEggJson } from '../../lib/utils';
import { useConfirm } from '../feedback/FeedbackProvider';
import { groupEggsByNest } from './EggNestFields';

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
  const [collapsedNests, setCollapsedNests] = useState<Set<string>>(new Set());
  const confirm = useConfirm();
  
  const filteredEggs = useMemo(() => eggs.filter(egg => `${egg.name} ${egg.id}`.toLowerCase().includes(search.toLowerCase())), [eggs, search]);
  const filteredNestGroups = useMemo(() => groupEggsByNest(filteredEggs), [filteredEggs]);
  const availableCatalog = useMemo(() => catalog.filter(item => !item.installed), [catalog]);
  
  const clearEggFiles = () => {
    setEggFiles([]);
    if (fileInput.current) fileInput.current.value = '';
  };

  const customInputStyle = "bg-[var(--secondary)]/10 border-[var(--border)]/60 transition-all focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)]/30 font-medium";

  return (
    <div className="mx-auto max-w-[1400px] grid gap-10 pb-12">
      
      {/* Typographical Page Header */}
      <div className="flex flex-col gap-2">
        <h2 className="text-3xl font-extrabold tracking-tight text-[var(--foreground)] sm:text-4xl">
          Templates<span className="text-[var(--primary)]">.</span>
        </h2>
        <p className="text-sm font-medium text-[var(--muted-foreground)]/80">
          Manage server execution environments, import custom eggs, and browse the starter catalog.
        </p>
      </div>

      <div className="grid gap-8 xl:grid-cols-[1.2fr_0.8fr] items-start">
        
        {/* Left Column: Installed Eggs List */}
        <div className="flex flex-col gap-6 order-2 xl:order-1">
          <Panel className="overflow-hidden border-[var(--border)]/60 bg-[var(--background)]/50 backdrop-blur-sm">
            <div className="flex items-center gap-3 border-b border-[var(--border)]/60 bg-[var(--secondary)]/10 px-6 py-4">
              <FolderTree size={18} className="text-[var(--primary)]" />
              <h3 className="text-sm font-bold tracking-wide text-[var(--foreground)]">Egg Nests</h3>
            </div>
            <div className="grid gap-4 p-4 sm:p-6">
              <div className="flex gap-2">
                <input className={cn(inp, customInputStyle, 'flex-1')} value={newNestName} onChange={event => setNewNestName(event.target.value)} placeholder="Create a nest, e.g. Minecraft" />
                <button className={cn(btn, 'gap-2')} disabled={busy || !newNestName.trim()} onClick={async () => { await onCreateNest(newNestName.trim()); setNewNestName(''); }}>
                  <Plus size={15} /> Add
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {nests.map(nest => (
                  <div key={nest.id} className="flex items-center gap-2 rounded-lg border border-[var(--border)]/60 bg-[var(--secondary)]/10 px-3 py-2">
                    <span className="text-sm font-semibold">{nest.name}</span>
                    <span className="text-xs text-[var(--muted-foreground)]">{nest.eggCount || 0}</span>
                    {nest.id !== 'uncategorized' && <button className="text-[var(--muted-foreground)] hover:text-red-500" onClick={() => void onRemoveNest(nest.id)} aria-label={`Remove ${nest.name}`}><X size={13} /></button>}
                  </div>
                ))}
              </div>
            </div>
          </Panel>

          <Panel className="overflow-hidden border-[var(--border)]/60 bg-[var(--background)]/50 backdrop-blur-sm">
            
            <div className="flex items-center justify-between border-b border-[var(--border)]/60 bg-[var(--secondary)]/10 px-6 py-4">
              <div className="flex items-center gap-3">
                <BookTemplate size={18} className="text-[var(--primary)]" />
                <h3 className="text-sm font-bold tracking-wide text-[var(--foreground)]">Installed Environments</h3>
              </div>
              <span className="rounded-full bg-[var(--secondary)]/50 px-3 py-1 text-xs font-bold text-[var(--foreground)]">
                {eggs.length} Total
              </span>
            </div>

            <div className="border-b border-[var(--border)]/50 p-4 bg-[var(--background)]">
              <div className="relative group">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)] transition-colors group-focus-within:text-[var(--primary)] pointer-events-none" />
                <input 
                  className={cn(inp, customInputStyle, "pl-10 h-10 w-full")} 
                  value={search} 
                  onChange={event => { setSearch(event.target.value); setCollapsedNests(new Set()); }} 
                  placeholder="Search templates by name or ID..." 
                />
              </div>
            </div>

            <div className="grid max-h-[750px] gap-3 overflow-y-auto p-3">
              {filteredEggs.length === 0 ? (
                <EmptyState className="py-16">
                  <span className="text-[var(--muted-foreground)]">{eggs.length ? 'No environments match this search.' : 'No environments installed.'}</span>
                </EmptyState>
              ) : filteredNestGroups.map(group => {
                const collapsed = collapsedNests.has(group.id);
                return <section key={group.id} className="overflow-hidden rounded-xl border border-[var(--border)]/60 overflow-y-auto">
                  <button
                    type="button"
                    className={cn('flex w-full items-center justify-between bg-[var(--secondary)]/15 px-4 py-3 text-left transition-colors hover:bg-[var(--secondary)]/25', !collapsed && 'border-b border-[var(--border)]/50')}
                    onClick={() => setCollapsedNests(current => {
                      const next = new Set(current);
                      next.has(group.id) ? next.delete(group.id) : next.add(group.id);
                      return next;
                    })}
                    aria-expanded={!collapsed}
                  >
                    <span className="flex items-center gap-2">
                      {collapsed ? <ChevronRight size={16} /> : <ChevronDown size={16} />}
                      <span className="font-bold text-[var(--foreground)]">{group.name}</span>
                    </span>
                    <span className="text-xs font-semibold text-[var(--muted-foreground)]">{group.eggs.length} egg{group.eggs.length === 1 ? '' : 's'}</span>
                  </button>
                  {!collapsed && <div className="divide-y divide-[var(--border)]/50">
                  {group.eggs.map(egg => (
                <div key={egg.id} className="group grid gap-4 p-5 transition-colors hover:bg-[var(--secondary)]/10">
                  <div className="flex items-start justify-between gap-4">
                    
                    <div className="flex flex-col gap-1 min-w-0">
                      <h4 className="text-lg font-bold text-[var(--foreground)] tracking-tight truncate">{egg.name || egg.id}</h4>
                      <p className="text-xs font-mono text-[var(--muted-foreground)]/80 truncate">ID: {egg.id}</p>
                    </div>

                    <button 
                      className="group/remove flex items-center gap-2 rounded-lg border border-transparent px-3 py-1.5 text-sm font-medium text-[var(--muted-foreground)] transition-all hover:border-red-500/20 hover:bg-red-500/10 hover:text-red-500 focus:outline-none" 
                      disabled={busy} 
                      onClick={async () => {
                        if (await confirm({
                          title: 'Remove this template?',
                          description: `${egg.name || egg.id} will no longer be available for new servers or egg swaps.`,
                          confirmLabel: 'Remove Template',
                          tone: 'danger'
                        })) void onRemove(egg.id);
                      }} 
                      title="Remove Template"
                    >
                      <Trash2 size={16} className="transition-transform group-hover/remove:scale-110" />
                    </button>
                  </div>
                  
                  {/* Resource Badges */}
                  <div className="flex flex-wrap items-center gap-2 mt-1">
                    <select
                      className={cn(inp, customInputStyle, 'h-8 w-auto min-w-40 py-1 text-xs')}
                      value={egg.nestId || 'uncategorized'}
                      disabled={busy}
                      onChange={event => void onAssignNest(egg.id, event.target.value)}
                      aria-label={`Nest for ${egg.name || egg.id}`}
                    >
                      {nests.map(nest => <option key={nest.id} value={nest.id}>{nest.name}</option>)}
                    </select>
                    <span className="flex items-center gap-1.5 rounded-md border border-[var(--border)]/60 bg-[var(--background)] px-2.5 py-1 text-xs font-semibold text-[var(--muted-foreground)]">
                      <Layers size={12} className="text-[var(--primary)]" />
                      {egg.dockerImages?.length || egg.images?.length || 0} Images
                    </span>
                    <span className="flex items-center gap-1.5 rounded-md border border-[var(--border)]/60 bg-[var(--background)] px-2.5 py-1 text-xs font-semibold text-[var(--muted-foreground)]">
                      <Settings2 size={12} className="text-[var(--primary)]" />
                      {egg.variables?.length || 0} Variables
                    </span>
                    {egg.install?.hasScript && (
                      <span className="flex items-center gap-1.5 rounded-md border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-xs font-semibold text-amber-500">
                        <FileCode2 size={12} />
                        Installer Script
                      </span>
                    )}
                  </div>
                </div>
                  ))}
                  </div>}
                </section>;
              })}
            </div>
          </Panel>
        </div>

        {/* Right Column: Catalog & Import */}
        <div className="flex flex-col gap-8 order-1 xl:order-2">
          
          {/* Catalog Panel */}
          <Panel className="overflow-hidden border-[var(--border)]/60 bg-[var(--background)]/50 backdrop-blur-sm">
            <div className="flex items-center justify-between border-b border-[var(--border)]/60 bg-[var(--secondary)]/10 px-6 py-4">
              <div className="flex items-center gap-3">
                <Package size={18} className="text-[var(--primary)]" />
                <h3 className="text-sm font-bold tracking-wide text-[var(--foreground)]">Starter Catalog</h3>
              </div>
              <span className="text-xs font-semibold text-[var(--muted-foreground)]">{availableCatalog.length} Available</span>
            </div>
            
            <div className="divide-y divide-[var(--border)]/50 max-h-[350px] overflow-y-auto">
              {availableCatalog.length === 0 ? (
                <EmptyState className="py-12">All starter eggs are installed.</EmptyState>
              ) : availableCatalog.map(item => (
                <div key={item.id} className="group flex flex-col gap-2 p-5 transition-colors hover:bg-[var(--secondary)]/10">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex flex-col min-w-0">
                      <p className="font-bold text-[var(--foreground)] truncate">{item.name}</p>
                      <p className="mt-0.5 text-[10px] font-bold uppercase tracking-widest text-[var(--primary)]">{item.category}</p>
                    </div>
                    <button 
                      className={cn(btn, 'shrink-0 gap-1.5 px-3 py-1.5 text-xs bg-[var(--secondary)] text-[var(--foreground)] hover:bg-[var(--primary)] hover:text-[var(--primary-foreground)] transition-colors')} 
                      disabled={busy} 
                      onClick={() => void onCatalogInstall(item.id)}
                    >
                      <Download size={13} /> Install
                    </button>
                  </div>
                  <p className="text-xs font-medium leading-relaxed text-[var(--muted-foreground)]/80 line-clamp-2">{item.description}</p>
                </div>
              ))}
            </div>
          </Panel>

          {/* Import Panel */}
          <Panel className="overflow-hidden border-[var(--border)]/60 bg-[var(--background)]/50 backdrop-blur-sm">
            <div className="flex items-center gap-3 border-b border-[var(--border)]/60 bg-[var(--secondary)]/10 px-6 py-4">
              <UploadCloud size={18} className="text-[var(--foreground)]" />
              <h3 className="text-sm font-bold tracking-wide text-[var(--foreground)]">Import Configuration</h3>
            </div>
            
            <div className="flex flex-col gap-6 p-6">
              
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
                  className="group flex min-h-[120px] cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-[var(--border)] bg-[var(--secondary)]/5 transition-all hover:border-[var(--primary)]/50 hover:bg-[var(--primary)]/5"
                >
                  <UploadCloud size={24} className="text-[var(--muted-foreground)] transition-colors group-hover:text-[var(--primary)]" />
                  <span className="font-semibold text-[var(--foreground)]">{eggFiles.length ? 'Select Different Files' : 'Upload JSON Files'}</span>
                  <span className="text-xs font-medium text-[var(--muted-foreground)]">Drag & drop or click to browse (Max 100)</span>
                </label>

                {eggFiles.length > 0 && (
                  <div className="flex flex-col overflow-hidden rounded-lg border border-[var(--border)]/60 bg-[var(--secondary)]/20 animate-in fade-in slide-in-from-top-2">
                    <div className="flex items-center justify-between border-b border-[var(--border)]/60 px-4 py-2.5 bg-[var(--secondary)]/40">
                      <span className="text-xs font-bold text-[var(--foreground)]">{eggFiles.length} File{eggFiles.length === 1 ? '' : 's'} Queued</span>
                      <button className="text-[var(--muted-foreground)] transition-colors hover:text-red-500" onClick={clearEggFiles} type="button" aria-label="Clear selected files">
                        <X size={14} />
                      </button>
                    </div>
                    <div className="flex max-h-32 flex-col gap-1 overflow-y-auto px-4 py-2">
                      {eggFiles.map((file, index) => (
                        <p key={`${file.name}-${index}`} className="truncate py-1 font-mono text-[11px] font-medium text-[var(--muted-foreground)] flex items-center gap-2">
                          <FileJson size={12} className="text-[var(--primary)] shrink-0"/> {file.name}
                        </p>
                      ))}
                    </div>
                  </div>
                )}

                <button 
                  className={cn(btn, 'w-full py-2.5 shadow-sm')} 
                  disabled={busy || eggFiles.length === 0} 
                  onClick={async () => {
                    if (await onImportFiles(eggFiles)) clearEggFiles();
                  }} 
                  type="button"
                >
                  Import {eggFiles.length || ''} File{eggFiles.length === 1 ? '' : 's'}
                </button>
              </div>

              <div className="flex items-center gap-4 text-[10px] font-bold uppercase tracking-widest text-[var(--muted-foreground)]/50">
                <span className="h-px flex-1 bg-[var(--border)]" />
                Raw JSON
                <span className="h-px flex-1 bg-[var(--border)]" />
              </div>

              {/* Raw JSON Input */}
              <div className="flex flex-col gap-3">
                <div className="relative group overflow-hidden rounded-xl border border-[var(--border)]/60 shadow-inner focus-within:border-[var(--primary)] focus-within:ring-1 focus-within:ring-[var(--primary)]/30 transition-all">
                  <FileJson className="absolute top-4 right-4 text-[var(--muted-foreground)] opacity-20 transition-opacity group-focus-within:opacity-100 group-focus-within:text-[var(--primary)]" size={20} />
                  <textarea 
                    className={cn(inp, "min-h-[250px] w-full resize-y border-none bg-[#0a0a0a] p-5 font-mono text-[11px] leading-relaxed text-emerald-400 focus:ring-0")} 
                    value={eggJson} 
                    onChange={e => setEggJson(e.target.value)} 
                    spellCheck={false}
                  />
                </div>
                <button 
                  className={cn(btn, "w-full py-2.5 bg-[var(--card)] text-[var(--foreground)] hover:bg-[var(--color-page)] hover:text-[var(--primary-foreground)]")} 
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
