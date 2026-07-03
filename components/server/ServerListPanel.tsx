import { useMemo, useState } from 'react';
import { Search, X, ChevronDown, ChevronRight } from 'lucide-react';
import { ServerRecord, User } from '../../lib/types';
import { serverConnectAddress } from '../../lib/utils';
import { Panel, PanelHeader, EmptyState, cn } from '../ui';
import { ServerItem } from './ServerComponents';

type StatusFilter = 'all' | 'running' | 'stopped';
type OwnershipFilter = 'all' | 'mine' | 'customers';

type Props = {
  servers: ServerRecord[];
  agents: any[];
  selectedServerId?: string;
  isStaff: boolean;
  canManage: boolean;
  currentUserId: string;
  users: User[];
  onSelect: (server: ServerRecord) => void;
};

export function ServerListPanel({
  servers,
  agents,
  selectedServerId,
  isStaff,
  canManage,
  currentUserId,
  users,
  onSelect,
}: Props) {
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [groupByNode, setGroupByNode] = useState(false);
  const [ownershipFilter, setOwnershipFilter] = useState<OwnershipFilter>('all');
  const [collapsedNodes, setCollapsedNodes] = useState<Set<string>>(new Set());

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    return servers.filter((s) => {
      const owner = users.find((user) => user.id === s.ownerUserId);
      const matchesQuery =
        !q ||
        (s.name || '').toLowerCase().includes(q) ||
        s.id.toLowerCase().includes(q) ||
        (owner?.name || '').toLowerCase().includes(q) ||
        (owner?.email || '').toLowerCase().includes(q);

      const status = (s.status || '').toLowerCase();
      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'running' && status === 'running') ||
        (statusFilter === 'stopped' && status !== 'running');

      const matchesOwner =
        ownershipFilter === 'all' ||
        (ownershipFilter === 'mine' && s.ownerUserId === currentUserId) ||
        (ownershipFilter === 'customers' && s.ownerUserId !== currentUserId);
      return matchesQuery && matchesStatus && matchesOwner;
    });
  }, [servers, users, query, statusFilter, ownershipFilter, currentUserId]);

  const ownerLabel = (server: ServerRecord) => {
    if (!canManage) {
      if (server.access?.relationship === 'owner') return 'Your server';
      if (server.access?.relationship === 'collaborator') {
        return server.access.permission === 'operator' ? 'Shared with you · can make changes' : 'Shared with you · read only';
      }
      return server.access?.canWrite ? 'Staff access' : 'Staff access · read only';
    }
    const owner = users.find((user) => user.id === server.ownerUserId);
    return server.ownerUserId === currentUserId
      ? 'You'
      : owner?.name || owner?.email || server.ownerUserId || 'Unassigned';
  };

  const grouped = useMemo(() => {
    if (!groupByNode) return null;
    const map = new Map<string, { nodeName: string; servers: ServerRecord[] }>();
    for (const server of filtered) {
      const agent = agents.find((a) => a.id === server.nodeId);
      const nodeName = agent?.name || server.nodeId || 'Unknown node';
      if (!map.has(server.nodeId)) {
        map.set(server.nodeId, { nodeName, servers: [] });
      }
      map.get(server.nodeId)!.servers.push(server);
    }
    return Array.from(map.entries());
  }, [filtered, agents, groupByNode]);

  const toggleNode = (nodeId: string) => {
    setCollapsedNodes((prev) => {
      const next = new Set(prev);
      next.has(nodeId) ? next.delete(nodeId) : next.add(nodeId);
      return next;
    });
  };

  const runningCount = servers.filter((s) => (s.status || '').toLowerCase() === 'running').length;
  const stoppedCount = servers.length - runningCount;

  const inputClass =
    'w-full pl-10 pr-10 py-2 text-sm rounded-lg bg-[var(--secondary)]/10 border border-[var(--border)]/60 text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)]/30 font-medium transition-all';

  return (
    <Panel className="xl:sticky xl:top-0 flex flex-col h-full border-[var(--border)]/60 bg-[var(--background)]/50 backdrop-blur-sm">
      <PanelHeader
        title={isStaff ? 'All servers' : 'Your servers'}
        aside={`${filtered.length}${filtered.length !== servers.length ? `/${servers.length}` : ''}`}
      />

      <div className="px-3 pt-3 pb-2 flex flex-col gap-2 border-b border-[var(--border)]/50">
        <div className="relative">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)] pointer-events-none"
          />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name or ID…"
            className={inputClass}
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Full‑width ownership filter */}
        {canManage && (
          <div className="grid grid-cols-3 rounded-md border border-[var(--border)]/60 bg-[var(--secondary)]/10 p-1">
            {(['all', 'mine', 'customers'] as OwnershipFilter[]).map((filter) => (
              <button
                key={filter}
                onClick={() => setOwnershipFilter(filter)}
                className={cn(
                  'rounded px-3 py-1.5 text-xs font-medium capitalize transition-all',
                  ownershipFilter === filter
                    ? 'bg-[var(--primary)]/15 text-[var(--primary)] shadow-sm'
                    : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--secondary)]/40',
                )}
              >
                {filter}
              </button>
            ))}
          </div>
        )}

        {/* Full‑width status filter */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex flex-1 gap-1">
            {(['all', 'running', 'stopped'] as StatusFilter[]).map((f) => {
              const count = f === 'all' ? servers.length : f === 'running' ? runningCount : stoppedCount;
              return (
                <button
                  key={f}
                  onClick={() => setStatusFilter(f)}
                  className={cn(
                    'flex-1 px-3 py-1.5 rounded-md text-xs font-medium capitalize transition-all',
                    statusFilter === f
                      ? f === 'running'
                        ? 'bg-[var(--success)]/15 text-[var(--success)] border border-[var(--success)]/30'
                        : f === 'stopped'
                        ? 'bg-[var(--destructive)]/15 text-[var(--destructive)] border border-[var(--destructive)]/30'
                        : 'bg-[var(--primary)]/15 text-[var(--primary)] border border-[var(--primary)]/30'
                      : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--secondary)]/40',
                  )}
                >
                  {f} <span className="opacity-60">{count}</span>
                </button>
              );
            })}
          </div>

          {agents.length > 1 && (
            <button
              onClick={() => setGroupByNode((v) => !v)}
              className={cn(
                'px-3 py-1.5 rounded-md text-xs font-medium transition-all',
                groupByNode
                  ? 'bg-[var(--primary)]/15 text-[var(--primary)] border border-[var(--primary)]/30'
                  : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--secondary)]/40',
              )}
            >
              By node
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto p-3">
        {filtered.length === 0 ? (
          <EmptyState className="py-8">
            {query || statusFilter !== 'all' ? 'No servers match your filters.' : 'No servers assigned yet.'}
          </EmptyState>
        ) : groupByNode && grouped ? (
          <div className="flex flex-col gap-3">
            {grouped.map(([nodeId, { nodeName, servers: nodeServers }]) => {
              const isCollapsed = collapsedNodes.has(nodeId);
              return (
                <div key={nodeId} className="flex flex-col gap-1">
                  <button
                    onClick={() => toggleNode(nodeId)}
                    className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-[var(--secondary)]/20 transition-colors text-left w-full group"
                  >
                    <span className="text-xs font-bold uppercase tracking-wider text-[var(--muted-foreground)] group-hover:text-[var(--foreground)] truncate">
                      {nodeName}
                    </span>
                    <div className="flex items-center gap-2 shrink-0 ml-2">
                      <span className="text-xs text-[var(--muted-foreground)]">{nodeServers.length}</span>
                      {isCollapsed ? (
                        <ChevronRight size={14} className="text-[var(--muted-foreground)]" />
                      ) : (
                        <ChevronDown size={14} className="text-[var(--muted-foreground)]" />
                      )}
                    </div>
                  </button>
                  {!isCollapsed && (
                    <div className="flex flex-col gap-1.5 pl-2">
                      {nodeServers.map((s) => (
                        <ServerItem
                          key={s.id}
                          server={s}
                          selected={selectedServerId === s.id}
                          connectAddress={serverConnectAddress(s, agents)}
                          ownerLabel={ownerLabel(s)}
                          onSelect={() => onSelect(s)}
                        />
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {filtered.map((s) => (
              <ServerItem
                key={s.id}
                server={s}
                selected={selectedServerId === s.id}
                connectAddress={serverConnectAddress(s, agents)}
                ownerLabel={ownerLabel(s)}
                onSelect={() => onSelect(s)}
              />
            ))}
          </div>
        )}
      </div>
    </Panel>
  );
}
