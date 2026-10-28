export type Theme = 'light' | 'dark';

export function readTheme(): Theme {
  try {
    const saved = localStorage.getItem('kingsland_theme');
    if (saved === 'light' || saved === 'dark') return saved;
  } catch { /* Private browsing may deny storage. */ }
  return 'light';
}

export function applyTheme(theme: Theme) {
  document.documentElement.classList.toggle('dark', theme === 'dark');
  document.documentElement.classList.toggle('light', theme === 'light');
  try { localStorage.setItem('kingsland_theme', theme); } catch { /* Theme still works without persistence. */ }
}
