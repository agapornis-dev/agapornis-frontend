import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { ChevronLeft } from 'lucide-react';
import { Panel, PanelHeader, EmptyState, cn } from '../ui';
import { requestJson } from '../../lib/http';
import { serverConnectAddress } from '../../lib/utils';
import { ServerRecord, Session, User } from '../../lib/types';

// Custom Hooks
import { useServerConsole } from '../../hooks/useServerConsole';
import { useServerStats } from '../../hooks/useServerStats';

// Sub-components
import { ServerItem, ServerDetail } from '../server/ServerComponents';
import { ServerFiles } from '../server/ServerFiles';
import { ServerVariables } from '../server/ServerVariables';
import { ServerWebhooks } from '../server/ServerWebhooks';
import { ServerDatabases } from '../server/ServerDatabases';
import { ServerBackups } from '../server/ServerBackups';
import { ServerSchedules } from '../server/ServerSchedules';
import { ServerActivity } from '../server/ServerActivity';
import { ServerListPanel } from '../server/ServerListPanel';
import { ServerCollaborators } from '../server/ServerCollaborators';
import { ServerMods } from '../server/ServerMods';
import { useConfirm } from '../feedback/FeedbackProvider';

interface ServersScreenProps {
  apiBase: string;
  showToast: (msg: string, type: 'success' | 'error') => void;
  session: Session;
  initialServerId?: string;
}

