export type UserRole = 'owner' | 'admin' | 'support' | 'user';
export type User = {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  createdAt?: string;
  lastLoginAt?: string;
  passwordEnabled?: boolean;
  authProviders?: Array<'google' | 'discord'>;
  twoFactorEnabled?: boolean;
  recoveryCodesRemaining?: number;
  serverCount?: number;
  ownedServerCount?: number;
  sharedServerCount?: number;
};
export type Session = { user: User };
export type PanelPublicSettings = {
  branding: {
    name: string;
    panelName: string;
    publicUrl: string;
    tagline: string;
    footerTagline: string;
  };
  registration: {
    enabled: boolean;
    inviteRequired: boolean;
  };
  maintenance: {
    enabled: boolean;
    title: string;
    message: string;
    estimatedCompletion: string;
    statusPageUrl: string;
  };
  announcement: {
    enabled: boolean;
    title: string;
    message: string;
    tone: 'info' | 'warning' | 'critical';
    linkLabel: string;
    linkUrl: string;
  };
  support: {
    ticketsEnabled: boolean;
    notificationsEnabled: boolean;
  };
  rateLimit: {
    enabled: boolean;
  };
  captcha: {
    provider: 'none' | 'turnstile';
    siteKey: string;
    requireOnLogin: boolean;
    requireOnRegister: boolean;
    enabled: boolean;
  };
  socialAuth: {
    google: { enabled: boolean };
    discord: { enabled: boolean };
  };
  passwordReset: { enabled: boolean };
};
export type PanelAdminSettings = PanelPublicSettings & {
  rateLimit: {
    enabled: boolean;
    windowSeconds: number;
    maxRequests: number;
  };
  captcha: PanelPublicSettings['captcha'] & {
    secretConfigured: boolean;
  };
  socialAuth: {
    google: { enabled: boolean; clientId: string; secretConfigured: boolean };
    discord: { enabled: boolean; clientId: string; secretConfigured: boolean };
  };
  backupPolicy: {
    s3Enabled: boolean;
    defaultStorage: 'local' | 's3';
    retentionCount: number;
    encryptionRequired: boolean;
    verificationIntervalHours: number;
  };
  modProviders: {
    curseForgeApiKeyConfigured: boolean;
  };
  smtp: {
    enabled: boolean;
    host: string;
    port: number;
    security: 'auto' | 'starttls' | 'tls';
    secure: boolean;
    username: string;
    passwordConfigured: boolean;
    fromName: string;
    fromAddress: string;
    templates: Record<'login' | 'registration' | 'passwordReset' | 'serverCreated' | 'serverStarted' | 'serverStopped' | 'serverRestarted' | 'collaboratorAdded', {
      enabled: boolean;
      subject: string;
      body: string;
    }>;
  };
};
export type DatabaseType = 'mysql' | 'mariadb' | 'postgres';
export type DatabasePortRangeMode = 'game' | 'separate';
export type ServerRecord = {
  id: string;
  nodeId: string;
  name: string;
  eggId?: string;
  eggChangeAllowed?: boolean;
  allowedEggIds?: string[];
  ownerUserId?: string;
  assignedHostPort?: number;
  status: string;
  memoryBytes?: number;
  cpuLimitPercentage?: number;
  cpuCores?: number;
  diskLimitBytes?: number;
  databasesEnabled?: boolean;
  databaseLimit?: number;
  databaseMemoryBytes?: number;
  databaseDiskLimitBytes?: number;
  databaseCpuLimitPercentage?: number;
  databaseCpuCores?: number;
  databaseDockerImage?: string;
  allowedDatabaseTypes?: DatabaseType[];
  databasePortRangeMode?: DatabasePortRangeMode;
  databasePortRangeStart?: number;
  databasePortRangeEnd?: number;
  backupLimit?: number;
  variables?: Record<string, string>;
  collaboratorUserIds?: string[];
  collaborators?: Array<{ userId: string; permission: 'read_only' | 'operator' | 'custom'; permissions: string[] }>;
  access?: {
    relationship: 'owner' | 'collaborator' | 'staff';
    permission: 'owner' | 'staff' | 'read_only' | 'operator' | 'custom';
    canWrite: boolean;
    canManageAccess: boolean;
    permissions: string[];
  };
  connectAddress?: string;
  createdAt: string;
};
export type ServerPlan = {
  id: string;
  name: string;
  enabled: boolean;
  externalIds: string[];
  eggId: string;
  eggChangeAllowed: boolean;
  allowedEggIds: string[];
  location: string;
  nodeId: string;
  memoryMb: number;
  diskMb: number;
  cpuLimitPercentage: number;
  cpuCores?: number;
  databasesEnabled: boolean;
  databaseLimit: number;
  databaseMemoryMb: number;
  databaseDiskMb: number;
  databaseCpuLimitPercentage: number;
  databaseCpuCores?: number;
  databaseDockerImage: string;
  allowedDatabaseTypes: DatabaseType[];
  databasePortRangeMode: DatabasePortRangeMode;
  databasePortRangeStart: number;
  databasePortRangeEnd: number;
  backupLimit: number;
  dockerImage?: string;
  variables: Record<string, string>;
  createdAt: string;
  updatedAt: string;
};
export type ServerDatabase = {
  id: string;
  serverId: string;
  nodeId: string;
  containerId: string;
  type: DatabaseType;
  name: string;
  databaseName: string;
  username: string;
  password: string;
  host: string;
  port: number;
  dockerImage: string;
  memoryBytes: number;
  diskLimitBytes: number;
  cpuLimitPercentage: number;
  cpuCores?: number;
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
  diskUsage: number;
  diskLimit: number;
  status?: string;
};
export type WebhookTarget = {
  id: string;
  name: string;
  scope?: 'admin' | 'server';
  serverId?: string;
  ownerUserId?: string;
  provider?: 'generic' | 'discord' | 'telegram' | 'whmcs';
  url: string;
  chatId?: string;
  enabled: boolean;
  events: string[];
  createdAt: string;
};
export type AgentHealth = {
  nodeId: string;
  fqdn?: string;
  grpcAddress?: string;
  status?: string;
  lastSeen?: string;
  lastSeenAgeSeconds?: number;
  healthy: boolean;
  collectedAt?: string;
  uptimeSeconds?: number;
  responseTimeMs?: number;
  averageResponseTimeMs?: number;
  availabilityPercentage?: number;
  checksInWindow?: number;
  analyticsWindowSeconds?: number;
  responseTimeHistoryMs?: Array<number | null>;
  observedStatusSince?: string;
  stats?: {
    cpu_percentage?: number;
    cpuPercentage?: number;
    memory_usage_bytes?: number;
    memoryUsageBytes?: number;
    memory_total_bytes?: number;
    memoryTotalBytes?: number;
    disk_usage_bytes?: number;
    diskUsageBytes?: number;
    disk_total_bytes?: number;
    diskTotalBytes?: number;
    status?: string;
    error_message?: string;
    errorMessage?: string;
    uptime_seconds?: number;
    uptimeSeconds?: number;
  };
};

