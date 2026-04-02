// Vercel Serverless — Bulk MX record validation
// POST /api/validate-mx
// Body: { domains: ["gmail.com", "hotmail.com", ...] }
// Returns: { results: { "gmail.com": true, "fakeemail.xyz": false, ... } }

const dns = require('dns');
const { promisify } = require('util');
const resolveMx = promisify(dns.resolveMx);

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
  } catch {
    return null;
  }
}

module.exports = async (req, res) => {
  const corsOrigin = getCorsOrigin(req);
  res.setHeader('Access-Control-Allow-Origin', corsOrigin);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Vary', 'Origin');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // Auth: validate JWT and verify admin role
  const auth = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  const admin = await validateAdmin(auth);
  if (!admin) return res.status(403).json({ error: 'Forbidden: admin access required' });

  const { domains } = req.body;
  if (!domains || !Array.isArray(domains)) {
    return res.status(400).json({ error: 'Missing domains array' });
  }

  // Limit to 200 domains per request
  const batch = domains.slice(0, 200);

  // Sanitize: only allow valid domain characters
  const domainRe = /^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  const results = {};

  await Promise.all(batch.map(async (domain) => {
    if (!domainRe.test(domain)) {
      results[domain] = false;
      return;
    }
    try {
      const records = await resolveMx(domain);
      results[domain] = records && records.length > 0;
    } catch {
      results[domain] = false;
    }
  }));

  return res.status(200).json({ results, checked: Object.keys(results).length });
};
