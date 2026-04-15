// Render templates/criativo_*.html → img/<name>-creative.png (1080x1350)
// Run: node scripts/render-firms-png.js [firms|calendar|gamma|analysis|all]
import { chromium } from 'playwright';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

const TARGETS = {
  firms:    { html: 'criativo_firms.html',    png: 'firms-creative.png' },
  calendar: { html: 'criativo_calendar.html', png: 'calendar-creative.png' },
  gamma:    { html: 'criativo_gamma.html',    png: 'gamma-creative.png' },
  analysis: { html: 'criativo_analysis.html', png: 'analysis-creative.png' },
};

const arg = process.argv[2] || 'all';
const list = arg === 'all' ? Object.keys(TARGETS) : [arg];

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1080, height: 1350 }, deviceScaleFactor: 2 });
const page = await ctx.newPage();

for (const name of list) {
  const t = TARGETS[name];
  if (!t) { console.error('unknown target:', name); continue; }
  const htmlPath = path.join(root, 'templates', t.html);
  const outPath = path.join(root, 'img', t.png);
  await page.goto('file://' + htmlPath.replace(/\\/g, '/'), { waitUntil: 'networkidle' });
  await page.waitForTimeout(800);
  await page.screenshot({ path: outPath, clip: { x: 0, y: 0, width: 1080, height: 1350 }, type: 'png' });
  console.log('✅', outPath);
}

await browser.close();
