// Renderer de email institucional — Node module (cron usa).
// Espelha INST_TEMPLATES de admin.html (subjects/preheader/title/body/features/cta em 7 langs).
// HTML mais simples que o template gigante do admin, mas branded e premium o suficiente.

const INST_TEMPLATES = {
  welcome: {
    color: '#E91E63',
    subject: { pt:'Bom te ter aqui, Trader', en:'Good to have you here, Trader', es:'Que bueno tenerte aqui, Trader', fr:'Content de vous avoir, Trader', de:'Schon, dass du da bist, Trader', it:'Bello averti qui, Trader', ar:'سعداء بوجودك هنا' },
    preheader: { pt:'Cupons exclusivos negociados direto com as firmas. Até 90% off. Tudo num só lugar.', en:'Exclusive coupons negotiated directly with firms. Up to 90% off. All in one place.', es:'Cupones exclusivos negociados directo con las firmas. Hasta 90% off. Todo en un lugar.', fr:'Coupons exclusifs négociés directement avec les firmes. Jusqu\'à 90% de réduction.', de:'Exklusive Gutscheine direkt mit den Firmen verhandelt. Bis zu 90% Rabatt.', it:'Coupon esclusivi negoziati direttamente con le firme. Fino al 90% di sconto.', ar:'كوبونات حصرية تم التفاوض عليها مباشرة مع الشركات.' },
    title: { pt:'Bom te ter com a gente', en:'Good to have you with us', es:'Que bueno tenerte con nosotros', fr:'Content de vous compter parmi nous', de:'Schon, dass du dabei bist', it:'Bello averti con noi', ar:'سعداء بانضمامك إلينا' },
    body: {
      pt:'MarketsCoupons reúne <b>11+ Prop Firms com cupons exclusivos — até 90% de economia na sua avaliação</b>. Plus: Análise Diária às 6h, Comparador lado a lado, Calendário Econômico e Calculadora de Position Size — tudo num só lugar.',
      en:'MarketsCoupons gathers <b>11+ Prop Firms with exclusive coupons — up to 90% off your evaluation</b>. Plus: Daily Analysis at 6 AM ET, side-by-side Comparator, Economic Calendar and Position Size Calculator.',
      es:'MarketsCoupons reúne <b>11+ Prop Firms con cupones exclusivos — hasta 90% de descuento</b>. Plus: Análisis Diario a las 6 AM, Comparador lado a lado, Calendario Económico y Calculadora.',
      fr:'MarketsCoupons réunit <b>11+ Prop Firms avec coupons exclusifs — jusqu\'à 90% de réduction</b>. Plus : Analyse Quotidienne à 6h, Comparateur, Calendrier Économique et Calculateur.',
      de:'MarketsCoupons versammelt <b>11+ Prop Firms mit exklusiven Gutscheinen — bis zu 90% Rabatt</b>. Plus: Tagesanalyse um 6 Uhr, Side-by-Side-Vergleich, Wirtschaftskalender und Rechner.',
      it:'MarketsCoupons raccoglie <b>11+ Prop Firms con coupon esclusivi — fino al 90% di sconto</b>. Plus: Analisi Quotidiana alle 6, Comparatore, Calendario Economico e Calcolatore.',
      ar:'MarketsCoupons يجمع <b>11+ Prop Firms مع كوبونات حصرية — خصم يصل إلى 90%</b>. بالإضافة إلى: التحليل اليومي والمقارن والتقويم الاقتصادي وحاسبة حجم المركز.',
    },
    features: {
      pt:['11+ Prop Firms com cupons exclusivos negociados direto com as firmas','Comparador lado a lado com Trustpilot real (rating + reviews)','Análise Diária às 6h dos 4 ativos (S&P 500, Nasdaq, Ouro, Petróleo)','Calculadora de Position Size + Calendário Econômico + Heatmap','Programa de Fidelidade: 1 compra desbloqueia 3 ferramentas premium'],
      en:['11+ Prop Firms with exclusive coupons negotiated directly with firms','Side-by-side Comparator with real Trustpilot (rating + reviews)','Daily Analysis at 6 AM ET on 4 assets (S&P 500, Nasdaq, Gold, Oil)','Position Size Calculator + Economic Calendar + Heatmap','Loyalty Program: 1 purchase unlocks 3 premium tools'],
      es:['11+ Prop Firms con cupones exclusivos','Comparador lado a lado con Trustpilot real','Análisis Diario a las 6 AM (S&P 500, Nasdaq, Oro, Petróleo)','Calculadora de Position Size + Calendario + Heatmap','Programa de Fidelidad: 1 compra desbloquea 3 herramientas'],
      fr:['11+ Prop Firms avec coupons exclusifs','Comparateur côte à côte avec Trustpilot réel','Analyse Quotidienne à 6h sur 4 actifs','Calculateur de Position Size + Calendrier + Heatmap','Programme de Fidélité : 1 achat débloque 3 outils'],
      de:['11+ Prop Firms mit exklusiven Gutscheinen','Side-by-Side-Vergleich mit echtem Trustpilot','Tagesanalyse um 6 Uhr auf 4 Assets','Position-Size-Rechner + Wirtschaftskalender + Heatmap','Treueprogramm: 1 Kauf schaltet 3 Premium-Tools frei'],
      it:['11+ Prop Firms con coupon esclusivi','Comparatore affiancato con Trustpilot reale','Analisi Quotidiana alle 6 su 4 asset','Calcolatore Position Size + Calendario + Heatmap','Programma Fedeltà: 1 acquisto sblocca 3 strumenti'],
      ar:['11+ Prop Firms مع كوبونات حصرية','مقارن جنباً إلى جنب مع Trustpilot حقيقي','التحليل اليومي الساعة 6 صباحاً على 4 أصول','حاسبة حجم المركز + التقويم الاقتصادي + خريطة حرارية','برنامج الولاء: عملية شراء واحدة تفتح 3 أدوات بريميوم'],
    },
    cta: { pt:'CONHECER O SITE', en:'VISIT THE SITE', es:'CONOCER EL SITIO', fr:'DECOUVRIR LE SITE', de:'WEBSITE BESUCHEN', it:'VISITA IL SITO', ar:'زيارة الموقع' },
    highlight: {
      label: { pt:'Comece por aqui', en:'Start here', es:'Empieza aquí', fr:'Commencez ici', de:'Starte hier', it:'Inizia qui', ar:'ابدأ من هنا' },
      title: { pt:'Bulenox 100K por <b style="color:{C}">$23,65</b>', en:'Bulenox 100K for <b style="color:{C}">$23.65</b>', es:'Bulenox 100K por <b style="color:{C}">$23,65</b>', fr:'Bulenox 100K pour <b style="color:{C}">$23,65</b>', de:'Bulenox 100K für <b style="color:{C}">$23,65</b>', it:'Bulenox 100K a <b style="color:{C}">$23,65</b>', ar:'Bulenox 100K بسعر <b style="color:{C}">$23.65</b>' },
      sub: { pt:'Cupom <b>MARKET89</b> — 89% OFF aplicado automaticamente', en:'Coupon <b>MARKET89</b> — 89% OFF applied automatically', es:'Cupón <b>MARKET89</b> — 89% OFF aplicado automáticamente', fr:'Coupon <b>MARKET89</b> — 89% OFF appliqué automatiquement', de:'Gutschein <b>MARKET89</b> — 89% OFF automatisch angewendet', it:'Coupon <b>MARKET89</b> — 89% OFF applicato automaticamente', ar:'كوبون <b>MARKET89</b> — 89% OFF يُطبق تلقائياً' },
    },
  },
  'site-invite': {
    color: '#FF6F00',
    subject: { pt:'Conta de $25K por $19,90 — cupom exclusivo', en:'$25K account for $19.90 — exclusive coupon', es:'Cuenta de $25K por $19,90 — cupón exclusivo', fr:'Compte de $25K pour $19,90 — coupon exclusif', de:'$25K Konto für $19,90 — exklusiver Gutschein', it:'Conto da $25K a $19,90 — coupon esclusivo', ar:'حساب $25K بسعر $19.90 — كوبون حصري' },
    preheader: { pt:'Apex 90% off, Bulenox 89% off. Cupom aplicado automaticamente. Sem cadastro de cartão.', en:'Apex 90% off, Bulenox 89% off. Coupon applied automatically. No credit card required.', es:'Apex 90% off, Bulenox 89% off. Cupón aplicado automáticamente. Sin tarjeta.', fr:'Apex 90% off, Bulenox 89% off. Coupon appliqué automatiquement. Sans carte bancaire.', de:'Apex 90% off, Bulenox 89% off. Gutschein automatisch angewendet.', it:'Apex 90% off, Bulenox 89% off. Coupon applicato automaticamente.', ar:'Apex 90% خصم، Bulenox 89% خصم. الكوبون يُطبق تلقائياً.' },
    title: { pt:'Economize até 90% nas melhores Prop Firms', en:'Save up to 90% on the best Prop Firms', es:'Ahorra hasta 90% en las mejores Prop Firms', fr:'Économisez jusqu\'à 90% sur les meilleures Prop Firms', de:'Spare bis zu 90% bei den besten Prop Firms', it:'Risparmia fino al 90% sulle migliori Prop Firms', ar:'وفر حتى 90% على أفضل Prop Firms' },
    body: {
      pt:'Reunimos cupons exclusivos negociados direto com as firmas — até 90% de desconto na sua avaliação. <b>Tudo verificado, atualizado diariamente e aplicado automaticamente no checkout.</b>',
      en:'We gather exclusive coupons negotiated directly with firms — up to 90% off your evaluation. <b>All verified, updated daily and applied automatically at checkout.</b>',
      es:'Reunimos cupones exclusivos negociados directamente con las firmas — hasta 90% de descuento. <b>Todo verificado, actualizado diariamente y aplicado automáticamente en el checkout.</b>',
      fr:'On réunit des coupons exclusifs négociés directement avec les firmes — jusqu\'à 90% de réduction. <b>Tout vérifié, mis à jour quotidiennement et appliqué automatiquement au checkout.</b>',
      de:'Wir sammeln exklusive Gutscheine direkt mit den Firmen verhandelt — bis zu 90% Rabatt. <b>Alles verifiziert, täglich aktualisiert und automatisch beim Checkout angewendet.</b>',
      it:'Raccogliamo coupon esclusivi negoziati direttamente con le firme — fino al 90% di sconto. <b>Tutto verificato, aggiornato quotidianamente e applicato automaticamente al checkout.</b>',
      ar:'نجمع كوبونات حصرية تم التفاوض عليها مباشرة مع الشركات — خصم يصل إلى 90% على تقييمك. <b>كل شيء موثق ومحدث يومياً ويُطبق تلقائياً عند الدفع.</b>',
    },
    features: {
      pt:['11+ Prop Firms com cupons exclusivos','Comparador lado a lado com Trustpilot real','Análise diária às 6h — ES, NQ, Ouro, Petróleo','Heatmap, Calendário Econômico e Calculadoras','Blog educacional do iniciante ao avançado'],
      en:['11+ Prop Firms with exclusive coupons','Side-by-side comparator with real Trustpilot','Daily analysis at 6AM — ES, NQ, Gold, Oil','Heatmap, Economic Calendar and Calculators','Educational blog from beginner to advanced'],
      es:['11+ Prop Firms con cupones exclusivos','Comparador lado a lado con Trustpilot real','Análisis diario a las 6h — ES, NQ, Oro, Petróleo','Heatmap, Calendario Económico y Calculadoras','Blog educacional del principiante al avanzado'],
      fr:['11+ Prop Firms avec coupons exclusifs','Comparateur côte à côte avec Trustpilot réel','Analyse quotidienne à 6h — ES, NQ, Or, Pétrole','Heatmap, Calendrier Économique et Calculatrices','Blog éducatif du débutant à l\'avancé'],
      de:['11+ Prop Firms mit exklusiven Gutscheinen','Vergleich nebeneinander mit echtem Trustpilot','Tägliche Analyse um 6 Uhr — ES, NQ, Gold, Öl','Heatmap, Wirtschaftskalender und Rechner','Bildungsblog vom Anfänger bis Fortgeschritten'],
      it:['11+ Prop Firms con coupon esclusivi','Comparatore affiancato con Trustpilot reale','Analisi giornaliera alle 6 — ES, NQ, Oro, Petrolio','Heatmap, Calendario Economico e Calcolatrici','Blog educativo dal principiante all\'avanzato'],
      ar:['11+ شركة Prop Firm مع كوبونات حصرية','مقارنة جنباً إلى جنب مع Trustpilot حقيقي','تحليل يومي الساعة 6 — ES, NQ, ذهب, نفط','خريطة حرارية, تقويم اقتصادي وحاسبات','مدونة تعليمية من المبتدئ إلى المتقدم'],
    },
    cta: { pt:'ACESSAR O SITE', en:'VISIT THE SITE', es:'ACCEDER AL SITIO', fr:'ACCÉDER AU SITE', de:'ZUR WEBSITE', it:'VISITA IL SITO', ar:'زيارة الموقع' },
    highlight: {
      label: { pt:'Melhor oferta do momento', en:'Best deal right now', es:'Mejor oferta del momento', fr:'Meilleure offre', de:'Bestes Angebot', it:'Migliore offerta', ar:'أفضل عرض الآن' },
      title: { pt:'Bulenox 100K por <b style="color:{C}">$23,65</b>', en:'Bulenox 100K for <b style="color:{C}">$23.65</b>', es:'Bulenox 100K por <b style="color:{C}">$23,65</b>', fr:'Bulenox 100K pour <b style="color:{C}">$23,65</b>', de:'Bulenox 100K für <b style="color:{C}">$23,65</b>', it:'Bulenox 100K a <b style="color:{C}">$23,65</b>', ar:'Bulenox 100K بسعر <b style="color:{C}">$23.65</b>' },
      sub: { pt:'Cupom <b>MARKET89</b> — 89% OFF aplicado automaticamente', en:'Coupon <b>MARKET89</b> — 89% OFF applied automatically', es:'Cupón <b>MARKET89</b> — 89% OFF aplicado automáticamente', fr:'Coupon <b>MARKET89</b> — 89% OFF appliqué automatiquement', de:'Gutschein <b>MARKET89</b> — 89% OFF automatisch angewendet', it:'Coupon <b>MARKET89</b> — 89% OFF applicato automaticamente', ar:'كوبون <b>MARKET89</b> — 89% OFF يُطبق تلقائياً' },
    },
  },
  loyalty: {
    color: '#7C3AED',
    subject: { pt:'Suas compras valem mais do que você imagina', en:'Your purchases are worth more than you think', es:'Tus compras valen mas de lo que imaginas', fr:'Vos achats valent plus que vous ne pensez', de:'Deine Kaufe sind mehr wert als du denkst', it:'I tuoi acquisti valgono piu di quanto pensi', ar:'مشترياتك تستحق أكثر مما تتصور' },
    preheader: { pt:'1 compra validada desbloqueia Análise Diária, Heatmap GEX e Live Room. Sem mensalidade.', en:'1 validated purchase unlocks Daily Analysis, GEX Heatmap and Live Room. No subscription.', es:'1 compra validada desbloquea Análisis Diario, Heatmap GEX y Live Room.', fr:'1 achat validé débloque Analyse Quotidienne, Heatmap GEX et Live Room.', de:'1 validierter Kauf schaltet Tagesanalyse, GEX Heatmap und Live Room frei.', it:'1 acquisto validato sblocca Analisi Quotidiana, Heatmap GEX e Live Room.', ar:'عملية شراء واحدة معتمدة تفتح التحليل اليومي وخريطة GEX وغرفة البث المباشر.' },
    title: { pt:'1 compra desbloqueia 3 ferramentas premium', en:'1 purchase unlocks 3 premium tools', es:'1 compra desbloquea 3 herramientas premium', fr:'1 achat débloque 3 outils premium', de:'1 Kauf schaltet 3 Premium-Tools frei', it:'1 acquisto sblocca 3 strumenti premium', ar:'عملية شراء واحدة تفتح 3 أدوات بريميوم' },
    body: {
      pt:'Programa de fidelidade simples: comprou uma Prop Firm pelo nosso link ou cupom? Manda o comprovante. <b>Com 1 compra validada você desbloqueia: Análise Diária às 6h (S&amp;P 500, Nasdaq, Ouro, Petróleo), Mapa de Exposição Gamma (GEX) atualizado todo dia, e Live Room VIP.</b>',
      en:'Simple loyalty program: bought a Prop Firm through our link or coupon? Submit the receipt. <b>With 1 validated purchase you unlock: Daily Analysis at 6 AM ET (S&amp;P 500, Nasdaq, Gold, Oil), Gamma Exposure (GEX) Map updated daily, and VIP Live Room.</b>',
      es:'Programa de fidelidad simple: ¿compraste una Prop Firm por nuestro enlace o cupón? Envía el comprobante. <b>Con 1 compra validada desbloqueas: Análisis Diario, Mapa GEX y Live Room VIP.</b>',
      fr:'Programme de fidélité simple : acheté une Prop Firm via notre lien ou coupon ? Envoyez la preuve. <b>Avec 1 achat validé vous débloquez : Analyse Quotidienne, Carte GEX et Live Room VIP.</b>',
      de:'Einfaches Treueprogramm: Prop Firm über unseren Link gekauft? Beleg einreichen. <b>Mit 1 validiertem Kauf schaltest du frei: Tagesanalyse, GEX-Karte und VIP Live Room.</b>',
      it:'Programma fedeltà semplice: acquistato una Prop Firm tramite il nostro link? Invia la ricevuta. <b>Con 1 acquisto validato sblocchi: Analisi Quotidiana, Mappa GEX e Live Room VIP.</b>',
      ar:'برنامج ولاء بسيط: اشتريت Prop Firm عبر رابطنا؟ أرسل الإيصال. <b>مع عملية شراء واحدة معتمدة تفتح: التحليل اليومي وخريطة GEX وLive Room VIP.</b>',
    },
    features: {
      pt:['Compre qualquer Prop Firm pelo nosso link ou cupom','Envie o comprovante na aba Fidelidade do site','Validação em até 48h pela nossa equipe','Desbloqueia Análise Diária às 6h (ES, NQ, Ouro, Petróleo)','Desbloqueia Mapa de Gamma Exposure + Live Room VIP'],
      en:['Buy any Prop Firm through our link or coupon','Submit the receipt on the Loyalty tab','Validation within 48h by our team','Unlocks Daily Analysis at 6 AM ET (ES, NQ, Gold, Oil)','Unlocks Gamma Exposure Map + VIP Live Room'],
      es:['Compra cualquier Prop Firm por nuestro enlace o cupón','Envía el comprobante en la pestaña Fidelidad','Validación en 48h por nuestro equipo','Desbloquea Análisis Diario a las 6 AM','Desbloquea Mapa de Exposición Gamma + Live Room VIP'],
      fr:['Achetez n\'importe quelle Prop Firm via notre lien','Envoyez la preuve sur l\'onglet Fidélité','Validation en 48h par notre équipe','Débloque Analyse Quotidienne à 6h','Débloque Carte d\'Exposition Gamma + Live Room VIP'],
      de:['Kaufe eine Prop Firm über unseren Link','Beleg über den Fidelity-Tab einreichen','Validierung innerhalb von 48h','Schaltet Tagesanalyse um 6 Uhr frei','Schaltet GEX-Karte + VIP Live Room frei'],
      it:['Acquista qualsiasi Prop Firm tramite il nostro link','Invia la ricevuta nella scheda Fedeltà','Validazione entro 48h dal nostro team','Sblocca Analisi Quotidiana alle 6','Sblocca Mappa GEX + Live Room VIP'],
      ar:['اشترِ أي Prop Firm عبر رابطنا','أرسل الإيصال في تبويب الولاء','التحقق خلال 48 ساعة من فريقنا','تفتح التحليل اليومي الساعة 6 صباحاً','تفتح خريطة GEX + غرفة Live Room VIP'],
    },
    cta: { pt:'COMEÇAR AGORA', en:'GET STARTED', es:'EMPEZAR AHORA', fr:'COMMENCER', de:'JETZT STARTEN', it:'INIZIA ORA', ar:'ابدأ الآن' },
  },
  indicators: {
    color: '#0EA5E9',
    subject: { pt:'Ferramentas que a gente usa todo dia', en:'Tools we use every day', es:'Herramientas que usamos todos los dias', fr:'Les outils qu\'on utilise chaque jour', de:'Tools die wir taglich nutzen', it:'Strumenti che usiamo ogni giorno', ar:'أدوات نستخدمها كل يوم' },
    preheader: { pt:'Heat Map, Screener, Calendário Econômico, Calculadora de Position Size. Sem cadastro de cartão.', en:'Heat Map, Screener, Economic Calendar, Position Size Calculator. No credit card required.', es:'Heat Map, Screener, Calendario Económico, Calculadora de Position Size.', fr:'Heat Map, Screener, Calendrier Économique, Calculateur de Position Size.', de:'Heat Map, Screener, Wirtschaftskalender, Position-Size-Rechner.', it:'Heat Map, Screener, Calendario Economico, Calcolatore Position Size.', ar:'خريطة حرارية، فلاتر، تقويم اقتصادي، حاسبة حجم المركز.' },
    title: { pt:'Tudo o que você precisa pra operar', en:'Everything you need to trade', es:'Todo lo que necesitas para operar', fr:'Tout ce qu\'il vous faut pour trader', de:'Alles was du zum Traden brauchst', it:'Tutto cio che ti serve per operare', ar:'كل ما تحتاجه للتداول' },
    body: {
      pt:'Screener, Heat Map, calendário econômico, calculadora de position size — <b>ferramentas pensadas pra quem opera de verdade</b>. Tudo reunido num só lugar pra você se preparar antes de cada operação.',
      en:'Screener, Heat Map, economic calendar, position size calculator — <b>tools designed for serious traders</b>. Everything in one place to prepare before every trade.',
      es:'Screener, Heat Map, calendario economico, calculadora de position size — <b>herramientas pensadas para quienes operan en serio</b>. Todo en un solo lugar.',
      fr:'Screener, Heat Map, calendrier eco, calculateur de position size — <b>des outils concus pour les vrais traders</b>. Tout au meme endroit.',
      de:'Screener, Heat Map, Wirtschaftskalender, Position Size Rechner — <b>Tools fur ernsthafte Trader</b>. Alles an einem Ort.',
      it:'Screener, Heat Map, calendario economico, calcolatore position size — <b>strumenti pensati per chi opera sul serio</b>. Tutto in un unico posto.',
      ar:'فلاتر وخريطة حرارية وتقويم اقتصادي وحاسبة حجم المركز — <b>أدوات مصممة للمتداولين الجادين</b>. كل شيء في مكان واحد.',
    },
    features: {
      pt:['Comparador lado a lado: 11+ Prop Firms com Trustpilot real','Calculadora de Position Size: cálculo automático por % de risco','Calendário Econômico: filtro por impacto, hora local, alertas 5min antes','Heatmap: SPX500, Nasdaq, Forex, Crypto, ETFs','Membros Fidelidade: + Análise Diária às 6h, Mapa GEX, Live Room VIP'],
      en:['Side-by-side Comparator: 11+ Prop Firms with real Trustpilot','Position Size Calculator: auto-math by % risk','Economic Calendar: filter by impact, local time, 5-min alerts','Heatmap: SPX500, Nasdaq, Forex, Crypto, ETFs','Loyalty Members: + Daily Analysis at 6 AM, GEX Map, VIP Live Room'],
      es:['Comparador lado a lado: 11+ Prop Firms con Trustpilot real','Calculadora de Position Size: cálculo automático por % de riesgo','Calendario Económico: filtro por impacto, hora local','Heatmap: SPX500, Nasdaq, Forex, Crypto, ETFs','Miembros Fidelidad: + Análisis Diario, Mapa GEX, Live Room VIP'],
      fr:['Comparateur côte à côte avec Trustpilot réel','Calculateur de Position Size : calcul auto par % de risque','Calendrier Économique : filtre par impact, heure locale','Heatmap : SPX500, Nasdaq, Forex, Crypto, ETFs','Membres Fidélité : + Analyse Quotidienne, Carte GEX, Live Room VIP'],
      de:['Side-by-Side-Vergleich: 11+ Prop Firms mit echtem Trustpilot','Position-Size-Rechner: automatische Berechnung','Wirtschaftskalender: Filter nach Impact, lokale Zeit','Heatmap: SPX500, Nasdaq, Forex, Crypto, ETFs','Treuemitglieder: + Tagesanalyse, GEX-Karte, VIP Live Room'],
      it:['Comparatore affiancato: 11+ Prop Firms con Trustpilot reale','Calcolatore Position Size: calcolo automatico per % di rischio','Calendario Economico: filtro per impatto, ora locale','Heatmap: SPX500, Nasdaq, Forex, Crypto, ETFs','Membri Fedeltà: + Analisi Quotidiana, Mappa GEX, Live Room VIP'],
      ar:['مقارن جنباً إلى جنب: 11+ Prop Firms مع Trustpilot حقيقي','حاسبة حجم المركز: حساب تلقائي بـ% المخاطرة','التقويم الاقتصادي: فلتر حسب التأثير، التوقيت المحلي','خريطة حرارية: SPX500, Nasdaq, Forex, Crypto, ETFs','أعضاء الولاء: + التحليل اليومي، خريطة GEX، Live Room VIP'],
    },
    cta: { pt:'ACESSAR FERRAMENTAS', en:'ACCESS TOOLS', es:'ACCEDER A HERRAMIENTAS', fr:'ACCEDER AUX OUTILS', de:'TOOLS AUFRUFEN', it:'ACCEDI AGLI STRUMENTI', ar:'الوصول إلى الأدوات' },
  },
  'blog-guides': {
    color: '#84CC16',
    subject: { pt:'5 guias pra preparar antes de operar', en:'5 guides to prepare before you trade', es:'5 guías para prepararte antes de operar', fr:'5 guides pour vous préparer avant de trader', de:'5 Guides zur Vorbereitung vor dem Traden', it:'5 guide per prepararti prima di operare', ar:'5 أدلة للاستعداد قبل التداول' },
    preheader: { pt:'5 guias práticos: como escolher, passar, gerenciar risco e sacar.', en:'5 practical guides: how to choose, pass, manage risk, and withdraw.', es:'5 guías prácticas: cómo elegir, pasar, gestionar riesgo y retirar.', fr:'5 guides pratiques : comment choisir, passer, gérer le risque, retirer.', de:'5 praktische Guides: wie wählen, bestehen, Risiko managen und auszahlen.', it:'5 guide pratiche: come scegliere, passare, gestire il rischio e prelevare.', ar:'5 أدلة عملية: كيف تختار، تنجح، تدير المخاطر، تسحب.' },
    title: { pt:'O que os guias ensinam', en:'What the guides teach', es:'Lo que enseñan las guías', fr:'Ce que les guides enseignent', de:'Was die Guides lehren', it:'Cosa insegnano le guide', ar:'ما تعلمه الأدلة' },
    body: {
      pt:'Cobrimos o caminho completo: <b>escolher a firma certa, passar na avaliação, gerenciar drawdown, calcular tamanho de posição e sacar os lucros sem surpresa</b>. Cada guia é prático, com exemplo e número real.',
      en:'We cover the full path: <b>choosing the right firm, passing the evaluation, managing drawdown, calculating position size, and withdrawing profits without surprise</b>. Each guide is practical with real examples.',
      es:'Cubrimos el camino completo: <b>elegir la firma correcta, pasar la evaluación, gestionar drawdown, calcular tamaño de posición y retirar las ganancias sin sorpresa</b>. Cada guía es práctica con ejemplos reales.',
      fr:'Nous couvrons tout le parcours : <b>choisir la bonne firm, passer l\'évaluation, gérer le drawdown, calculer la taille de position et retirer les profits sans surprise</b>. Chaque guide est pratique.',
      de:'Wir decken den gesamten Weg ab: <b>die richtige Firm wählen, die Evaluierung bestehen, Drawdown managen, Positionsgröße berechnen und Gewinne ohne Überraschung auszahlen</b>. Jeder Guide ist praktisch.',
      it:'Copriamo il percorso completo: <b>scegliere la firm giusta, passare la valutazione, gestire il drawdown, calcolare la dimensione della posizione e prelevare i profitti senza sorprese</b>. Ogni guida è pratica.',
      ar:'نغطي المسار الكامل: <b>اختيار الشركة المناسبة، اجتياز التقييم، إدارة الـ drawdown، حساب حجم المركز، وسحب الأرباح بدون مفاجأة</b>. كل دليل عملي.',
    },
    features: {
      pt:['Prop Firm: como funciona, quem financia, o que você realmente compra','Como passar na avaliação — regras, rotina e os erros que reprovam','Drawdown: trailing, daily, EOD — diferença e como não estourar','Position sizing: o cálculo que separa lucrativo de estourado','Sacar lucros: prazos, taxas e o que fazer com o primeiro payout'],
      en:['Prop Firm: how it works, who funds, what you really buy','How to pass the evaluation — rules, routine, and mistakes that fail you','Drawdown: trailing, daily, EOD — the difference and how not to blow up','Position sizing: the math that separates profitable from busted','Withdrawing profits: timing, fees, and what to do with your first payout'],
      es:['Prop Firm: cómo funciona, quién financia, qué realmente compras','Cómo pasar la evaluación — reglas, rutina y los errores que te reprueban','Drawdown: trailing, diario, EOD','Position sizing: el cálculo que separa rentable de estallado','Retirar ganancias: plazos, tarifas y qué hacer con tu primer pago'],
      fr:['Prop Firm : comment ça marche, qui finance','Comment réussir l\'évaluation — règles, routine et les erreurs qui font échouer','Drawdown : trailing, daily, EOD','Position sizing : le calcul qui sépare rentable d\'exploser','Retirer les profits : délais, frais'],
      de:['Prop Firm: wie es funktioniert, wer finanziert','Wie du die Evaluierung bestehst — Regeln, Routine und Fehler','Drawdown: trailing, daily, EOD','Position Sizing: die Berechnung, die profitabel von blown trennt','Gewinne auszahlen: Zeiten, Gebühren'],
      it:['Prop Firm: come funziona, chi finanzia','Come passare la valutazione — regole, routine e gli errori','Drawdown: trailing, daily, EOD','Position sizing: il calcolo che separa profittevole da saltato','Prelevare i profitti: tempi, commissioni'],
      ar:['Prop Firm: كيف تعمل، من يموّل','كيف تجتاز التقييم — القواعد والروتين والأخطاء','Drawdown: trailing وdaily وEOD','حجم المركز: الحساب الذي يفصل المربح عن المنفجر','سحب الأرباح: المواعيد والرسوم'],
    },
    cta: { pt:'VER OS GUIAS', en:'SEE THE GUIDES', es:'VER LAS GUÍAS', fr:'VOIR LES GUIDES', de:'GUIDES ANSEHEN', it:'VEDI LE GUIDE', ar:'مشاهدة الأدلة' },
  },
  // ULTIMAS-HORAS v2 — kind:'urgent-deal' aciona buildUrgentDealHtml. Single-lang EN.
  'ultimas-horas': (() => {
    const subj = 'Final hours: Apex 90% and Bulenox 89% — ends today';
    const pre  = 'Use coupons MARKET and MARKET89 at checkout. After today, full price returns. No extensions.';
    const cta  = 'View Deals';
    const all = (v) => ({ pt:v, en:v, es:v, fr:v, de:v, it:v, ar:v });
    return {
      kind: 'urgent-deal',
      forceLang: 'en',
      color: '#DC2626',
      apexDeadline: '2026-05-08T03:59:00Z',
      subject: all(subj),
      preheader: all(pre),
      cta: all(cta),
    };
  })(),

  // Template GIVEAWAY — HTML custom (não usa renderInstHtml padrão), kind: 'giveaway' aciona buildGiveawayHtml
  'giveaway-apex-may26': (() => {
    const subj = "You're in — 3 Apex Evaluation Accounts giveaway";
    const pre  = '3 chances to win an Apex Trader Funding evaluation account — 100% free to enter';
    const cta  = 'Enter the Giveaway';
    const all = (v) => ({ pt:v, en:v, es:v, fr:v, de:v, it:v, ar:v });
    return {
      kind: 'giveaway',
      forceLang: 'en', // template single-lang (HTML hardcoded em EN) — trava todos no EN
      color: '#F0B429',
      accent: '#F97316',
      firm: 'Apex Trader Funding',
      numPrizes: '3',
      prizeType: 'Evaluation Accounts',
      drawDate: 'May 12, 2026',
      deadline: 'May 11 at 23:59 BRT',
      postLink: 'https://www.instagram.com/p/DX9X4Qdtu4X/',
      heroImage: 'https://www.marketscoupons.com/img/email-giveaway-apex-tickets.jpg',
      subject: all(subj),
      preheader: all(pre),
      cta: all(cta),
    };
  })(),
};

