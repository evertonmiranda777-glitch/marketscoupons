// /api/leads/volumefilter
// Multi-action endpoint pra VolumeFilter:
//  - POST (default): captura lead, manda email com link do .zip
//  - GET  ?action=reviews: lista reviews { avg, count, items[] }
//  - POST ?action=review: cria nova review
//  - GET  ?action=admin-stats  (auth admin JWT): totais leads/reviews
//  - GET  ?action=admin-list   (auth admin JWT): lista paginada de leads
//  - GET  ?action=admin-export (auth admin JWT): CSV de todos os leads
//
// Consolidado num arquivo só pra economizar slot de Vercel Function (limite Hobby).

const { applyCors } = require('../_cors.js');
const { rateLimitIp } = require('../_ratelimit.js');
const { safeError } = require('../_safe-error.js');

const SUPABASE_URL = 'https://qfwhduvutfumsaxnuofa.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFmd2hkdXZ1dGZ1bXNheG51b2ZhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQzNzc5NDYsImV4cCI6MjA4OTk1Mzk0Nn0.efRel6U68misvPSRj8-p31-gOhzjXN4eIFMiloTNyk4';
const SK = process.env.SUPABASE_SERVICE_ROLE_KEY;
const APP_URL = 'https://www.marketscoupons.com';
const DOWNLOAD_URL = `${APP_URL}/downloads/MarketsCoupons-VolumeFilter-v1.0.zip`;
const GUIDE_URLS = {
  pt: `${APP_URL}/volumefilter`,
  en: `${APP_URL}/en/volumefilter`,
  es: `${APP_URL}/es/volumefilter`,
  it: `${APP_URL}/it/volumefilter`,
  fr: `${APP_URL}/fr/volumefilter`,
  de: `${APP_URL}/de/volumefilter`,
  ar: `${APP_URL}/ar/volumefilter`,
  id: `${APP_URL}/id/volumefilter`,
};
const INDICATOR_SLUG = 'volumefilter';

function isValidEmail(s) {
  if (!s || typeof s !== 'string' || s.length > 254) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.trim());
}

