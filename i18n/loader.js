// i18n loader — detecta idioma + carrega só EN (fallback) + idioma ativo (-300kb).
// Dispara evento mc-i18n-ready quando pronto. App.js espera antes de renderHome.
(function() {
  const PATH_LANGS = ['en', 'es', 'fr', 'de', 'it', 'ar'];

  function detectLang() {
    // 1) URL path /en/, /es/apex etc
    const parts = location.pathname.split('/').filter(Boolean);
    if (parts[0] && PATH_LANGS.includes(parts[0])) {
      try { localStorage.setItem('mc_lang', parts[0]); } catch(e){}
      return parts[0];
    }
    // 2) Query ?lang=
    try {
      const ql = new URLSearchParams(location.search).get('lang');
      if (ql && (PATH_LANGS.includes(ql) || ql === 'pt')) return ql;
    } catch(e){}
    // 3) Saved preference
    try {
      const saved = localStorage.getItem('mc_lang');
      if (saved && (PATH_LANGS.includes(saved) || saved === 'pt')) return saved;
    } catch(e){}
    // 4) Browser
    const nav = ((navigator.language || navigator.userLanguage || 'en') + '').toLowerCase();
    if (nav.indexOf('pt') === 0) return 'pt';
    if (nav.indexOf('en') === 0) return 'en';
    if (nav.indexOf('es') === 0) return 'es';
    if (nav.indexOf('it') === 0) return 'it';
    if (nav.indexOf('fr') === 0) return 'fr';
    if (nav.indexOf('de') === 0) return 'de';
    if (nav.indexOf('ar') === 0) return 'ar';
    return 'en';
  }

  window.I18N = window.I18N || {};
  window._mcLang = detectLang();

  function load(lang) {
    return new Promise(function(resolve) {
      if (window.I18N[lang]) { resolve(); return; }
      const s = document.createElement('script');
      s.src = '/i18n/' + lang + '.js?v=20260506';
      s.async = false; // mantém ordem em paralelo
      s.onload = resolve;
      s.onerror = resolve; // não bloqueia em erro
      document.head.appendChild(s);
    });
  }
  // Loader exposed pra setL() trocar idioma sob demanda
  window._loadLang = load;

  // Sempre carrega EN (fallback) + lang ativo (paralelo)
  const promises = [load('en')];
  if (window._mcLang !== 'en') promises.push(load(window._mcLang));
  Promise.all(promises).then(function() {
    window._mcI18nReady = true;
    window.dispatchEvent(new CustomEvent('mc-i18n-ready', { detail: { lang: window._mcLang } }));
  });
})();
