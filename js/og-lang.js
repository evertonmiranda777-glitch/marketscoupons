// Patch og:image / twitter:image com sufixo de idioma (EN/ES/etc).
// Bots sociais que não executam JS pegam o PT default, comportamento intencional.
(function(){
  const p = new URLSearchParams(window.location.search);
  const h = window.location.hash;
  const langMatch = h.match(/lang=(\w{2})/) || p.get('lang');
  const lang = langMatch ? (typeof langMatch === 'string' ? langMatch : langMatch[1]) : null;
  if (lang && lang !== 'pt') {
    const ogImg = document.querySelector('meta[property="og:image"]');
    const twImg = document.querySelector('meta[name="twitter:image"]');
    const suffix = '-' + lang;
    if (ogImg) ogImg.content = 'https://www.marketscoupons.com/img/og-cover' + suffix + '.png';
    if (twImg) twImg.content = 'https://www.marketscoupons.com/img/og-cover' + suffix + '.png';
  }
})();
