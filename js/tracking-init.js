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
