// Vercel Serverless — Send welcome email to new subscriber
// POST /api/welcome-email { email, name, lang }
// Uses the new "Markets Coupons." premium template (orange accent, white layout).

const { sign: signUnsub } = require('./unsubscribe.js');
const { applyCors } = require('./_cors.js');
const { rateLimitIp } = require('./_ratelimit.js');
const { safeError } = require('./_safe-error.js');

const SUPABASE_URL = 'https://qfwhduvutfumsaxnuofa.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFmd2hkdXZ1dGZ1bXNheG51b2ZhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQzNzc5NDYsImV4cCI6MjA4OTk1Mzk0Nn0.efRel6U68misvPSRj8-p31-gOhzjXN4eIFMiloTNyk4';

const INST_WELCOME = {
  subject: { pt:'Bom te ter aqui, Trader', en:'Good to have you here, Trader', es:'Que bueno tenerte aqui, Trader', fr:'Content de vous avoir, Trader', de:'Schon, dass du da bist, Trader', it:'Bello averti qui, Trader', ar:'سعداء بوجودك هنا' },
  preheader: { pt:'Cupons exclusivos negociados direto com as firmas. Até 90% off. Tudo num só lugar.', en:'Exclusive coupons negotiated directly with firms. Up to 90% off. All in one place.', es:'Cupones exclusivos negociados directo con las firmas. Hasta 90% off. Todo en un lugar.', fr:'Coupons exclusifs négociés directement avec les firmes. Jusqu\'à 90% de réduction. Tout au même endroit.', de:'Exklusive Gutscheine direkt mit den Firmen verhandelt. Bis zu 90% Rabatt. Alles an einem Ort.', it:'Coupon esclusivi negoziati direttamente con le firme. Fino al 90% di sconto. Tutto in un unico posto.', ar:'كوبونات حصرية تم التفاوض عليها مباشرة مع الشركات. خصم يصل إلى 90%. كل شيء في مكان واحد.' },
  body: {
    pt:'Aqui você encontra <b>cupons verificados, comparador de firmas, análise diária e calculadoras</b> — tudo num só lugar, atualizado todos os dias. Comece conhecendo as ofertas em destaque.',
    en:'Here you\'ll find <b>verified coupons, firm comparator, daily analysis and calculators</b> — all in one place, updated daily. Start by checking the featured deals.',
    es:'Aqui encontras <b>cupones verificados, comparador de firmas, analisis diario y calculadoras</b> — todo en un solo lugar, actualizado todos los dias. Empieza por las ofertas destacadas.',
    fr:'Ici vous trouverez <b>coupons vérifiés, comparateur de firmes, analyse quotidienne et calculatrices</b> — tout au même endroit, mis à jour chaque jour. Commencez par les offres phares.',
    de:'Hier findest du <b>verifizierte Gutscheine, Firmen-Vergleich, tägliche Analyse und Rechner</b> — alles an einem Ort, täglich aktualisiert. Starte mit den Top-Angeboten.',
    it:'Qui trovi <b>coupon verificati, comparatore di firme, analisi quotidiana e calcolatrici</b> — tutto in un unico posto, aggiornato ogni giorno. Inizia dalle offerte in evidenza.',
    ar:'هنا تجد <b>كوبونات موثقة، مقارن شركات، تحليل يومي وحاسبات</b> — كل شيء في مكان واحد، محدث يومياً. ابدأ بالعروض المميزة.'
  },
  cta: { pt:'CONHECER O SITE', en:'VISIT THE SITE', es:'CONOCER EL SITIO', fr:'DECOUVRIR LE SITE', de:'WEBSITE BESUCHEN', it:'VISITA IL SITO', ar:'زيارة الموقع' },
  footer: { pt:'Você está recebendo este email porque se cadastrou na Markets Coupons.', en:'You are receiving this email because you signed up at Markets Coupons.', es:'Estás recibiendo este email porque te registraste en Markets Coupons.', fr:'Vous recevez cet email car vous vous êtes inscrit sur Markets Coupons.', de:'Sie erhalten diese E-Mail, weil Sie sich bei Markets Coupons angemeldet haben.', it:'Ricevi questa email perché ti sei iscritto a Markets Coupons.', ar:'تتلقى هذا البريد لأنك سجلت في Markets Coupons.' },
  unsub: { pt:'Descadastrar', en:'Unsubscribe', es:'Darse de baja', fr:'Se désinscrire', de:'Abmelden', it:'Annulla iscrizione', ar:'إلغاء الاشتراك' },
};

