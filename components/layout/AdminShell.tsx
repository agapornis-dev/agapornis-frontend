import Link from 'next/link';
import { useState } from 'react';
import {
  ArrowLeft, ArrowRightLeft, BarChart3, BookTemplate, ChevronLeft, ChevronRight,
  Clock, DownloadCloud, LifeBuoy, LogOut, MapPin, Megaphone, Menu, Network, PlusSquare, ShieldAlert, SlidersHorizontal, Users, Webhook, X, UserPlus
} from 'lucide-react';
import type { AdminScreen, PanelPublicSettings, Session } from '../../lib/types';
import { SCREEN_TITLES } from '../../lib/utils';
import { cn, Shell } from '../ui';
import { Footer } from './Footer';
import { NotificationBell } from '../notifications/NotificationBell';

interface AdminShellProps {
  session: Session;
  screen: AdminScreen;
  setScreen: (screen: AdminScreen) => void;
  publicSettings: PanelPublicSettings;
  onLogout: () => void;
  children: React.ReactNode;
}

const adminNavigation = [
  { id: 'analytics' as const, label: 'Overview', icon: BarChart3 },
  { id: 'create' as const, label: 'Provision server', icon: PlusSquare },
  { id: 'agents' as const, label: 'Nodes & agents', icon: Network },
  { id: 'locations' as const, label: 'Locations', icon: MapPin },
  { id: 'security' as const, label: 'Security events', icon: ShieldAlert },
  { id: 'eggs' as const, label: 'Egg templates', icon: BookTemplate },
  { id: 'users' as const, label: 'Users', icon: Users },
  { id: 'supportTickets' as const, label: 'Support tickets', icon: LifeBuoy },
  { id: 'registrationInvites' as const, label: 'Registration invites', icon: UserPlus },
  { id: 'webhooks' as const, label: 'Webhooks', icon: Webhook },
  { id: 'cronjobs' as const, label: 'Cron jobs', icon: Clock },
  { id: 'updates' as const, label: 'Updates', icon: DownloadCloud },
  { id: 'infrastructure' as const, label: 'Transfers', icon: ArrowRightLeft },
  { id: 'settings' as const, label: 'Panel settings', icon: SlidersHorizontal }
];

