import { chromium } from 'playwright';
import path from 'path';
const tpl = 'file:///' + path.resolve('templates/criativo_flash_promo.html').split(path.sep).join('/');
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1080, height: 1350 } });
await page.goto(tpl);
await page.screenshot({ path: 'img/flash-promo-test.png', clip: { x:0, y:0, width:1080, height:1350 } });
await browser.close();
console.log('done');