function buildEmailHtml(email, lang) {
  const guideUrl = GUIDE_URLS[lang] || GUIDE_URLS.pt;
  const isEN = lang === 'en';
  const T = isEN ? {
    badge: 'VOLUMEFILTER READY',
    title: 'Here is your indicator, Trader',
    intro_a: 'You signed up with', intro_b: 'to get VolumeFilter. Download the',
    intro_c: 'file below and follow the LEIA-ME.txt instructions, install takes 2 clicks in NinjaTrader 8.',
    cta: '⬇ Download VolumeFilter (.zip)',
    meta: '2.7 KB · NinjaTrader 8 · valid until 12/31/2026',
    install_h: '⚡ Quick install (2 clicks)',
    install_1: 'Open NinjaTrader 8',
    install_2: '<strong>Tools → Import → NinjaScript Add-On</strong>',
    install_3: 'Select the file',
    install_4: 'Confirm. Done. Open a chart → <strong>Ctrl+I</strong> → search <strong>"VolumeFilter"</strong> → Add',
    guide_h: '📖 Complete guide on the site',
    guide_p: 'The 5 trading patterns the indicator reveals, recommended settings by style and step-by-step installation are on the page:',
    guide_link: 'View complete guide',
    stuck: 'Stuck? Message the community at', stuck_alt: ', there are traders online always.',
    footer_a: 'You are receiving this because you requested VolumeFilter at marketscoupons.com.',
    footer_b: 'Markets Coupons is an educational/affiliate platform, we are not a broker, FCM or registered advisor.',
  } : {
    badge: 'VOLUMEFILTER PRONTO',
    title: 'Aqui está o seu indicador, Trader',
    intro_a: 'Você cadastrou o email', intro_b: 'pra receber o VolumeFilter. Baixe o arquivo',
    intro_c: 'abaixo e siga as instruções no LEIA-ME.txt, instalação leva 2 cliques no NinjaTrader 8.',
    cta: '⬇ Baixar VolumeFilter (.zip)',
    meta: '2.7 KB · NinjaTrader 8 · validade até 31/12/2026',
    install_h: '⚡ Instalação rápida (2 cliques)',
    install_1: 'Abra o NinjaTrader 8',
    install_2: '<strong>Tools → Import → NinjaScript Add-On</strong>',
    install_3: 'Selecione o arquivo',
    install_4: 'Confirme. Pronto. Abra um gráfico → <strong>Ctrl+I</strong> → procure <strong>"VolumeFilter"</strong> → Add',
    guide_h: '📖 Guia completo no site',
    guide_p: 'Os 5 padrões de trade que o indicador revela, configurações recomendadas por estilo e instalação passo-a-passo estão na página:',
    guide_link: 'Ver guia completo',
    stuck: 'Travou? Manda mensagem na comunidade', stuck_alt: ', tem trader online sempre.',
    footer_a: 'Você está recebendo este email porque pediu o VolumeFilter em marketscoupons.com.',
    footer_b: 'Markets Coupons é plataforma educacional/afiliada, não somos broker, FCM ou consultor registrado.',
  };

  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>VolumeFilter, Markets Coupons</title></head>
<body style="margin:0;padding:0;background:#f4f6f8;font-family:'Inter',Helvetica,Arial,sans-serif;color:#0a0d14;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#f4f6f8;padding:24px 0;"><tr><td align="center">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" style="max-width:600px;background:#ffffff;border-radius:14px;overflow:hidden;box-shadow:0 6px 24px rgba(0,0,0,.08);">
    <tr><td style="background:#0a0d14;padding:28px 32px;text-align:center;">
      <div style="font-size:22px;font-weight:800;color:#fff;letter-spacing:-.3px;">Markets <span style="color:#ff8c00;">Coupons</span></div>
    </td></tr>
    <tr><td style="padding:36px 36px 12px;">
      <div style="display:inline-block;background:#e6f7f1;color:#10b981;padding:5px 11px;border-radius:9px;font-size:11px;font-weight:700;letter-spacing:.5px;text-transform:uppercase;margin-bottom:14px;">${T.badge}</div>
      <h1 style="margin:6px 0 14px;font-size:26px;line-height:1.25;font-weight:800;color:#0a0d14;">${T.title}</h1>
      <p style="margin:0 0 22px;font-size:15px;line-height:1.6;color:#374151;">${T.intro_a} <strong>${email}</strong> ${T.intro_b} <code style="background:#f3f4f6;padding:2px 6px;border-radius:4px;font-size:13px;">.zip</code> ${T.intro_c}</p>
    </td></tr>
    <tr><td style="padding:0 36px;text-align:center;">
      <a href="${DOWNLOAD_URL}" style="display:inline-block;padding:16px 42px;background:#10b981;color:#fff;font-size:16px;font-weight:800;text-decoration:none;border-radius:10px;letter-spacing:.2px;box-shadow:0 4px 14px rgba(16,185,129,.35);">${T.cta}</a>
      <p style="margin:12px 0 0;font-size:12px;color:#6b7480;">${T.meta}</p>
    </td></tr>
    <tr><td style="padding:30px 36px 18px;">
      <div style="border:1px solid #e5e7eb;border-radius:10px;padding:18px 20px;background:#fafafa;">
        <div style="font-size:13px;font-weight:700;color:#0a0d14;margin-bottom:8px;">${T.install_h}</div>
        <ol style="margin:6px 0 0;padding-left:18px;font-size:13px;line-height:1.7;color:#374151;">
          <li>${T.install_1}</li>
          <li>${T.install_2}</li>
          <li>${T.install_3} <code style="background:#fff;padding:1px 5px;border:1px solid #e5e7eb;border-radius:3px;font-size:12px;">MarketsCoupons-VolumeFilter-v1.0.zip</code></li>
          <li>${T.install_4}</li>
        </ol>
      </div>
    </td></tr>
    <tr><td style="padding:18px 36px 8px;">
      <div style="border:1px solid #e5e7eb;border-radius:10px;padding:18px 20px;background:#fff;">
        <div style="font-size:13px;font-weight:700;color:#0a0d14;margin-bottom:6px;">${T.guide_h}</div>
        <p style="margin:0 0 12px;font-size:13px;line-height:1.6;color:#6b7480;">${T.guide_p}</p>
        <a href="${guideUrl}" style="display:inline-block;font-size:13px;font-weight:700;color:#10b981;text-decoration:none;">${T.guide_link} →</a>
      </div>
    </td></tr>
    <tr><td style="padding:18px 36px 8px;">
      <p style="margin:0;font-size:13px;line-height:1.6;color:#6b7480;">${T.stuck} <a href="https://t.me/marketcouponss" style="color:#0a74da;text-decoration:underline;">t.me/marketcouponss</a>${T.stuck_alt}</p>
    </td></tr>
    <tr><td style="padding:24px 36px 28px;"><table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
      <td style="vertical-align:middle;padding-right:14px;"><div style="width:42px;height:42px;border-radius:50%;background:#ff8c00;text-align:center;line-height:42px;font-size:16px;font-weight:800;color:#fff;">L</div></td>
      <td style="vertical-align:middle;"><div style="font-size:14px;font-weight:700;color:#0a0d14;">Lara</div><div style="font-size:12px;color:#6b7480;">Markets Coupons</div></td>
    </tr></table></td></tr>
    <tr><td style="background:#fafafa;padding:20px 32px;text-align:center;border-top:1px solid #e5e7eb;">
      <p style="margin:0 0 8px;font-size:11px;color:#9ca3af;line-height:1.6;">${T.footer_a}<br>${T.footer_b}</p>
      <p style="margin:8px 0 0;font-size:11px;color:#9ca3af;">© ${new Date().getFullYear()} Markets Coupons</p>
    </td></tr>
  </table>
</td></tr></table>
</body></html>`;
}

// ----- Handlers ---------------------------------------------------------

async function handleLead(req, res) {
  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }
  body = body || {};

  const email = String(body.email || '').trim().toLowerCase();
  if (!isValidEmail(email)) return res.status(400).json({ ok: false, error: 'invalid_email' });

  const utm_source = String(body.utm_source || 'volumefilter-landing').slice(0, 80);
  const utm_campaign = String(body.utm_campaign || 'volumefilter-lead').slice(0, 80);
  const lang = ['pt','en','es','it','fr','de','ar','id'].includes(body.lang) ? body.lang : 'pt';

  try {
    const upsertHeaders = {
      'Content-Type': 'application/json',
      'apikey': SK || SUPABASE_KEY,
      'Authorization': `Bearer ${SK || SUPABASE_KEY}`,
      'Prefer': 'resolution=merge-duplicates,return=representation',
    };
    const upsertBody = {
      email, lang, source: utm_source,
      tags: ['volumefilter-lead', utm_campaign, `lang-${lang}`],
    };
    const upsertResp = await fetch(`${SUPABASE_URL}/rest/v1/email_subscribers?on_conflict=email`, {
      method: 'POST', headers: upsertHeaders, body: JSON.stringify(upsertBody),
    });
    if (!upsertResp.ok && upsertResp.status !== 409) {
      console.error('[volumefilter] supabase upsert failed', upsertResp.status, await upsertResp.text().catch(()=>''));
    }

    const BREVO_KEY = process.env.BREVO_API_KEY;
    const RESEND_KEY = process.env.RESEND_API_KEY;
    const subject = lang === 'en' ? 'Your VolumeFilter has arrived, Markets Coupons' : 'Seu VolumeFilter chegou, Markets Coupons';
    const htmlContent = buildEmailHtml(email, lang);

    let sent = false, provider = null, lastErr = null;
    if (BREVO_KEY) {
      try {
        const r = await fetch('https://api.brevo.com/v3/smtp/email', {
          method: 'POST',
          headers: { 'accept': 'application/json', 'content-type': 'application/json', 'api-key': BREVO_KEY },
          body: JSON.stringify({
            sender: { name: 'Lara | Markets Coupons', email: 'lara@marketscoupons.com' },
            to: [{ email, name: 'Trader' }],
            subject, htmlContent,
            tags: ['volumefilter-lead', `lang-${lang}`],
          }),
        });
        if (r.ok) { sent = true; provider = 'brevo'; }
        else lastErr = { provider: 'brevo', status: r.status, data: await r.json().catch(()=>({})) };
      } catch (e) { lastErr = { provider: 'brevo', error: String(e) }; }
    }
    if (!sent && RESEND_KEY) {
      try {
        const r = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${RESEND_KEY}` },
          body: JSON.stringify({
            from: 'Lara | Markets Coupons <lara@marketscoupons.com>',
            to: [email], subject, html: htmlContent,
            tags: [{ name: 'type', value: 'volumefilter-lead' }],
          }),
        });
        if (r.ok) { sent = true; provider = 'resend'; }
        else lastErr = { provider: 'resend', status: r.status, data: await r.json().catch(()=>({})) };
      } catch (e) { lastErr = { provider: 'resend', error: String(e) }; }
    }

    if (!sent) {
      console.error('[volumefilter] email send failed', lastErr);
      return res.status(502).json({ ok: false, error: 'email_send_failed', details: lastErr });
    }
    return res.status(200).json({ ok: true, sent: true, provider });
  } catch (e) {
    return safeError(res, 500, 'lead_save_failed', e);
  }
}

