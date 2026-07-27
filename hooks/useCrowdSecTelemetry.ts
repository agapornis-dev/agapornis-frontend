import { useEffect, useState } from 'react';
import { CrowdSecNodeTelemetry } from '../lib/types';
import { requestJson } from '../lib/http';
import { LiveConnectionState } from './useAgentHealth';

let cachedNodes: CrowdSecNodeTelemetry[] = [];

export function useCrowdSecTelemetry(apiBase: string) {
  const [nodes, setNodes] = useState<CrowdSecNodeTelemetry[]>(cachedNodes);
  const [connection, setConnection] = useState<LiveConnectionState>('connecting');

  useEffect(() => {
    let closed = false;
    const accept = (rows: CrowdSecNodeTelemetry[]) => {
      if (closed || !Array.isArray(rows)) return;
      cachedNodes = rows;
      setNodes(rows);
    };

    void requestJson(apiBase, '/agents/crowdsec', {})
      .then(accept)
      .catch(() => undefined);

    const source = new EventSource(`${apiBase || '/api'}/agents/crowdsec/stream`);
    source.onopen = () => !closed && setConnection('live');
    source.addEventListener('snapshot', event => {
      try {
        accept(JSON.parse((event as MessageEvent).data));
        setConnection('live');
      } catch {
        // Wait for the next valid snapshot.
      }
    });
    source.onerror = () => !closed && setConnection('reconnecting');

    return () => {
      closed = true;
      source.close();
    };
  }, [apiBase]);

  return { nodes, connection };
}
