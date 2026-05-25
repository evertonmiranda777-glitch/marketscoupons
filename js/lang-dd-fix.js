// Posiciona o .lang-dd via JS pra escapar do stacking context do #nav.
// CSS usa position:fixed + custom props --lang-dd-top/--lang-dd-right.
// Sem isso, o dropdown ficava preso no z-index do nav (900) e bot-win
// (950) cobria.

(function () {
  'use strict';
  function pos() {
    var btn = document.querySelector('.lang-btn');
    if (!btn || !btn.classList.contains('open')) return;
    var r = btn.getBoundingClientRect();
    var root = document.documentElement;
    root.style.setProperty('--lang-dd-top', Math.round(r.bottom) + 'px');
    root.style.setProperty('--lang-dd-right', Math.round(window.innerWidth - r.right) + 'px');
  }

  // Mutation observer no .lang-btn pra detectar abrir/fechar
  function attach() {
    var btn = document.querySelector('.lang-btn');
    if (!btn) { setTimeout(attach, 200); return; }
    new MutationObserver(pos).observe(btn, { attributes: true, attributeFilter: ['class'] });
    btn.addEventListener('click', function () { setTimeout(pos, 0); });
    btn.addEventListener('mouseenter', pos);
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', attach);
  } else {
    attach();
  }
  window.addEventListener('resize', pos);
  window.addEventListener('scroll', pos, { passive: true });
})();
