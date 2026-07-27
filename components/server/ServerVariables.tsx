import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence, Transition } from 'framer-motion';
import {
  AlertTriangle, Archive, Box, Cpu, Database, HardDrive, MemoryStick,
  GitFork, Plus, RefreshCw, Save, Server, Settings2, Tag, Trash2, X, Check,
  Rocket, Settings
} from 'lucide-react';
import type { DatabaseType, ServerRecord } from '../../lib/types';
import { btn, dangerBtn, ghostBtn, inp } from '../../lib/constants';
import { dockerImagesForEgg } from '../../lib/docker-images';
import { EmptyState, Field, Tabs, cn } from '../ui';
import { useConfirm } from '../feedback/FeedbackProvider';

type SettingsSection = 'general' | 'runtime' | 'versions' | 'resources' | 'databases' | 'backups' | 'variables';
type VariableRow = { key: string; value: string; description?: string; fixedKey?: boolean };

const RESOURCE_KEYS = new Set([
  'MEMORY', 'SERVER_MEMORY', 'SERVER_DISK', 'SERVER_CPU', 'SERVER_CPU_CORES', 'SERVER_IP',
  'CPU_LIMIT', 'CPU_CORES', 'SERVER_ID', 'STARTUP', 'DOCKER_IMAGE'
]);
const PORT_VARIABLE_PATTERN = /(^|_)PORT($|_)/i;
const SELF_SERVICE_PORT_VARIABLE_KEYS = new Set(['QUERY_PORT']);

function isUserEditableVariable(variable: any) {
  const key = String(variable?.envVariable || '').toUpperCase();
  const selfServicePort = SELF_SERVICE_PORT_VARIABLE_KEYS.has(key);
  return Boolean(key)
    && (variable?.userEditable !== false || selfServicePort)
    && !RESOURCE_KEYS.has(key)
    && (!PORT_VARIABLE_PATTERN.test(key) || selfServicePort);
}

function rowsForViewer(server: ServerRecord, eggs: any[], canManageResources: boolean, canEditServerId: boolean): VariableRow[] {
  if (canManageResources) {
    return Object.entries(server.variables || {})
      .filter(([key]) => !key.toUpperCase().startsWith('AGAPORNIS_'))
      .filter(([key]) => !RESOURCE_KEYS.has(key.toUpperCase()))
      .filter(([key]) => !PORT_VARIABLE_PATTERN.test(key) || key.toUpperCase() === 'QUERY_PORT')
      .filter(([key]) => canEditServerId || key.toUpperCase() !== 'SERVER_ID')
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => ({ key, value, fixedKey: key.toUpperCase() === 'QUERY_PORT' }));
  }

  const egg = eggs.find(candidate => candidate.id === server.eggId);
  return (egg?.variables || [])
    .filter(isUserEditableVariable)
    .map((variable: any) => ({
      key: variable.envVariable,
      value: server.variables?.[variable.envVariable] ?? variable.defaultValue ?? '',
      description: variable.description,
      fixedKey: true
    }));
}

function portRowsForServer(server: ServerRecord, value: string): VariableRow[] {
  const ports = value.split(',').map(port => port.trim()).filter(Boolean);
  let mappedKeys: string[] = [];
  try {
    const mappings = JSON.parse(String(server.variables?.AGAPORNIS_PORT_MAPPINGS || '[]'));
    if (Array.isArray(mappings)) mappedKeys = mappings
      .map(mapping => String(mapping?.variable || ''))
      .filter(key => Boolean(key) && key.toUpperCase() !== 'QUERY_PORT');
  } catch {}
  return ports.map((port, index) => ({
    key: mappedKeys[index] || (index === 0 ? 'SERVER_PORT' : `ADDITIONAL_PORT_${index}`),
    value: port
  }));
}

function portsForServer(server: ServerRecord) {
  let mappedKeys: string[] = [];
  try {
    const mappings = JSON.parse(String(server.variables?.AGAPORNIS_PORT_MAPPINGS || '[]'));
    if (Array.isArray(mappings)) mappedKeys = mappings
      .map(mapping => String(mapping?.variable || ''))
      .filter(key => Boolean(key) && key.toUpperCase() !== 'QUERY_PORT');
  } catch {}
  const keys = mappedKeys.length ? mappedKeys : Object.keys(server.variables || {}).filter(key => PORT_VARIABLE_PATTERN.test(key) && key !== 'AGAPORNIS_PORT_MAPPINGS' && key !== 'QUERY_PORT');
  return keys.map(key => server.variables?.[key]).filter(Boolean).join(',');
}

function variablesFromRows(rows: VariableRow[]) {
  return rows.reduce<Record<string, string>>((variables, row) => {
    const key = row.key.trim().toUpperCase();
    if (key) variables[key] = row.value;
    return variables;
  }, {});
}

function mbFromBytes(value?: number) {
  return value ? String(Math.floor(value / 1024 / 1024)) : '';
}

function variableValue(server: ServerRecord, key: string) {
  return server.variables?.[key] || '';
}

function resourceDefaults(server: ServerRecord) {
  const cpuPercentage = Number(server.cpuCores || 0) > 0 ? Number(server.cpuCores) * 100 : Number(server.cpuLimitPercentage || variableValue(server, 'SERVER_CPU') || 100);
  return {
    memoryMb: mbFromBytes(server.memoryBytes) || variableValue(server, 'SERVER_MEMORY') || '1024',
    diskMb: mbFromBytes(server.diskLimitBytes) || variableValue(server, 'SERVER_DISK') || '10240',
    cpuLimitPercentage: String(cpuPercentage),
    cpuPinnedThreads: variableValue(server, 'AGAPORNIS_CPU_PINNED_THREADS'),
    swapMemoryMb: variableValue(server, 'AGAPORNIS_SWAP_MEMORY_MB') || '0',
    swapMemoryStorage: (variableValue(server, 'AGAPORNIS_SWAP_MEMORY_STORAGE') === 'server' ? 'server' : 'general') as 'server' | 'general',
    databasesEnabled: Boolean(server.databasesEnabled),
    databaseLimit: String(server.databaseLimit || 0),
    databaseMemoryMb: mbFromBytes(server.databaseMemoryBytes) || '512',
    databaseDiskMb: mbFromBytes(server.databaseDiskLimitBytes) || '1024',
    databaseCpuLimitPercentage: String(Number(server.databaseCpuCores || 0) > 0 ? Number(server.databaseCpuCores) * 100 : server.databaseCpuLimitPercentage || 50),
    allowedDatabaseTypes: (server.allowedDatabaseTypes?.length ? server.allowedDatabaseTypes : ['mariadb']) as DatabaseType[],
    databasePortRangeMode: server.databasePortRangeMode || 'separate',
    databasePortRangeStart: String(server.databasePortRangeStart || 33060),
    databasePortRangeEnd: String(server.databasePortRangeEnd || 33160),
    backupLimit: String(server.backupLimit ?? 0)
  };
}

