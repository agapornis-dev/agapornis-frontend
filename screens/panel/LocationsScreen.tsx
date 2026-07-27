import { useState } from 'react';
import { MapPin, Plus, Trash2, Globe2, Edit2, Save, X, AlertCircle } from 'lucide-react';
import { useLazyData } from '../../hooks/useLazyData';
import { requestJson } from '../../lib/http';
import { btn, inp } from '../../lib/constants';
import { EmptyState, PageHeader, Panel, PanelTitleBar, cn, formControlClass } from '../../components/ui';
import { useConfirm } from '../../components/feedback/FeedbackProvider';

interface Location {
  id: string;
  name: string;
  description?: string;
  nodeCount: number;
}

const normalizedLocationId = (value: string) =>
  value.trim().toLocaleLowerCase().replace(/[^a-z0-9_-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 64);

export function LocationsScreen({ apiBase, showToast }: { apiBase: string; showToast: (message: string, type: 'success' | 'error') => void }) {
  const { data: locations, loading, refresh } = useLazyData<Location[]>(apiBase, '/locations', {}, []);
  
  // Creation form state
  const [form, setForm] = useState({ id: '', name: '', description: '' });
  
  // Inline editing state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ id: '', name: '', description: '' });
  
  const [busy, setBusy] = useState(false);
  const confirm = useConfirm();

  // Collision check for creation only
  const isCreateIdInUse = locations.some(loc => loc.id === normalizedLocationId(form.id));
  const isEditIdInUse = editingId !== null && locations.some(
    loc => loc.id !== editingId && loc.id === normalizedLocationId(editForm.id)
  );

  const create = async () => {
    setBusy(true);
    try {
      await requestJson(apiBase, '/locations', {}, { method: 'POST', body: JSON.stringify(form) });
      setForm({ id: '', name: '', description: '' });
      await refresh();
      showToast('Location created', 'success');
    } catch (error: any) { 
      showToast(error.message, 'error'); 
    } finally { 
      setBusy(false); 
    }
  };

  const update = async (id: string) => {
    setBusy(true);
    try {
      await requestJson(apiBase, `/locations/${encodeURIComponent(id)}`, {}, { 
        method: 'PATCH', 
        body: JSON.stringify(editForm) 
      });
      await refresh();
      setEditingId(null);
      showToast('Location updated', 'success');
    } catch (error: any) {
      showToast(error.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id: string) => {
    const location = locations.find(candidate => candidate.id === id);
    if (location?.nodeCount) {
      showToast(`Move all ${location.nodeCount} node${location.nodeCount === 1 ? '' : 's'} out of this location before deleting it`, 'error');
      return;
    }
    if (!await confirm({ 
      title: 'Delete this location?', 
      description: 'Locations that still contain nodes cannot be deleted.', 
      confirmLabel: 'Delete location', 
      tone: 'danger' 
    })) return;
    
    setBusy(true);
    try { 
      await requestJson(apiBase, `/locations/${encodeURIComponent(id)}`, {}, { method: 'DELETE', body: JSON.stringify({}) }); 
      await refresh(); 
      showToast('Location deleted', 'success'); 
    } catch (error: any) { 
      showToast(error.message, 'error'); 
    } finally { 
      setBusy(false); 
    }
  };

  const customInputStyle = formControlClass();

  return (
    <div className="mx-auto max-w-[1200px] grid gap-10 pb-12">
      
      <PageHeader
        title="Locations"
        description="Group nodes by datacenter or region and describe where workloads will run."
        className="border-b-0 pb-0"
      />

      {/* Creation Panel */}
      <Panel className="overflow-hidden border-[var(--border)]/60 bg-[var(--background)]/50 backdrop-blur-sm">
        <PanelTitleBar icon={<Globe2 size={18} className="text-[var(--primary)]" />} title="Register New Location" />
        
        <form 
          className="p-6 grid gap-6" 
          onSubmit={e => { e.preventDefault(); void create(); }}
        >
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 items-start">
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-xs font-semibold text-[var(--muted-foreground)]">Short Code (ID)</label>
                {isCreateIdInUse && (
                  <span className="text-[11px] font-bold text-red-500 flex items-center gap-1 uppercase tracking-wide">
                    <AlertCircle size={12} /> In Use
                  </span>
                )}
              </div>
              <input 
                className={cn(inp, customInputStyle, "font-mono", isCreateIdInUse && "border-red-500/50 focus:border-red-500 focus:ring-red-500/20")} 
                placeholder="fra-1" 
                value={form.id} 
                onChange={e => setForm({ ...form, id: e.target.value })} 
                required
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-xs font-semibold text-[var(--muted-foreground)]">Location Name</label>
              <input 
                className={cn(inp, customInputStyle)} 
                placeholder="Frankfurt" 
                value={form.name} 
                onChange={e => setForm({ ...form, name: e.target.value })} 
                required
              />
            </div>
            
            <div className="space-y-2 md:col-span-2 lg:col-span-1">
              <label className="text-xs font-semibold text-[var(--muted-foreground)]">Description (Optional)</label>
              <input 
                className={cn(inp, customInputStyle)} 
                placeholder="Primary EU datacenter" 
                value={form.description} 
                onChange={e => setForm({ ...form, description: e.target.value })} 
              />
            </div>
          </div>

          <div className="flex justify-end pt-2 border-t border-[var(--border)]/50 mt-2">
            <button 
              type="submit"
              className={cn(btn, "group relative flex items-center gap-2 rounded-lg bg-[var(--foreground)] px-6 py-2.5 text-sm font-bold text-[var(--background)] transition-all hover:bg-[var(--foreground)]/90 disabled:opacity-50")} 
              disabled={busy || !form.name.trim() || !form.id.trim() || isCreateIdInUse}
            >
              <Plus size={16} className="transition-transform group-hover:scale-110" />
              Add Location
            </button>
          </div>
        </form>
      </Panel>

      {/* Locations List */}
      <div className="flex flex-col gap-4">
        <h3 className="text-sm font-bold tracking-wide text-[var(--foreground)] px-1 flex justify-between">
          <span>Active Locations</span>
          {!loading && <span className="text-[var(--muted-foreground)]">{locations.length} Zone{locations.length === 1 ? '' : 's'}</span>}
        </h3>

        {loading && !locations.length ? (
          <p className="text-sm font-medium text-[var(--muted-foreground)] px-1 animate-pulse">Loading locations…</p>
        ) : locations.length === 0 ? (
          <Panel className="border-[var(--border)]/60 bg-[var(--background)]/50 backdrop-blur-sm">
            <EmptyState className="py-16">No locations configured.</EmptyState>
          </Panel>
        ) : (
          <div className="flex flex-col gap-4">
            {locations.map(location => {
              const isEditing = editingId === location.id;
              const hasNodes = location.nodeCount > 0;

              return (
                <Panel 
                  key={location.id} 
                  className={cn(
                    "group flex flex-col justify-between overflow-hidden border-[var(--border)]/60 bg-[var(--background)]/50 backdrop-blur-sm transition-all p-6",
                    !isEditing && "hover:border-[var(--border)] hover:bg-[var(--secondary)]/5"
                  )}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-4 w-full">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[var(--secondary)]/30 ring-1 ring-[var(--border)] transition-colors group-hover:ring-[var(--primary)]/50">
                        <MapPin size={20} className="text-[var(--primary)]" />
                      </div>
                      
                      <div className="flex flex-col w-full pr-2 gap-1">
                        {isEditing ? (
                          <>
                            <div className="flex items-center gap-2">
                              <input
                                className={cn(inp, customInputStyle, "h-8 max-w-[160px] px-2 font-mono text-xs", isEditIdInUse && "border-red-500/50")}
                                value={editForm.id}
                                onChange={e => setEditForm({ ...editForm, id: e.target.value })}
                                placeholder="Location ID"
                                disabled={hasNodes}
                                title={hasNodes ? 'Move all nodes out of this location before changing its ID' : undefined}
                              />
                              {isEditIdInUse && <span className="text-[10px] font-bold uppercase text-red-500">In use</span>}
                            </div>
                            <input 
                              className={cn(inp, customInputStyle, "h-8 px-2 text-sm font-bold max-w-sm")} 
                              value={editForm.name} 
                              onChange={e => setEditForm({ ...editForm, name: e.target.value })} 
                              placeholder="Location Name"
                              autoFocus
                            />
                            {editForm.id !== location.id && <p className="px-1 text-[10px] text-amber-400">ID changes are allowed only while no nodes use this location.</p>}
                          </>
                        ) : (
                          <>
                            <h3 className="text-lg font-bold text-[var(--foreground)] tracking-tight truncate">{location.name}</h3>
                            <div className="flex items-center gap-2 text-xs text-[var(--muted-foreground)]">
                              <span className="font-mono">{location.id}</span>
                              <span aria-hidden="true">·</span>
                              <span>{location.nodeCount} node{location.nodeCount === 1 ? '' : 's'}</span>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex shrink-0 gap-1">
                      {isEditing ? (
                        <>
                          <button 
                            className="flex items-center justify-center rounded-lg p-2 text-green-500 transition-all hover:bg-green-500/10 focus:outline-none disabled:opacity-50 disabled:hover:bg-transparent" 
                            disabled={busy || !editForm.name.trim() || !editForm.id.trim() || isEditIdInUse}
                            onClick={() => void update(location.id)} 
                            title="Save Changes"
                          >
                            <Save size={16} />
                          </button>
                          <button 
                            className="flex items-center justify-center rounded-lg p-2 text-[var(--muted-foreground)] transition-all hover:bg-[var(--secondary)]/20 focus:outline-none" 
                            disabled={busy} 
                            onClick={() => setEditingId(null)} 
                            title="Cancel"
                          >
                            <X size={16} />
                          </button>
                        </>
                      ) : (
                        <>
                          <button 
                            className="group/edit flex items-center justify-center rounded-lg border border-transparent p-2 text-[var(--muted-foreground)] transition-all hover:border-[var(--primary)]/20 hover:bg-[var(--primary)]/10 hover:text-[var(--primary)] focus:outline-none" 
                            disabled={busy} 
                            onClick={() => {
                              setEditingId(location.id);
                              setEditForm({ id: location.id, name: location.name, description: location.description || '' });
                            }} 
                            title="Edit Location"
                          >
                            <Edit2 size={16} className="transition-transform group-hover/edit:scale-110" />
                          </button>
                          <button 
                            className="group/remove flex items-center justify-center rounded-lg border border-transparent p-2 text-[var(--muted-foreground)] transition-all hover:border-red-500/20 hover:bg-red-500/10 hover:text-red-500 focus:outline-none" 
                            disabled={busy || hasNodes} 
                            onClick={() => void remove(location.id)} 
                            title={hasNodes ? `Cannot delete: ${location.nodeCount} connected node${location.nodeCount === 1 ? '' : 's'}` : 'Delete Location'}
                          >
                            <Trash2 size={16} className="transition-transform group-hover/remove:scale-110" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                  
                  <div className="mt-5 border-t border-[var(--border)]/30 pt-4">
                    {isEditing ? (
                      <input 
                        className={cn(inp, customInputStyle, "w-full h-8 px-2 text-sm")} 
                        value={editForm.description} 
                        onChange={e => setEditForm({ ...editForm, description: e.target.value })} 
                        placeholder="Location description..."
                      />
                    ) : (
                      <p className="text-sm text-[var(--muted-foreground)] leading-relaxed">
                        {location.description || 'No description provided.'}
                      </p>
                    )}
                  </div>
                </Panel>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
