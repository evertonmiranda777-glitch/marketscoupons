import { chromium } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: { width: 3400, height: 2000 },
  deviceScaleFactor: 1
});
const file = path.join(root, 'previews', 'admin-creatives-premium-mockup.html').split(path.sep).join('/');
await page.goto('file:///' + file);
await page.waitForTimeout(1500);
await page.screenshot({
  path: path.join(root, 'previews', 'admin-creatives-premium-preview.png'),
  fullPage: true
});
console.log('OK');
await browser.close();
