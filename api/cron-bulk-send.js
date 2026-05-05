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

async function getResendSentToday() {
  const today = new Date().toISOString().slice(0, 10);
  try {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/email_logs?provider=eq.resend&created_at=gte.${today}&select=recipients`, { headers: SUB_HEAD });
    const logs = r.ok ? await r.json() : [];
    return logs.reduce((s, l) => s + (l.recipients || 0), 0);
  } catch { return 0; }
}

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

module.exports = async (req, res) => {
  // Auth: Bearer CRON_SECRET
  const auth = req.headers.authorization;
  if (!CRON_SECRET || auth !== `Bearer ${CRON_SECRET}`) return res.status(401).json({ error: 'Unauthorized' });
  if (!SK || !UNSUB_SECRET) return res.status(500).json({ error: 'missing env keys' });

  const { campaign, filterTag = null, batchSize = 400 } = req.body || {};
  if (!campaign) return res.status(400).json({ error: 'campaign required' });

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

    // Calcula budget
    const BREVO_RESERVE = 5;
    const credits = BREVO_KEY ? await getBrevoCredits() : 0;
    let brevoBudget = Math.max(0, credits - BREVO_RESERVE);
    const resendSent = RESEND_KEY ? await getResendSentToday() : 100;
    let resendBudget = RESEND_KEY ? Math.max(0, 100 - resendSent) : 0;
    const totalBudget = brevoBudget + resendBudget;

    if (totalBudget === 0) {
      return res.status(200).json({ success: true, message: 'Daily quota exhausted', sent: 0, brevoBudget, resendBudget });
    }

    const fetchLimit = Math.min(batchSize, totalBudget);
    const eligible = await fetchEligible(filterTag, excludeTag, fetchLimit);
    if (eligible.length === 0) {
      return res.status(200).json({ success: true, message: 'No eligible subscribers', sent: 0 });
    }

    let sent = 0, failed = 0, brevoSent = 0, resendSent2 = 0;
    const sentEmails = []; // Onda 1: log per-recipient pra admin drilldown
    const failedEmails = [];
    for (const sub of eligible) {
      if (brevoBudget <= 0 && resendBudget <= 0) break;
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
      } catch { ok = false; }

      if (ok) {
        sent++;
        sentEmails.push(sub.email);
        await appendTag(sub.email, excludeTag).catch(() => null);
      } else { failed++; failedEmails.push(sub.email); }

      await new Promise(r => setTimeout(r, 100));
    }

    // Log no email_logs (recipients_emails permite drilldown "quem recebeu")
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
        provider: brevoSent >= resendSent2 ? 'brevo' : 'resend',
        brevo_response: { sent, failed, brevoSent, resendSent: resendSent2, failed_emails: failedEmails.slice(0, 50) },
      }),
    }).catch(() => null);

    return res.status(200).json({
      success: true,
      campaign, filterTag, eligible: eligible.length,
      sent, failed,
      brevoSent, resendSent: resendSent2,
      brevoBudgetRemaining: brevoBudget, resendBudgetRemaining: resendBudget,
    });
  } catch (e) {
    console.error('[cron-bulk-send]', e);
    return res.status(500).json({ error: 'internal', detail: e.message });
  }
};
