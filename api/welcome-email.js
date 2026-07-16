// Vercel Serverless, Send welcome email + email confirmation (B.3.1 extended)
// 3 modos:
//   1) POST { email, name, lang }                   , legacy welcome (backward compat)
//   2) POST { record:{...} }                        , webhook auth on email-confirmed
//   3) POST { action:'send_confirm', email, name, lang, [resend:true] }, envia email de confirmação
//   4) GET  /email-confirm?token=xxx                , confirma email + magic link auto-login
const crypto = require('crypto');
const { sign: signUnsub } = require('./unsubscribe.js');
const { applyCors } = require('./_cors.js');
const { rateLimitIp } = require('./_ratelimit.js');
const { safeError } = require('./_safe-error.js');

const SUPABASE_URL = 'https://qfwhduvutfumsaxnuofa.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFmd2hkdXZ1dGZ1bXNheG51b2ZhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQzNzc5NDYsImV4cCI6MjA4OTk1Mzk0Nn0.efRel6U68misvPSRj8-p31-gOhzjXN4eIFMiloTNyk4';
const SK = process.env.SUPABASE_SERVICE_ROLE_KEY;
const APP_URL = 'https://www.marketscoupons.com';

const INST_WELCOME = {
  subject: { pt:'Bom te ter aqui, Trader', en:'Good to have you here, Trader', es:'Que bueno tenerte aqui, Trader', fr:'Content de vous avoir, Trader', de:'Schon, dass du da bist, Trader', it:'Bello averti qui, Trader', ar:'سعداء بوجودك هنا' },
  preheader: { pt:'Cupons exclusivos negociados direto com as firmas. Até 90% off. Tudo num só lugar.', en:'Exclusive coupons negotiated directly with firms. Up to 90% off. All in one place.', es:'Cupones exclusivos negociados directo con las firmas. Hasta 90% off. Todo en un lugar.', fr:'Coupons exclusifs négociés directement avec les firmes. Jusqu\'à 90% de réduction. Tout au même endroit.', de:'Exklusive Gutscheine direkt mit den Firmen verhandelt. Bis zu 90% Rabatt. Alles an einem Ort.', it:'Coupon esclusivi negoziati direttamente con le firme. Fino al 90% di sconto. Tutto in un unico posto.', ar:'كوبونات حصرية تم التفاوض عليها مباشرة مع الشركات. خصم يصل إلى 90%. كل شيء في مكان واحد.' },
  body: {
    pt:'Aqui você encontra <b>cupons verificados, comparador de firmas, análise diária e calculadoras</b>, tudo num só lugar, atualizado todos os dias. Comece conhecendo as ofertas em destaque.',
    en:'Here you\'ll find <b>verified coupons, firm comparator, daily analysis and calculators</b>, all in one place, updated daily. Start by checking the featured deals.',
    es:'Aqui encontras <b>cupones verificados, comparador de firmas, analisis diario y calculadoras</b>, todo en un solo lugar, actualizado todos los dias. Empieza por las ofertas destacadas.',
    fr:'Ici vous trouverez <b>coupons vérifiés, comparateur de firmes, analyse quotidienne et calculatrices</b>, tout au même endroit, mis à jour chaque jour. Commencez par les offres phares.',
    de:'Hier findest du <b>verifizierte Gutscheine, Firmen-Vergleich, tägliche Analyse und Rechner</b>, alles an einem Ort, täglich aktualisiert. Starte mit den Top-Angeboten.',
    it:'Qui trovi <b>coupon verificati, comparatore di firme, analisi quotidiana e calcolatrici</b>, tutto in un unico posto, aggiornato ogni giorno. Inizia dalle offerte in evidenza.',
    ar:'هنا تجد <b>كوبونات موثقة، مقارن شركات، تحليل يومي وحاسبات</b>, كل شيء في مكان واحد، محدث يومياً. ابدأ بالعروض المميزة.'
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
  hlSubTxt:{pt:'Cupom <strong>MARKET89</strong>, 89% OFF aplicado automaticamente no checkout',en:'Coupon <strong>MARKET89</strong>, 89% OFF applied automatically at checkout',es:'Cupón <strong>MARKET89</strong>, 89% OFF aplicado automáticamente',fr:'Coupon <strong>MARKET89</strong>, 89% OFF appliqué automatiquement',de:'Gutschein <strong>MARKET89</strong>, 89% OFF automatisch angewendet',it:'Coupon <strong>MARKET89</strong>, 89% OFF applicato automaticamente',ar:'كوبون <strong>MARKET89</strong>, 89% OFF يُطبق تلقائياً'}
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

async function alreadyReceived(email) {
  try {
    const SK = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!SK) return false;
    const r = await fetch(`${SUPABASE_URL}/rest/v1/email_subscribers?email=eq.${encodeURIComponent(email.toLowerCase())}&select=tags`, {
      headers: { apikey: SK, Authorization: `Bearer ${SK}` },
    });
    if (!r.ok) return false;
    const rows = await r.json();
    return rows.length > 0 && Array.isArray(rows[0].tags) && rows[0].tags.includes('received-welcome');
  } catch { return false; }
}

async function markReceived(email) {
  try {
    const SK = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!SK) return;
    const head = { apikey: SK, Authorization: `Bearer ${SK}`, 'Content-Type': 'application/json' };
    const e = email.toLowerCase();
    const r = await fetch(`${SUPABASE_URL}/rest/v1/email_subscribers?email=eq.${encodeURIComponent(e)}&select=tags`, { headers: head });
    const rows = r.ok ? await r.json() : [];
    if (rows.length) {
      const cur = Array.isArray(rows[0].tags) ? rows[0].tags : [];
      if (cur.includes('received-welcome')) return;
      cur.push('received-welcome');
      await fetch(`${SUPABASE_URL}/rest/v1/email_subscribers?email=eq.${encodeURIComponent(e)}`, {
        method: 'PATCH', headers: { ...head, Prefer: 'return=minimal' },
        body: JSON.stringify({ tags: cur }),
      });
    } else {
      await fetch(`${SUPABASE_URL}/rest/v1/email_subscribers`, {
        method: 'POST', headers: { ...head, Prefer: 'return=minimal' },
        body: JSON.stringify({ email: e, status: 'active', tags: ['received-welcome'], source: 'auth-hook' }),
      });
    }
  } catch {}
}

