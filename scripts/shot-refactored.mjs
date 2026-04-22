import { chromium } from 'playwright';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const root = path.join(path.dirname(__filename), '..');

const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1440, height: 6000 } });
await p.goto('file:///' + path.join(root, 'preview-guias-replan.html').replace(/\\/g, '/'));
await p.waitForTimeout(800);

const targets = [
  'Models Matrix', 'DD Types by Firm', 'Firms Payout Matrix', 'The Formula', 'Scale (Apex real)',
  'Rules Dashboard', 'DD Floor', 'First Payout Timeline', 'Methods w/ Real Fees',
  'Contracts per Size', '3 Traders', 'Rhythm of Income', 'Global Map', 'Compound Effect', 'Money Flow',
  'Slow vs Fast', 'Pass Rate', 'Math of Target', 'Trailing vs Static', 'Recovery Math'
];
const slots = await p.locator('.slot').all();
for (const s of slots) {
  const name = (await s.locator('.slot-name').textContent()) || '';
  for (const t of targets) {
    if (name.includes(t)) {
      const out = path.join(root, '.firecrawl', `nazmul-${t.toLowerCase().replace(/[^a-z0-9]+/g,'-')}.png`);
      await s.locator('.mockup').screenshot({ path: out });
      console.log('saved', out);
    }
  }
}
await b.close();
