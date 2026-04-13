// Vercel Serverless — Anthropic Claude proxy pro chatbot do site
// POST /api/bot { system, messages }
// Usa process.env.ANTHROPIC_API_KEY (não expor no browser).

const ALLOWED_ORIGINS = [
  'https://www.marketscoupons.com',
  'https://marketscoupons.com',
  'https://marketscoupons.vercel.app',
  'http://localhost:3000',
];

function getCorsOrigin(req) {
  const origin = req.headers.origin || '';
  return ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
}

// Rate limiter em memória (reinicia a cada cold start — basta pra frear abuse básico)
const _hits = new Map();
function rateLimit(ip) {
  const now = Date.now();
  const windowMs = 60_000;
  const max = 20;
  const arr = (_hits.get(ip) || []).filter(t => now - t < windowMs);
  arr.push(now);
  _hits.set(ip, arr);
  return arr.length <= max;
}

module.exports = async (req, res) => {
  const corsOrigin = getCorsOrigin(req);
  res.setHeader('Access-Control-Allow-Origin', corsOrigin);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Vary', 'Origin');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const ip = req.headers['x-forwarded-for']?.split(',')[0] || req.socket?.remoteAddress || 'unknown';
  if (!rateLimit(ip)) return res.status(429).json({ error: 'Rate limit: 20/min' });

  const KEY = process.env.ANTHROPIC_API_KEY;
  if (!KEY) return res.status(503).json({ error: 'Bot temporarily unavailable' });

  const contentLength = parseInt(req.headers['content-length'] || '0', 10);
  if (contentLength > 32000) return res.status(413).json({ error: 'Payload too large' });

  const { system, messages } = req.body || {};
  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'Missing messages' });
  }
  if (messages.length > 20) return res.status(400).json({ error: 'Too many messages (max 20)' });

  try {
    const resp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 400,
        system: String(system || '').slice(0, 4000),
        messages: messages.slice(-20).map(m => ({
          role: m.role === 'assistant' ? 'assistant' : 'user',
          content: String(m.content || '').slice(0, 2000),
        })),
      }),
    });
    const data = await resp.json();
    if (!resp.ok) {
      console.error('[bot] anthropic error:', resp.status, data);
      return res.status(502).json({ error: 'Upstream error' });
    }
    return res.status(200).json({ content: data.content });
  } catch (e) {
    console.error('[bot] fetch error:', e.message);
    return res.status(500).json({ error: 'Bot error' });
  }
};
