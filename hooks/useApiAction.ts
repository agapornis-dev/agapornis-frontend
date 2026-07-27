import { useState, useCallback } from 'react';

type ToastFn = (message: string, type: 'success' | 'error') => void;

/**
 * Wraps async API operations with shared busy state and toast feedback.
 * Eliminates the repeated setBusy/try/catch/showToast/finally pattern
 * found across every screen component.
 */
export function useApiAction(showToast: ToastFn) {
  const [busy, setBusy] = useState(false);

  const run = useCallback(
    async <T = void>(
      action: () => Promise<T>,
      successMessage?: string
    ): Promise<T | undefined> => {
      setBusy(true);
      try {
        const result = await action();
        if (successMessage) showToast(successMessage, 'success');
        return result;
      } catch (e: any) {
        showToast(e.message || 'Something went wrong', 'error');
        return undefined;
      } finally {
        setBusy(false);
      }
    },
    [showToast]
  );

  return { busy, run };
}
