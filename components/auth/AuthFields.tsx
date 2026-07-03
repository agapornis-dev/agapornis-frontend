import React from 'react';
import { motion } from 'motion/react';
import { Eye, EyeOff, Mail } from 'lucide-react';
import { inp } from '../../lib/constants';
import { cn } from '../ui';

export const fieldVariants = {
  hidden: { opacity: 0, y: 10, filter: 'blur(4px)' },
  show: { opacity: 1, y: 0, filter: 'blur(0px)' },
  exit: { opacity: 0, y: -8, filter: 'blur(4px)' }
};

export function AuthField({
  icon: Icon,
  className,
  endAdornment,
  hint,
  error,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & {
  icon: typeof Mail;
  endAdornment?: React.ReactNode;
  hint?: string;
  error?: string;
}) {
  return (
    <motion.div variants={fieldVariants} className="relative group">
      <div className="relative">
        <Icon
          size={17}
          className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)] transition-colors group-focus-within:text-[var(--primary)]"
        />
        <input
          {...props}
          aria-invalid={!!error}
          className={cn(
            inp,
            'h-11 rounded-xl pl-10 text-sm transition-all font-medium',
            'bg-[var(--secondary)]/10 border-[var(--border)]/60',
            'focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)]/30',
            endAdornment && 'pr-10',
            error && 'border-[var(--destructive)]/50 focus:border-[var(--destructive)] focus:ring-[var(--destructive)]/30',
            className
          )}
        />
        {endAdornment && (
          <div className="absolute right-2 top-1/2 -translate-y-1/2">{endAdornment}</div>
        )}
      </div>
      {error ? (
        <p className="mt-1.5 pl-1 text-xs font-medium text-[var(--destructive)]">{error}</p>
      ) : hint ? (
        <p className="mt-1.5 pl-1 text-xs font-medium text-[var(--muted-foreground)]/70">{hint}</p>
      ) : null}
    </motion.div>
  );
}

export function PasswordToggle({ visible, onToggle }: { visible: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      tabIndex={-1}
      onClick={onToggle}
      aria-label={visible ? 'Hide password' : 'Show password'}
      className="flex h-7 w-7 items-center justify-center rounded-md text-[var(--muted-foreground)] transition-colors hover:text-[var(--foreground)]"
    >
      {visible ? <EyeOff size={16} /> : <Eye size={16} />}
    </button>
  );
}