async function handleReviewsGet(req, res) {
  try {
    const headers = {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
    };
    const url = `${SUPABASE_URL}/rest/v1/indicator_reviews?select=name,rating,message,lang,created_at&indicator_slug=eq.${INDICATOR_SLUG}&approved=is.true&order=created_at.desc&limit=24`;
    const r = await fetch(url, { headers });
    const items = await r.json().catch(() => []);
    if (!Array.isArray(items)) return res.status(200).json({ ok: true, avg: 0, count: 0, items: [] });
    const count = items.length;
    const avg = count ? +(items.reduce((s, it) => s + (it.rating || 0), 0) / count).toFixed(1) : 0;
    return res.status(200).json({ ok: true, avg, count, items });
  } catch (e) {
    return res.status(200).json({ ok: true, avg: 0, count: 0, items: [] });
  }
}

async function handleReviewPost(req, res) {
  if (!rateLimitIp(req, 3)) return res.status(429).json({ ok: false, error: 'rate_limit' });

  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }
  body = body || {};

  const name = String(body.name || '').trim().slice(0, 60);
  const email = String(body.email || '').trim().toLowerCase();
  const message = String(body.message || '').trim().slice(0, 600);
  const rating = parseInt(body.rating, 10);
  const lang = ['pt','en','es','it','fr','de','ar','id'].includes(body.lang) ? body.lang : 'pt';

  if (!name || name.length < 2) return res.status(400).json({ ok: false, error: 'invalid_name' });
  if (!isValidEmail(email)) return res.status(400).json({ ok: false, error: 'invalid_email' });
  if (!rating || rating < 1 || rating > 5) return res.status(400).json({ ok: false, error: 'invalid_rating' });

  // GATE: só aceita avaliação se o email JÁ está cadastrado na lista do VolumeFilter
  // (passou pelo lead-magnet = baixou o indicador).
  // Sem isso, qualquer um inflaria a média com email aleatório.
  try {
    const checkUrl = `${SUPABASE_URL}/rest/v1/email_subscribers?select=email&email=eq.${encodeURIComponent(email)}&tags=cs.{volumefilter-lead}&limit=1`;
    const checkResp = await fetch(checkUrl, {
      headers: { apikey: SK || SUPABASE_KEY, Authorization: `Bearer ${SK || SUPABASE_KEY}` },
    });
    if (!checkResp.ok) {
      console.error('[volumefilter review] subscriber check failed', checkResp.status);
      return res.status(500).json({ ok: false, error: 'subscriber_check_failed' });
    }
    const rows = await checkResp.json().catch(() => []);
    if (!Array.isArray(rows) || rows.length === 0) {
      return res.status(403).json({ ok: false, error: 'not_subscribed' });
    }
  } catch (e) {
    return safeError(res, 500, 'subscriber_check_failed', e);
  }

  const ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || req.headers['x-real-ip'] || '';
  const ua = String(req.headers['user-agent'] || '').slice(0, 200);

  try {
    const headers = {
      'Content-Type': 'application/json',
      'apikey': SK || SUPABASE_KEY,
      'Authorization': `Bearer ${SK || SUPABASE_KEY}`,
      'Prefer': 'resolution=merge-duplicates,return=representation',
    };
    const payload = {
      indicator_slug: INDICATOR_SLUG,
      name, email, rating, message: message || null, lang, ip, user_agent: ua, approved: true,
    };
    const r = await fetch(`${SUPABASE_URL}/rest/v1/indicator_reviews?on_conflict=indicator_slug,email`, {
      method: 'POST', headers, body: JSON.stringify(payload),
    });
    if (!r.ok) {
      const txt = await r.text().catch(() => '');
      console.error('[volumefilter] review insert failed', r.status, txt);
      return res.status(500).json({ ok: false, error: 'review_save_failed' });
    }
    return res.status(200).json({ ok: true });
  } catch (e) {
    return safeError(res, 500, 'review_save_failed', e);
  }
}