const PCFG = {
  color:'#ff8c00', hlBg:'#fff4e6', hlBorder:'#ffcc80', hlSub:'#aa7030',
  heroBadge:{pt:'Bem-vindo',en:'Welcome',es:'Bienvenido',fr:'Bienvenue',de:'Willkommen',it:'Benvenuto',ar:'مرحباً'},
  heroH1:{pt:'Bom te ter<br>aqui,<br><span style="color:${C};">Trader.</span>',en:'Good to<br>have you,<br><span style="color:${C};">Trader.</span>',es:'Qué bueno<br>tenerte aquí,<br><span style="color:${C};">Trader.</span>',fr:'Content de<br>t\'avoir ici,<br><span style="color:${C};">Trader.</span>',de:'Schön, dass<br>du da bist,<br><span style="color:${C};">Trader.</span>',it:'Bello<br>averti qui,<br><span style="color:${C};">Trader.</span>',ar:'سعداء<br>بوجودك،<br><span style="color:${C};">Trader.</span>'},
  heroBody:{pt:'A gente sabe como é começar nesse mercado. Criamos o MarketsCoupons pra reunir traders que querem pagar menos e operar melhor.',en:'We know how hard it is to start in this market. We built MarketsCoupons to bring together traders who want to pay less and trade better.',es:'Sabemos lo difícil que es empezar. Creamos MarketsCoupons para reunir traders que quieren pagar menos y operar mejor.',fr:'On sait combien c\'est dur de débuter. On a créé MarketsCoupons pour les traders qui veulent payer moins et mieux trader.',de:'Wir wissen, wie schwer der Anfang ist. Wir haben MarketsCoupons für Trader geschaffen, die weniger zahlen und besser traden wollen.',it:'Sappiamo quanto è difficile iniziare. Abbiamo creato MarketsCoupons per trader che vogliono pagare meno e operare meglio.',ar:'نعرف صعوبة البداية. أنشأنا MarketsCoupons لجمع المتداولين الذين يريدون دفع أقل والتداول بشكل أفضل.'},
  m1v:'11+', m1l:{pt:'Prop Firms',en:'Prop Firms',es:'Prop Firms',fr:'Prop Firms',de:'Prop Firms',it:'Prop Firms',ar:'Prop Firms'},
  m2v:'90%', m2l:{pt:'desconto máx',en:'max discount',es:'descuento máx',fr:'réduc max',de:'max Rabatt',it:'sconto max',ar:'أقصى خصم'},
  m3v:'6+', m3l:{pt:'Ferramentas',en:'Tools',es:'Herramientas',fr:'Outils',de:'Tools',it:'Strumenti',ar:'أدوات'},
  hlLabel:{pt:'Comece por aqui',en:'Start here',es:'Empieza aquí',fr:'Commencez ici',de:'Starte hier',it:'Inizia qui',ar:'ابدأ من هنا'},
  hlTitle:{pt:'Bulenox 100K por apenas <span style="color:${C};">$23,65</span>',en:'Bulenox 100K for just <span style="color:${C};">$23.65</span>',es:'Bulenox 100K por solo <span style="color:${C};">$23,65</span>',fr:'Bulenox 100K pour seulement <span style="color:${C};">$23,65</span>',de:'Bulenox 100K für nur <span style="color:${C};">$23,65</span>',it:'Bulenox 100K a soli <span style="color:${C};">$23,65</span>',ar:'Bulenox 100K بسعر <span style="color:${C};">$23.65</span>'},
  hlSubTxt:{pt:'Cupom <strong>MARKET89</strong> — 89% OFF aplicado automaticamente no checkout',en:'Coupon <strong>MARKET89</strong> — 89% OFF applied automatically at checkout',es:'Cupón <strong>MARKET89</strong> — 89% OFF aplicado automáticamente',fr:'Coupon <strong>MARKET89</strong> — 89% OFF appliqué automatiquement',de:'Gutschein <strong>MARKET89</strong> — 89% OFF automatisch angewendet',it:'Coupon <strong>MARKET89</strong> — 89% OFF applicato automaticamente',ar:'كوبون <strong>MARKET89</strong> — 89% OFF يُطبق تلقائياً'}
};

