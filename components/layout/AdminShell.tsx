import Link from 'next/link';
import { useEffect, useState } from 'react';
import {
  ArrowLeft,
  ArrowRightLeft,
  BarChart3,
  BookTemplate,
  ChevronLeft,
  ChevronRight,
  Clock,
  DownloadCloud,
  FileWarning,
  LifeBuoy,
  LogOut,
  MapPin,
  Megaphone,
  Menu,
  Network,
  PlusSquare,
  ReceiptEuro,
  ShieldAlert,
  SlidersHorizontal,
  UserPlus,
  Users,
  X,
} from 'lucide-react';

import type {
  AdminScreen,
  PanelPublicSettings,
  Session,
} from '../../lib/types';

import { SCREEN_TITLES } from '../../lib/utils';
import { cn, Shell } from '../ui';
import { Footer } from './Footer';
import { NotificationBell } from '../notifications/NotificationBell';
import { ThemeSwitcher } from '../theme/ThemeSwitcher';

interface AdminShellProps {
  session: Session;
  screen: AdminScreen;
  setScreen: (screen: AdminScreen) => void;
  publicSettings: PanelPublicSettings;
  onLogout: () => void;
  children: React.ReactNode;
}

const adminNavigation = [
  {
    label: 'General',
    items: [
      {
        id: 'analytics' as const,
        label: 'Overview',
        icon: BarChart3,
      },
      {
        id: 'create' as const,
        label: 'Provision server',
        icon: PlusSquare,
      },
      {
        id: 'agents' as const,
        label: 'Nodes & agents',
        icon: Network,
      },
      {
        id: 'locations' as const,
        label: 'Locations',
        icon: MapPin,
      },
      {
        id: 'eggs' as const,
        label: 'Egg templates',
        icon: BookTemplate,
      },
      {
        id: 'users' as const,
        label: 'Users',
        icon: Users,
      },
      {
        id: 'supportTickets' as const,
        label: 'Support tickets',
        icon: LifeBuoy,
      },
      {
        id: 'registrationInvites' as const,
        label: 'Registration invites',
        icon: UserPlus,
      },
    ],
  },
  {
    label: 'Advanced',
    items: [
      {
        id: 'security' as const,
        label: 'Security events',
        icon: ShieldAlert,
      },
      {
        id: 'panelLogs' as const,
        label: 'API panel logs',
        icon: FileWarning,
      },
      {
        id: 'webhooks' as const,
        label: 'Billing webhooks',
        icon: ReceiptEuro,
      },
      {
        id: 'cronjobs' as const,
        label: 'Cron jobs',
        icon: Clock,
      },
      {
        id: 'updates' as const,
        label: 'Updates',
        icon: DownloadCloud,
      },
      {
        id: 'infrastructure' as const,
        label: 'Transfers',
        icon: ArrowRightLeft,
      },
      {
        id: 'settings' as const,
        label: 'Panel settings',
        icon: SlidersHorizontal,
      },
    ],
  },
];