// ----- Admin handlers ---------------------------------------------------

async function validateAdmin(jwt) {
  if (!jwt || jwt.length < 50) return null;
  try {
    const resp = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: { 'Authorization': `Bearer ${jwt}`, 'apikey': SUPABASE_KEY }
    });
    if (!resp.ok) return null;
    const user = await resp.json();
    if (!user?.id) return null;
    const profileResp = await fetch(
      `${SUPABASE_URL}/rest/v1/profiles?id=eq.${user.id}&is_admin=eq.true&select=id`,
      { headers: { 'Authorization': `Bearer ${SK || jwt}`, 'apikey': SK || SUPABASE_KEY } }
    );
    if (!profileResp.ok) return null;
    const profiles = await profileResp.json();
    return (profiles && profiles.length > 0) ? user : null;
  } catch { return null; }
}

function getAuthJwt(req) {
  const h = req.headers['authorization'] || req.headers['Authorization'] || '';
  return h.startsWith('Bearer ') ? h.slice(7) : '';
}

// Lista todos os email_subscribers com tag 'volumefilter-lead'
async function fetchAllVfLeads() {
  if (!SK) return [];
  const out = [];
  let offset = 0;
  const PAGE = 1000;
  while (true) {
    const url = `${SUPABASE_URL}/rest/v1/email_subscribers?select=email,lang,source,tags,created_at&tags=cs.{volumefilter-lead}&order=created_at.desc&limit=${PAGE}&offset=${offset}`;
    const r = await fetch(url, { headers: { apikey: SK, Authorization: `Bearer ${SK}` } });
    if (!r.ok) break;
    const rows = await r.json();
    out.push(...rows);
    if (rows.length < PAGE) break;
    offset += PAGE;
  }
  return out;
}

