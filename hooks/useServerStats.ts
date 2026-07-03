import { useEffect, useState } from 'react';
import { MetricsPoint, ServerRecord } from '../lib/types';
import { normalizeMetrics } from '../lib/utils';
import { agentServerPath } from '../lib/http';

const STREAM_ACTIVATION_DELAY_MS = 150;

export function useServerStats({
  apiBase,
  server,
  onStatus
}: {
  apiBase: string;
  server: ServerRecord | null;
  onStatus: (serverId: string, status: string) => void;
}) {
  const [metrics, setMetrics] = useState<MetricsPoint[]>([]);
  const [connection, setConnection] = useState<'connecting' | 'live' | 'reconnecting'>('connecting');

  useEffect(() => {
    setMetrics([]);
  }, [server?.id, server?.nodeId]);

  useEffect(() => {
    if (!server) return;

    let closed = false;
    setConnection('connecting');
    let source: EventSource | undefined;
    const activationTimer = window.setTimeout(() => {
      if (closed) return;
      source = new EventSource(`${apiBase || '/api'}` + agentServerPath(server, '/stats/stream'));
      source.onopen = () => !closed && setConnection('live');
      source.addEventListener('stats', event => {
        try {
          const message = JSON.parse((event as MessageEvent).data);
          if (message.type !== 'stats' || closed) return;
          const point = normalizeMetrics(message.data || message);
          setMetrics(points => [...points.slice(-29), point]);
          if (point.status) onStatus(server.id, point.status);
        } catch {
          // Ignore malformed telemetry events.
        }
      });
      source.onerror = () => {
        if (!closed) setConnection('reconnecting');
      };
    }, STREAM_ACTIVATION_DELAY_MS);

    return () => {
      closed = true;
      window.clearTimeout(activationTimer);
      source?.close();
    };
  }, [apiBase, onStatus, server?.id, server?.nodeId]);

  return { metrics, connection, resetMetrics: () => setMetrics([]) };
}
