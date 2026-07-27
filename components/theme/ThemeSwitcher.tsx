import { Laptop, Moon, Sun } from 'lucide-react';
import { cn } from '../ui';
import { ThemePreference, useTheme } from './ThemeProvider';

const choices: Array<{ value: ThemePreference; label: string; icon: typeof Laptop }> = [
  { value: 'auto', label: 'Auto', icon: Laptop },
  { value: 'dark', label: 'Dark', icon: Moon },
  { value: 'light', label: 'Light', icon: Sun },
];

export function ThemeSwitcher({
  className,
  compact = false,
  responsiveLabels = false,
}: {
  className?: string;
  compact?: boolean;
  responsiveLabels?: boolean;
}) {
  const { preference, setPreference } = useTheme();

  return (
    <div
      aria-label="Color theme"
      className={cn('inline-flex items-center gap-0.5 rounded-lg border border-[var(--border)]/80 bg-[var(--card)]/90 p-0.5 shadow-sm backdrop-blur-md', className)}
      role="group"
    >
      {choices.map(({ value, label, icon: Icon }) => {
        const active = preference === value;
        return (
          <button
            aria-label={`${label} theme`}
            aria-pressed={active}
            className={cn(
              'inline-flex h-7 items-center justify-center gap-1.5 rounded-md px-2 text-[11px] font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]/40',
              active
                ? 'bg-[var(--secondary)] text-[var(--foreground)] shadow-sm'
                : 'text-[var(--muted-foreground)] hover:bg-[var(--secondary)]/70 hover:text-[var(--foreground)]',
            )}
            key={value}
            onClick={() => setPreference(value)}
            title={`${label} theme`}
            type="button"
          >
            <Icon aria-hidden="true" size={13} strokeWidth={1.9} />
            <span className={cn(compact && 'sr-only', responsiveLabels && 'sr-only lg:not-sr-only')}>{label}</span>
          </button>
        );
      })}
    </div>
  );
}