export function ServersScreen({ apiBase, showToast, session, initialServerId }: ServersScreenProps) {
  const confirm = useConfirm();
  const [servers, setServers] = useState<ServerRecord[]>([]);
  const [agents, setAgents] = useState<any[]>([]);
  const [eggs, setEggs] = useState<any[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [selectedServer, setSelectedServer] = useState<ServerRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const openedInitialServer = useRef('');

  const authHeaders = useMemo(() => ({}), []);
  const isStaff = ['owner', 'admin', 'support'].includes(session.user.role || '');
  const canManage = ['owner', 'admin'].includes(session.user.role || '');

  // -- Data Fetching --
  const fetchInitialData = useCallback(async () => {
    try {
      const [fetchedServers, fetchedAgents, fetchedEggs, fetchedUsers] = await Promise.all([
        requestJson(apiBase, '/servers', authHeaders).catch(() => []),
        isStaff ? requestJson(apiBase, canManage ? '/agents' : '/agents/placement', authHeaders).catch(() => []) : Promise.resolve([]),
        requestJson(apiBase, '/eggs', authHeaders).catch(() => []),
        canManage ? requestJson(apiBase, '/auth/users', authHeaders).catch(() => []) : Promise.resolve([])
      ]);
      setServers(fetchedServers);
      setAgents(fetchedAgents);
      setEggs(fetchedEggs);
      setUsers(fetchedUsers);
    } catch (e: any) {
      showToast('Failed to load servers', 'error');
    } finally {
      setLoading(false);
    }
  }, [apiBase, isStaff, canManage, authHeaders, showToast]);

  useEffect(() => {
    fetchInitialData();
  }, [fetchInitialData]);

  // -- Real-time Hooks --
  const { consoleEmitter, consoleHistory, connectConsole, stopConsole } = useServerConsole(apiBase, authHeaders);

  const updateServerStatus = useCallback((serverId: string, status: string) => {
    setServers(current => current.map(server => server.id === serverId ? { ...server, status } : server));
    setSelectedServer(current => current?.id === serverId ? { ...current, status } : current);
  }, []);

  const { metrics, resetMetrics } = useServerStats({
    apiBase,
    server: selectedServer,
    onStatus: updateServerStatus
  });

  // Clean up console on unmount
  useEffect(() => {
    return stopConsole;
  }, [stopConsole]);

  // -- Handlers --
  const runAction = async (action: () => Promise<string | void>) => {
    setBusy(true);
    try {
      const msg = await action();
      if (msg) showToast(msg, 'success');
    } catch (e: any) {
      showToast(e.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  const selectServer = (server: ServerRecord) => {
    setSelectedServer(server);
    resetMetrics();
    const canViewConsole = server.access?.relationship !== 'collaborator' || server.access?.permission === 'operator' || server.access?.permissions?.includes('console.view');
    if (canViewConsole) connectConsole(server);
    else stopConsole();
  };

  useEffect(() => {
    if (!initialServerId || openedInitialServer.current === initialServerId || servers.length === 0) return;
    const server = servers.find(candidate => candidate.id === initialServerId);
    openedInitialServer.current = initialServerId;
    if (server) selectServer(server);
    else showToast('The requested server could not be found', 'error');
  }, [initialServerId, servers]);

  const handleServerAction = (server: ServerRecord, action: 'start' | 'restart' | 'stop') => {
    runAction(async () => {
      await requestJson(
        apiBase,
        `/agents/${server.nodeId}/servers/${server.id}/${action}`,
        authHeaders,
        {
          method: 'POST',
          body: JSON.stringify({}),
        }
      );
      updateServerStatus(server.id, action === 'stop' ? 'stopped' : 'running');
      if (action !== 'stop' && (server.access?.relationship !== 'collaborator' || server.access?.permission === 'operator' || server.access?.permissions?.includes('console.view'))) connectConsole(server);
      return `Command '${action}' sent to ${server.name || server.id}`;
    });
  };

  const deleteServer = async (server: ServerRecord) => {
    if (!await confirm({
      title: 'Delete this server?',
      description: `${server.name || server.id} and its server files will be permanently removed. This cannot be undone.`,
      confirmLabel: 'Delete server',
      tone: 'danger'
    })) return;
    runAction(async () => {
      await requestJson(apiBase, `/agents/${server.nodeId}/servers/${server.id}`, authHeaders, { method: 'DELETE', body: JSON.stringify({}) });
      setSelectedServer(null);
      resetMetrics();
      stopConsole();
      fetchInitialData();
      return `Deleted server ${server.name || server.id}`;
    });
  };

  const handleSendCommand = async (command: string) => {
    if (!selectedServer) return;
    const normalizedCommand = command.replace(/^\/+/, '');
    await requestJson(apiBase, `/agents/${selectedServer.nodeId}/servers/${selectedServer.id}/command`, authHeaders, {
      method: 'POST',
      body: JSON.stringify({ command: normalizedCommand }),
    });
  };

 const saveServerSettings = async (server: ServerRecord, settings: any) => {
    await runAction(async () => {
      const updated = await requestJson(apiBase, `/agents/${server.nodeId}/servers/${server.id}/settings`, authHeaders, {
        method: 'PATCH', body: JSON.stringify(settings)
      });
      const withAccess = { ...updated, access: updated.access || server.access };
      setServers(current => current.map(item => item.id === server.id ? withAccess : item));
      setSelectedServer(withAccess);
      return 'Server settings saved successfully';
    });
  };

  const changeServerEgg = async (server: ServerRecord, settings: any) => {
    await runAction(async () => {
      await requestJson(apiBase, `/agents/${server.nodeId}/servers/${server.id}/egg`, authHeaders, {
        method: 'POST', body: JSON.stringify(settings)
      });
      const updated = await requestJson(apiBase, `/servers/${server.id}`, authHeaders);
      setServers(current => current.map(item => item.id === server.id ? updated : item));
      setSelectedServer(updated);
      resetMetrics();
      stopConsole();
      return 'Egg changed and server reinstalling';
    });
  };

  const installServerVersion = async (server: ServerRecord, settings: any) => {
    await runAction(async () => {
      const result = await requestJson(apiBase, `/agents/${server.nodeId}/servers/${server.id}/version-install`, authHeaders, {
        method: 'POST', body: JSON.stringify(settings)
      });
      const updated = await requestJson(apiBase, `/servers/${server.id}`, authHeaders);
      setServers(current => current.map(item => item.id === server.id ? updated : item));
      setSelectedServer(updated);
      return `${result.provider} ${result.version}${result.build ? ` build ${result.build}` : ''} installed without replacing server files`;
    });
  };

  if (loading) return <div className="p-4 text-[var(--muted-foreground)]">Loading servers...</div>;

  return (
    <div className={cn('grid h-full w-full items-stretch gap-2', canManage ? 'xl:grid-cols-[380px_1fr]' : 'xl:grid-cols-[320px_1fr]')}>
      {/* Master View: Server List */}
        <div className={cn("w-full transition-all", selectedServer ? "hidden xl:block" : "block")}>
        <ServerListPanel 
            servers={servers}
            agents={agents}
            selectedServerId={selectedServer?.id}
            isStaff={isStaff}
            canManage={canManage}
            currentUserId={session.user.id}
            users={users}
            onSelect={selectServer}
        />
        </div>

      {/* Detail View: Console & Settings */}
      <div className={cn("w-full min-w-0 transition-all", !selectedServer ? "hidden xl:flex" : "block")}>
        {selectedServer ? (
          <div className="flex flex-col w-full min-w-0">
            <button 
              className="xl:hidden flex items-center gap-2 mb-4 text-sm font-medium text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors w-fit"
              onClick={() => { setSelectedServer(null); stopConsole(); }}
            >
              <ChevronLeft size={18} />
              Back to server list
            </button>

            <ServerDetail
              server={selectedServer}
              emitter={consoleEmitter}
              consoleHistory={consoleHistory}
              metrics={metrics}
              busy={busy}
              canDelete={canManage}
              canOperate={selectedServer.access?.canWrite ?? (canManage || selectedServer.ownerUserId === session.user.id)}
              supportMode={session.user.role === 'support'}
              connectAddress={serverConnectAddress(selectedServer, agents)}
              filesView={<ServerFiles server={selectedServer} apiBase={apiBase} authHeaders={authHeaders} readOnly={selectedServer.access?.relationship === 'collaborator' && !selectedServer.access?.permissions?.includes('files.write') && selectedServer.access?.permission !== 'operator'} />}
              modsView={isMinecraftJavaServer(selectedServer, eggs) ? (
                <ServerMods
                  server={selectedServer}
                  apiBase={apiBase}
                  authHeaders={authHeaders}
                  readOnly={selectedServer.access?.relationship === 'collaborator' && !selectedServer.access?.permissions?.includes('files.write') && selectedServer.access?.permission !== 'operator'}
                />
              ) : undefined}
              settingsView={
                <ServerVariables
                  server={selectedServer}
                  busy={busy}
                  canManageResources={canManage}
                  canEditServerId={session.user.role === 'owner'}
                  eggs={eggs}
                  loadVersionCatalog={(eggId, version) => {
                    const query = new URLSearchParams();
                    if (eggId) query.set('eggId', eggId);
                    if (version) query.set('version', version);
                    const suffix = query.toString() ? `?${query.toString()}` : '';
                    return requestJson(apiBase, `/agents/${selectedServer.nodeId}/servers/${selectedServer.id}/version-catalog${suffix}`, authHeaders);
                  }}
                  onSave={(settings) => saveServerSettings(selectedServer, settings)}
                  onInstallVersion={(canManage || selectedServer.ownerUserId === session.user.id)
                    ? (settings) => installServerVersion(selectedServer, settings)
                    : undefined}
                  onChangeEgg={(canManage || selectedServer.ownerUserId === session.user.id)
                    ? (settings) => changeServerEgg(selectedServer, settings)
                    : undefined}
                />
              }
              databasesView={<ServerDatabases server={selectedServer} apiBase={apiBase} authHeaders={authHeaders} />}
              webhooksView={<ServerWebhooks server={selectedServer} apiBase={apiBase} authHeaders={authHeaders} />}
              backupsView={<ServerBackups server={selectedServer} apiBase={apiBase} authHeaders={authHeaders} />}
              schedulesView={<ServerSchedules server={selectedServer} apiBase={apiBase} authHeaders={authHeaders} />}
              activityView={<ServerActivity server={selectedServer} apiBase={apiBase} authHeaders={authHeaders} />}
              collaboratorsView={
                <ServerCollaborators
                  server={selectedServer}
                  apiBase={apiBase}
                  authHeaders={authHeaders}
                  canManage={canManage || selectedServer.ownerUserId === session.user.id}
                  showToast={showToast}
                />
              }
              onStart={() => handleServerAction(selectedServer, 'start')}
              onRestart={() => handleServerAction(selectedServer, 'restart')}
              onStop={() => handleServerAction(selectedServer, 'stop')}
              onDelete={() => deleteServer(selectedServer)}
              onSendCommand={handleSendCommand}
            />
          </div>
        ) : (
          <Panel className="hidden xl:flex h-[400px] w-full items-center justify-center">
            <EmptyState className="text-base">Select a server from the list to view the console.</EmptyState>
          </Panel>
        )}
      </div>
    </div>
  );
}

function isMinecraftJavaServer(server: ServerRecord, eggs: any[]) {
  const egg = eggs.find(candidate => candidate.id === server.eggId);
  const text = `${egg?.name || ''} ${egg?.description || ''} ${egg?.nestName || ''} ${egg?.sourceUrl || ''}`.toLowerCase();
  return text.includes('minecraft') && !text.includes('proxy') && !text.includes('bedrock');
}