async function fetchAllVfReviews() {
  const key = SK || SUPABASE_KEY;
  const url = `${SUPABASE_URL}/rest/v1/indicator_reviews?indicator_slug=eq.${INDICATOR_SLUG}&select=name,email,rating,message,lang,created_at&order=created_at.desc&limit=2000`;
  const r = await fetch(url, { headers: { apikey: key, Authorization: `Bearer ${key}` } });
  if (!r.ok) return [];
  return r.json().catch(() => []);
}

async function handleAdminStats(req, res) {
  const user = await validateAdmin(getAuthJwt(req));
  if (!user) return res.status(401).json({ ok: false, error: 'unauthorized' });

  const [leads, reviews] = await Promise.all([fetchAllVfLeads(), fetchAllVfReviews()]);

  const byLang = {};
  const bySource = {};
  let today = 0, last7 = 0, last30 = 0;
  const now = Date.now();
  for (const l of leads) {
    const lang = l.lang || 'pt';
    byLang[lang] = (byLang[lang] || 0) + 1;
    const src = l.source || 'unknown';
    bySource[src] = (bySource[src] || 0) + 1;
    const ts = new Date(l.created_at).getTime();
    if (now - ts < 86400000) today++;
    if (now - ts < 7 * 86400000) last7++;
    if (now - ts < 30 * 86400000) last30++;
  }

  const ratings = reviews.map(r => r.rating || 0);
  const avgRating = ratings.length ? +(ratings.reduce((s, x) => s + x, 0) / ratings.length).toFixed(2) : 0;

  return res.status(200).json({
    ok: true,
    leads: { total: leads.length, today, last7, last30, by_lang: byLang, by_source: bySource },
    reviews: { total: reviews.length, avg_rating: avgRating },
  });
}

async function handleAdminList(req, res) {
  const user = await validateAdmin(getAuthJwt(req));
  if (!user) return res.status(401).json({ ok: false, error: 'unauthorized' });

  const url = new URL(req.url, 'http://x');
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '50', 10), 500);
  const offset = parseInt(url.searchParams.get('offset') || '0', 10);
  const lang = url.searchParams.get('lang') || '';
  const search = url.searchParams.get('q') || '';

  let qs = `select=email,lang,source,tags,created_at&tags=cs.{volumefilter-lead}&order=created_at.desc&limit=${limit}&offset=${offset}`;
  if (lang && ['pt','en','es','it','fr','de','ar','id'].includes(lang)) qs += `&lang=eq.${lang}`;
  if (search) qs += `&email=ilike.*${encodeURIComponent(search.toLowerCase())}*`;

  const fetchUrl = `${SUPABASE_URL}/rest/v1/email_subscribers?${qs}`;
  const r = await fetch(fetchUrl, {
    headers: { apikey: SK || SUPABASE_KEY, Authorization: `Bearer ${SK || SUPABASE_KEY}`, Prefer: 'count=exact' }
  });
  if (!r.ok) return res.status(500).json({ ok: false, error: 'fetch_failed' });

  const items = await r.json();
  const contentRange = r.headers.get('content-range') || '';
  const total = parseInt(contentRange.split('/')[1] || '0', 10);

  return res.status(200).json({ ok: true, items, total, limit, offset });
}

async function handleAdminExport(req, res) {
  const user = await validateAdmin(getAuthJwt(req));
  if (!user) return res.status(401).json({ ok: false, error: 'unauthorized' });

  const leads = await fetchAllVfLeads();
  const csvEsc = s => `"${String(s ?? '').replace(/"/g, '""')}"`;
  const header = 'email,lang,source,created_at\n';
  const body = leads.map(l => [l.email, l.lang || 'pt', l.source || '', l.created_at].map(csvEsc).join(',')).join('\n');
  const csv = header + body;

  const fname = `volumefilter-leads-${new Date().toISOString().slice(0,10)}.csv`;
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${fname}"`);
  return res.status(200).send(csv);
}

