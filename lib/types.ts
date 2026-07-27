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
  emailVerified?: boolean;
  twoFactorEnabled?: boolean;
  recoveryCodesRemaining?: number;
  serverCount?: number;
  ownedServerCount?: number;
  sharedServerCount?: number;
};
export type Session = { user: User };
export type PanelPublicSettings = {
  attribution?: {
    required: boolean;
    text: string;
    license: string;
  };
  branding: {
    name: string;
    panelName: string;
    publicUrl: string;
    tagline: string;
    footerTagline: string;
  };
  socialLinks: {
    website: string;
    discord: string;
    instagram: string;
    twitter: string;
    youtube: string;
    github: string;
    linkedin: string;
  };
  registration: {
    enabled: boolean;
    inviteRequired: boolean;
  };
  accountSecurity: {
    emailVerificationRequired: boolean;
    suspiciousLoginDetection: boolean;
  };
  passwordPolicy: {
    minLength: number;
    maxLength: number;
    requiredCharacterClasses: number;
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
    templates: Record<'login' | 'registration' | 'passwordReset' | 'emailVerification' | 'suspiciousLogin' | 'serverCreated' | 'serverStarted' | 'serverStopped' | 'serverRestarted' | 'collaboratorAdded' | 'ticketCreated' | 'ticketStaffNotification' | 'ticketReply' | 'ticketStatus', {
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
  assignedPorts?: number[];
  queryPortOptions?: Array<{ variable: string; port: number }>;
  status: string;
  memoryBytes?: number;
  cpuLimitPercentage?: number;
  cpuCores?: number;
  cpuPinnedThreads?: string;
  swapMemoryMb?: number;
  swapMemoryStorage?: 'server' | 'general';
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
  startupCommand?: string;
  startupTemplate?: string;
  variables?: Record<string, string>;
  collaboratorUserIds?: string[];
  collaborators?: Array<{ userId: string; permission: 'read_only' | 'operator' | 'custom'; permissions: string[] }>;
  access?: {
    relationship: 'owner' | 'collaborator' | 'staff';
    permission: 'owner' | 'staff' | 'read_only' | 'operator' | 'custom';
    canWrite: boolean;
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
  cpuPinnedThreads: string;
  swapMemoryMb: number;
  swapMemoryStorage: 'server' | 'general';
  portCount: number;
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
  containerId?: string;
  type: DatabaseType;
  name: string;
  databaseName: string;
  username: string;
  password?: string;
  passwordConfigured?: boolean;
  host: string;
  port: number;
  dockerImage?: string;
  memoryBytes?: number;
  diskLimitBytes?: number;
  cpuLimitPercentage?: number;
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
  uptimeSeconds?: number;
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
  secretConfigured?: boolean;
  customHeadersConfigured?: boolean;
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
  resourceHistory?: Array<{
    at: string;
    cpuPercentage: number | null;
    memoryPercentage: number | null;
    diskPercentage: number | null;
  }>;
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
    cpu_count?: number;
    cpuCount?: number;
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
export type ApiErrorLogDay = {
  date: string;
  entries: number;
  sizeBytes: number;
};
export type ApiErrorLogEntry = {
  timestamp: string;
  level: 'error';
  context?: string;
  message: string;
  stack?: string;
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
  | 'panelLogs'
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
  authorUserId?: string;
  authorName: string;
  authorRole: UserRole;
  body: string;
  internal?: boolean;
  createdAt: string;
};
export type SupportTicket = {
  id: string;
  requesterName?: string;
  requesterEmail?: string;
  subject: string;
  category: TicketCategory;
  priority: TicketPriority;
  status: TicketStatus;
  assignedUserId?: string;
  assignedUserName?: string;
  messages: TicketMessage[];
  createdAt: string;
  updatedAt: string;
  closedAt?: string;
};
export type NotificationRecord = {
  id: string;
  type: 'ticket_created' | 'ticket_reply' | 'ticket_status';
  title: string;
  message: string;
  href?: string;
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
  name: string;
  enabled: boolean;
  intervalSeconds: number;
  action: 'restart' | 'start' | 'stop' | 'command' | 'backup_create' | 'backup_delete' | 'clear_directory';
  command?: string;
  targetPath?: string;
  storage?: 'local' | 's3';
  lastRunAt?: string;
  nextRunAt?: string;
};
