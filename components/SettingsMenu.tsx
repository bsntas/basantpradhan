'use client';

import { useState, useRef, useEffect } from 'react';
import { usePrefs, type Theme } from './ThemeProvider';
import { PRICES, type CurrencyCode } from '@/lib/config';

const THEME_OPTIONS: { value: Theme; label: string; icon: React.ReactNode }[] = [
  {
    value: 'dark',
    label: 'Dark',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M21 12.79A9 9 0 1111.21 3a7 7 0 009.79 9.79z" />
      </svg>
    ),
  },
  {
    value: 'light',
    label: 'Light',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707M17.657 17.657l-.707-.707M6.343 6.343l-.707-.707M12 8a4 4 0 100 8 4 4 0 000-8z" />
      </svg>
    ),
  },
  {
    value: 'system',
    label: 'System',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>
    ),
  },
];

export default function SettingsMenu() {
  const [open, setOpen] = useState(false);
  const { theme, setTheme, currency, setCurrency } = usePrefs();
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  return (
    <div className="relative" ref={menuRef}>
      {/* Gear button */}
      <button
        onClick={() => setOpen(!open)}
        aria-label="Settings"
        aria-expanded={open}
        className={`p-1.5 rounded-sm border transition-all ${
          open
            ? 'border-gold text-gold bg-gold/10'
            : 'border-gold/30 text-cream-300 hover:border-gold/60 hover:text-gold'
        }`}
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      </button>

      {/* Dropdown panel */}
      {open && (
        <div className="absolute right-0 top-full mt-2 w-56 rounded-md shadow-xl border border-gold/20 bg-navy-800 z-[100]">
          {/* Appearance */}
          <div className="p-4 border-b border-gold/10">
            <p className="text-gold/70 text-xs uppercase tracking-[0.2em] mb-3 font-sans">
              Appearance
            </p>
            <div className="flex gap-1.5">
              {THEME_OPTIONS.map(({ value, label, icon }) => (
                <button
                  key={value}
                  onClick={() => { setTheme(value); setOpen(false); }}
                  className={`flex-1 flex flex-col items-center gap-1 py-2.5 px-1 rounded text-xs font-medium border transition-all ${
                    theme === value
                      ? 'border-gold bg-gold/15 text-gold'
                      : 'border-gold/20 text-cream-300 hover:border-gold/40 hover:text-cream-200 hover:bg-navy-700/50'
                  }`}
                >
                  {icon}
                  <span className="tracking-wide">{label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Currency */}
          <div className="p-4">
            <p className="text-gold/70 text-xs uppercase tracking-[0.2em] mb-3 font-sans">
              Currency
            </p>
            <div className="flex gap-1.5">
              {(Object.keys(PRICES) as CurrencyCode[]).map(code => {
                const price = PRICES[code];
                const active = currency === code;
                return (
                  <button
                    key={code}
                    onClick={() => { setCurrency(code); setOpen(false); }}
                    className={`flex-1 flex flex-col items-center gap-0.5 py-2.5 px-1 rounded text-xs font-medium border transition-all ${
                      active
                        ? 'border-gold bg-gold/15 text-gold'
                        : 'border-gold/20 text-cream-300 hover:border-gold/40 hover:text-cream-200 hover:bg-navy-700/50'
                    }`}
                  >
                    <span className="font-serif text-base leading-none">{price.symbol}</span>
                    <span className="tracking-wide">{code}</span>
                    <span className="text-[10px] opacity-60">{price.display}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
