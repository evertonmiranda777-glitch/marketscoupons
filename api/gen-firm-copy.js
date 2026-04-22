// Vercel Serverless — Gera copy Instagram pra firma via Gemini 2.5 Flash
// POST /api/gen-firm-copy { firmId, lang? }
// Uso: admin Criativos tab

const SUPABASE_URL = 'https://qfwhduvutfumsaxnuofa.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFmd2hkdXZ1dGZ1bXNheG51b2ZhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQzNzc5NDYsImV4cCI6MjA4OTk1Mzk0Nn0.efRel6U68misvPSRj8-p31-gOhzjXN4eIFMiloTNyk4';

const LANG_NAMES = { pt: 'Portuguese (Brazil)', en: 'English', es: 'Spanish' };

function buildPrompt(firm, langName) {
  const prices = Array.isArray(firm.prices) ? firm.prices.slice(0, 4).map(p => `${p.a}: ${p.n}${p.o ? ` (was ${p.o})` : ''}`).join(' | ') : '';
  const perks = Array.isArray(firm.perks) ? firm.perks.slice(0, 5).join(', ') : '';
  const platforms = Array.isArray(firm.platforms) ? firm.platforms.join(', ') : '';
  const tp = firm.trustpilot_score ? `Trustpilot ${firm.trustpilot_score}/5 (${firm.trustpilot_reviews || '?'} reviews)` : '';
  const couponLine = firm.coupon ? `Coupon: ${firm.coupon} — ${firm.discount}% OFF${firm.discount_type ? ` (${firm.discount_type})` : ''}` : (firm.discount ? `${firm.discount}% OFF auto-applied via link` : '');

  return `You are a senior Instagram copywriter for Markets Coupons, a global prop firm coupon platform. Write a HIGH-CONVERSION Instagram caption in ${langName} for the firm below.

FIRM DATA (use only this, never invent):
- Name: ${firm.name} (${firm.short_name || firm.name})
- Type: ${firm.type || 'Prop firm'}
- ${couponLine}
- Profit split: ${firm.split || '—'}
- Drawdown: ${firm.drawdown || '—'} (${firm.dd_pct || ''})
- Target: ${firm.target || '—'}
- Scaling: ${firm.scaling || '—'}
- Min days: ${firm.min_days || '—'} | Eval days: ${firm.eval_days || 'unlimited'}
- Platforms: ${platforms}
- Prices: ${prices}
- Perks: ${perks}
- ${tp}
- Description: ${firm.description || ''}

STRUCTURE (exact, keep line breaks):
[HOOK] — 1 line, bold claim/question that stops scroll. Max 10 words. No emoji at start.
[BLANK LINE]
[BODY] — 3-4 short lines. Each line = 1 benefit anchored in REAL DATA (split %, drawdown, specific price, perk). Use line breaks, never one big paragraph. Lead with what trader gains, not features.
[BLANK LINE]
[COUPON CTA] — 1-2 lines. If coupon exists: "Use o cupom ${firm.coupon || 'X'}" + what they save. If no coupon: mention auto-applied discount via link.
[BLANK LINE]
[CTA] — 1 line. "Link na bio" / "Link in bio" / equivalent in language. Tell them to grab it.
[BLANK LINE]
[HASHTAGS] — 8-12 relevant hashtags (propfirm, trading, futures/forex, firm name, etc). Mix PT+EN hashtags if language is PT/ES.

VOICE:
- Sharp, direct, trader-to-trader. No corporate fluff.
- Use REAL numbers ($19.90, 90% split, -5% trail) — specifics convert.
- Short lines, aggressive line breaks (Instagram loves whitespace).
- 1-3 emojis TOTAL across whole caption, strategic (🔥 💰 ⚡ ✅). Not in hook.

COMPLIANCE (HARD BAN — these words get us sued):
- NEVER use: "signals", "entry", "stop loss", "take profit", "sinais", "entrada", "recomendação", "trader profissional", "operações ao vivo", "guaranteed profit", "lucro garantido".
- NEVER promise returns, profits, or trading results.
- NEVER mention AI, Gemini, Claude, or how this was generated.
- Focus on DEAL (discount, coupon, price) and FIRM FEATURES (split, rules, platforms), never trading advice.

Output ONLY the caption, no preamble, no markdown, no quotes. Ready to paste into Instagram.`;
}

