import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const root = path.join(path.dirname(__filename), '..');
const htmlPath = path.join(root, 'preview-guias-replan.html');
const outDir = path.join(root, 'img/guides-edu/html-render');
fs.mkdirSync(outDir, { recursive: true });

const slugify = (name) =>
  name
    .toLowerCase()
    .replace(/^g\d+\s*·\s*/i, '')
    .replace(/—.*$/, '')
    .replace(/\s*·\s*/g, '-')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

const browser = await chromium.launch();
const ctx = await browser.newContext({
  viewport: { width: 2400, height: 1200 },
  deviceScaleFactor: 2,
});
const page = await ctx.newPage();
await page.goto('file://' + htmlPath.replace(/\\/g, '/'));
await page.waitForLoadState('networkidle');

const slots = await page.$$('.slot');
console.log(`Found ${slots.length} slots`);

let count = 0;
for (const slot of slots) {
  const name = await slot.$eval('.slot-name', (el) => el.textContent.trim());
  const slug = slugify(name);
  const mockup = await slot.$('.mockup');
  if (!mockup) {
    console.log(`SKIP ${slug} (no .mockup)`);
    continue;
  }
  await page.waitForTimeout(100);
  const outPath = path.join(outDir, `${slug}.png`);
  await mockup.screenshot({ path: outPath, omitBackground: false });
  const size = fs.statSync(outPath).size;
  const box = await mockup.boundingBox();
  console.log(`[${++count}] ${slug}.png ${Math.round(size / 1024)}KB (${Math.round(box.width)}×${Math.round(box.height)})`);
}

await browser.close();
console.log(`\nDone. ${count} slots rendered to ${outDir}`);
