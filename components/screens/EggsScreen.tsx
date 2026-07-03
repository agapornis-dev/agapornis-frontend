import React, { useState } from 'react';
import { useLazyData } from '../../hooks/useLazyData';
import { EggsPanel } from '../admin/EggsPage';
import { requestJson } from '../../lib/http';

interface EggsScreenProps {
  apiBase: string;
  showToast: (msg: string, type: 'success' | 'error') => void;
}

export function EggsScreen({ apiBase, showToast }: EggsScreenProps) {
  // Automatically fetches only when the user clicks the "Templates (Eggs)" tab
  const { data: eggs, loading, refresh } = useLazyData<any[]>(apiBase, '/eggs', {}, []);
  const { data: catalog, loading: catalogLoading, refresh: refreshCatalog } = useLazyData<any[]>(apiBase, '/eggs/catalog', {}, []);
  const { data: nests, loading: nestsLoading, refresh: refreshNests } = useLazyData<any[]>(apiBase, '/eggs/nests', {}, []);
  const [busy, setBusy] = useState(false);

  const handleImport = async (json: string) => {
    setBusy(true);
    try {
      await requestJson(apiBase, '/eggs/import', {}, { method: 'POST', body: json });
      showToast('Template (Egg) successfully imported', 'success');
      await Promise.all([refresh(), refreshCatalog(), refreshNests()]);
    } catch (e: any) {
      showToast(e.message, 'error');
    } finally { 
      setBusy(false); 
    }
  };

  const handleFileImport = async (files: File[]) => {
    setBusy(true);
    try {
      const parsed = [];
      for (const file of files) {
        try {
          parsed.push(JSON.parse(await file.text()));
        } catch {
          throw new Error(`${file.name} does not contain valid JSON`);
        }
      }

      const result = await requestJson(apiBase, '/eggs/import/batch', {}, {
        method: 'POST',
        body: JSON.stringify({ eggs: parsed })
      });
      showToast(`${result.imported} egg${result.imported === 1 ? '' : 's'} imported`, 'success');
      await Promise.all([refresh(), refreshCatalog(), refreshNests()]);
      return true;
    } catch (e: any) {
      showToast(e.message, 'error');
      return false;
    } finally {
      setBusy(false);
    }
  };

  const handleCatalogInstall = async (catalogId: string) => {
    setBusy(true);
    try {
      await requestJson(apiBase, `/eggs/catalog/${encodeURIComponent(catalogId)}/install`, {}, { method: 'POST' });
      showToast('Egg installed from the Pterodactyl catalog', 'success');
      await Promise.all([refresh(), refreshCatalog(), refreshNests()]);
    } catch (e: any) {
      showToast(e.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  const handleRemove = async (eggId: string) => {
    setBusy(true);
    try {
      await requestJson(apiBase, `/eggs/${encodeURIComponent(eggId)}`, {}, { method: 'DELETE' });
      showToast('Egg removed', 'success');
      await Promise.all([refresh(), refreshCatalog(), refreshNests()]);
    } catch (e: any) {
      showToast(e.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  const handleCreateNest = async (name: string) => {
    setBusy(true);
    try {
      await requestJson(apiBase, '/eggs/nests', {}, { method: 'POST', body: JSON.stringify({ name }) });
      showToast('Nest created', 'success');
      await refreshNests();
    } catch (e: any) { showToast(e.message, 'error'); } finally { setBusy(false); }
  };

  const handleAssignNest = async (eggId: string, nestId: string) => {
    setBusy(true);
    try {
      await requestJson(apiBase, `/eggs/${encodeURIComponent(eggId)}/nest`, {}, { method: 'PATCH', body: JSON.stringify({ nestId }) });
      await Promise.all([refresh(), refreshNests()]);
    } catch (e: any) { showToast(e.message, 'error'); } finally { setBusy(false); }
  };

  const handleRemoveNest = async (nestId: string) => {
    setBusy(true);
    try {
      await requestJson(apiBase, `/eggs/nests/${encodeURIComponent(nestId)}`, {}, { method: 'DELETE' });
      showToast('Nest removed; its eggs were moved to Uncategorized', 'success');
      await Promise.all([refresh(), refreshNests()]);
    } catch (e: any) { showToast(e.message, 'error'); } finally { setBusy(false); }
  };

  if (loading && !eggs?.length) return <div className="p-4 text-[var(--muted-foreground)]">Loading templates...</div>;

  return (
    <EggsPanel 
      eggs={eggs || []} 
      nests={nests || []}
      catalog={catalog || []}
      busy={busy || loading || catalogLoading || nestsLoading} 
      onImport={handleImport}
      onImportFiles={handleFileImport}
      onCatalogInstall={handleCatalogInstall}
      onRemove={handleRemove}
      onCreateNest={handleCreateNest}
      onAssignNest={handleAssignNest}
      onRemoveNest={handleRemoveNest}
    />
  );
}
