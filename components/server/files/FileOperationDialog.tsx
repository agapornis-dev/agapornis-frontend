import { motion } from 'framer-motion';
import { btn, ghostBtn, inp } from '../../../lib/constants';

export function FileOperationDialog({
  title,
  description,
  label,
  value,
  submitLabel,
  busy,
  onChange,
  onCancel,
  onSubmit,
}: {
  title: string;
  description: string;
  label: string;
  value: string;
  submitLabel: string;
  busy: boolean;
  onChange: (value: string) => void;
  onCancel: () => void;
  onSubmit: (event: React.FormEvent) => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[110] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      onMouseDown={event => { if (event.currentTarget === event.target) onCancel(); }}
    >
      <motion.form
        initial={{ scale: 0.95, opacity: 0, y: 10 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 10 }}
        className="grid w-full max-w-md gap-4 rounded-xl border border-[var(--border)] bg-[var(--background)] p-5 shadow-2xl"
        onSubmit={onSubmit}
      >
        <div>
          <h3 className="font-semibold">{title}</h3>
          <p className="mt-1 text-xs leading-5 text-[var(--muted-foreground)]">{description}</p>
        </div>
        <label className="grid gap-1.5 text-xs font-semibold text-[var(--muted-foreground)]">
          {label}
          <input className={inp} autoFocus value={value} onChange={event => onChange(event.target.value)} />
        </label>
        <div className="flex justify-end gap-2">
          <button type="button" className={ghostBtn} onClick={onCancel}>Cancel</button>
          <button className={btn} disabled={busy || !value.trim()}>{submitLabel}</button>
        </div>
      </motion.form>
    </motion.div>
  );
}
