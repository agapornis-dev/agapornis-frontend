import Link from 'next/link';
import { LifeBuoy, LogOut, Server, ShieldCheck, UserRound, Megaphone, X } from 'lucide-react';
import type { PanelPublicSettings, Session, UserScreen } from '../../lib/types';
import { cn, Shell } from '../ui';
import { Footer } from './Footer';
import { useState } from 'react';
import { NotificationBell } from '../notifications/NotificationBell';

interface DashboardShellProps {
  session: Session;
  screen: UserScreen;
  setScreen: (screen: UserScreen) => void;
  publicSettings: PanelPublicSettings;
  onLogout: () => void;
  children: React.ReactNode;
}

const userNavigation = [
  { id: 'servers' as const, label: 'Servers', icon: Server },
  { id: 'tickets' as const, label: 'Support', icon: LifeBuoy },
  { id: 'profile' as const, label: 'Account', icon: UserRound }
];

export function DashboardShell({
  session,
  screen,
  setScreen,
  publicSettings,
  onLogout,
  children
}: DashboardShellProps) {
  const canManage = ['owner', 'admin'].includes(session.user.role);
  const [announcementDismissed, setAnnouncementDismissed] = useState(false);

  const announcement = publicSettings.announcement;
  const displayAnnouncement = announcement.enabled && Boolean(announcement.title || announcement.message);
  const announcementTone = announcement.tone === 'critical'
    ? 'border-red-500/30 bg-red-500/10 text-red-300'
    : announcement.tone === 'warning'
      ? 'border-amber-500/30 bg-amber-500/10 text-amber-200'
      : 'border-[var(--primary)]/20 bg-[var(--card)] text-[var(--primary)]';

  return (
    <Shell>
      <div className="flex min-h-screen flex-col bg-[var(--background)]">

        {/* Sleek, highly blurred navigation header */}
        <header className="sticky top-0 z-30 flex flex-col bg-[var(--background)]/80 backdrop-blur-2xl transition-all">
          
          {/* Announcement Banner (Nu bovenaan voor betere zichtbaarheid) */}
          {displayAnnouncement && !announcementDismissed && (
            <div className={cn('relative z-40 flex w-full items-center justify-center gap-3 border-b px-4 py-2.5 sm:px-6 md:px-8', announcementTone)}>
              <div className="mx-auto flex w-full max-w-[1600px] items-center gap-3">
                <Megaphone size={16} className="shrink-0" />
                <div className="min-w-0 flex-1 text-sm">
                  {announcement.title && <span className="font-bold">{announcement.title}</span>}
                  {announcement.title && announcement.message && <span className="mx-2 opacity-50">—</span>}
                  <span className="font-medium">{announcement.message}</span>
                  {announcement.linkUrl && announcement.linkLabel && (
                    <a className="ml-3 font-bold underline underline-offset-4" href={announcement.linkUrl} target="_blank" rel="noopener noreferrer">{announcement.linkLabel}</a>
                  )}
                </div>
                <button
                  onClick={() => setAnnouncementDismissed(true)}
                  className="shrink-0 rounded-md p-1 opacity-70 transition-colors hover:bg-black/10 hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-current"
                  aria-label="Dismiss announcement"
                  type="button"
                >
                  <X size={16} />
                </button>
              </div>
            </div>
          )}

          <div className="border-b border-[var(--border)]/60">
            <div className="mx-auto flex h-16 w-full max-w-[1600px] items-center gap-6 px-4 md:px-8">
              {/* Brand Identity */}
              <button
                className="group mr-auto flex flex-col items-start text-left focus:outline-none"
                onClick={() => setScreen('servers')}
                type="button"
              >
                <div className="flex items-baseline">
                  <span className="text-xl font-extrabold tracking-tight text-[var(--foreground)] transition-colors group-hover:text-[var(--primary)] sm:text-2xl">
                    {publicSettings.branding.name}
                  </span>
                  <span className="text-xl font-extrabold text-[var(--primary)] sm:text-2xl">.</span>
                </div>
                <span className="hidden font-mono text-[9px] uppercase tracking-[0.25em] text-[var(--muted-foreground)]/60 transition-colors group-hover:text-[var(--muted-foreground)] sm:block">
                  {publicSettings.branding.panelName || 'Control Panel'}
                </span>
              </button>

              {/* Typographical Navigation */}
              <nav className="flex h-full items-center gap-1 sm:gap-6" aria-label="Panel navigation">
                {userNavigation.filter(item => item.id !== 'tickets' || publicSettings.support.ticketsEnabled).map(item => {
                  const Icon = item.icon;
                  const isActive = screen === item.id;

                  return (
                    <button
                      key={item.id}
                      className={cn(
                        'group relative flex h-full items-center gap-2 px-2 text-sm transition-colors focus:outline-none',
                        isActive
                          ? 'font-semibold text-[var(--foreground)]'
                          : 'font-medium text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
                      )}
                      onClick={() => setScreen(item.id)}
                      type="button"
                      aria-current={isActive ? 'page' : undefined}
                      title={item.label}
                    >
                      <Icon
                        size={16}
                        className={cn(
                          'transition-colors',
                          isActive
                            ? 'text-[var(--primary)]'
                            : 'text-[var(--muted-foreground)] group-hover:text-[var(--foreground)]'
                        )}
                      />
                      <span className="hidden tracking-wide sm:inline">{item.label}</span>

                      {/* Animated Active Line Indicator */}
                      <span
                        className={cn(
                          'absolute bottom-0 left-0 h-[2px] bg-[var(--primary)] transition-all duration-300',
                          isActive
                            ? 'w-full'
                            : 'w-0 group-hover:w-full group-hover:bg-[var(--border)]'
                        )}
                      />
                    </button>
                  );
                })}

                {canManage && (
                  <Link
                    href="/admin"
                    className="group relative flex h-full items-center gap-2 px-2 text-sm font-medium text-[var(--muted-foreground)] transition-colors hover:text-[var(--foreground)] focus:outline-none"
                    title="Administration"
                  >
                    <ShieldCheck
                      size={16}
                      className="transition-colors group-hover:text-[var(--foreground)]"
                    />
                    <span className="hidden tracking-wide sm:inline">Admin</span>
                    <span className="absolute bottom-0 left-0 h-[2px] w-0 bg-[var(--border)] transition-all duration-300 group-hover:w-full" />
                  </Link>
                )}
              </nav>

              {/* Divider */}
              <div className="hidden h-5 w-px bg-[var(--border)] sm:block" />

              <NotificationBell />

              {/* Minimalist Logout Button */}
              <button
                className="group relative flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[var(--border)]/50 bg-[var(--secondary)]/20 text-[var(--muted-foreground)] transition-all duration-300 hover:border-red-500/30 hover:bg-red-500/10 hover:text-red-500 focus:outline-none focus:ring-2 focus:ring-red-500/30"
                onClick={onLogout}
                type="button"
                title={`Sign out ${session.user.name}`}
                aria-label="Sign out"
              >
                <LogOut
                  size={16}
                  className="transition-transform duration-300 group-hover:-translate-x-0.5 group-hover:scale-110"
                />
              </button>
            </div>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="relative flex flex-1 flex-col">
          <div className="mx-auto flex w-full max-w-[1600px] flex-1 flex-col p-4 sm:p-6 md:p-8">
            {children}
          </div>
        </main>

        <Footer publicSettings={publicSettings} supportHref={publicSettings.support.ticketsEnabled ? undefined : null} />
      </div>
    </Shell>
  );
}
