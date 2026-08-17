import { useEffect, useRef, useState } from 'react';
import { Bell, CheckCheck, BellOff } from 'lucide-react';
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
    // Optimistic UI update for immediate feedback
    setItems((current) =>
      current.map((item) => ({ ...item, readAt: item.readAt || new Date().toISOString() }))
    );
    setUnreadCount(0);
    
    try {
      await requestJson(API_BASE, '/notifications/read-all', {}, { method: 'PATCH' });
    } catch {
      // Revert logic could go here, but keeping it simple
    }
  };

  const openNotification = async (item: NotificationRecord) => {
    if (!item.readAt) {
      // Optimistic UI update
      setItems((current) =>
        current.map((i) => (i.id === item.id ? { ...i, readAt: new Date().toISOString() } : i))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));

      try {
        await requestJson(
          API_BASE,
          `/notifications/${encodeURIComponent(item.id)}/read`,
          {},
          { method: 'PATCH' }
        );
      } catch {
        // Navigation remains more important than the read marker.
      }
    }
    if (item.href) window.location.assign(item.href);
  };

  return (
    <div className="relative" ref={containerRef}>
      {/* Trigger Button */}
      <button
        className={cn(
          'group relative flex h-9 w-9 items-center justify-center rounded-lg border border-transparent text-[var(--muted-foreground)] transition-all duration-200 hover:bg-[var(--secondary)]/80 hover:text-[var(--foreground)] active:scale-95',
          open && 'bg-[var(--secondary)] text-[var(--foreground)] border-[var(--border)]/50 shadow-sm'
        )}
        onClick={() => {
          setOpen((value) => !value);
          if (!open) void load();
        }}
        type="button"
        aria-label={`Notifications${unreadCount ? `, ${unreadCount} unread` : ''}`}
      >
        <Bell 
          size={18} 
          className={cn(
            "transition-transform duration-300 ease-out", 
            !open && unreadCount > 0 && "group-hover:rotate-12"
          )} 
        />
        
        {/* Unread Badge */}
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white shadow-sm ring-2 ring-[var(--background)] animate-in zoom-in duration-300">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Panel */}
      <div
        className={cn(
          'absolute right-0 top-12 z-50 w-[min(24rem,calc(100vw-2rem))] overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--card)] shadow-2xl backdrop-blur-xl',
          'origin-top-right transition-all duration-200 ease-out',
          open
            ? 'visible translate-y-0 scale-100 opacity-100'
            : 'invisible -translate-y-2 scale-95 opacity-0'
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--border)]/60 bg-[var(--card)]/95 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-[var(--card)]/60">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold">Notifications</h3>
            {unreadCount > 0 && (
              <span className="rounded-md bg-[var(--primary)]/10 px-1.5 py-0.5 text-xs font-medium text-[var(--primary)]">
                {unreadCount} new
              </span>
            )}
          </div>
          {unreadCount > 0 && (
            <button
              className="group flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium text-[var(--muted-foreground)] transition-colors hover:bg-[var(--secondary)] hover:text-[var(--foreground)]"
              onClick={markAllRead}
              type="button"
            >
              <CheckCheck size={14} className="transition-transform group-active:scale-90" />
              Mark all read
            </button>
          )}
        </div>

        {/* List */}
        <div className="max-h-[400px] overflow-y-auto overscroll-contain">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center px-8 py-12 text-center">
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[var(--secondary)]/50">
                <BellOff size={20} className="text-[var(--muted-foreground)]/50" />
              </div>
              <p className="text-sm font-medium text-[var(--foreground)]">All caught up!</p>
              <p className="mt-1 text-xs text-[var(--muted-foreground)]">You have no new notifications.</p>
            </div>
          ) : (
            <div className="flex flex-col">
              {items.map((item) => (
                <button
                  key={item.id}
                  className={cn(
                    'group relative flex w-full gap-4 border-b border-[var(--border)]/40 p-4 text-left transition-colors hover:bg-[var(--secondary)]/50',
                    !item.readAt ? 'bg-[var(--primary)]/[0.03]' : 'opacity-80 hover:opacity-100'
                  )}
                  onClick={() => openNotification(item)}
                  type="button"
                >
                  {/* Unread Indicator Bar */}
                  {!item.readAt && (
                    <span className="absolute left-0 top-0 h-full w-[3px] rounded-r-full bg-[var(--primary)]" />
                  )}
                  
                  <div className="flex-1 min-w-0 pt-0.5">
                    <p className={cn("truncate text-sm font-semibold", !item.readAt ? "text-[var(--foreground)]" : "text-[var(--muted-foreground)]")}>
                      {item.title}
                    </p>
                    <p className="mt-1 line-clamp-2 text-sm text-[var(--muted-foreground)] leading-relaxed">
                      {item.message}
                    </p>
                    <p className="mt-2 text-xs font-medium text-[var(--muted-foreground)]/60">
                      {getRelativeTime(item.createdAt)}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Better date formatting: relative times (e.g. "2 hours ago")
function getRelativeTime(value: string) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return value;
  
  const diffInSeconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
  const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });

  if (diffInSeconds < 60) return 'Just now';
  if (diffInSeconds < 3600) return rtf.format(-Math.floor(diffInSeconds / 60), 'minute');
  if (diffInSeconds < 86400) return rtf.format(-Math.floor(diffInSeconds / 3600), 'hour');
  if (diffInSeconds < 2592000) return rtf.format(-Math.floor(diffInSeconds / 86400), 'day');
  
  return date.toLocaleDateString([], { dateStyle: 'medium' });
}