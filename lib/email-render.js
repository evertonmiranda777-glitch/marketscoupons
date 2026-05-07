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

function renderInstHtml(name, lang, unsubUrl) {
  const t = INST_TEMPLATES[name];
  if (!t) return null;
  if (t.kind === 'giveaway') return buildGiveawayHtml(t, lang, unsubUrl);
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
