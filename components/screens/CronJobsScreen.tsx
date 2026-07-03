import React, { useEffect, useState } from 'react';
import { CronJobsPanel } from '../admin/CronJobsPage';
import { requestJson } from '../../lib/http';

export function CronJobsScreen({ apiBase, showToast }: { apiBase: string, showToast: any }) {
  const [data, setData] = useState({ jobs: [], servers: [], webhookTargets: [] });
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const fetchAll = async () => {
    const results = await Promise.all([
      requestJson(apiBase, '/cronjobs', {}).catch(() => []),
      requestJson(apiBase, '/servers', {}).catch(() => []),
      requestJson(apiBase, '/webhooks/targets', {}).catch(() => [])
    ]);
    setData({ jobs: results[0], servers: results[1], webhookTargets: results[2] });
    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, [apiBase]);

  const handleAction = async (action: () => Promise<void>, successMsg: string) => {
    setBusy(true);
    try {
      await action();
      showToast(successMsg, 'success');
      await fetchAll();
    } catch (e: any) { showToast(e.message, 'error'); } finally { setBusy(false); }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <CronJobsPanel
      jobs={data.jobs} servers={data.servers} webhookTargets={data.webhookTargets} busy={busy}
      onCreate={(formData) => handleAction(() => requestJson(apiBase, '/cronjobs', {}, { method: 'POST', body: JSON.stringify(formData) }), 'Cron job scheduled')}
      onRun={(id) => handleAction(() => requestJson(apiBase, `/cronjobs/${id}/run`, {}, { method: 'POST' }), 'Cron job execution triggered')}
      onDelete={(id) => handleAction(() => requestJson(apiBase, `/cronjobs/${id}`, {}, { method: 'DELETE' }), 'Cron job deleted')}
    />
  );
}