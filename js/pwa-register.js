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
  // Labels self-contained pra evitar dependência do sistema i18n do site.
  const PUSH_LABELS = {
    pt: { enable:'Ativar notificações', disable:'Desativar notificações', ok:'Pronto! Você receberá notificações.', off:'Notificações desativadas.', denied:'Permissão negada. Habilite nas configurações do navegador.', error:'Erro' },
    en: { enable:'Enable notifications', disable:'Disable notifications', ok:'Done! You will receive notifications.', off:'Notifications disabled.', denied:'Permission denied. Enable in browser settings.', error:'Error' },
    es: { enable:'Activar notificaciones', disable:'Desactivar notificaciones', ok:'¡Listo! Recibirás notificaciones.', off:'Notificaciones desactivadas.', denied:'Permiso denegado. Habilita en la configuración del navegador.', error:'Error' },
    it: { enable:'Attiva notifiche', disable:'Disattiva notifiche', ok:'Fatto! Riceverai notifiche.', off:'Notifiche disattivate.', denied:'Permesso negato. Abilita nelle impostazioni del browser.', error:'Errore' },
    fr: { enable:'Activer les notifications', disable:'Désactiver les notifications', ok:'Prêt ! Vous recevrez des notifications.', off:'Notifications désactivées.', denied:'Permission refusée. Activez dans les paramètres du navigateur.', error:'Erreur' },
    de: { enable:'Benachrichtigungen aktivieren', disable:'Benachrichtigungen deaktivieren', ok:'Fertig! Sie erhalten Benachrichtigungen.', off:'Benachrichtigungen deaktiviert.', denied:'Berechtigung verweigert. Aktivieren Sie in den Browser-Einstellungen.', error:'Fehler' },
    ar: { enable:'تفعيل الإشعارات', disable:'إيقاف الإشعارات', ok:'تم! ستتلقى الإشعارات.', off:'تم إيقاف الإشعارات.', denied:'تم رفض الإذن. فعّله من إعدادات المتصفح.', error:'خطأ' }
  };
  function pushL() {
    let lang = 'en';
    try { lang = (localStorage.getItem('mc_lang') || 'en').slice(0,2); } catch (_) {}
    return PUSH_LABELS[lang] || PUSH_LABELS.en;
  }
  function refreshPushButton() {
    const btn = document.getElementById('mm-push-toggle');
    if (!btn) return;
    if (!window.MC_PWA.pushSupported) { btn.style.display = 'none'; return; }
    btn.style.display = '';
    const label = btn.querySelector('span');
    const L = pushL();
    if (label) label.textContent = window.MC_PWA.hasPushSubscription ? L.disable : L.enable;
  }

  window.mcTogglePush = async function () {
    const L = pushL();
    if (window.MC_PWA.hasPushSubscription) {
      const r = await window.MC_PWA.unsubscribePush();
      if (r.ok) alert(L.off);
    } else {
      const r = await window.MC_PWA.subscribePush();
      if (r.ok) alert(L.ok);
      else if (r.reason === 'permission_denied') alert(L.denied);
      else alert(L.error + ': ' + (r.reason || 'unknown'));
    }
    refreshPushButton();
  };

  document.addEventListener('mc-push-ready', refreshPushButton);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', refreshPushButton);
  else setTimeout(refreshPushButton, 500);

  // ==== Install banner (Fase 3) ====
  const INSTALL_LABELS = {
    pt: { title: 'Instalar Markets Coupons', body: 'Acesso rápido aos cupons direto do home screen.', cta: 'Instalar', dismiss: 'Agora não' },
    en: { title: 'Install Markets Coupons', body: 'Quick access to coupons right from your home screen.', cta: 'Install', dismiss: 'Not now' },
    es: { title: 'Instalar Markets Coupons', body: 'Acceso rápido a los cupones desde la pantalla de inicio.', cta: 'Instalar', dismiss: 'Ahora no' },
    it: { title: 'Installa Markets Coupons', body: 'Accesso rapido ai coupon dalla home.', cta: 'Installa', dismiss: 'Non ora' },
    fr: { title: 'Installer Markets Coupons', body: 'Accès rapide aux coupons depuis l’écran d’accueil.', cta: 'Installer', dismiss: 'Plus tard' },
    de: { title: 'Markets Coupons installieren', body: 'Schneller Zugriff auf Gutscheine vom Startbildschirm.', cta: 'Installieren', dismiss: 'Jetzt nicht' },
    ar: { title: 'تثبيت Markets Coupons', body: 'وصول سريع للكوبونات من الشاشة الرئيسية.', cta: 'تثبيت', dismiss: 'ليس الآن' }
  };
  function installL() {
    let lang = 'en';
    try { lang = (localStorage.getItem('mc_lang') || 'en').slice(0,2); } catch (_) {}
    return INSTALL_LABELS[lang] || INSTALL_LABELS.en;
  }
  function shouldShowInstallBanner() {
    if (isStandalone()) return false;
    if (!window.MC_INSTALL_PROMPT) return false;
    try {
      const snoozed = parseInt(localStorage.getItem('mc_pwa_install_snoozed_until') || '0', 10);
      if (snoozed && Date.now() < snoozed) return false;
      const installed = localStorage.getItem('mc_pwa_installed');
      if (installed === 'yes') return false;
    } catch (_) {}
    return true;
  }
  function snoozeInstall(days) {
    try { localStorage.setItem('mc_pwa_install_snoozed_until', String(Date.now() + days * 24 * 60 * 60 * 1000)); } catch (_) {}
  }
  function renderInstallBanner() {
    if (!shouldShowInstallBanner()) return;
    if (document.getElementById('mc-install-banner')) return;
    const L = installL();
    const el = document.createElement('div');
    el.id = 'mc-install-banner';
    el.style.cssText = 'position:fixed;left:16px;right:16px;bottom:16px;max-width:480px;margin:0 auto;background:#10151F;border:1px solid rgba(240,180,41,.42);border-radius:14px;padding:16px 18px;z-index:99998;box-shadow:0 12px 40px rgba(0,0,0,.6);font-family:Inter,system-ui,sans-serif;color:#fff;display:flex;align-items:center;gap:14px;animation:mcInstallSlide .25s ease-out';
    el.innerHTML = `
      <div style="flex:0 0 44px;width:44px;height:44px;border-radius:10px;background:#F0B429;display:flex;align-items:center;justify-content:center;color:#0A0D14;font-weight:800;font-size:22px">M</div>
      <div style="flex:1;min-width:0">
        <div style="font-size:14px;font-weight:700;color:#F0B429;margin-bottom:2px">${L.title}</div>
        <div style="font-size:12px;color:#9AA0A8;line-height:1.35">${L.body}</div>
      </div>
      <div style="display:flex;flex-direction:column;gap:6px;flex:0 0 auto">
        <button id="mc-install-cta" style="background:linear-gradient(135deg,#F0B429,#E0A020);color:#0A0D14;border:0;border-radius:8px;padding:9px 16px;font-weight:700;font-size:13px;cursor:pointer;white-space:nowrap">${L.cta}</button>
        <button id="mc-install-dismiss" style="background:transparent;color:#9AA0A8;border:0;font-size:11px;cursor:pointer;text-decoration:underline">${L.dismiss}</button>
      </div>
      <style>@keyframes mcInstallSlide{from{transform:translateY(120%);opacity:0}to{transform:translateY(0);opacity:1}}</style>
    `;
    document.body.appendChild(el);
    document.getElementById('mc-install-cta').addEventListener('click', async () => {
      const p = window.MC_INSTALL_PROMPT;
      if (!p) { el.remove(); return; }
      try { p.prompt(); } catch (_) {}
      try {
        const r = await p.userChoice;
        if (r && r.outcome === 'accepted') {
          try { localStorage.setItem('mc_pwa_installed', 'yes'); } catch (_) {}
          if (typeof window.track === 'function') window.track('pwa_install_accepted', {});
        } else {
          snoozeInstall(7);
          if (typeof window.track === 'function') window.track('pwa_install_dismissed', { source: 'prompt' });
        }
      } catch (_) {}
      window.MC_INSTALL_PROMPT = null;
      el.remove();
    });
    document.getElementById('mc-install-dismiss').addEventListener('click', () => {
      snoozeInstall(14);
      if (typeof window.track === 'function') window.track('pwa_install_dismissed', { source: 'snooze' });
      el.remove();
    });
    if (typeof window.track === 'function') window.track('pwa_install_banner_shown', {});
  }
  // Defer banner ~6s so it doesn't compete with LCP / initial scroll
  window.addEventListener('beforeinstallprompt', function () { setTimeout(renderInstallBanner, 6000); });
  // Also try after load in case event fired before listener
  window.addEventListener('load', function () { setTimeout(renderInstallBanner, 6500); });

  // ==== Update notification (Fase 3) ====
  function showUpdateToast() {
    if (document.getElementById('mc-update-toast')) return;
    let lang = 'en';
    try { lang = (localStorage.getItem('mc_lang') || 'en').slice(0,2); } catch (_) {}
    const UPDATE_TEXT = {
      pt: { msg: 'Nova versão disponível', cta: 'Atualizar' },
      en: { msg: 'New version available', cta: 'Update' },
      es: { msg: 'Nueva versión disponible', cta: 'Actualizar' },
      it: { msg: 'Nuova versione disponibile', cta: 'Aggiorna' },
      fr: { msg: 'Nouvelle version disponible', cta: 'Mettre à jour' },
      de: { msg: 'Neue Version verfügbar', cta: 'Aktualisieren' },
      ar: { msg: 'إصدار جديد متاح', cta: 'تحديث' }
    };
    const T = UPDATE_TEXT[lang] || UPDATE_TEXT.en;
    const el = document.createElement('div');
    el.id = 'mc-update-toast';
    el.style.cssText = 'position:fixed;right:16px;bottom:16px;background:#10151F;border:1px solid rgba(16,185,129,.42);border-radius:10px;padding:12px 16px;z-index:99998;box-shadow:0 8px 32px rgba(0,0,0,.5);font-family:Inter,system-ui,sans-serif;color:#fff;display:flex;align-items:center;gap:12px;font-size:13px';
    el.innerHTML = `
      <span>${T.msg}</span>
      <button style="background:#10B981;color:#0A0D14;border:0;border-radius:6px;padding:6px 12px;font-weight:700;cursor:pointer">${T.cta}</button>
    `;
    el.querySelector('button').addEventListener('click', () => { window.location.reload(); });
    document.body.appendChild(el);
  }
  navigator.serviceWorker.addEventListener('controllerchange', function () {
    showUpdateToast();
  });
})();
