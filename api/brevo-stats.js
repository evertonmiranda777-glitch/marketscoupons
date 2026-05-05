// Vercel Serverless Function — Proxy for Brevo statistics API
// GET /api/brevo-stats?type=events|report&days=7&tag=promo-apex&offset=0&limit=50
// Requires admin JWT in Authorization header

const crypto = require('crypto');
const { applyCors } = require('./_cors.js');
const { rateLimitIp } = require('./_ratelimit.js');
const { safeError } = require('./_safe-error.js');

function timingSafeEq(a, b) {
  try {
    const ba = Buffer.from(String(a || ''));
    const bb = Buffer.from(String(b || ''));
    if (ba.length !== bb.length) return false;
    return crypto.timingSafeEqual(ba, bb);
  } catch { return false; }
}

const SUPABASE_URL = 'https://qfwhduvutfumsaxnuofa.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFmd2hkdXZ1dGZ1bXNheG51b2ZhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQzNzc5NDYsImV4cCI6MjA4OTk1Mzk0Nn0.efRel6U68misvPSRj8-p31-gOhzjXN4eIFMiloTNyk4';

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
      { headers: { 'Authorization': `Bearer ${jwt}`, 'apikey': SUPABASE_KEY } }
    );
    if (!profileResp.ok) return null;
    const profiles = await profileResp.json();
    return (profiles && profiles.length > 0) ? user : null;
  } catch { return null; }
}

function dateStr(daysAgo) {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString().split('T')[0];
}

// === Email auto-dispatch status helpers (consolidado pra economizar slot Vercel Hobby) ===
const SK_FOR_PAUSE = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
async function readPauseFlag() {
  if (!SK_FOR_PAUSE) return false;
  try {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/site_settings?key=eq.email_auto_paused&select=value`,
      { headers: { apikey: SK_FOR_PAUSE, Authorization: `Bearer ${SK_FOR_PAUSE}` } });
    if (!r.ok) return false;
    const rows = await r.json();
    return rows[0]?.value === 'true';
  } catch { return false; }
}
async function writePauseFlag(value) {
  if (!SK_FOR_PAUSE) throw new Error('no service key');
  await fetch(`${SUPABASE_URL}/rest/v1/site_settings`, {
    method: 'POST',
    headers: { apikey: SK_FOR_PAUSE, Authorization: `Bearer ${SK_FOR_PAUSE}`, 'Content-Type':'application/json', Prefer:'resolution=merge-duplicates' },
    body: JSON.stringify({ key: 'email_auto_paused', value: value ? 'true' : 'false', updated_at: new Date().toISOString() }),
  });
}
async function readEmailDailyStats() {
  // Hoje: Brevo direto (sent_today_brevo) + email_logs.providers_breakdown (resend/sendgrid)
  // Semana: soma email_logs
  const BREVO_KEY = process.env.BREVO_API_KEY;
  let sent_today_brevo = 0;
  if (BREVO_KEY) {
    try {
      const todayStr = new Date().toISOString().slice(0,10);
      const r = await fetch(`https://api.brevo.com/v3/transactionalEmails/statistics/aggregatedReport?startDate=${todayStr}&endDate=${todayStr}`,
        { headers: { 'accept':'application/json', 'api-key': BREVO_KEY } });
      if (r.ok) {
        const d = await r.json();
        sent_today_brevo = (d.requests || d.delivered || 0);
      }
    } catch {}
  }
  let sent_today_resend = 0, sent_today_sendgrid = 0;
  let week_sent=0, week_failed=0;
  if (SK_FOR_PAUSE) {
    const todayStr = new Date().toISOString().slice(0,10);
    const weekAgo = new Date(Date.now()-7*86400000).toISOString().slice(0,10);
    try {
      // Hoje: providers_breakdown
      const t = await fetch(`${SUPABASE_URL}/rest/v1/email_logs?created_at=gte.${todayStr}&select=brevo_response`,
        { headers: { apikey: SK_FOR_PAUSE, Authorization: `Bearer ${SK_FOR_PAUSE}` } });
      const tRows = t.ok ? await t.json() : [];
      tRows.forEach(r => {
        const pb = r.brevo_response?.providers_breakdown;
        if (pb) { sent_today_resend += (pb.resend || 0); sent_today_sendgrid += (pb.sendgrid || 0); }
      });
      // Semana: total
      const w = await fetch(`${SUPABASE_URL}/rest/v1/email_logs?created_at=gte.${weekAgo}&select=brevo_response`,
        { headers: { apikey: SK_FOR_PAUSE, Authorization: `Bearer ${SK_FOR_PAUSE}` } });
      const wRows = w.ok ? await w.json() : [];
      wRows.forEach(r => { week_sent += (r.brevo_response?.sent || 0); week_failed += (r.brevo_response?.failed || 0); });
    } catch {}
  }
  const sent_today = sent_today_brevo + sent_today_resend + sent_today_sendgrid;
  return { sent_today, sent_today_brevo, sent_today_resend, sent_today_sendgrid, week_sent, week_failed };
}
function nextEmailRunLabel() {
  const now = new Date(); const next = new Date(now);
  next.setUTCHours(11, 0, 0, 0);
  if (next.getTime() <= now.getTime()) next.setUTCDate(next.getUTCDate() + 1);
  const diffMs = next.getTime() - now.getTime();
  const h = Math.floor(diffMs/3600000), m = Math.floor((diffMs%3600000)/60000);
  const today = new Date(); today.setUTCHours(11,0,0,0);
  return `${today.getTime()===next.getTime() ? 'Hoje' : 'Amanhã'} 08:00 (em ${h}h ${m}min)`;
}

