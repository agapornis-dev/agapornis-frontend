import React, { useEffect, useState } from 'react';
import { WebhooksPanel } from '../admin/WebhooksPage';
import { requestJson } from '../../lib/http';

export function WebhooksScreen({ apiBase, showToast }: { apiBase: string, showToast: any }) {
  const [data, setData] = useState({ targets: [], events: [], plans: [], eggs: [], agents: [] });
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const fetchAll = async () => {
    const results = await Promise.all([
      requestJson(apiBase, '/webhooks/targets', {}).catch(() => []),
      requestJson(apiBase, '/webhooks/events', {}).catch(() => []),
      requestJson(apiBase, '/server-plans', {}).catch(() => []),
      requestJson(apiBase, '/eggs', {}).catch(() => []),
      requestJson(apiBase, '/agents', {}).catch(() => [])
    ]);
    setData({ targets: results[0], events: results[1], plans: results[2], eggs: results[3], agents: results[4] });
    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, [apiBase]);

  const handleAction = async (action: () => Promise<void>, successMsg: string) => {
    setBusy(true);
    try {
      await action();
      showToast(successMsg, 'success');
      await fetchAll();
    } catch (e: any) {
      showToast(e.message, 'error');
    } finally { setBusy(false); }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <WebhooksPanel
      apiBase={apiBase}
      targets={data.targets} events={data.events} plans={data.plans} eggs={data.eggs} agents={data.agents}
      busy={busy}
      onCreate={(formData) => handleAction(() => requestJson(apiBase, '/webhooks/targets', {}, { method: 'POST', body: JSON.stringify(formData) }), 'Webhook target added')}
      onDelete={(id) => handleAction(() => requestJson(apiBase, `/webhooks/targets/${id}`, {}, { method: 'DELETE' }), 'Webhook target deleted')}
      onTest={(id) => handleAction(() => requestJson(apiBase, `/webhooks/test/${id}`, {}, { method: 'POST', body: JSON.stringify({ ok: true }) }), 'Test payload sent')}
      onCreatePlan={(formData) => handleAction(() => requestJson(apiBase, '/server-plans', {}, { method: 'POST', body: JSON.stringify(formData) }), 'Server plan created')}
      onUpdatePlan={(id, formData) => handleAction(() => requestJson(apiBase, `/server-plans/${id}`, {}, { method: 'PATCH', body: JSON.stringify(formData) }), 'Server plan updated')}
      onDeletePlan={(id) => handleAction(() => requestJson(apiBase, `/server-plans/${id}`, {}, { method: 'DELETE' }), 'Server plan deleted')}
    />
  );
}