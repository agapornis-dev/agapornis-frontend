import { FormEvent, useState } from 'react';
import { ArrowLeft, KeyRound, Loader2 } from 'lucide-react';
import { btn } from '../../lib/constants';
import { cn } from '../ui';
import { AuthField } from './AuthFields';

interface TwoFactorFormProps {
  busy: boolean;
  onSubmit: (code: string) => Promise<void>;
  onBack: () => void;
}

export function TwoFactorForm({ busy, onSubmit, onBack }: TwoFactorFormProps) {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    try {
      await onSubmit(code);
    } catch (err: any) {
      setError(err?.message || 'The authentication code was rejected.');
      setCode('');
    }
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-4">
      <AuthField
        icon={KeyRound}
        inputMode="text"
        autoComplete="one-time-code"
        placeholder="Authentication or recovery code"
        value={code}
        onChange={event => setCode(event.target.value)}
        required
        autoFocus
      />
      <button
        className={cn(
          btn,
          'group relative h-11 gap-2 rounded-xl text-sm font-bold',
          'bg-[var(--foreground)] text-[var(--background)]',
          'hover:bg-[var(--foreground)]/90 hover:shadow-lg',
          'focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/50',
          'disabled:opacity-50 disabled:cursor-not-allowed'
        )}
        disabled={busy || !code.trim()}
      >
        {busy
          ? <Loader2 size={18} className="animate-spin" />
          : <KeyRound size={18} className="transition-transform group-hover:scale-110 group-hover:text-[var(--primary)]" />
        }
        Verify and sign in
      </button>
      <button
        type="button"
        className="inline-flex items-center justify-center gap-1.5 text-sm font-semibold text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
        onClick={onBack}
      >
        <ArrowLeft size={14} />
        Back to sign in
      </button>
    </form>
  );
}