export function AdminShell({ session, screen, setScreen, publicSettings, onLogout, children }: AdminShellProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [announcementDismissed, setAnnouncementDismissed] = useState(false);
  const announcement = publicSettings.announcement;
  const announcementTone = announcement.tone === 'critical'
    ? 'border-red-500/30 bg-red-500/10 text-red-300'
    : announcement.tone === 'warning'
      ? 'border-amber-500/30 bg-amber-500/10 text-amber-200'
      : 'border-[var(--primary)]/20 bg-[var(--card)] text-[var(--primary)]';

  const navigate = (next: AdminScreen) => {
    setScreen(next);
    setMobileOpen(false);
  };

  return (
    <Shell>
      <div className="flex h-screen overflow-hidden bg-[var(--background)]">
        
        {/* Mobile Overlay Overlay */}
        {mobileOpen && (
          <button 
            className="fixed inset-0 z-40 bg-[var(--background)]/80 backdrop-blur-sm transition-opacity lg:hidden" 
            onClick={() => setMobileOpen(false)} 
            aria-label="Close admin menu" 
          />
        )}

        {/* Sidebar */}
        <aside className={cn(
          'fixed inset-y-0 left-0 z-50 flex min-w-0 flex-col border-r border-[var(--border)]/60 bg-[var(--background)]/95 backdrop-blur-xl transition-[width,transform] duration-300 ease-in-out lg:static lg:translate-x-0',
          mobileOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full',
          collapsed ? 'lg:w-20' : 'w-64 lg:w-72'
        )}>

          {/* Sidebar Header / Brand */}
          <div className="flex h-16 shrink-0 items-center justify-between border-b border-[var(--border)]/60 px-4">
            <Link href="/" className={cn('flex items-center min-w-0 flex-1 outline-none group', collapsed && 'lg:hidden')}>
              <div className="flex flex-col">
                <div className="flex items-baseline">
                  <span className="truncate text-lg font-extrabold tracking-tight text-[var(--foreground)] transition-colors group-hover:text-[var(--primary)]">
                    {publicSettings.branding.name}
                  </span>
                  <span className="text-[var(--primary)] text-lg font-extrabold">.</span>
                </div>
              </div>
            </Link>

            <button 
              className="ml-auto hidden h-8 w-8 items-center justify-center rounded-md text-[var(--muted-foreground)] transition-colors hover:bg-[var(--secondary)]/50 hover:text-[var(--foreground)] focus:outline-none lg:inline-flex" 
              onClick={() => setCollapsed(value => !value)} 
              aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'} 
              type="button"
            >
              {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
            </button>
            <button 
              className="ml-auto inline-flex h-8 w-8 items-center justify-center rounded-md text-[var(--muted-foreground)] hover:bg-[var(--secondary)]/50 lg:hidden" 
              onClick={() => setMobileOpen(false)} 
              aria-label="Close menu" 
              type="button"
            >
              <X size={18} />
            </button>
          </div>

          {/* Navigation Items */}
          <nav className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden py-6 px-3" aria-label="Administration navigation">
            <div className="flex flex-col gap-1.5">
              {/* Optional Terminal-style section label */}
              {!collapsed && (
                <span className="mb-2 px-3 font-mono text-[9px] font-bold uppercase tracking-widest text-[var(--muted-foreground)]/40">
                  Modules
                </span>
              )}
              
              {adminNavigation.filter(item => item.id !== 'supportTickets' || publicSettings.support.ticketsEnabled).map(item => {
                const Icon = item.icon;
                const isActive = screen === item.id;
                
                return (
                  <button
                    key={item.id}
                    className={cn(
                      'group relative flex h-10 min-w-0 items-center rounded-lg transition-all duration-200 focus:outline-none',
                      'gap-3 px-3 text-left text-sm',
                      collapsed && 'lg:justify-center lg:gap-0 lg:px-0',
                      isActive 
                        ? 'font-semibold text-[var(--foreground)] bg-[var(--secondary)]/30' 
                        : 'font-medium text-[var(--muted-foreground)] hover:bg-[var(--secondary)]/20 hover:text-[var(--foreground)]'
                    )}
                    onClick={() => navigate(item.id)}
                    title={collapsed ? item.label : undefined}
                    aria-current={isActive ? 'page' : undefined}
                    type="button"
                  >
                    {/* Animated Vertical Indicator Line */}
                    <span 
                      className={cn(
                        "absolute left-0 top-1/2 w-[3px] -translate-y-1/2 rounded-r-full bg-[var(--primary)] transition-all duration-300",
                        isActive ? "h-1/2" : "h-0 group-hover:h-1/3 group-hover:bg-[var(--border)]"
                      )} 
                    />
                    
                    <Icon 
                      className={cn("shrink-0 transition-all duration-300", isActive ? "text-[var(--primary)]" : "text-[var(--muted-foreground)] group-hover:text-[var(--foreground)]")} 
                      size={16} 
                    />
                    <span className={cn('truncate tracking-wide', collapsed && 'lg:hidden')}>{item.label}</span>
                  </button>
                );
              })}
            </div>
          </nav>

          {/* Bottom Actions */}
          <div className="flex shrink-0 flex-col gap-2 border-t border-[var(--border)]/60 p-4">
            <Link 
              href="/" 
              className={cn(
                'group flex h-10 items-center gap-3 rounded-lg px-3 text-sm font-medium text-[var(--muted-foreground)] transition-all duration-200 hover:bg-[var(--secondary)]/40 hover:text-[var(--foreground)] focus:outline-none', 
                collapsed && 'lg:justify-center lg:gap-0 lg:px-0'
              )} 
              title={collapsed ? 'Back to panel' : undefined}
            >
              <ArrowLeft size={16} className="transition-transform group-hover:-translate-x-0.5" />
              <span className={cn('truncate tracking-wide', collapsed && 'lg:hidden')}>Back to panel</span>
            </Link>
            
            <button 
              className={cn(
                'group flex h-10 items-center gap-3 rounded-lg px-3 text-sm font-medium text-[var(--muted-foreground)] transition-all duration-200 hover:bg-red-500/10 hover:text-red-500 focus:outline-none focus:ring-2 focus:ring-red-500/30', 
                collapsed && 'lg:justify-center lg:gap-0 lg:px-0'
              )} 
              onClick={onLogout} 
              title={collapsed ? 'Sign out' : undefined} 
              type="button"
            >
              <LogOut size={16} className="transition-transform group-hover:-translate-x-0.5" />
              <span className={cn('truncate tracking-wide', collapsed && 'lg:hidden')}>Sign out {session.user.name}</span>
            </button>
          </div>
        </aside>

        {/* Main Content Area */}
        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          {announcement.enabled && !announcementDismissed && Boolean(announcement.title || announcement.message) && (
            <div className={cn('flex shrink-0 items-center gap-3 border-b px-4 py-2.5 md:px-8', announcementTone)}>
              <Megaphone size={16} className="shrink-0" />
              <p className="min-w-0 flex-1 text-sm"><span className="font-bold">{announcement.title}</span>{announcement.title && announcement.message && <span className="mx-2 opacity-50">—</span>}<span className="font-medium">{announcement.message}</span>{announcement.linkUrl && announcement.linkLabel && <a className="ml-3 font-bold underline underline-offset-4" href={announcement.linkUrl} target="_blank" rel="noopener noreferrer">{announcement.linkLabel}</a>}</p>
              <button className="rounded-md p-1 opacity-70 hover:bg-black/10 hover:opacity-100" onClick={() => setAnnouncementDismissed(true)} type="button" aria-label="Dismiss announcement"><X size={16} /></button>
            </div>
          )}
          
          {/* Top Header */}
          <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center gap-4 border-b border-[var(--border)]/60 bg-[var(--background)]/80 px-4 backdrop-blur-xl md:px-8">
            <button 
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-[var(--muted-foreground)] hover:bg-[var(--secondary)]/50 focus:outline-none lg:hidden" 
              onClick={() => setMobileOpen(true)} 
              aria-label="Open admin menu" 
              type="button"
            >
              <Menu size={18} />
            </button>
            
            <div className="flex flex-col min-w-0">
              <h1 className="truncate text-xl font-bold tracking-tight text-[var(--foreground)]">{SCREEN_TITLES[screen]}</h1>
            </div>
            <div className="ml-auto"><NotificationBell /></div>
          </header>

          {/* Scrollable Content */}
          <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden relative">
            <main className="mx-auto w-full max-w-[1600px] p-4 sm:p-6 md:p-8">
              {children}
            </main>
            <Footer publicSettings={publicSettings} supportHref={publicSettings.support.ticketsEnabled ? undefined : null} />
          </div>
        </div>
      </div>
    </Shell>
  );
}
