// Markets Coupons — PWA registration (Fase 1)
// Registra service worker e trackeia install/standalone events.

(function () {
  'use strict';
  if (!('serviceWorker' in navigator)) return;

  // Registra SW após o load pra não competir com LCP
  window.addEventListener('load', function () {
    navigator.serviceWorker.register('/sw.js', { scope: '/' })
      .then(function (reg) {
        // updates: quando vier nova versão, ativa em background
        if (reg.waiting) reg.waiting.postMessage('skipWaiting');
        reg.addEventListener('updatefound', function () {
          var nw = reg.installing;
          if (!nw) return;
          nw.addEventListener('statechange', function () {
            if (nw.state === 'installed' && navigator.serviceWorker.controller) {
              nw.postMessage('skipWaiting');
            }
          });
        });
      })
      .catch(function (e) {
        try { console.warn('[PWA] SW register fail', e); } catch (_) {}
      });
  });

  // Tracking: se estamos rodando em standalone (PWA já instalado)
  function isStandalone() {
    return window.matchMedia && window.matchMedia('(display-mode: standalone)').matches
      || window.navigator.standalone === true;
  }

  // Hint pra outros scripts (analytics, etc)
  window.MC_PWA = { standalone: isStandalone() };

  // beforeinstallprompt — Android/Chrome dispara quando o app é instalável
  window.addEventListener('beforeinstallprompt', function (e) {
    // Não chamamos prompt() automaticamente. Guardamos pra UI mostrar quando quiser.
    window.MC_INSTALL_PROMPT = e;
    try {
      if (typeof window.track === 'function') {
        window.track('pwa_installable', { source: 'beforeinstallprompt' });
      }
    } catch (_) {}
  });

  // appinstalled — Android/Chrome dispara quando user aceita a instalação
  window.addEventListener('appinstalled', function () {
    try {
      if (typeof window.track === 'function') {
        window.track('pwa_installed', { method: 'browser_prompt' });
      }
    } catch (_) {}
    window.MC_INSTALL_PROMPT = null;
  });

  // pageshow em modo standalone — dispara 1× por sessão app
  if (isStandalone()) {
    try {
      if (typeof window.track === 'function') {
        window.track('pwa_session', { display_mode: 'standalone' });
      } else {
        // se track ainda não carregou, espera o load
        window.addEventListener('load', function () {
          if (typeof window.track === 'function') {
            window.track('pwa_session', { display_mode: 'standalone' });
          }
        });
      }
    } catch (_) {}
  }
})();
