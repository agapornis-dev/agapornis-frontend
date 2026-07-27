export type ServerStatusTone = 'default' | 'success' | 'danger' | 'warning' | 'frozen';

export function normalizeServerStatus(status?: string) {
  const normalized = String(status || 'unknown').trim().toLowerCase();
  return normalized === 'exited' ? 'offline' : normalized;
}

export function serverStatusLabel(status?: string) {
  const normalized = normalizeServerStatus(status);
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

export function serverStatusTone(status?: string): ServerStatusTone {
  switch (normalizeServerStatus(status)) {
    case 'running':
      return 'success';
    case 'starting':
      return 'warning';
    case 'frozen':
      return 'frozen';
    case 'created':
      return 'default';
    default:
      return 'danger';
  }
}

export function serverStatusDot(status?: string) {
  switch (serverStatusTone(status)) {
    case 'success':
      return 'bg-[var(--success)]';
    case 'warning':
      return 'bg-orange-500';
    case 'frozen':
      return 'bg-yellow-400';
    case 'default':
      return 'bg-[var(--muted-foreground)]';
    default:
      return 'bg-[var(--destructive)]';
  }
}

export function serverIsActive(status?: string) {
  const normalized = normalizeServerStatus(status);
  return normalized === 'running' || normalized === 'starting';
}
