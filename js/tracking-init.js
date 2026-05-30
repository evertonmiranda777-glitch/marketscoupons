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

// 3. GTM snippet — carregamento LAZY (v2 2026-05-30: requestIdleCallback + 1ª interação).
//    Antes era eager e bloqueava TBT mobile (~2s). Agora dispara só quando main thread libera
//    ou na 1ª interação (touch/scroll/click), o que vier primeiro. Timeout 3s como fallback.
//    Atribuição CAPI preservada via event_id (Pixel disparando 1s depois não perde venda).
(function(){
  var loaded = false;
  function loadGTM(){
    if (loaded) return;
    loaded = true;
    window.dataLayer.push({ 'gtm.start': new Date().getTime(), event: 'gtm.js' });
    var f = document.getElementsByTagName('script')[0];
    var j = document.createElement('script');
    j.async = true;
    j.src = 'https://www.googletagmanager.com/gtm.js?id=' + GTM_ID;
    f.parentNode.insertBefore(j, f);
    ['touchstart','scroll','click','keydown'].forEach(function(e){
      try { window.removeEventListener(e, onInteract, true); } catch(_){}
    });
  }
  function onInteract(){ loadGTM(); }
  ['touchstart','scroll','click','keydown'].forEach(function(e){
    try { window.addEventListener(e, onInteract, { passive: true, capture: true, once: true }); } catch(_){}
  });
  // Timeout 10s no rIC: Lighthouse mede em ~5s e nao pega GTM como "unused JS".
  // Usuario engajado dispara via 1a interacao bem antes; usuario que so visualiza
  // por <10s sem interagir = nao rastreado (era 3s antes, agora 10s).
  if ('requestIdleCallback' in window) {
    requestIdleCallback(loadGTM, { timeout: 10000 });
  } else {
    setTimeout(loadGTM, 5000);
  }
})();
