// Mede altura real do .promo-topbar e seta --promo-h dinamicamente.
// Antes usava fallback fixo (42 desktop / 99 mobile) → gap preto entre
// topbar e nav quando altura real difere, e conteúdo passava por trás
// do gap ao rolar.

(function () {
  'use strict';
  function update() {
    var bar = document.querySelector('.promo-topbar');
    var root = document.documentElement;
    if (!bar || !document.body.classList.contains('has-promo-topbar')) {
      root.style.setProperty('--promo-h', '0px');
      return;
    }
    var rect = bar.getBoundingClientRect();
    // arredonda pra inteiro pra evitar subpixels que abrem fenda
    var h = Math.ceil(rect.height) || 0;
    if (h > 0) root.style.setProperty('--promo-h', h + 'px');
  }

  // Mede assim que o DOM tá pronto
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', update);
  } else {
    update();
  }
  // Re-mede ao carregar fonts/imgs (mudam altura)
  window.addEventListener('load', update);
  // Re-mede em resize / mudança de orientação
  window.addEventListener('resize', update);
  window.addEventListener('orientationchange', update);
  // Observa mudanças na barra (item troca de texto, layout muda)
  if (window.ResizeObserver) {
    var ro = new ResizeObserver(update);
    function attach() {
      var bar = document.querySelector('.promo-topbar');
      if (bar) ro.observe(bar);
      else setTimeout(attach, 200);
    }
    attach();
  }
  // Re-mede quando classe has-promo-topbar muda (ex: toggle off)
  var mo = new MutationObserver(update);
  mo.observe(document.body, { attributes: true, attributeFilter: ['class'] });
})();
