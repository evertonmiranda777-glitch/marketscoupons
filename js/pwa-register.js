// Markets Coupons — PWA registration + Push subscribe (Fase 1+2)
// Registra service worker, expõe window.MC_PWA.subscribePush() pra UI.

(function () {
  'use strict';
  if (!('serviceWorker' in navigator)) return;

  // VAPID public key (pode ser pública — só assina o servidor)
  const VAPID_PUBLIC = 'BD5A4Ys4-VdJA5qkkk6s4wgTzTJjrmgEy8XrqvATUnH07wyJrUEJK3sX05cCyxfcLDIjafJePYLODdQC-PkaaGw';

  let _swReg = null;

  // Registra SW após o load pra não competir com LCP
  window.addEventListener('load', function () {
    navigator.serviceWorker.register('/sw.js', { scope: '/' })
      .then(function (reg) {
        _swReg = reg;
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
        // Se já tem subscription, hidrata flag pra UI
        return reg.pushManager.getSubscription();
      })
      .then(function (sub) {
        window.MC_PWA = window.MC_PWA || {};
        window.MC_PWA.hasPushSubscription = !!sub;
        window.MC_PWA.pushSubscription = sub || null;
        // Dispara evento custom pra UI escutar
        document.dispatchEvent(new CustomEvent('mc-push-ready', { detail: { subscribed: !!sub } }));
      })
      .catch(function (e) {
        try { console.warn('[PWA] SW register fail', e); } catch (_) {}
      });
  });

  // Helpers
  function urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) outputArray[i] = rawData.charCodeAt(i);
    return outputArray;
  }

  function arrayBufferToBase64Url(buffer) {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
    return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }

  // Solicita permissão + assina + envia pro servidor.
  // Retorna { ok, reason, subscription }.
  async function subscribePush() {
    if (!_swReg) {
      // Aguarda registro do SW
      try { _swReg = await navigator.serviceWorker.ready; } catch (e) { return { ok: false, reason: 'sw_not_ready' }; }
    }
    if (!('PushManager' in window)) return { ok: false, reason: 'push_not_supported' };
    if (Notification.permission === 'denied') return { ok: false, reason: 'permission_denied' };

    let permission = Notification.permission;
    if (permission === 'default') {
      permission = await Notification.requestPermission();
      if (permission !== 'granted') return { ok: false, reason: 'permission_' + permission };
    }

    let sub;
    try {
      sub = await _swReg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC)
      });
    } catch (e) {
      return { ok: false, reason: 'subscribe_failed', error: String(e?.message || e) };
    }

    const key = sub.getKey ? sub.getKey('p256dh') : null;
    const auth = sub.getKey ? sub.getKey('auth') : null;
    const payload = {
      endpoint: sub.endpoint,
      keys: {
        p256dh: key ? arrayBufferToBase64Url(key) : null,
        auth: auth ? arrayBufferToBase64Url(auth) : null
      },
      anon_id: (function () { try { return localStorage.getItem('mc_anon') || null; } catch (_) { return null; } })(),
      user_id: (window._currentUser && window._currentUser.id) || null,
      lang: (function () { try { return localStorage.getItem('mc_lang') || 'en'; } catch (_) { return 'en'; } })()
    };

    try {
      const r = await fetch('/api/push?action=subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!r.ok) return { ok: false, reason: 'server_' + r.status };
    } catch (e) {
      return { ok: false, reason: 'fetch_failed', error: String(e?.message || e) };
    }

    window.MC_PWA = window.MC_PWA || {};
    window.MC_PWA.hasPushSubscription = true;
    window.MC_PWA.pushSubscription = sub;

    try {
      if (typeof window.track === 'function') {
        window.track('push_subscribed', { permission: Notification.permission });
      }
    } catch (_) {}

    return { ok: true, subscription: sub };
  }

  async function unsubscribePush() {
    if (!_swReg) try { _swReg = await navigator.serviceWorker.ready; } catch (_) {}
    if (!_swReg) return { ok: false, reason: 'sw_not_ready' };
    const sub = await _swReg.pushManager.getSubscription();
    if (!sub) return { ok: true, reason: 'not_subscribed' };
    const endpoint = sub.endpoint;
    try { await sub.unsubscribe(); } catch (_) {}
    try {
      await fetch('/api/push?action=unsubscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ endpoint })
      });
    } catch (_) {}
    window.MC_PWA = window.MC_PWA || {};
    window.MC_PWA.hasPushSubscription = false;
    window.MC_PWA.pushSubscription = null;
    try { if (typeof window.track === 'function') window.track('push_unsubscribed', {}); } catch (_) {}
    return { ok: true };
  }

  async function updatePushPrefs(prefs) {
    if (!_swReg) try { _swReg = await navigator.serviceWorker.ready; } catch (_) {}
    const sub = _swReg ? await _swReg.pushManager.getSubscription() : null;
    if (!sub) return { ok: false, reason: 'not_subscribed' };
    try {
      const r = await fetch('/api/push?action=prefs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(Object.assign({ endpoint: sub.endpoint }, prefs || {}))
      });
      return { ok: r.ok };
    } catch (_) { return { ok: false, reason: 'fetch_failed' }; }
  }

  function isStandalone() {
    return (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches)
      || window.navigator.standalone === true;
  }

  window.MC_PWA = {
    standalone: isStandalone(),
    hasPushSubscription: false,
    pushSubscription: null,
    subscribePush: subscribePush,
    unsubscribePush: unsubscribePush,
    updatePushPrefs: updatePushPrefs,
    pushSupported: ('serviceWorker' in navigator) && ('PushManager' in window) && ('Notification' in window),
    permission: ('Notification' in window) ? Notification.permission : 'unsupported'
  };

  window.addEventListener('beforeinstallprompt', function (e) {
    window.MC_INSTALL_PROMPT = e;
    try { if (typeof window.track === 'function') window.track('pwa_installable', { source: 'beforeinstallprompt' }); } catch (_) {}
  });
  window.addEventListener('appinstalled', function () {
    try { if (typeof window.track === 'function') window.track('pwa_installed', { method: 'browser_prompt' }); } catch (_) {}
    window.MC_INSTALL_PROMPT = null;
  });
  if (isStandalone()) {
    window.addEventListener('load', function () {
      try { if (typeof window.track === 'function') window.track('pwa_session', { display_mode: 'standalone' }); } catch (_) {}
    });
  }

  // UI hook: botão no mobile menu pra ativar/desativar push.
  // Mostra só se suporte existe; texto reflete o estado.
  function refreshPushButton() {
    const btn = document.getElementById('mm-push-toggle');
    if (!btn) return;
    if (!window.MC_PWA.pushSupported) { btn.style.display = 'none'; return; }
    btn.style.display = '';
    const label = btn.querySelector('span');
    if (label) {
      if (window.MC_PWA.hasPushSubscription) label.textContent = (window.t && window.t('push_disable')) || 'Desativar notificações';
      else label.textContent = (window.t && window.t('push_enable')) || 'Ativar notificações';
    }
  }

  window.mcTogglePush = async function () {
    if (window.MC_PWA.hasPushSubscription) {
      const r = await window.MC_PWA.unsubscribePush();
      if (r.ok) alert((window.t && window.t('push_disabled_ok')) || 'Notificações desativadas.');
    } else {
      const r = await window.MC_PWA.subscribePush();
      if (r.ok) alert((window.t && window.t('push_enabled_ok')) || 'Pronto! Você receberá notificações.');
      else if (r.reason === 'permission_denied') alert((window.t && window.t('push_denied')) || 'Permissão negada. Habilite nas configurações do navegador.');
      else alert((window.t && window.t('push_error')) || ('Erro: ' + (r.reason || 'unknown')));
    }
    refreshPushButton();
  };

  document.addEventListener('mc-push-ready', refreshPushButton);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', refreshPushButton);
  else setTimeout(refreshPushButton, 500);
})();
