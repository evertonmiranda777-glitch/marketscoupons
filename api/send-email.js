// Vercel Serverless Function — Send emails via Resend (primary, pago) + Brevo (fallback) + SendGrid (final fallback)
// POST /api/send-email
// Body: { to: [{email, name}], subject, htmlContent, sender?: {name, email}, tags?: [], provider?: 'brevo'|'resend'|'auto' }

const { sign: signUnsub } = require('./unsubscribe.js');
const { applyCors } = require('./_cors.js');
const { rateLimitIp } = require('./_ratelimit.js');

const SUPABASE_URL = 'https://qfwhduvutfumsaxnuofa.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFmd2hkdXZ1dGZ1bXNheG51b2ZhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQzNzc5NDYsImV4cCI6MjA4OTk1Mzk0Nn0.efRel6U68misvPSRj8-p31-gOhzjXN4eIFMiloTNyk4';
// Service role usado pra dedup automático (filtrar quem já recebeu) + auto-tag (marcar quem recebeu agora)
// Sem isso, RLS bloqueia UPDATE em email_subscribers.tags
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

// Detecta campaign key dos tags (formato 'inst-XXX' ou 'promo-XXX' do admin)
function detectCampaignKey(tags) {
  if (!Array.isArray(tags)) return null;
  for (const t of tags) {
    const m = String(t).match(/^(?:inst|promo)-(.+)$/);
    if (m) return m[1];
  }
  return null;
}

// Lista emails que JÁ têm tag `received-{campaignKey}` em email_subscribers
async function fetchAlreadyTagged(emails, campaignKey) {
  if (!SUPABASE_SERVICE_KEY || !campaignKey || !emails.length) return new Set();
  try {
    const targetTag = `received-${campaignKey}`;
    // PostgREST: emails IN (...) AND tags @> '{received-X}'
    const list = emails.map(e => `"${e}"`).join(',');
    const url = `${SUPABASE_URL}/rest/v1/email_subscribers?email=in.(${list})&tags=cs.{${targetTag}}&select=email`;
    const r = await fetch(url, {
      headers: { apikey: SUPABASE_SERVICE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_KEY}` },
    });
    if (!r.ok) return new Set();
    const rows = await r.json();
    return new Set(rows.map(x => x.email.toLowerCase().trim()));
  } catch { return new Set(); }
}

// Append tag `received-{campaignKey}` no email_subscribers do email (após envio bem-sucedido)
async function appendCampaignTag(email, campaignKey) {
  if (!SUPABASE_SERVICE_KEY || !campaignKey) return;
  const targetTag = `received-${campaignKey}`;
  try {
    const get = await fetch(
      `${SUPABASE_URL}/rest/v1/email_subscribers?email=eq.${encodeURIComponent(email)}&select=tags`,
      { headers: { apikey: SUPABASE_SERVICE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_KEY}` } }
    );
    if (!get.ok) return;
    const rows = await get.json();
    if (!rows.length) return;
    const cur = rows[0].tags;
    const arr = Array.isArray(cur) ? [...cur] : (cur ? [cur] : []);
    if (arr.includes(targetTag)) return;
    arr.push(targetTag);
    await fetch(
      `${SUPABASE_URL}/rest/v1/email_subscribers?email=eq.${encodeURIComponent(email)}`,
      {
        method: 'PATCH',
        headers: {
          apikey: SUPABASE_SERVICE_KEY,
          Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
          'Content-Type': 'application/json',
          Prefer: 'return=minimal',
        },
        body: JSON.stringify({ tags: arr }),
      }
    );
  } catch { /* silent */ }
}

// Validate JWT with Supabase and check admin role
async function validateAdmin(jwt) {
  if (!jwt || jwt.length < 50) return null;
  try {
    const resp = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: { 'Authorization': `Bearer ${jwt}`, 'apikey': SUPABASE_KEY }
    });
    if (!resp.ok) return null;
    const user = await resp.json();
    if (!user?.id) return null;

    // Check admin status in profiles table
    const profileResp = await fetch(
      `${SUPABASE_URL}/rest/v1/profiles?id=eq.${user.id}&is_admin=eq.true&select=id`,
      { headers: { 'Authorization': `Bearer ${jwt}`, 'apikey': SUPABASE_KEY } }
    );
    if (!profileResp.ok) return null;
    const profiles = await profileResp.json();
    return (profiles && profiles.length > 0) ? user : null;
  } catch {
    return null;
  }
}

