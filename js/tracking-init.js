// TRACKING INIT — GA4 direto + Facebook Pixel. Sem GTM (GTM sobrescrevia
// window.gtag com alias dataLayer.push e quebrava gtag('event',...) custom).
// Carrega só após cookie consent (mc-cookies-consent === 'accepted').
window.dataLayer = window.dataLayer || [];

function loadTracking() {
  if (window._trackingLoaded) return;
  window._trackingLoaded = true;
  // GA4
  var gs = document.createElement('script');
  gs.async = true;
  gs.src = 'https://www.googletagmanager.com/gtag/js?id=G-CZ3L00NY77';
  document.head.appendChild(gs);
  window.dataLayer = window.dataLayer || [];
  window.gtag = function () { dataLayer.push(arguments); };
  gtag('js', new Date());
  gtag('config', 'G-CZ3L00NY77');
  // Facebook Pixel
  !function (f, b, e, v, n, t, s) {
    if (f.fbq) return;
    n = f.fbq = function () { n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments); };
    if (!f._fbq) f._fbq = n;
    n.push = n; n.loaded = !0; n.version = '2.0'; n.queue = [];
    t = b.createElement(e); t.async = !0; t.src = v;
    s = b.getElementsByTagName(e)[0]; s.parentNode.insertBefore(t, s);
  }(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js');
  fbq('init', '813048241061812');
  fbq('track', 'PageView');
}
window.loadTracking = loadTracking;

// Auto-load se já consentido
if (localStorage.getItem('mc-cookies-consent') === 'accepted') loadTracking();
