// Cron endpoint: dispara batch diário pra campanha. Chamado via GitHub Actions cron.
// POST /api/cron-bulk-send
// Headers: Authorization: Bearer <CRON_SECRET>
// Body: { campaign: 'site-invite', filterTag?: 'bruno-marques', batchSize?: 400 }
//
// Lê elegíveis (active subscribers WHERE filterTag presente AND received-{campaign} ausente),
// renderiza HTML por idioma, envia via Brevo + Resend respeitando reservas, auto-tag.

const crypto = require('crypto');
const { renderInstHtml, getSubject } = require('../lib/email-render.js');

const SUPABASE_URL = 'https://qfwhduvutfumsaxnuofa.supabase.co';
const SK = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BREVO_KEY = process.env.BREVO_API_KEY;
const RESEND_KEY = process.env.RESEND_API_KEY;
const SG_KEY = process.env.SENDGRID_API_KEY;
const UNSUB_SECRET = process.env.UNSUBSCRIBE_SECRET;
const CRON_SECRET = process.env.CRON_SECRET;

const SUB_HEAD = { apikey: SK, Authorization: `Bearer ${SK}` };

function b64url(buf){ return Buffer.from(buf).toString('base64').replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,''); }
function signUnsub(email){
  const h = crypto.createHmac('sha256', UNSUB_SECRET).update(String(email).toLowerCase().trim()).digest();
  return b64url(h);
}
function buildUnsubUrl(email, lang){
  try { return `https://www.marketscoupons.com/api/unsubscribe?e=${encodeURIComponent(email)}&t=${signUnsub(email)}&lang=${lang||'en'}`; }
  catch { return 'https://www.marketscoupons.com/'; }
}

async function fetchEligible(filterTag, excludeTag, limit) {
  // Busca subscribers ativos: tem filterTag (se passado), NÃO tem excludeTag.
  // BUG fix 2026-05-05: quando filterTag=null, antes virava tags=cs.{null} literal,
  // batia 0 rows. Cron de site-invite ficou 6 dias sem enviar (~2k emails perdidos).
  // Agora: filterTag null = sem filtro de tag (= todos os ativos não-recebidos).
  const params = [
    'status=eq.active',
    `tags=not.cs.{${excludeTag}}`,
    'select=email,name,lang',
    'order=created_at.asc',
    `limit=${limit}`,
  ];
  if (filterTag) params.splice(1, 0, `tags=cs.{${filterTag}}`);
  const r = await fetch(`${SUPABASE_URL}/rest/v1/email_subscribers?${params.join('&')}`, { headers: SUB_HEAD });
  if (!r.ok) throw new Error(`fetch eligible ${r.status}: ${await r.text()}`);
  return r.json();
}

async function getProviderSentToday(provider) {
  const today = new Date().toISOString().slice(0, 10);
  try {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/email_logs?provider=eq.${provider}&created_at=gte.${today}&select=recipients`, { headers: SUB_HEAD });
    const logs = r.ok ? await r.json() : [];
    return logs.reduce((s, l) => s + (l.recipients || 0), 0);
  } catch { return 0; }
}
async function getResendSentToday() { return getProviderSentToday('resend'); }
async function getSendGridSentToday() { return getProviderSentToday('sendgrid'); }

async function getBrevoCredits() {
  try {
    const r = await fetch('https://api.brevo.com/v3/account', { headers: { 'accept': 'application/json', 'api-key': BREVO_KEY } });
    if (!r.ok) return 0;
    const acc = await r.json();
    const free = (acc.plan || []).find(p => typeof p.credits === 'number');
    return free ? free.credits : 0;
  } catch { return 0; }
}

async function appendTag(email, tag) {
  const r1 = await fetch(`${SUPABASE_URL}/rest/v1/email_subscribers?email=eq.${encodeURIComponent(email)}&select=tags`, { headers: SUB_HEAD });
  if (!r1.ok) return false;
  const rows = await r1.json();
  if (!rows.length) return false;
  const cur = rows[0].tags;
  const arr = Array.isArray(cur) ? [...cur] : (cur ? [cur] : []);
  if (arr.includes(tag)) return true;
  arr.push(tag);
  const r2 = await fetch(`${SUPABASE_URL}/rest/v1/email_subscribers?email=eq.${encodeURIComponent(email)}`, {
    method: 'PATCH',
    headers: { ...SUB_HEAD, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
    body: JSON.stringify({ tags: arr }),
  });
  return r2.ok;
}

async function sendViaBrevo(rec, subject, html, unsubUrl) {
  const listUnsub = `<${unsubUrl}>, <mailto:unsubscribe@marketscoupons.com?subject=unsubscribe>`;
  const r = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: { 'accept': 'application/json', 'content-type': 'application/json', 'api-key': BREVO_KEY },
    body: JSON.stringify({
      sender: { name: 'Lara | Markets Coupons', email: 'lara@marketscoupons.com' },
      to: [{ email: rec.email, name: rec.name || 'Trader' }],
      subject, htmlContent: html,
      headers: { 'List-Unsubscribe': listUnsub, 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' },
      tags: ['inst-' + rec.campaign, 'lang-' + rec.lang, 'cron'],
    }),
  });
  return r.ok;
}

async function sendViaResend(rec, subject, html, unsubUrl) {
  const listUnsub = `<${unsubUrl}>, <mailto:unsubscribe@marketscoupons.com?subject=unsubscribe>`;
  const r = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${RESEND_KEY}` },
    body: JSON.stringify({
      from: 'Lara | Markets Coupons <lara@marketscoupons.com>',
      to: [rec.email], subject, html,
      headers: { 'List-Unsubscribe': listUnsub, 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' },
      tags: [{ name: 'tag', value: 'inst-' + rec.campaign }, { name: 'lang', value: rec.lang }, { name: 'tag', value: 'cron' }],
    }),
  });
  return r.ok;
}

