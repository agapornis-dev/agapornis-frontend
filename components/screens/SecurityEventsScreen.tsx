import { useCrowdSecTelemetry } from '../../hooks/useCrowdSecTelemetry';
import { SecurityEventsPage } from '../admin/SecurityEventsPage';

export function SecurityEventsScreen({ apiBase, showToast }: { apiBase: string; showToast: (message: string, tone?: any) => void }) {
  const { nodes, connection } = useCrowdSecTelemetry(apiBase);
  return <SecurityEventsPage nodes={nodes} connection={connection} apiBase={apiBase} showToast={showToast} />;
}
