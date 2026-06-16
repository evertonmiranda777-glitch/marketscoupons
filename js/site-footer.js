/* ──────────────────────────────────────────────────────────────
   FOOTER NATIVO COMPARTILHADO , fonte ÚNICA de verdade.
   Qualquer página (standalone ou não) inclui:
     <div id="mc-site-footer"></div>
     <script src="/js/site-footer.js"></script>
   Mudou aqui = muda em TODAS as páginas. Auto-detecta idioma por
   <html lang> ou ?lang= ou /xx/ no path. Self-contained (estilo + i18n + firmas).
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

  // ── labels por idioma ──
  var T={
    desc:{pt:'Cupons verificados para as melhores prop firms. Ferramentas profissionais para traders de futuros e forex.',en:'Verified coupons for the best prop firms. Professional tools for futures and forex traders.',es:'Cupones verificados para las mejores prop firms. Herramientas profesionales para traders de futuros y forex.',it:'Coupon verificati per le migliori prop firm. Strumenti professionali per trader di futures e forex.',fr:'Coupons vérifiés pour les meilleures prop firms. Outils professionnels pour traders de futures et forex.',de:'Geprüfte Gutscheine für die besten Prop Firms. Profi-Tools für Futures- und Forex-Trader.',ar:'كوبونات موثّقة لأفضل شركات التداول. أدوات احترافية لمتداولي العقود الآجلة والفوركس.',id:'Kupon terverifikasi untuk prop firm terbaik. Alat profesional untuk trader futures dan forex.'},
    nl_label:{pt:'NEWSLETTER',en:'NEWSLETTER',es:'NEWSLETTER',it:'NEWSLETTER',fr:'NEWSLETTER',de:'NEWSLETTER',ar:'النشرة',id:'NEWSLETTER'},
    nl_desc:{pt:'Receba as melhores promos e dicas de Prop Firms toda semana.',en:'Get the best Prop Firm deals and tips every week.',es:'Recibe las mejores promos y consejos de Prop Firms cada semana.',it:'Ricevi le migliori promo e consigli sulle Prop Firm ogni settimana.',fr:'Recevez les meilleures promos et conseils Prop Firm chaque semaine.',de:'Erhalte jede Woche die besten Prop-Firm-Deals und Tipps.',ar:'احصل على أفضل عروض ونصائح شركات التداول كل أسبوع.',id:'Dapatkan promo dan tips Prop Firm terbaik setiap minggu.'},
    nl_btn:{pt:'Inscrever',en:'Subscribe',es:'Suscribirse',it:'Iscriviti',fr:"S'inscrire",de:'Abonnieren',ar:'اشتراك',id:'Berlangganan'},
    nl_ok:{pt:'Inscrito! Obrigado.',en:'Subscribed! Thanks.',es:'¡Suscrito! Gracias.',it:'Iscritto! Grazie.',fr:'Inscrit ! Merci.',de:'Abonniert! Danke.',ar:'تم الاشتراك! شكراً.',id:'Berlangganan! Terima kasih.'},
    c_firms:{pt:'Prop Firms',en:'Prop Firms',es:'Prop Firms',it:'Prop Firm',fr:'Prop Firms',de:'Prop Firms',ar:'شركات التداول',id:'Prop Firms'},
    c_tools:{pt:'Ferramentas',en:'Tools',es:'Herramientas',it:'Strumenti',fr:'Outils',de:'Tools',ar:'الأدوات',id:'Alat'},
    c_lists:{pt:'Top Listas',en:'Top Lists',es:'Top Listas',it:'Top Liste',fr:'Top Listes',de:'Top-Listen',ar:'أفضل القوائم',id:'Daftar Teratas'},
    c_links:{pt:'Links',en:'Links',es:'Links',it:'Link',fr:'Liens',de:'Links',ar:'روابط',id:'Tautan'},
    c_legal:{pt:'Legal',en:'Legal',es:'Legal',it:'Legale',fr:'Légal',de:'Rechtliches',ar:'قانوني',id:'Legal'},
    t_pos:{pt:'Position Size',en:'Position Size',es:'Position Size',it:'Position Size',fr:'Position Size',de:'Position Size',ar:'حجم المركز',id:'Position Size'},
    t_quiz:{pt:'Quiz de Firma',en:'Firm Quiz',es:'Quiz de Firma',it:'Quiz Firm',fr:'Quiz Firme',de:'Firmen-Quiz',ar:'اختبار الشركة',id:'Kuis Firma'},
    t_comp:{pt:'Comparador',en:'Comparison',es:'Comparador',it:'Comparatore',fr:'Comparateur',de:'Vergleich',ar:'المقارنة',id:'Pembanding'},
    t_cal:{pt:'Calendário',en:'Calendar',es:'Calendario',it:'Calendario',fr:'Calendrier',de:'Kalender',ar:'التقويم',id:'Kalender'},
    t_ind:{pt:'Indicadores',en:'Indicators',es:'Indicadores',it:'Indicatori',fr:'Indicateurs',de:'Indikatoren',ar:'المؤشرات',id:'Indikator'},
    t_gex:{pt:'Gamma (GEX)',en:'Gamma (GEX)',es:'Gamma (GEX)',it:'Gamma (GEX)',fr:'Gamma (GEX)',de:'Gamma (GEX)',ar:'Gamma (GEX)',id:'Gamma (GEX)'},
    t_app:{pt:'App e Alertas',en:'App & Alerts',es:'App y alertas',it:'App e avvisi',fr:'App et alertes',de:'App & Alerts',ar:'التطبيق والتنبيهات',id:'Aplikasi & notifikasi'},
    l_overall:{pt:'Melhores no Geral',en:'Best Overall',es:'Mejores en General',it:'Migliori in Assoluto',fr:'Meilleures Globales',de:'Beste insgesamt',ar:'الأفضل عموماً',id:'Terbaik Keseluruhan'},
    l_fut:{pt:'Melhores p/ Futuros',en:'Best for Futures',es:'Mejores para Futuros',it:'Migliori per Futures',fr:'Meilleures Futures',de:'Beste für Futures',ar:'الأفضل للعقود الآجلة',id:'Terbaik untuk Futures'},
    l_coup:{pt:'Com Cupom Exclusivo',en:'With Exclusive Coupon',es:'Con Cupón Exclusivo',it:'Con Coupon Esclusivo',fr:'Avec Coupon Exclusif',de:'Mit Exklusiv-Gutschein',ar:'بكوبون حصري',id:'Dengan Kupon Eksklusif'},
    l_nofee:{pt:'Sem Taxa de Ativação',en:'No Activation Fee',es:'Sin Cuota de Activación',it:'Senza Costo di Attivazione',fr:"Sans Frais d'Activation",de:'Ohne Aktivierungsgebühr',ar:'بدون رسوم تفعيل',id:'Tanpa Biaya Aktivasi'},
    l_cheap:{pt:'Mais Baratas',en:'Cheapest',es:'Más Baratas',it:'Più Economiche',fr:'Moins Chères',de:'Günstigste',ar:'الأرخص',id:'Termurah'},
    l_rated:{pt:'Melhor Avaliadas',en:'Highest Rated',es:'Mejor Valoradas',it:'Più Votate',fr:'Mieux Notées',de:'Bestbewertet',ar:'الأعلى تقييماً',id:'Rating Tertinggi'},
    n_guides:{pt:'Guias',en:'Guides',es:'Guías',it:'Guide',fr:'Guides',de:'Guides',ar:'الأدلة',id:'Panduan'},
    n_blog:{pt:'Blog',en:'Blog',es:'Blog',it:'Blog',fr:'Blog',de:'Blog',ar:'المدونة',id:'Blog'},
    n_live:{pt:'Live Room',en:'Live Room',es:'Live Room',it:'Live Room',fr:'Live Room',de:'Live Room',ar:'الغرفة المباشرة',id:'Live Room'},
    n_faq:{pt:'FAQ',en:'FAQ',es:'FAQ',it:'FAQ',fr:'FAQ',de:'FAQ',ar:'الأسئلة الشائعة',id:'FAQ'},
    lg_priv:{pt:'Política de Privacidade',en:'Privacy Policy',es:'Política de Privacidad',it:'Privacy',fr:'Confidentialité',de:'Datenschutz',ar:'سياسة الخصوصية',id:'Kebijakan Privasi'},
    lg_terms:{pt:'Termos de Uso',en:'Terms of Use',es:'Términos de Uso',it:'Termini',fr:"Conditions",de:'Nutzungsbedingungen',ar:'شروط الاستخدام',id:'Ketentuan'},
    lg_cookies:{pt:'Política de Cookies',en:'Cookie Policy',es:'Política de Cookies',it:'Cookie',fr:'Cookies',de:'Cookie-Richtlinie',ar:'سياسة الكوكيز',id:'Kebijakan Cookie'},
    bottom:{pt:'Todas as informações têm fins educacionais. Cupons sujeitos a alteração. Trading envolve risco. Termos, preços e benefícios podem ser alterados a qualquer momento sem aviso prévio.',en:'All information is for educational purposes. Coupons subject to change. Trading involves risk. Terms, prices and benefits may change at any time without notice.',es:'Toda la información tiene fines educativos. Cupones sujetos a cambios. El trading implica riesgo. Términos, precios y beneficios pueden cambiar sin aviso.',it:'Tutte le informazioni hanno scopo educativo. Coupon soggetti a modifiche. Il trading comporta rischi. Termini, prezzi e benefici possono cambiare senza preavviso.',fr:"Toutes les informations sont à but éducatif. Coupons sujets à modification. Le trading comporte des risques. Conditions, prix et avantages peuvent changer sans préavis.",de:'Alle Informationen dienen Bildungszwecken. Gutscheine können sich ändern. Trading birgt Risiken. Bedingungen, Preise und Vorteile können sich jederzeit ohne Vorankündigung ändern.',ar:'جميع المعلومات لأغراض تعليمية. الكوبونات قابلة للتغيير. التداول ينطوي على مخاطر. قد تتغير الشروط والأسعار والمزايا في أي وقت دون إشعار.',id:'Semua informasi untuk tujuan edukasi. Kupon dapat berubah. Trading melibatkan risiko. Syarat, harga, dan manfaat dapat berubah kapan saja tanpa pemberitahuan.'},
    risk_t:{pt:'Aviso de risco:',en:'Risk warning:',es:'Aviso de riesgo:',it:'Avviso di rischio:',fr:'Avertissement sur les risques :',de:'Risikohinweis:',ar:'تحذير المخاطر:',id:'Peringatan risiko:'},
    risk:{pt:'A negociação de futuros e forex envolve riscos substanciais e não é adequada para todos os investidores. Resultados passados não garantem resultados futuros. Capital de risco é o dinheiro que pode ser perdido sem comprometer a segurança financeira. O conteúdo é exclusivamente educacional e informativo, não constitui recomendação de investimento, consultoria financeira ou sinal de operação. Opere apenas com capital de risco.',en:'Trading futures and forex involves substantial risk and is not suitable for all investors. Past results do not guarantee future results. Risk capital is money that can be lost without jeopardizing financial security. Content is purely educational and informational, not investment advice, financial advisory or a trading signal. Trade only with risk capital.',es:'Operar futuros y forex implica un riesgo sustancial y no es adecuado para todos los inversores. Los resultados pasados no garantizan resultados futuros. El capital de riesgo es dinero que puede perderse sin comprometer la seguridad financiera. El contenido es puramente educativo e informativo, no es asesoramiento de inversión ni una señal de operación. Opera solo con capital de riesgo.',it:'Il trading di futures e forex comporta rischi sostanziali e non è adatto a tutti gli investitori. I risultati passati non garantiscono risultati futuri. Il capitale di rischio è denaro che può essere perso senza compromettere la sicurezza finanziaria. Il contenuto è puramente educativo e informativo, non è consulenza di investimento né un segnale operativo. Opera solo con capitale di rischio.',fr:"Le trading de futures et forex comporte des risques substantiels et ne convient pas à tous les investisseurs. Les résultats passés ne garantissent pas les résultats futurs. Le capital à risque est de l'argent qui peut être perdu sans compromettre la sécurité financière. Le contenu est purement éducatif et informatif, pas un conseil en investissement ni un signal de trading. Tradez uniquement avec du capital à risque.",de:'Der Handel mit Futures und Forex birgt erhebliche Risiken und ist nicht für alle Anleger geeignet. Vergangene Ergebnisse garantieren keine zukünftigen Ergebnisse. Risikokapital ist Geld, das verloren werden kann, ohne die finanzielle Sicherheit zu gefährden. Der Inhalt ist rein bildend und informativ, keine Anlageberatung oder ein Handelssignal. Handeln Sie nur mit Risikokapital.',ar:'تداول العقود الآجلة والفوركس ينطوي على مخاطر كبيرة وغير مناسب لجميع المستثمرين. النتائج السابقة لا تضمن النتائج المستقبلية. رأس المال المخاطر هو مال يمكن خسارته دون المساس بالأمان المالي. المحتوى تعليمي وإعلامي فقط، وليس توصية استثمارية أو إشارة تداول. تداول فقط برأس مال مخاطر.',id:'Trading futures dan forex melibatkan risiko besar dan tidak cocok untuk semua investor. Hasil masa lalu tidak menjamin hasil masa depan. Modal risiko adalah uang yang bisa hilang tanpa membahayakan keamanan finansial. Konten murni edukasi dan informasi, bukan saran investasi atau sinyal trading. Hanya trading dengan modal risiko.'}
  };
  function t(k){ var o=T[k]; return o?(o[L]||o.en):k; }

  // firmas (afiliado real) , neutras de idioma
  var FIRMS=[
    ['Apex Trader Funding','https://apextraderfunding.com/member/aff/go/evertonmiranda#block_660bfb7d9cd2c41901144ab4319f8644'],
    ['Bulenox','https://bulenox.com/member/aff/go/marketcoupons'],
    ['FTMO','https://trader.ftmo.com/?affiliates=eyfIptUCGgfcfaUlyrRP'],
    ['FundedNext','https://fundednext.com/futures?fpr=everton33'],
    ['Earn2Trade','https://www.earn2trade.com/purchase?plan=TCP25&a_pid=marketscoupons&a_bid=2e8e8a14'],
    ['The5ers','https://www.the5ers.com/?afmc=19jp'],
    ['Funding Pips','https://app.fundingpips.com/register?ref=31985EAA'],
    ['BrightFunded','https://brightfunded.com/a/CLNLTPxtT4Sok0PzHaRIIQ'],
    ['E8 Markets','https://e8markets.com/d/MARKET'],
    ['City Traders Imperium','https://app.citytradersimperium.com/user-auth/register?referral_code=1331c5&utm_source=client&utm_medium=referral&utm_id=1331c5'],
    ['TradeDay','https://www.tradeday.com/?a_aid=marketscoupons#pricing'],
    ['Blue Guardian','https://blueguardian.com/?afmc=MARKET'],
    ['Top One Futures','https://toponefutures.com/?linkId=lp_707970&sourceId=markets&tenantId=toponefutures'],
    ['Aqua Futures','https://checkout.aquafutures.io/ref/872/'],
    ['Blueberry Futures','https://portal.blueberryfutures.com/auth/signup?ref_code=MARKET-7652C'],
    ['Alpha Futures','https://app.alpha-futures.com/signup/Markets026158/'],
    ['Futures Elite','https://app.futureselite.com?aff=AFF5585615'],
    ['Goat Funded Futures','https://app.goatfundedfutures.com/sign-up?referral_id=MARKET']
  ];
  function ext(arr){ return arr.map(function(f){return '<a href="'+f[1]+'" target="_blank" rel="noopener noreferrer">'+f[0]+'</a>';}).join(''); }
  function lnk(items){ return items.map(function(i){return '<a href="'+i[1]+'"'+(i[2]?' target="_blank" rel="noopener noreferrer"':'')+'>'+i[0]+'</a>';}).join(''); }

  var tools=[[t('t_pos'),'/calculator'],[t('t_quiz'),'/quiz'],[t('t_comp'),'/compare'],[t('t_cal'),'/calendar'],[t('t_ind'),'/indicators'],[t('t_gex'),'/gamma'],[t('t_app'),'/app']];
  var lists=[[t('l_overall'),'/best-prop-firms'],[t('l_fut'),'/best-prop-firms-futures'],[t('l_coup'),'/best-prop-firms-with-coupon'],[t('l_nofee'),'/best-prop-firms-no-activation-fee'],[t('l_cheap'),'/cheapest-prop-firms'],[t('l_rated'),'/highest-rated-prop-firms']];
  var links=[['Telegram','https://t.me/marketcouponss',1],['Instagram','https://www.instagram.com/marketscoupons',1],['X','https://x.com/marketscoupons',1],['Threads','https://www.threads.com/@marketscoupons',1],[t('n_guides'),'/guides'],[t('n_blog'),'/blog'],[t('n_live'),'/live'],[t('n_faq'),'/faq']];
  var legal=[[t('lg_priv'),'/privacy'],[t('lg_terms'),'/terms'],[t('lg_cookies'),'/privacy#cookies']];

  var css='#mc-ft{background:#0b0f17;border-top:1px solid rgba(255,255,255,.08);color:#B8C5D6;font-family:Inter,system-ui,sans-serif;'+(RTL?'direction:rtl;':'')+'}#mc-ft *{box-sizing:border-box}#mc-ft .in{max-width:1200px;margin:0 auto;padding:48px 22px 0}#mc-ft .grid{display:grid;grid-template-columns:1.6fr repeat(5,1fr);gap:28px;margin-bottom:32px}#mc-ft .lg{display:flex;align-items:center;gap:8px;font-weight:800;font-size:19px;color:#fff;margin-bottom:12px}#mc-ft .lg em{font-style:normal;color:#F0B429}#mc-ft .ds{font-size:13px;color:#8A98AE;line-height:1.6;margin-bottom:16px;max-width:300px}#mc-ft .nl b{display:block;font-size:9px;font-weight:700;letter-spacing:1.2px;color:rgba(255,255,255,.35);margin-bottom:8px}#mc-ft .nl p{font-size:12px;color:#B8C5D6;margin:0 0 8px;line-height:1.5}#mc-ft .nlf{display:flex;gap:6px;max-width:320px}#mc-ft .nlf input{flex:1;min-width:0;padding:8px 12px;background:rgba(13,20,28,.78);border:1px solid rgba(107,182,201,.22);border-radius:7px;color:#fff;font-size:12px;outline:none}#mc-ft .nlf button{padding:8px 16px;background:#F0B429;color:#07090D;border:0;border-radius:7px;font-size:11px;font-weight:700;cursor:pointer;white-space:nowrap}#mc-ft .soc{display:flex;gap:10px;margin-top:16px}#mc-ft .soc a{width:38px;height:38px;border-radius:9px;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.08);display:flex;align-items:center;justify-content:center;color:#B8C5D6}#mc-ft .soc a:hover{color:#fff;border-color:rgba(240,180,41,.4)}#mc-ft .soc svg{width:18px;height:18px}#mc-ft h4{font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:1.2px;color:rgba(255,255,255,.35);margin:0 0 14px}#mc-ft .col a{display:block;font-size:12px;color:#B8C5D6;margin-bottom:9px;text-decoration:none;transition:.2s}#mc-ft .col a:hover{color:#fff}#mc-ft .bot{border-top:1px solid rgba(255,255,255,.08);padding:22px 0;text-align:center;font-size:12px;color:#8A98AE;line-height:1.7}#mc-ft .risk{padding:22px 0 32px;font-size:11.5px;color:#8A98AE;line-height:1.7;border-top:1px solid rgba(255,255,255,.06)}#mc-ft .risk b{color:#B8C5D6}@media(max-width:860px){#mc-ft .grid{grid-template-columns:1fr 1fr}}@media(max-width:520px){#mc-ft .grid{grid-template-columns:1fr}}';

  var SOC='<a href="https://t.me/marketcouponss" target="_blank" rel="noopener" aria-label="Telegram"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12l-6.871 4.326-2.962-.924c-.643-.204-.657-.643.136-.953l11.57-4.461c.537-.194 1.006.131.833.941z"/></svg></a>'+
    '<a href="https://www.instagram.com/marketscoupons" target="_blank" rel="noopener" aria-label="Instagram"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg></a>'+
    '<a href="https://www.facebook.com/marketscoupons/" target="_blank" rel="noopener" aria-label="Facebook"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg></a>'+
    '<a href="https://x.com/marketscoupons" target="_blank" rel="noopener" aria-label="X"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg></a>'+
    '<a href="https://www.threads.com/@marketscoupons" target="_blank" rel="noopener" aria-label="Threads"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M12.186 24h-.007c-3.581-.024-6.334-1.205-8.184-3.509C2.35 18.44 1.5 15.586 1.472 12.01v-.017c.03-3.579.879-6.43 2.525-8.482C5.845 1.205 8.6.024 12.18 0h.014c2.746.02 5.043.725 6.826 2.098 1.677 1.29 2.858 3.13 3.509 5.467l-2.04.569c-1.104-3.96-3.898-5.984-8.304-6.015-2.91.022-5.11.936-6.54 2.717-1.34 1.667-2.029 4.077-2.056 7.164.027 3.086.717 5.496 2.056 7.164 1.43 1.78 3.631 2.695 6.54 2.717 2.623-.02 4.358-.631 5.8-2.045 1.647-1.613 1.618-3.593 1.09-4.798-.31-.71-.873-1.3-1.634-1.75-.192 1.352-.622 2.446-1.284 3.272-.886 1.102-2.14 1.704-3.73 1.79-1.202.065-2.36-.218-3.259-.801-1.063-.689-1.685-1.74-1.752-2.964-.065-1.19.408-2.285 1.33-3.082.88-.76 2.119-1.207 3.583-1.291.515-.03 1.041-.046 1.585-.046.529 0 1.041.016 1.534.045-.126-.742-.375-1.332-.747-1.757-.51-.586-1.3-.883-2.346-.89h-.031c-.84 0-1.972.231-2.694 1.31L8.99 7.806c.97-1.435 2.547-2.225 4.45-2.225h.054c3.184.02 5.08 1.954 5.398 5.398.36.144.706.305 1.034.481 1.51.81 2.617 2.038 3.198 3.553.81 2.107.85 5.541-1.957 8.294-2.018 1.973-4.469 2.886-7.96 2.886z"/></svg></a>';

  var logoSvg='<svg width="26" height="26" viewBox="0 0 50 50" fill="none"><defs><linearGradient id="mcftlg" x1="0" y1="0" x2="50" y2="50"><stop offset="0%" stop-color="#FCD34D"/><stop offset="100%" stop-color="#D97706"/></linearGradient></defs><path d="M25 3L45 14.5V35.5L25 47 5 35.5V14.5Z" stroke="url(#mcftlg)" stroke-width="2.2" fill="none"/><path d="M14 33V20l11 8" stroke="url(#mcftlg)" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="M36 33V20l-11 8" stroke="url(#mcftlg)" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/><circle cx="25" cy="14" r="2" fill="url(#mcftlg)"/></svg>';

  var html='<footer id="mc-ft"><div class="in"><div class="grid">'+
    '<div><div class="lg">'+logoSvg+'<span><em>Markets</em> Coupons</span></div>'+
    '<p class="ds">'+t('desc')+'</p>'+
    '<div class="nl"><b>'+t('nl_label')+'</b><p>'+t('nl_desc')+'</p>'+
    '<form class="nlf" onsubmit="return MCFT_sub(event)"><input type="email" id="mcft-email" required placeholder="seu@email.com"><button type="submit">'+t('nl_btn')+'</button></form>'+
    '<div id="mcft-msg" style="font-size:11px;margin-top:6px;color:#10B981;display:none"></div></div>'+
    '<div class="soc">'+SOC+'</div></div>'+
    '<div class="col"><h4>'+t('c_firms')+'</h4>'+ext(FIRMS)+'</div>'+
    '<div class="col"><h4>'+t('c_tools')+'</h4>'+lnk(tools)+'</div>'+
    '<div class="col"><h4>'+t('c_lists')+'</h4>'+lnk(lists)+'</div>'+
    '<div class="col"><h4>'+t('c_links')+'</h4>'+lnk(links)+'</div>'+
    '<div class="col"><h4>'+t('c_legal')+'</h4>'+lnk(legal)+'</div>'+
    '</div></div>'+
    '<div class="in"><div class="bot">'+t('bottom')+' © '+(new Date().getFullYear())+' Markets Coupons.</div>'+
    '<div class="risk"><b>'+t('risk_t')+'</b> '+t('risk')+'</div></div></footer>';

  // injeta
  var style=document.createElement('style'); style.textContent=css; document.head.appendChild(style);
  var slot=document.getElementById('mc-site-footer');
  if(slot){ slot.outerHTML=html; } else { document.body.insertAdjacentHTML('beforeend',html); }

  // newsletter , caminho seguro (anon insert em email_subscribers, RLS protege)
  window.MCFT_sub=function(e){
    e.preventDefault();
    var inp=document.getElementById('mcft-email'), msg=document.getElementById('mcft-msg');
    var em=(inp.value||'').trim(); if(!em||em.indexOf('@')<1) return false;
    var SB='https://qfwhduvutfumsaxnuofa.supabase.co', AK='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFmd2hkdXZ1dGZ1bXNheG51b2ZhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQzNzc5NDYsImV4cCI6MjA4OTk1Mzk0Nn0.efRel6U68misvPSRj8-p31-gOhzjXN4eIFMiloTNyk4';
    try{ fetch(SB+'/rest/v1/email_subscribers',{method:'POST',headers:{apikey:AK,Authorization:'Bearer '+AK,'Content-Type':'application/json',Prefer:'resolution=ignore-duplicates'},body:JSON.stringify({email:em,source:'footer',lang:L})}); }catch(_){}
    inp.value=''; msg.textContent=t('nl_ok'); msg.style.display='block';
    return false;
  };
})();
