(() => {
  'use strict';
  const VERSION = '2026.07.31-v24';
  const key = 'unigames_asset_version';

  async function clearOldWebCaches() {
    try {
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        await Promise.all(registrations.map((registration) => registration.unregister()));
      }
      if ('caches' in window) {
        const names = await caches.keys();
        await Promise.all(names.map((name) => caches.delete(name)));
      }
    } catch (error) {
      console.warn('Não foi possível limpar o cache antigo:', error);
    }
  }

  const previous = localStorage.getItem(key);
  if (previous !== VERSION) {
    localStorage.setItem(key, VERSION);
    clearOldWebCaches();
  }

  window.UNIGAMES_APP_VERSION = VERSION;
})();
