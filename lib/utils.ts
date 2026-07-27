import { MetricsPoint, Screen } from './types';

export function normalizeMetrics(data: any): MetricsPoint {
  const cpu = Number(data.cpu_percentage ?? data.cpuPercentage ?? 0);
  return {
    time: Date.now(),
    cpu: Number.isFinite(cpu) ? Math.max(0, Math.min(100, cpu)) : 0,
    memory: Number(data.memory_usage_bytes ?? data.memoryUsageBytes ?? 0),
    memoryLimit: Number(data.memory_limit_bytes ?? data.memoryLimitBytes ?? 0),
    networkRead: Number(data.network_read_bytes ?? data.networkReadBytes ?? 0),
    networkWrite: Number(data.network_write_bytes ?? data.networkWriteBytes ?? 0),
    diskUsage: Number(data.disk_usage_bytes ?? data.diskUsageBytes ?? 0),
    diskLimit: Number(data.disk_limit_bytes ?? data.diskLimitBytes ?? 0),
    status: data.status,
    uptimeSeconds: Number(data.uptime_seconds ?? data.uptimeSeconds ?? 0),
  };
}

export function formatBytes(value: number) {
  if (!Number.isFinite(value) || value <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  let v = value, u = 0;
  while (v >= 1024 && u < units.length - 1) { v /= 1024; u++; }
  return `${v.toFixed(u === 0 ? 0 : 1)} ${units[u]}`;
}

export function serverConnectAddress(server: { nodeId: string; assignedHostPort?: number }, agents: any[] = []) {
  if ('connectAddress' in server && typeof server.connectAddress === 'string' && server.connectAddress) {
    return server.connectAddress;
  }

  if (!server.assignedHostPort) return '';
  const agent = agents.find(item => item.nodeId === server.nodeId);
  const host = agentHost(agent) || server.nodeId;
  return `${host}:${server.assignedHostPort}`;
}

function agentHost(agent: any) {
  const raw = String(agent?.fqdn || agent?.grpcAddress || '').trim();
  if (!raw) return '';
  const withoutProtocol = raw.replace(/^[a-z]+:\/\//i, '');
  return withoutProtocol.split('/')[0].split(':')[0] || raw;
}

export const SCREEN_TITLES: Record<Screen, string> = {
  servers: 'Your servers',
  tickets: 'Support tickets',
  supportTickets: 'Support tickets',
  create: 'Create and assign server',
  agents: 'Agent management',
  locations: 'Locations',
  eggs: 'Egg templates',
  users: 'Users',
  registrationInvites: 'Registration invites',
  webhooks: 'Webhooks',
  cronjobs: 'Cron jobs',
  security: 'Security events',
  panelLogs: 'API panel logs',
  updates: 'Updates',
  analytics: 'Fleet analytics',
  profile: 'Account',
  settings: 'Panel settings',
  infrastructure: 'Infrastructure'
};

export const defaultEggJson = `{
  "meta": {
    "name": "minecraft-vanilla",
    "description": "Vanilla Minecraft server"
  },
  "images": ["itzg/minecraft-server:latest"],
  "startup": "", 
  "environment": {
    "EULA": "TRUE",
    "MEMORY": "1024M",
    "SERVER_PORT": "25565"
  }
}`;
