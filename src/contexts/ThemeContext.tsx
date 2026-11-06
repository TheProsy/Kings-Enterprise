import React, { useEffect, useState } from 'react';
import { ThemeContext, type Theme } from './theme-context';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => {
    const saved = localStorage.getItem('buildstore_theme') as Theme | null;
    if (saved === 'light' || saved === 'dark') return saved;
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }
    return 'light';
  });

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute('content', theme === 'dark' ? '#0B1220' : '#172B4D');
    localStorage.setItem('buildstore_theme', theme);
  }, [theme]);

  const setTheme = (value: Theme) => setThemeState(value);
  const toggleTheme = () =>
    setThemeState((previous) => (previous === 'light' ? 'dark' : 'light'));

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}
