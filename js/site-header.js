/* ──────────────────────────────────────────────────────────────
   HEADER NATIVO COMPARTILHADO , fonte ÚNICA. CSS + markup VERBATIM
   do nav do index.html (logo + busca + sino + idioma + Entrar/Cadastrar
   + as abas com ícones). Scoped sob #mc-site-hd. Igual ao /app.
   Inclui: <div id="mc-site-header"></div><script src="/js/site-header.js?v=1" defer></script>
   (precisa ser o PRIMEIRO elemento do <body>).
   ────────────────────────────────────────────────────────────── */
(function(){
  var LANGS=['pt','en','es','it','fr','de','ar','id'];
  function detLang(){
    try{
      var seg=(location.pathname||'').split('/').filter(Boolean)[0];
      if(LANGS.indexOf(seg)>=0) return seg;
      var qs=new URLSearchParams(location.search).get('lang'); if(LANGS.indexOf(qs)>=0) return qs;
      var st=localStorage.getItem('mc_lang'); if(LANGS.indexOf(st)>=0) return st;
      var h=(document.documentElement.lang||'').slice(0,2); if(LANGS.indexOf(h)>=0) return h;
      var n=(navigator.language||'en').slice(0,2); if(LANGS.indexOf(n)>=0) return n;
    }catch(e){}
    return 'en';
  }
  var L=detLang(), RTL=(L==='ar');

  var NAV={
    en:{nav_ofertas:"Specials",nav_firmas:"Firms",nav_plataformas:"Platforms",nav_indicadores:"Indicators",nav_comparar:"Compare",nav_calendario:"Economic Calendar",nav_heatmap:"Heat Map",nav_analise:"Daily Analysis",nav_gamma:"Gamma (GEX)",nav_guias:"Guides",nav_blog:"Blog",nav_calc:"Position Size",nav_quiz:"Quiz",nav_awards:"Awards",nav_live:"Live Room",btn_entrar:"Log in",btn_cadastrar:"Sign up",nav_search_placeholder:"Search firms, guides, tools..."},
    pt:{nav_ofertas:"Ofertas",nav_firmas:"Firmas",nav_plataformas:"Plataformas",nav_indicadores:"Indicadores",nav_comparar:"Comparar",nav_calendario:"Calendário Econômico",nav_heatmap:"Mapa de Calor",nav_analise:"Análise Diária",nav_gamma:"Gamma (GEX)",nav_guias:"Guias",nav_blog:"Blog",nav_calc:"Position Size",nav_quiz:"Quiz",nav_awards:"Awards",nav_live:"Live Room",btn_entrar:"Entrar",btn_cadastrar:"Cadastrar-se",nav_search_placeholder:"Buscar firmas, guias, ferramentas..."},
    es:{nav_ofertas:"Ofertas",nav_firmas:"Firms",nav_plataformas:"Plataformas",nav_indicadores:"Indicadores",nav_comparar:"Comparar",nav_calendario:"Calendario Económico",nav_heatmap:"Mapa de calor",nav_analise:"Análisis Diario",nav_gamma:"Gamma (GEX)",nav_guias:"Guías",nav_blog:"Blog",nav_calc:"Position Size",nav_quiz:"Quiz",nav_awards:"Awards",nav_live:"Live Room",btn_entrar:"Entrar",btn_cadastrar:"Registrarse",nav_search_placeholder:"Buscar firmas, guías, herramientas..."},
    it:{nav_ofertas:"Offerte",nav_firmas:"Firms",nav_plataformas:"Piattaforme",nav_indicadores:"Indicatori",nav_comparar:"Confronta",nav_calendario:"Calendario Económico",nav_heatmap:"Mappa termica",nav_analise:"Analisi Giornaliera",nav_gamma:"Gamma (GEX)",nav_guias:"Guide",nav_blog:"Blog",nav_calc:"Position Size",nav_quiz:"Quiz",nav_awards:"Awards",nav_live:"Live Room",btn_entrar:"Accedi",btn_cadastrar:"Registrati",nav_search_placeholder:"Cerca firme, guide, strumenti..."},
    fr:{nav_ofertas:"Offres",nav_firmas:"Firms",nav_plataformas:"Plateformes",nav_indicadores:"Indicateurs",nav_comparar:"Comparer",nav_calendario:"Calendrier Économique",nav_heatmap:"Carte thermique",nav_analise:"Analyse Quotidienne",nav_gamma:"Gamma (GEX)",nav_guias:"Guides",nav_blog:"Blog",nav_calc:"Position Size",nav_quiz:"Quiz",nav_awards:"Awards",nav_live:"Live Room",btn_entrar:"Se connecter",btn_cadastrar:"S'inscrire",nav_search_placeholder:"Rechercher firmes, guides, outils..."},
    de:{nav_ofertas:"Angebote",nav_firmas:"Firmen",nav_plataformas:"Plattformen",nav_indicadores:"Indikatoren",nav_comparar:"Vergleichen",nav_calendario:"Wirtschaftskalender",nav_heatmap:"Heatmap",nav_analise:"Tägliche Analyse",nav_gamma:"Gamma (GEX)",nav_guias:"Guides",nav_blog:"Blog",nav_calc:"Position Size",nav_quiz:"Quiz",nav_awards:"Awards",nav_live:"Live Room",btn_entrar:"Anmelden",btn_cadastrar:"Registrieren",nav_search_placeholder:"Firmen, Anleitungen, Tools suchen..."},
    ar:{nav_ofertas:"العروض",nav_firmas:"Firms",nav_plataformas:"المنصات",nav_indicadores:"المؤشرات",nav_comparar:"مقارنة",nav_calendario:"التقويم الاقتصادي",nav_heatmap:"خريطة الحرارة",nav_analise:"التحليل اليومي",nav_gamma:"Gamma (GEX)",nav_guias:"Guides",nav_blog:"مدونة",nav_calc:"Position Size",nav_quiz:"Quiz",nav_awards:"Awards",nav_live:"Live Room",btn_entrar:"دخول",btn_cadastrar:"التسجيل",nav_search_placeholder:"البحث عن شركات، أدلة، أدوات..."},
    id:{nav_ofertas:"Penawaran Spesial",nav_firmas:"Firma",nav_plataformas:"Platform",nav_indicadores:"Indikator",nav_comparar:"Bandingkan",nav_calendario:"Kalender Ekonomi",nav_heatmap:"Heat Map",nav_analise:"Analisis Harian",nav_gamma:"Gamma (GEX)",nav_guias:"Panduan",nav_blog:"Blog",nav_calc:"Ukuran Posisi",nav_quiz:"Kuis",nav_awards:"Penghargaan",nav_live:"Ruang Live",btn_entrar:"Masuk",btn_cadastrar:"Daftar",nav_search_placeholder:"Search firms, guides, tools..."}
  };
  var t=NAV[L]||NAV.en;
  function esc(s){return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}

  var I={
    tag:'<path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/>',
    firms:'<rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2"/>',
    plat:'<rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/>',
    ind:'<polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>',
    comp:'<line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>',
    cal:'<rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>',
    heat:'<rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>',
    ana:'<circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/>',
    gex:'<path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/>',
    guides:'<path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/>',
    blog:'<path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>',
    calc:'<rect x="4" y="2" width="16" height="20" rx="2"/><line x1="8" y1="6" x2="16" y2="6"/><line x1="8" y1="14" x2="16" y2="18"/>',
    quiz:'<circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/>',
    awards:'<circle cx="12" cy="8" r="7"/><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"/>',
    live:'<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>'
  };
  function svg(p){return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">'+p+'</svg>';}
  var TABS=[['/',I.tag,'nav_ofertas'],['/firms',I.firms,'nav_firmas'],['/platforms',I.plat,'nav_plataformas'],['/indicators',I.ind,'nav_indicadores'],['/compare',I.comp,'nav_comparar'],['/calendar',I.cal,'nav_calendario'],['/heatmap',I.heat,'nav_heatmap'],['/analysis',I.ana,'nav_analise'],['/gamma',I.gex,'nav_gamma'],['/guides',I.guides,'nav_guias'],['/blog',I.blog,'nav_blog'],['/calculator',I.calc,'nav_calc'],['/quiz',I.quiz,'nav_quiz'],['/awards',I.awards,'nav_awards']];
  var cur=(location.pathname||'').replace(/^\/(en|es|fr|de|it|ar|id)/,'')||'/';
  var tabsHtml=TABS.map(function(tb){var a=(tb[0]===cur)?' active':'';return '<a class="nt'+a+'" href="'+tb[0]+'">'+svg(tb[1])+esc(t[tb[2]])+'</a>';}).join('')+
    '<a class="nt nt-live'+(cur==='/live'?' active':'')+'" href="/live">'+svg(I.live)+esc(t.nav_live)+'</a>';

  var langOpts=[['pt','Português'],['en','English'],['es','Español'],['it','Italiano'],['fr','Français'],['de','Deutsch'],['ar','عربي'],['id','Bahasa Indonesia']]
    .map(function(o){return '<div class="lang-opt" onclick="MCHD_lang(\''+o[0]+'\')">'+o[1]+'</div>';}).join('');

  var logoSvg='<svg class="nav-logo-icon" width="28" height="28" viewBox="0 0 50 50" fill="none"><defs><linearGradient id="mchdlg" x1="0" y1="0" x2="50" y2="50"><stop offset="0%" stop-color="#FCD34D"/><stop offset="100%" stop-color="#D97706"/></linearGradient></defs><path d="M25 3L45 14.5V35.5L25 47 5 35.5V14.5Z" stroke="url(#mchdlg)" stroke-width="2.2" fill="none"/><path d="M14 33V20l11 8" stroke="url(#mchdlg)" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="M36 33V20l-11 8" stroke="url(#mchdlg)" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/><circle cx="25" cy="14" r="2" fill="url(#mchdlg)"/></svg>';

  // CSS verbatim do #nav + filhos, scoped sob #mc-site-hd, vars -> literais, position:sticky (sem overlap)
  var css='#mc-site-hd{position:sticky;top:0;left:0;right:0;z-index:900;display:flex;flex-direction:column;background:rgba(3,5,7,.85);backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);border-bottom:1px solid rgba(107,182,201,.18);font-family:Inter,system-ui,sans-serif;'+(RTL?'direction:rtl;':'')+'}'+
    '#mc-site-hd *{box-sizing:border-box}'+
    '#mc-site-hd .nav-top{display:flex;align-items:center;height:48px;padding:0 20px;gap:12px;border-bottom:1px solid rgba(107,182,201,.08)}'+
    '#mc-site-hd .nav-bot{display:flex;align-items:center;height:40px;padding:0 20px}'+
    '#mc-site-hd .nav-logo{font-size:15px;font-weight:700;letter-spacing:-.3px;cursor:pointer;white-space:nowrap;margin-right:12px;display:flex;align-items:center;gap:8px;flex-shrink:0;text-decoration:none;color:#fff}'+
    '#mc-site-hd .nav-logo em{color:#F0B429;font-style:normal;font-weight:700}#mc-site-hd .nav-logo span{font-weight:400;color:#fff}'+
    '#mc-site-hd .nav-search{flex:1;max-width:420px;position:relative}'+
    '#mc-site-hd .nav-search input{width:100%;padding:7px 14px 7px 34px;background:rgba(13,20,28,.78);border:1px solid rgba(107,182,201,.22);border-radius:8px;color:#fff;font-family:inherit;font-size:12px;outline:none;transition:.25s;cursor:pointer}'+
    '#mc-site-hd .nav-search input::placeholder{color:rgba(255,255,255,.3)}'+
    '#mc-site-hd .nav-search-ico{position:absolute;left:11px;top:50%;transform:translateY(-50%);color:rgba(255,255,255,.3);pointer-events:none;width:14px;height:14px}'+
    '#mc-site-hd .nav-r{display:flex;align-items:center;gap:8px;flex-shrink:0;margin-left:auto}'+
    '#mc-site-hd .nav-bell{position:relative;display:flex;align-items:center;justify-content:center;width:34px;height:34px;flex-shrink:0;background:rgba(107,182,201,.08);border:1px solid rgba(107,182,201,.18);border-radius:8px;color:#B8C5D6;cursor:pointer;transition:.25s;text-decoration:none}'+
    '#mc-site-hd .nav-bell:hover{border-color:rgba(240,180,41,.5);color:#F0B429}#mc-site-hd .nav-bell svg{width:17px;height:17px}'+
    '#mc-site-hd .nav-bell .nb-dot{position:absolute;top:6px;right:7px;width:6px;height:6px;border-radius:50%;background:#F0B429;box-shadow:0 0 0 2px #07090D}'+
    '#mc-site-hd .lang-btn{display:flex;align-items:center;gap:4px;padding:5px 9px;background:rgba(107,182,201,.08);border:1px solid rgba(107,182,201,.18);border-radius:7px;font-size:12px;font-weight:500;color:#B8C5D6;cursor:pointer;position:relative;transition:.25s}'+
    '#mc-site-hd .lang-btn:hover{border-color:#263145}'+
    '#mc-site-hd .lang-dd{position:absolute;top:100%;right:0;width:156px;padding-top:6px;z-index:1100;display:none}'+
    '#mc-site-hd .lang-btn:hover .lang-dd,#mc-site-hd .lang-btn.open .lang-dd{display:block}'+
    '#mc-site-hd .lang-dd-inner{background:rgba(20,27,39,.95);border:1px solid rgba(107,182,201,.18);border-radius:10px;padding:5px;box-shadow:0 12px 40px rgba(0,0,0,.6)}'+
    '#mc-site-hd .lang-opt{padding:7px 10px;border-radius:6px;font-size:12px;color:#B8C5D6;cursor:pointer;transition:.15s}#mc-site-hd .lang-opt:hover{background:rgba(107,182,201,.08);color:#EDF2F7}'+
    '#mc-site-hd .enter-btn{padding:7px 16px;background:rgba(13,20,28,.78);border:1px solid rgba(107,182,201,.22);border-radius:8px;color:#fff;font-family:inherit;font-size:12px;font-weight:600;cursor:pointer;transition:.25s;white-space:nowrap;text-decoration:none}'+
    '#mc-site-hd .enter-btn:hover{border-color:rgba(255,255,255,.15);background:rgba(107,182,201,.08)}'+
    '#mc-site-hd .signup-btn{padding:7px 16px;background:linear-gradient(90deg,#c8941a,#F0B429,#f5d060,#F0B429,#c8941a);background-size:200% 100%;border:none;border-radius:8px;color:#030507;font-family:inherit;font-size:12px;font-weight:700;cursor:pointer;transition:.25s;white-space:nowrap;text-decoration:none}'+
    '#mc-site-hd .signup-btn:hover{transform:translateY(-1px);box-shadow:0 4px 16px rgba(240,180,41,.25)}'+
    '#mc-site-hd .nav-tabs{display:flex;align-items:center;justify-content:center;flex:1;overflow-x:auto;scrollbar-width:none;gap:0}#mc-site-hd .nav-tabs::-webkit-scrollbar{display:none}'+
    '#mc-site-hd .nt{padding:0 9px;height:40px;background:none;border:none;color:rgba(255,255,255,.45);font-family:inherit;font-size:12px;font-weight:500;cursor:pointer;transition:color .2s,border-color .2s;white-space:nowrap;flex-shrink:0;border-bottom:2px solid transparent;display:inline-flex;align-items:center;gap:4px;text-decoration:none}'+
    '#mc-site-hd .nt svg{width:13px;height:13px;flex-shrink:0;opacity:.55;transition:opacity .2s}'+
    '#mc-site-hd .nt:hover svg,#mc-site-hd .nt.active svg{opacity:1}#mc-site-hd .nt:hover{color:#fff}#mc-site-hd .nt.active{color:#fff;border-bottom-color:#fff}'+
    '#mc-site-hd .nt-live{color:#EF4444;margin-left:4px}#mc-site-hd .nt-live:hover{color:#ff6b6b}#mc-site-hd .nt-live.active{color:#EF4444;border-bottom-color:#EF4444}'+
    '@media(max-width:820px){#mc-site-hd .nav-bot{display:none}#mc-site-hd .nav-search{display:none}}'+
    '@media(max-width:480px){#mc-site-hd .nav-logo span{display:none}#mc-site-hd .nav-r{gap:6px}#mc-site-hd .enter-btn,#mc-site-hd .signup-btn{padding:6px 11px;font-size:11px}}';

  var html='<header id="mc-site-hd"><div class="nav-top">'+
    '<a class="nav-logo" href="/">'+logoSvg+'<span><em>Markets</em> Coupons</span></a>'+
    '<div class="nav-search"><svg class="nav-search-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg><input type="text" readonly placeholder="'+esc(t.nav_search_placeholder)+'" onclick="location.href=\'/\'"></div>'+
    '<div class="nav-r">'+
    '<a class="nav-bell" href="/app" aria-label="App"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg><span class="nb-dot"></span></a>'+
    '<div class="lang-btn" onclick="event.stopPropagation();this.classList.toggle(\'open\')"><svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg><span>'+L.toUpperCase()+'</span><div class="lang-dd"><div class="lang-dd-inner">'+langOpts+'</div></div></div>'+
    '<a class="enter-btn" href="/">'+esc(t.btn_entrar)+'</a>'+
    '<a class="signup-btn" href="/">'+esc(t.btn_cadastrar)+'</a>'+
    '</div></div>'+
    '<div class="nav-bot"><nav class="nav-tabs">'+tabsHtml+'</nav></div></header>';

  var style=document.createElement('style'); style.textContent=css; document.head.appendChild(style);
  var slot=document.getElementById('mc-site-header');
  if(slot){ slot.outerHTML=html; } else { document.body.insertAdjacentHTML('afterbegin',html); }
  document.addEventListener('click',function(){var b=document.querySelector('#mc-site-hd .lang-btn.open');if(b)b.classList.remove('open');});

  window.MCHD_lang=function(l){ try{localStorage.setItem('mc_lang',l);}catch(_){ } var u=new URL(location.href); u.searchParams.set('lang',l); location.href=u.toString(); };
})();