const FOOTER_TEXT = {
  pt: 'Você está recebendo este email porque se cadastrou na Markets Coupons.',
  en: 'You are receiving this email because you signed up at Markets Coupons.',
  es: 'Estás recibiendo este email porque te registraste en Markets Coupons.',
  fr: 'Vous recevez cet email car vous vous êtes inscrit sur Markets Coupons.',
  de: 'Sie erhalten diese E-Mail, weil Sie sich bei Markets Coupons angemeldet haben.',
  it: 'Ricevi questa email perché ti sei iscritto a Markets Coupons.',
  ar: 'تتلقى هذا البريد لأنك سجلت في Markets Coupons.',
};
const UNSUB_TEXT = {
  pt: 'Descadastrar', en: 'Unsubscribe', es: 'Darse de baja', fr: 'Se désinscrire', de: 'Abmelden', it: 'Annulla iscrizione', ar: 'إلغاء الاشتراك',
};
const TAGLINE = {
  pt: 'as melhores ofertas para traders',
  en: 'the best deals for traders',
  es: 'las mejores ofertas para traders',
  fr: 'les meilleures offres pour traders',
  de: 'die besten angebote für trader',
  it: 'le migliori offerte per trader',
  ar: 'أفضل العروض للمتداولين',
};

function pick(obj, lang) {
  return (obj && (obj[lang] || obj.en || obj.pt)) || '';
}

