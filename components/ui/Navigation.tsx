import React from 'react';
import { cn } from './cn';

export function NavItem({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex min-h-11 w-full items-center gap-3 rounded-lg px-3 text-left text-sm font-medium transition-[background-color,color,transform] active:scale-[0.985]',
        active
          ? 'bg-[var(--primary)] text-[var(--primary-foreground)] shadow-sm'
          : 'text-[var(--muted-foreground)] hover:bg-[var(--secondary)] hover:text-[var(--foreground)]'
      )}
    >
      {children}
    </button>
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
    <div className="flex min-w-full w-max snap-x snap-mandatory rounded-[var(--radius-panel)] border border-[var(--border)] bg-[var(--secondary)] p-1" role="tablist">
      {items.map(item => (
        <button
          key={item.value}
          className={cn(
            'flex min-h-10 shrink-0 snap-start items-center justify-center rounded-lg px-3 text-sm font-medium transition-[background-color,color,box-shadow,transform] active:scale-[0.98] md:min-w-[6.5rem] md:flex-1',
            value === item.value
              ? 'bg-[var(--primary)] text-[var(--primary-foreground)] shadow-sm'
              : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)]',
            item.disabled && 'cursor-not-allowed opacity-45 hover:text-[var(--muted-foreground)]'
          )}
          onClick={() => !item.disabled && onChange(item.value)}
          disabled={item.disabled}
          title={item.title}
          type="button"
          role="tab"
          aria-selected={value === item.value}
        >
          <span className="inline-flex items-center justify-center gap-2 whitespace-nowrap">
            {item.label}
          </span>
        </button>
      ))}
    </div>
  );
}
