import { useEffect, useState } from 'react';
import { AgentHealth } from '../lib/types';
import { requestJson } from '../lib/http';

export type LiveConnectionState = 'connecting' | 'live' | 'reconnecting';

let cachedAgents: AgentHealth[] = [];

export function useAgentHealth(apiBase: string) {
  const [agents, setAgents] = useState<AgentHealth[]>(cachedAgents);
  const [connection, setConnection] = useState<LiveConnectionState>('connecting');

  useEffect(() => {
    let closed = false;
    const accept = (rows: AgentHealth[]) => {
      if (closed || !Array.isArray(rows)) return;
      cachedAgents = rows;
      setAgents(rows);
    };

    void requestJson(apiBase, '/agents/stats', {})
      .then(accept)
      .catch(() => undefined);

    const source = new EventSource(`${apiBase || '/api'}/agents/stats/stream`);
    source.onopen = () => !closed && setConnection('live');
    source.addEventListener('snapshot', event => {
      try {
        accept(JSON.parse((event as MessageEvent).data));
        setConnection('live');
      } catch {
        // Ignore malformed telemetry snapshots and wait for the next one.
      }
    });
    source.onerror = () => {
      if (!closed) setConnection('reconnecting');
    };

    return () => {
      closed = true;
      source.close();
    };
  }, [apiBase]);

  return { agents, connection };
}
