'use client';
import { useEffect, useState } from 'react';
import { Moon, Sun } from 'lucide-react';
import { THEME_STORAGE_KEY, type Theme } from '@/lib/theme';

function setThemeClass(theme: Theme) {
  const html = document.documentElement;
  html.classList.toggle('light', theme === 'light');
  html.classList.toggle('dark', theme === 'dark');
}

let switchTimer: ReturnType<typeof setTimeout> | undefined;

/** Switch smoothly: cross-fade the whole page where supported, otherwise animate the colors. */
function applyTheme(theme: Theme) {
  const html = document.documentElement;
  const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const doc = document as Document & { startViewTransition?: (cb: () => void) => unknown };

  if (reduceMotion) {
    setThemeClass(theme);
  } else if (typeof doc.startViewTransition === 'function') {
    doc.startViewTransition(() => setThemeClass(theme));
  } else {
    html.classList.add('theme-switching');
    setThemeClass(theme);
    clearTimeout(switchTimer);
    switchTimer = setTimeout(() => html.classList.remove('theme-switching'), 450);
  }

  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // storage unavailable: the theme still applies for this visit
  }
}

/** Dark (original) / Light switch, shown in the header next to the user menu. */
export default function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>('dark');

  useEffect(() => {
    setTheme(document.documentElement.classList.contains('light') ? 'light' : 'dark');
  }, []);

  const choose = (next: Theme) => {
    setTheme(next);
    applyTheme(next);
  };

  return (
    <div
      role="radiogroup"
      aria-label="Color theme"
      className="flex items-center p-0.5 rounded-xl bg-slate-900/80 border border-slate-800"
    >
      {(
        [
          { id: 'dark', label: 'Dark', icon: <Moon size={13} /> },
          { id: 'light', label: 'Light', icon: <Sun size={13} /> },
        ] as const
      ).map((opt) => {
        const active = theme === opt.id;
        return (
          <button
            key={opt.id}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => choose(opt.id)}
            title={opt.id === 'dark' ? 'Dark mode (original)' : 'Light mode'}
            className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-semibold transition-all ${
              active
                ? opt.id === 'dark'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-amber-500 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {opt.icon}
            <span className="hidden lg:inline">{opt.label}</span>
          </button>
        );
      })}
    </div>
  );
}
