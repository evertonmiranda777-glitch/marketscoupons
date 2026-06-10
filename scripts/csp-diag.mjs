import { chromium } from 'playwright';

const URL = 'https://www.marketscoupons.com/?_t=' + Date.now();

const consoleMsgs = [];
const pageErrors = [];
const cspViolations = [];
const requests = [];

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ ignoreHTTPSErrors: true });
const page = await ctx.newPage();

page.on('console', m => consoleMsgs.push(`[${m.type()}] ${m.text()}`));
page.on('pageerror', e => pageErrors.push(String(e)));
page.on('request', r => {
  const u = r.url();
  if (/gtag|googletagmanager|fbevents|connect\.facebook|og-lang|tracking-init|page-boot/i.test(u)) {
    requests.push(r.method() + ' ' + u);
  }
});
page.on('response', async (r) => {
  const u = r.url();
  if (/og-lang|tracking-init|page-boot/.test(u)) {
    requests.push('RESP ' + r.status() + ' ' + u);
  }
});

// Capture CSP violations via reportingobserver / securitypolicyviolation
await page.addInitScript(() => {
  document.addEventListener('securitypolicyviolation', (e) => {
    console.log('CSP_VIOLATION ' + JSON.stringify({
      directive: e.violatedDirective,
      blockedURI: e.blockedURI,
      sourceFile: e.sourceFile,
      lineNumber: e.lineNumber,
      sample: e.sample,
    }));
  });
});

await page.goto(URL, { waitUntil: 'networkidle', timeout: 60000 });

// Check JSON-LD
const jsonld = await page.evaluate(() => {
  const blocks = [...document.querySelectorAll('script[type="application/ld+json"]')];
  return blocks.map(b => ({
    len: b.textContent.length,
    parses: (() => { try { JSON.parse(b.textContent); return true; } catch(e){ return false; } })(),
    snippet: b.textContent.slice(0, 80)
  }));
});

// Check bot-fab img
const botFab = await page.evaluate(() => {
  const el = document.querySelector('.bot-fab img');
  return el ? { src: el.src, complete: el.complete, naturalWidth: el.naturalWidth } : null;
});

// Try cookies banner, force-hide
let cookieClicked = false;
try {
  await page.evaluate(() => {
    const b = document.getElementById('ck-banner');
    if (b) b.style.display = 'none';
    try { localStorage.setItem('mc-cookies-consent','accepted'); } catch(e){}
  });
  const btn = await page.$('button:has-text("Aceitar"), button:has-text("Accept")');
  if (btn) { try { await btn.click({ force:true, timeout:2000 }); cookieClicked = true; } catch(e){} }
  await page.waitForTimeout(3000);
} catch(e) {}

// Smoke 1: language switcher
let langResult = 'not_found';
try {
  // Try various selectors for BR/lang switcher
  const selectors = ['#langBtn', '.lang-btn', '[data-lang-btn]', 'button:has-text("BR")', '.nav-lang'];
  for (const s of selectors) {
    const el = await page.$(s);
    if (el) { await el.click(); langResult = 'clicked ' + s; await page.waitForTimeout(1500); break; }
  }
} catch(e) { langResult = 'err: '+e.message; }

// Smoke 2: firm card
let firmResult = 'not_found';
try {
  const card = await page.$('.firm-card, [data-firm], .fr-card');
  if (card) { await card.click(); firmResult = 'clicked'; await page.waitForTimeout(2000); }
} catch(e) { firmResult = 'err: '+e.message; }

// close drawer if open
try { await page.keyboard.press('Escape'); await page.waitForTimeout(500);} catch(e){}

// Smoke 3: chatbot
let botResult = 'not_found';
try {
  const fab = await page.$('.bot-fab');
  if (fab) { await fab.click(); botResult = 'clicked'; await page.waitForTimeout(1500); }
} catch(e) { botResult = 'err: '+e.message; }

await page.waitForTimeout(2000);

// Filter CSP-related console msgs
const cspLines = consoleMsgs.filter(m => /CSP_VIOLATION|Content Security Policy|Refused to/i.test(m));

console.log('=== CSP VIOLATIONS ===');
cspLines.forEach(l => console.log(l));
console.log('\n=== PAGE ERRORS ===');
pageErrors.forEach(e => console.log(e));
console.log('\n=== JSON-LD BLOCKS ===');
console.log(JSON.stringify(jsonld, null, 2));
console.log('\n=== TRACKING/JS REQUESTS ===');
requests.forEach(r => console.log(r));
console.log('\n=== BOT-FAB IMG ===');
console.log(JSON.stringify(botFab));
console.log('\n=== COOKIES ===');
console.log('clicked:', cookieClicked);
console.log('\n=== SMOKE TESTS ===');
console.log('lang:', langResult);
console.log('firm:', firmResult);
console.log('bot:', botResult);
console.log('\n=== ALL CONSOLE (last 50) ===');
consoleMsgs.slice(-50).forEach(l => console.log(l));

await browser.close();