module.exports = async (req, res) => {
  if (applyCors(req, res, { methods: 'POST, GET, OPTIONS' })) return;

  // ─── CRON BULK SEND ROUTE (?action=cron-bulk) ───
  // Substitui /api/cron-bulk-send.js deletado (Vercel function limit 12).
  // Auth: Bearer CRON_SECRET. Lê subscribers sem tag received-{campaign}, envia em lote.
  if (req.query?.action === 'cron-bulk' || req.query?.list_active === '1') {
    const cronSecret = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
    if (!cronSecret || cronSecret !== process.env.CRON_SECRET) {
      return res.status(401).json({ error: 'invalid_cron_secret' });
    }
    // GET ?list_active=1 — retorna lista de campanhas ativas (Supabase site_settings.email_active_campaigns)
    if (req.query.list_active === '1') {
      try {
        const subKey = SUPABASE_SERVICE_KEY || SUPABASE_KEY;
        const r = await fetch(`${SUPABASE_URL}/rest/v1/site_settings?key=eq.email_active_campaigns&select=value`,
          { headers: { apikey: subKey, Authorization: `Bearer ${subKey}` } });
        if (!r.ok) return res.status(200).send('site-invite');
        const rows = await r.json();
        return res.status(200).send(rows[0]?.value || 'site-invite');
      } catch { return res.status(200).send('site-invite'); }
    }
    // POST ?action=cron-bulk — dispara campanha
    if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' });
    const { campaign, batchSize } = req.body || {};
    if (!campaign) return res.status(400).json({ error: 'missing_campaign' });
    const N = Math.min(parseInt(batchSize, 10) || 250, 500);
    const subKey = SUPABASE_SERVICE_KEY || SUPABASE_KEY;
    try {
      // 1. Buscar subscribers sem tag received-{campaign} + confirmed + nao unsubscribed
      const tag = `received-${campaign}`;
      const url = `${SUPABASE_URL}/rest/v1/email_subscribers?confirmed=eq.true&unsubscribed=eq.false&select=email,name&order=created_at.asc&limit=${N}`;
      const r = await fetch(url, { headers: { apikey: subKey, Authorization: `Bearer ${subKey}` } });
      if (!r.ok) return res.status(500).json({ error: 'fetch_subscribers_failed', status: r.status });
      const all = await r.json();
      // Filtrar quem ja tem received-{campaign} (filtragem em memoria)
      const emails = all.map(s => (s.email||'').toLowerCase().trim()).filter(Boolean);
      const already = await fetchAlreadyTagged(emails, campaign);
      const recipients = all.filter(s => !already.has((s.email||'').toLowerCase().trim()));
      if (!recipients.length) {
        return res.status(200).json({ ok: true, campaign, message: 'no_eligible_recipients', total_subs: all.length, already_received: already.size });
      }
      // 2. Renderizar HTML do template via lib/email-render.js
      let renderInstHtml, INST_TEMPLATES;
      try {
        const lib = require('../lib/email-render.js');
        renderInstHtml = lib.renderInstHtml;
        INST_TEMPLATES = lib.INST_TEMPLATES;
      } catch (e) {
        return res.status(500).json({ error: 'render_lib_missing', detail: e.message });
      }
      const tpl = INST_TEMPLATES?.[campaign];
      if (!tpl) return res.status(400).json({ error: 'unknown_campaign', campaign, available: Object.keys(INST_TEMPLATES||{}) });
      // 3. Renderizar HTML + subject (lang default 'en')
      const lang = 'en';
      const html = renderInstHtml(tpl, lang);
      const subjectStr = (typeof tpl.subject === 'object' ? (tpl.subject[lang] || tpl.subject.en) : tpl.subject) || 'MarketsCoupons';
      // 4. Enviar em chunks de 50 chamando a propria send-email logica interna (loop)
      // Aqui, simplificadamente, retornamos a quantidade que seria enviada — o envio real
      // delega pra mesma function via fetch interno (loop pequeno aceitavel)
      // 4. Reescreve req.body + flag bypass admin pra delegar pra rotina principal abaixo
      req.body = {
        to: recipients.slice(0, 50).map(s => ({ email: s.email, name: s.name || 'Trader' })),
        subject: subjectStr,
        htmlContent: html,
        tags: [`inst-${campaign}`],
        campaign,
      };
      req._cronAuthorized = true;
      // Continua execucao do handler normal abaixo (envio + dedup auto + logging)
      // Nao retorna aqui — fall through pra rotina principal
    } catch (e) {
      return res.status(500).json({ error: 'cron_bulk_failed', detail: e.message });
    }
  }

  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const BREVO_KEY = process.env.BREVO_API_KEY;
  const RESEND_KEY = process.env.RESEND_API_KEY;

  // Auth: validate JWT and verify admin role PRIMEIRO (bypassa rate limit pra admin)
  // Bypass quando vier do cron handler interno (action=cron-bulk autorizado por CRON_SECRET)
  let admin = req._cronAuthorized ? { id: 'cron', cron: true } : null;
  if (!admin) {
    const auth = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
    admin = await validateAdmin(auth);
    if (!admin) {
      if (!rateLimitIp(req, 30)) return res.status(429).json({ error: 'rate_limit' });
      return res.status(403).json({ error: 'Forbidden: admin access required' });
    }
  }
  // Admin autenticado: rate limit MUITO maior (200/min) — disparo de 23k em chunks de 200 = ~120 calls
  if (!rateLimitIp(req, 200)) return res.status(429).json({ error: 'rate_limit_admin', detail: 'Even admin limited at 200/min — slow down or chunk larger' });

  // Input validation
  const contentLength = parseInt(req.headers['content-length'] || '0', 10);
  if (contentLength > 512000) return res.status(413).json({ error: 'Payload too large (max 500KB)' });

  const { subject, htmlContent, textContent, sender, tags, provider, noDedup } = req.body;
  let { to } = req.body;
  if (!to || !to.length || !subject || (!htmlContent && !textContent)) {
    return res.status(400).json({ error: 'Missing required fields: to, subject, htmlContent or textContent' });
  }

  // Limit recipients per request
  if (to.length > 200) {
    return res.status(400).json({ error: 'Too many recipients (max 200 per request)' });
  }

  // DEDUP AUTOMÁTICO: se tags tem 'inst-XXX' ou 'promo-XXX', filtra quem já tem `received-XXX`
  // Bypass: passar { noDedup: true } no body (ex: pra teste mandar pra si mesmo de novo)
  const campaignKey = detectCampaignKey(tags);
  let dedupFilteredOut = [];
  if (campaignKey && !noDedup) {
    const allEmails = to.map(t => (t.email || '').toLowerCase().trim()).filter(Boolean);
    const already = await fetchAlreadyTagged(allEmails, campaignKey);
    if (already.size > 0) {
      dedupFilteredOut = to.filter(t => already.has((t.email || '').toLowerCase().trim()));
      to = to.filter(t => !already.has((t.email || '').toLowerCase().trim()));
      console.log(`[send-email] dedup '${campaignKey}': filtrou ${dedupFilteredOut.length}, restam ${to.length}`);
    }
  }
  if (to.length === 0) {
    return res.status(200).json({
      success: true, total: 0, sent: 0, failed: 0,
      dedup_filtered_out: dedupFilteredOut.length,
      message: `Todos ${dedupFilteredOut.length} emails já receberam '${campaignKey}'. Nada a enviar.`,
    });
  }

  // Validate email format (basic)
  const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const invalidEmails = to.filter(r => !emailRe.test(r.email));
  if (invalidEmails.length > 0) {
    return res.status(400).json({ error: `Invalid email(s): ${invalidEmails.map(r => r.email).join(', ').slice(0, 200)}` });
  }

  const senderInfo = sender || { name: 'Lara | MarketsCoupons', email: 'lara@marketscoupons.com' };

  // UTM tagging: every marketscoupons.com link in the htmlContent gets utm_source=email
  // utm_medium=broadcast (or from body.utmMedium) utm_campaign=<tag or body.campaign>
  const utmMedium = (req.body.utmMedium || 'email').toLowerCase().replace(/[^a-z0-9_]/g,'');
  const utmCampaign = (req.body.campaign || (tags && tags[0]) || 'generic').toLowerCase().replace(/[^a-z0-9_]/g,'_').slice(0,60);
  function tagUrl(url, provider) {
    try {
      if (!/^https?:\/\/(www\.)?marketscoupons\.(com|vercel\.app)/i.test(url)) return url;
      const u = new URL(url);
      if (!u.searchParams.get('utm_source')) u.searchParams.set('utm_source', 'email');
      if (!u.searchParams.get('utm_medium')) u.searchParams.set('utm_medium', utmMedium);
      if (!u.searchParams.get('utm_campaign')) u.searchParams.set('utm_campaign', utmCampaign);
      if (provider && !u.searchParams.get('utm_content')) u.searchParams.set('utm_content', provider);
      return u.toString();
    } catch { return url; }
  }
  function tagHtml(html, provider) {
    if (!html) return html;
    return html.replace(/href\s*=\s*"(https?:\/\/[^"]+)"/gi, (m, url) => `href="${tagUrl(url, provider)}"`)
               .replace(/href\s*=\s*'(https?:\/\/[^']+)'/gi, (m, url) => `href='${tagUrl(url, provider)}'`);
  }

  function buildUnsubHeader(email) {
    try {
      const url = `https://www.marketscoupons.com/api/unsubscribe?e=${encodeURIComponent(email)}&t=${signUnsub(email)}`;
      return `<${url}>, <mailto:unsubscribe@marketscoupons.com?subject=unsubscribe>`;
    } catch { return '<mailto:unsubscribe@marketscoupons.com?subject=unsubscribe>'; }
  }

  // Send via Brevo
  async function sendViaBrevo(recipient, finalSubject, finalHtml) {
    if (!BREVO_KEY) return { email: recipient.email, status: 'skipped', provider: 'brevo', response: { error: 'no key' } };
    const body = {
      sender: senderInfo,
      to: [{ email: recipient.email, name: recipient.name || 'Trader' }],
      subject: finalSubject,
      htmlContent: finalHtml,
      headers: {
        'List-Unsubscribe': buildUnsubHeader(recipient.email),
        'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
      },
      tags: tags || ['campaign'],
    };
    const resp = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: { 'accept': 'application/json', 'content-type': 'application/json', 'api-key': BREVO_KEY },
      body: JSON.stringify(body),
    });
    const data = await resp.json();
    console.log(`[BREVO] ${recipient.email} → ${resp.status}`);
    return { email: recipient.email, status: resp.ok ? 'sent' : 'failed', provider: 'brevo', response: data };
  }

  // Send via SendGrid (3º provider, +100/dia free)
  async function sendViaSendGrid(recipient, finalSubject, finalHtml) {
    const SG_KEY = process.env.SENDGRID_API_KEY;
    if (!SG_KEY) return { email: recipient.email, status: 'skipped', provider: 'sendgrid', response: { error: 'no key' } };
    const body = {
      personalizations: [{ to: [{ email: recipient.email, name: recipient.name || 'Trader' }] }],
      from: { email: senderInfo.email, name: senderInfo.name },
      subject: finalSubject,
      content: [{ type: 'text/html', value: finalHtml }],
      headers: {
        'List-Unsubscribe': buildUnsubHeader(recipient.email),
        'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
      },
      categories: (tags || ['campaign']).slice(0, 10).map(t => String(t).replace(/[^a-zA-Z0-9_-]/g, '_')),
    };
    const resp = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${SG_KEY}` },
      body: JSON.stringify(body),
    });
    console.log(`[SENDGRID] ${recipient.email} → ${resp.status}`);
    if (resp.status === 202) {
      return { email: recipient.email, status: 'sent', provider: 'sendgrid', response: { accepted: true } };
    }
    const data = await resp.json().catch(() => ({}));
    return { email: recipient.email, status: 'failed', provider: 'sendgrid', response: data };
  }

  // Send via Resend
  async function sendViaResend(recipient, finalSubject, finalHtml) {
    if (!RESEND_KEY) return { email: recipient.email, status: 'skipped', provider: 'resend', response: { error: 'no key' } };
    const body = {
      from: `${senderInfo.name} <${senderInfo.email}>`,
      to: [recipient.email],
      subject: finalSubject,
      html: finalHtml,
      headers: {
        'List-Unsubscribe': buildUnsubHeader(recipient.email),
        'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
      },
      tags: (tags || ['campaign']).map((t, i) => ({ name: `tag${i+1}`, value: String(t).replace(/[^a-zA-Z0-9_-]/g, '_') })),
    };
    const resp = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${RESEND_KEY}` },
      body: JSON.stringify(body),
    });
    const data = await resp.json();
    console.log(`[RESEND] ${recipient.email} → ${resp.status}`);
    return { email: recipient.email, status: resp.ok ? 'sent' : 'failed', provider: 'resend', response: data };
  }

  // Determine provider: 'brevo', 'resend', 'sendgrid', or 'auto' (brevo→resend→sendgrid)
  const useProvider = provider || 'auto';
  const SG_KEY = process.env.SENDGRID_API_KEY;

  // Reserva 5 em Brevo (transacionais — welcome tenta Brevo primeiro).
  // Bulk: ~295 Brevo + ~100 Resend + ~100 SendGrid = ~495/dia.
  const BREVO_RESERVE = 5;
  let brevoBudget = Infinity;
  let resendBudget = Infinity;
  let sendgridBudget = Infinity;
  if (useProvider === 'auto' && to.length > 1) {
    if (BREVO_KEY) {
      try {
        const accResp = await fetch('https://api.brevo.com/v3/account', {
          headers: { 'accept': 'application/json', 'api-key': BREVO_KEY },
        });
        const acc = await accResp.json();
        const freePlan = (acc.plan || []).find(p => typeof p.credits === 'number');
        const credits = freePlan?.credits ?? 0;
        brevoBudget = Math.max(0, credits - BREVO_RESERVE);
        console.log(`[send-email] Brevo credits: ${credits}, reserve: ${BREVO_RESERVE}, bulk budget: ${brevoBudget}`);
      } catch (e) {
        console.error('[send-email] Brevo account check failed:', e.message);
        brevoBudget = 0;
      }
    }
    if (RESEND_KEY) {
      // Resend cap: lê de site_settings.resend_daily_limit (default 100 free; user pode subir após assinar Pro).
      // Subtrai quantos já enviamos hoje via email_logs (provider='resend').
      try {
        const today = new Date().toISOString().slice(0, 10);
        const subKey = SUPABASE_SERVICE_KEY||SUPABASE_KEY;
        let resendDailyLimit = 100;
        try {
          const sr = await fetch(`${SUPABASE_URL}/rest/v1/site_settings?key=eq.resend_daily_limit&select=value`,
            { headers: { apikey: subKey, Authorization: `Bearer ${subKey}` } });
          if (sr.ok) {
            const rows = await sr.json();
            const v = parseInt(rows[0]?.value, 10);
            if (Number.isFinite(v) && v > 0) resendDailyLimit = v;
          }
        } catch {}
        const r = await fetch(`${SUPABASE_URL}/rest/v1/email_logs?provider=eq.resend&created_at=gte.${today}&select=recipients`, {
          headers: { apikey: subKey, Authorization: `Bearer ${subKey}` },
        });
        const logs = r.ok ? await r.json() : [];
        const sentToday = logs.reduce((s, l) => s + (l.recipients || 0), 0);
        resendBudget = Math.max(0, resendDailyLimit - sentToday);
        console.log(`[send-email] Resend sentToday: ${sentToday}, dailyLimit: ${resendDailyLimit}, bulk budget: ${resendBudget}`);
      } catch (e) {
        console.error('[send-email] Resend budget check failed:', e.message);
        resendBudget = 100; // fallback conservador
      }
    }
    if (SG_KEY) {
      // SendGrid free tier: 100/dia. Subtrai quantos já enviamos hoje via email_logs (provider='sendgrid').
      try {
        const today = new Date().toISOString().slice(0, 10);
        const r = await fetch(`${SUPABASE_URL}/rest/v1/email_logs?provider=eq.sendgrid&created_at=gte.${today}&select=recipients`, {
          headers: { apikey: SUPABASE_SERVICE_KEY||SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_KEY||SUPABASE_KEY}` },
        });
        const logs = r.ok ? await r.json() : [];
        const sentToday = logs.reduce((s, l) => s + (l.recipients || 0), 0);
        sendgridBudget = Math.max(0, 100 - sentToday);
        console.log(`[send-email] SendGrid sentToday: ${sentToday}, bulk budget: ${sendgridBudget}`);
      } catch (e) {
        console.error('[send-email] SendGrid budget check failed:', e.message);
        sendgridBudget = 100;
      }
    }
  }

  const results = [];
  const tagPromises = []; // colectadas dentro do loop, aguardadas no fim
  for (const recipient of to) {
    const finalSubject = subject
      .replace(/{nome}/g, recipient.name || 'Trader')
      .replace(/{email}/g, recipient.email || '');
    const subToken = recipient.email ? Buffer.from(String(recipient.email).toLowerCase().trim()).toString('base64').replace(/=+$/,'') : '';
    const finalHtmlRaw = (htmlContent || textToHtml(textContent))
      .replace(/{nome}/g, recipient.name || 'Trader')
      .replace(/{email}/g, recipient.email || '')
      .replace(/{cupom}/g, recipient.cupom || '')
      .replace(/{firma}/g, recipient.firma || '')
      .replace(/{SUB}/g, encodeURIComponent(subToken))
      .replace(/{link}/g, tagUrl('https://www.marketscoupons.com'));
    const finalHtml = tagHtml(finalHtmlRaw);

    let result;
    try {
      if (useProvider === 'resend') {
        result = await sendViaResend(recipient, finalSubject, finalHtml);
      } else if (useProvider === 'brevo') {
        result = await sendViaBrevo(recipient, finalSubject, finalHtml);
      } else if (useProvider === 'sendgrid') {
        result = await sendViaSendGrid(recipient, finalSubject, finalHtml);
      } else {
        // Auto: Resend (pago, dominio aquecido) → Brevo (fallback) → SendGrid (fallback final)
        // ORDEM CRITICA: Resend FIRST pos-crise spam 13/05/2026 — Brevo causava queda em quarentena
        if (resendBudget > 0 && RESEND_KEY) {
          result = await sendViaResend(recipient, finalSubject, finalHtml);
          if (result.status === 'sent') resendBudget--;
          if (result.status === 'failed' && BREVO_KEY && brevoBudget > 0) {
            console.log(`[AUTO] Resend errored for ${recipient.email}, falling back to Brevo`);
            result = await sendViaBrevo(recipient, finalSubject, finalHtml);
            if (result.status === 'sent') brevoBudget--;
          }
          if (result.status === 'failed' && SG_KEY && sendgridBudget > 0) {
            console.log(`[AUTO] Brevo errored for ${recipient.email}, falling back to SendGrid`);
            result = await sendViaSendGrid(recipient, finalSubject, finalHtml);
            if (result.status === 'sent') sendgridBudget--;
          }
        } else if (brevoBudget > 0 && BREVO_KEY) {
          result = await sendViaBrevo(recipient, finalSubject, finalHtml);
          if (result.status === 'sent') brevoBudget--;
          if (result.status === 'failed' && SG_KEY && sendgridBudget > 0) {
            console.log(`[AUTO] Brevo errored for ${recipient.email}, falling back to SendGrid`);
            result = await sendViaSendGrid(recipient, finalSubject, finalHtml);
            if (result.status === 'sent') sendgridBudget--;
          }
        } else if (sendgridBudget > 0 && SG_KEY) {
          result = await sendViaSendGrid(recipient, finalSubject, finalHtml);
          if (result.status === 'sent') sendgridBudget--;
        } else {
          result = { email: recipient.email, status: 'skipped', provider: 'auto', response: { error: 'Daily quota hit (Brevo+Resend+SendGrid) — resumes tomorrow' } };
        }
      }
    } catch (err) {
      result = { email: recipient.email, status: 'failed', error: err.message };
    }
    results.push(result);

    // Auto-tag em email_subscribers se envio bem-sucedido — colecta promise pra await NO FINAL
    // (fire-and-forget não funciona em Vercel serverless: handler return mata in-flight network)
    if (result.status === 'sent' && campaignKey) {
      tagPromises.push(appendCampaignTag(result.email, campaignKey).catch(() => null));
    }

    // Small delay to avoid rate limiting
    if (to.length > 10) await new Promise(r => setTimeout(r, 100));
  }

  // Aguarda TODOS os auto-tags terminarem antes de retornar (Vercel kills in-flight on return)
  if (tagPromises.length > 0) {
    console.log(`[send-email] aguardando ${tagPromises.length} auto-tags...`);
    await Promise.all(tagPromises);
  }

  const sent = results.filter(r => r.status === 'sent').length;
  const failed = results.filter(r => r.status === 'failed').length;
  const providers = {
    brevo:    results.filter(r => r.provider === 'brevo'    && r.status === 'sent').length,
    resend:   results.filter(r => r.provider === 'resend'   && r.status === 'sent').length,
    sendgrid: results.filter(r => r.provider === 'sendgrid' && r.status === 'sent').length,
  };

  return res.status(200).json({
    success: true,
    total: to.length,
    sent,
    failed,
    providers,
    campaign_key: campaignKey,
    dedup_filtered_out: dedupFilteredOut.length,
    results,
  });
};

function textToHtml(text) {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\n/g, '<br>')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
}
