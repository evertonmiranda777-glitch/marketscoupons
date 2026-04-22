const { chromium } = require('playwright');
const path = require('path');

const targets = [
  { html: 'tradeday-platforms-mockup.html', out: 'tradeday-platforms-preview.png' },
  { html: 'tradeday-drawdown-mockup.html', out: 'tradeday-drawdown-preview.png' },
  { html: 'tradeday-hero-mockup.html', out: 'tradeday-hero-preview.png' },
  { html: 'tradeday-proscons-mockup.html', out: 'tradeday-proscons-preview.png' },
];

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 710 }, deviceScaleFactor: 2 });
  for (const t of targets) {
    const src = path.resolve('previews/' + t.html);
    try { require('fs').accessSync(src); } catch { continue; }
    const abs = src.split(path.sep).join('/');
    await page.goto('file:///' + abs);
    await page.waitForTimeout(600);
    const el = await page.$('.canvas');
    if (el) await el.screenshot({ path: 'previews/' + t.out });
    console.log('OK', t.out);
  }
  await browser.close();
})();