// ═══ B.3.1, Email confirmation helpers ═══

// Codigo de 6 digitos (crypto-safe, sem zero a esquerda perdido).
function generate6DigitCode() {
  return String(crypto.randomInt(100000, 1000000));
}

// Gera token UUID (link) E codigo de 6 digitos (digitavel). Os dois valem:
// o codigo e o caminho principal (mobile), o link continua como fallback.
async function generateConfirmToken(email) {
  if (!SK) return null;
  const token = crypto.randomUUID();
  const code  = generate6DigitCode();
  const expires = new Date(Date.now() + 24 * 3600 * 1000).toISOString();
  try {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/profiles?email=eq.${encodeURIComponent(email)}`, {
      method: 'PATCH',
      headers: { apikey: SK, Authorization: `Bearer ${SK}`, 'Content-Type': 'application/json', Prefer: 'return=representation' },
      body: JSON.stringify({
        email_verification_token: token,
        email_verification_code: code,
        email_verification_expires_at: expires,
        email_verification_attempts: 0,
      }),
    });
    if (!r.ok) return null;
    const rows = await r.json();
    return rows && rows[0] ? { token, code } : null;
  } catch { return null; }
}

async function checkLastConfirmRecency(email) {
  // Retorna ms desde última geração de token. -1 = já verificado. Infinity = nunca gerado.
  if (!SK) return Infinity;
  try {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/profiles?email=eq.${encodeURIComponent(email)}&select=email_verification_expires_at,email_verified`, {
      headers: { apikey: SK, Authorization: `Bearer ${SK}` },
    });
    if (!r.ok) return Infinity;
    const rows = await r.json();
    if (!rows[0]) return Infinity;
    if (rows[0].email_verified) return -1;
    if (!rows[0].email_verification_expires_at) return Infinity;
    const expiresAt = new Date(rows[0].email_verification_expires_at).getTime();
    const generatedAt = expiresAt - 24 * 3600 * 1000;
    return Date.now() - generatedAt;
  } catch { return Infinity; }
}

