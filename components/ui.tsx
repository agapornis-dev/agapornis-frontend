import React from 'react';
import { motion } from 'motion/react';
import { label } from '../lib/constants';

export function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ');
}

export function Shell({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen bg-transparent text-[var(--foreground)]">{children}</div>;
}

export function NavItem({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <motion.button
      onClick={onClick}
      whileTap={{ scale: 0.98 }}
      className={cn(
        'flex min-h-10 w-full items-center gap-3 rounded-md px-3 text-left text-sm font-medium transition-colors',
        active
          ? 'bg-[var(--primary)] text-[var(--primary-foreground)] shadow-sm'
          : 'text-[var(--muted-foreground)] hover:bg-[var(--secondary)] hover:text-[var(--foreground)]'
      )}
    >
      {children}
    </motion.button>
  );
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

export function Field({ label: labelText, children }: { label: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="grid gap-2">
      <label className={label}>{labelText}</label>
      {children}
    </div>
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

export function Tabs({
  value,
  items,
  onChange
}: {
  value: string;
  items: Array<{ value: string; label: React.ReactNode; disabled?: boolean; title?: string }>;
  onChange: (value: string) => void;
}) {
  return (
    <div className="flex min-w-full w-max md:w-full border border-[var(--border)] bg-[var(--secondary)] rounded-[var(--radius-panel)] p-1">
      {items.map(item => (
        <motion.button
          key={item.value}
          whileHover={{ y: -1 }}
          whileTap={{ scale: 0.97 }}
          className={cn(
            'flex h-8 shrink-0 min-w-[7rem] items-center justify-center rounded-[var(--radius-panel)] px-3 text-sm font-medium transition-colors md:min-w-0 md:flex-1',
            value === item.value
              ? 'bg-[var(--primary)] text-[var(--primary-foreground)] shadow-sm'
              : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)]',
            item.disabled && 'cursor-not-allowed opacity-45 hover:text-[var(--muted-foreground)]'
          )}
          onClick={() => !item.disabled && onChange(item.value)}
          disabled={item.disabled}
          title={item.title}
          type="button"
        >
          <span className="inline-flex items-center justify-center gap-2 whitespace-nowrap">
            {item.label}
          </span>
        </motion.button>
      ))}
    </div>
  );
}
