import React from 'react';
import { cn } from './cn';

export function Shell({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen bg-transparent text-[var(--foreground)]">{children}</div>;
}

export function Panel({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <section className={cn('flex flex-col overflow-hidden rounded-[var(--radius-panel)] border border-[var(--border)] bg-[var(--card)] text-[var(--card-foreground)] shadow-[0_18px_55px_rgba(0,0,0,0.18)]', className)}>
      {children}
    </section>
  );
}

export function PanelHeader({ title, aside }: { title: React.ReactNode; aside?: React.ReactNode }) {
  return (
    <div className="flex shrink-0 items-center justify-between border-b border-[var(--border)] px-4 py-3">
      <span className="text-sm font-semibold text-[var(--foreground)]">{title}</span>
      {aside && (
        <Badge>
          {aside}
        </Badge>
      )}
    </div>
  );
}

export function Badge({
  children,
  tone = 'default',
  className
}: {
  children: React.ReactNode;
  tone?: 'default' | 'success' | 'danger';
  className?: string;
}) {
  return (
    <span className={cn(
      'inline-flex min-h-6 items-center rounded-full border px-2.5 text-xs font-medium',
      tone === 'success' && 'border-emerald-400/20 bg-emerald-400/10 text-emerald-300',
      tone === 'danger' && 'border-red-400/20 bg-red-400/10 text-red-300',
      tone === 'default' && 'border-[var(--border)] bg-[var(--secondary)] text-[var(--muted-foreground)]',
      className
    )}>
      {children}
    </span>
  );
}

export function EmptyState({ children, className }: { children: React.ReactNode; className?: string }) {
  return <p className={cn('text-sm text-[var(--muted-foreground)]', className ?? 'p-4')}>{children}</p>;
}

export function MetricCell({ label: l, value, accent, mono }: { label: React.ReactNode; value: React.ReactNode; accent?: boolean; mono?: boolean }) {
  return (
    <div className="px-5 py-4">
      <p className="mb-1 text-xs font-medium text-[var(--muted-foreground)]">{l}</p>
      <p className={cn('break-all text-base font-semibold', accent ? 'text-[var(--success)]' : 'text-[var(--foreground)]', mono ? 'font-mono text-xs' : '')}>
        {value}
      </p>
    </div>
  );
}