function serverConnectionHost(server: ServerRecord) {
  const address = String(server.connectAddress || '').trim().replace(/^[a-z]+:\/\//i, '');
  if (!address) return variableValue(server, 'SERVER_IP');
  if (address.startsWith('[')) return address.slice(1, address.indexOf(']'));
  const portSuffix = server.assignedHostPort ? `:${server.assignedHostPort}` : '';
  return portSuffix && address.endsWith(portSuffix) ? address.slice(0, -portSuffix.length) : address.split(':')[0];
}

function generatedRuntimeVariables(server: ServerRecord) {
  return {
    ...(server.variables || {}),
    SERVER_MEMORY: mbFromBytes(server.memoryBytes) || variableValue(server, 'SERVER_MEMORY') || '1024',
    SERVER_DISK: mbFromBytes(server.diskLimitBytes) || variableValue(server, 'SERVER_DISK') || '10240',
    SERVER_CPU: String(server.cpuLimitPercentage || variableValue(server, 'SERVER_CPU') || 100),
    SERVER_IP: serverConnectionHost(server),
    SERVER_PORT: variableValue(server, 'SERVER_PORT') || String(server.assignedHostPort || ''),
    SERVER_ID: server.id
  };
}

function resolveStartupPreview(template: string, variables: Record<string, string>) {
  return String(template || '').replace(/\{\{\s*([^}]+?)\s*\}\}/g, (match, key) => {
    const placeholder = String(key).trim();
    const normalized = placeholder.replace(/^env\./i, '').toUpperCase();
    const aliases: Record<string, string> = {
      'SERVER.BUILD.DEFAULT.PORT': 'SERVER_PORT',
      'SERVER.BUILD.DEFAULT.IP': 'SERVER_IP',
      'SERVER.BUILD.MEMORY': 'SERVER_MEMORY',
      'SERVER.BUILD.DISK': 'SERVER_DISK',
      'SERVER.BUILD.CPU': 'SERVER_CPU',
      'SERVER.UUID': 'SERVER_ID',
      'SERVER.ID': 'SERVER_ID'
    };
    const variableKey = /^SERVER\.BUILD\.ENV\./i.test(placeholder)
      ? placeholder.replace(/^server\.build\.env\./i, '').toUpperCase()
      : aliases[normalized] || normalized;
    return variables[variableKey] ?? match;
  });
}

