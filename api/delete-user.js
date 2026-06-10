// Vercel Serverless, Delete a user (3 modos auth)
// MODES (autenticacao via Authorization header OU body):
//   1) Self-delete:   Authorization: Bearer <user-jwt>          , apaga a propria conta
//   2) Admin via JWT: Authorization: Bearer <admin-jwt> + body{email}
//                     valida profile.is_admin=true → apaga qualquer user
//   3) Admin via env (legacy): body{email, adminToken} === ADMIN_DELETE_TOKEN
// Removes: auth.users (cascade profiles), email_subscribers, loyalty_*, favorites

const { applyCors } = require('./_cors.js');
const { rateLimitIp } = require('./_ratelimit.js');
const { safeError } = require('./_safe-error.js');

const SUPABASE_URL = 'https://qfwhduvutfumsaxnuofa.supabase.co';

module.exports = async (req, res) => {
  if (applyCors(req, res, { methods: 'POST, OPTIONS' })) return;
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!rateLimitIp(req, 10)) return res.status(429).json({ error: 'rate_limit' });

  const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const ADMIN_TOKEN = process.env.ADMIN_DELETE_TOKEN;
  if (!SERVICE_KEY) return res.status(500).json({ error: 'SUPABASE_SERVICE_ROLE_KEY not configured' });

  const H = { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, 'Content-Type': 'application/json' };

  let { email, adminToken } = req.body || {};
  let targetUserId = null;
  let mode = null;

  const authHdr = req.headers.authorization || req.headers.Authorization || '';
  const callerJwt = authHdr.startsWith('Bearer ') ? authHdr.slice(7) : null;

  // Path 1+2: caller JWT presente, validar e checar se é admin (se quer apagar outro)
  if (callerJwt) {
    let caller;
    try {
      const meResp = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
        headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${callerJwt}` }
      });
      if (!meResp.ok) return res.status(401).json({ error: 'Invalid user token' });
      caller = await meResp.json();
      if (!caller?.id) return res.status(401).json({ error: 'Invalid user token' });
    } catch (e) {
      return res.status(401).json({ error: 'Token validation failed' });
    }

    if (!email || email.toLowerCase() === (caller.email || '').toLowerCase()) {
      // Self-delete
      targetUserId = caller.id;
      email = caller.email;
      mode = 'self';
    } else {
      // Admin-via-JWT, valida is_admin no profile do caller
      const profResp = await fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${caller.id}&select=is_admin`, { headers: H });
      const profs = profResp.ok ? await profResp.json() : [];
      if (!profs[0]?.is_admin) return res.status(403).json({ error: 'Not an admin' });
      mode = 'admin-jwt';
    }
  } else if (adminToken) {
    // Path 3: legacy admin token
    if (!ADMIN_TOKEN) return res.status(500).json({ error: 'ADMIN_DELETE_TOKEN not configured' });
    if (adminToken !== ADMIN_TOKEN) return res.status(401).json({ error: 'Unauthorized' });
    if (!email) return res.status(400).json({ error: 'Missing email' });
    mode = 'admin-token';
  } else {
    return res.status(401).json({ error: 'Missing Authorization header or adminToken' });
  }

  try {
    // Resolve user_id se ainda nao temos (modes admin-jwt e admin-token)
    if (!targetUserId) {
      const listResp = await fetch(`${SUPABASE_URL}/auth/v1/admin/users?email=${encodeURIComponent(email)}`, { headers: H });
      if (listResp.ok) {
        const data = await listResp.json();
        const users = data.users || (Array.isArray(data) ? data : []);
        const match = users.find(u => (u.email || '').toLowerCase() === email.toLowerCase());
        if (match) targetUserId = match.id;
      }
    }

    let authDeleted = false;
    if (targetUserId) {
      const delResp = await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${targetUserId}`, { method: 'DELETE', headers: H });
      authDeleted = delResp.ok;
    }

    // Cleanup defensivo nas outras tabelas (FK cascade pode nao cobrir tudo)
    if (email) {
      await fetch(`${SUPABASE_URL}/rest/v1/profiles?email=eq.${encodeURIComponent(email)}`, { method: 'DELETE', headers: H });
      await fetch(`${SUPABASE_URL}/rest/v1/email_subscribers?email=eq.${encodeURIComponent(email)}`, { method: 'DELETE', headers: H });
      await fetch(`${SUPABASE_URL}/rest/v1/loyalty_proofs?email=eq.${encodeURIComponent(email)}`, { method: 'DELETE', headers: H });
      await fetch(`${SUPABASE_URL}/rest/v1/loyalty_members?email=eq.${encodeURIComponent(email)}`, { method: 'DELETE', headers: H });
    }
    if (targetUserId) {
      await fetch(`${SUPABASE_URL}/rest/v1/favorites?user_id=eq.${targetUserId}`, { method: 'DELETE', headers: H });
    }

    // Audit log estruturado pra Vercel logs (filtrável)
    console.log(JSON.stringify({
      type: 'delete_user_audit',
      mode, email, target_user_id: targetUserId, auth_deleted: authDeleted,
      caller_ip: req.headers['x-forwarded-for'] || req.headers['x-real-ip'] || 'unknown',
      ts: new Date().toISOString(),
    }));
    return res.status(200).json({ success: true, email, userId: targetUserId, authDeleted, mode });
  } catch (err) {
    return safeError(res, 500, 'Internal error', err);
  }
};
