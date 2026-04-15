// Vercel Serverless — Google Gemini 2.0 Flash proxy pro chatbot do site
// POST /api/bot { system, messages, lang }
// Usa process.env.GEMINI_API_KEY (free tier: 15 RPM, 1M tokens/dia).

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

const LANG_NAMES = {
  pt: 'Portuguese (Brazil)',
  en: 'English',
  es: 'Spanish',
  it: 'Italian',
  fr: 'French',
  de: 'German',
  ar: 'Arabic',
};

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

  const KEY = process.env.GEMINI_API_KEY;
  if (!KEY) return res.status(503).json({ error: 'Bot temporarily unavailable' });

  const contentLength = parseInt(req.headers['content-length'] || '0', 10);
  if (contentLength > 32000) return res.status(413).json({ error: 'Payload too large' });

  const { system, messages, lang } = req.body || {};
  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'Missing messages' });
  }
  if (messages.length > 20) return res.status(400).json({ error: 'Too many messages (max 20)' });

  const langName = LANG_NAMES[lang] || LANG_NAMES.en;
  const systemText = String(system || '').slice(0, 4000)
    + `\n\nRespond in ${langName}. If the user writes in a different language, switch to theirs. Keep responses under 200 words.`;

  const contents = messages.slice(-20).map(m => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: String(m.content || '').slice(0, 2000) }],
  }));

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${KEY}`;
    const resp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemText }] },
        contents,
        generationConfig: { maxOutputTokens: 500, temperature: 0.7 },
      }),
    });
    const data = await resp.json();
    if (!resp.ok) {
      console.error('[bot] gemini error:', resp.status, data);
      return res.status(502).json({ error: 'Upstream error' });
    }
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    return res.status(200).json({ content: [{ text }] });
  } catch (e) {
    console.error('[bot] fetch error:', e.message);
    return res.status(500).json({ error: 'Bot error' });
  }
};
