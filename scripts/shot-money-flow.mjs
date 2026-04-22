import { chromium } from 'playwright';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.join(__dirname, '..');

const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
await p.goto('file:///' + path.join(root, 'preview-guias-replan.html').replace(/\\/g, '/'));
await p.waitForTimeout(800);

const slots = await p.locator('.slot').all();
let idx = 0;
for (const s of slots) {
  const name = await s.locator('.slot-name').textContent();
  if (name && name.includes('Money Flow')) {
    await s.locator('.mockup').screenshot({ path: path.join(root, '.firecrawl', 'money-flow-v2.png') });
    console.log('saved money-flow-v2.png · slot index', idx, '·', name.trim());
    break;
  }
  idx++;
}
await b.close();
