const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext();
  const page = await ctx.newPage();

  const consoleMsgs = [];
  const requests = [];
  const responses = [];

  page.on('console', msg => {
    consoleMsgs.push(`[${msg.type()}] ${msg.text()}`);
  });
  page.on('pageerror', err => consoleMsgs.push(`[pageerror] ${err.message}`));
  page.on('requestfailed', req => {
    if (req.url().includes('qfwhduvutfumsaxnuofa')) {
      consoleMsgs.push(`[reqfailed] ${req.url()} - ${req.failure()?.errorText}`);
    }
  });
  page.on('request', req => {
    const u = req.url();
    if (u.includes('qfwhduvutfumsaxnuofa')) requests.push(u);
  });
  page.on('response', async res => {
    const u = res.url();
    if (u.includes('qfwhduvutfumsaxnuofa')) {
      responses.push(`${res.status()} ${u}`);
    }
  });

  await page.goto('https://www.marketscoupons.com', { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForTimeout(3000);

  const heroSubText = await page.evaluate(() => {
    const el = document.querySelector('[data-i18n="hero_sub"]');
    return el ? el.textContent : 'NOT FOUND';
  });

  const i18nMem = await page.evaluate(() => {
    try {
      return typeof I18N !== 'undefined' ? I18N.pt?.hero_sub : 'I18N undefined';
    } catch (e) { return 'err: ' + e.message; }
  });

  const lsCache = await page.evaluate(() => {
    const v = localStorage.getItem('mc_i18n_cache');
    if (!v) return null;
    try {
      const parsed = JSON.parse(v);
      return {
        keys: Object.keys(parsed).slice(0, 5),
        hero_sub_pt: parsed.pt?.hero_sub || parsed?.hero_sub || 'not found',
        size: v.length
      };
    } catch { return { raw_len: v.length }; }
  });

  const cspHeader = await page.evaluate(async () => {
    const r = await fetch(location.href, { method: 'HEAD' });
    return r.headers.get('content-security-policy');
  });

  console.log('=== CONSOLE ===');
  consoleMsgs.forEach(m => console.log(m));
  console.log('\n=== SUPABASE REQUESTS ===');
  responses.forEach(r => console.log(r));
  console.log('\n=== heroSub textContent ===');
  console.log(JSON.stringify(heroSubText));
  console.log('\n=== I18N.pt.hero_sub (in-memory) ===');
  console.log(JSON.stringify(i18nMem));
  console.log('\n=== localStorage mc_i18n_cache ===');
  console.log(JSON.stringify(lsCache, null, 2));
  console.log('\n=== CSP header ===');
  console.log(cspHeader);

  await browser.close();
})();