function buildGiveawayHtml(t, lang, unsubUrl) {
  const ano = new Date().getFullYear();
  const color = t.color, accent = t.accent;
  const { firm, numPrizes, prizeType, drawDate, deadline, postLink, heroImage } = t;
  const cta = (t.cta && (t.cta[lang] || t.cta.en)) || 'Enter';
  return `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<meta name="color-scheme" content="only light"><meta name="supported-color-schemes" content="only light">
<title>${firm} Giveaway — Markets Coupons</title>
<style>:root{color-scheme:light only;}html,body{margin:0!important;padding:0!important;background-color:#f4f5f7!important;}@media (prefers-color-scheme:dark){html,body{background-color:#f4f5f7!important;color:#111!important;}}</style>
</head><body style="margin:0;padding:0;background:#f4f5f7;font-family:Inter,-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif;color:#111;">
<div style="display:none;max-height:0;overflow:hidden;font-size:1px;color:#f4f5f7;opacity:0;">${numPrizes} chances to win a ${firm} evaluation account — 100% free to enter</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f4f5f7;padding:24px 0;"><tr><td align="center">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;background:#fff;border-radius:14px;overflow:hidden;box-shadow:0 8px 32px rgba(0,0,0,.08);">
  <tr><td style="padding:28px 32px 20px;text-align:center;">
    <a href="https://www.marketscoupons.com" style="text-decoration:none;color:inherit;">
      <span style="font-size:22px;font-weight:800;color:#1a1a1a;">Markets <span style="color:#ff8c00;">Coupons</span><span style="color:#ff8c00;font-size:9px;">&nbsp;&#9679;</span></span>
    </a>
    <div style="margin-top:8px;font-size:11px;color:#6b7480;letter-spacing:1.4px;text-transform:uppercase;font-weight:700;">Exclusive Giveaway</div>
  </td></tr>
  <tr><td style="height:3px;background:linear-gradient(90deg,transparent,${accent},transparent);"></td></tr>
  <tr><td style="background:#000;padding:48px 32px 44px;text-align:center;">
    <div style="display:inline-block;padding:6px 16px;background:rgba(240,180,41,.12);border:1px solid rgba(240,180,41,.4);border-radius:99px;font-size:11px;font-weight:800;letter-spacing:2px;color:${color};text-transform:uppercase;margin-bottom:18px;">Giveaway · Win 1 of ${numPrizes}</div>
    <h1 style="margin:0 0 14px;font-size:36px;font-weight:900;line-height:1.1;color:#fff;letter-spacing:-1px;">${numPrizes} ${prizeType}<br><span style="background:linear-gradient(135deg,${color},#ffe066);-webkit-background-clip:text;background-clip:text;color:transparent;">at ${firm}</span></h1>
    <p style="margin:0 0 24px;font-size:15px;color:#b8c5d6;line-height:1.6;max-width:440px;margin-left:auto;margin-right:auto;">Drawing on <strong style="color:${color};">${drawDate}</strong> · 100% free to enter</p>
    <img src="${heroImage}" alt="${numPrizes} ${prizeType} ${firm}" width="540" style="display:block;margin:0 auto;max-width:100%;height:auto;border:0;border-radius:12px;">
  </td></tr>
  <tr><td style="height:3px;background:linear-gradient(90deg,transparent,${accent},transparent);"></td></tr>
  <tr><td style="padding:36px 36px 8px;">
    <p style="margin:0 0 18px;font-size:16px;color:#111;line-height:1.7;">Hi <strong>{nome}</strong>,</p>
    <p style="margin:0 0 22px;font-size:15px;color:#374151;line-height:1.7;">We're running another giveaway and you've been picked to enter. <strong style="color:#111;">${numPrizes} ${prizeType} (EVALUATION PHASE)</strong> at ${firm} are up for grabs — 100% free, no entry fee.</p>
    <p style="margin:0 0 22px;font-size:14px;color:#6b7480;line-height:1.7;font-style:italic;">Not a direct funded account — it's access to the official evaluation. Your gateway to a real funded account.</p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#fafafa;border:1px solid #e5e7eb;border-left:4px solid ${accent};border-radius:10px;margin-bottom:24px;"><tr><td style="padding:20px 22px;">
      <div style="font-size:11px;font-weight:800;letter-spacing:1.5px;text-transform:uppercase;color:${accent};margin-bottom:12px;">How to enter</div>
      <ol style="margin:0;padding:0 0 0 20px;color:#374151;font-size:14px;line-height:1.85;">
        <li><strong style="color:#111;">Sign up on the site</strong> (if you don't have an account yet)</li>
        <li><strong style="color:#111;">Like the official giveaway post</strong> on Instagram</li>
        <li><strong style="color:#111;">Tag trader friends</strong> in the comments — the more, the more chances</li>
      </ol>
    </td></tr></table>
    <p style="margin:0 0 28px;font-size:14px;color:#6b7480;line-height:1.7;">Entry deadline: <strong style="color:#111;">${deadline}</strong><br>Live drawing on Instagram on ${drawDate}</p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:14px;"><tr><td align="center">
      <a href="${postLink}" style="display:inline-block;padding:17px 48px;background:linear-gradient(135deg,#c8941a,${color},#f5d060,${color},#c8941a);color:#0d141c;font-size:16px;font-weight:800;text-decoration:none;border-radius:50px;letter-spacing:.3px;box-shadow:0 8px 24px rgba(240,180,41,.3);">${cta} &rarr;</a>
    </td></tr></table>
    <p style="margin:0 0 28px;font-size:12px;color:#9ca3af;text-align:center;line-height:1.6;">If the button doesn't work, copy and paste:<br><a href="${postLink}" style="color:#6b7480;text-decoration:underline;">${postLink}</a></p>
  </td></tr>
  <tr><td style="padding:0 36px;"><div style="border-top:1px solid #e5e7eb;"></div></td></tr>
  <tr><td style="padding:24px 36px 28px;"><table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
    <td style="vertical-align:middle;padding-right:14px;"><div style="width:48px;height:48px;border-radius:50%;background:linear-gradient(135deg,${color},#ff8c00);text-align:center;line-height:48px;font-size:18px;font-weight:800;color:#fff;">L</div></td>
    <td style="vertical-align:middle;"><div style="font-size:14px;font-weight:700;color:#111;">Lara</div><div style="font-size:12px;color:#6b7480;">Markets Coupons · Good luck out there</div></td>
  </tr></table></td></tr>
  <tr><td style="background:#fafafa;padding:22px 32px;text-align:center;border-top:1px solid #e5e7eb;">
    <p style="margin:0 0 8px;font-size:11px;color:#9ca3af;line-height:1.6;">You're receiving this email because you signed up at Markets Coupons.<br>Markets Coupons is an educational/affiliate platform — we are not a broker, FCM, or registered advisor.</p>
    <p style="margin:8px 0 0;font-size:11px;color:#9ca3af;">&copy; ${ano} Markets Coupons</p>
    <p style="margin:10px 0 0;font-size:10px;color:#b9c0c9;"><a href="${unsubUrl||'https://www.marketscoupons.com/'}" style="color:#9ca3af;text-decoration:underline;">Unsubscribe</a></p>
  </td></tr>
</table></td></tr></table>
</body></html>`;
}

