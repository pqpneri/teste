(() => {
  'use strict';

  const tabs = document.querySelector('.tabs');
  if (!tabs) return;

  const isVisible = (el) => {
    if (!el || el.hidden) return false;
    const style = getComputedStyle(el);
    return style.display !== 'none' && style.visibility !== 'hidden';
  };

  const syncTabs = () => {
    const visible = [...tabs.querySelectorAll('.tab-button')].filter(isVisible);
    const count = Math.max(1, visible.length);
    tabs.style.setProperty('--visible-tabs', String(count));
    tabs.dataset.visibleTabs = String(count);

    visible.forEach((button, index) => {
      button.style.setProperty('--tab-index', String(index));
      button.setAttribute('aria-posinset', String(index + 1));
      button.setAttribute('aria-setsize', String(count));
    });
  };

  const observer = new MutationObserver(syncTabs);
  observer.observe(tabs, {
    subtree: true,
    attributes: true,
    attributeFilter: ['hidden', 'style', 'class', 'aria-hidden']
  });

  window.addEventListener('resize', syncTabs, { passive: true });
  window.addEventListener('orientationchange', () => setTimeout(syncTabs, 120), { passive: true });
  window.addEventListener('unigames:authenticated', () => setTimeout(syncTabs, 80));
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) setTimeout(syncTabs, 80);
  });

  syncTabs();
  setTimeout(syncTabs, 250);
})();
