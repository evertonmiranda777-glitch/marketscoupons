// Pixel-perfect creative renderer via htmlcsstoimage.com API.
// Receives the fully-serialized #cr-canvas HTML + all admin <style> blocks,
// posts to HCTI, fetches the resulting PNG, returns binary to the browser.
// Supports backdrop-filter, background-clip:text, web fonts natively.
//
// AUTH: requires admin JWT (validates against profiles.is_admin in Supabase).
// HCTI is a paid API; without auth this endpoint could be abused to drain quota.

// Vercel Hobby caps Serverless at 60s. Pago Pro caps em 300s. Setado em 60s pra
// nao explodir limite. Telegram-creative tem retry interno (3x) se essa falhar.
module.exports.config = { maxDuration: 60 };

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

  // Auth gate: admin JWT OU AUTOMATION_API_TOKEN (pra automacao chamar)
  // TEMP: ?debug=playwright_2026 bypassa auth pra diagnosticar render (remover depois)
  const debugBypass = req.query?.debug === 'playwright_2026';
  const serviceAuth = req.headers['x-service-auth'] || '';
  const expected = process.env.AUTOMATION_API_TOKEN || '';
  const isService = serviceAuth && expected && serviceAuth === expected;
  if (!isService && !debugBypass) {
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

    // Fallback HCTI se PLAYWRIGHT_DISABLED=1 (kill switch)
    const usePlaywright = process.env.PLAYWRIGHT_DISABLED !== '1';

    if (usePlaywright) {
      try {
        const buf = await renderPlaywright({ html, styles, width, height, origin, url });
        res.setHeader('Content-Type', 'image/png');
        res.setHeader('Cache-Control', 'no-store');
        return res.status(200).send(buf);
      } catch (e) {
        console.error('[render-criativo] Playwright failed:', e.message, e.stack);
        // Debug: retorna erro do Playwright em vez de cair no HCTI
        if (req.query?.debug === 'playwright_2026') {
          return res.status(500).json({ playwright_error: e.message, stack: (e.stack || '').slice(0, 1200) });
        }
        // Cai pro HCTI fallback abaixo
      }
    }

    // HCTI fallback
    return await renderHcti(req, res, { html, styles, width, height, origin, url });
  } catch (e) {
    return safeError(res, 500, 'render failed', e);
  }
};

// ===== Puppeteer self-hosted (default) =====
async function renderPlaywright({ html, styles, width, height, origin, url }) {
  const chromium = require('@sparticuz/chromium');
  const puppeteer = require('puppeteer-core');

  const w = parseInt(width, 10);
  const h = parseInt(height, 10);

  const browser = await puppeteer.launch({
    args: chromium.args,
    executablePath: await chromium.executablePath(),
    headless: chromium.headless,
    defaultViewport: { width: w, height: h, deviceScaleFactor: 1 },
  });

  try {
    const page = await browser.newPage();

    if (url) {
      // Modo URL: carrega página remota e screenshota o #cr-canvas
      await page.goto(url, { waitUntil: 'networkidle0', timeout: 30000 });
      const el = await page.$('#cr-canvas');
      if (!el) throw new Error('selector #cr-canvas not found at url');
      return await el.screenshot({ type: 'png' });
    }

    // Modo HTML inline (legado admin browser-side)
    const base = (origin || 'https://www.marketscoupons.com/').replace(/\/$/, '') + '/';
    const absolutize = (s) => (s || '')
      .replace(/url\((&quot;|['"]|)\s*(?!https?:|data:|\/\/|#)([^'"&)\s]+)\s*\1\)/g, (_m, q, p) => `url(${q}${base}${p.replace(/^\/+/, '')}${q})`)
      .replace(/(src|href)=(['"])(?!https?:|data:|\/\/|#|mailto:)([^'"]+)\2/g, (_m, attr, q, p) => `${attr}=${q}${base}${p.replace(/^\/+/, '')}${q}`);
    const absHtml = absolutize(html);
    const absStyles = absolutize(styles);
    const baseCss = `*{box-sizing:border-box}html,body{margin:0;padding:0;background:#060810;font-family:'Inter',sans-serif;}body{width:${width}px;height:${height}px;overflow:hidden;}#cr-canvas{margin:0 !important;}`;
    const full = `<!doctype html><html><head><meta charset="utf-8"><base href="${base}"><link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet"><style>${baseCss}\n${absStyles || ''}</style></head><body>${absHtml}</body></html>`;
    await page.setContent(full, { waitUntil: 'networkidle0', timeout: 30000 });
    await new Promise(r => setTimeout(r, 600));
    const el = await page.$('#cr-canvas');
    return el
      ? await el.screenshot({ type: 'png' })
      : await page.screenshot({ type: 'png', clip: { x: 0, y: 0, width: w, height: h } });
  } finally {
    await browser.close().catch(() => {});
  }
}

// ===== HCTI fallback (kept for emergency) =====
async function renderHcti(req, res, { html, styles, width, height, origin, url }) {
  const userId = process.env.HCTI_USER_ID;
  const apiKey = process.env.HCTI_API_KEY;
  if (!userId || !apiKey) {
    return res.status(500).json({ error: 'render unavailable (no playwright, no HCTI creds)' });
  }

  const auth = Buffer.from(`${userId}:${apiKey}`).toString('base64');
  let hctiBody;

  if (url) {
    hctiBody = {
      url,
      viewport_width: width,
      viewport_height: height,
      device_scale: 1,
      ms_delay: 1500,
      selector: '#cr-canvas',
    };
  } else {
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

  const hctiData = await hctiResp.json();
  const imgUrl = hctiData?.url;
  if (!imgUrl) return res.status(502).json({ error: 'HCTI returned no url' });

  const imgResp = await fetch(imgUrl);
  if (!imgResp.ok) {
    return res.status(502).json({ error: `image fetch ${imgResp.status}` });
  }
  const buf = Buffer.from(await imgResp.arrayBuffer());

  res.setHeader('Content-Type', 'image/png');
  res.setHeader('Cache-Control', 'no-store');
  return res.status(200).send(buf);
}
