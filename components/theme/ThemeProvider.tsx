import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

export type ThemePreference = 'auto' | 'dark' | 'light';

const STORAGE_KEY = 'agapornis-theme';
const DARK_QUERY = '(prefers-color-scheme: dark)';

type ThemeContextValue = {
  preference: ThemePreference;
  setPreference: (preference: ThemePreference) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

function isThemePreference(value: string | null): value is ThemePreference {
  return value === 'auto' || value === 'dark' || value === 'light';
}

function applyTheme(preference: ThemePreference) {
  const resolved = preference === 'auto'
    ? window.matchMedia(DARK_QUERY).matches ? 'dark' : 'light'
    : preference;
  document.documentElement.dataset.theme = resolved;
  document.documentElement.style.colorScheme = resolved;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [preference, setPreferenceState] = useState<ThemePreference>('auto');

  useEffect(() => {
    let stored: string | null = null;
    try { stored = window.localStorage.getItem(STORAGE_KEY); } catch { /* Storage can be unavailable. */ }
    const initial = isThemePreference(stored) ? stored : 'auto';
    setPreferenceState(initial);
    applyTheme(initial);
  }, []);

  useEffect(() => {
    if (preference !== 'auto') return;
    const media = window.matchMedia(DARK_QUERY);
    const handleChange = () => applyTheme('auto');
    media.addEventListener('change', handleChange);
    return () => media.removeEventListener('change', handleChange);
  }, [preference]);

  const setPreference = useCallback((next: ThemePreference) => {
    setPreferenceState(next);
    applyTheme(next);
    try { window.localStorage.setItem(STORAGE_KEY, next); } catch { /* Keep the in-memory choice. */ }
  }, []);

  const value = useMemo(() => ({ preference, setPreference }), [preference, setPreference]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const value = useContext(ThemeContext);
  if (!value) throw new Error('useTheme must be used inside ThemeProvider');
  return value;
}
