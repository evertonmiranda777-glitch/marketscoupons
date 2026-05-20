// GTM bootstrap — container Markets Coupons GTM-WJGTVX8G
// Tags GA4 / Meta Pixel / Google Ads / Consent Mode v2 = configuradas no GTM (não no código).
// Regra dura: NUNCA chamar gtag() ou fbq() direto fora deste arquivo. Use track() em app.js.
// Histórico do erro 2026-04-12: GTM sobrescrevia gtag() e quebrava events custom.
// Solução: dataLayer-only + tags GTM com Custom Event triggers + dedup Pixel × CAPI via event_id.

var GTM_ID = 'GTM-WJGTVX8G';

// 1. dataLayer init (PRECISA ser criado ANTES do GTM snippet senão eventos pré-load somem)
window.dataLayer = window.dataLayer || [];

// 2. gtag() shim — Consent Mode v2 (tag "Consent Mode v2 - Default Denied" do GTM gerencia defaults).
//    Esse gtag SÓ enfileira no dataLayer. Não faz fan-out. GTM consome dataLayer e dispara tags.
window.gtag = window.gtag || function(){ window.dataLayer.push(arguments); };

// 3. GTM snippet (carregamento eager — paid traffic precisa de Pixel firing ASAP).
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
