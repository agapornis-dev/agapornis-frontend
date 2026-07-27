import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { ChevronLeft, Trash2, Server as ServerIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Panel, cn } from '../../components/ui';
import { requestJson } from '../../lib/http';
import { serverConnectAddress } from '../../lib/utils';
import { ServerRecord, Session, User } from '../../lib/types';

// Custom Hooks
import { useServerConsole } from '../../hooks/useServerConsole';
import { useServerStats } from '../../hooks/useServerStats';
import { LiveConnectionState } from '../../hooks/useAgentHealth';

// Sub-components
import { ServerDetail } from '../../components/server/ServerComponents';
import { ServerFiles } from '../../components/server/ServerFiles';
import { ServerVariables } from '../../components/server/ServerVariables';
import { ServerWebhooks } from '../../components/server/ServerWebhooks';
import { ServerDatabases } from '../../components/server/ServerDatabases';
import { ServerBackups } from '../../components/server/ServerBackups';
import { ServerSchedules } from '../../components/server/ServerSchedules';
import { ServerActivity } from '../../components/server/ServerActivity';
import { ServerListPanel } from '../../components/server/ServerListPanel';
import { ServerCollaborators } from '../../components/server/ServerCollaborators';
import { ServerMods } from '../../components/server/ServerMods';
import { useChoice, useConfirm } from '../../components/feedback/FeedbackProvider';
import { ProvisioningLoading, ProvisioningView, ScreenLoading } from '../../components/feedback/LoadingStates';
import { DitheringBackdrop } from '../../components/visual/DitheringBackdrop';

interface ServersScreenProps {
  apiBase: string;
  showToast: (msg: string, type: 'success' | 'error') => void;
  session: Session;
  initialServerId?: string;
}

