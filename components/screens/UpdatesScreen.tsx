import { useEffect, useState } from 'react';
import { requestJson } from '../../lib/http';
import { useConfirm } from '../feedback/FeedbackProvider';
import { UpdatesPage } from '../admin/UpdatesPage';

export function UpdatesScreen({ apiBase, showToast, canDeployPanel }: { apiBase: string; showToast: (message: string, type: 'success' | 'error') => void; canDeployPanel: boolean }) {
  const [updates, setUpdates] = useState<any>(null);
  const [panelUpdate, setPanelUpdate] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const confirm = useConfirm();

  const fetchUpdates = async () => {
    const [nextUpdates, nextPanelUpdate] = await Promise.all([
      requestJson(apiBase, '/agents/updates', {}).catch(() => null),
      requestJson(apiBase, '/system/updates', {}).catch(() => null)
    ]);
    setUpdates(nextUpdates);
    setPanelUpdate(nextPanelUpdate);
  };

  useEffect(() => { void fetchUpdates(); }, [apiBase]);

  const handleApplyUpdate = async (nodeId: string) => {
    setBusy(true);
    try {
      const result: any = await requestJson(apiBase, `/agents/${nodeId}/update`, {}, { method: 'POST', body: JSON.stringify({}) });
      showToast(result?.message || `Update staged for ${nodeId}`, 'success');
      await fetchUpdates();
    } catch (error: any) {
      showToast(error.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  const handleCheckPanelUpdate = async () => {
    setBusy(true);
    try {
      const result = await requestJson(apiBase, '/system/updates/check', {}, { method: 'POST' });
      setPanelUpdate(result);
      showToast('Release manifest refreshed', 'success');
    } catch (error: any) {
      showToast(error.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  const handleDeployPanelUpdate = async () => {
    const accepted = await confirm({
      title: 'Deploy panel update',
      description: 'Both API and frontend artifacts will be downloaded, checksum-verified, and handed to the configured deployment supervisor. Active requests may reconnect while replicas restart.',
      confirmLabel: 'Verify and deploy'
    });
    if (!accepted) return;
    setBusy(true);
    try {
      const result: any = await requestJson(apiBase, '/system/updates/deploy', {}, { method: 'POST' });
      showToast(result?.message || 'Panel update handed to the deployment supervisor', 'success');
      await fetchUpdates();
    } catch (error: any) {
      showToast(error.message, 'error');
      await fetchUpdates();
    } finally {
      setBusy(false);
    }
  };

  return <UpdatesPage updates={updates} panelUpdate={panelUpdate} busy={busy} canDeployPanel={canDeployPanel} onApplyUpdate={handleApplyUpdate} onCheckPanelUpdate={handleCheckPanelUpdate} onDeployPanelUpdate={handleDeployPanelUpdate} />;
}