export type CrowdSecAlert = {
  id: string;
  nodeId: string;
  createdAt?: string;
  scenario?: string;
  message?: string;
  sourceScope?: string;
  sourceValue?: string;
  sourceIp?: string;
  sourceCountry?: string;
  sourceAsName?: string;
  eventsCount: number;
  simulated: boolean;
  remediation: boolean;
  decisionType?: string;
  decisionDuration?: string;
  severity: 'high' | 'medium' | 'low';
};

export type CrowdSecNodeTelemetry = {
  nodeId: string;
  fqdn?: string;
  enabled: boolean;
  supported: boolean;
  status: 'connecting' | 'active' | 'disabled' | 'unsupported' | 'unavailable';
  errorMessage?: string;
  collectedAt: string;
  alerts: CrowdSecAlert[];
};
export type CronJobRecord = {
  id: string;
  name: string;
  enabled: boolean;
  intervalSeconds: number;
  eventType: string;
  webhookTargetId?: string;
  payload?: Record<string, any>;
  lastRunAt?: string;
  nextRunAt?: string;
  createdAt: string;
};
export type Screen =
  | 'servers'
  | 'tickets'
  | 'supportTickets'
  | 'create'
  | 'agents'
  | 'locations'
  | 'eggs'
  | 'users'
  | 'registrationInvites'
  | 'webhooks'
  | 'cronjobs'
  | 'security'
  | 'updates'
  | 'analytics'
  | 'profile'
  | 'settings'
  | 'infrastructure';
export type UserScreen = Extract<Screen, 'servers' | 'tickets' | 'profile'>;
export type AdminScreen = Exclude<Screen, UserScreen>;
export type TicketCategory = 'general' | 'technical' | 'billing' | 'abuse';
export type TicketPriority = 'low' | 'normal' | 'high' | 'urgent';
export type TicketStatus = 'open' | 'waiting_on_staff' | 'waiting_on_user' | 'resolved' | 'closed';
export type TicketMessage = {
  id: string;
  authorUserId: string;
  authorName: string;
  authorRole: UserRole;
  body: string;
  createdAt: string;
};
export type SupportTicket = {
  id: string;
  userId: string;
  requesterName: string;
  requesterEmail: string;
  subject: string;
  category: TicketCategory;
  priority: TicketPriority;
  status: TicketStatus;
  assignedUserId?: string;
  messages: TicketMessage[];
  createdAt: string;
  updatedAt: string;
  closedAt?: string;
};
export type NotificationRecord = {
  id: string;
  recipientUserId: string;
  type: 'ticket_created' | 'ticket_reply' | 'ticket_status';
  title: string;
  message: string;
  href?: string;
  resourceId?: string;
  actorUserId?: string;
  createdAt: string;
  readAt?: string;
};
export type BanRecord = {
  id: string;
  type: 'user' | 'email' | 'ip';
  value: string;
  reason: string;
  createdByUserId: string;
  createdAt: string;
  expiresAt?: string;
  revokedAt?: string;
  revokedByUserId?: string;
  active: boolean;
};
export type ActivityLogEntry = {
  id: string;
  event: string;
  userId?: string;
  userEmail?: string;
  userName?: string;
  serverId?: string;
  serverName?: string;
  nodeId?: string;
  meta?: Record<string, any>;
  ip?: string;
  createdAt: string;
};
export type ServerSchedule = {
  id: string;
  serverId: string;
  nodeId: string;
  name: string;
  enabled: boolean;
  intervalSeconds: number;
  action: 'restart' | 'start' | 'stop' | 'command';
  command?: string;
  lastRunAt?: string;
  nextRunAt?: string;
  createdAt: string;
};