module.exports = async (req, res) => {
  if (applyCors(req, res, { methods: 'GET, POST, OPTIONS' })) return;
  if (!rateLimitIp(req, 60)) return res.status(429).json({ error: 'rate_limit' });

  // === Onda 3: Brevo webhook (autenticação via token, sem JWT) ===
  // Brevo POSTa em /api/brevo-stats?action=webhook
  // Token aceito via header X-Webhook-Token OU query param ?token=X (legacy/Brevo UI)
  // Eventos: delivered, soft_bounce, hard_bounce, spam, unsubscribed, etc.
  if (req.method === 'POST' && req.query?.action === 'webhook') {
    if (!rateLimitIp(req, 30)) return res.status(429).json({ error: 'rate_limit_webhook' });
    const expectedToken = process.env.BREVO_WEBHOOK_TOKEN;
    if (!expectedToken) return res.status(500).json({ error: 'BREVO_WEBHOOK_TOKEN not configured' });
    const provided = req.headers['x-webhook-token'] || req.query.token || '';
    if (!timingSafeEq(provided, expectedToken)) return res.status(401).json({ error: 'Invalid webhook token' });
    if (!SK_FOR_PAUSE) return res.status(500).json({ error: 'service_role_required' });

    try {
      const ev = req.body || {};
      const event = (ev.event || '').toLowerCase();
      const email = (ev.email || '').toLowerCase().trim();
      const reason = String(ev.reason || ev.message || '').slice(0, 200);
      if (!email) return res.status(200).json({ ok: true, skipped: 'no_email' });

      const subHead = { apikey: SK_FOR_PAUSE, Authorization: `Bearer ${SK_FOR_PAUSE}`, 'Content-Type': 'application/json' };
      const now = new Date().toISOString();
      let patch = { last_event_at: now };

      if (event === 'hard_bounce') {
        patch.status = 'bounced';
        patch.bounce_status = 'hard_bounce';
        patch.bounce_reason = reason;
      } else if (event === 'spam' || event === 'complaint') {
        patch.status = 'complained';
        patch.bounce_status = 'spam_complaint';
        patch.bounce_reason = reason;
      } else if (event === 'unsubscribed') {
        patch.status = 'unsubscribed';
      } else if (event === 'soft_bounce') {
        // Soft bounce: incrementa contador. Ao chegar 3, vira hard.
        const r = await fetch(`${SUPABASE_URL}/rest/v1/email_subscribers?email=eq.${encodeURIComponent(email)}&select=soft_bounce_count`, { headers: subHead });
        const rows = r.ok ? await r.json() : [];
        const cur = (rows[0]?.soft_bounce_count || 0) + 1;
        patch.soft_bounce_count = cur;
        patch.bounce_status = 'soft_bounce';
        patch.bounce_reason = reason;
        if (cur >= 3) {
          patch.status = 'bounced';
          patch.bounce_status = 'soft_bounce_3x';
        }
      } else {
        // delivered/opened/click → log apenas last_event_at
      }

      await fetch(`${SUPABASE_URL}/rest/v1/email_subscribers?email=eq.${encodeURIComponent(email)}`, {
        method: 'PATCH',
        headers: { ...subHead, Prefer: 'return=minimal' },
        body: JSON.stringify(patch),
      });
      return res.status(200).json({ ok: true, event, email, applied: patch });
    } catch (e) {
      return res.status(500).json({ error: 'webhook_failed', detail: e.message });
    }
  }

  const auth = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  const admin = await validateAdmin(auth);
  if (!admin) return res.status(403).json({ error: 'Forbidden: admin access required' });

  // === POST: toggle pause flag ===
  if (req.method === 'POST') {
    const { action } = req.body || {};
    if (action === 'toggle_pause') {
      try {
        const cur = await readPauseFlag();
        await writePauseFlag(!cur);
        return res.status(200).json({ paused: !cur });
      } catch (e) { return res.status(500).json({ error: 'toggle_failed', detail: e.message }); }
    }
    return res.status(400).json({ error: 'unknown_action' });
  }

  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const { type, days, tag, event, offset, limit } = req.query;

  // === type=signups_today — quem cadastrou hoje + status do welcome email ===
  if (type === 'signups_today') {
    if (!SK_FOR_PAUSE) return res.status(500).json({ error: 'service_role_required' });
    try {
      const todayStr = new Date().toISOString().slice(0,10);
      const subHead = { apikey: SK_FOR_PAUSE, Authorization: `Bearer ${SK_FOR_PAUSE}` };
      // Profiles criados hoje
      const pr = await fetch(`${SUPABASE_URL}/rest/v1/profiles?created_at=gte.${todayStr}&select=id,email,full_name,first_name,created_at,email_verified&order=created_at.desc&limit=200`, { headers: subHead });
      const profiles = pr.ok ? await pr.json() : [];
      // Welcome/Confirm logs de hoje
      const lr = await fetch(`${SUPABASE_URL}/rest/v1/email_logs?created_at=gte.${todayStr}&campaign_name=in.(Welcome Email,Email Confirm,Email Confirm Resend)&select=campaign_name,recipients_emails,status,provider,created_at`, { headers: subHead });
      const logs = lr.ok ? await lr.json() : [];
      // Index emails que receberam welcome / confirm
      const welcomeSet = new Set(), confirmSet = new Set();
      logs.forEach(l => {
        const arr = Array.isArray(l.recipients_emails) ? l.recipients_emails : [];
        const isWelcome = l.campaign_name === 'Welcome Email';
        arr.forEach(e => (isWelcome ? welcomeSet : confirmSet).add(String(e).toLowerCase()));
      });
      const enriched = profiles.map(p => {
        const emailLc = (p.email||'').toLowerCase();
        return {
          id: p.id, email: p.email, name: p.first_name || p.full_name || '',
          created_at: p.created_at, email_verified: !!p.email_verified,
          welcome_sent: welcomeSet.has(emailLc),
          confirm_sent: confirmSet.has(emailLc),
        };
      });
      const summary = {
        total: profiles.length,
        verified: enriched.filter(e => e.email_verified).length,
        welcome_sent: enriched.filter(e => e.welcome_sent).length,
        confirm_sent: enriched.filter(e => e.confirm_sent).length,
      };
      return res.status(200).json({ summary, signups: enriched });
    } catch (e) { return res.status(500).json({ error: 'signups_today_failed', detail: e.message }); }
  }

  // === Onda 2: type=email_today — envios de hoje com drilldown ===
  if (type === 'email_today') {
    if (!SK_FOR_PAUSE) return res.status(500).json({ error: 'service_role_required' });
    try {
      const todayStr = new Date().toISOString().slice(0,10);
      const r = await fetch(
        `${SUPABASE_URL}/rest/v1/email_logs?created_at=gte.${todayStr}&select=id,campaign_name,subject,recipients,recipients_emails,status,sent_by,provider,brevo_response,created_at&order=created_at.desc&limit=200`,
        { headers: { apikey: SK_FOR_PAUSE, Authorization: `Bearer ${SK_FOR_PAUSE}` } }
      );
      const logs = r.ok ? await r.json() : [];
      // Stats sumarizados
      const totalSent = logs.reduce((s,l) => s + (l.recipients||0), 0);
      const bySource = {};
      const byProvider = { brevo:0, resend:0, sendgrid:0, auto:0 };
      logs.forEach(l => {
        const src = l.sent_by || 'unknown';
        bySource[src] = (bySource[src]||0) + (l.recipients||0);
        if (byProvider.hasOwnProperty(l.provider)) byProvider[l.provider] += (l.recipients||0);
      });
      return res.status(200).json({ total_today: totalSent, by_source: bySource, by_provider: byProvider, logs });
    } catch (e) { return res.status(500).json({ error: 'email_today_failed', detail: e.message }); }
  }

  // === Onda 2: type=campaigns_progress — progresso por campanha (received-X) ===
  if (type === 'campaigns_progress') {
    if (!SK_FOR_PAUSE) return res.status(500).json({ error: 'service_role_required' });
    try {
      const subHead = { apikey: SK_FOR_PAUSE, Authorization: `Bearer ${SK_FOR_PAUSE}` };
      // Pega todos os subscribers ativos com tags
      const allR = await fetch(`${SUPABASE_URL}/rest/v1/email_subscribers?status=eq.active&select=tags`, { headers: subHead });
      const all = allR.ok ? await allR.json() : [];
      const totalActive = all.length;
      // Conta received-X tags
      const received = {}; // {campaign_key: count}
      all.forEach(s => {
        if (Array.isArray(s.tags)) {
          s.tags.forEach(t => {
            const m = String(t).match(/^received-(.+)$/);
            if (m) received[m[1]] = (received[m[1]]||0) + 1;
          });
        }
      });
      // Pega last send timestamp per campaign do email_logs
      const logsR = await fetch(`${SUPABASE_URL}/rest/v1/email_logs?select=campaign_name,created_at,brevo_response&order=created_at.desc&limit=200`, { headers: subHead });
      const logs = logsR.ok ? await logsR.json() : [];
      const lastSend = {};
      logs.forEach(l => {
        const m = (l.campaign_name||'').match(/(?:\[Cron\]|\[Auto\]|\[Fila\]|\[Auto-Pausa\])\s*(.+?)(?:\s*\(.*)?$/);
        const campaignKey = m ? m[1].trim() : null;
        if (campaignKey && !lastSend[campaignKey]) lastSend[campaignKey] = l.created_at;
      });
      const campaigns = Object.entries(received).map(([key, count]) => ({
        campaign_key: key,
        received_count: count,
        pending_estimate: Math.max(0, totalActive - count),
        total_active: totalActive,
        last_send_at: lastSend[key] || null,
      })).sort((a,b) => b.received_count - a.received_count);
      return res.status(200).json({
        total_active_subscribers: totalActive,
        campaigns,
        next_cron_label: nextEmailRunLabel(),
      });
    } catch (e) { return res.status(500).json({ error: 'campaigns_progress_failed', detail: e.message }); }
  }

  // === Onda 3: type=health — saúde do envio (bounce rate, complaints, suppression) ===
  if (type === 'health') {
    if (!SK_FOR_PAUSE) return res.status(500).json({ error: 'service_role_required' });
    try {
      const subHead = { apikey: SK_FOR_PAUSE, Authorization: `Bearer ${SK_FOR_PAUSE}` };
      // Counts por status
      const statuses = ['active','bounced','complained','unsubscribed'];
      const counts = {};
      await Promise.all(statuses.map(async s => {
        const r = await fetch(`${SUPABASE_URL}/rest/v1/email_subscribers?status=eq.${s}&select=*`, {
          headers: { ...subHead, Prefer:'count=exact', Range:'0-0' },
        });
        const cr = r.headers.get('content-range') || '*/0';
        counts[s] = parseInt(cr.split('/')[1] || '0', 10);
      }));
      // Brevo aggregated últimos 7 dias pra rates
      let bounceRate = 0, complaintRate = 0, deliveredCount = 0;
      const BREVO_KEY = process.env.BREVO_API_KEY;
      if (BREVO_KEY) {
        try {
          const start = new Date(Date.now()-7*86400000).toISOString().slice(0,10);
          const end = new Date().toISOString().slice(0,10);
          const r = await fetch(`https://api.brevo.com/v3/smtp/statistics/aggregatedReport?startDate=${start}&endDate=${end}`,
            { headers: { 'accept':'application/json', 'api-key': BREVO_KEY } });
          if (r.ok) {
            const d = await r.json();
            const total = d.requests || d.delivered || 0;
            const bounces = (d.hardBounces||0) + (d.softBounces||0);
            const complaints = d.spamReports || 0;
            deliveredCount = d.delivered || 0;
            bounceRate = total > 0 ? (bounces / total * 100) : 0;
            complaintRate = total > 0 ? (complaints / total * 100) : 0;
          }
        } catch {}
      }
      // Auto-pause se bounce > 5% (Gmail caps em 0.3%, mas threshold de pânico = 5%)
      let autoPaused = false;
      if (bounceRate > 5 && deliveredCount > 50) {
        const cur = await readPauseFlag();
        if (!cur) {
          await writePauseFlag(true);
          autoPaused = true;
        }
      }
      return res.status(200).json({
        subscribers_by_status: counts,
        last_7d: { bounce_rate: +bounceRate.toFixed(2), complaint_rate: +complaintRate.toFixed(3), delivered: deliveredCount },
        thresholds: { bounce_warn: 2, bounce_critical: 5, complaint_warn: 0.1, complaint_critical: 0.3 },
        auto_paused_now: autoPaused,
      });
    } catch (e) { return res.status(500).json({ error: 'health_failed', detail: e.message }); }
  }

  // === GET type=email_status (admin email card) ===
  if (type === 'email_status') {
    try {
      const [paused, stats] = await Promise.all([readPauseFlag(), readEmailDailyStats()]);
      return res.status(200).json({
        paused,
        sent_today: stats.sent_today,
        daily_limit: 495, // Brevo bulk 295 (300-5 reserve) + Resend 100 + SendGrid 100
        brevo_reserve: 5, // welcome/confirm transacional usa esses 5
        breakdown: {
          brevo:    { sent: stats.sent_today_brevo,    limit: 295 }, // bulk budget (reserva já subtraída)
          resend:   { sent: stats.sent_today_resend,   limit: 100 },
          sendgrid: { sent: stats.sent_today_sendgrid, limit: 100 },
        },
        next_run_label: nextEmailRunLabel(),
        week_sent: stats.week_sent,
        week_failed: stats.week_failed,
      });
    } catch (e) { return res.status(500).json({ error: 'status_failed', detail: e.message }); }
  }

  // === Brevo stats (legado: type=events / type=report etc) ===
  const BREVO_KEY = process.env.BREVO_API_KEY;
  if (!BREVO_KEY) return res.status(500).json({ error: 'BREVO_API_KEY not configured' });
  const headers = { 'accept': 'application/json', 'api-key': BREVO_KEY };

  try {
    if (type === 'events') {
      // Transactional email events: delivered, opened, clicks, bounces, etc.
      const d = parseInt(days) || 28;
      const startDate = dateStr(d);
      const endDate = dateStr(0);
      const lim = Math.min(parseInt(limit) || 100, 500);
      const off = parseInt(offset) || 0;

      let url = `https://api.brevo.com/v3/smtp/statistics/events?limit=${lim}&offset=${off}&startDate=${startDate}&endDate=${endDate}&sort=desc`;
      if (tag) url += `&tags=${encodeURIComponent(tag)}`;
      if (event) url += `&event=${encodeURIComponent(event)}`;

      const resp = await fetch(url, { headers });
      if (!resp.ok) {
        const err = await resp.text();
        return res.status(resp.status).json({ error: 'Brevo API error', detail: err });
      }
      const data = await resp.json();
      return res.status(200).json(data);

    } else if (type === 'report') {
      // Aggregated report by date range
      const d = parseInt(days) || 28;
      const startDate = dateStr(d);
      const endDate = dateStr(0);

      let url = `https://api.brevo.com/v3/smtp/statistics/aggregatedReport?startDate=${startDate}&endDate=${endDate}`;
      if (tag) url += `&tag=${encodeURIComponent(tag)}`;

      const resp = await fetch(url, { headers });
      if (!resp.ok) {
        const err = await resp.text();
        return res.status(resp.status).json({ error: 'Brevo API error', detail: err });
      }
      const data = await resp.json();
      return res.status(200).json(data);

    } else if (type === 'daily') {
      // Daily breakdown for charts
      const d = parseInt(days) || 28;
      const startDate = dateStr(d);
      const endDate = dateStr(0);

      let url = `https://api.brevo.com/v3/smtp/statistics/reports?startDate=${startDate}&endDate=${endDate}`;
      if (tag) url += `&tag=${encodeURIComponent(tag)}`;

      const resp = await fetch(url, { headers });
      if (!resp.ok) {
        const err = await resp.text();
        return res.status(resp.status).json({ error: 'Brevo API error', detail: err });
      }
      const data = await resp.json();
      return res.status(200).json(data);

    } else {
      return res.status(400).json({ error: 'Invalid type. Use: events, report, daily' });
    }
  } catch (err) {
    return safeError(res, 500, 'Internal error', err);
  }
};