function buildUnsubUrl(email, lang){
  try {
    const t = signUnsub(email);
    return `https://www.marketscoupons.com/api/unsubscribe?e=${encodeURIComponent(email)}&t=${t}&lang=${lang||'en'}`;
  } catch { return 'https://www.marketscoupons.com/'; }
}

function buildWelcomeHtml(lang='pt', email=''){
  const unsubUrl = email ? buildUnsubUrl(email, lang) : 'https://www.marketscoupons.com/';
  const gt = (obj) => obj[lang] || obj.en || obj.pt || '';
  const C = PCFG.color;
  const T = (obj) => { const s = obj[lang]||obj.en||obj.pt||''; return s.replace(/\$\{C\}/g, C); };
  const F = "'Inter',Helvetica,Arial,sans-serif";
  const dir = lang==='ar' ? 'rtl' : 'ltr';

  return `<!DOCTYPE html>
<html dir="${dir}" lang="${lang}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<meta name="color-scheme" content="only light"><meta name="supported-color-schemes" content="only light">
<style>
:root{color-scheme:light only;}
html,body{margin:0!important;padding:0!important;background-color:#f0f0f0!important;}
body,table,td,div,p,a,span{-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;}
table{border-spacing:0!important;border-collapse:collapse!important;}
@media only screen and (max-width:600px){
  .ec{width:100%!important;}
  .ps{padding-left:18px!important;padding-right:18px!important;}
}
</style>
</head>
<body bgcolor="#f0f0f0" style="margin:0;padding:0;background-color:#f0f0f0;font-family:${F};">
<div style="display:none;max-height:0;overflow:hidden;font-size:1px;line-height:1px;color:#f0f0f0;opacity:0;mso-hide:all;">${gt(INST_WELCOME.preheader)}</div>
<div style="display:none;max-height:0;overflow:hidden;">&nbsp;&#847;&nbsp;&#847;&nbsp;&#847;&nbsp;&#847;&nbsp;&#847;&nbsp;&#847;&nbsp;&#847;&nbsp;&#847;&nbsp;&#847;&nbsp;&#847;&nbsp;&#847;&nbsp;&#847;&nbsp;&#847;&nbsp;&#847;&nbsp;&#847;&nbsp;&#847;&nbsp;&#847;&nbsp;&#847;&nbsp;&#847;</div>
<table width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#f0f0f0" role="presentation">
<tr><td align="center" style="padding:32px 16px;">
<table class="ec" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;">

<!-- LOGO -->
<tr><td bgcolor="#ffffff" style="background-color:#ffffff;border-radius:16px 16px 0 0;border:1px solid #e0e0e0;border-bottom:none;padding:26px 40px 22px;text-align:center;font-family:${F};">
  <span style="font-size:22px;font-weight:800;color:#1a1a1a;letter-spacing:-0.5px;">Markets <span style="color:#ff8c00;">Coupons</span><span style="color:#ff8c00;font-size:9px;"> &#9679;</span></span><br>
  <span style="font-size:11px;font-weight:600;color:#aaa;letter-spacing:2.5px;text-transform:uppercase;">${T({pt:'as melhores ofertas para traders',en:'the best deals for traders',es:'las mejores ofertas para traders',fr:'les meilleures offres pour traders',de:'die besten angebote für trader',it:'le migliori offerte per trader',ar:'أفضل العروض للمتداولين'})}</span>
</td></tr>

<!-- HERO -->
<tr><td bgcolor="#111111" style="background-color:#111111;border-left:1px solid #e0e0e0;border-right:1px solid #e0e0e0;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td height="4" bgcolor="${C}" style="background-color:${C};font-size:0;line-height:0;">&nbsp;</td></tr></table>
  <table width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td class="ps" style="padding:44px 40px 40px;font-family:${F};">
    <table cellpadding="0" cellspacing="0" border="0" style="margin-bottom:20px;"><tr><td bgcolor="#1e1e1e" style="background-color:#1e1e1e;border:1px solid #2a2a2a;border-radius:20px;padding:5px 14px;">
      <span style="font-size:11px;font-weight:700;color:${C};text-transform:uppercase;letter-spacing:1.5px;">${T(PCFG.heroBadge)}</span>
    </td></tr></table>
    <h1 style="font-family:${F};font-size:38px;font-weight:800;color:#fff;line-height:1.1;letter-spacing:-1.5px;margin:0 0 16px;">${T(PCFG.heroH1)}</h1>
    <p style="font-family:${F};font-size:15px;color:#888;line-height:1.6;max-width:380px;margin:0 0 32px;">${T(PCFG.heroBody)}</p>
    <table cellpadding="0" cellspacing="0" border="0"><tr>
      <td style="padding-right:24px;border-right:1px solid #2a2a2a;">
        <p style="font-family:${F};font-size:18px;font-weight:800;color:${C};margin:0;">${PCFG.m1v}</p>
        <p style="font-family:${F};font-size:10px;color:#555;text-transform:uppercase;letter-spacing:0.5px;margin:0;">${T(PCFG.m1l)}</p>
      </td>
      <td style="padding:0 24px;border-right:1px solid #2a2a2a;">
        <p style="font-family:${F};font-size:18px;font-weight:800;color:${C};margin:0;">${PCFG.m2v}</p>
        <p style="font-family:${F};font-size:10px;color:#555;text-transform:uppercase;letter-spacing:0.5px;margin:0;">${T(PCFG.m2l)}</p>
      </td>
      <td style="padding-left:24px;">
        <p style="font-family:${F};font-size:18px;font-weight:800;color:${C};margin:0;">${PCFG.m3v}</p>
        <p style="font-family:${F};font-size:10px;color:#555;text-transform:uppercase;letter-spacing:0.5px;margin:0;">${T(PCFG.m3l)}</p>
      </td>
    </tr></table>
  </td></tr></table>
  <table width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td height="4" bgcolor="${C}" style="background-color:${C};font-size:0;line-height:0;">&nbsp;</td></tr></table>
</td></tr>

<!-- BODY -->
<tr><td class="ps" bgcolor="#ffffff" style="background-color:#ffffff;border:1px solid #e0e0e0;border-top:none;border-bottom:none;padding:36px 40px;font-family:${F};">
  <p style="font-size:16px;font-weight:600;color:#1a1a1a;margin:0 0 10px;">${T({pt:'Olá, Trader.',en:'Hey, Trader.',es:'Hola, Trader.',fr:'Salut, Trader.',de:'Hallo, Trader.',it:'Ciao, Trader.',ar:'مرحباً، Trader.'})}</p>
  <p style="font-size:15px;color:#555;line-height:1.75;margin:0 0 28px;">${gt(INST_WELCOME.body)}</p>

  <!-- DIVIDER -->
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:28px;"><tr><td height="1" style="background-color:#eee;font-size:0;line-height:0;">&nbsp;</td></tr></table>

  <!-- HIGHLIGHT -->
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:28px;"><tr><td bgcolor="${PCFG.hlBg}" style="background-color:${PCFG.hlBg};border:1px solid ${PCFG.hlBorder};border-left:4px solid ${C};border-radius:12px;padding:22px 24px;">
    <p style="font-family:${F};font-size:11px;font-weight:700;color:${C};text-transform:uppercase;letter-spacing:1px;margin:0 0 8px;">${T(PCFG.hlLabel)}</p>
    <p style="font-family:${F};font-size:20px;font-weight:800;color:#1a1a1a;line-height:1.3;margin:0 0 6px;">${T(PCFG.hlTitle)}</p>
    <p style="font-family:${F};font-size:12px;color:${PCFG.hlSub};line-height:1.5;margin:0;">${T(PCFG.hlSubTxt)}</p>
  </td></tr></table>

  <!-- CTA PILL -->
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:8px;"><tr><td align="center">
    <table cellpadding="0" cellspacing="0" border="0"><tr><td bgcolor="${C}" style="background-color:${C};border-radius:50px;">
      <a href="https://www.marketscoupons.com" target="_blank" style="display:inline-block;font-family:${F};font-size:16px;font-weight:800;color:#fff;text-decoration:none;padding:17px 52px;">${gt(INST_WELCOME.cta)}</a>
    </td></tr></table>
  </td></tr></table>
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:32px;"><tr><td align="center"><span style="font-family:${F};font-size:12px;color:#bbb;">www.marketscoupons.com</span></td></tr></table>

  <!-- DIVIDER -->
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:24px;"><tr><td height="1" style="background-color:#eee;font-size:0;line-height:0;">&nbsp;</td></tr></table>

  <!-- ASSINATURA -->
  <table cellpadding="0" cellspacing="0" border="0"><tr valign="middle">
    <td width="44"><table cellpadding="0" cellspacing="0" border="0"><tr><td bgcolor="${C}" style="background-color:${C};border-radius:50%;width:40px;height:40px;text-align:center;vertical-align:middle;">
      <span style="font-family:${F};font-size:17px;font-weight:800;color:#fff;line-height:40px;display:block;">L</span>
    </td></tr></table></td>
    <td style="padding-left:12px;">
      <p style="font-family:${F};font-size:14px;font-weight:700;color:#1a1a1a;margin:0 0 2px;">Lara</p>
      <p style="font-family:${F};font-size:12px;color:#888;margin:0;">${T({pt:'Equipe Markets Coupons',en:'Markets Coupons Team',es:'Equipo Markets Coupons',fr:'Équipe Markets Coupons',de:'Markets Coupons Team',it:'Team Markets Coupons',ar:'فريق Markets Coupons'})}</p>
    </td>
  </tr></table>
</td></tr>

<!-- FOOTER -->
<tr><td bgcolor="#f7f7f7" style="background-color:#f7f7f7;border:1px solid #e0e0e0;border-top:none;border-radius:0 0 16px 16px;padding:22px 40px;text-align:center;">
  <p style="font-family:${F};font-size:11px;color:#aaa;line-height:1.9;margin:0;">
    ${gt(INST_WELCOME.footer)}<br>
    <a href="${unsubUrl}" style="color:#aaa;text-decoration:underline;">${gt(INST_WELCOME.unsub)}</a>
  </p>
</td></tr>

</table></td></tr></table>
</body></html>`;
}

