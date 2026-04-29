// Vercel Serverless Function — Proxy for Brevo statistics API
// GET /api/brevo-stats?type=events|report&days=7&tag=promo-apex&offset=0&limit=50
// Requires admin JWT in Authorization header

const { applyCors } = require('./_cors.js');
const { rateLimitIp } = require('./_ratelimit.js');
const { safeError } = require('./_safe-error.js');

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
  if (!SK_FOR_PAUSE) return { sent_today:0, week_sent:0, week_failed:0 };
  const today = new Date().toISOString().slice(0,10);
  const weekAgo = new Date(Date.now()-7*86400000).toISOString().slice(0,10);
  try {
    const t = await fetch(`${SUPABASE_URL}/rest/v1/email_logs?created_at=gte.${today}&select=brevo_response`,
      { headers: { apikey: SK_FOR_PAUSE, Authorization: `Bearer ${SK_FOR_PAUSE}` } });
    const tRows = t.ok ? await t.json() : [];
    let sent_today = 0; tRows.forEach(r => { sent_today += (r.brevo_response?.sent || 0); });
    const w = await fetch(`${SUPABASE_URL}/rest/v1/email_logs?created_at=gte.${weekAgo}&select=brevo_response`,
      { headers: { apikey: SK_FOR_PAUSE, Authorization: `Bearer ${SK_FOR_PAUSE}` } });
    const wRows = w.ok ? await w.json() : [];
    let week_sent=0, week_failed=0;
    wRows.forEach(r => { week_sent += (r.brevo_response?.sent || 0); week_failed += (r.brevo_response?.failed || 0); });
    return { sent_today, week_sent, week_failed };
  } catch { return { sent_today:0, week_sent:0, week_failed:0 }; }
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

  // === GET type=email_status (admin email card) ===
  if (type === 'email_status') {
    try {
      const [paused, stats] = await Promise.all([readPauseFlag(), readEmailDailyStats()]);
      return res.status(200).json({ paused, sent_today: stats.sent_today, daily_limit: 400, next_run_label: nextEmailRunLabel(), week_sent: stats.week_sent, week_failed: stats.week_failed });
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