async function sendViaSendGrid(rec, subject, html, unsubUrl) {
  const listUnsub = `<${unsubUrl}>, <mailto:unsubscribe@marketscoupons.com?subject=unsubscribe>`;
  const r = await fetch('https://api.sendgrid.com/v3/mail/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${SG_KEY}` },
    body: JSON.stringify({
      personalizations: [{ to: [{ email: rec.email, name: rec.name || 'Trader' }] }],
      from: { email: 'lara@marketscoupons.com', name: 'Lara | Markets Coupons' },
      subject,
      content: [{ type: 'text/html', value: html }],
      headers: { 'List-Unsubscribe': listUnsub, 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' },
      categories: ['inst-' + rec.campaign, 'lang-' + rec.lang, 'cron'].map(c => String(c).replace(/[^a-zA-Z0-9_-]/g, '_')),
    }),
  });
  return r.status === 202;
}

async function isAdminJwt(jwt) {
  if (!jwt || jwt.length < 50 || !SK) return false;
  try {
    const ur = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: { apikey: SK, Authorization: `Bearer ${jwt}` }
    });
    if (!ur.ok) return false;
    const user = await ur.json();
    if (!user?.id) return false;
    const pr = await fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${user.id}&is_admin=eq.true&select=id`, {
      headers: { apikey: SK, Authorization: `Bearer ${SK}` }
    });
    if (!pr.ok) return false;
    const rows = await pr.json();
    return rows && rows.length > 0;
  } catch { return false; }
}

module.exports = async (req, res) => {
  // Auth dual: Bearer CRON_SECRET (GitHub Actions) OU Bearer admin-jwt (admin força envio)
  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  const isCron = CRON_SECRET && token === CRON_SECRET;
  const isAdmin = !isCron && (await isAdminJwt(token));
  if (!isCron && !isAdmin) return res.status(401).json({ error: 'Unauthorized' });
  if (!SK || !UNSUB_SECRET) return res.status(500).json({ error: 'missing env keys' });

  const { campaign, filterTag = null } = req.body || {};
  // batchSize bounded: max 500 (Brevo bulk 295 + Resend 100 + SendGrid 100), evita drain via JWT admin comprometido
  const batchSize = Math.max(1, Math.min(Number(req.body?.batchSize) || 400, 500));
  if (!campaign) return res.status(400).json({ error: 'campaign required' });
  // Validar campaign/filterTag pra evitar PostgREST filter injection
  if (!/^[a-z0-9_-]+$/i.test(campaign)) return res.status(400).json({ error: 'invalid campaign format' });
  if (filterTag && !/^[a-z0-9_-]+$/i.test(filterTag)) return res.status(400).json({ error: 'invalid filterTag format' });

  try {
    // Check if auto-email is paused (admin toggle via /api/email-status)
    try {
      const pauseCheck = await fetch(
        `${SUPABASE_URL}/rest/v1/site_settings?key=eq.email_auto_paused&select=value`,
        { headers: { apikey: SK, Authorization: `Bearer ${SK}` } }
      );
      if (pauseCheck.ok) {
        const rows = await pauseCheck.json();
        if (rows[0]?.value === 'true') {
          return res.status(200).json({ success: true, skipped: true, reason: 'auto_paused_by_admin' });
        }
      }
    } catch {}

    const excludeTag = `received-${campaign}`;

    // Calcula budget — 3 providers (Brevo bulk + Resend + SendGrid)
    const BREVO_RESERVE = 5;
    const credits = BREVO_KEY ? await getBrevoCredits() : 0;
    let brevoBudget = Math.max(0, credits - BREVO_RESERVE);
    const resendSent = RESEND_KEY ? await getResendSentToday() : 100;
    let resendBudget = RESEND_KEY ? Math.max(0, 100 - resendSent) : 0;
    const sgSent = SG_KEY ? await getSendGridSentToday() : 100;
    let sgBudget = SG_KEY ? Math.max(0, 100 - sgSent) : 0;
    const totalBudget = brevoBudget + resendBudget + sgBudget;

    if (totalBudget === 0) {
      return res.status(200).json({ success: true, message: 'Daily quota exhausted', sent: 0, brevoBudget, resendBudget, sgBudget });
    }

    const fetchLimit = Math.min(batchSize, totalBudget);
    const eligible = await fetchEligible(filterTag, excludeTag, fetchLimit);
    if (eligible.length === 0) {
      return res.status(200).json({ success: true, message: 'No eligible subscribers', sent: 0 });
    }

    // Timeout-aware: Vercel mata função em 300s. Reservamos 30s pro log final
    // + buffer. Se passar 270s, para o loop e reporta progresso.
    const startTs = Date.now();
    const SOFT_DEADLINE_MS = 270 * 1000;
    let sent = 0, failed = 0, brevoSent = 0, resendSent2 = 0, sgSent2 = 0;
    const sentEmails = []; // Onda 1: log per-recipient pra admin drilldown
    const failedEmails = [];
    let stoppedByDeadline = false;
    for (const sub of eligible) {
      if (Date.now() - startTs > SOFT_DEADLINE_MS) { stoppedByDeadline = true; break; }
      if (brevoBudget <= 0 && resendBudget <= 0 && sgBudget <= 0) break;
      const lang = sub.lang || 'en';
      const html = renderInstHtml(campaign, lang, buildUnsubUrl(sub.email, lang));
      const subject = getSubject(campaign, lang);
      if (!html) { failed++; failedEmails.push(sub.email); continue; }

      const rec = { email: sub.email, name: sub.name, lang, campaign };
      let ok = false;
      try {
        if (brevoBudget > 0) {
          ok = await sendViaBrevo(rec, subject, html, buildUnsubUrl(sub.email, lang));
          if (ok) { brevoSent++; brevoBudget--; }
        }
        if (!ok && resendBudget > 0) {
          ok = await sendViaResend(rec, subject, html, buildUnsubUrl(sub.email, lang));
          if (ok) { resendSent2++; resendBudget--; }
        }
        if (!ok && sgBudget > 0 && SG_KEY) {
          ok = await sendViaSendGrid(rec, subject, html, buildUnsubUrl(sub.email, lang));
          if (ok) { sgSent2++; sgBudget--; }
        }
      } catch { ok = false; }

      if (ok) {
        sent++;
        sentEmails.push(sub.email);
        await appendTag(sub.email, excludeTag).catch(() => null);
      } else { failed++; failedEmails.push(sub.email); }

      // Delay reduzido de 100ms → 30ms (provider rate limits comportam)
      await new Promise(r => setTimeout(r, 30));
    }

    // Log no email_logs (recipients_emails permite drilldown "quem recebeu")
    // Provider mais usado pra log primário
    const topProvider = brevoSent >= resendSent2 && brevoSent >= sgSent2 ? 'brevo'
      : resendSent2 >= sgSent2 ? 'resend' : 'sendgrid';
    await fetch(`${SUPABASE_URL}/rest/v1/email_logs`, {
      method: 'POST',
      headers: { ...SUB_HEAD, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
      body: JSON.stringify({
        campaign_name: `[Cron] ${campaign}`,
        subject: `Cron ${campaign} ${new Date().toISOString().slice(0,10)}`,
        recipients: sent + failed,
        recipients_emails: sentEmails,
        status: failed === 0 ? 'sent' : (sent === 0 ? 'failed' : 'partial'),
        sent_by: 'cron',
        provider: topProvider,
        brevo_response: {
          sent, failed,
          providers_breakdown: { brevo: brevoSent, resend: resendSent2, sendgrid: sgSent2 },
          failed_emails: failedEmails.slice(0, 50)
        },
      }),
    }).catch(() => null);

    return res.status(200).json({
      success: true,
      campaign, filterTag, eligible: eligible.length,
      sent, failed,
      brevoSent, resendSent: resendSent2, sgSent: sgSent2,
      budgetsRemaining: { brevo: brevoBudget, resend: resendBudget, sendgrid: sgBudget },
      stopped_by_deadline: stoppedByDeadline,
      duration_ms: Date.now() - startTs,
    });
  } catch (e) {
    console.error('[cron-bulk-send]', e);
    return res.status(500).json({ error: 'internal', detail: e.message });
  }
};
