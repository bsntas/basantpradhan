'use client';

import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import type { CurrencyCode } from '@/lib/config';

export type Theme = 'dark' | 'light' | 'system';

interface PrefsContextValue {
  theme: Theme;
  resolvedTheme: 'dark' | 'light';
  setTheme: (t: Theme) => void;
  currency: CurrencyCode;
  setCurrency: (c: CurrencyCode) => void;
}

const PrefsContext = createContext<PrefsContextValue>({
  theme: 'dark',
  resolvedTheme: 'dark',
  setTheme: () => {},
  currency: 'INR',
  setCurrency: () => {},
});

function getSystemPreference(): 'dark' | 'light' {
  if (typeof window === 'undefined') return 'dark';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function applyTheme(theme: Theme) {
  const resolved = theme === 'system' ? getSystemPreference() : theme;
  document.documentElement.classList.toggle('light', resolved === 'light');
  return resolved as 'dark' | 'light';
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('dark');
  const [resolvedTheme, setResolvedTheme] = useState<'dark' | 'light'>('dark');
  const [currency, setCurrencyState] = useState<CurrencyCode>('INR');

  useEffect(() => {
    const savedTheme = (localStorage.getItem('bp_theme') as Theme) || 'dark';
    setThemeState(savedTheme);
    setResolvedTheme(applyTheme(savedTheme));

    const savedCurrency = (localStorage.getItem('bp_currency') as CurrencyCode) || 'INR';
    setCurrencyState(savedCurrency);
  }, []);

  useEffect(() => {
    if (theme !== 'system') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => setResolvedTheme(applyTheme('system'));
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [theme]);

  const setTheme = useCallback((t: Theme) => {
    setThemeState(t);
    setResolvedTheme(applyTheme(t));
    localStorage.setItem('bp_theme', t);
  }, []);

  const setCurrency = useCallback((c: CurrencyCode) => {
    setCurrencyState(c);
    localStorage.setItem('bp_currency', c);
  }, []);

  return (
    <PrefsContext.Provider value={{ theme, resolvedTheme, setTheme, currency, setCurrency }}>
      {children}
    </PrefsContext.Provider>
  );
}

export const usePrefs = () => useContext(PrefsContext);
export const useTheme = usePrefs;
