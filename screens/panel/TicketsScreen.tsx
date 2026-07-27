import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, LifeBuoy, LockKeyhole, MessageSquare, Plus, RefreshCw, RotateCcw, Search, Send, UserCheck, XCircle } from 'lucide-react';
import { btn, ghostBtn, inp } from '../../lib/constants';
import { requestJson } from '../../lib/http';
import type { Session, SupportTicket, TicketCategory, TicketPriority, TicketStatus } from '../../lib/types';
import { DashboardPage } from '../../components/layout/DashboardPage';
import { Badge, EmptyState, Field, PageHeader, Panel, cn, formControlClass } from '../../components/ui';
import { TicketStatusBadge, formatTicketDate } from '../../components/panel/TicketDisplay';

type TicketDraft = {
  subject: string;
  category: TicketCategory;
  priority: TicketPriority;
  message: string;
};

type TicketAssignee = Pick<Session['user'], 'id' | 'name' | 'email' | 'role'>;

const emptyDraft: TicketDraft = { subject: '', category: 'technical', priority: 'normal', message: '' };

const customInputStyle = formControlClass();

export function TicketsScreen({
  apiBase,
  showToast,
  session,
  staffMode = false,
  initialTicketId = ''
}: {
  apiBase: string;
  showToast: (message: string, tone?: any) => void;
  session: Session;
  staffMode?: boolean;
  initialTicketId?: string;
}) {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState<TicketDraft>(emptyDraft);
  const [reply, setReply] = useState('');
  const [internalReply, setInternalReply] = useState(false);
  const [filter, setFilter] = useState<'active' | 'closed' | 'all'>('active');
  const [queue, setQueue] = useState<'all' | 'unassigned' | 'mine'>('all');
  const [search, setSearch] = useState('');
  const [assignees, setAssignees] = useState<TicketAssignee[]>([]);

  const activeTicket = tickets.find(ticket => ticket.id === selectedId) || null;
  const filteredTickets = useMemo(() => tickets.filter(ticket => {
    const closed = ticket.status === 'closed' || ticket.status === 'resolved';
    if (filter !== 'all' && (filter === 'closed') !== closed) return false;
    if (staffMode && queue === 'unassigned' && ticket.assignedUserId) return false;
    if (staffMode && queue === 'mine' && ticket.assignedUserId !== session.user.id) return false;
    const term = search.trim().toLowerCase();
    return !term || [ticket.id, ticket.subject, ticket.requesterName, ticket.requesterEmail, ticket.category, ticket.assignedUserName]
      .some(value => String(value || '').toLowerCase().includes(term));
  }), [tickets, filter, queue, search, session.user.id, staffMode]);

  const counts = useMemo(() => ({
    waiting: tickets.filter(ticket => ticket.status === 'waiting_on_staff').length,
    unassigned: tickets.filter(ticket => !ticket.assignedUserId && !['closed', 'resolved'].includes(ticket.status)).length,
    urgent: tickets.filter(ticket => ticket.priority === 'urgent' && !['closed', 'resolved'].includes(ticket.status)).length
  }), [tickets]);

  const loadTickets = async (quiet = false) => {
    if (!quiet) setLoading(true);
    try {
      const [data, staff] = await Promise.all([
        requestJson(apiBase, '/tickets', {}),
        staffMode ? requestJson(apiBase, '/tickets/assignees', {}).catch(() => []) : Promise.resolve([])
      ]);
      const next = Array.isArray(data) ? data as SupportTicket[] : [];
      setAssignees(Array.isArray(staff) ? staff as TicketAssignee[] : []);
      setTickets(next);
      setSelectedId(current => next.some(ticket => ticket.id === current) ? current : next.some(ticket => ticket.id === initialTicketId) ? initialTicketId : (next[0]?.id || ''));
    } catch (error: any) {
      showToast(error.message || 'Could not load support tickets', 'error');
    } finally {
      if (!quiet) setLoading(false);
    }
  };

  useEffect(() => { void loadTickets(); }, []);

  const replaceTicket = (updated: SupportTicket) => {
    setTickets(current => [updated, ...current.filter(ticket => ticket.id !== updated.id)]);
    setSelectedId(updated.id);
  };

  const priorityBadgeClass = {
    urgent: 'border-red-500/40 bg-red-500/10 text-red-400',
    high: 'border-orange-500/40 bg-orange-500/10 text-orange-400',
    normal: 'border-blue-500/40 bg-blue-500/10 text-blue-400',
    low: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400',
  } as const;

  const createTicket = async () => {
    setBusy(true);
    try {
      const created = await requestJson(apiBase, '/tickets', {}, { method: 'POST', body: JSON.stringify(draft) });
      replaceTicket(created);
      setDraft(emptyDraft);
      setCreating(false);
      showToast(`Ticket ${created.id} opened`, 'success');
    } catch (error: any) {
      showToast(error.message || 'Could not open ticket', 'error');
    } finally {
      setBusy(false);
    }
  };

  const sendReply = async () => {
    if (!activeTicket || !reply.trim()) return;
    setBusy(true);
    try {
      const updated = await requestJson(apiBase, `/tickets/${encodeURIComponent(activeTicket.id)}/messages`, {}, { method: 'POST', body: JSON.stringify({ message: reply, internal: staffMode && internalReply }) });
      replaceTicket(updated);
      setReply('');
      setInternalReply(false);
      showToast(internalReply ? 'Internal note added' : 'Reply sent', 'success');
    } catch (error: any) {
      showToast(error.message || 'Could not send reply', 'error');
    } finally {
      setBusy(false);
    }
  };

  const updateTicket = async (changes: Partial<Pick<SupportTicket, 'status' | 'priority'>> & { assignedUserId?: string | null }) => {
    if (!activeTicket) return;
    setBusy(true);
    try {
      const updated = await requestJson(apiBase, `/tickets/${encodeURIComponent(activeTicket.id)}`, {}, { method: 'PATCH', body: JSON.stringify(changes) });
      replaceTicket(updated);
      showToast('Ticket updated', 'success');
    } catch (error: any) {
      showToast(error.message || 'Could not update ticket', 'error');
    } finally {
      setBusy(false);
    }
  };

  const reopenTicket = async () => {
    if (!activeTicket) return;
    setBusy(true);
    try {
      const updated = await requestJson(apiBase, `/tickets/${encodeURIComponent(activeTicket.id)}/reopen`, {}, { method: 'POST' });
      replaceTicket(updated);
      showToast('Ticket reopened', 'success');
    } catch (error: any) {
      showToast(error.message || 'Could not reopen ticket', 'error');
    } finally {
      setBusy(false);
    }
  };

  const closeTicket = async () => {
    if (!activeTicket) return;
    setBusy(true);
    try {
      const updated = await requestJson(apiBase, `/tickets/${encodeURIComponent(activeTicket.id)}/close`, {}, { method: 'POST' });
      replaceTicket(updated);
      showToast('Ticket closed', 'success');
    } catch (error: any) {
      showToast(error.message || 'Could not close ticket', 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <DashboardPage>
      
      <PageHeader
        eyebrow={<span className="flex items-center gap-2 text-[var(--primary)]"><LifeBuoy size={14} /> {staffMode ? 'Support Desk' : 'Help Center'}</span>}
        title={staffMode ? 'Customer Tickets' : 'Support Tickets'}
        description={staffMode ? 'Review requests, reply to customers, and keep each case moving.' : 'Open a private conversation with the support team and follow its progress.'}
        className="pb-8"
        action={
          <div className="flex items-center gap-3">
          <button 
            className={cn(ghostBtn, "flex items-center gap-2 px-4 font-semibold")} 
            disabled={loading || busy} 
            onClick={() => loadTickets()} 
            type="button"
          >
            <RefreshCw size={15} className={cn('transition-transform', loading && 'animate-spin')} />
            Refresh
          </button>
          <button 
            className={cn(btn, "flex items-center gap-2 px-6 font-bold bg-[var(--foreground)] text-[var(--background)] hover:bg-[var(--foreground)]/90")} 
            onClick={() => setCreating(value => !value)} 
            type="button"
          >
            <Plus size={16} />
            New Ticket
          </button>
          </div>
        }
      />

      {staffMode && (
        <div className="grid gap-3 sm:grid-cols-3">
          {[
            ['Waiting for staff', counts.waiting],
            ['Unassigned', counts.unassigned],
            ['Urgent active', counts.urgent]
          ].map(([label, value]) => (
            <Panel key={label} className="flex items-center justify-between px-5 py-4">
              <span className="text-xs font-semibold text-[var(--muted-foreground)]">{label}</span>
              <span className="text-xl font-extrabold text-[var(--foreground)]">{value}</span>
            </Panel>
          ))}
        </div>
      )}

      {/* Create Ticket Panel */}
      {creating && (
        <Panel className="animate-in fade-in slide-in-from-top-2 overflow-hidden border-[var(--border)]/70 bg-[var(--card)] shadow-sm">
          <div className="flex items-center justify-between border-b border-[var(--border)]/50 bg-[var(--secondary)]/10 px-6 py-4">
            <div>
              <h3 className="text-sm font-bold tracking-wide text-[var(--foreground)]">Open a Support Ticket</h3>
              <p className="mt-1 text-xs text-[var(--muted-foreground)]">Include the server ID and exact error when the request is technical.</p>
            </div>
            <button className="rounded-md p-2 text-[var(--muted-foreground)] transition-colors hover:bg-[var(--secondary)]/50 hover:text-[var(--foreground)]" onClick={() => setCreating(false)} type="button" aria-label="Cancel">
              <XCircle size={18} />
            </button>
          </div>
          
          <div className="grid gap-6 p-6 md:grid-cols-2">
            <div className="md:col-span-2">
              <Field label="Subject">
                <input className={cn(inp, customInputStyle)} maxLength={180} value={draft.subject} onChange={event => setDraft({ ...draft, subject: event.target.value })} placeholder="What do you need help with?" />
              </Field>
            </div>
            
            <Field label="Category">
              <select className={cn(inp, customInputStyle)} value={draft.category} onChange={event => setDraft({ ...draft, category: event.target.value as TicketCategory })}>
                <option value="technical">Technical</option>
                <option value="billing">Billing</option>
                <option value="general">General</option>
                <option value="abuse">Abuse Report</option>
              </select>
            </Field>
            
            <Field label="Priority">
              <select className={cn(inp, customInputStyle)} value={draft.priority} onChange={event => setDraft({ ...draft, priority: event.target.value as TicketPriority })}>
                <option value="low">Low</option>
                <option value="normal">Normal</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </Field>
            
            <div className="md:col-span-2">
              <Field label="Message">
                <textarea className={cn(inp, customInputStyle, 'min-h-[160px] resize-y p-4 leading-relaxed')} maxLength={8000} value={draft.message} onChange={event => setDraft({ ...draft, message: event.target.value })} placeholder="Describe the issue, what you expected, and what happened." />
              </Field>
            </div>
            
            <div className="flex justify-end pt-2 border-t border-[var(--border)]/50 md:col-span-2">
              <button 
                className={cn(btn, "px-8 font-bold")} 
                disabled={busy || !draft.subject.trim() || !draft.message.trim()} 
                onClick={createTicket} 
                type="button"
              >
                Submit Ticket
              </button>
            </div>
          </div>
        </Panel>
      )}

      {/* Master/Detail Layout */}
      <div className="grid gap-6 lg:h-[min(46rem,calc(100dvh-10rem))] lg:min-h-[38rem] lg:grid-cols-[minmax(18rem,24rem)_minmax(0,1fr)]">
        
        {/* Left Column: Ticket List */}
        <Panel className="flex min-h-0 flex-col overflow-hidden border-[var(--border)]/70 bg-[var(--card)] shadow-sm">
          <div className="grid gap-2 border-b border-[var(--border)]/50 p-3">
            <label className="flex items-center gap-2 rounded-lg border border-[var(--border)]/60 bg-[var(--background)] px-3 focus-within:border-[var(--primary)]">
              <Search size={14} className="text-[var(--muted-foreground)]" />
              <input aria-label="Search tickets" className="h-9 min-w-0 flex-1 bg-transparent text-xs outline-none placeholder:text-[var(--muted-foreground)]" value={search} onChange={event => setSearch(event.target.value)} placeholder="Search ID, subject, requester..." />
            </label>
            {staffMode && (
              <select className={cn(inp, customInputStyle, 'h-9 py-1 text-xs')} value={queue} onChange={event => setQueue(event.target.value as typeof queue)}>
                <option value="all">Everyone's queue</option>
                <option value="unassigned">Unassigned</option>
                <option value="mine">Assigned to me</option>
              </select>
            )}
          </div>
          {/* Segmented Control */}
          <div className="flex gap-1 bg-[var(--secondary)]/10 p-2 border-b border-[var(--border)]/50 shrink-0">
            {(['active', 'closed', 'all'] as const).map(value => (
              <button 
                key={value} 
                className={cn(
                  'flex-1 rounded-md py-1.5 text-xs font-bold capitalize transition-all focus:outline-none', 
                  filter === value 
                    ? 'bg-[var(--card)] text-[var(--foreground)] shadow-sm ring-1 ring-[var(--border)]' 
                    : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--secondary)]/30'
                )} 
                onClick={() => setFilter(value)} 
                type="button"
              >
                {value}
              </button>
            ))}
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <EmptyState className="py-20">Loading tickets…</EmptyState>
            ) : filteredTickets.length === 0 ? (
              <EmptyState className="py-20">No {filter === 'all' ? '' : filter} tickets yet.</EmptyState>
            ) : (
              <div className="flex flex-col">
                {filteredTickets.map(ticket => (
                  <button 
                    key={ticket.id} 
                    className={cn(
                      'flex w-full flex-col gap-2 border-b border-[var(--border)]/40 p-4 text-left transition-all hover:bg-[var(--secondary)]/20 focus:outline-none ', 
                      selectedId === ticket.id 
                        ? 'bg-[var(--secondary)]/30 border-l-[3px] border-l-[var(--background)]  rounded-[var(--radius-panel)]' 
                        : 'border-l-[3px] border-l-transparent'
                    )} 
                    onClick={() => setSelectedId(ticket.id)} 
                    type="button"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <span className="line-clamp-2 text-sm font-bold text-[var(--foreground)]">{ticket.subject}</span>
                      <TicketStatusBadge status={ticket.status} />
                    </div>
                    {staffMode && (
                      <p className="truncate text-[11px] font-medium text-[var(--muted-foreground)]">
                        {ticket.requesterName} <span className="opacity-50">•</span> {ticket.requesterEmail}
                      </p>
                    )}
                    {staffMode && (
                      <div className="flex items-center gap-1 text-[10px] text-[var(--muted-foreground)]">
                        <UserCheck size={11} /> {ticket.assignedUserName || 'Unassigned'}
                      </div>
                    )}
                    <div className="mt-1 flex items-center justify-between font-mono text-[10px] text-[var(--muted-foreground)]/80">
                      <span>{ticket.id}</span>
                      <span>{formatTicketDate(ticket.updatedAt)}</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </Panel>

        {/* Right Column: Chat/Detail View */}
        <Panel className="flex min-h-0 flex-col overflow-hidden border-[var(--border)]/70 bg-[var(--card)] shadow-sm">
          {!activeTicket ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-4 p-12 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--secondary)]/20 ring-1 ring-[var(--border)]/50">
                <MessageSquare size={28} className="text-[var(--muted-foreground)]" />
              </div>
              <p className="text-sm font-medium text-[var(--muted-foreground)]">Select a ticket from the list to view the conversation.</p>
            </div>
          ) : (
            <>
              {/* Chat Header */}
              <div className="flex flex-col gap-4 border-b border-[var(--border)]/50 bg-[var(--secondary)]/5 p-6 shrink-0">
                <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                  <div className="min-w-0 flex flex-col gap-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <TicketStatusBadge status={activeTicket.status} />
                      <Badge className="bg-[var(--secondary)]/50 border-[var(--border)] text-[var(--foreground)]">{activeTicket.category}</Badge>
                      <Badge className={priorityBadgeClass[activeTicket.priority as keyof typeof priorityBadgeClass] ?? 'border-[var(--border)] bg-[var(--secondary)]/30 text-[var(--muted-foreground)]'}>
                        {activeTicket.priority} Priority
                      </Badge>
                    </div>

                    <h3 className="text-xl font-extrabold tracking-tight text-[var(--foreground)]">
                      {activeTicket.subject}
                    </h3>

                    <p className="font-mono text-[11px] text-[var(--muted-foreground)]/80">
                      <span className="text-[var(--foreground)]">{activeTicket.id}</span> • Opened {formatTicketDate(activeTicket.createdAt)}
                      {staffMode && ` • Requested by ${activeTicket.requesterName} (${activeTicket.requesterEmail})`}
                    </p>
                  </div>
                  
                  {/* Actions */}
                  <div className="flex flex-wrap items-center gap-3 shrink-0">
                    {staffMode && (
                      <>
                        <select
                          aria-label="Ticket assignee"
                          className={cn(inp, customInputStyle, 'h-9 w-auto max-w-44 py-1 text-xs')}
                          disabled={busy}
                          value={activeTicket.assignedUserId || ''}
                          onChange={event => updateTicket({ assignedUserId: event.target.value || null })}
                        >
                          <option value="">Unassigned</option>
                          {assignees.map(assignee => <option key={assignee.id} value={assignee.id}>{assignee.name}</option>)}
                        </select>
                        <select 
                          aria-label="Ticket status" 
                          className={cn(inp, customInputStyle, 'h-9 w-auto py-1 text-xs')} 
                          disabled={busy} 
                          value={activeTicket.status} 
                          onChange={event => updateTicket({ status: event.target.value as TicketStatus })}
                        >
                          <option value="open">Open</option>
                          <option value="waiting_on_staff">Waiting on Staff</option>
                          <option value="waiting_on_user">Waiting on User</option>
                          <option value="resolved">Resolved</option>
                          <option value="closed">Closed</option>
                        </select>
                        <select 
                          aria-label="Ticket priority" 
                          className={cn(inp, customInputStyle, 'h-9 w-auto py-1 text-xs')} 
                          disabled={busy} 
                          value={activeTicket.priority} 
                          onChange={event => updateTicket({ priority: event.target.value as TicketPriority })}
                        >
                          <option value="low">Low Priority</option>
                          <option value="normal">Normal Priority</option>
                          <option value="high">High Priority</option>
                          <option value="urgent">Urgent Priority</option>
                        </select>
                      </>
                    )}
                    {activeTicket.status !== 'closed' && (
                      <button 
                        className={cn(ghostBtn, "flex h-9 items-center gap-2 px-4 text-xs font-semibold hover:bg-red-500/10 hover:text-red-500")} 
                        disabled={busy} 
                        onClick={closeTicket} 
                        type="button"
                      >
                        <CheckCircle2 size={14} /> Close Ticket
                      </button>
                    )}
                    {(activeTicket.status === 'closed' || activeTicket.status === 'resolved') && (
                      <button className={cn(ghostBtn, 'flex h-9 items-center gap-2 px-4 text-xs font-semibold')} disabled={busy} onClick={reopenTicket} type="button">
                        <RotateCcw size={14} /> Reopen
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Chat Messages */}
              <div className="flex flex-1 flex-col gap-6 overflow-y-auto p-6 bg-[var(--background)]/30">
                {activeTicket.messages.map(message => {
                  const mine = message.authorUserId === session.user.id;
                  const staff = message.authorRole !== 'user';
                  
                  return (
                    <article 
                      key={message.id} 
                      className={cn(
                        'flex w-full flex-col max-w-[85%]', 
                        mine ? 'ml-auto items-end' : 'mr-auto items-start'
                      )}
                    >
                      <div className={cn(
                        "flex flex-col gap-1.5 rounded-2xl px-5 py-4 shadow-sm",
                        message.internal && "border-amber-500/40 bg-amber-500/10",
                        mine 
                          ? "rounded-tr-sm border border-[var(--primary)]/30 bg-[var(--primary)]/10 text-[var(--foreground)]" 
                          : "rounded-tl-sm border border-[var(--border)]/60 bg-[var(--secondary)]/20 text-[var(--foreground)]"
                      )}>
                        <div className={cn("flex items-center gap-2 text-[11px]", mine ? "justify-end" : "justify-start")}>
                          <span className="font-bold">{message.authorName}</span>
                          {staff && <Badge className="min-h-4 px-1.5 py-0 text-[9px] bg-[var(--foreground)] text-[var(--background)] border-transparent">Staff</Badge>}
                          {message.internal && <Badge className="min-h-4 border-amber-500/30 bg-amber-500/10 px-1.5 py-0 text-[9px] text-amber-400">Internal note</Badge>}
                          <span className="text-[var(--muted-foreground)] opacity-70">• {formatTicketDate(message.createdAt)}</span>
                        </div>
                        <p className="whitespace-pre-wrap break-all text-sm leading-relaxed">
                          {message.body}
                        </p>
                      </div>
                    </article>
                  );
                })}
              </div>

              {/* Reply Box */}
              <div className="border-t border-[var(--border)]/50 bg-[var(--secondary)]/5 p-4 shrink-0">
                {activeTicket.status === 'closed' ? (
                  <div className="flex h-12 items-center justify-center rounded-lg border border-dashed border-[var(--border)] bg-[var(--secondary)]/10">
                    <p className="text-sm font-medium text-[var(--muted-foreground)]">This ticket is closed. {staffMode && 'You can reopen it using the status menu.'}</p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-3 rounded-xl border border-[var(--border)]/60 bg-[var(--background)] p-2 focus-within:border-[var(--primary)] focus-within:ring-1 focus-within:ring-[var(--primary)]/30 transition-all">
                    {staffMode && (
                      <div className="flex items-center gap-2 border-b border-[var(--border)]/40 px-2 pb-2">
                        <button
                          type="button"
                          className={cn('flex items-center gap-1.5 rounded-md px-2 py-1 text-[10px] font-bold transition-colors', internalReply ? 'bg-amber-500/10 text-amber-400' : 'text-[var(--muted-foreground)] hover:bg-[var(--secondary)]')}
                          onClick={() => setInternalReply(value => !value)}
                        >
                          <LockKeyhole size={12} /> {internalReply ? 'Internal note — staff only' : 'Reply to customer'}
                        </button>
                      </div>
                    )}
                    <textarea 
                      aria-label="Reply" 
                      className="w-full min-h-[80px] resize-none bg-transparent px-3 py-2 text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none" 
                      maxLength={8000} 
                      value={reply} 
                      onChange={event => setReply(event.target.value)} 
                      placeholder={internalReply ? 'Add a note visible only to support staff...' : 'Type your reply here...'}
                    />
                    <div className="flex justify-between items-center px-1 pb-1">
                      <span className="text-[10px] font-medium text-[var(--muted-foreground)] px-2">
                        {reply.length}/8000
                      </span>
                      <button 
                        className={cn(btn, "h-8 px-4 text-xs font-bold transition-all")} 
                        disabled={busy || !reply.trim()} 
                        onClick={sendReply} 
                        type="button"
                      >
                        <Send size={13} className="mr-2" /> {internalReply ? 'Add Note' : 'Send Reply'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </Panel>
      </div>
    </DashboardPage>
  );
}
