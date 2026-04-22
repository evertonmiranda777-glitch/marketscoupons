// Pixel-perfect creative renderer via headless Chromium on Vercel serverless.
// Receives the fully-serialized #cr-canvas HTML + all admin <style> blocks
// from the browser, renders it in a real Chrome instance (supports
// backdrop-filter, background-clip:text, filters, transforms, web fonts),
// returns PNG binary.
const chromium = require('@sparticuz/chromium-min');
const puppeteer = require('puppeteer-core');

const CHROMIUM_PACK = 'https://github.com/Sparticuz/chromium/releases/download/v123.0.1/chromium-v123.0.1-pack.tar';

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'POST only' });
  }
  let browser;
  try {
    const { html, styles, width, height, origin } = req.body || {};
    if (!html || !width || !height) {
      return res.status(400).json({ error: 'missing html/width/height' });
    }

    const baseHref = origin || 'https://www.marketscoupons.com/';

    const doc = `<!doctype html>
<html><head>
<meta charset="utf-8">
<base href="${baseHref}">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
<style>
*{box-sizing:border-box}
html,body{margin:0;padding:0;background:#060810;font-family:'Inter',sans-serif;}
body{width:${width}px;height:${height}px;overflow:hidden;display:flex;align-items:flex-start;justify-content:flex-start;}
#render-root{width:${width}px;height:${height}px;position:relative;}
${styles || ''}
</style>
</head><body>
<div id="render-root">${html}</div>
</body></html>`;

    if (typeof chromium.setHeadlessMode !== 'undefined') chromium.setHeadlessMode = true;
    if (typeof chromium.setGraphicsMode !== 'undefined') chromium.setGraphicsMode = false;

    browser = await puppeteer.launch({
      args: [...chromium.args, '--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--single-process'],
      defaultViewport: { width, height, deviceScaleFactor: 1 },
      executablePath: await chromium.executablePath(CHROMIUM_PACK),
      headless: 'new',
    });

    const page = await browser.newPage();
    await page.setViewport({ width, height, deviceScaleFactor: 1 });
    await page.setContent(doc, { waitUntil: 'networkidle0', timeout: 45000 });
    // Give web fonts + any remote images a beat to paint.
    await page.evaluateHandle('document.fonts.ready');
    await new Promise(r => setTimeout(r, 400));

    const buf = await page.screenshot({
      type: 'png',
      clip: { x: 0, y: 0, width, height },
      omitBackground: false,
    });

    await browser.close();
    browser = null;

    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).send(buf);
  } catch (e) {
    if (browser) { try { await browser.close(); } catch {} }
    console.error('[render-criativo]', e);
    return res.status(500).json({ error: e.message || 'render failed' });
  }
};
