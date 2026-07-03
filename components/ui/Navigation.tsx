import React from 'react';
import { motion } from 'motion/react';
import { cn } from './cn';

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
