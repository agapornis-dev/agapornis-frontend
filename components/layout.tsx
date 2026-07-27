import React from 'react';
import { 
  Server, 
  PlusCircle, 
  Cpu, 
  Egg, 
  Users, 
  DownloadCloud, 
  LogOut 
} from 'lucide-react';
import { ghostBtn } from '../lib/constants';
import { Session, Screen } from '../lib/types';
import { cn } from './ui'; // Assuming you have your cn utility here

interface LayoutProps {
  session: Session;
  screen: Screen;
  setScreen: (s: Screen) => void;
  logout: () => void;
  children: React.ReactNode;
}

export default function DashboardLayout({ session, screen, setScreen, logout, children }: LayoutProps) {
  const isStaff = ['owner', 'admin', 'support'].includes(session.user.role);
  const canManage = ['owner', 'admin'].includes(session.user.role);

  const navItems = [
    { id: 'servers', label: 'My Servers', icon: Server, show: true },
    { id: 'create', label: 'Create Server', icon: PlusCircle, show: canManage },
    { id: 'agents', label: 'Agents', icon: Cpu, show: canManage },
    { id: 'eggs', label: 'Eggs', icon: Egg, show: canManage },
    { id: 'users', label: 'Users', icon: Users, show: canManage },
    { id: 'updates', label: 'Agent updates', icon: DownloadCloud, show: canManage },
  ];

  return (
    <div className="flex min-h-screen flex-col bg-[var(--background)] font-sans text-[var(--foreground)] lg:flex-row">
      <aside className="flex flex-col bg-[var(--card)] lg:w-72 lg:border-r border-[var(--border)] shrink-0 shadow-sm lg:shadow-none relative z-10">
        
        {/* Header Section */}
        <div className="flex items-center justify-between p-5 border-b border-[var(--border)] lg:border-none lg:p-6 lg:pb-8">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--muted-foreground)]">Agapornis</p>
            <h1 className="text-2xl font-bold tracking-tight">Panel</h1>
          </div>
          
          {/* Mobile User/Logout */}
          <div className="flex items-center gap-3 lg:hidden">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-semibold">{session.user.name}</p>
              <p className="text-xs text-[var(--muted-foreground)] capitalize">{session.user.role}</p>
            </div>
            <button 
              onClick={logout} 
              className="rounded-md bg-[var(--secondary)] p-2 text-[var(--muted-foreground)] transition-colors hover:bg-[var(--destructive)]/10 hover:text-[var(--destructive)]"
              aria-label="Logout"
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>

        {/* Navigation Section */}
        <nav className="flex gap-1.5 overflow-x-auto px-4 py-3 border-b border-[var(--border)] lg:border-none lg:flex-col lg:overflow-visible lg:px-4 lg:py-0 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          {navItems.filter(i => i.show).map(item => {
            const Icon = item.icon;
            const isActive = screen === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setScreen(item.id as Screen)}
                className={cn(
                  'flex items-center gap-3 whitespace-nowrap rounded-md px-3.5 py-2.5 text-sm font-medium transition-all',
                  isActive 
                    ? 'bg-[var(--primary)] text-[var(--primary-foreground)] shadow-sm' 
                    : 'text-[var(--muted-foreground)] hover:bg-[var(--secondary)]/80 hover:text-[var(--foreground)]'
                )}
              >
                <Icon size={18} className={cn("shrink-0", isActive ? "opacity-100" : "opacity-70")} />
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* Desktop User Section */}
        <div className="mt-auto hidden border-t border-[var(--border)]/50 bg-[var(--card)] p-5 lg:block">
          <div className="mb-4 flex items-center gap-3 rounded-lg border border-[var(--border)] bg-[var(--secondary)]/30 p-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-[var(--primary)]/10 text-[var(--primary)] font-bold">
              {session.user.name.charAt(0).toUpperCase()}
            </div>
            <div className="overflow-hidden">
              <p className="truncate text-sm font-semibold text-[var(--foreground)] leading-tight">{session.user.name}</p>
              <p className="truncate text-xs text-[var(--muted-foreground)] capitalize mt-0.5">{session.user.role}</p>
            </div>
          </div>
          <button 
            className={cn(ghostBtn, 'flex w-full items-center justify-center gap-2 hover:bg-[var(--destructive)]/10 hover:text-[var(--destructive)]')} 
            onClick={logout}
          >
            <LogOut size={16} />
            Logout
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto p-4 md:p-8 lg:p-10 bg-[var(--background)]">
        <div className="mx-auto max-w-7xl">
          {children}
        </div>
      </main>
    </div>
  );
}
