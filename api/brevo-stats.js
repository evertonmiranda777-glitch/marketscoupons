// Vercel Serverless Function — Proxy for Brevo statistics API
// GET /api/brevo-stats?type=events|report&days=7&tag=promo-apex&offset=0&limit=50
// Requires admin JWT in Authorization header

const SUPABASE_URL = 'https://qfwhduvutfumsaxnuofa.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFmd2hkdXZ1dGZ1bXNheG51b2ZhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQzNzc5NDYsImV4cCI6MjA4OTk1Mzk0Nn0.efRel6U68misvPSRj8-p31-gOhzjXN4eIFMiloTNyk4';

const ALLOWED_ORIGINS = [
  'https://www.marketscoupons.com',
  'https://marketscoupons.com',
  'https://marketscoupons.vercel.app',
];

function getCorsOrigin(req) {
  const origin = req.headers.origin || '';
  return ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
}

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

module.exports = async (req, res) => {
  const corsOrigin = getCorsOrigin(req);
  res.setHeader('Access-Control-Allow-Origin', corsOrigin);
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Vary', 'Origin');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const BREVO_KEY = process.env.BREVO_API_KEY;
  if (!BREVO_KEY) return res.status(500).json({ error: 'BREVO_API_KEY not configured' });

  const auth = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  const admin = await validateAdmin(auth);
  if (!admin) return res.status(403).json({ error: 'Forbidden: admin access required' });

  const { type, days, tag, event, offset, limit } = req.query;
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
    return res.status(500).json({ error: 'Internal error', detail: err.message });
  }
};
