// Render templates/criativo_firms.html → img/og/firms.png (1080x1350)
// Run: node scripts/render-firms-png.js
import { chromium } from 'playwright';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const htmlPath = path.join(root, 'templates', 'criativo_firms.html');
const outDir = path.join(root, 'img', 'og');
const outPath = path.join(outDir, 'firms.png');

if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1080, height: 1350 }, deviceScaleFactor: 2 });
const page = await ctx.newPage();
await page.goto('file://' + htmlPath.replace(/\\/g, '/'), { waitUntil: 'networkidle' });
await page.waitForTimeout(800); // fonts settle
await page.screenshot({ path: outPath, clip: { x: 0, y: 0, width: 1080, height: 1350 }, type: 'png' });
await browser.close();
console.log('✅ wrote', outPath);
