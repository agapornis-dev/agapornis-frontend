import { useEffect, useRef, useState } from 'react';
import { Bell, CheckCheck } from 'lucide-react';
import { requestJson } from '../../lib/http';
import type { NotificationRecord } from '../../lib/types';
import { cn } from '../ui';

const API_BASE = '/api/panel';

export function NotificationBell() {
  const [items, setItems] = useState<NotificationRecord[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const load = async () => {
    try {
      const result = await requestJson(API_BASE, '/notifications?limit=30', {});
      setItems(Array.isArray(result?.items) ? result.items : []);
      setUnreadCount(Number(result?.unreadCount || 0));
    } catch {
      // Notifications should never interrupt the rest of the panel.
    }
  };

  useEffect(() => {
    void load();
    const timer = window.setInterval(load, 30_000);
    const close = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener('mousedown', close);
    };
  }, []);

  const markAllRead = async () => {
    try {
      await requestJson(API_BASE, '/notifications/read-all', {}, { method: 'PATCH' });
      setItems(current => current.map(item => ({ ...item, readAt: item.readAt || new Date().toISOString() })));
      setUnreadCount(0);
    } catch {
      // Keep the dropdown usable if a read marker cannot be persisted.
    }
  };

  const openNotification = async (item: NotificationRecord) => {
    if (!item.readAt) {
      try {
        await requestJson(API_BASE, `/notifications/${encodeURIComponent(item.id)}/read`, {}, { method: 'PATCH' });
      } catch {
        // Navigation remains more important than the read marker.
      }
    }
    if (item.href) window.location.assign(item.href);
  };

  return (
    <div className="relative" ref={containerRef}>
      <button
        className={cn('relative flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--border)]/60 bg-[var(--secondary)]/20 text-[var(--muted-foreground)] transition-colors hover:text-[var(--foreground)]', open && 'bg-[var(--secondary)] text-[var(--foreground)]')}
        onClick={() => { setOpen(value => !value); if (!open) void load(); }}
        type="button"
        aria-label={`Notifications${unreadCount ? `, ${unreadCount} unread` : ''}`}
      >
        <Bell size={16} />
        {unreadCount > 0 && <span className="absolute -right-1.5 -top-1.5 flex min-h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">{unreadCount > 99 ? '99+' : unreadCount}</span>}
      </button>

      {open && (
        <div className="absolute right-0 top-12 z-50 w-[min(24rem,calc(100vw-2rem))] overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--card)] shadow-2xl">
          <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3">
            <div><p className="text-sm font-bold">Notifications</p><p className="text-xs text-[var(--muted-foreground)]">{unreadCount} unread</p></div>
            {unreadCount > 0 && <button className="flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-bold text-[var(--muted-foreground)] hover:bg-[var(--secondary)] hover:text-[var(--foreground)]" onClick={markAllRead} type="button"><CheckCheck size={14} />Mark all read</button>}
          </div>
          <div className="max-h-96 overflow-y-auto">
            {items.length === 0 ? <p className="p-8 text-center text-sm text-[var(--muted-foreground)]">No notifications yet.</p> : items.map(item => (
              <button key={item.id} className={cn('w-full border-b border-[var(--border)]/50 px-4 py-3 text-left transition-colors hover:bg-[var(--secondary)]/30', !item.readAt && 'bg-[var(--primary)]/5')} onClick={() => openNotification(item)} type="button">
                <div className="flex gap-3"><span className={cn('mt-1 h-2 w-2 shrink-0 rounded-full', item.readAt ? 'bg-transparent' : 'bg-[var(--primary)]')} /><div className="min-w-0"><p className="truncate text-sm font-bold">{item.title}</p><p className="mt-1 line-clamp-2 text-xs leading-5 text-[var(--muted-foreground)]">{item.message}</p><p className="mt-2 text-[10px] font-medium text-[var(--muted-foreground)]/70">{formatDate(item.createdAt)}</p></div></div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date.toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : value;
}
