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

module.exports = async (req, res) => {
  if (applyCors(req, res, { methods: 'GET, POST, OPTIONS' })) return;

  const url = new URL(req.url, 'http://x');
  const action = url.searchParams.get('action') || '';

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