function buildUrgentDealHtml(t, lang, unsubUrl) {
  const ano = new Date().getFullYear();
  const apexDeadline = t.apexDeadline || '2026-05-08T03:59:00Z';
  const countdownUrl = `https://www.marketscoupons.com/api/email-image?type=countdown&d=${encodeURIComponent(apexDeadline)}&c=F97316`;
  return `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<meta name="color-scheme" content="only light"><meta name="supported-color-schemes" content="only light">
<title>Final hours — Apex 90% &amp; Bulenox 89% — Markets Coupons</title>
<style>:root{color-scheme:light only;}html,body{margin:0!important;padding:0!important;background-color:#f4f5f7!important;}@media (prefers-color-scheme:dark){html,body{background-color:#f4f5f7!important;color:#111!important;}}@media only screen and (max-width:520px){.price-row td{padding:11px 8px!important;font-size:13px!important;}}</style>
</head><body style="margin:0;padding:0;background:#f4f5f7;font-family:Inter,-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif;color:#111;-webkit-font-smoothing:antialiased;">
<div style="display:none;max-height:0;overflow:hidden;font-size:1px;color:#f4f5f7;opacity:0;">Apex 90% off and Bulenox 89% off. Coupons MARKET and MARKET89. Final hours.</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f4f5f7;padding:24px 0;"><tr><td align="center">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;background:#fff;border-radius:14px;overflow:hidden;box-shadow:0 8px 32px rgba(0,0,0,.08);">
  <tr><td style="padding:28px 32px 20px;text-align:center;">
    <a href="https://www.marketscoupons.com" style="text-decoration:none;color:inherit;"><span style="font-size:22px;font-weight:800;color:#1a1a1a;letter-spacing:-0.5px;">Markets <span style="color:#ff8c00;">Coupons</span><span style="color:#ff8c00;font-size:9px;">&nbsp;&#9679;</span></span></a>
    <div style="margin-top:8px;font-size:11px;color:#6b7480;letter-spacing:1.4px;text-transform:uppercase;font-weight:700;">Final Hours</div>
  </td></tr>
  <tr><td style="height:3px;background-color:#DC2626;"></td></tr>
  <tr><td style="background:#0d141c;padding:42px 36px;text-align:left;">
    <div style="display:inline-block;padding:6px 14px;background:rgba(220,38,38,.16);border:1px solid rgba(220,38,38,.5);border-radius:99px;font-size:11px;font-weight:800;letter-spacing:2px;color:#FCA5A5;text-transform:uppercase;margin-bottom:18px;">Last hours · ending today</div>
    <h1 style="margin:0 0 14px;font-size:30px;font-weight:900;line-height:1.2;color:#fff;letter-spacing:-.6px;">The 2 best deals of the month end today.</h1>
    <p style="margin:0;font-size:14px;color:#a8b3c2;line-height:1.65;">Apex 90% off and Bulenox 89% off. Use the coupons below at checkout. After today, full price returns — no extensions.</p>
  </td></tr>
  <tr><td style="height:3px;background-color:#DC2626;"></td></tr>
  <tr><td style="padding:32px 36px 8px;text-align:left;">
    <p style="margin:0 0 22px;font-size:16px;color:#111;line-height:1.7;">Hi <strong>{nome}</strong>,</p>
    <p style="margin:0 0 28px;font-size:15px;color:#374151;line-height:1.7;">Two prop firms with their lowest pricing of the month — and both end today. Coupons below.</p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#fff;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;margin-bottom:24px;">
      <tr><td style="background:#F97316;padding:16px 22px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
        <td style="vertical-align:middle;text-align:left;"><div style="font-size:17px;font-weight:800;color:#fff;letter-spacing:-.2px;">Apex Trader Funding</div><div style="margin-top:2px;font-size:11px;color:rgba(255,255,255,.88);font-weight:600;letter-spacing:.8px;text-transform:uppercase;">90% OFF · Lifetime</div></td>
        <td align="right" style="vertical-align:middle;"><div style="display:inline-block;padding:7px 13px;background:#0d141c;border-radius:6px;font-family:'Courier New',monospace;font-size:14px;font-weight:800;color:#F97316;letter-spacing:1.5px;">MARKET</div></td>
      </tr></table></td></tr>
      <tr><td style="padding:14px 22px 4px;text-align:center;">
        <div style="display:inline-block;padding:8px 16px;background:#fff7ed;border:1px solid #F97316;border-radius:8px;">
          <span style="font-size:12px;font-weight:800;color:#F97316;letter-spacing:.5px;text-transform:uppercase;">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#F97316" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px;margin-right:5px;"><path d="M5 22h14"/><path d="M5 2h14"/><path d="M17 22v-4.172a2 2 0 0 0-.586-1.414L12 12l-4.414 4.414A2 2 0 0 0 7 17.828V22"/><path d="M7 2v4.172a2 2 0 0 0 .586 1.414L12 12l4.414-4.414A2 2 0 0 0 17 6.172V2"/></svg>Apex promo ends today at midnight BRT
          </span>
        </div>
      </td></tr>
      <tr><td style="padding:8px 22px 18px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;">
        <tr class="price-row" style="border-bottom:1px solid #f3f4f6;"><td style="padding:14px 0 14px 14px;font-size:14px;font-weight:700;color:#111;width:60px;text-align:left;">25K</td><td style="padding:14px 8px;font-size:13px;color:#9ca3af;text-decoration:line-through;text-align:left;">$199</td><td style="padding:14px 8px;font-size:18px;font-weight:800;color:#F97316;text-align:left;">$19.90</td><td align="right" style="padding:14px 14px 14px 0;font-size:11px;color:#10B981;font-weight:700;">Save $179</td></tr>
        <tr class="price-row" style="border-bottom:1px solid #f3f4f6;"><td style="padding:14px 0 14px 14px;font-size:14px;font-weight:700;color:#111;text-align:left;">50K</td><td style="padding:14px 8px;font-size:13px;color:#9ca3af;text-decoration:line-through;text-align:left;">$249</td><td style="padding:14px 8px;font-size:18px;font-weight:800;color:#F97316;text-align:left;">$24.90</td><td align="right" style="padding:14px 14px 14px 0;font-size:11px;color:#10B981;font-weight:700;">Save $224</td></tr>
        <tr><td colspan="4" style="padding:14px 0;"><a href="https://www.marketscoupons.com/aff/go/apex" style="display:block;text-decoration:none;background:#fff7ed;border-radius:10px;box-shadow:inset 0 0 0 2px #F97316;position:relative;">
          <div style="position:absolute;top:-9px;left:14px;background:#F97316;color:#fff;font-size:9px;font-weight:800;letter-spacing:.8px;text-transform:uppercase;padding:3px 9px;border-radius:4px;">Most Popular</div>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="padding:18px 0 18px 14px;font-size:15px;font-weight:800;color:#111;width:60px;text-align:left;">100K</td><td style="padding:18px 8px;font-size:13px;color:#9ca3af;text-decoration:line-through;text-align:left;">$399</td><td style="padding:18px 8px;font-size:22px;font-weight:900;color:#F97316;text-align:left;">$39.90</td><td align="right" style="padding:18px 14px 18px 0;font-size:11px;color:#10B981;font-weight:700;">Save $359</td></tr></table>
        </a></td></tr>
        <tr class="price-row" style="border-top:1px solid #f3f4f6;"><td style="padding:14px 0 14px 14px;font-size:14px;font-weight:700;color:#111;text-align:left;">150K</td><td style="padding:14px 8px;font-size:13px;color:#9ca3af;text-decoration:line-through;text-align:left;">$599</td><td style="padding:14px 8px;font-size:18px;font-weight:800;color:#F97316;text-align:left;">$59.90</td><td align="right" style="padding:14px 14px 14px 0;font-size:11px;color:#10B981;font-weight:700;">Save $539</td></tr>
      </table>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:18px;"><tr><td align="center"><a href="https://www.marketscoupons.com/aff/go/apex" style="display:inline-block;padding:13px 32px;background:#F97316;color:#fff;font-size:14px;font-weight:800;text-decoration:none;border-radius:8px;letter-spacing:.2px;">Get Apex with MARKET coupon &rarr;</a></td></tr></table>
      <p style="margin:10px 0 0;font-size:11px;color:#9ca3af;line-height:1.5;text-align:center;">Use the coupon code <strong style="color:#374151;">MARKET</strong> at checkout to apply the 90% discount.</p>
      </td></tr>
    </table>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#fff;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;margin-bottom:24px;">
      <tr><td style="background:#3B82F6;padding:16px 22px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
        <td style="vertical-align:middle;text-align:left;"><div style="font-size:17px;font-weight:800;color:#fff;letter-spacing:-.2px;">Bulenox</div><div style="margin-top:2px;font-size:11px;color:rgba(255,255,255,.92);font-weight:600;letter-spacing:.8px;text-transform:uppercase;">89% OFF · Lifetime</div></td>
        <td align="right" style="vertical-align:middle;"><div style="display:inline-block;padding:7px 13px;background:#0d141c;border-radius:6px;font-family:'Courier New',monospace;font-size:14px;font-weight:800;color:#60A5FA;letter-spacing:1.5px;">MARKET89</div></td>
      </tr></table></td></tr>
      <tr><td style="padding:8px 22px 18px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;">
        <tr class="price-row" style="border-bottom:1px solid #f3f4f6;"><td style="padding:14px 0 14px 14px;font-size:14px;font-weight:700;color:#111;width:60px;text-align:left;">25K</td><td style="padding:14px 8px;font-size:13px;color:#9ca3af;text-decoration:line-through;text-align:left;">$145</td><td style="padding:14px 8px;font-size:18px;font-weight:800;color:#3B82F6;text-align:left;">$15.95</td><td align="right" style="padding:14px 14px 14px 0;font-size:11px;color:#10B981;font-weight:700;">Save $129</td></tr>
        <tr class="price-row" style="border-bottom:1px solid #f3f4f6;"><td style="padding:14px 0 14px 14px;font-size:14px;font-weight:700;color:#111;text-align:left;">50K</td><td style="padding:14px 8px;font-size:13px;color:#9ca3af;text-decoration:line-through;text-align:left;">$175</td><td style="padding:14px 8px;font-size:18px;font-weight:800;color:#3B82F6;text-align:left;">$19.25</td><td align="right" style="padding:14px 14px 14px 0;font-size:11px;color:#10B981;font-weight:700;">Save $156</td></tr>
        <tr><td colspan="4" style="padding:14px 0;"><a href="https://www.marketscoupons.com/aff/go/bulenox" style="display:block;text-decoration:none;background:#eff6ff;border-radius:10px;box-shadow:inset 0 0 0 2px #3B82F6;position:relative;">
          <div style="position:absolute;top:-9px;left:14px;background:#3B82F6;color:#fff;font-size:9px;font-weight:800;letter-spacing:.8px;text-transform:uppercase;padding:3px 9px;border-radius:4px;">Most Popular</div>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="padding:18px 0 18px 14px;font-size:15px;font-weight:800;color:#111;width:60px;text-align:left;">100K</td><td style="padding:18px 8px;font-size:13px;color:#9ca3af;text-decoration:line-through;text-align:left;">$215</td><td style="padding:18px 8px;font-size:22px;font-weight:900;color:#3B82F6;text-align:left;">$23.65</td><td align="right" style="padding:18px 14px 18px 0;font-size:11px;color:#10B981;font-weight:700;">Save $191</td></tr></table>
        </a></td></tr>
        <tr class="price-row" style="border-top:1px solid #f3f4f6;"><td style="padding:14px 0 14px 14px;font-size:14px;font-weight:700;color:#111;text-align:left;">150K</td><td style="padding:14px 8px;font-size:13px;color:#9ca3af;text-decoration:line-through;text-align:left;">$325</td><td style="padding:14px 8px;font-size:18px;font-weight:800;color:#3B82F6;text-align:left;">$35.75</td><td align="right" style="padding:14px 14px 14px 0;font-size:11px;color:#10B981;font-weight:700;">Save $289</td></tr>
      </table>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:18px;"><tr><td align="center"><a href="https://www.marketscoupons.com/aff/go/bulenox" style="display:inline-block;padding:13px 32px;background:#3B82F6;color:#fff;font-size:14px;font-weight:800;text-decoration:none;border-radius:8px;letter-spacing:.2px;">Get Bulenox with MARKET89 &rarr;</a></td></tr></table>
      <p style="margin:10px 0 0;font-size:11px;color:#9ca3af;line-height:1.5;text-align:center;">Use the coupon code <strong style="color:#374151;">MARKET89</strong> at checkout to apply the 89% discount.</p>
      </td></tr>
    </table>
    <p style="margin:24px 0 8px;font-size:13px;color:#6b7480;line-height:1.6;">After today, both go back to full price. Any firm may extend or end the promotion without prior notice.</p>
  </td></tr>
  <tr><td style="padding:0 36px;"><div style="border-top:1px solid #e5e7eb;margin-top:18px;"></div></td></tr>
  <tr><td style="padding:24px 36px 28px;"><table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
    <td style="vertical-align:middle;padding-right:14px;"><div style="width:46px;height:46px;border-radius:50%;background:#F0B429;text-align:center;line-height:46px;font-size:17px;font-weight:800;color:#fff;">L</div></td>
    <td style="vertical-align:middle;"><div style="font-size:14px;font-weight:700;color:#111;">Lara</div><div style="font-size:12px;color:#6b7480;">Markets Coupons</div></td>
  </tr></table></td></tr>
  <tr><td style="background:#fafafa;padding:22px 32px;text-align:center;border-top:1px solid #e5e7eb;">
    <p style="margin:0 0 8px;font-size:11px;color:#9ca3af;line-height:1.6;">You're receiving this because you signed up at Markets Coupons.<br>Markets Coupons is an educational/affiliate platform — we are not a broker, FCM, or registered advisor.</p>
    <p style="margin:8px 0 0;font-size:11px;color:#9ca3af;">&copy; ${ano} Markets Coupons</p>
    <p style="margin:10px 0 0;font-size:10px;color:#b9c0c9;"><a href="${unsubUrl||'https://www.marketscoupons.com/'}" style="color:#9ca3af;text-decoration:underline;">Unsubscribe</a></p>
  </td></tr>
</table></td></tr></table>
</body></html>`;
}