async function generateSupabaseMagicLink(email) {
  if (!SK) { console.warn('[email-confirm] magic link skipped: no SK'); return null; }
  try {
    const r = await fetch(`${SUPABASE_URL}/auth/v1/admin/generate_link`, {
      method: 'POST',
      headers: { apikey: SK, Authorization: `Bearer ${SK}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'magiclink',
        email,
        options: { redirect_to: `${APP_URL}/?email_confirmed=1` },
      }),
    });
    const txt = await r.text();
    if (!r.ok) {
      console.warn('[email-confirm] magic link http error', r.status, txt.slice(0, 300));
      return null;
    }
    let d; try { d = JSON.parse(txt); } catch { console.warn('[email-confirm] magic link parse error:', txt.slice(0,200)); return null; }
    const link = d.action_link || (d.properties && d.properties.action_link) || null;
    if (!link) console.warn('[email-confirm] magic link missing action_link, response keys:', Object.keys(d));
    return link;
  } catch (e) { console.warn('[email-confirm] magic link exception:', e.message); return null; }
}

const CONFIRM_T = {
  pt: { codeLabel:'Seu código de verificação', codeHint:'Digite este código no site para ativar sua conta. Expira em 24 horas.', pill:'Confirmação', tagline:'as melhores ofertas para traders', greeting:'Olá', body_p:'Recebemos seu cadastro no Markets Coupons. Pra ativar sua conta e liberar acesso ao programa de fidelidade, sorteios e seu perfil completo, é só clicar no botão abaixo:', signature_role:'Equipe Markets Coupons', headline:'Confirme seu email pra liberar seu acesso completo', subtitle:'Você se cadastrou no Markets Coupons. Confirme seu email pra acessar o programa de fidelidade, sorteios e perfil completo.', cta:'Confirmar email', fallback:'Ou copie e cole no navegador:', not_you:'Se você não criou essa conta, ignore este email.', expires:'Este link expira em 24 horas.' },
  en: { codeLabel:'Your verification code', codeHint:'Enter this code on the site to activate your account. It expires in 24 hours.', pill:'Verification', tagline:'the best deals for traders', greeting:'Hi', body_p:'We received your sign-up at Markets Coupons. To activate your account and unlock the loyalty program, giveaways, and your full profile, just click the button below:', signature_role:'Markets Coupons Team', headline:'Confirm your email to unlock full access', subtitle:'You signed up at Markets Coupons. Confirm your email to access the loyalty program, giveaways, and profile.', cta:'Confirm email', fallback:'Or copy and paste in your browser:', not_you:'If you didn\'t create this account, ignore this email.', expires:'This link expires in 24 hours.' },
  es: { codeLabel:'Tu código de verificación', codeHint:'Introduce este código en el sitio para activar tu cuenta. Caduca en 24 horas.', pill:'Verificación', tagline:'las mejores ofertas para traders', greeting:'Hola', body_p:'Recibimos tu registro en Markets Coupons. Para activar tu cuenta y desbloquear el programa de fidelidad, sorteos y tu perfil completo, haz clic en el botón:', signature_role:'Equipo Markets Coupons', headline:'Confirma tu email para desbloquear el acceso completo', subtitle:'Te registraste en Markets Coupons. Confirma tu email para acceder al programa de fidelidad, sorteos y perfil.', cta:'Confirmar email', fallback:'O copia y pega en tu navegador:', not_you:'Si no creaste esta cuenta, ignora este email.', expires:'Este enlace expira en 24 horas.' },
  fr: { codeLabel:'Votre code de vérification', codeHint:'Saisissez ce code sur le site pour activer votre compte. Il expire dans 24 heures.', pill:'Vérification', tagline:'les meilleures offres pour traders', greeting:'Salut', body_p:'Nous avons reçu votre inscription à Markets Coupons. Pour activer votre compte et débloquer le programme de fidélité, tirages et votre profil complet, cliquez sur le bouton :', signature_role:'Équipe Markets Coupons', headline:'Confirmez votre email pour un accès complet', subtitle:'Vous vous êtes inscrit chez Markets Coupons. Confirmez pour accéder au programme de fidélité, tirages et profil.', cta:'Confirmer email', fallback:'Ou copiez-collez dans votre navigateur :', not_you:'Si vous n\'avez pas créé ce compte, ignorez cet email.', expires:'Ce lien expire dans 24 heures.' },
  de: { codeLabel:'Ihr Bestätigungscode', codeHint:'Geben Sie diesen Code auf der Website ein, um Ihr Konto zu aktivieren. Gültig für 24 Stunden.', pill:'Bestätigung', tagline:'die besten angebote für trader', greeting:'Hallo', body_p:'Wir haben deine Registrierung bei Markets Coupons erhalten. Um dein Konto zu aktivieren und das Treueprogramm, Gewinnspiele und dein vollständiges Profil freizuschalten, klicke auf den Button:', signature_role:'Markets Coupons Team', headline:'Bestätigen Sie Ihre E-Mail für vollen Zugriff', subtitle:'Sie haben sich bei Markets Coupons registriert. Bestätigen Sie für Treueprogramm, Gewinnspiele und Profil.', cta:'E-Mail bestätigen', fallback:'Oder kopieren Sie in Ihren Browser:', not_you:'Wenn Sie dieses Konto nicht erstellt haben, ignorieren Sie diese E-Mail.', expires:'Dieser Link läuft in 24 Stunden ab.' },
  it: { codeLabel:'Il tuo codice di verifica', codeHint:'Inserisci questo codice sul sito per attivare il tuo account. Scade tra 24 ore.', pill:'Conferma', tagline:'le migliori offerte per trader', greeting:'Ciao', body_p:'Abbiamo ricevuto la tua registrazione su Markets Coupons. Per attivare il tuo account e sbloccare il programma fedeltà, concorsi e il tuo profilo completo, clicca sul pulsante:', signature_role:'Team Markets Coupons', headline:'Conferma la tua email per accesso completo', subtitle:'Ti sei registrato a Markets Coupons. Conferma per accedere al programma fedeltà, concorsi e profilo.', cta:'Conferma email', fallback:'O copia e incolla nel browser:', not_you:'Se non hai creato questo account, ignora questa email.', expires:'Questo link scade in 24 ore.' },
  ar: { codeLabel:'رمز التحقق الخاص بك', codeHint:'أدخل هذا الرمز في الموقع لتفعيل حسابك. تنتهي صلاحيته خلال 24 ساعة.', pill:'تأكيد', tagline:'أفضل العروض للمتداولين', greeting:'مرحباً', body_p:'استلمنا تسجيلك في Markets Coupons. لتفعيل حسابك وفتح برنامج الولاء والسحوبات وملفك الكامل، انقر على الزر أدناه:', signature_role:'فريق Markets Coupons', headline:'أكد بريدك الإلكتروني لفتح الوصول الكامل', subtitle:'لقد سجلت في Markets Coupons. أكد بريدك للوصول إلى برنامج الولاء والسحوبات والملف.', cta:'تأكيد البريد', fallback:'أو انسخ والصق في المتصفح:', not_you:'إذا لم تنشئ هذا الحساب، تجاهل هذا البريد.', expires:'تنتهي صلاحية هذا الرابط خلال 24 ساعة.' },
};

function buildConfirmHtml(lang, name, link, code) {
  const L = CONFIRM_T[lang] || CONFIRM_T.en;
  const dir = lang === 'ar' ? 'rtl' : 'ltr';
  const F = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";
  const safeName = String(name || 'Trader').replace(/[<>"]/g,'').slice(0,60);
  return `<!DOCTYPE html>
<html lang="${lang}" dir="${dir}">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${L.headline}</title>
<style>html,body{margin:0!important;padding:0!important;background-color:#f0f0f0!important;}</style>
</head>
<body bgcolor="#f0f0f0" style="margin:0;padding:0;background-color:#f0f0f0;font-family:${F};">
<div style="display:none;max-height:0;overflow:hidden;font-size:1px;line-height:1px;color:#f0f0f0;opacity:0;mso-hide:all;">${L.subtitle}</div>
<table width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#f0f0f0" style="background-color:#f0f0f0;padding:32px 0;"><tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;">

<!-- HEADER #fff + logo Coupons laranja #ff8c00 + tagline -->
<tr><td bgcolor="#ffffff" style="background-color:#ffffff;border-radius:16px 16px 0 0;border:1px solid #e0e0e0;border-bottom:none;padding:26px 40px 22px;text-align:center;font-family:${F};">
  <span style="font-size:22px;font-weight:800;color:#1a1a1a;letter-spacing:-0.5px;">Markets <span style="color:#ff8c00;">Coupons</span><span style="color:#ff8c00;font-size:9px;"> &#9679;</span></span><br>
  <span style="font-size:11px;font-weight:600;color:#aaa;letter-spacing:2.5px;text-transform:uppercase;">${L.tagline}</span>
</td></tr>

<!-- Linha separadora azul #1976D2 -->
<tr><td bgcolor="#ffffff" style="background-color:#ffffff;border-left:1px solid #e0e0e0;border-right:1px solid #e0e0e0;padding:0;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td height="3" bgcolor="#1976D2" style="background-color:#1976D2;font-size:0;line-height:0;">&nbsp;</td></tr></table>
</td></tr>

<!-- HERO #111111 -->
<tr><td bgcolor="#111111" style="background-color:#111111;border-left:1px solid #e0e0e0;border-right:1px solid #e0e0e0;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="padding:48px 40px 44px;font-family:${F};">
    <table cellpadding="0" cellspacing="0" border="0" style="margin-bottom:20px;"><tr>
      <td bgcolor="#1a2f4a" style="background-color:#1a2f4a;border:1px solid #1976D2;border-radius:20px;padding:5px 14px;">
        <span style="font-family:${F};font-size:10px;font-weight:700;color:#60A5FA;text-transform:uppercase;letter-spacing:1.5px;">&#9679; ${L.pill}</span>
      </td>
    </tr></table>
    <h1 style="font-family:${F};font-size:34px;font-weight:800;color:#fff;line-height:1.15;letter-spacing:-1.2px;margin:0 0 16px;">${L.headline}</h1>
    <p style="font-family:${F};font-size:15px;color:#888;line-height:1.6;max-width:480px;margin:0;">${L.subtitle}</p>
  </td></tr></table>
</td></tr>

<!-- CODIGO DE 6 DIGITOS (caminho principal, mobile-first) -->
<tr><td bgcolor="#ffffff" style="background-color:#ffffff;border-left:1px solid #e0e0e0;border-right:1px solid #e0e0e0;padding:34px 40px 6px;text-align:center;font-family:${F};">
  <div style="font-family:${F};font-size:11px;font-weight:700;color:#888;text-transform:uppercase;letter-spacing:2px;margin-bottom:14px;">${L.codeLabel}</div>
  <div style="font-family:'SF Mono',Consolas,monospace;font-size:42px;font-weight:800;letter-spacing:10px;color:#111111;line-height:1.1;">${code || ''}</div>
  <div style="font-family:${F};font-size:12px;color:#999;line-height:1.6;margin-top:14px;max-width:420px;margin-left:auto;margin-right:auto;">${L.codeHint}</div>
</td></tr>

<!-- Linha separadora azul #1976D2 -->
<tr><td bgcolor="#ffffff" style="background-color:#ffffff;border-left:1px solid #e0e0e0;border-right:1px solid #e0e0e0;padding:0;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td height="3" bgcolor="#1976D2" style="background-color:#1976D2;font-size:0;line-height:0;">&nbsp;</td></tr></table>
</td></tr>

<!-- BODY #fff -->
<tr><td bgcolor="#ffffff" style="background-color:#ffffff;border:1px solid #e0e0e0;border-top:none;border-bottom:none;padding:36px 40px 8px;font-family:${F};">
  <p style="font-size:16px;font-weight:600;color:#1a1a1a;margin:0 0 14px;">${L.greeting}, ${safeName}.</p>
  <p style="font-size:15px;color:#555;line-height:1.75;margin:0 0 28px;">${L.body_p}</p>

  <!-- CTA azul gradient -->
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:28px;"><tr><td align="center">
    <table cellpadding="0" cellspacing="0" border="0"><tr>
      <td bgcolor="#1976D2" style="background:linear-gradient(90deg,#1565C0,#1976D2,#2196F3,#1976D2,#1565C0);background-color:#1976D2;border-radius:10px;box-shadow:0 4px 16px rgba(25,118,210,.3);">
        <a href="${link}" target="_blank" style="display:inline-block;font-family:${F};font-size:16px;font-weight:800;color:#ffffff;text-decoration:none;padding:17px 52px;letter-spacing:.3px;">${L.cta}</a>
      </td>
    </tr></table>
  </td></tr></table>

  <!-- Linha #eee -->
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:24px;"><tr><td height="1" style="background-color:#eee;font-size:0;line-height:0;">&nbsp;</td></tr></table>

  <!-- Fallback link -->
  <p style="font-size:12px;color:#999;line-height:1.6;margin:0 0 8px;text-align:center;">${L.fallback}</p>
  <p style="font-size:12px;line-height:1.5;margin:0 0 24px;text-align:center;"><a href="${link}" style="color:#1976D2;word-break:break-all;text-decoration:none;">${link}</a></p>

  <!-- Linha #eee -->
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:24px;"><tr><td height="1" style="background-color:#eee;font-size:0;line-height:0;">&nbsp;</td></tr></table>

  <!-- Assinatura Lara, avatar gradient azul -->
  <table cellpadding="0" cellspacing="0" border="0" style="margin-bottom:8px;"><tr>
    <td width="40" valign="top" style="padding-right:12px;">
      <table cellpadding="0" cellspacing="0" border="0"><tr>
        <td width="40" height="40" align="center" valign="middle" bgcolor="#1976D2" style="background:linear-gradient(135deg,#1565C0,#2196F3);background-color:#1976D2;border-radius:50%;width:40px;height:40px;">
          <span style="font-family:${F};font-size:17px;font-weight:800;color:#fff;line-height:40px;display:block;">L</span>
        </td>
      </tr></table>
    </td>
    <td valign="middle">
      <p style="font-family:${F};font-size:14px;font-weight:700;color:#1a1a1a;margin:0 0 2px;">Lara</p>
      <p style="font-family:${F};font-size:12px;color:#888;margin:0;">${L.signature_role}</p>
    </td>
  </tr></table>
</td></tr>

<!-- FOOTER disclaimer -->
<tr><td bgcolor="#ffffff" style="background-color:#ffffff;border:1px solid #e0e0e0;border-top:none;border-radius:0 0 16px 16px;padding:24px 40px 28px;font-family:${F};">
  <p style="margin:0 0 6px;font-size:11px;color:#999;line-height:1.6;text-align:center;">${L.not_you}</p>
  <p style="margin:0 0 14px;font-size:11px;color:#999;line-height:1.6;text-align:center;">${L.expires}</p>
  <p style="margin:0;font-size:11px;color:#aaa;line-height:1.6;text-align:center;">Markets Coupons &middot; <a href="https://www.marketscoupons.com" style="color:#aaa;text-decoration:none;">marketscoupons.com</a></p>
</td></tr>

</table>
</td></tr></table></body></html>`;
}

async function sendConfirmEmail(email, name, lang, tok) {
  // tok = { token, code }. O codigo e o caminho principal; o link continua como fallback.
  const token = (tok && tok.token) || tok || '';
  const code  = (tok && tok.code) || '';
  const link = `${APP_URL}/email-confirm?token=${encodeURIComponent(token)}`;
  const html = buildConfirmHtml(lang, name, link, code);
  // Codigo NO ASSUNTO: o usuario le pela notificacao do celular, sem abrir o email.
  const subjects = {
    pt:`${code} é seu código de verificação, Markets Coupons`,
    en:`${code} is your verification code, Markets Coupons`,
    es:`${code} es tu código de verificación, Markets Coupons`,
    fr:`${code} est votre code de vérification, Markets Coupons`,
    de:`${code} ist Ihr Bestätigungscode, Markets Coupons`,
    it:`${code} è il tuo codice di verifica, Markets Coupons`,
    ar:`${code} هو رمز التحقق الخاص بك, Markets Coupons`,
    id:`${code} adalah kode verifikasi Anda, Markets Coupons`,
  };
  const subject = subjects[lang] || subjects.en;
  const BREVO_KEY = process.env.BREVO_API_KEY;
  const RESEND_KEY = process.env.RESEND_API_KEY;

  if (BREVO_KEY) {
    try {
      const r = await fetch('https://api.brevo.com/v3/smtp/email', {
        method:'POST',
        headers:{ 'accept':'application/json', 'content-type':'application/json', 'api-key':BREVO_KEY },
        body: JSON.stringify({
          sender:{ name:'Markets Coupons', email:'lara@marketscoupons.com' },
          to:[{ email, name: name || 'Trader' }],
          subject, htmlContent: html,
          tags:['email-confirm','lang-'+lang],
        }),
      });
      if (r.ok) return { ok:true, provider:'brevo' };
    } catch {}
  }
  if (RESEND_KEY) {
    try {
      const r = await fetch('https://api.resend.com/emails', {
        method:'POST',
        headers:{ 'Content-Type':'application/json', 'Authorization':`Bearer ${RESEND_KEY}` },
        body: JSON.stringify({
          from:'Markets Coupons <lara@marketscoupons.com>',
          to:[email], subject, html,
          tags:[{ name:'type', value:'email-confirm' }, { name:'lang', value:lang }],
        }),
      });
      if (r.ok) return { ok:true, provider:'resend' };
    } catch {}
  }
  return { ok:false, provider:'none' };
}

async function handleSendConfirm(req, res, body) {
  const { email, name, lang, resend } = body;
  if (!email || typeof email !== 'string') return res.status(400).json({ error:'email required' });
  const langCode = (lang && CONFIRM_T[lang]) ? lang : 'pt';

  if (resend) {
    const sinceLast = await checkLastConfirmRecency(email);
    if (sinceLast === -1) return res.status(200).json({ skipped:'already_verified' });
    if (sinceLast < 120000) return res.status(429).json({ error:'rate_limit_resend', retry_in_seconds: Math.ceil((120000 - sinceLast)/1000) });
  }

  const token = await generateConfirmToken(email);
  if (!token) return res.status(500).json({ error:'profile_not_found_or_db_error' });

  const result = await sendConfirmEmail(email, name || 'Trader', langCode, token);

  // RLS em email_logs exige service_role pra INSERT (anon falha silencioso).
  // Sem service_role configurado, log perde, mas o envio do email ja rolou OK.
  fetch(`${SUPABASE_URL}/rest/v1/email_logs`, {
    method:'POST',
    headers:{ apikey:SK||SUPABASE_KEY, Authorization:`Bearer ${SK||SUPABASE_KEY}`, 'Content-Type':'application/json', Prefer:'return=minimal' },
    body: JSON.stringify({
      campaign_name: resend ? 'Email Confirm Resend' : 'Email Confirm',
      subject:'Confirm email', recipients:1,
      recipients_emails: result.ok ? [email] : [],
      status: result.ok ? 'sent' : 'failed', sent_by:'webhook', provider: result.provider,
    }),
  }).catch(()=>{});

  return res.status(result.ok ? 200 : 500).json({ ok:result.ok, provider:result.provider, email });
}

// ═══ Verificacao por CODIGO de 6 digitos (caminho principal, mobile) ═══
// O link (handleConfirmGet) continua valido em paralelo, como fallback.
async function handleVerifyCode(req, res, body) {
  const email = String((body && body.email) || '').trim().toLowerCase();
  const code  = String((body && body.code) || '').replace(/\D/g, '');
  if (!email || code.length !== 6) return res.status(400).json({ ok: false, error: 'invalid_input' });
  if (!SK) return res.status(500).json({ ok: false, error: 'server_misconfig' });

  const H = { apikey: SK, Authorization: `Bearer ${SK}`, 'Content-Type': 'application/json' };
  const nowIso = new Date().toISOString();
  const MAX_ATTEMPTS = 6; // 6 digitos sem trava = 1M combinacoes chutaveis

  try {
    const chk = await fetch(`${SUPABASE_URL}/rest/v1/profiles?email=eq.${encodeURIComponent(email)}&select=email_verified,email_verification_attempts,email_verification_expires_at`, { headers: H });
    const rows0 = chk.ok ? await chk.json() : [];
    const row = rows0 && rows0[0];
    if (!row) return res.status(400).json({ ok: false, error: 'not_found' });
    if (row.email_verified) return res.status(200).json({ ok: true, already: true });
    if ((row.email_verification_attempts || 0) >= MAX_ATTEMPTS) return res.status(429).json({ ok: false, error: 'too_many_attempts' });
    if (row.email_verification_expires_at && new Date(row.email_verification_expires_at) < new Date()) {
      return res.status(400).json({ ok: false, error: 'expired' });
    }

    // UPDATE atomico: so passa se o codigo bate AND nao expirou AND ainda nao verificado
    const upd = await fetch(`${SUPABASE_URL}/rest/v1/profiles?email=eq.${encodeURIComponent(email)}&email_verification_code=eq.${encodeURIComponent(code)}&email_verification_expires_at=gt.${encodeURIComponent(nowIso)}&email_verified=eq.false`, {
      method: 'PATCH',
      headers: { ...H, Prefer: 'return=representation' },
      body: JSON.stringify({
        email_verified: true,
        email_verification_token: null,
        email_verification_code: null,
        email_verification_expires_at: null,
      }),
    });
    const rows = upd.ok ? await upd.json() : [];
    if (!rows || !rows[0]) {
      // codigo errado: incrementa tentativa (trava em MAX_ATTEMPTS)
      await fetch(`${SUPABASE_URL}/rest/v1/profiles?email=eq.${encodeURIComponent(email)}`, {
        method: 'PATCH', headers: H,
        body: JSON.stringify({ email_verification_attempts: (row.email_verification_attempts || 0) + 1 }),
      }).catch(() => {});
      return res.status(400).json({ ok: false, error: 'wrong_code', attempts_left: Math.max(0, MAX_ATTEMPTS - ((row.email_verification_attempts || 0) + 1)) });
    }

    // Verificado: devolve magic link p/ auto-login (mesmo comportamento do clique no link)
    const magic = await generateSupabaseMagicLink(email);
    return res.status(200).json({ ok: true, redirect: magic || null });
  } catch (e) {
    console.warn('[verify-code] error:', e.message);
    return res.status(500).json({ ok: false, error: 'server_error' });
  }
}

async function handleConfirmGet(req, res) {
  const token = (req.query && req.query.token) || '';
  if (!token || typeof token !== 'string') {
    res.statusCode = 302;
    res.setHeader('Location', `${APP_URL}/?email_confirm_error=invalid_token`);
    return res.end();
  }
  if (!SK) {
    res.statusCode = 302;
    res.setHeader('Location', `${APP_URL}/?email_confirm_error=server_misconfig`);
    return res.end();
  }

  // Atomic UPDATE: só se token bate AND não expirou AND não verified ainda
  const nowIso = new Date().toISOString();
  let profileEmail = null;
  let alreadyVerified = false;

  try {
    const upd = await fetch(`${SUPABASE_URL}/rest/v1/profiles?email_verification_token=eq.${encodeURIComponent(token)}&email_verification_expires_at=gt.${encodeURIComponent(nowIso)}&email_verified=eq.false`, {
      method:'PATCH',
      headers:{ apikey:SK, Authorization:`Bearer ${SK}`, 'Content-Type':'application/json', Prefer:'return=representation' },
      body: JSON.stringify({ email_verified:true, email_verification_token:null, email_verification_expires_at:null }),
    });

    if (upd.ok) {
      const rows = await upd.json();
      if (rows && rows[0]) {
        profileEmail = rows[0].email;
      } else {
        // 0 rows updated, investigar
        const check = await fetch(`${SUPABASE_URL}/rest/v1/profiles?email_verification_token=eq.${encodeURIComponent(token)}&select=email,email_verified,email_verification_expires_at`, {
          headers:{ apikey:SK, Authorization:`Bearer ${SK}` },
        });
        const checkRows = check.ok ? await check.json() : [];
        if (checkRows[0]) {
          if (checkRows[0].email_verified) {
            alreadyVerified = true;
            profileEmail = checkRows[0].email;
          } else if (new Date(checkRows[0].email_verification_expires_at) < new Date()) {
            res.statusCode = 302;
            res.setHeader('Location', `${APP_URL}/?email_confirm_error=expired&email=${encodeURIComponent(checkRows[0].email)}`);
            return res.end();
          }
        }
      }
    }
  } catch (e) {
    console.warn('[email-confirm] DB error:', e.message);
  }

  if (alreadyVerified && profileEmail) {
    res.statusCode = 302;
    res.setHeader('Location', `${APP_URL}/?email_confirmed=1&already=1`);
    return res.end();
  }

  if (!profileEmail) {
    res.statusCode = 302;
    res.setHeader('Location', `${APP_URL}/?email_confirm_error=invalid_token`);
    return res.end();
  }

  // Magic link Supabase pra auto-login
  const magicLink = await generateSupabaseMagicLink(profileEmail);
  if (magicLink) {
    res.statusCode = 302;
    res.setHeader('Location', magicLink);
    return res.end();
  }

  // Fallback: redirect com email pré-preenchido pro login manual
  console.warn('[email-confirm] magic link fallback for:', profileEmail);
  res.statusCode = 302;
  res.setHeader('Location', `${APP_URL}/?just_confirmed=1&email=${encodeURIComponent(profileEmail)}`);
  return res.end();
}

module.exports = async (req, res) => {
  // ─── B.3.1 GET handler: /email-confirm?token=xxx ───
  if (req.method === 'GET') {
    return handleConfirmGet(req, res);
  }

  if (applyCors(req, res, { methods: 'POST, GET, OPTIONS' })) return;
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // Webhook do Supabase: pula rate limit + idempotente. Frontend sem secret: rate limited.
  const HOOK_SECRET = process.env.WELCOME_HOOK_SECRET;
  const isHook = HOOK_SECRET && req.headers['x-webhook-secret'] === HOOK_SECRET;
  const CRON_SECRET = process.env.CRON_SECRET;
  const authHdr = req.headers.authorization || '';
  const isCron = CRON_SECRET && authHdr === `Bearer ${CRON_SECRET}`;
  if (!isHook && !isCron && !rateLimitIp(req, 10)) return res.status(429).json({ error: 'rate_limit' });

  // ─── B.3.1 POST handler: send_confirm (fluxo do proprio usuario no signup, fica aberto) ───
  if (req.body && req.body.action === 'send_confirm') {
    return handleSendConfirm(req, res, req.body);
  }

  // ─── Verificacao por codigo de 6 digitos (fluxo do proprio usuario, rate-limited acima) ───
  if (req.body && req.body.action === 'verify_code') {
    return handleVerifyCode(req, res, req.body);
  }

  // Envio de WELCOME (formato {record} do trigger SQL OU {email} do catchup) exige auth:
  // webhook secret (trigger) OU CRON_SECRET (catchup GitHub Actions). Fecha o envio
  // anonimo que permitia email-bombing/abuso de quota.
  if (!isHook && !isCron) return res.status(403).json({ error: 'forbidden' });

  const BREVO_KEY = process.env.BREVO_API_KEY;
  const RESEND_KEY = process.env.RESEND_API_KEY;
  if (!BREVO_KEY && !RESEND_KEY) return res.status(500).json({ error: 'No email provider configured' });

  // Aceita 2 formatos: { email, name, lang } direto OU webhook Supabase { type, record:{email, raw_user_meta_data} }
  let email, name, lang;
  const b = req.body || {};
  if (b.record && b.record.email) {
    email = b.record.email;
    name = b.record.raw_user_meta_data?.name || b.record.raw_user_meta_data?.full_name || 'Trader';
    lang = b.record.raw_user_meta_data?.lang || 'pt';
    // Só dispara se email já confirmado
    if (!b.record.email_confirmed_at) return res.status(200).json({ skipped: 'not_confirmed' });
  } else {
    ({ email, name, lang } = b);
  }
  if (!email) return res.status(400).json({ error: 'Missing email' });

  // Idempotência: já recebeu? skip.
  if (await alreadyReceived(email)) return res.status(200).json({ skipped: 'already_received', email });

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
      headers: { 'apikey': SK||SUPABASE_KEY, 'Authorization': `Bearer ${SK||SUPABASE_KEY}`, 'Content-Type': 'application/json', 'Prefer': 'return=minimal' },
      body: JSON.stringify({
        campaign_name: 'Welcome Email',
        subject, recipients: 1,
        recipients_emails: result.ok ? [email] : [],
        status: result.ok ? 'sent' : 'failed',
        sent_by: isHook ? 'auth-hook' : 'webhook',
        provider: result.provider,
      }),
    });

    if (result.ok) await markReceived(email);

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
