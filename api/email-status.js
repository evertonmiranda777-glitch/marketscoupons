// Vercel Serverless — Email auto-dispatch status + pause toggle
// GET  /api/email-status            → { paused, sent_today, daily_limit, next_run_label, week_sent, week_failed }
// POST /api/email-status {action:'toggle_pause'} → { paused: bool }
// Auth: admin JWT in Authorization header

const { applyCors } = require('./_cors.js');
const { rateLimitIp } = require('./_ratelimit.js');

const SUPABASE_URL = 'https://qfwhduvutfumsaxnuofa.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFmd2hkdXZ1dGZ1bXNheG51b2ZhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQzNzc5NDYsImV4cCI6MjA4OTk1Mzk0Nn0.efRel6U68misvPSRj8-p31-gOhzjXN4eIFMiloTNyk4';
const SK = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

async function validateAdmin(jwt) {
  if (!jwt || jwt.length < 50) return null;
  try {
    const u = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: { Authorization: `Bearer ${jwt}`, apikey: SUPABASE_KEY }
    });
    if (!u.ok) return null;
    const user = await u.json();
    if (!user?.id) return null;
    const p = await fetch(
      `${SUPABASE_URL}/rest/v1/profiles?id=eq.${user.id}&is_admin=eq.true&select=id`,
      { headers: { Authorization: `Bearer ${jwt}`, apikey: SUPABASE_KEY } }
    );
    if (!p.ok) return null;
    const rows = await p.json();
    return (rows && rows.length > 0) ? user : null;
  } catch { return null; }
}

async function readPauseFlag() {
  if (!SK) return false;
  try {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/site_settings?key=eq.email_auto_paused&select=value`, {
      headers: { apikey: SK, Authorization: `Bearer ${SK}` }
    });
    if (!r.ok) return false;
    const rows = await r.json();
    return rows[0]?.value === 'true';
  } catch { return false; }
}

async function writePauseFlag(value) {
  if (!SK) throw new Error('no service key');
  await fetch(`${SUPABASE_URL}/rest/v1/site_settings`, {
    method: 'POST',
    headers: {
      apikey: SK, Authorization: `Bearer ${SK}`,
      'Content-Type': 'application/json',
      Prefer: 'resolution=merge-duplicates'
    },
    body: JSON.stringify({ key: 'email_auto_paused', value: value ? 'true' : 'false', updated_at: new Date().toISOString() }),
  });
}

async function readDailyStats() {
  if (!SK) return { sent_today: 0, week_sent: 0, week_failed: 0 };
  const today = new Date().toISOString().slice(0, 10);
  const weekAgo = new Date(Date.now() - 7*86400000).toISOString().slice(0, 10);
  try {
    // Today: email_logs com tag/campaign 'cron' OR 'site-invite' contando recipients (only sent)
    const todayResp = await fetch(
      `${SUPABASE_URL}/rest/v1/email_logs?created_at=gte.${today}&select=brevo_response,recipients`,
      { headers: { apikey: SK, Authorization: `Bearer ${SK}` } }
    );
    const todayRows = todayResp.ok ? await todayResp.json() : [];
    let sent_today = 0;
    todayRows.forEach(r => {
      const sent = r.brevo_response?.sent;
      if (typeof sent === 'number') sent_today += sent;
    });
    // 7 dias
    const weekResp = await fetch(
      `${SUPABASE_URL}/rest/v1/email_logs?created_at=gte.${weekAgo}&select=brevo_response`,
      { headers: { apikey: SK, Authorization: `Bearer ${SK}` } }
    );
    const weekRows = weekResp.ok ? await weekResp.json() : [];
    let week_sent = 0, week_failed = 0;
    weekRows.forEach(r => {
      week_sent += (r.brevo_response?.sent || 0);
      week_failed += (r.brevo_response?.failed || 0);
    });
    return { sent_today, week_sent, week_failed };
  } catch { return { sent_today: 0, week_sent: 0, week_failed: 0 }; }
}

function nextRunLabel() {
  // Cron roda todo dia 11:00 UTC = 08:00 BRT
  const now = new Date();
  const next = new Date(now);
  next.setUTCHours(11, 0, 0, 0);
  if (next.getTime() <= now.getTime()) next.setUTCDate(next.getUTCDate() + 1);
  const diffMs = next.getTime() - now.getTime();
  const h = Math.floor(diffMs / 3600000);
  const m = Math.floor((diffMs % 3600000) / 60000);
  const today = new Date(); today.setUTCHours(11, 0, 0, 0);
  const isToday = today.getTime() === next.getTime();
  return `${isToday ? 'Hoje' : 'Amanhã'} 08:00 (em ${h}h ${m}min)`;
}

module.exports = async (req, res) => {
  if (applyCors(req, res, { methods: 'GET, POST, OPTIONS' })) return;
  if (!rateLimitIp(req, 60)) return res.status(429).json({ error: 'rate_limit' });

  const auth = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  const admin = await validateAdmin(auth);
  if (!admin) return res.status(403).json({ error: 'Forbidden: admin access required' });

  if (req.method === 'POST') {
    const { action } = req.body || {};
    if (action === 'toggle_pause') {
      try {
        const cur = await readPauseFlag();
        await writePauseFlag(!cur);
        return res.status(200).json({ paused: !cur });
      } catch (e) {
        return res.status(500).json({ error: 'toggle_failed', detail: e.message });
      }
    }
    return res.status(400).json({ error: 'unknown_action' });
  }

  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const [paused, stats] = await Promise.all([readPauseFlag(), readDailyStats()]);
    return res.status(200).json({
      paused,
      sent_today: stats.sent_today,
      daily_limit: 400,
      next_run_label: nextRunLabel(),
      week_sent: stats.week_sent,
      week_failed: stats.week_failed,
    });
  } catch (e) {
    return res.status(500).json({ error: 'status_failed', detail: e.message });
  }
};
