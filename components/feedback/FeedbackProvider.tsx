import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, CheckCircle2, Info, X, XCircle } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { cn } from '../ui';

type ToastTone = 'success' | 'error' | 'info';
type ConfirmTone = 'default' | 'danger';

interface ToastItem {
  id: number;
  message: string;
  tone: ToastTone;
}

export interface ConfirmOptions {
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: ConfirmTone;
}

interface FeedbackContextValue {
  showToast: (message: string, tone?: ToastTone) => void;
  confirm: (options: ConfirmOptions) => Promise<boolean>;
}

const FeedbackContext = createContext<FeedbackContextValue | null>(null);

export function FeedbackProvider({
  children,
  portalClassName,
}: {
  children: React.ReactNode;
  portalClassName?: string;
}) {
  const [mounted, setMounted] = useState(false);
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [dialog, setDialog] = useState<ConfirmOptions | null>(null);
  const nextToastId = useRef(0);
  const toastTimers = useRef(new Map<number, ReturnType<typeof setTimeout>>());
  const dialogResolver = useRef<((confirmed: boolean) => void) | null>(null);

  useEffect(() => {
    setMounted(true);
    return () => {
      toastTimers.current.forEach(timer => clearTimeout(timer));
      dialogResolver.current?.(false);
    };
  }, []);

  const dismissToast = useCallback((id: number) => {
    const timer = toastTimers.current.get(id);
    if (timer) clearTimeout(timer);
    toastTimers.current.delete(id);
    setToasts(current => current.filter(toast => toast.id !== id));
  }, []);

  const showToast = useCallback((message: string, tone: ToastTone = 'success') => {
    const id = ++nextToastId.current;
    setToasts(current => [...current.slice(-3), { id, message, tone }]);
    const timer = setTimeout(() => dismissToast(id), tone === 'error' ? 6000 : 4500);
    toastTimers.current.set(id, timer);
  }, [dismissToast]);

  const confirm = useCallback((options: ConfirmOptions) => {
    dialogResolver.current?.(false);
    setDialog(options);
    return new Promise<boolean>(resolve => {
      dialogResolver.current = resolve;
    });
  }, []);

  const settleDialog = useCallback((confirmed: boolean) => {
    const resolve = dialogResolver.current;
    dialogResolver.current = null;
    setDialog(null);
    resolve?.(confirmed);
  }, []);

  const value = useMemo(() => ({ showToast, confirm }), [showToast, confirm]);

  return (
    <FeedbackContext.Provider value={value}>
      {children}
      {mounted && createPortal(
        <div className={portalClassName}>
          <ToastViewport toasts={toasts} onDismiss={dismissToast} />
          <AnimatePresence>
            {dialog && <ConfirmDialog options={dialog} onSettle={settleDialog} />}
          </AnimatePresence>
        </div>,
        document.body
      )}
    </FeedbackContext.Provider>
  );
}

export function useFeedback() {
  const context = useContext(FeedbackContext);
  if (!context) throw new Error('useFeedback must be used inside FeedbackProvider');
  return context;
}

export function useConfirm() {
  return useFeedback().confirm;
}

