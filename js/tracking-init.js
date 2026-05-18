// TRACKING INIT — GA4 direto + Facebook Pixel. Sem GTM (GTM sobrescrevia
// window.gtag com alias dataLayer.push e quebrava gtag('event',...) custom).
// Carrega só após cookie consent (mc-cookies-consent === 'accepted').
window.dataLayer = window.dataLayer || [];

// fbq stub: enfileira chamadas pré-load (track/init de app.js continuam funcionando)
(function(f,b){
  if (f.fbq) return;
  var n = f.fbq = function(){ n.callMethod ? n.callMethod.apply(n,arguments) : n.queue.push(arguments); };
  if (!f._fbq) f._fbq = n;
  n.push = n; n.loaded = false; n.version = '2.0'; n.queue = [];
})(window, document);

function loadGA4() {
  if (window._ga4Loaded) return;
  window._ga4Loaded = true;
  var gs = document.createElement('script');
  gs.async = true;
  gs.src = 'https://www.googletagmanager.com/gtag/js?id=G-CZ3L00NY77';
  document.head.appendChild(gs);
  window.dataLayer = window.dataLayer || [];
  window.gtag = function () { dataLayer.push(arguments); };
  gtag('js', new Date());
  gtag('config', 'G-CZ3L00NY77');
}

function loadFbPixel() {
  if (window._fbPixelLoaded) return;
  window._fbPixelLoaded = true;
  // Carrega fbevents.js só agora (ate aqui fbq era stub que enfileirou chamadas)
  var t = document.createElement('script');
  t.async = true;
  t.src = 'https://connect.facebook.net/en_US/fbevents.js';
  var s = document.getElementsByTagName('script')[0];
  s.parentNode.insertBefore(t, s);
  var _anon = '';
  try {
    _anon = localStorage.getItem('mc_anon') || '';
    if (!_anon) {
      _anon = (crypto.randomUUID && crypto.randomUUID()) || (Date.now()+'_'+Math.random().toString(36).slice(2));
      localStorage.setItem('mc_anon', _anon);
    }
  } catch (e) {}
  fbq('init', '813048241061812', _anon ? { external_id: _anon } : {});
  fbq('track', 'PageView');
}

function loadTracking() {
  if (window._trackingLoaded) return;
  window._trackingLoaded = true;
  // GA4 imediato (script pequeno, sem regressão visível)
  loadGA4();
  // FB Pixel adiado: idle callback ou 2.5s fallback ou 1ª interação. PageView ainda conta.
  var fired = false;
  var fire = function(){ if (fired) return; fired = true; loadFbPixel(); };
  if ('requestIdleCallback' in window) {
    requestIdleCallback(fire, { timeout: 2500 });
  } else {
    setTimeout(fire, 2500);
  }
  // Flush em qualquer interação (não espera idle se user já mexeu)
  ['pointerdown','touchstart','scroll','keydown'].forEach(function(ev){
    addEventListener(ev, fire, { once: true, passive: true });
  });
  // Garante flush se user sair antes
  addEventListener('pagehide', fire);
}
window.loadTracking = loadTracking;

// Auto-load se já consentido
if (localStorage.getItem('mc-cookies-consent') === 'accepted') loadTracking();
