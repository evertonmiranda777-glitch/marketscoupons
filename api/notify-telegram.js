// Vercel Serverless — Envia mensagem pro Telegram (admin only).
// POST /api/notify-telegram { text, parseMode? }
// Auth: admin JWT (validateAdmin)

const { applyCors } = require('./_cors.js');
const { rateLimitIp } = require('./_ratelimit.js');
const { safeError } = require('./_safe-error.js');

const SUPABASE_URL = 'https://qfwhduvutfumsaxnuofa.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFmd2hkdXZ1dGZ1bXNheG51b2ZhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQzNzc5NDYsImV4cCI6MjA4OTk1Mzk0Nn0.efRel6U68misvPSRj8-p31-gOhzjXN4eIFMiloTNyk4';

async function validateAdmin(jwt) {
  if (!jwt || jwt.length < 50) return null;
  try {
    const r = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: { Authorization: `Bearer ${jwt}`, apikey: SUPABASE_KEY },
    });
    if (!r.ok) return null;
    const user = await r.json();
    if (!user?.id) return null;
    const p = await fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${user.id}&is_admin=eq.true&select=id`, {
      headers: { Authorization: `Bearer ${jwt}`, apikey: SUPABASE_KEY },
    });
    const rows = p.ok ? await p.json() : [];
    return rows.length ? user : null;
  } catch { return null; }
}

module.exports = async (req, res) => {
  if (applyCors(req, res, { methods: 'POST, OPTIONS' })) return;
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
  if (!rateLimitIp(req, 30)) return res.status(429).json({ error: 'rate_limit' });

  const jwt = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  const admin = await validateAdmin(jwt);
  if (!admin) return res.status(403).json({ error: 'admin only' });

  const { text, parseMode } = req.body || {};
  if (!text || typeof text !== 'string') return res.status(400).json({ error: 'text required' });
  if (text.length > 4000) return res.status(400).json({ error: 'text too long (max 4000)' });

  const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
  const CHAT = process.env.TELEGRAM_CHAT_ID;
  if (!TOKEN || !CHAT) return res.status(500).json({ error: 'telegram not configured' });

  try {
    const r = await fetch(`https://api.telegram.org/bot${TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: CHAT,
        text,
        parse_mode: parseMode || 'HTML',
        disable_web_page_preview: true,
      }),
    });
    if (!r.ok) {
      const err = await r.text();
      return res.status(502).json({ error: 'telegram api error', detail: err.slice(0, 200) });
    }
    return res.status(200).json({ success: true });
  } catch (e) {
    return safeError(res, 500, 'send failed', e);
  }
};
