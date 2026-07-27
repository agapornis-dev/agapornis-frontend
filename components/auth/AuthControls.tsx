import type { InputHTMLAttributes, ReactNode } from 'react';
import { Eye, EyeOff, Mail } from 'lucide-react';
import { motion } from 'motion/react';
import { inp } from '../../lib/constants';
import { cn } from '../ui';

export const authFieldVariants = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -6 }
};

export function AuthField({
  icon: Icon,
  className,
  endAdornment,
  hint,
  error,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & {
  icon: typeof Mail;
  endAdornment?: ReactNode;
  hint?: string;
  error?: string;
}) {
  return (
    <motion.div variants={authFieldVariants} className="relative group">
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
            'h-11 rounded-xl pl-10 text-base transition-[border-color,box-shadow,background-color] font-medium sm:text-sm',
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
      onClick={onToggle}
      aria-label={visible ? 'Hide password' : 'Show password'}
      className="flex h-8 w-8 items-center justify-center rounded-md text-[var(--muted-foreground)] transition-colors hover:bg-[var(--secondary)] hover:text-[var(--foreground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]/40"
    >
      {visible ? <EyeOff size={16} /> : <Eye size={16} />}
    </button>
  );
}
