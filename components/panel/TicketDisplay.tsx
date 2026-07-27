import type { TicketStatus } from '../../lib/types';
import { Badge } from '../ui';

export function TicketStatusBadge({ status }: { status: TicketStatus }) {
  const label = status.replaceAll('_', ' ');
  if (status === 'resolved') return <Badge tone="success" className="capitalize text-[10px] px-2 py-0.5">{label}</Badge>;
  if (status === 'closed') return <Badge className="capitalize text-[10px] px-2 py-0.5 border-[var(--border)] bg-[var(--secondary)]/30 text-[var(--muted-foreground)]">{label}</Badge>;
  if (status === 'waiting_on_staff') return <Badge className="capitalize text-[10px] px-2 py-0.5 border-amber-500/30 bg-amber-500/10 text-amber-400">{label}</Badge>;
  return <Badge className="capitalize text-[10px] px-2 py-0.5 bg-[var(--primary)]/10 text-[var(--primary)] border-[var(--primary)]/20">{label}</Badge>;
}

export function formatTicketDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
}