// ===== Sorteio 3 contas Apex: email das regras (multilíngue, EU traduzo) =====
const GW_MAIL = {
  en:{subj:"You're in the 3 Apex accounts giveaway, 1 step left",pre:"Finish your free signup to lock in your spot.",hi:"Hi",intro:"You're in the giveaway for <b>3 Apex accounts</b>, and the winner picks the account size. To lock in your spot and be eligible, just:",s1:"Sign up free on the site",s2:"Follow @marketscoupons on Instagram",s3:"Share this email with your friends. The more you share, the higher your chances of winning.",done:"That's it, you're in the draw!",draw:"Draw on July 20, 2026. Free to enter, no purchase needed.",cta1:"Finish my signup",cta2:"Follow on Instagram",pill:"GIVEAWAY",h1:"You're almost in!"},
  pt:{subj:"Você entrou no sorteio de 3 contas Apex, falta 1 passo",pre:"Termine seu cadastro grátis pra garantir sua vaga.",hi:"Olá",intro:"Você está no sorteio de <b>3 contas Apex</b>, e o ganhador escolhe o tamanho da conta. Pra garantir sua vaga e ficar elegível, é só:",s1:"Cadastre-se grátis no site",s2:"Siga @marketscoupons no Instagram",s3:"Compartilhe este email com seus amigos. Quanto mais você compartilhar, maiores suas chances de ganhar.",done:"Pronto! Você já está participando do sorteio.",draw:"Sorteio em 20 de julho de 2026. Grátis, sem compra necessária.",cta1:"Terminar meu cadastro",cta2:"Seguir no Instagram",pill:"SORTEIO",h1:"Você está quase dentro!"},
  es:{subj:"Estás en el sorteo de 3 cuentas Apex, falta 1 paso",pre:"Termina tu registro gratis para asegurar tu lugar.",hi:"Hola",intro:"Estás en el sorteo de <b>3 cuentas Apex</b>, y el ganador elige el tamaño de la cuenta. Para asegurar tu lugar y ser elegible, solo:",s1:"Regístrate gratis en el sitio",s2:"Sigue a @marketscoupons en Instagram",s3:"Comparte este correo con tus amigos. Cuanto más compartas, mayores tus posibilidades de ganar.",done:"¡Listo! Ya estás participando en el sorteo.",draw:"Sorteo el 20 de julio de 2026. Gratis, sin compra necesaria.",cta1:"Terminar mi registro",cta2:"Seguir en Instagram",pill:"SORTEO",h1:"¡Ya casi estás dentro!"},
  it:{subj:"Sei nel giveaway di 3 account Apex, manca 1 passo",pre:"Completa la registrazione gratuita per assicurarti il posto.",hi:"Ciao",intro:"Sei nel giveaway di <b>3 account Apex</b>, e il vincitore sceglie la dimensione dell'account. Per assicurarti il posto ed essere idoneo, basta:",s1:"Registrati gratis sul sito",s2:"Segui @marketscoupons su Instagram",s3:"Condividi questa email con i tuoi amici. Più condividi, più aumentano le tue possibilità di vincere.",done:"Fatto! Sei nel sorteggio.",draw:"Estrazione il 20 luglio 2026. Gratis, nessun acquisto necessario.",cta1:"Completa la registrazione",cta2:"Segui su Instagram",pill:"GIVEAWAY",h1:"Ci sei quasi!"},
  fr:{subj:"Vous participez au tirage de 3 comptes Apex, 1 étape restante",pre:"Terminez votre inscription gratuite pour réserver votre place.",hi:"Bonjour",intro:"Vous participez au tirage pour <b>3 comptes Apex</b>, et le gagnant choisit la taille du compte. Pour réserver votre place et être éligible, il suffit de :",s1:"Inscrivez-vous gratuitement sur le site",s2:"Suivez @marketscoupons sur Instagram",s3:"Partagez cet email avec vos amis. Plus vous partagez, plus vos chances de gagner augmentent.",done:"C'est fait, vous participez au tirage !",draw:"Tirage le 20 juillet 2026. Gratuit, sans achat.",cta1:"Terminer mon inscription",cta2:"Suivre sur Instagram",pill:"TIRAGE",h1:"Vous y êtes presque !"},
  de:{subj:"Du bist beim Gewinnspiel um 3 Apex-Konten dabei, 1 Schritt fehlt",pre:"Schließe deine kostenlose Anmeldung ab, um deinen Platz zu sichern.",hi:"Hallo",intro:"Du bist beim Gewinnspiel um <b>3 Apex-Konten</b> dabei, und der Gewinner wählt die Kontogröße. Um deinen Platz zu sichern und teilnahmeberechtigt zu sein:",s1:"Melde dich kostenlos auf der Seite an",s2:"Folge @marketscoupons auf Instagram",s3:"Teile diese E-Mail mit deinen Freunden. Je mehr du teilst, desto höher deine Gewinnchancen.",done:"Fertig! Du bist bei der Verlosung dabei.",draw:"Verlosung am 20. Juli 2026. Kostenlos, kein Kauf nötig.",cta1:"Anmeldung abschließen",cta2:"Auf Instagram folgen",pill:"GEWINNSPIEL",h1:"Fast geschafft!"},
  ar:{subj:"أنت في سحب 3 حسابات Apex، خطوة واحدة متبقية",pre:"أكمل تسجيلك المجاني لتأمين مكانك.",hi:"مرحبًا",intro:"أنت في السحب على <b>3 حسابات Apex</b>، والفائز يختار حجم الحساب. لتأمين مكانك والتأهل، فقط:",s1:"سجّل مجانًا في الموقع",s2:"تابع @marketscoupons على Instagram",s3:"شارك هذا البريد مع أصدقائك. كلما شاركت أكثر، زادت فرصك في الفوز.",done:"تم! أنت الآن في السحب.",draw:"السحب في 20 يوليو 2026. مجاني، بدون شراء.",cta1:"إكمال تسجيلي",cta2:"متابعة على Instagram",pill:"سحب",h1:"أوشكت على الدخول!"},
  id:{subj:"Kamu ikut giveaway 3 akun Apex, tinggal 1 langkah",pre:"Selesaikan pendaftaran gratis untuk mengamankan tempatmu.",hi:"Halo",intro:"Kamu ikut giveaway <b>3 akun Apex</b>, dan pemenang memilih ukuran akun. Untuk mengamankan tempat dan memenuhi syarat, cukup:",s1:"Daftar gratis di situs",s2:"Ikuti @marketscoupons di Instagram",s3:"Bagikan email ini ke temanmu. Makin banyak berbagi, makin besar peluang menang.",done:"Selesai! Kamu sudah ikut undian.",draw:"Undian pada 20 Juli 2026. Gratis, tanpa pembelian.",cta1:"Selesaikan pendaftaran",cta2:"Ikuti di Instagram",pill:"GIVEAWAY",h1:"Hampir masuk!"}
};
function buildGiveawayRulesHtml(name, lang, signupUrl, igUrl){
  const c = GW_MAIL[lang] || GW_MAIL.en;
  const rtl = lang==='ar' ? ' dir="rtl"' : '';
  const hi = name ? `${c.hi}, ${name}!` : `${c.hi}!`;
  const step = (n,txt)=>`<tr><td style="padding:6px 0;color:#1a2130;font-size:15px"><b style="color:#0a9d6e">${n}.</b> ${txt}</td></tr>`;
  return `<!doctype html><html${rtl}><head><meta charset="utf-8"></head><body style="margin:0;background:#0a0d14;font-family:Inter,Arial,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0d14"><tr><td align="center" style="padding:24px 12px">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#0f1620;border-radius:16px;overflow:hidden;border:1px solid rgba(61,227,168,.22)">
    <tr><td style="background:#ffffff;padding:16px 24px"><span style="font-weight:900;font-size:18px;color:#0a0d14">Markets<span style="color:#ff8c00">Coupons</span></span></td></tr>
    <tr><td style="height:3px;background:#3DE3A8;line-height:3px;font-size:0">&nbsp;</td></tr>
    <tr><td style="background:#111111;padding:30px 24px;text-align:center">
      <span style="display:inline-block;padding:6px 14px;border:1px solid rgba(61,227,168,.5);border-radius:100px;color:#3DE3A8;font-family:monospace;font-weight:700;font-size:11px;letter-spacing:.12em">&#9733; ${c.pill}</span>
      <h1 style="margin:14px 0 0;color:#ffffff;font-size:30px;font-weight:900">${c.h1}</h1>
    </td></tr>
    <tr><td style="background:#ffffff;padding:26px 24px;color:#1a2130;font-size:15px;line-height:1.6">
      <p style="margin:0 0 14px;font-weight:700">${hi}</p>
      <p style="margin:0 0 16px">${c.intro}</p>
      <table width="100%" cellpadding="0" cellspacing="0">${step(1,c.s1)}</table>
      <a href="${signupUrl}" style="display:block;text-align:center;background:#3DE3A8;color:#06150f;font-weight:800;padding:14px;border-radius:11px;text-decoration:none;margin:10px 0 14px">${c.cta1} &#8594;</a>
      <table width="100%" cellpadding="0" cellspacing="0">${step(2,c.s2)}</table>
      <a href="${igUrl}" style="display:block;text-align:center;background:#ffffff;color:#1a2130;border:1px solid #d0d5dd;font-weight:700;padding:12px;border-radius:11px;text-decoration:none;margin:10px 0 14px">${c.cta2}</a>
      <table width="100%" cellpadding="0" cellspacing="0">${step(3,c.s3)}</table>
      <p style="margin:18px 0 0;font-weight:800;color:#0a9d6e;font-size:16px">${c.done}</p>
      <p style="margin:14px 0 0;color:#667085;font-size:13px">${c.draw}</p>
      <p style="margin:22px 0 0;color:#1a2130">, Lara &middot; Markets Coupons</p>
    </td></tr>
    <tr><td style="background:#0f1620;padding:16px 24px;color:#8590a3;font-size:11px;text-align:center">&copy; 2026 Markets Coupons</td></tr>
  </table></td></tr></table></body></html>`;
}
async function sendGiveawayRulesEmail(email, name, lang, slug){
  const L = ['pt','en','es','it','fr','de','ar','id'].includes(lang)?lang:'en';
  const c = GW_MAIL[L] || GW_MAIL.en;
  const signupUrl = `https://www.marketscoupons.com/signup?gw=${encodeURIComponent(slug||'apex-3-accounts-2026')}`;
  const igUrl = 'https://www.instagram.com/marketscoupons/';
  const html = buildGiveawayRulesHtml(name, L, signupUrl, igUrl);
  const BREVO_KEY = process.env.BREVO_API_KEY, RESEND_KEY = process.env.RESEND_API_KEY;
  if (BREVO_KEY){ try{ const r=await fetch('https://api.brevo.com/v3/smtp/email',{method:'POST',headers:{'accept':'application/json','content-type':'application/json','api-key':BREVO_KEY},body:JSON.stringify({sender:{name:'Lara | Markets Coupons',email:'lara@marketscoupons.com'},to:[{email,name:name||'Trader'}],subject:c.subj,htmlContent:html,tags:['giveaway-rules',`lang-${L}`]})}); if(r.ok) return true; }catch(e){} }
  if (RESEND_KEY){ try{ const r=await fetch('https://api.resend.com/emails',{method:'POST',headers:{'Content-Type':'application/json','Authorization':`Bearer ${RESEND_KEY}`},body:JSON.stringify({from:'Lara | Markets Coupons <lara@marketscoupons.com>',to:[email],subject:c.subj,html})}); if(r.ok) return true; }catch(e){} }
  return false;
}