const ALLOWED_ORIGINS = [
  'https://www.marketscoupons.com',
  'https://marketscoupons.com',
  'https://marketscoupons.vercel.app',
];
function getCorsOrigin(req) {
  const origin = req.headers.origin || '';
  return ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
}

module.exports = async (req, res) => {
  const corsOrigin = getCorsOrigin(req);
  res.setHeader('Access-Control-Allow-Origin', corsOrigin);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Vary', 'Origin');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const KEYS = (process.env.GEMINI_API_KEY || '').split(',').map(k => k.trim()).filter(Boolean);
  if (!KEYS.length) return res.status(503).json({ error: 'Copy generator unavailable' });

  const { firmId, lang } = req.body || {};
  if (!firmId || typeof firmId !== 'string') return res.status(400).json({ error: 'Missing firmId' });
  const langName = LANG_NAMES[lang] || LANG_NAMES.pt;

  // Buscar dados da firma no Supabase
  let firm;
  try {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/cms_firms?id=eq.${encodeURIComponent(firmId)}&select=*`, {
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
    });
    if (!r.ok) return res.status(502).json({ error: 'Firm fetch failed' });
    const arr = await r.json();
    firm = arr[0];
    if (!firm) return res.status(404).json({ error: 'Firm not found' });
  } catch (e) {
    return res.status(500).json({ error: 'Firm fetch error' });
  }

  const prompt = buildPrompt(firm, langName);
  const payload = JSON.stringify({
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: {
      maxOutputTokens: 4096,
      temperature: 0.9,
      thinkingConfig: { thinkingBudget: 0 },
    },
    safetySettings: [
      { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_ONLY_HIGH' },
      { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_ONLY_HIGH' },
      { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_ONLY_HIGH' },
      { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_ONLY_HIGH' },
    ],
  });

  if (typeof module.exports._keyIdx === 'undefined') module.exports._keyIdx = 0;
  const startIdx = module.exports._keyIdx % KEYS.length;
  module.exports._keyIdx++;

  const delays = [1000, 2000];
  const maxAttempts = Math.max(2, KEYS.length);
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const keyIdx = (startIdx + attempt) % KEYS.length;
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${KEYS[keyIdx]}`;
    try {
      const resp = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: payload,
      });
      const data = await resp.json();
      if (!resp.ok) {
        const errDetail = JSON.stringify(data).slice(0, 400);
        console.error(`[gen-firm-copy] gemini error (key ${keyIdx}):`, resp.status, errDetail);
        if (attempt < maxAttempts - 1) { await new Promise(r => setTimeout(r, delays[Math.min(attempt, delays.length - 1)])); continue; }
        return res.status(502).json({ error: 'Upstream error', status: resp.status, detail: errDetail });
      }
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
      if (!text) {
        if (attempt < maxAttempts - 1) { await new Promise(r => setTimeout(r, delays[Math.min(attempt, delays.length - 1)])); continue; }
        return res.status(502).json({ error: 'Empty response' });
      }
      return res.status(200).json({ copy: text.trim(), firmName: firm.name });
    } catch (e) {
      console.error(`[gen-firm-copy] fetch error:`, e.message);
      if (attempt < maxAttempts - 1) { await new Promise(r => setTimeout(r, delays[Math.min(attempt, delays.length - 1)])); continue; }
      return res.status(500).json({ error: 'Gen error' });
    }
  }
  return res.status(502).json({ error: 'Upstream error after retries' });
};
