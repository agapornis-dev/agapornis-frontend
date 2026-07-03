import React, { useState } from 'react';
import { useLazyData } from '../../hooks/useLazyData';
import { PanelSettingsPage } from '../admin/PanelSettingsPage';
import { requestJson } from '../../lib/http';

export function SettingsScreen({ apiBase, showToast, updatePublicSettings }: { apiBase: string, showToast: any, updatePublicSettings: any }) {
  const { data: settings, loading, refresh } = useLazyData<any>(apiBase, '/settings', {}, null);
  const [busy, setBusy] = useState(false);

  const handleSave = async (formData: any) => {
    setBusy(true);
    try {
      const updated = await requestJson(apiBase, '/settings', {}, { method: 'PATCH', body: JSON.stringify(formData) });
      updatePublicSettings(updated); // Sync global app state
      showToast('Panel settings saved', 'success');
      refresh();
    } catch (e: any) { showToast(e.message, 'error'); } finally { setBusy(false); }
  };

  const handleTestEmail = async (email: string, smtp: any) => {
    setBusy(true);
    try {
      await requestJson(apiBase, '/settings/smtp/test', {}, { method: 'POST', body: JSON.stringify({ email, smtp }) });
      showToast(`Test email sent to ${email}`, 'success');
    } catch (e: any) { showToast(e.message, 'error'); } finally { setBusy(false); }
  };

  if (loading && !settings) return <div>Loading...</div>;

  return <PanelSettingsPage settings={settings} busy={busy || loading} onSave={handleSave} onTestEmail={handleTestEmail} />;
}
