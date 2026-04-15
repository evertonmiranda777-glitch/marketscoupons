import { chromium } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1080, height: 1350 }, deviceScaleFactor: 1 });
const page = await ctx.newPage();
await page.goto('file://' + path.join(root, 'templates/criativo_gamma.html').replace(/\\/g, '/'), { waitUntil: 'networkidle' });
await page.waitForTimeout(500);

const m = await page.evaluate(() => {
  const r = (sel) => {
    const el = document.querySelector(sel);
    if (!el) return null;
    const b = el.getBoundingClientRect();
    return { top: Math.round(b.top), bottom: Math.round(b.bottom), h: Math.round(b.height) };
  };
  return {
    body: { scrollH: document.body.scrollHeight, clientH: document.body.clientHeight, offsetH: document.body.offsetHeight },
    wrap: r('.wrap'),
    logobar: r('.logobar'),
    bodyDiv: r('.body'),
    h1: r('.body h1'),
    sub: r('.sub'),
    meta: r('.meta'),
    ahdr1: r('.body > .ahdr:nth-of-type(1)'),
    lvrow1: r('.body > .lvrow:nth-of-type(1)'),
    gex: r('.gex'),
    nqdiv: r('.nqdiv'),
    ahdr2: r('.body > .ahdr:nth-of-type(2)'),
    lvrow2: r('.body > .lvrow:nth-of-type(2)'),
    cta: r('.cta'),
    chartSvg: r('.gex-inner svg'),
  };
});
console.log(JSON.stringify(m, null, 2));
await browser.close();