function ToastViewport({
  toasts,
  onDismiss,
}: {
  toasts: ToastItem[];
  onDismiss: (id: number) => void;
}) {
  return (
    <div
      className="pointer-events-none fixed inset-x-4 bottom-4 z-[100] flex flex-col items-end gap-2 sm:inset-x-auto sm:bottom-6 sm:right-6 sm:w-[380px]"
      aria-live="polite"
      aria-atomic="false"
    >
      <AnimatePresence initial={false} mode="popLayout">
        {toasts.map(toast => {
          const Icon =
            toast.tone === 'success' ? CheckCircle2
            : toast.tone === 'error' ? XCircle
            : Info;

          const title =
            toast.tone === 'success' ? 'Done'
            : toast.tone === 'error' ? 'Something went wrong'
            : 'Heads up';

          return (
            <motion.div
              layout
              key={toast.id}
              initial={{ opacity: 0, y: 14, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, x: 20, scale: 0.97 }}
              transition={{ type: 'spring', stiffness: 420, damping: 34, mass: 0.8 }}
              className="pointer-events-auto flex w-full items-start gap-3 rounded-2xl border border-[var(--border)]/60 bg-[var(--background)]/90 p-4 text-[var(--foreground)] shadow-2xl backdrop-blur-xl"
              role={toast.tone === 'error' ? 'alert' : 'status'}
            >
              {/* Tone stripe */}
              <span
                className={cn(
                  'mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border',
                  toast.tone === 'success' && 'border-[var(--success)]/30 bg-[var(--success)]/10 text-[var(--success)]',
                  toast.tone === 'error' && 'border-[var(--destructive)]/30 bg-[var(--destructive)]/10 text-[var(--destructive)]',
                  toast.tone === 'info' && 'border-[var(--primary)]/30 bg-[var(--primary)]/10 text-[var(--primary)]'
                )}
              >
                <Icon size={16} strokeWidth={2} />
              </span>

              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold leading-5">{title}</p>
                <p className="mt-0.5 break-words text-sm font-medium leading-5 text-[var(--muted-foreground)]">
                  {toast.message}
                </p>
              </div>

              <button
                type="button"
                className="group -mr-1 -mt-1 rounded-lg p-1.5 text-[var(--muted-foreground)] transition-colors hover:bg-[var(--secondary)]/20 hover:text-[var(--foreground)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--primary)]/50"
                onClick={() => onDismiss(toast.id)}
                aria-label="Dismiss notification"
              >
                <X size={14} />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}

// ─── Confirm Dialog ────────────────────────────────────────────────────────────

function ConfirmDialog({
  options,
  onSettle,
}: {
  options: ConfirmOptions;
  onSettle: (confirmed: boolean) => void;
}) {
  const confirmButton = useRef<HTMLButtonElement>(null);
  const cancelButton = useRef<HTMLButtonElement>(null);
  const tone = options.tone ?? 'default';

  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const frame = requestAnimationFrame(() => {
      (tone === 'danger' ? cancelButton.current : confirmButton.current)?.focus();
    });
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onSettle(false);
      }
      if (event.key === 'Tab') {
        const first = cancelButton.current;
        const last = confirmButton.current;
        if (!first || !last) return;
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener('keydown', handleKeyDown);
      previouslyFocused?.focus();
    };
  }, [onSettle, tone]);

  return (
    <motion.div
      className="fixed inset-0 z-[110] flex items-end justify-center bg-black/60 p-3 backdrop-blur-sm sm:items-center sm:p-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onMouseDown={event => {
        if (event.target === event.currentTarget) onSettle(false);
      }}
    >
      <motion.div
        className="w-full max-w-[460px] overflow-hidden rounded-2xl border border-[var(--border)]/60 bg-[var(--background)]/95 backdrop-blur-xl shadow-2xl"
        initial={{ opacity: 0, y: 18, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 10, scale: 0.985 }}
        transition={{ type: 'spring', stiffness: 420, damping: 34, mass: 0.8 }}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="feedback-dialog-title"
        aria-describedby={options.description ? 'feedback-dialog-description' : undefined}
      >
        {/* Header */}
        <div className="flex gap-4 p-6">
          <span
            className={cn(
              'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border',
              tone === 'danger'
                ? 'border-[var(--destructive)]/30 bg-[var(--destructive)]/10 text-[var(--destructive)]'
                : 'border-[var(--primary)]/30 bg-[var(--primary)]/10 text-[var(--primary)]'
            )}
          >
            {tone === 'danger' ? <AlertTriangle size={18} /> : <Info size={18} />}
          </span>

          <div className="min-w-0 pt-0.5">
            <h2
              id="feedback-dialog-title"
              className="text-base font-extrabold tracking-tight text-[var(--foreground)]"
            >
              {options.title}
              <span className={cn(tone === 'danger' ? 'text-[var(--destructive)]' : 'text-[var(--primary)]')}>.</span>
            </h2>
            {options.description && (
              <p
                id="feedback-dialog-description"
                className="mt-2 whitespace-pre-line text-sm font-medium leading-6 text-[var(--muted-foreground)]"
              >
                {options.description}
              </p>
            )}
          </div>
        </div>

        {/* Footer actions */}
        <div className="flex flex-col-reverse gap-2 border-t border-[var(--border)]/50 bg-[var(--secondary)]/5 p-4 sm:flex-row sm:justify-end">
          <button
            ref={cancelButton}
            type="button"
            className="h-10 rounded-xl border border-[var(--border)]/60 bg-transparent px-5 text-sm font-semibold text-[var(--foreground)] transition-all hover:bg-[var(--secondary)]/20 hover:border-[var(--border)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]/50"
            onClick={() => onSettle(false)}
          >
            {options.cancelLabel ?? 'Cancel'}
          </button>

          <button
            ref={confirmButton}
            type="button"
            className={cn(
              'group relative h-10 rounded-xl px-5 text-sm font-bold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)]',
              tone === 'danger'
                ? 'bg-[var(--destructive)] text-white hover:bg-[var(--destructive)]/90 hover:shadow-lg focus-visible:ring-[var(--destructive)]'
                : 'bg-[var(--foreground)] text-[var(--background)] hover:bg-[var(--foreground)]/90 hover:shadow-lg focus-visible:ring-[var(--primary)]'
            )}
            onClick={() => onSettle(true)}
          >
            {options.confirmLabel ?? 'Continue'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}