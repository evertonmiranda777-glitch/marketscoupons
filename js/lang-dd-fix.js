// Move o .lang-dd pra fora do #nav (que tem backdrop-filter criando
// stacking context que PRENDE até position:fixed). Apenda no body,
// posiciona via fixed, sincroniza visibilidade com .lang-btn.open.

(function () {
  'use strict';
  function init() {
    var btn = document.querySelector('.lang-btn');
    var dd = btn && btn.querySelector('.lang-dd');
    if (!btn || !dd) { setTimeout(init, 200); return; }

    // Portal: move pra fora do nav stacking context
    document.body.appendChild(dd);

    function position() {
      var r = btn.getBoundingClientRect();
      dd.style.top = Math.round(r.bottom) + 'px';
      dd.style.right = Math.round(window.innerWidth - r.right) + 'px';
    }
    function sync() {
      if (btn.classList.contains('open')) {
        dd.style.display = 'block';
        position();
      } else {
        dd.style.display = 'none';
      }
    }

    new MutationObserver(sync).observe(btn, { attributes: true, attributeFilter: ['class'] });
    btn.addEventListener('mouseenter', function () {
      // CSS antigo abria no hover; replicar via JS
      btn.classList.add('open');
    });
    btn.addEventListener('click', function () { setTimeout(sync, 0); });

    // Fecha quando clica fora
    document.addEventListener('click', function (e) {
      if (!btn.contains(e.target) && !dd.contains(e.target)) {
        btn.classList.remove('open');
      }
    });
    // Clique numa opção fecha
    dd.addEventListener('click', function (e) {
      if (e.target.classList.contains('lang-opt')) btn.classList.remove('open');
    });

    window.addEventListener('resize', function () { if (btn.classList.contains('open')) position(); });
    window.addEventListener('scroll', function () { if (btn.classList.contains('open')) position(); }, { passive: true });

    sync();
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
