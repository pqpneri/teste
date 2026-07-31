(() => {
  'use strict';

  const MOBILE_MAX_WIDTH = 820;
  const MIN_DISTANCE = 68;
  const MAX_DURATION = 650;
  const DIRECTION_RATIO = 1.25;
  const EDGE_GUARD = 18;

  let startX = 0;
  let startY = 0;
  let startTime = 0;
  let tracking = false;
  let originTarget = null;

  const isMobile = () => window.matchMedia(`(max-width: ${MOBILE_MAX_WIDTH}px)`).matches;

  function isInteractive(target) {
    if (!(target instanceof Element)) return false;
    return Boolean(target.closest(
      'input, textarea, select, option, button, a, label, dialog, [contenteditable="true"], ' +
      '.product-suggestions, .autocomplete, .history-toolbar, .tabs, .mobile-bottom-nav, ' +
      '[data-no-swipe]'
    ));
  }

  function visibleTabs() {
    return [...document.querySelectorAll('.tab-button[data-tab]')].filter((button) => {
      const style = window.getComputedStyle(button);
      return !button.hidden && style.display !== 'none' && style.visibility !== 'hidden';
    });
  }

  function activeTabIndex(tabs) {
    return tabs.findIndex((button) => button.classList.contains('active'));
  }

  function showSwipeFeedback(direction) {
    const activePanel = document.querySelector('.tab-panel.active');
    if (!activePanel) return;
    activePanel.classList.remove('swipe-enter-left', 'swipe-enter-right');
    void activePanel.offsetWidth;
    activePanel.classList.add(direction === 'next' ? 'swipe-enter-right' : 'swipe-enter-left');
    window.setTimeout(() => {
      activePanel.classList.remove('swipe-enter-left', 'swipe-enter-right');
    }, 260);
  }

  function changeTab(direction) {
    const tabs = visibleTabs();
    const currentIndex = activeTabIndex(tabs);
    if (tabs.length < 2 || currentIndex < 0) return;

    const nextIndex = direction === 'next' ? currentIndex + 1 : currentIndex - 1;
    if (nextIndex < 0 || nextIndex >= tabs.length) return;

    tabs[nextIndex].click();
    showSwipeFeedback(direction);

    if (navigator.vibrate) navigator.vibrate(12);
  }

  document.addEventListener('touchstart', (event) => {
    if (!isMobile() || event.touches.length !== 1) return;

    const touch = event.touches[0];
    const viewportWidth = window.innerWidth;
    if (touch.clientX <= EDGE_GUARD || touch.clientX >= viewportWidth - EDGE_GUARD) return;
    if (isInteractive(event.target)) return;

    startX = touch.clientX;
    startY = touch.clientY;
    startTime = Date.now();
    originTarget = event.target;
    tracking = true;
  }, { passive: true });

  document.addEventListener('touchend', (event) => {
    if (!tracking || !isMobile() || event.changedTouches.length !== 1) {
      tracking = false;
      return;
    }

    const touch = event.changedTouches[0];
    const deltaX = touch.clientX - startX;
    const deltaY = touch.clientY - startY;
    const duration = Date.now() - startTime;

    tracking = false;

    if (duration > MAX_DURATION) return;
    if (Math.abs(deltaX) < MIN_DISTANCE) return;
    if (Math.abs(deltaX) < Math.abs(deltaY) * DIRECTION_RATIO) return;
    if (isInteractive(originTarget)) return;

    // Dedo para a esquerda: próxima aba. Dedo para a direita: aba anterior.
    changeTab(deltaX < 0 ? 'next' : 'previous');
  }, { passive: true });

  document.addEventListener('touchcancel', () => {
    tracking = false;
  }, { passive: true });
})();
