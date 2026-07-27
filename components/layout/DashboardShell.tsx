import Link from 'next/link';
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  LifeBuoy, LogOut, Server, ShieldCheck, UserRound, Megaphone, X, Menu 
} from 'lucide-react';
import type { PanelPublicSettings, Session, UserScreen } from '../../lib/types';
import { cn, Shell } from '../ui';
import { Footer } from './Footer';
import { NotificationBell } from '../notifications/NotificationBell';
import { ThemeSwitcher } from '../theme/ThemeSwitcher';

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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const announcement = publicSettings.announcement;
  const displayAnnouncement = announcement.enabled && Boolean(announcement.title || announcement.message);
  const announcementTone = announcement.tone === 'critical'
    ? 'border-red-500/30 bg-red-500/10 text-red-300'
    : announcement.tone === 'warning'
      ? 'border-amber-500/30 bg-amber-500/10 text-amber-200'
      : 'border-[var(--primary)]/20 bg-[var(--card)] text-[var(--primary)]';

  const handleNavClick = (id: UserScreen) => {
    setScreen(id);
    setMobileMenuOpen(false);
  };

  useEffect(() => {
    if (!mobileMenuOpen) return;
    const previousOverflow = document.body.style.overflow;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMobileMenuOpen(false);
    };
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [mobileMenuOpen]);

  return (
    <Shell>
      <div className="flex min-h-[100dvh] flex-col bg-[var(--background)]">

        <header className="sticky top-0 z-50 flex shrink-0 flex-col border-b border-[var(--border)]/60 bg-[var(--background)]/95 supports-[backdrop-filter]:bg-[var(--background)]/85 supports-[backdrop-filter]:backdrop-blur-md">
          
          {/* Announcement Banner */}
          {displayAnnouncement && !announcementDismissed && (
            <div className={cn('relative z-40 flex w-full items-center justify-center gap-3 border-b px-4 py-2.5 sm:px-6 md:px-8', announcementTone)}>
              <div className="mx-auto flex w-full max-w-[1800px] items-center gap-3">
                <Megaphone size={16} className="shrink-0" />
                <div className="min-w-0 flex-1 text-sm">
                  {announcement.title && <span className="font-bold block sm:inline">{announcement.title}</span>}
                  {announcement.title && announcement.message && <span className="mx-2 hidden opacity-50 sm:inline">—</span>}
                  <span className="font-medium block sm:inline">{announcement.message}</span>
                  {announcement.linkUrl && announcement.linkLabel && (
                    <a className="sm:ml-3 font-bold underline underline-offset-4 block mt-1 sm:mt-0 sm:inline" href={announcement.linkUrl} target="_blank" rel="noopener noreferrer">{announcement.linkLabel}</a>
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

          <div className="relative z-50">
            <div className="mx-auto flex h-14 w-full max-w-[1800px] items-center gap-4 px-3 sm:px-4 md:h-16 md:gap-6 md:px-5 xl:px-6 2xl:px-8">
              
              {/* Brand Identity - mr-auto pushes everything else to the right */}
              <button
                className="group mr-auto flex min-w-0 shrink flex-col items-start text-left focus:outline-none"
                onClick={() => handleNavClick('servers')}
                type="button"
              >
                <div className="flex items-baseline">
                  <span className="max-w-[42vw] truncate text-lg font-normal tracking-tight text-[var(--foreground)] transition-colors group-hover:text-[var(--primary)] sm:max-w-none sm:text-2xl">
                    {publicSettings.branding.name}
                  </span>
                  <span className="text-xl font-normal text-[var(--primary)] sm:text-2xl">.</span>
                </div>
                <span className="hidden font-mono text-[9px] uppercase tracking-[0.25em] text-[var(--muted-foreground)]/60 transition-colors group-hover:text-[var(--muted-foreground)] sm:block">
                  {publicSettings.branding.panelName || 'Control Panel'}
                </span>
              </button>

              {/* Desktop Typographical Navigation */}
              <nav className="hidden md:flex h-full items-center gap-6" aria-label="Desktop navigation">
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
                      onClick={() => handleNavClick(item.id)}
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
                      <span className="tracking-wide">{item.label}</span>

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
                    <span className="tracking-wide">Admin</span>
                    <span className="absolute bottom-0 left-0 h-[2px] w-0 bg-[var(--border)] transition-all duration-300 group-hover:w-full" />
                  </Link>
                )}
              </nav>

              {/* Right Side Actions */}
              <div className="flex shrink-0 items-center gap-2 sm:gap-3 md:gap-4">
                <div className="hidden h-5 w-px bg-[var(--border)] md:block" />

                <ThemeSwitcher className="hidden sm:inline-flex" compact />

                <NotificationBell />

                {/* Desktop Logout Button */}
                <button
                  className="hidden md:flex group relative h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[var(--border)]/50 bg-[var(--secondary)]/20 text-[var(--muted-foreground)] transition-all duration-300 hover:border-red-500/30 hover:bg-red-500/10 hover:text-red-500 focus:outline-none focus:ring-2 focus:ring-red-500/30"
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

                {/* Mobile Menu Toggle Button */}
                <button
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-[var(--border)]/60 bg-[var(--secondary)]/30 text-[var(--foreground)] transition-colors hover:bg-[var(--secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/50 md:hidden"
                  onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                  aria-label="Toggle mobile menu"
                  aria-expanded={mobileMenuOpen}
                >
                  {mobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
                </button>
              </div>
            </div>

            <AnimatePresence initial={false}>
              {mobileMenuOpen && (
                <>
                  <motion.button
                    type="button"
                    aria-label="Close mobile menu"
                    className="fixed inset-0 z-40 cursor-default bg-black/35 md:hidden"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={() => setMobileMenuOpen(false)}
                  />
                  <motion.div
                    initial={{ opacity: 0, y: -8, scale: 0.985 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -6, scale: 0.99 }}
                    transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
                    className="absolute inset-x-3 top-[calc(100%+0.5rem)] z-50 max-h-[calc(100dvh-5rem)] overflow-y-auto rounded-xl border border-[var(--border)] bg-[var(--background)] p-2 shadow-2xl md:hidden"
                  >
                  <nav className="flex flex-col gap-1" aria-label="Mobile navigation">
                    {userNavigation.filter(item => item.id !== 'tickets' || publicSettings.support.ticketsEnabled).map(item => {
                      const Icon = item.icon;
                      const isActive = screen === item.id;

                      return (
                        <button
                          key={item.id}
                          className={cn(
                            'flex min-h-11 w-full items-center gap-3 rounded-lg px-3 text-sm transition-colors focus:outline-none',
                            isActive
                              ? 'bg-[var(--primary)]/10 font-bold text-[var(--primary)]'
                              : 'font-medium text-[var(--muted-foreground)] hover:bg-[var(--secondary)]/20 hover:text-[var(--foreground)]'
                          )}
                          onClick={() => handleNavClick(item.id)}
                          type="button"
                        >
                          <Icon size={18} />
                          <span className="tracking-wide">{item.label}</span>
                        </button>
                      );
                    })}

                    {canManage && (
                      <Link
                        href="/admin"
                        className="flex min-h-11 w-full items-center gap-3 rounded-lg px-3 text-sm font-medium text-[var(--muted-foreground)] transition-colors hover:bg-[var(--secondary)] hover:text-[var(--foreground)] focus:outline-none"
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        <ShieldCheck size={18} />
                        <span className="tracking-wide">Admin</span>
                      </Link>
                    )}

                    <div className="my-2 h-px w-full bg-[var(--border)]/50" />

                    <div className="flex min-h-11 items-center justify-between rounded-lg px-3 py-1">
                      <span className="text-xs font-semibold text-[var(--muted-foreground)]">Theme</span>
                      <ThemeSwitcher />
                    </div>

                    <div className="my-2 h-px w-full bg-[var(--border)]/50" />

                    <button
                      className="flex min-h-11 w-full items-center gap-3 rounded-lg px-3 text-sm font-bold text-red-500 transition-colors hover:bg-red-500/10 focus:outline-none"
                      onClick={() => {
                        setMobileMenuOpen(false);
                        onLogout();
                      }}
                      type="button"
                    >
                      <LogOut size={18} />
                      <span className="truncate tracking-wide">Sign out {session.user.name.split(' ')[0]}</span>
                    </button>
                  </nav>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        </header>

        <main className="relative flex min-w-0 flex-1 flex-col">
          <div className="mobile-safe-bottom mx-auto flex w-full max-w-[1800px] flex-1 flex-col p-3 sm:p-5 md:p-5 xl:p-6 2xl:p-8">
            {children}
          </div>
        </main>

        <Footer
          publicSettings={publicSettings}
          supportHref={publicSettings.support.ticketsEnabled ? undefined : null}
        />
      </div>
    </Shell>
  );
}