// Captura genérica de lead (sem enviar email). Usada por /operational e outras LPs.
async function handleSubscribe(req, res) {
  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }
  body = body || {};
  // honeypot opcional
  if (body.website) return res.status(200).json({ ok: true });
  const email = String(body.email || '').trim().toLowerCase();
  if (!isValidEmail(email)) return res.status(400).json({ ok: false, error: 'invalid_email' });
  const lang = ['pt','en','es','it','fr','de','ar','id'].includes(body.lang) ? body.lang : 'en';
  const source = String(body.source || 'lp').slice(0, 80);
  let tags = Array.isArray(body.tags) ? body.tags.filter(t => typeof t === 'string').slice(0, 6).map(t => t.slice(0, 40)) : [];
  if (!tags.length) tags = ['lead'];
  tags.push(`lang-${lang}`);
  try {
    const head = { 'Content-Type': 'application/json', 'apikey': SK || SUPABASE_KEY, 'Authorization': `Bearer ${SK || SUPABASE_KEY}` };
    // MERGE com as tags já existentes (NÃO sobrescrever): o upsert merge-duplicates troca a
    // coluna tags inteira, o que apagava 'received-welcome' e fazia o welcome reenviar.
    let existing = [];
    try {
      const g = await fetch(`${SUPABASE_URL}/rest/v1/email_subscribers?select=tags&email=eq.${encodeURIComponent(email)}&limit=1`, { headers: head });
      if (g.ok) { const rows = await g.json(); if (rows[0] && Array.isArray(rows[0].tags)) existing = rows[0].tags; }
    } catch {}
    const merged = Array.from(new Set([...existing, ...tags])).slice(0, 25);
    const r = await fetch(`${SUPABASE_URL}/rest/v1/email_subscribers?on_conflict=email`, {
      method: 'POST',
      headers: { ...head, 'Prefer': 'resolution=merge-duplicates,return=minimal' },
      body: JSON.stringify({ email, lang, source, tags: merged }),
    });
    if (!r.ok && r.status !== 409) {
      console.error('[subscribe] upsert failed', r.status, await r.text().catch(() => ''));
      return res.status(500).json({ ok: false, error: 'save_failed' });
    }
    // Sorteio: dispara o email das regras (multilíngue). Só pra lead de sorteio.
    if (source === 'giveaway' || body.giveaway_rules_slug) {
      const gwSent = await sendGiveawayRulesEmail(email, String(body.name || '').trim().slice(0, 60), lang, String(body.giveaway_rules_slug || ''));
      return res.status(200).json({ ok: true, gw_email: gwSent });
    }
    return res.status(200).json({ ok: true });
  } catch (e) {
    return res.status(500).json({ ok: false, error: 'save_failed' });
  }
}

module.exports = async (req, res) => {
  if (applyCors(req, res, { methods: 'GET, POST, OPTIONS' })) return;

  const url = new URL(req.url, 'http://x');
  const action = url.searchParams.get('action') || '';

  if (req.method === 'POST' && action === 'subscribe') {
    if (!rateLimitIp(req, 6)) return res.status(429).json({ ok: false, error: 'rate_limit' });
    return handleSubscribe(req, res);
  }
  if (req.method === 'GET' && action === 'reviews') return handleReviewsGet(req, res);
  if (req.method === 'GET' && action === 'admin-stats') return handleAdminStats(req, res);
  if (req.method === 'GET' && action === 'admin-list') return handleAdminList(req, res);
  if (req.method === 'GET' && action === 'admin-export') return handleAdminExport(req, res);
  if (req.method === 'POST' && action === 'review') return handleReviewPost(req, res);
  if (req.method === 'POST') {
    if (!rateLimitIp(req, 6)) return res.status(429).json({ ok: false, error: 'rate_limit' });
    return handleLead(req, res);
  }

  return res.status(405).json({ ok: false, error: 'method_not_allowed' });
};
