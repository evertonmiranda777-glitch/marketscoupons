// Pixel-perfect creative renderer via htmlcsstoimage.com API.
// Receives the fully-serialized #cr-canvas HTML + all admin <style> blocks,
// posts to HCTI, fetches the resulting PNG, returns binary to the browser.
// Supports backdrop-filter, background-clip:text, web fonts natively.
//
// AUTH: requires admin JWT (validates against profiles.is_admin in Supabase).
// HCTI is a paid API; without auth this endpoint could be abused to drain quota.

const { applyCors } = require('./_cors.js');
const { rateLimitIp } = require('./_ratelimit.js');
const { safeError } = require('./_safe-error.js');

const SUPABASE_URL = 'https://qfwhduvutfumsaxnuofa.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFmd2hkdXZ1dGZ1bXNheG51b2ZhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQzNzc5NDYsImV4cCI6MjA4OTk1Mzk0Nn0.efRel6U68misvPSRj8-p31-gOhzjXN4eIFMiloTNyk4';

async function validateAdmin(jwt) {
  if (!jwt || jwt.length < 50) return null;
  try {
    const r = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: { 'Authorization': `Bearer ${jwt}`, 'apikey': SUPABASE_KEY }
    });
    if (!r.ok) return null;
    const user = await r.json();
    if (!user?.id) return null;
    const p = await fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${user.id}&is_admin=eq.true&select=id`, {
      headers: { 'Authorization': `Bearer ${jwt}`, 'apikey': SUPABASE_KEY }
    });
    if (!p.ok) return null;
    const rows = await p.json();
    return (rows && rows.length > 0) ? user : null;
  } catch { return null; }
}

module.exports = async (req, res) => {
  if (applyCors(req, res, { methods: 'POST, OPTIONS' })) return;
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
  if (!rateLimitIp(req, 20)) return res.status(429).json({ error: 'rate_limit' });

  // Auth gate: admin JWT OU service_role (pra automacao chamar)
  const serviceAuth = req.headers['x-service-auth'] || '';
  const isService = serviceAuth && process.env.SUPABASE_SERVICE_ROLE_KEY && serviceAuth === process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!isService) {
    const jwt = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
    const admin = await validateAdmin(jwt);
    if (!admin) return res.status(403).json({ error: 'Forbidden: admin access required' });
  }

  try {
    const { html, styles, width, height, origin, url } = req.body || {};
    if (!width || !height) {
      return res.status(400).json({ error: 'missing width/height' });
    }
    if (!html && !url) {
      return res.status(400).json({ error: 'missing html OR url' });
    }

    const userId = process.env.HCTI_USER_ID;
    const apiKey = process.env.HCTI_API_KEY;
    if (!userId || !apiKey) {
      return res.status(500).json({ error: 'HCTI credentials not configured' });
    }

    const auth = Buffer.from(`${userId}:${apiKey}`).toString('base64');
    let hctiBody;

    if (url) {
      // Modo URL: HCTI carrega a pagina e screenshota
      hctiBody = {
        url,
        viewport_width: width,
        viewport_height: height,
        device_scale: 1,
        ms_delay: 1500,
        selector: '#cr-canvas',
      };
    } else {
      // Modo HTML legado (admin browser-side)
      const base = (origin || 'https://www.marketscoupons.com/').replace(/\/$/, '') + '/';
      const absolutize = (s) => (s || '')
        .replace(/url\((&quot;|['"]|)\s*(?!https?:|data:|\/\/|#)([^'"&)\s]+)\s*\1\)/g, (_m, q, p) => `url(${q}${base}${p.replace(/^\/+/, '')}${q})`)
        .replace(/(src|href)=(['"])(?!https?:|data:|\/\/|#|mailto:)([^'"]+)\2/g, (_m, attr, q, p) => `${attr}=${q}${base}${p.replace(/^\/+/, '')}${q}`);
      const absHtml = absolutize(html);
      const absStyles = absolutize(styles);
      const baseCss = `\n*{box-sizing:border-box}\nhtml,body{margin:0;padding:0;background:#060810;font-family:'Inter',sans-serif;}\nbody{width:${width}px;height:${height}px;overflow:hidden;}\n#cr-canvas{margin:0 !important;}\n`;
      hctiBody = {
        html: absHtml,
        css: baseCss + '\n' + (absStyles || ''),
        google_fonts: 'Inter:400,500,600,700,800,900',
        viewport_width: width,
        viewport_height: height,
        device_scale: 1,
        ms_delay: 600,
      };
    }

    const hctiResp = await fetch('https://hcti.io/v1/image', {
      method: 'POST',
      headers: { 'Authorization': `Basic ${auth}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(hctiBody),
    });

    if (!hctiResp.ok) {
      const errText = await hctiResp.text();
      console.error('[render-criativo] HCTI error', hctiResp.status, errText);
      return res.status(502).json({ error: `HCTI ${hctiResp.status}: ${errText.slice(0, 200)}` });
    }

    const { url } = await hctiResp.json();
    if (!url) return res.status(502).json({ error: 'HCTI returned no url' });

    const imgResp = await fetch(url);
    if (!imgResp.ok) {
      return res.status(502).json({ error: `image fetch ${imgResp.status}` });
    }
    const buf = Buffer.from(await imgResp.arrayBuffer());

    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).send(buf);
  } catch (e) {
    return safeError(res, 500, 'render failed', e);
  }
};