export function ServerVariables({
  server,
  busy,
  canManageResources,
  canEditServerId,
  canRename,
  eggs,
  loadVersionCatalog,
  onInstallVersion,
  onChangeEgg,
  onSave
}: {
  server: ServerRecord;
  busy: boolean;
  canManageResources: boolean;
  canEditServerId: boolean;
  canRename: boolean;
  eggs: any[];
  loadVersionCatalog?: (eggId?: string, version?: string) => Promise<any>;
  onInstallVersion?: (settings: any) => Promise<void>;
  onSave: (settings: any) => Promise<void>;
  onChangeEgg?: (settings: any) => Promise<void>;
}) {
  const [section, setSection] = useState<SettingsSection>(canRename ? 'general' : canManageResources ? 'resources' : 'variables');
  const [serverName, setServerName] = useState(server.name);
  const [startupTemplate, setStartupTemplate] = useState(
    () => server.startupTemplate || eggs.find(egg => egg.id === server.eggId)?.startup || ''
  );
  const [rows, setRows] = useState<VariableRow[]>(() => rowsForViewer(server, eggs, canManageResources, canEditServerId));
  const [portsText, setPortsText] = useState(() => portsForServer(server));
  const [resources, setResources] = useState(() => resourceDefaults(server));
  const [eggForm, setEggForm] = useState({ eggId: server.eggId || '', dockerImage: '' });
  const [eggVariables, setEggVariables] = useState<Record<string, string>>({});
  const [versionCatalog, setVersionCatalog] = useState<any>(null);
  const [versionLoading, setVersionLoading] = useState(false);
  const [versionError, setVersionError] = useState('');
  const [versionForm, setVersionForm] = useState({
    eggId: server.eggId || '',
    version: '',
    build: '',
    dockerImage: '',
    includeExperimental: false
  });
  const confirm = useConfirm();

  const availableEggs = useMemo(() => {
    if (canManageResources) return eggs;
    if (!server.eggChangeAllowed) return eggs.filter(egg => egg.id === server.eggId);
    if (server.allowedEggIds?.length) return eggs.filter(egg => server.allowedEggIds?.includes(egg.id));
    return eggs;
  }, [canManageResources, eggs, server.allowedEggIds, server.eggChangeAllowed, server.eggId]);
  
  const selectedEgg = useMemo(
    () => availableEggs.find(egg => egg.id === (eggForm.eggId || server.eggId || availableEggs[0]?.id)),
    [availableEggs, eggForm.eggId, server.eggId]
  );
  
  const policyEggs = useMemo(() => {
    if (canManageResources) return eggs;
    if (server.eggChangeAllowed && !server.allowedEggIds?.length) return eggs;
    const allowed = new Set([server.eggId, ...(server.allowedEggIds || [])].filter(Boolean));
    return eggs.filter(egg => allowed.has(egg.id));
  }, [canManageResources, eggs, server.allowedEggIds, server.eggChangeAllowed, server.eggId]);
  
  const versionTabEnabled = Boolean(loadVersionCatalog && (onInstallVersion || onChangeEgg) && server.eggId);
  const dockerImages = dockerImagesForEgg(selectedEgg);
  const serverEgg = useMemo(() => eggs.find(egg => egg.id === server.eggId), [eggs, server.eggId]);
  const runtimeVariables = useMemo(() => generatedRuntimeVariables(server), [
    server.id,
    server.memoryBytes,
    server.diskLimitBytes,
    server.cpuLimitPercentage,
    server.connectAddress,
    server.assignedHostPort,
    server.variables
  ]);
  const startupPreview = useMemo(
    () => server.startupCommand || resolveStartupPreview(startupTemplate || serverEgg?.startup || '', runtimeVariables),
    [server.startupCommand, serverEgg?.startup, startupTemplate, runtimeVariables]
  );
  const editableEggVariables = (selectedEgg?.variables || []).filter((variable: any) =>
    canManageResources
      ? canEditServerId || String(variable.envVariable).toUpperCase() !== 'SERVER_ID'
      : isUserEditableVariable(variable)
  );
  
  const sections = useMemo(() => [
    ...(canRename
      ? [{
          value: 'general',
          label: (
            <div className="flex items-center gap-2">
              <Server size={14} />
              General
            </div>
          )
        }]
      : []),
    ...(availableEggs.length > 0 && onChangeEgg
      ? [{
          value: 'runtime',
          label: (
            <div className="flex items-center gap-2">
              <Rocket size={14} />
              Deployment
            </div>
          )
        }]
      : []),

    {
      value: 'versions',
      label: (
        <div className="flex items-center gap-2">
          <GitFork size={14} />
          Versions
        </div>
      ),
      disabled: !versionTabEnabled,
      title: versionTabEnabled
        ? 'Browse game versions and install runtime updates'
        : 'This server does not have a version-aware egg'
    },

    ...(canManageResources
      ? [
          {
            value: 'resources',
            label: (
              <div className="flex items-center gap-2">
                <Cpu size={14} />
                Resources
              </div>
            )
          },
          {
            value: 'databases',
            label: (
              <div className="flex items-center gap-2">
                <Database size={14} />
                Databases
              </div>
            )
          },
          {
            value: 'backups',
            label: (
              <div className="flex items-center gap-2">
                <Archive size={14} />
                Backups
              </div>
            )
          }
        ]
      : []),

    {
      value: 'variables',
      label: (
        <div className="flex items-center gap-2">
          <Settings size={14} />
          Variables
        </div>
      )
    }
  ], [
    availableEggs.length,
    canManageResources,
    canRename,
    onChangeEgg,
    versionTabEnabled
  ]);

  const hasOwnerOnlyVariable = !canEditServerId && rows.some(row => row.key.trim().toUpperCase() === 'SERVER_ID');

  useEffect(() => {
    setServerName(server.name);
  }, [server.id, server.name]);

  useEffect(() => {
    setStartupTemplate(server.startupTemplate || serverEgg?.startup || '');
  }, [server.id, server.startupTemplate, serverEgg?.startup]);

  useEffect(() => {
    setRows(rowsForViewer(server, eggs, canManageResources, canEditServerId));
    setPortsText(portsForServer(server));
  }, [server.id, server.eggId, server.variables, eggs, canManageResources, canEditServerId]);

  useEffect(() => {
    setResources(resourceDefaults(server));
  }, [
    server.id,
    server.memoryBytes,
    server.diskLimitBytes,
    server.cpuLimitPercentage,
    server.cpuCores,
    server.cpuPinnedThreads,
    server.swapMemoryMb,
    server.swapMemoryStorage,
    server.databasesEnabled,
    server.databaseLimit,
    server.databaseMemoryBytes,
    server.databaseDiskLimitBytes,
    server.databaseCpuLimitPercentage,
    server.databaseCpuCores,
    server.allowedDatabaseTypes,
    server.databasePortRangeMode,
    server.databasePortRangeStart,
    server.databasePortRangeEnd,
    server.backupLimit,
    server.variables
  ]);

  useEffect(() => {
    setEggForm({ eggId: server.eggId || '', dockerImage: '' });
    setVersionCatalog(null);
    setVersionForm({
      eggId: server.eggId || '',
      version: '',
      build: '',
      dockerImage: '',
      includeExperimental: false
    });
  }, [server.id, server.eggId]);

  useEffect(() => {
    const next: Record<string, string> = {};
    for (const variable of editableEggVariables) {
      next[variable.envVariable] = server.variables?.[variable.envVariable] ?? variable.defaultValue ?? '';
    }
    setEggVariables(next);
    setEggForm(current => ({ ...current, dockerImage: dockerImages[0]?.image || '' }));
  }, [selectedEgg?.id, server.id, server.variables]);

  useEffect(() => {
    const active = sections.find(item => item.value === section);
    if (!active || active.disabled) setSection((sections.find(item => !item.disabled)?.value as SettingsSection) || 'variables');
  }, [section, sections]);

  const updateRow = (index: number, patch: Partial<VariableRow>) => {
    setRows(current => current.map((row, rowIndex) => rowIndex === index ? { ...row, ...patch } : row));
  };

  const loadVersions = async (eggId?: string, version?: string) => {
    if (!loadVersionCatalog || !versionTabEnabled) return;
    setVersionLoading(true);
    setVersionError('');
    try {
      const data = await loadVersionCatalog(eggId || versionForm.eggId || server.eggId, version);
      setVersionCatalog(data);
      const selected = data?.selected;
      const selectedEggId = selected?.eggId || eggId || server.eggId || '';
      const descriptor = (data?.games || []).flatMap((game: any) => game.eggs || []).find((egg: any) => egg.eggId === selectedEggId);
      const imageOptions = dockerImagesForEgg(policyEggs.find(egg => egg.id === selectedEggId));
      setVersionForm(current => ({
        ...current,
        eggId: selectedEggId,
        version: selected?.version || version || descriptor?.currentVersion || selected?.versions?.[0]?.id || '',
        build: descriptor?.currentBuild && selected?.builds?.some((build: any) => build.id === descriptor.currentBuild)
          ? descriptor.currentBuild
          : selected?.builds?.[0]?.id || '',
        dockerImage: imageOptions.some((option: any) => option.image === current.dockerImage)
          ? current.dockerImage
          : imageOptions[0]?.image || ''
      }));
    } catch (error: any) {
      setVersionError(error?.message || 'Could not load game versions.');
    } finally {
      setVersionLoading(false);
    }
  };

  const applyVersion = async () => {
    if (!onChangeEgg || !versionForm.eggId || !versionForm.version) return;
    const egg = policyEggs.find(candidate => candidate.id === versionForm.eggId);
    if (!egg) return;
    if (!await confirm({
      title: 'Reinstall with this version?',
      description: `${server.name || server.id} will be reinstalled as ${egg.name || egg.id} ${versionForm.version}${versionForm.build ? ` build ${versionForm.build}` : ''}. Existing server files will be permanently replaced.`,
      confirmLabel: 'Apply version',
      tone: 'danger'
    })) return;
    const images = dockerImagesForEgg(egg);
    await onChangeEgg({
      eggId: egg.id,
      dockerImage: versionForm.dockerImage || images[0]?.image,
      variables: {},
      versionSelection: { version: versionForm.version, build: versionForm.build || undefined }
    });
  };

  const installVersionJar = async () => {
    if (!onInstallVersion || versionForm.eggId !== server.eggId || !versionForm.version) return;
    if (!await confirm({
      title: 'Install only the server JAR?',
      description: `${server.name || server.id} will install ${selectedVersionEgg?.family || 'the selected runtime'} ${versionForm.version}${versionForm.build ? ` build ${versionForm.build}` : ''}. Other server files and world data stay untouched. A running server is stopped and started again.`,
      confirmLabel: 'Install JAR'
    })) return;
    await onInstallVersion({
      eggId: versionForm.eggId,
      versionSelection: { version: versionForm.version, build: versionForm.build || undefined }
    });
  };

  const save = async () => {
    if (section === 'general') return onSave({ name: serverName.trim() });
    if (section === 'resources') {
      return onSave({
        memoryMb: resources.memoryMb,
        diskMb: resources.diskMb,
        cpuLimitPercentage: resources.cpuLimitPercentage,
        cpuPinnedThreads: resources.cpuPinnedThreads,
        swapMemoryMb: resources.swapMemoryMb,
        swapMemoryStorage: resources.swapMemoryStorage
      });
    }
    if (section === 'databases') {
      return onSave({
        databasesEnabled: resources.databasesEnabled,
        databaseLimit: resources.databasesEnabled ? resources.databaseLimit : 0,
        databaseMemoryMb: resources.databaseMemoryMb,
        databaseDiskMb: resources.databaseDiskMb,
        databaseCpuLimitPercentage: resources.databaseCpuLimitPercentage,
        allowedDatabaseTypes: resources.allowedDatabaseTypes,
        databasePortRangeMode: resources.databasePortRangeMode,
        databasePortRangeStart: resources.databasePortRangeStart,
        databasePortRangeEnd: resources.databasePortRangeEnd
      });
    }
    if (section === 'backups') return onSave({ backupLimit: resources.backupLimit });
    if (section === 'variables') {
      const portRows = canManageResources ? portRowsForServer(server, portsText) : [];
      return onSave({
        variables: variablesFromRows([...rows, ...portRows]),
        ...(canManageResources ? { startupTemplate: startupTemplate.trim() } : {})
      });
    }
  };

  const changeEgg = async () => {
    if (!onChangeEgg || !selectedEgg) return;
    if (!await confirm({
      title: 'Reinstall this server?',
      description: `${server.name || server.id} will be reinstalled with ${selectedEgg.name || selectedEgg.id}. All existing server files will be permanently deleted and replaced.`,
      confirmLabel: 'Reinstall server',
      tone: 'danger'
    })) return;

    await onChangeEgg({
      eggId: selectedEgg.id,
      dockerImage: eggForm.dockerImage || dockerImages[0]?.image,
      variables: eggVariables
    });
  };

  const saveLabel: Record<Exclude<SettingsSection, 'runtime' | 'versions'>, string> = {
    general: 'Save name',
    resources: 'Save resources',
    databases: 'Save database policy',
    backups: 'Save backup limit',
    variables: 'Save variables'
  };
  
  const catalogEggs = (versionCatalog?.games || []).flatMap((game: any) => (game.eggs || []).map((egg: any) => ({ ...egg, gameName: game.name })));
  const selectedVersionEgg = catalogEggs.find((egg: any) => egg.eggId === versionForm.eggId);
  const selectedVersionDefinition = policyEggs.find((egg: any) => egg.id === versionForm.eggId);
  const versionDockerImages = dockerImagesForEgg(selectedVersionDefinition);
  const visibleVersions = (versionCatalog?.selected?.versions || []).filter((option: any) => versionForm.includeExperimental || option.channel !== 'experimental' || option.id === versionForm.version);
  const visibleBuilds = (versionCatalog?.selected?.builds || []).filter((option: any) => versionForm.includeExperimental || option.channel !== 'experimental' || option.id === versionForm.build);
  const selectionReady = Boolean(versionForm.eggId && versionForm.version && (visibleBuilds.length === 0 || versionForm.build));

  // Shared transition configuration for standard components
  const sectionTransition: Transition = { duration: 0.25, ease: 'easeOut' };

  return (
    <div className="mx-auto grid gap-5">
      <div className="overflow-x-auto pb-1">
        <Tabs value={section} items={sections} onChange={value => {
          setSection(value as SettingsSection);
          if (value === 'versions' && !versionCatalog) void loadVersions();
        }} />
      </div>

      <div className="mx-auto grid max-w-5xl gap-5 p-4 sm:p-6 w-full">
        <AnimatePresence mode="wait">
          {/* GENERAL SECTION */}
          {section === 'general' && canRename && (
            <motion.div
              key="general"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={sectionTransition}
            >
              <SettingsCard icon={<Server size={18} />} title="Server identity" description="Change the display name without changing the UUID used by Docker, files, allocations, and API routes.">
                <div className="grid gap-4 md:grid-cols-2">
                  <Field label="Server name">
                    <input className={inp} value={serverName} maxLength={160} onChange={event => setServerName(event.target.value)} />
                  </Field>
                  <Field label="Server UUID (read-only)">
                    <input className={cn(inp, 'font-mono text-sm disabled:cursor-not-allowed')} value={server.id} readOnly />
                  </Field>
                </div>
              </SettingsCard>
            </motion.div>
          )}

          {/* RUNTIME SECTION */}
          {section === 'runtime' && availableEggs.length > 0 && onChangeEgg && (
            <motion.div
              key="runtime"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={sectionTransition}
            >
              <SettingsCard icon={<Box size={18} />} title="Deployment Configuration" description="Change the server template, image, and install-time variables.">
                <div className="grid gap-4 md:grid-cols-2">
                  <Field label="Egg (game/server type)">
                    <select className={inp} value={eggForm.eggId || server.eggId || availableEggs[0]?.id || ''} onChange={event => setEggForm({ eggId: event.target.value, dockerImage: '' })}>
                      {availableEggs.map(egg => <option key={egg.id} value={egg.id}>{egg.name || egg.id}</option>)}
                    </select>
                  </Field>
                  <Field label="Docker image">
                    <select className={inp} value={eggForm.dockerImage} onChange={event => setEggForm({ ...eggForm, dockerImage: event.target.value })}>
                      {dockerImages.map((image: any) => <option key={`${image.label}-${image.image}`} value={image.image}>{image.label} / {image.image}</option>)}
                    </select>
                  </Field>
                </div>

                {selectedEgg?.description && (
                  <div className="rounded-md border border-[var(--border)] bg-[var(--secondary)]/10 p-4 text-sm leading-relaxed text-[var(--muted-foreground)]">
                    {selectedEgg.description}
                  </div>
                )}

                {editableEggVariables.length > 0 && (
                  <div className="grid gap-4 rounded-md border border-[var(--border)] bg-[var(--secondary)]/10 p-4 md:grid-cols-2">
                    {editableEggVariables.map((variable: any) => (
                      <Field key={variable.envVariable} label={variable.envVariable}>
                        <input className={cn(inp, 'font-mono text-sm')} value={eggVariables[variable.envVariable] ?? ''} placeholder={variable.defaultValue} onChange={event => setEggVariables({ ...eggVariables, [variable.envVariable]: event.target.value })} />
                      </Field>
                    ))}
                  </div>
                )}

                <div className="flex flex-col gap-3 rounded-md border border-orange-500/30 bg-orange-500/10 p-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-3 text-sm font-medium text-orange-400"><AlertTriangle size={19} /> Changing the egg replaces the current server files.</div>
                  <button className={dangerBtn} disabled={busy || !selectedEgg} onClick={() => void changeEgg()}>
                    {selectedEgg?.id === server.eggId ? 'Reinstall egg' : 'Apply new egg'}
                  </button>
                </div>
              </SettingsCard>
            </motion.div>
          )}

          {/* VERSIONS SECTION */}
          {section === 'versions' && versionTabEnabled && (
            <motion.div
              key="versions"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={sectionTransition}
            >
              <SettingsCard
                icon={<GitFork size={18} className="text-[var(--primary)]" />}
                title="Game Versions & Forks"
                description="Switch server software, versions, and builds without editing environment variables."
              >
                {versionLoading && !versionCatalog ? (
                  <div className="flex flex-col items-center justify-center gap-3 py-16 text-[var(--muted-foreground)]">
                    <RefreshCw size={20} className="animate-spin text-[var(--primary)]" />
                    <span className="text-sm text-[var(--muted-foreground)]">Loading versions…</span>
                  </div>
                ) : versionError ? (
                  <div className="flex flex-col items-start gap-3 rounded-lg border border-[var(--destructive)]/30 bg-[var(--destructive)]/5 p-4">
                    <div className="flex items-center gap-2 text-[var(--destructive)]">
                      <AlertTriangle size={16} />
                      <span className="text-sm font-medium">Couldn't load versions</span>
                    </div>
                    <p className="text-sm text-[var(--muted-foreground)]">{versionError}</p>
                    <button className={cn(btn, 'mt-1 gap-2')} onClick={() => void loadVersions()}>
                      <RefreshCw size={13} /> Retry
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col gap-8">
                    {(versionCatalog?.games || []).map((game: any) => {
                      const selectedEggInGame = game.eggs.find((egg: any) => egg.eggId === versionForm.eggId);

                      return (
                        <div key={game.id} className="flex flex-col gap-3">
                          <div className="flex items-center justify-between border-b border-[var(--border)]/50 pb-2">
                            <h4 className="text-sm font-medium text-[var(--foreground)]">{game.name}</h4>
                            <span className="text-[10px] uppercase tracking-widest text-[var(--muted-foreground)]">
                              {game.eggs.length} available
                            </span>
                          </div>

                          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                            {game.eggs.map((egg: any) => {
                              const selected = egg.eggId === versionForm.eggId;
                              return (
                                <button
                                  key={egg.eggId}
                                  type="button"
                                  className={cn(
                                    'flex flex-col items-start gap-1.5 rounded-lg border p-3 text-left transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]/40',
                                    selected
                                      ? 'border-[var(--primary)] bg-[var(--primary)]/5'
                                      : 'border-[var(--border)]/60 bg-[var(--background)] hover:border-[var(--border)] hover:bg-[var(--secondary)]/10'
                                  )}
                                  onClick={() => {
                                    if (selected) {
                                      setVersionForm(current => ({ ...current, eggId: '', version: '', build: '', dockerImage: '' }));
                                    } else {
                                      const image = dockerImagesForEgg(policyEggs.find(candidate => candidate.id === egg.eggId))[0]?.image || '';
                                      setVersionForm(current => ({ ...current, eggId: egg.eggId, version: '', build: '', dockerImage: image }));
                                      void loadVersions(egg.eggId);
                                    }
                                  }}
                                >
                                  <div className="flex w-full items-center justify-between gap-2">
                                    <span className={cn(
                                      'text-sm font-medium',
                                      selected ? 'text-[var(--primary)]' : 'text-[var(--foreground)]'
                                    )}>
                                      {egg.family}
                                    </span>
                                    <span className={cn(
                                      'rounded text-[10px] px-1.5 py-0.5 border',
                                      selected
                                        ? 'bg-[var(--primary)]/10 border-[var(--primary)]/30 text-[var(--primary)]'
                                        : 'bg-[var(--secondary)]/30 border-[var(--border)]/60 text-[var(--muted-foreground)]'
                                    )}>
                                      {egg.kind.replace('-', ' ')}
                                    </span>
                                  </div>
                                  <span className="line-clamp-2 text-xs leading-relaxed text-[var(--muted-foreground)]/80">
                                    {egg.description || egg.name}
                                  </span>
                                </button>
                              );
                            })}
                          </div>

                          <AnimatePresence>
                            {selectedEggInGame && (
                              <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                transition={sectionTransition}
                                className="overflow-hidden"
                              >
                                <div className="mt-1 flex flex-col gap-4 rounded-lg border border-[var(--border)]/60 bg-[var(--secondary)]/5 p-4">
                                  <div className="flex items-start justify-between">
                                    <div>
                                      <p className="text-sm font-medium text-[var(--foreground)]">{selectedEggInGame.family}</p>
                                      <p className="text-xs text-[var(--muted-foreground)]">
                                        {game.name} · {selectedEggInGame.kind.replace('-', ' ')}
                                      </p>
                                    </div>
                                    <button
                                      className="rounded p-1 text-[var(--muted-foreground)] hover:bg-[var(--secondary)]/60 hover:text-[var(--foreground)] focus:outline-none"
                                      onClick={() => setVersionForm(current => ({ ...current, eggId: '', version: '', build: '', dockerImage: '' }))}
                                      aria-label="Deselect fork"
                                    >
                                      <X size={15} />
                                    </button>
                                  </div>

                                  <label className="flex cursor-pointer items-center gap-2.5 w-fit">
                                    <div className="relative flex items-center">
                                      <input
                                        type="checkbox"
                                        className="peer sr-only"
                                        checked={versionForm.includeExperimental}
                                        onChange={event => setVersionForm(current => ({ ...current, includeExperimental: event.target.checked }))}
                                      />
                                      <div className="h-3.5 w-3.5 rounded border border-[var(--border)] bg-[var(--background)] transition-all peer-checked:border-[var(--primary)] peer-checked:bg-[var(--primary)]" />
                                      <Check size={9} className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-white opacity-0 transition-opacity peer-checked:opacity-100" />
                                    </div>
                                    <span className="text-xs text-[var(--muted-foreground)]">Include experimental builds</span>
                                  </label>

                                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                                    <Field label={selectedEggInGame.versionLabel || 'Version'}>
                                      <div className="relative">
                                        <select
                                          className={cn(inp, 'w-full appearance-none font-medium')}
                                          value={versionForm.version}
                                          disabled={versionLoading}
                                          onChange={event => {
                                            const version = event.target.value;
                                            setVersionForm(current => ({ ...current, version, build: '' }));
                                            void loadVersions(versionForm.eggId, version);
                                          }}
                                        >
                                          <option value="" disabled>Pick a version…</option>
                                          {visibleVersions.map((option: any) => (
                                            <option key={option.id} value={option.id}>
                                              {option.label}
                                              {option.recommended ? ' (recommended)' : ''}
                                              {option.channel === 'experimental' ? ' (experimental)' : ''}
                                            </option>
                                          ))}
                                        </select>
                                        {versionLoading && (
                                          <RefreshCw size={13} className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-[var(--muted-foreground)]" />
                                        )}
                                      </div>
                                    </Field>

                                    <Field label={selectedEggInGame.buildLabel || 'Build'}>
                                      {visibleBuilds.length > 0 ? (
                                        <select
                                          className={cn(inp, 'w-full font-medium')}
                                          value={versionForm.build}
                                          disabled={versionLoading}
                                          onChange={event => setVersionForm(current => ({ ...current, build: event.target.value }))}
                                        >
                                          <option value="" disabled>Pick a build…</option>
                                          {visibleBuilds.map((option: any) => (
                                            <option key={option.id} value={option.id}>
                                              {option.label}
                                              {option.recommended ? ' (recommended)' : ''}
                                              {option.channel === 'experimental' ? ' (experimental)' : ''}
                                            </option>
                                          ))}
                                        </select>
                                      ) : (
                                        <div className={cn(inp, 'flex items-center font-mono text-xs text-[var(--muted-foreground)]')}>
                                          Managed automatically
                                        </div>
                                      )}
                                    </Field>

                                    <Field label="Runtime image">
                                      <select
                                        className={cn(inp, 'w-full font-medium')}
                                        value={versionForm.dockerImage}
                                        disabled={versionLoading || versionDockerImages.length === 0}
                                        onChange={event => setVersionForm(current => ({ ...current, dockerImage: event.target.value }))}
                                      >
                                        {versionDockerImages.map((option: any) => (
                                          <option key={option.image} value={option.image}>
                                            {option.label || option.image}
                                          </option>
                                        ))}
                                      </select>
                                    </Field>
                                  </div>

                                  {versionCatalog?.warning && (
                                    <div className="flex items-start gap-2.5 rounded-md border border-[var(--warning)]/20 bg-[var(--warning)]/10 p-3 text-xs text-[var(--warning)]">
                                      <AlertTriangle size={14} className="mt-0.5 shrink-0" />
                                      <p>{versionCatalog.warning} Showing safe fallback choices.</p>
                                    </div>
                                  )}

                                  <div className="flex items-center justify-between gap-4 border-t border-[var(--border)]/40 pt-3">
                                    <p className="max-w-xl text-xs text-[var(--muted-foreground)]">
                                      {selectedVersionEgg?.jarInstallSupported && selectedVersionEgg.eggId === server.eggId
                                        ? 'JAR-only install preserves every other file. A full egg reinstall remains available as a fallback.'
                                        : selectedVersionEgg?.jarInstallReason || 'This runtime requires the egg installer and cannot be replaced safely as one JAR.'}
                                    </p>
                                    <div className="flex shrink-0 flex-wrap justify-end gap-2">
                                      {selectedVersionEgg?.jarInstallSupported && selectedVersionEgg.eggId === server.eggId && onInstallVersion && (
                                        <button
                                          className={cn(btn, 'gap-1.5')}
                                          disabled={busy || versionLoading || !selectionReady}
                                          onClick={() => void installVersionJar()}
                                        >
                                          <Tag size={13} /> Install JAR only
                                        </button>
                                      )}
                                      {onChangeEgg && (
                                        <button
                                          className={cn(selectedVersionEgg?.jarInstallSupported ? ghostBtn : btn, 'gap-1.5')}
                                          disabled={busy || versionLoading || !selectionReady}
                                          onClick={() => void applyVersion()}
                                        >
                                          <RefreshCw size={13} /> Run egg reinstall
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>

                        </div>
                      );
                    })}
                  </div>
                )}
              </SettingsCard>
            </motion.div>
          )}

          {/* RESOURCES SECTION */}
          {section === 'resources' && canManageResources && (
            <motion.div
              key="resources"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={sectionTransition}
            >
              <SettingsCard icon={<Server size={18} />} title="Resource limits" description="CPU, memory, and disk assigned to the game server.">
                <div className="grid gap-4 sm:grid-cols-3">
                  <UnitField label="Memory" unit="MB" icon={<MemoryStick size={16} />} value={resources.memoryMb} onChange={value => setResources({ ...resources, memoryMb: value })} />
                  <UnitField label="Disk space" unit="MB" icon={<HardDrive size={16} />} value={resources.diskMb} onChange={value => setResources({ ...resources, diskMb: value })} />
                  <UnitField label="CPU limit" unit="%" icon={<Cpu size={16} />} value={resources.cpuLimitPercentage} onChange={value => setResources({ ...resources, cpuLimitPercentage: value })} placeholder="100" />
                </div>
                <p className="mt-3 text-xs text-[var(--muted-foreground)]">100% equals one CPU thread; 200% equals two threads.</p>
                <div className="mt-5 rounded-lg border border-[var(--border)]/60 bg-[var(--secondary)]/10 p-4">
                  <label className="grid gap-1.5 text-sm font-medium">Pinned CPU threads<input className={inp} value={resources.cpuPinnedThreads} onChange={event => setResources({ ...resources, cpuPinnedThreads: event.target.value })} placeholder="Disabled — e.g. 0, 1, or 2-4,6" /></label>
                  <p className="mt-2 text-xs text-[var(--muted-foreground)]">Leave empty to disable pinning. Values are logical CPU thread IDs on this server's node.</p>
                </div>
                <div className="mt-5 grid gap-4 rounded-lg border border-[var(--border)]/60 bg-[var(--secondary)]/10 p-4 sm:grid-cols-2">
                  <UnitField label="Swap memory" unit="MB" icon={<MemoryStick size={16} />} value={resources.swapMemoryMb} onChange={value => setResources({ ...resources, swapMemoryMb: value })} />
                  <label className="grid gap-1.5 text-sm font-medium">Charge swap to<select className={inp} disabled={Number(resources.swapMemoryMb) <= 0} value={resources.swapMemoryStorage} onChange={event => setResources({ ...resources, swapMemoryStorage: event.target.value as 'server' | 'general' })}><option value="general">General storage</option><option value="server">Server storage quota</option></select></label>
                </div>
                <p className="mt-3 text-xs text-[var(--muted-foreground)]">Swap is separate from CPU pinning and disabled by default. Server storage reduces usable server disk; general storage consumes node-wide capacity.</p>
              </SettingsCard>
            </motion.div>
          )}

          {/* DATABASES SECTION */}
          {section === 'databases' && canManageResources && (
            <motion.div
              key="databases"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={sectionTransition}
            >
              <SettingsCard
                icon={<Database size={18} className="text-[var(--primary)]" />}
                title="Database policy"
                description="Control whether this server may create databases and the resources each database container receives."
                aside={
                  <label className="flex cursor-pointer items-center gap-2.5 rounded-lg border border-[var(--border)] bg-[var(--secondary)]/20 px-3 py-2 text-sm font-medium transition-colors hover:bg-[var(--secondary)]/40">
                    <input 
                      type="checkbox" 
                      className="h-4 w-4 rounded border-[var(--border)] text-[var(--primary)] focus:ring-[var(--primary)]"
                      checked={resources.databasesEnabled} 
                      onChange={event => setResources({ ...resources, databasesEnabled: event.target.checked })} 
                    /> 
                    Enable Databases
                  </label>
                }
              >
                <div className={cn(
                  'flex flex-col gap-8 transition-opacity duration-200', 
                  !resources.databasesEnabled && 'pointer-events-none opacity-40 grayscale-[0.2]'
                )}>
                  <div className="flex flex-col gap-4">
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
                      General Configuration
                    </h4>
                    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                      <Field label="Maximum databases">
                        <input 
                          className={inp} 
                          type="number" 
                          min={0} 
                          value={resources.databaseLimit} 
                          onChange={event => setResources({ ...resources, databaseLimit: event.target.value })} 
                        />
                      </Field>
                      
                      <Field label="Port allocation">
                        <select 
                          className={inp} 
                          value={resources.databasePortRangeMode} 
                          onChange={event => setResources({ ...resources, databasePortRangeMode: event.target.value as 'game' | 'separate' })}
                        >
                          <option value="game">Node game-port range</option>
                          <option value="separate">Separate database range</option>
                        </select>
                      </Field>

                      <Field label="Allowed database types">
                        <div className="flex h-10 flex-wrap items-center gap-4">
                          {(['mysql', 'mariadb', 'postgres'] as const).map(type => (
                            <label key={type} className="flex cursor-pointer items-center gap-2 text-sm font-medium capitalize text-[var(--foreground)]">
                              <input 
                                type="checkbox" 
                                className="rounded border-[var(--border)] text-[var(--primary)] focus:ring-[var(--primary)] focus:ring-offset-0"
                                checked={resources.allowedDatabaseTypes.includes(type)} 
                                onChange={event => { 
                                  const next = event.target.checked 
                                    ? [...resources.allowedDatabaseTypes, type] 
                                    : resources.allowedDatabaseTypes.filter(value => value !== type); 
                                  if (next.length) {
                                    setResources({ ...resources, allowedDatabaseTypes: next }); 
                                  }
                                }} 
                              />
                              {type}
                            </label>
                          ))}
                        </div>
                      </Field>

                      <AnimatePresence>
                        {resources.databasePortRangeMode === 'separate' && (
                          <motion.div
                            className="col-span-full grid gap-5 sm:grid-cols-2 lg:grid-cols-3"
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={sectionTransition}
                          >
                            <Field label="Port range start">
                              <input 
                                className={inp} 
                                type="number" 
                                min={1} 
                                value={resources.databasePortRangeStart} 
                                onChange={event => setResources({ ...resources, databasePortRangeStart: event.target.value })} 
                              />
                            </Field>
                            <Field label="Port range end">
                              <input 
                                className={inp} 
                                type="number" 
                                min={1} 
                                value={resources.databasePortRangeEnd} 
                                onChange={event => setResources({ ...resources, databasePortRangeEnd: event.target.value })} 
                              />
                            </Field>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>

                  <hr className="border-[var(--border)]" />

                  <div className="flex flex-col gap-4">
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
                      Container Limits
                    </h4>
                    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
                      <UnitField label="Database memory" unit="MB" icon={<MemoryStick size={16} />} value={resources.databaseMemoryMb} onChange={value => setResources({ ...resources, databaseMemoryMb: value })} />
                      <UnitField label="Database disk" unit="MB" icon={<HardDrive size={16} />} value={resources.databaseDiskMb} onChange={value => setResources({ ...resources, databaseDiskMb: value })} />
                      <UnitField label="Database CPU" unit="%" icon={<Cpu size={16} />} value={resources.databaseCpuLimitPercentage} onChange={value => setResources({ ...resources, databaseCpuLimitPercentage: value })} />
                    </div>
                  </div>

                </div>
              </SettingsCard>
            </motion.div>
          )}

          {/* BACKUPS SECTION */}
          {section === 'backups' && canManageResources && (
            <motion.div
              key="backups"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={sectionTransition}
            >
              <SettingsCard icon={<Archive size={18} />} title="Backup retention" description="Limit how many backups this server may retain at once.">
                <div className="max-w-sm">
                  <Field label="Maximum backups (0 disables backups)">
                    <input className={inp} type="number" min={0} value={resources.backupLimit} onChange={event => setResources({ ...resources, backupLimit: event.target.value })} />
                  </Field>
                </div>
              </SettingsCard>
            </motion.div>
          )}

          {/* VARIABLES SECTION */}
          {section === 'variables' && (
            <motion.div
              key="variables"
              className="grid gap-4"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={sectionTransition}
            >
              {(startupTemplate || startupPreview) && (
                <SettingsCard
                  icon={<Rocket size={18} />}
                  title="Startup command"
                  description={canManageResources
                    ? 'Edit the raw startup template. Placeholders such as {{SERVER_PORT}} are resolved when the configuration is saved.'
                    : "Resolved from the server's saved variables and resource limits. Resource variables are read-only here and are changed by an administrator."}
                >
                  <div className="grid gap-3">
                    {canManageResources ? (
                      <Field label="Startup template">
                        <textarea
                          className={cn(inp, 'min-h-32 resize-y font-mono text-sm')}
                          value={startupTemplate}
                          maxLength={8192}
                          spellCheck={false}
                          onChange={event => setStartupTemplate(event.target.value)}
                        />
                        <p className="mt-1 text-xs text-[var(--muted-foreground)]">Enter the command normally; quotes and slashes do not need JSON backslash escaping.</p>
                      </Field>
                    ) : (
                      <pre className="overflow-x-auto whitespace-pre-wrap break-words rounded-md border border-[var(--border)] bg-[var(--secondary)]/20 p-3 font-mono text-sm text-[var(--foreground)]">{startupPreview}</pre>
                    )}
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      <Field label="SERVER_MEMORY (MB)">
                        <input className={cn(inp, 'font-mono text-sm')} value={runtimeVariables.SERVER_MEMORY} readOnly />
                      </Field>
                      <Field label="SERVER_DISK (MB)">
                        <input className={cn(inp, 'font-mono text-sm')} value={runtimeVariables.SERVER_DISK} readOnly />
                      </Field>
                      <Field label="SERVER_CPU (%)">
                        <input className={cn(inp, 'font-mono text-sm')} value={runtimeVariables.SERVER_CPU} readOnly />
                      </Field>
                      <Field label="SERVER_IP">
                        <input className={cn(inp, 'font-mono text-sm')} value={runtimeVariables.SERVER_IP} readOnly />
                      </Field>
                      <Field label="SERVER_PORT">
                        <input className={cn(inp, 'font-mono text-sm')} value={runtimeVariables.SERVER_PORT} readOnly />
                      </Field>
                    </div>
                  </div>
                </SettingsCard>
              )}
              <SettingsCard
                icon={<Settings2 size={18} />}
                title="Environment variables"
                description={canManageResources ? 'Manage runtime variables without mixing them with resource or database controls.' : 'Egg variables marked user-editable are shown. QUERY_PORT is also self-service; SERVER_PORT remains restricted to panel owners and administrators.'}
                aside={canManageResources ? <button className={cn(ghostBtn, 'h-8 gap-1.5 px-2 text-xs')} disabled={busy} onClick={() => setRows(current => [...current, { key: '', value: '' }])}><Plus size={14} /> Add variable</button> : undefined}
              >
                <div className="grid gap-3">
                  {canManageResources && (
                    <Field label="Ports (comma-separated)">
                      <input className={cn(inp, 'font-mono text-sm')} value={portsText} onChange={event => setPortsText(event.target.value)} placeholder="25565,25567" />
                      <p className="mt-1 text-xs text-[var(--muted-foreground)]">The first value remains SERVER_PORT. Appended values receive independent ADDITIONAL_PORT_N allocations and do not change the primary server port.</p>
                    </Field>
                  )}
                  {rows.length === 0 ? (
                    <EmptyState className="py-8 text-center">No editable variables are available for this server.</EmptyState>
                  ) : (
                    <AnimatePresence initial={false}>
                      {rows.map((row, index) => {
                        const ownerOnly = !canEditServerId && row.key.trim().toUpperCase() === 'SERVER_ID';
                        const queryPort = row.key.trim().toUpperCase() === 'QUERY_PORT';
                        const queryPortOptions = server.queryPortOptions || [];
                        const currentQueryPortIsAllocated = queryPortOptions.some(option => String(option.port) === row.value);
                        // Using a stable key where possible to prevent unmount jank, falling back to index composition
                        const elementKey = row.fixedKey ? `fixed-${row.key}` : `custom-${index}`;
                        return (
                          <motion.div
                            layout
                            key={elementKey}
                            initial={{ opacity: 0, height: 0, scale: 0.98 }}
                            animate={{ opacity: 1, height: 'auto', scale: 1 }}
                            exit={{ opacity: 0, height: 0, scale: 0.98 }}
                            transition={sectionTransition}
                            className="overflow-hidden"
                          >
                            <div className="grid gap-2 rounded-md border border-[var(--border)] bg-[var(--secondary)]/10 p-3 md:grid-cols-[220px_1fr_auto] md:items-start mb-2 last:mb-0">
                              <input className={cn(inp, 'font-mono text-sm')} value={row.key} placeholder="KEY_NAME" disabled={row.fixedKey} onChange={event => updateRow(index, { key: event.target.value })} />
                              <div>
                                {queryPort ? (
                                  <select
                                    className={cn(inp, 'font-mono text-sm')}
                                    value={row.value}
                                    disabled={queryPortOptions.length === 0}
                                    onChange={event => updateRow(index, { value: event.target.value })}
                                  >
                                    {!currentQueryPortIsAllocated && row.value && (
                                      <option value={row.value} disabled>{row.value} (not an allocated additional port)</option>
                                    )}
                                    {queryPortOptions.length === 0 && <option value={row.value}>No ADDITIONAL_PORT_N allocations</option>}
                                    {queryPortOptions.map(option => (
                                      <option key={option.variable} value={option.port}>{option.variable} — {option.port}</option>
                                    ))}
                                  </select>
                                ) : (
                                  <input
                                    className={cn(inp, 'font-mono text-sm')}
                                    type="text"
                                    value={row.value}
                                    placeholder="value"
                                    disabled={ownerOnly}
                                    onChange={event => updateRow(index, { value: event.target.value })}
                                  />
                                )}
                                {row.description && <p className="mt-1 text-xs text-[var(--muted-foreground)]">{row.description}</p>}
                                {queryPort && <p className="mt-1 text-xs text-[var(--muted-foreground)]">QUERY_PORT must use an allocated ADDITIONAL_PORT_N. Panel owners and administrators can add allocations above.</p>}
                                {ownerOnly && <p className="mt-1 text-xs text-[var(--destructive)]">SERVER_ID can only be changed by the owner role.</p>}
                              </div>
                              {canManageResources && (
                                <button
                                  className={cn(ghostBtn, 'px-2 text-[var(--muted-foreground)] hover:text-[var(--destructive)]')}
                                  disabled={busy}
                                  onClick={() => setRows(current => current.filter((_row, rowIndex) => rowIndex !== index))}
                                  title="Remove variable"
                                >
                                  <Trash2 size={16} />
                                </button>
                              )}
                            </div>
                          </motion.div>
                        );
                      })}
                    </AnimatePresence>
                  )}
                </div>
              </SettingsCard>
            </motion.div>
          )}
        </AnimatePresence>

        {section !== 'runtime' && section !== 'versions' && (
          <motion.div
            layout
            className="flex items-center justify-end border-t border-[var(--border)] pt-4"
          >
            <button className={cn(btn, 'gap-2')} disabled={busy || hasOwnerOnlyVariable || (section === 'general' && !serverName.trim()) || (section === 'variables' && canManageResources && !startupTemplate.trim())} onClick={() => void save()}>
              <Save size={16} /> {saveLabel[section]}
            </button>
          </motion.div>
        )}
      </div>
    </div>
  );
}

function SettingsCard({ icon, title, description, aside, children }: { icon: React.ReactNode; title: string; description: string; aside?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--background)] shadow-sm">
      <div className="flex items-start justify-between gap-4 border-b border-[var(--border)] bg-[var(--secondary)]/30 px-4 py-3">
        <div className="flex min-w-0 gap-3">
          <span className="mt-0.5 text-[var(--muted-foreground)]">{icon}</span>
          <div><h3 className="font-semibold text-[var(--foreground)]">{title}</h3><p className="mt-0.5 text-xs text-[var(--muted-foreground)]">{description}</p></div>
        </div>
        {aside}
      </div>
      <div className="grid gap-5 p-4">{children}</div>
    </section>
  );
}

function UnitField({ label, unit, icon, value, onChange, placeholder }: { label: string; unit?: string; icon: React.ReactNode; value: string; onChange: (value: string) => void; placeholder?: string }) {
  return (
    <Field label={label}>
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)]">{icon}</span>
        <input type="number" min="0.1" step="0.1" className={cn(inp, 'pl-9', unit && 'pr-12')} value={value} onChange={event => onChange(event.target.value)} placeholder={placeholder} />
        {unit && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[var(--muted-foreground)]">{unit}</span>}
      </div>
    </Field>
  );
}