function renderInstHtml(name, lang, unsubUrl) {
  const t = INST_TEMPLATES[name];
  if (!t) return null;
  if (t.kind === 'giveaway') return buildGiveawayHtml(t, lang, unsubUrl);
  if (t.kind === 'urgent-deal') return buildUrgentDealHtml(t, lang, unsubUrl);
  const C = t.color;
  const F = "'Inter',Helvetica,Arial,sans-serif";
  const dir = lang === 'ar' ? 'rtl' : 'ltr';
  const sub = (s) => String(s || '').replace(/\{C\}/g, C);

  const featuresHtml = (pick(t.features, lang) || []).map(f =>
    `<tr><td style="padding:10px 0;border-bottom:1px solid #f0f0f0;font-family:${F};font-size:14px;color:#444;line-height:1.6;">
      <span style="color:${C};font-weight:700;margin-right:10px;">&#10003;</span>${f}
    </td></tr>`
  ).join('');

  let highlightHtml = '';
  if (t.highlight) {
    highlightHtml = `
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:24px 0;"><tr><td bgcolor="#fff4e6" style="background-color:${C}15;border:1px solid ${C}55;border-left:4px solid ${C};border-radius:12px;padding:20px 22px;">
      <p style="font-family:${F};font-size:11px;font-weight:700;color:${C};text-transform:uppercase;letter-spacing:1px;margin:0 0 8px;">${pick(t.highlight.label, lang)}</p>
      <p style="font-family:${F};font-size:18px;font-weight:800;color:#1a1a1a;line-height:1.3;margin:0 0 6px;">${sub(pick(t.highlight.title, lang))}</p>
      <p style="font-family:${F};font-size:13px;color:#666;line-height:1.5;margin:0;">${pick(t.highlight.sub, lang)}</p>
    </td></tr></table>`;
  }

  return `<!DOCTYPE html>
<html dir="${dir}" lang="${lang}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<style>html,body{margin:0!important;padding:0!important;background-color:#f0f0f0!important;}table{border-spacing:0!important;border-collapse:collapse!important;}@media only screen and (max-width:600px){.ec{width:100%!important;}.ps{padding-left:18px!important;padding-right:18px!important;}}</style></head>
<body bgcolor="#f0f0f0" style="margin:0;padding:0;background-color:#f0f0f0;font-family:${F};">
<div style="display:none;max-height:0;overflow:hidden;font-size:1px;line-height:1px;color:#f0f0f0;opacity:0;mso-hide:all;">${pick(t.preheader, lang)}</div>
<div style="display:none;max-height:0;overflow:hidden;">&nbsp;&#847;&nbsp;&#847;&nbsp;&#847;&nbsp;&#847;&nbsp;&#847;&nbsp;&#847;&nbsp;&#847;&nbsp;&#847;&nbsp;&#847;&nbsp;&#847;&nbsp;&#847;&nbsp;&#847;</div>
<table width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#f0f0f0" role="presentation"><tr><td align="center" style="padding:32px 16px;">
<table class="ec" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;">
  <tr><td bgcolor="#ffffff" style="background-color:#ffffff;border-radius:16px 16px 0 0;border:1px solid #e0e0e0;border-bottom:none;padding:26px 40px 22px;text-align:center;">
    <span style="font-size:22px;font-weight:800;color:#1a1a1a;letter-spacing:-0.5px;font-family:${F};">Markets <span style="color:${C};">Coupons</span></span><br>
    <span style="font-size:11px;font-weight:600;color:#aaa;letter-spacing:2.5px;text-transform:uppercase;font-family:${F};">${pick(TAGLINE, lang)}</span>
  </td></tr>
  <tr><td bgcolor="#111111" style="background-color:#111111;border-left:1px solid #e0e0e0;border-right:1px solid #e0e0e0;">
    <table width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td height="4" bgcolor="${C}" style="background-color:${C};font-size:0;line-height:0;">&nbsp;</td></tr></table>
    <table width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td class="ps" style="padding:44px 40px 40px;font-family:${F};">
      <h1 style="font-family:${F};font-size:30px;font-weight:800;color:#fff;line-height:1.2;letter-spacing:-1px;margin:0 0 16px;">${pick(t.title, lang)}</h1>
      <p style="font-family:${F};font-size:15px;color:#aaa;line-height:1.7;margin:0;">${pick(t.body, lang)}</p>
    </td></tr></table>
    <table width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td height="4" bgcolor="${C}" style="background-color:${C};font-size:0;line-height:0;">&nbsp;</td></tr></table>
  </td></tr>
  <tr><td class="ps" bgcolor="#ffffff" style="background-color:#ffffff;border:1px solid #e0e0e0;border-top:none;border-bottom:none;padding:36px 40px;font-family:${F};">
    ${highlightHtml}
    <p style="font-family:${F};font-size:11px;font-weight:700;color:#aaa;text-transform:uppercase;letter-spacing:2px;margin:24px 0 12px;">${pick({pt:'O que você ganha',en:'What you get',es:'Lo que obtienes',fr:'Ce que vous gagnez',de:'Was du bekommst',it:'Cosa ottieni',ar:'ما تحصل عليه'}, lang)}</p>
    <table width="100%" cellpadding="0" cellspacing="0" border="0">${featuresHtml}</table>
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:32px 0 8px;"><tr><td align="center">
      <table cellpadding="0" cellspacing="0" border="0"><tr><td bgcolor="${C}" style="background-color:${C};border-radius:50px;">
        <a href="https://www.marketscoupons.com" target="_blank" style="display:inline-block;font-family:${F};font-size:15px;font-weight:800;color:#fff;text-decoration:none;padding:16px 48px;">${pick(t.cta, lang)}</a>
      </td></tr></table>
    </td></tr></table>
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:32px;"><tr valign="middle">
      <td width="44"><table cellpadding="0" cellspacing="0" border="0"><tr><td bgcolor="${C}" style="background-color:${C};border-radius:50%;width:40px;height:40px;text-align:center;"><span style="font-family:${F};font-size:17px;font-weight:800;color:#fff;line-height:40px;display:block;">L</span></td></tr></table></td>
      <td style="padding-left:12px;"><p style="font-family:${F};font-size:14px;font-weight:700;color:#1a1a1a;margin:0 0 2px;">Lara</p><p style="font-family:${F};font-size:12px;color:#888;margin:0;">${pick({pt:'Equipe Markets Coupons',en:'Markets Coupons Team',es:'Equipo Markets Coupons',fr:'Équipe Markets Coupons',de:'Markets Coupons Team',it:'Team Markets Coupons',ar:'فريق Markets Coupons'}, lang)}</p></td>
    </tr></table>
  </td></tr>
  <tr><td bgcolor="#f7f7f7" style="background-color:#f7f7f7;border:1px solid #e0e0e0;border-top:none;border-radius:0 0 16px 16px;padding:22px 40px;text-align:center;">
    <p style="font-family:${F};font-size:11px;color:#aaa;line-height:1.9;margin:0;">${pick(FOOTER_TEXT, lang)}<br><a href="${unsubUrl||'https://www.marketscoupons.com/'}" style="color:#aaa;text-decoration:underline;">${pick(UNSUB_TEXT, lang)}</a></p>
  </td></tr>
</table></td></tr></table>
</body></html>`;
}

function getSubject(name, lang) {
  return pick(INST_TEMPLATES[name]?.subject, lang) || '';
}

module.exports = { renderInstHtml, getSubject, INST_TEMPLATES };