module.exports = async (req, res) => {
  if (applyCors(req, res, { methods: 'POST, OPTIONS' })) return;
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!rateLimitIp(req, 10)) return res.status(429).json({ error: 'rate_limit' });

  const BREVO_KEY = process.env.BREVO_API_KEY;
  const RESEND_KEY = process.env.RESEND_API_KEY;
  if (!BREVO_KEY && !RESEND_KEY) return res.status(500).json({ error: 'No email provider configured' });

  const { email, name, lang } = req.body || {};
  if (!email) return res.status(400).json({ error: 'Missing email' });

  const useLang = (lang && INST_WELCOME.subject[lang]) ? lang : 'en';

  try {
    const tagUrl = (url) => {
      try {
        if (!/^https?:\/\/(www\.)?marketscoupons\.(com|vercel\.app)/i.test(url)) return url;
        const u = new URL(url);
        if (!u.searchParams.get('utm_source')) u.searchParams.set('utm_source', 'email');
        if (!u.searchParams.get('utm_medium')) u.searchParams.set('utm_medium', 'welcome');
        if (!u.searchParams.get('utm_campaign')) u.searchParams.set('utm_campaign', 'welcome_' + useLang);
        return u.toString();
      } catch { return url; }
    };

    const unsubUrl = (() => { try { return `https://www.marketscoupons.com/api/unsubscribe?e=${encodeURIComponent(email)}&t=${signUnsub(email)}&lang=${useLang}`; } catch { return ''; } })();
    const listUnsubHeader = unsubUrl ? `<${unsubUrl}>, <mailto:unsubscribe@marketscoupons.com?subject=unsubscribe>` : '<mailto:unsubscribe@marketscoupons.com?subject=unsubscribe>';

    const htmlContent = buildWelcomeHtml(useLang, email)
      .replace(/href\s*=\s*"(https?:\/\/[^"]+)"/gi, (m, url) => {
        if (url.indexOf('/api/unsubscribe') !== -1) return `href="${url}"`;
        return `href="${tagUrl(url)}"`;
      });

    const subject = INST_WELCOME.subject[useLang] || INST_WELCOME.subject.en;

    async function sendBrevo() {
      const r = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: { 'accept': 'application/json', 'content-type': 'application/json', 'api-key': BREVO_KEY },
        body: JSON.stringify({
          sender: { name: 'Lara | Markets Coupons', email: 'lara@marketscoupons.com' },
          to: [{ email, name: name || 'Trader' }],
          subject, htmlContent,
          headers: {
            'List-Unsubscribe': listUnsubHeader,
            'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
          },
          tags: ['welcome', 'lang-' + useLang],
        }),
      });
      const d = await r.json().catch(() => ({}));
      const quotaHit = !r.ok && (r.status === 402 || r.status === 429 || /credit|quota|limit/i.test(JSON.stringify(d)));
      return { ok: r.ok, status: r.status, data: d, quotaHit, provider: 'brevo' };
    }

    async function sendResend() {
      const r = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${RESEND_KEY}` },
        body: JSON.stringify({
          from: 'Lara | Markets Coupons <lara@marketscoupons.com>',
          to: [email],
          subject, html: htmlContent,
          headers: {
            'List-Unsubscribe': listUnsubHeader,
            'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
          },
          tags: [{ name: 'type', value: 'welcome' }, { name: 'lang', value: useLang }],
        }),
      });
      const d = await r.json().catch(() => ({}));
      return { ok: r.ok, status: r.status, data: d, provider: 'resend' };
    }

    let result = null;
    if (BREVO_KEY) {
      result = await sendBrevo();
      if (!result.ok && RESEND_KEY) {
        console.log(`[welcome] Brevo failed (${result.status}), falling back to Resend`);
        result = await sendResend();
      }
    } else if (RESEND_KEY) {
      result = await sendResend();
    }

    await fetch(`${SUPABASE_URL}/rest/v1/email_logs`, {
      method: 'POST',
      headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'application/json', 'Prefer': 'return=minimal' },
      body: JSON.stringify({
        campaign_name: 'Welcome Email',
        subject, recipients: 1,
        status: result.ok ? 'sent' : 'failed',
        sent_by: 'webhook',
        provider: result.provider,
      }),
    });

    return res.status(result.ok ? 200 : 500).json({
      success: result.ok,
      email, lang: useLang,
      provider: result.provider,
      response: result.data,
    });
  } catch (err) {
    return safeError(res, 500, 'Internal error', err);
  }
};