export function AdminShell({
  session,
  screen,
  setScreen,
  publicSettings,
  onLogout,
  children,
}: AdminShellProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [announcementDismissed, setAnnouncementDismissed] = useState(false);

  const announcement = publicSettings.announcement;

  const announcementTone =
    announcement.tone === 'critical'
      ? 'border-red-500/30 bg-red-500/10 text-red-300'
      : announcement.tone === 'warning'
        ? 'border-amber-500/30 bg-amber-500/10 text-amber-200'
        : 'border-[var(--primary)]/20 bg-[var(--primary)]/10 text-[var(--primary)]';

  const navigate = (next: AdminScreen) => {
    setScreen(next);
    setMobileOpen(false);
  };

  useEffect(() => {
    if (!mobileOpen) return;
    const previousOverflow = document.body.style.overflow;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMobileOpen(false);
    };
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [mobileOpen]);

  return (
    <Shell>
      <div className="flex h-[100dvh] overflow-hidden bg-[var(--secondary)]/30">
        {/* Mobile overlay */}
        {mobileOpen && (
          <button
            className="fixed inset-0 z-40 bg-black/40 transition-opacity lg:hidden"
            onClick={() => setMobileOpen(false)}
            aria-label="Close admin menu"
            type="button"
          />
        )}

        {/* Sidebar */}
        <aside
          className={cn(
            'fixed inset-y-0 left-0 z-50 flex min-w-0 flex-col bg-[var(--background)] transition-transform duration-200 ease-out lg:transition-[width]',
            'lg:static lg:translate-x-0 lg:bg-transparent',
            mobileOpen
              ? 'translate-x-0 shadow-2xl'
              : '-translate-x-full',
            collapsed
              ? 'w-[min(86vw,18rem)] lg:w-12'
              : 'w-[min(86vw,18rem)] lg:w-52',
          )}
        >
          {/* Sidebar header */}
          <div className="flex h-12 shrink-0 items-center justify-between px-2.5">
            <Link
              href="/"
              className={cn(
                'group flex min-w-0 flex-1 items-center outline-none',
                collapsed && 'lg:hidden',
              )}
            >
              <div className="flex min-w-0 items-baseline">
                <span className="truncate text-[16px] font-bold tracking-tight text-[var(--foreground)] transition-colors group-hover:text-[var(--primary)]">
                  {publicSettings.branding.name}
                </span>

                <span className="text-[13px] font-bold text-[var(--primary)]">
                  .
                </span>
              </div>
            </Link>

            <button
              className="ml-auto hidden h-6 w-6 items-center justify-center rounded-md text-[var(--muted-foreground)] transition-colors hover:bg-[var(--secondary)] hover:text-[var(--foreground)] focus:outline-none lg:inline-flex"
              onClick={() => setCollapsed(value => !value)}
              aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              type="button"
            >
              {collapsed ? (
                <ChevronRight size={13} />
              ) : (
                <ChevronLeft size={13} />
              )}
            </button>

            <button
              className="ml-auto inline-flex h-7 w-7 items-center justify-center rounded-md text-[var(--muted-foreground)] hover:bg-[var(--secondary)] lg:hidden"
              onClick={() => setMobileOpen(false)}
              aria-label="Close menu"
              type="button"
            >
              <X size={16} />
            </button>
          </div>

          {/* Navigation */}
          <nav
            className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-1.5 py-3"
            aria-label="Administration navigation"
          >
            <div className="flex flex-col gap-3">
              {adminNavigation.map(group => {
                const visibleItems = group.items.filter(
                  item =>
                    (
                      item.id !== 'supportTickets'
                      || publicSettings.support.ticketsEnabled
                    )
                    && (
                      item.id !== 'registrationInvites'
                      || (
                        publicSettings.registration.enabled
                        && publicSettings.registration.inviteRequired
                      )
                    ),
                );

                return (
                  <div
                    className="flex flex-col gap-0.5"
                    key={group.label}
                  >
                    {!collapsed ? (
                      <span className="mb-1 px-2 text-[9px] font-semibold uppercase tracking-[0.14em] text-[var(--muted-foreground)]/55">
                        {group.label}
                      </span>
                    ) : (
                      <span
                        className="mx-1.5 mb-1 hidden border-t border-[var(--border)]/60 lg:block"
                        aria-hidden="true"
                      />
                    )}

                    {visibleItems.map(item => {
                      const Icon = item.icon;
                      const isActive = screen === item.id;

                      return (
                       <button
                          key={item.id}
                          className={cn(
                            'group relative flex h-9 min-w-0 items-center rounded-md text-left',
                            'transition-colors duration-150 focus:outline-none',
                            collapsed && 'lg:justify-center',
                            isActive
                              ? 'bg-[var(--background)] text-[var(--foreground)] shadow-sm'
                              : 'text-[var(--muted-foreground)] hover:bg-[var(--secondary)]/50 hover:text-[var(--foreground)]'
                          )}
                          onClick={() => navigate(item.id)}
                          title={collapsed ? item.label : undefined}
                          aria-current={isActive ? 'page' : undefined}
                          type="button"
                        >
                          <div className="grid size-9 shrink-0 place-content-center">
                            <Icon
                              className={cn(
                                'transition-colors duration-150',
                                isActive
                                  ? 'text-[var(--primary)]'
                                  : 'text-[var(--muted-foreground)] group-hover:text-[var(--foreground)]'
                              )}
                              size={16}
                              strokeWidth={1.8}
                            />
                          </div>

                          <span
                            className={cn(
                              'min-w-0 flex-1 truncate text-[12px] font-medium leading-5',
                              collapsed && 'lg:hidden'
                            )}
                          >
                            {item.label}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </nav>

          {/* Bottom actions */}
          <div className="flex shrink-0 flex-col gap-0.5 p-1.5 pb-2.5">
            <Link
              href="/"
              className={cn(
                'group flex h-7 items-center gap-1.5 rounded-md px-2 font-medium text-[var(--muted-foreground)]',
                'transition-colors hover:bg-[var(--secondary)]/50 hover:text-[var(--foreground)] focus:outline-none',
                collapsed && 'lg:justify-center lg:gap-0 lg:px-0',
              )}
              title={collapsed ? 'Back to panel' : undefined}
            >
              <ArrowLeft
                size={13}
                strokeWidth={1.8}
                className="shrink-0 transition-transform group-hover:-translate-x-0.5"
              />

              <span
                className={cn(
                  'truncate',
                  collapsed && 'lg:hidden',
                )}
                style={{
                  fontSize: '11px',
                  lineHeight: '14px',
                }}
              >
                Back to panel
              </span>
            </Link>

            <button
              className={cn(
                'group flex h-7 items-center gap-1.5 rounded-md px-2 font-medium text-[var(--muted-foreground)]',
                'transition-colors hover:bg-red-500/10 hover:text-red-500 focus:outline-none focus:ring-2 focus:ring-red-500/30',
                collapsed && 'lg:justify-center lg:gap-0 lg:px-0',
              )}
              onClick={onLogout}
              title={collapsed ? 'Sign out' : undefined}
              type="button"
            >
              <LogOut
                size={13}
                strokeWidth={1.8}
                className="shrink-0 transition-transform group-hover:-translate-x-0.5"
              />

              <span
                className={cn(
                  'truncate',
                  collapsed && 'lg:hidden',
                )}
                style={{
                  fontSize: '11px',
                  lineHeight: '14px',
                }}
              >
                Sign out {session.user.name}
              </span>
            </button>
          </div>
        </aside>

        {/* Main content */}
        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          <header className="mobile-safe-top flex min-h-14 shrink-0 items-center gap-3 bg-transparent px-3 sm:px-4 lg:h-16 lg:gap-4 lg:px-6">
            <button
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-[var(--muted-foreground)] hover:bg-[var(--secondary)]/50 focus:outline-none lg:hidden"
              onClick={() => setMobileOpen(true)}
              aria-label="Open admin menu"
              type="button"
            >
              <Menu size={18} />
            </button>

            <div className="flex min-w-0 flex-col">
              <h1 className="truncate text-lg font-bold tracking-tight text-[var(--foreground)] sm:text-xl">
                {SCREEN_TITLES[screen]}
              </h1>
            </div>

            <div className="ml-auto flex items-center gap-2">
              <ThemeSwitcher compact />
              <NotificationBell />
            </div>
          </header>

          {/* Inset content wrapper */}
          <div className="flex flex-1 flex-col overflow-hidden">
            <div className="flex flex-1 flex-col overflow-hidden rounded-tl-xl border-l border-t border-[var(--border)] bg-[var(--background)] shadow-sm lg:rounded-tl-2xl">
              {/* Announcement */}
              {announcement.enabled
                && !announcementDismissed
                && Boolean(announcement.title || announcement.message) && (
                  <div
                    className={cn(
                      'flex shrink-0 items-center gap-3 border-b border-[var(--border)]/60 px-4 py-2.5 transition-colors sm:px-6 md:px-8',
                      announcementTone,
                    )}
                  >
                    <Megaphone
                      size={14}
                      className="shrink-0"
                    />

                    <p className="min-w-0 flex-1 text-xs sm:text-sm">
                      <span className="font-bold">
                        {announcement.title}
                      </span>

                      {announcement.title
                        && announcement.message && (
                          <span className="mx-2 opacity-40">
                            —
                          </span>
                        )}

                      <span className="font-medium">
                        {announcement.message}
                      </span>

                      {announcement.linkUrl
                        && announcement.linkLabel && (
                          <a
                            className="ml-3 font-bold underline underline-offset-4 hover:opacity-80"
                            href={announcement.linkUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            {announcement.linkLabel}
                          </a>
                        )}
                    </p>

                    <button
                      className="rounded-md p-1 opacity-60 transition-all hover:bg-black/5 hover:opacity-100 dark:hover:bg-white/5"
                      onClick={() => setAnnouncementDismissed(true)}
                      type="button"
                      aria-label="Dismiss announcement"
                    >
                      <X size={14} />
                    </button>
                  </div>
                )}

              {/* Scrollable content */}
              <div className="relative min-h-0 flex-1 overflow-y-auto overflow-x-hidden">
                <main className="mobile-safe-bottom mx-auto w-full max-w-[1600px] p-3 sm:p-5 md:p-8">
                  {children}
                </main>

                <Footer
                  publicSettings={publicSettings}
                  supportHref={
                    publicSettings.support.ticketsEnabled
                      ? undefined
                      : null
                  }
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </Shell>
  );
}
