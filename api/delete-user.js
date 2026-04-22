// Vercel Serverless — Delete a user (admin only)
// POST /api/delete-user { email, adminToken }
// Removes: auth.users (cascade to profiles), email_subscribers, loyalty_members
// Requires SUPABASE_SERVICE_ROLE_KEY + ADMIN_DELETE_TOKEN env vars.

const SUPABASE_URL = 'https://qfwhduvutfumsaxnuofa.supabase.co';

module.exports = async (req, res) => {
  const origin = req.headers.origin || '';
  const allowed = ['https://www.marketscoupons.com', 'https://marketscoupons.com', 'https://marketscoupons.vercel.app'];
  res.setHeader('Access-Control-Allow-Origin', allowed.includes(origin) ? origin : allowed[0]);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const ADMIN_TOKEN = process.env.ADMIN_DELETE_TOKEN;
  if (!SERVICE_KEY) return res.status(500).json({ error: 'SUPABASE_SERVICE_ROLE_KEY not configured' });
  if (!ADMIN_TOKEN) return res.status(500).json({ error: 'ADMIN_DELETE_TOKEN not configured' });

  const { email, adminToken } = req.body || {};
  if (!email) return res.status(400).json({ error: 'Missing email' });
  if (adminToken !== ADMIN_TOKEN) return res.status(401).json({ error: 'Unauthorized' });

  const H = { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, 'Content-Type': 'application/json' };

  try {
    // 1) Resolve auth user id by email (admin listUsers supports filter)
    const listResp = await fetch(`${SUPABASE_URL}/auth/v1/admin/users?email=${encodeURIComponent(email)}`, { headers: H });
    let userId = null;
    if (listResp.ok) {
      const data = await listResp.json();
      const users = data.users || (Array.isArray(data) ? data : []);
      const match = users.find(u => (u.email || '').toLowerCase() === email.toLowerCase());
      if (match) userId = match.id;
    }

    // 2) Delete auth user (cascades to profiles via FK)
    let authDeleted = false;
    if (userId) {
      const delResp = await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${userId}`, { method: 'DELETE', headers: H });
      authDeleted = delResp.ok;
    }

    // 3) Delete profile row (defensive — in case no FK cascade)
    await fetch(`${SUPABASE_URL}/rest/v1/profiles?email=eq.${encodeURIComponent(email)}`, { method: 'DELETE', headers: H });

    // 4) Delete email_subscribers
    await fetch(`${SUPABASE_URL}/rest/v1/email_subscribers?email=eq.${encodeURIComponent(email)}`, { method: 'DELETE', headers: H });

    // 5) Delete loyalty_members + loyalty_proofs
    await fetch(`${SUPABASE_URL}/rest/v1/loyalty_proofs?email=eq.${encodeURIComponent(email)}`, { method: 'DELETE', headers: H });
    await fetch(`${SUPABASE_URL}/rest/v1/loyalty_members?email=eq.${encodeURIComponent(email)}`, { method: 'DELETE', headers: H });

    // 6) Delete favorites (by user_id if we had it)
    if (userId) {
      await fetch(`${SUPABASE_URL}/rest/v1/favorites?user_id=eq.${userId}`, { method: 'DELETE', headers: H });
    }

    return res.status(200).json({ success: true, email, userId, authDeleted });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};
