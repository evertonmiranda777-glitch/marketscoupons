#!/usr/bin/env node
// Daily critical monitor for firms with exclusive MC coupons.
// Scrapes each firm homepage, verifies the user's coupon still appears,
// diffs vs last snapshot, and sends a 🚨 CRITICAL Telegram alert on any change.

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const CRITICAL = [
  { id: 'apex',    name: 'Apex Trader Funding',  url: 'https://apextraderfunding.com/', coupon: 'MARKET' },
  { id: 'bulenox', name: 'Bulenox',              url: 'https://bulenox.com/',           coupon: 'MARKET89' },
  { id: 'tpt',     name: 'Take Profit Trader',   url: 'https://takeprofittrader.com/',  coupon: 'MARKET40' },
];

const OUT_DIR = path.join(__dirname, '..', '.firecrawl', 'critical');
fs.mkdirSync(OUT_DIR, { recursive: true });

const today = new Date().toISOString().slice(0, 10);

function latestPrevious(id) {
  const files = fs.readdirSync(OUT_DIR)
    .filter(f => f.startsWith(`${id}-`) && f.endsWith('.md') && !f.startsWith(`${id}-${today}`))
    .sort();
  return files.length ? path.join(OUT_DIR, files[files.length - 1]) : null;
}

function scrape(id, url) {
  const out = path.join(OUT_DIR, `${id}-${today}.md`);
  console.log(`[${id}] scraping ${url}`);
  const r = spawnSync('firecrawl', ['scrape', url, '--only-main-content', '-o', out], {
    stdio: 'inherit', shell: true,
  });
  return r.status === 0 && fs.existsSync(out) ? out : null;
}

function diffLines(a, b) {
  if (!a) return { added: 0, removed: 0 };
  const sa = new Set(fs.readFileSync(a, 'utf8').split('\n').map(s => s.trim()).filter(Boolean));
  const sb = new Set(fs.readFileSync(b, 'utf8').split('\n').map(s => s.trim()).filter(Boolean));
  let added = 0, removed = 0;
  for (const l of sb) if (!sa.has(l)) added++;
  for (const l of sa) if (!sb.has(l)) removed++;
  return { added, removed };
}

function couponPresent(file, coupon) {
  const txt = fs.readFileSync(file, 'utf8').toUpperCase();
  return txt.includes(coupon.toUpperCase());
}

async function notifyTelegram(lines) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chat = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chat) { console.log('no telegram creds'); return; }
  const text = `🚨 *CRITICAL Firm Monitor ${today}*\n\n${lines.join('\n')}`;
  const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ chat_id: chat, text, parse_mode: 'Markdown' }),
  });
  console.log('telegram:', res.status);
}

(async () => {
  const alerts = [];
  const baselineOnly = [];
  for (const f of CRITICAL) {
    const prev = latestPrevious(f.id);
    const cur = scrape(f.id, f.url);
    if (!cur) { alerts.push(`❌ *${f.name}*: scrape failed`); continue; }

    const hasCoupon = couponPresent(cur, f.coupon);
    if (!hasCoupon) alerts.push(`⚠️ *${f.name}*: coupon \`${f.coupon}\` NOT found on homepage`);

    if (!prev) {
      baselineOnly.push(`${f.id}: baseline saved`);
      continue;
    }
    const d = diffLines(prev, cur);
    if (d.added + d.removed > 0) {
      alerts.push(`📝 *${f.name}*: +${d.added}/-${d.removed} lines changed`);
    }
  }

  const report = alerts.length ? alerts.join('\n') : 'all clear ✅';
  console.log('\n=== CRITICAL REPORT ===\n' + report);
  if (baselineOnly.length) console.log(baselineOnly.join('\n'));

  if (alerts.length) await notifyTelegram(alerts);
})();
