// GTM bootstrap + Consent Mode v2 — single source of truth pra tracking
// Tags GA4 / Meta Pixel / Google Ads = configuradas no GTM (não no código).
// Regra dura: NUNCA chamar gtag() ou fbq() direto fora deste arquivo. Use track() em app.js.
// Histórico do erro 2026-04-12: GTM sobrescrevia gtag() e quebrava events custom.
// Solução: GTM container + dataLayer-only + Consent Mode v2.

// TODO: substituir GTM-XXXXXXX pelo container ID do Claude do tráfego depois que ele me passar.
var GTM_ID = 'GTM-XXXXXXX';

// 1. dataLayer init (PRECISA ser criado ANTES do GTM snippet senão eventos pré-load somem)
window.dataLayer = window.dataLayer || [];

// 2. gtag() shim — Consent Mode v2 e config tags do GTM esperam window.gtag existir
//    Esse gtag SÓ enfileira no dataLayer. Não faz fan-out. GTM consome dataLayer e dispara tags.
window.gtag = window.gtag || function(){ window.dataLayer.push(arguments); };

// 3. Consent Mode v2 — default DENIED (GDPR/LGPD baseline)
//    acceptCookies() em app.js dispara 'update' com 'granted' depois do user aceitar.
gtag('consent', 'default', {
  ad_storage:           'denied',
  analytics_storage:    'denied',
  ad_user_data:         'denied',
  ad_personalization:   'denied',
  functionality_storage:'granted',
  security_storage:     'granted',
  wait_for_update:      2000, // 2s pra acceptCookies disparar antes do GTM enviar evento
});

// 4. GTM snippet (carregamento eager — paid traffic precisa de Pixel firing ASAP).
//    GTM Tag "Meta Pixel Base" + "GA4 Config" carregam dentro do container.
if (GTM_ID && GTM_ID !== 'GTM-XXXXXXX') {
  (function(w,d,s,l,i){
    w[l] = w[l] || [];
    w[l].push({ 'gtm.start': new Date().getTime(), event: 'gtm.js' });
    var f = d.getElementsByTagName(s)[0];
    var j = d.createElement(s);
    var dl = l != 'dataLayer' ? '&l=' + l : '';
    j.async = true;
    j.src = 'https://www.googletagmanager.com/gtm.js?id=' + i + dl;
    f.parentNode.insertBefore(j, f);
  })(window, document, 'script', 'dataLayer', GTM_ID);
} else {
  // ===== FALLBACK TEMPORÁRIO (enquanto Claude do tráfego não passar GTM-ID real) =====
  // Carrega GA4 + Meta Pixel direto pra não ficar sem tracking client-side.
  // Remover esse bloco quando GTM_ID acima for substituído pelo real.
  console.warn('[tracking] GTM-ID placeholder. Carregando GA4 + Meta Pixel direto (fallback).');
  // GA4
  (function(){
    var gs = document.createElement('script');
    gs.async = true; gs.src = 'https://www.googletagmanager.com/gtag/js?id=G-CZ3L00NY77';
    document.head.appendChild(gs);
    gtag('js', new Date());
    gtag('config', 'G-CZ3L00NY77');
  })();
  // Meta Pixel
  (function(f,b,e,v,n,t,s){
    if(f.fbq && f.fbq.callMethod) return;
    n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};
    if(!f._fbq)f._fbq=n; n.push=n; n.loaded=true; n.version='2.0'; n.queue=n.queue||[];
    t=b.createElement(e); t.async=true; t.src=v;
    s=b.getElementsByTagName(e)[0]; s.parentNode.insertBefore(t,s);
  }(window,document,'script','https://connect.facebook.net/en_US/fbevents.js'));
  try {
    var _anon = localStorage.getItem('mc_anon') || '';
    if (!_anon) {
      _anon = (crypto.randomUUID && crypto.randomUUID()) || (Date.now()+'_'+Math.random().toString(36).slice(2));
      localStorage.setItem('mc_anon', _anon);
    }
    fbq('init', '813048241061812', _anon ? { external_id: _anon } : {});
    fbq('track', 'PageView');
  } catch(e){}
  // Listen pra dataLayer e re-disparar standard events (ponte temporária até GTM real)
  // GTM real vai fazer isso via Tag triggers; aqui replico inline pra dedup CAPI funcionar.
  var origPush = window.dataLayer.push.bind(window.dataLayer);
  var EVENT_MAP = {
    'coupon_copy':       'AddToCart',
    'checkout_click':    'InitiateCheckout',
    'firm_detail_open':  'ViewContent',
    'user_signup':       'CompleteRegistration',
    'loyalty_register':  'CompleteRegistration',
    'newsletter_subscribe':'Subscribe',
    'page_view':         'PageView',
  };
  var GA4_MAP = {
    'coupon_copy':       'add_to_cart',
    'checkout_click':    'begin_checkout',
    'firm_detail_open':  'view_item',
    'user_signup':       'sign_up',
    'loyalty_register':  'sign_up',
    'newsletter_subscribe':'sign_up',
    'page_view':         'page_view',
  };
  window.dataLayer.push = function(){
    var args = Array.prototype.slice.call(arguments);
    args.forEach(function(payload){
      if (!payload || typeof payload !== 'object' || !payload.event) return;
      try {
        var fbEvent = EVENT_MAP[payload.event];
        if (fbEvent && typeof fbq === 'function' && payload.event_id) {
          var fbPayload = {
            content_ids:  payload.content_ids || (payload.firm_id ? [payload.firm_id] : undefined),
            content_name: payload.content_name || undefined,
            content_type: payload.content_type || undefined,
            value:        (payload.ecommerce && payload.ecommerce.value) || payload.value || 0,
            currency:     (payload.ecommerce && payload.ecommerce.currency) || payload.currency || 'USD',
          };
          fbq('track', fbEvent, fbPayload, { eventID: payload.event_id });
        }
        var ga4Event = GA4_MAP[payload.event];
        if (ga4Event && typeof gtag === 'function') {
          gtag('event', ga4Event, {
            event_id:  payload.event_id,
            firm_id:   payload.firm_id || undefined,
            coupon:    payload.coupon || undefined,
            currency:  (payload.ecommerce && payload.ecommerce.currency) || 'USD',
            value:     (payload.ecommerce && payload.ecommerce.value) || 0,
            items:     (payload.ecommerce && payload.ecommerce.items) || undefined,
          });
        }
      } catch(e){ console.warn('[tracking fallback]', e); }
    });
    return origPush.apply(null, args);
  };
}
