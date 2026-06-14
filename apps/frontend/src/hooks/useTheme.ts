import { useCallback, useEffect, useState } from 'react';
import { type Theme, useThemeStore } from '@/store/theme';

type Resolved = 'light' | 'dark';

function resolve(theme: Theme, prefersDark: boolean): Resolved {
  if (theme === 'system') return prefersDark ? 'dark' : 'light';
  return theme;
}

/**
 * Reads the persisted theme preference, resolves `system` against the OS
 * setting, and applies the `dark` class to <html>. Returns controls for UI.
 */
export function useTheme(): {
  theme: Theme;
  resolved: Resolved;
  setTheme: (theme: Theme) => void;
  toggle: () => void;
} {
  const theme = useThemeStore((s) => s.theme);
  const setTheme = useThemeStore((s) => s.setTheme);
  const [resolved, setResolved] = useState<Resolved>('dark');

  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const apply = (): void => {
      const next = resolve(theme, media.matches);
      setResolved(next);
      document.documentElement.classList.toggle('dark', next === 'dark');
    };
    apply();
    media.addEventListener('change', apply);
    return () => media.removeEventListener('change', apply);
  }, [theme]);

  const toggle = useCallback(() => {
    setTheme(resolved === 'dark' ? 'light' : 'dark');
  }, [resolved, setTheme]);

  return { theme, resolved, setTheme, toggle };
}
