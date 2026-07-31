(() => {
  const STORAGE_KEY = 'unigames_theme';
  const root = document.documentElement;
  const saved = localStorage.getItem(STORAGE_KEY);
  const preferredDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches;
  const initial = saved || (preferredDark ? 'dark' : 'light');

  function apply(theme, animate = false) {
    root.dataset.theme = theme;
    root.style.colorScheme = theme;
    localStorage.setItem(STORAGE_KEY, theme);
    const button = document.getElementById('themeToggle');
    if (button) {
      button.setAttribute('aria-pressed', String(theme === 'dark'));
      button.title = theme === 'dark' ? 'Ativar modo claro' : 'Ativar modo escuro';
      if (animate) {
        button.classList.remove('theme-pulse');
        requestAnimationFrame(() => button.classList.add('theme-pulse'));
      }
    }
  }

  apply(initial);
  document.addEventListener('DOMContentLoaded', () => {
    apply(root.dataset.theme || initial);
    document.getElementById('themeToggle')?.addEventListener('click', () => {
      apply(root.dataset.theme === 'dark' ? 'light' : 'dark', true);
    });
  });
})();
