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

  // ─── Install app (menu mobile #mm-install-app) ───
  const INSTALL_LABELS = {
    pt:'Instalar app', en:'Install app', es:'Instalar app', it:'Installa app',
    fr:"Installer l'app", de:'App installieren', ar:'تثبيت التطبيق'
  };
  function installL() {
    let lang = 'en';
    try { lang = (localStorage.getItem('mc_lang') || 'en').slice(0,2); } catch (_) {}
    return INSTALL_LABELS[lang] || INSTALL_LABELS.en;
  }
  function refreshInstallButton() {
    const btn = document.getElementById('mm-install-app');
    if (!btn) return;
    const show = !!window.MC_INSTALL_PROMPT && !isStandalone();
    btn.style.display = show ? '' : 'none';
    const label = btn.querySelector('span');
    if (label) label.textContent = installL();
  }
  window.mcInstallApp = async function () {
    const e = window.MC_INSTALL_PROMPT;
    if (!e) return;
    try {
      e.prompt();
      const choice = await e.userChoice;
      if (typeof window.track === 'function') window.track('pwa_install_prompt', { outcome: choice && choice.outcome });
    } catch (_) {}
    window.MC_INSTALL_PROMPT = null;
    refreshInstallButton();
  };
  document.addEventListener('DOMContentLoaded', refreshInstallButton);
  setTimeout(refreshInstallButton, 600);

  // ─── Toast de atualização (nova versão do SW assumiu) ───
  const UPDATE_LABELS = {
    pt:{ msg:'Nova versão disponível', btn:'Atualizar' }, en:{ msg:'New version available', btn:'Update' },
    es:{ msg:'Nueva versión disponible', btn:'Actualizar' }, it:{ msg:'Nuova versione disponibile', btn:'Aggiorna' },
    fr:{ msg:'Nouvelle version disponible', btn:'Mettre à jour' }, de:{ msg:'Neue Version verfügbar', btn:'Aktualisieren' },
    ar:{ msg:'إصدار جديد متاح', btn:'تحديث' }
  };
  function updateL() {
    let lang = 'en';
    try { lang = (localStorage.getItem('mc_lang') || 'en').slice(0,2); } catch (_) {}
    return UPDATE_LABELS[lang] || UPDATE_LABELS.en;
  }
  let _updateToastShown = false;
  function showUpdateToast() {
    if (_updateToastShown || document.getElementById('mc-update-toast')) return;
    _updateToastShown = true;
    const L = updateL();
    const t = document.createElement('div');
    t.id = 'mc-update-toast';
    t.setAttribute('role', 'status');
    t.style.cssText = 'position:fixed;left:50%;bottom:22px;transform:translateX(-50%);z-index:100000;display:flex;align-items:center;gap:12px;background:#10151F;border:1px solid rgba(240,180,41,.4);border-radius:12px;padding:11px 14px;box-shadow:0 10px 40px rgba(0,0,0,.5);font-family:Inter,system-ui,sans-serif;max-width:92vw;';
    t.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#F0B429" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0"><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/></svg>'
      + '<span style="color:#E8EDF2;font-size:13px;font-weight:600">' + L.msg + '</span>'
      + '<button id="mc-update-btn" style="margin-left:4px;background:linear-gradient(135deg,#F0B429,#D99A1E);color:#0A0D14;border:0;border-radius:8px;padding:7px 14px;font-size:12.5px;font-weight:800;cursor:pointer;font-family:inherit">' + L.btn + '</button>';
    document.body.appendChild(t);
    document.getElementById('mc-update-btn').addEventListener('click', function () {
      try { if (typeof window.track === 'function') window.track('pwa_update_applied', {}); } catch (_) {}
      location.reload();
    });
  }
  // sw.js faz skipWaiting+clients.claim → controllerchange dispara quando a nova versão assume.
  // Só mostra o toast se já havia controller (update real), não na 1ª visita.
  const _hadController = !!navigator.serviceWorker.controller;
  navigator.serviceWorker.addEventListener('controllerchange', function () {
    if (_hadController) showUpdateToast();
  });
})();
