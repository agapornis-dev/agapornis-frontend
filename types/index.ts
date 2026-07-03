export type User = { id: string; email: string; name: string; role: string };
export type Session = { token: string; user: User };
export type ServerRecord = {
  id: string;
  nodeId: string;
  name: string;
  eggId?: string;
  ownerUserId?: string;
  assignedHostPort?: number;
  status: string;
  createdAt: string;
};
export type MetricsPoint = {
  time: number;
  cpu: number;
  memory: number;
  memoryLimit: number;
  networkRead: number;
  networkWrite: number;
};
export type Screen = 'servers' | 'create' | 'agents' | 'eggs' | 'users' | 'webhooks' | 'cronjobs' | 'system';
