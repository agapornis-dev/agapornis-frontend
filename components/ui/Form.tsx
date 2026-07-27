import React from 'react';
import { cn } from './cn';

export const formControlBase = 'bg-[var(--secondary)]/10 border-[var(--border)]/60 transition-all focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)]/30 font-medium';

export function formControlClass(...className: Array<string | false | null | undefined>) {
  return cn(formControlBase, ...className);
}

export function Switch({ checked, onChange, disabled }: { checked: boolean; onChange: (checked: boolean) => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative inline-flex h-5 w-9 shrink-0 items-center rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/50 focus:ring-offset-2 focus:ring-offset-[var(--background)]',
        disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer',
        checked ? 'bg-[var(--success)]' : 'bg-[var(--border)]'
      )}
    >
      <span className={cn('pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow-sm ring-0 transition-transform', checked ? 'translate-x-4' : 'translate-x-0')} />
    </button>
  );
}

export function ToggleCard({
  title,
  description,
  checked,
  onChange,
  minimal = false,
  disabled
}: {
  title: string;
  description?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  minimal?: boolean;
  disabled?: boolean;
}) {
  return (
    <label className={cn(
      'group flex items-center justify-between gap-4 rounded-xl border transition-all',
      disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer',
      minimal ? 'border-transparent py-1' : 'border-[var(--border)]/60 bg-[var(--secondary)]/5 px-4 py-3 hover:border-[var(--primary)]/40 hover:bg-[var(--primary)]/5',
      checked && !minimal && 'border-[var(--success)]/40 bg-[var(--primary)]/5'
    )}>
      <div className="flex flex-col gap-0.5">
        <span className={cn('font-bold text-[var(--foreground)] transition-colors group-hover:text-[var(--primary)]', minimal && 'text-sm')}>{title}</span>
        {description && <span className="pr-4 text-xs font-medium leading-relaxed text-[var(--muted-foreground)]/80">{description}</span>}
      </div>
      <Switch checked={checked} onChange={onChange} disabled={disabled} />
    </label>
  );
}

export function PageHeader({
  title,
  eyebrow,
  description,
  action,
  className
}: {
  title: React.ReactNode;
  eyebrow?: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <header className={cn('flex flex-col gap-4 border-b border-[var(--border)]/50 pb-6 sm:flex-row sm:items-end sm:justify-between', className)}>
      <div className="min-w-0">
        {eyebrow && <div className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-[var(--muted-foreground)]">{eyebrow}</div>}
        <h2 className="text-3xl font-extrabold tracking-tight text-[var(--foreground)] sm:text-4xl">
          {title}<span className="text-[var(--primary)]">.</span>
        </h2>
        {description && <p className="mt-2 text-sm font-medium text-[var(--muted-foreground)]/80">{description}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </header>
  );
}

export function PanelTitleBar({
  icon,
  title,
  subtitle,
  aside,
  className
}: {
  icon?: React.ReactNode;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  aside?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex items-center justify-between gap-4 border-b border-[var(--border)]/60 bg-[var(--secondary)]/10 px-6 py-4', className)}>
      <div className="flex min-w-0 items-center gap-3">
        {icon}
        <div className="min-w-0">
          <h3 className="truncate text-sm font-bold tracking-wide text-[var(--foreground)]">{title}</h3>
          {subtitle && <p className="mt-0.5 text-xs text-[var(--muted-foreground)]">{subtitle}</p>}
        </div>
      </div>
      {aside}
    </div>
  );
}