export function ServersScreen({ apiBase, showToast, session, initialServerId }: ServersScreenProps) {
  const confirm = useConfirm();
  const choose = useChoice();
  const [servers, setServers] = useState<ServerRecord[]>([]);
  const [agents, setAgents] = useState<any[]>([]);
  const [eggs, setEggs] = useState<any[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [selectedServer, setSelectedServer] = useState<ServerRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [eggInstallServerIds, setEggInstallServerIds] = useState<Set<string>>(() => new Set());
  const [provisioningJob, setProvisioningJob] = useState<ProvisioningView | null>(null);
  const [provisioningConnection, setProvisioningConnection] = useState<LiveConnectionState>('connecting');
  const openedInitialServer = useRef('');
  const freezeTransitions = useRef<Record<string, { frozen: boolean; until: number }>>({});

  const authHeaders = useMemo(() => ({}), []);
  const isStaff = ['owner', 'admin', 'support'].includes(session.user.role || '');
  const canManage = ['owner', 'admin'].includes(session.user.role || '');

  // -- Data Fetching --
  const fetchInitialData = useCallback(async () => {
    try {
      const [fetchedServers, fetchedAgents, fetchedEggs, fetchedUsers] = await Promise.all([
        requestJson(apiBase, '/servers', authHeaders).catch(() => []),
        canManage ? requestJson(apiBase, '/agents', authHeaders).catch(() => []) : Promise.resolve([]),
        requestJson(apiBase, '/servers/available-eggs', authHeaders).catch(() => []),
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
  const { consoleEmitter, consoleHistory, connectConsole, stopConsole, clearConsole } = useServerConsole(apiBase, authHeaders);

  const updateServerStatus = useCallback((serverId: string, status: string, authoritative = false) => {
    const transition = freezeTransitions.current[serverId];
    if (!authoritative && transition) {
      if (Date.now() >= transition.until) {
        delete freezeTransitions.current[serverId];
      } else if ((transition.frozen && status !== 'frozen') ||
                 (!transition.frozen && status === 'frozen')) {
        return;
      }
    }
    setServers(current => current.map(server => {
      if (server.id !== serverId) return server;
      return { ...server, status };
    }));
    setSelectedServer(current => {
      if (current?.id !== serverId) return current;
      return { ...current, status };
    });
  }, []);

  const { metrics, resetMetrics } = useServerStats({
    apiBase,
    server: selectedServer,
    onStatus: updateServerStatus
  });

  const selectedServerIsInstalling = Boolean(
    selectedServer &&
    (selectedServer.status === 'provisioning' || eggInstallServerIds.has(selectedServer.id))
  );
  const canManageSelectedServer = Boolean(
    selectedServer &&
    (canManage ||
      !selectedServer.access ||
      selectedServer.access.relationship === 'owner' ||
      selectedServer.ownerUserId === session.user.id)
  );

  useEffect(() => {
    if (!selectedServer || !selectedServerIsInstalling) return;

    let cancelled = false;
    const refreshProvisioningServer = async () => {
      try {
        const updated = await requestJson(
          apiBase,
          `/servers/${encodeURIComponent(selectedServer.id)}`,
          authHeaders
        );
        if (cancelled) return;
        if (eggInstallServerIds.has(updated.id) && updated.status !== 'provisioning') return;
        setServers(current => current.map(server => server.id === updated.id ? updated : server));
        setSelectedServer(current => current?.id === updated.id ? updated : current);
        if (updated.status !== 'provisioning') {
          const canViewConsole =
            updated.access?.relationship !== 'collaborator' ||
            updated.access?.permission === 'operator' ||
            updated.access?.permissions?.includes('console.view');
          if (canViewConsole) void connectConsole(updated);
        }
      } catch {
        // Provisioning can briefly exist only as a reservation; retry quietly.
      }
    };

    const timer = window.setInterval(refreshProvisioningServer, 2_000);
    void refreshProvisioningServer();
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [apiBase, authHeaders, connectConsole, eggInstallServerIds, selectedServer?.id, selectedServerIsInstalling]);

  useEffect(() => {
    if (!provisioningJob?.id || ['complete', 'failed'].includes(provisioningJob.status)) return;

    let closed = false;
    const source = new EventSource(
      `${apiBase || '/api'}/provisioning/${encodeURIComponent(provisioningJob.id)}/stream`
    );
    const accept = (event: Event) => {
      try {
        const next = JSON.parse((event as MessageEvent).data) as ProvisioningView;
        if (!closed) setProvisioningJob(next);
        return next;
      } catch {
        return undefined;
      }
    };
    const refreshServer = async (job: ProvisioningView, successful: boolean) => {
      const updated = await requestJson(
        apiBase,
        `/servers/${encodeURIComponent(job.serverId)}`,
        authHeaders
      ).catch(() => undefined);
      if (closed) return;
      if (updated) {
        setServers(current => current.map(item => item.id === updated.id ? updated : item));
        setSelectedServer(current => current?.id === updated.id ? updated : current);
      }
      setEggInstallServerIds(current => {
        const next = new Set(current);
        next.delete(job.serverId);
        return next;
      });
      if (successful) {
        showToast('Server installation completed', 'success');
        if (updated) {
          const canViewConsole =
            updated.access?.relationship !== 'collaborator' ||
            updated.access?.permission === 'operator' ||
            updated.access?.permissions?.includes('console.view');
          if (canViewConsole) void connectConsole(updated);
        }
        window.setTimeout(() => setProvisioningJob(null), 600);
      } else {
        showToast(job.errorMessage || 'Server installation failed', 'error');
      }
    };

    source.onopen = () => !closed && setProvisioningConnection('live');
    source.addEventListener('progress', accept);
    source.addEventListener('complete', event => {
      const next = accept(event);
      source.close();
      if (next) void refreshServer(next, true);
    });
    source.addEventListener('failed', event => {
      const next = accept(event);
      source.close();
      if (next) void refreshServer(next, false);
    });
    source.onerror = () => !closed && setProvisioningConnection('reconnecting');

    return () => {
      closed = true;
      source.close();
    };
  }, [apiBase, authHeaders, connectConsole, provisioningJob?.id, showToast]);

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
    if (server.status === 'provisioning') {
      stopConsole();
      return;
    }
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

  const handleServerAction = (server: ServerRecord, action: 'start' | 'restart' | 'stop', force = false) => {
    if (action === 'start' || action === 'restart') {
      clearConsole();
    }

    runAction(async () => {
      const previousStatus = server.status;
      if (action !== 'stop') updateServerStatus(server.id, 'starting', true);
      try {
        await requestJson(
          apiBase,
          `/agents/${server.nodeId}/servers/${server.id}/${action}`,
          authHeaders,
          {
            method: 'POST',
            body: JSON.stringify(action === 'stop' ? { force } : {}),
          }
        );
      } catch (error) {
        updateServerStatus(server.id, previousStatus, true);
        throw error;
      }
      updateServerStatus(server.id, action === 'stop' ? 'stopped' : 'starting', true);
      if (action !== 'stop' && (server.access?.relationship !== 'collaborator' || server.access?.permission === 'operator' || server.access?.permissions?.includes('console.view'))) connectConsole(server);
      return force
        ? `Force kill sent to ${server.name || server.id}`
        : `Command '${action}' sent to ${server.name || server.id}`;
    });
  };

  const stopServer = async (server: ServerRecord) => {
    const choice = await choose({
      title: `Stop ${server.name || server.id}?`,
      description: 'Graceful stop sends the server its configured shutdown command and gives it time to save. Force kill stops it immediately and can lose unsaved data.',
      confirmLabel: 'Stop gracefully',
      alternativeLabel: 'Force kill',
      alternativeTone: 'danger'
    });
    if (choice === 'cancel') return;
    handleServerAction(server, 'stop', choice === 'alternative');
  };

  const updateServerContainers = async (server: ServerRecord) => {
    if (!await confirm({
      title: 'Update server packages?',
      description: server.status === 'running'
        ? 'This refreshes the server and database images to pick up their latest package patches, then safely replaces the containers. Server files and database contents are kept, but the server will briefly restart.'
        : 'This refreshes the server and database images to pick up their latest package patches, then safely replaces the containers. Server files and database contents are kept, and the server will remain offline.',
      confirmLabel: 'Update packages',
      tone: 'danger'
    })) return;

    clearConsole();
    runAction(async () => {
      const previousStatus = server.status;
      if (previousStatus === 'running') updateServerStatus(server.id, 'starting', true);
      try {
        const result = await requestJson(
          apiBase,
          `/agents/${server.nodeId}/servers/${server.id}/container-update`,
          authHeaders,
          { method: 'POST', body: JSON.stringify({}) }
        );
        updateServerStatus(server.id, result.status || previousStatus, true);
        if (previousStatus === 'running' && (server.access?.relationship !== 'collaborator' || server.access?.permission === 'operator' || server.access?.permissions?.includes('console.view'))) {
          connectConsole(server);
        }
        const describeImage = (item: any, label: string) => {
          const image = item?.image || 'image details unavailable';
          const state = item?.imageChanged ? 'updated' : 'already current';
          const imageId = String(item?.imageId || '').replace(/^sha256:/, '').slice(0, 12);
          return `${label}: ${image} (${state}${imageId ? `, ${imageId}` : ''})`;
        };
        const updated = [
          describeImage(result.updated?.server, result.updated?.server?.name || 'Server'),
          ...(result.updated?.databases || []).map((database: any) =>
            describeImage(database, `${database.name} (${database.type})`)
          )
        ];
        return `Updated packages — ${updated.join('; ')}.${previousStatus === 'running' ? '' : ' Server remains offline.'}`;
      } catch (error) {
        updateServerStatus(server.id, previousStatus, true);
        throw error;
      }
    });
  };

  const deleteServer = async (server: ServerRecord) => {
    const provisioningRecovery = server.status === 'provisioning' && canManage;
    const agent = agents.find(candidate => candidate.nodeId === server.nodeId);
    const nodeStatus = String(agent?.stats?.status || agent?.status || '').toLowerCase();
    const nodeUnavailable = !agent || ['offline', 'unavailable', 'disconnected', 'unhealthy'].includes(nodeStatus);
    let databaseOnlyCleanup = canManage && (server.status === 'deleting' || nodeUnavailable);
    if (!await confirm({
      title: databaseOnlyCleanup ? 'Remove server from panel database?' : provisioningRecovery ? 'Remove stuck provisioning server?' : 'Delete this server?',
      description: provisioningRecovery
        ? `${server.name || server.id} is still marked as provisioning. Only continue if the server no longer exists on the node. This forcibly removes the panel record and any reserved ports, and cannot be undone.`
        : databaseOnlyCleanup
          ? `${server.name || server.id} is assigned to an unavailable node. This removes its panel record, attached database metadata, and reserved ports without contacting the node. Any containers or files still on that node will be left behind.`
        : `${server.name || server.id} and its server files will be permanently removed. This cannot be undone.`,
      confirmLabel: (provisioningRecovery || databaseOnlyCleanup) ? 'Force cleanup' : 'Delete server',
      tone: 'danger'
    })) return;
    runAction(async () => {
      const requestDelete = (forceDatabaseCleanup: boolean) => requestJson(
        apiBase,
        `/agents/${server.nodeId}/servers/${server.id}`,
        authHeaders,
        {
          method: 'DELETE',
          body: JSON.stringify({
            ...(provisioningRecovery ? { forceProvisioningCleanup: true } : {}),
            ...(forceDatabaseCleanup ? { forceDatabaseCleanup: true } : {})
          })
        }
      );
      try {
        await requestDelete(databaseOnlyCleanup);
      } catch (error: any) {
        const unavailable = /agent unavailable|bad gateway|unavailable|econn/i.test(String(error?.message || ''));
        if (!canManage || databaseOnlyCleanup || !unavailable) throw error;
        const force = await confirm({
          title: 'Node unavailable — remove panel record only?',
          description: `The node could not be contacted. This will remove ${server.name || server.id}, its attached database metadata, and reserved ports from the panel. Containers and files on the node will not be deleted.`,
          confirmLabel: 'Remove database record',
          tone: 'danger'
        });
        if (!force) throw error;
        databaseOnlyCleanup = true;
        await requestDelete(true);
      }
      setSelectedServer(null);
      resetMetrics();
      stopConsole();
      fetchInitialData();
      return databaseOnlyCleanup
        ? `Removed server ${server.name || server.id} from the panel database`
        : `Deleted server ${server.name || server.id}`;
    });
  };

  const handleFreeze = async (server: ServerRecord, frozen: boolean) => {
    if (!frozen && !await confirm({
      title: 'Freeze this server?',
      description: `${server.name || server.id} will be stopped and all owner changes and power actions will be locked until an administrator unfreezes it.`,
      confirmLabel: 'Freeze server',
      tone: 'danger'
    })) return;

    runAction(async () => {
      const action = frozen ? 'unfreeze' : 'freeze';
      await requestJson(
        apiBase,
        `/agents/${server.nodeId}/servers/${server.id}/${action}`,
        authHeaders,
        { method: 'POST', body: JSON.stringify({}) }
      );
      const nextFrozen = !frozen;
      freezeTransitions.current[server.id] = {
        frozen: nextFrozen,
        until: Date.now() + 10_000
      };
      updateServerStatus(server.id, nextFrozen ? 'frozen' : 'stopped', true);
      if (!frozen) stopConsole();
      return frozen ? 'Server unfrozen' : 'Server frozen and stopped';
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
      const withAccess = { ...server, ...updated, access: updated.access || server.access };
      setServers(current => current.map(item => item.id === server.id ? withAccess : item));
      setSelectedServer(withAccess);
      return 'Server settings saved successfully';
    });
  };

  const changeServerEgg = async (server: ServerRecord, settings: any) => {
    stopConsole();
    resetMetrics();
    setEggInstallServerIds(current => new Set(current).add(server.id));
    updateServerStatus(server.id, 'provisioning', true);

    await runAction(async () => {
      try {
        const job = await requestJson(apiBase, `/agents/${server.nodeId}/servers/${server.id}/egg/provision`, authHeaders, {
          method: 'POST', body: JSON.stringify(settings)
        });
        setProvisioningConnection('connecting');
        setProvisioningJob(job);
        return 'Server installation started';
      } catch (error) {
        const updated = await requestJson(apiBase, `/servers/${server.id}`, authHeaders).catch(() => server);
        setServers(current => current.map(item => item.id === server.id ? updated : item));
        setSelectedServer(current => current?.id === server.id ? updated : current);
        if (updated.status !== 'provisioning') {
          const canViewConsole =
            updated.access?.relationship !== 'collaborator' ||
            updated.access?.permission === 'operator' ||
            updated.access?.permissions?.includes('console.view');
          if (canViewConsole) void connectConsole(updated);
        }
        setEggInstallServerIds(current => {
          const next = new Set(current);
          next.delete(server.id);
          return next;
        });
        throw error;
      }
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
    <div
      className={cn(
        'relative flex min-h-[calc(100dvh-6rem)] w-full items-stretch gap-3 overflow-visible lg:grid lg:h-[calc(100dvh-8rem)] lg:min-h-[36rem] lg:grid-rows-[minmax(0,1fr)] lg:overflow-hidden',
        canManage
          ? 'lg:grid-cols-[clamp(20rem,24vw,23rem)_minmax(0,1fr)]'
          : 'lg:grid-cols-[clamp(18rem,21vw,20rem)_minmax(0,1fr)]'
      )}
    >
      
      {/* Master View: Server List */}
      <div className={cn("h-full w-full shrink-0 lg:h-auto lg:shrink", selectedServer ? "hidden lg:block" : "block")}>
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
      <div className={cn("h-full min-h-0 w-full min-w-0 flex-col overflow-hidden", !selectedServer ? "hidden lg:flex" : "flex")}>
        <AnimatePresence mode="wait">
          {selectedServer ? (
            <motion.div 
              key="detail-view"
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 8 }}
              transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
              className="flex h-full min-h-0 w-full min-w-0 flex-col overflow-hidden"
            >
              {/* Native-style Sticky Mobile Back Button */}
              <button 
                className="mb-3 flex min-h-11 w-full items-center gap-3 rounded-xl border border-[var(--border)]/60 bg-[var(--background)] p-1.5 text-left shadow-sm transition-[background-color,transform] hover:bg-[var(--secondary)]/30 active:scale-[0.99] lg:hidden"
                onClick={() => { setSelectedServer(null); stopConsole(); }}
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--secondary)]/30 text-[var(--foreground)]">
                  <ChevronLeft size={18} />
                </div>
                <span className="font-semibold text-[var(--foreground)]">Back to servers</span>
              </button>

              <div className="min-h-0 flex-1 overflow-hidden">
                {selectedServerIsInstalling ? (
                  <div className="flex min-h-[560px] flex-col justify-center gap-6 lg:h-full lg:min-h-0">
                    {provisioningJob?.serverId === selectedServer.id ? (
                      <ProvisioningLoading
                        job={provisioningJob}
                        connection={provisioningConnection}
                        onDismiss={() => setProvisioningJob(null)}
                      />
                    ) : (
                      <ScreenLoading
                        title={`Installing ${selectedServer.name || selectedServer.id}`}
                        detail="The node is installing server files and preparing the container. This page will open automatically when the server is ready."
                      />
                    )}
                    {canManage && (
                      <button
                        type="button"
                        className="mx-auto inline-flex items-center gap-2 rounded-lg border border-[var(--destructive)]/30 bg-[var(--destructive)]/10 px-4 py-2 text-sm font-bold text-[var(--destructive)] transition-colors hover:bg-[var(--destructive)]/20 disabled:opacity-50"
                        disabled={busy}
                        onClick={() => deleteServer(selectedServer)}
                      >
                        <Trash2 size={15} />
                        Delete provisioning server
                      </button>
                    )}
                  </div>
                ) : (
                <ServerDetail
                  server={selectedServer}
                  emitter={consoleEmitter}
                  consoleHistory={consoleHistory}
                  metrics={metrics}
                  busy={busy}
                  canDelete={canManage}
                  canOperate={selectedServer.access?.canWrite ?? canManageSelectedServer}
                  canFreeze={canManage}
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
                      canRename={canManage}
                      eggs={eggs}
                      loadVersionCatalog={(eggId, version) => {
                        const query = new URLSearchParams();
                        if (eggId) query.set('eggId', eggId);
                        if (version) query.set('version', version);
                        const suffix = query.toString() ? `?${query.toString()}` : '';
                        return requestJson(apiBase, `/agents/${selectedServer.nodeId}/servers/${selectedServer.id}/version-catalog${suffix}`, authHeaders);
                      }}
                      onSave={(settings) => saveServerSettings(selectedServer, settings)}
                      onInstallVersion={canManageSelectedServer
                        ? (settings) => installServerVersion(selectedServer, settings)
                        : undefined}
                      onChangeEgg={canManageSelectedServer
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
                      canManage={canManageSelectedServer}
                      showToast={showToast}
                    />
                  }
                  onStart={() => handleServerAction(selectedServer, 'start')}
                  onRestart={() => handleServerAction(selectedServer, 'restart')}
                  onContainerUpdate={() => updateServerContainers(selectedServer)}
                  onStop={() => stopServer(selectedServer)}
                  onFreeze={() => handleFreeze(selectedServer, false)}
                  onUnfreeze={() => handleFreeze(selectedServer, true)}
                  onDelete={() => deleteServer(selectedServer)}
                  onSendCommand={handleSendCommand}
                />
                )}
              </div>
            </motion.div>
          ) : (
            <motion.div 
              key="empty-state"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="hidden h-full w-full lg:block"
            >
              <Panel className="relative h-full min-h-[500px] w-full flex-col items-center justify-center overflow-hidden border-[var(--border)]/60 bg-[var(--background)] p-0 lg:min-h-0">
                <DitheringBackdrop
                  className="absolute inset-0 z-0 opacity-25 mix-blend-plus-lighter"
                  minViewportWidth={1024}
                  speed={0.45}
                  maxPixelCount={650_000}
                />
                <div className="pointer-events-none absolute inset-0 z-10 bg-gradient-to-t from-[var(--background)] via-[var(--background)]/55 to-transparent" />

                {/* Content Card */}
                <div className="relative z-20 flex h-full flex-col items-center justify-center gap-5 text-center px-6">
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-[var(--border)]/50 bg-[var(--background)]/60  backdrop-blur-xl">
                    <ServerIcon size={28} className="text-[var(--primary)]" />
                  </div>
                  <p className="max-w-[240px] text-sm font-medium leading-relaxed text-[var(--muted-foreground)]">
                    Select a server from the list to view the console.
                  </p>
                </div>
              </Panel>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function isMinecraftJavaServer(server: ServerRecord, eggs: any[]) {
  const egg = eggs.find(candidate => candidate.id === server.eggId);
  const text = `${egg?.name || ''} ${egg?.description || ''} ${egg?.nestName || ''} ${egg?.sourceUrl || ''}`.toLowerCase();
  return text.includes('minecraft') && !text.includes('proxy') && !text.includes('bedrock');
}
