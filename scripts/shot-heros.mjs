import { chromium } from 'playwright';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const root = path.join(path.dirname(__filename), '..');

const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1440, height: 6000 } });
await p.goto('file:///' + path.join(root, 'preview-guias-replan.html').replace(/\\/g, '/'));
await p.waitForTimeout(800);

const slots = await p.locator('.hero-slot').all();
const names = ['g1-deal', 'g2-push', 'g3-neardeath', 'g4-bridge', 'g5-money'];
for (let i = 0; i < slots.length; i++) {
  const out = path.join(root, '.firecrawl', `nazmul-hero-${names[i]}.png`);
  await slots[i].locator('.hero-mockup').screenshot({ path: out });
  console.log('saved', out);
}
await b.close();
