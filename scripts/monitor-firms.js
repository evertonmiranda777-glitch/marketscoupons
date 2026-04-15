#!/usr/bin/env node
// Weekly firm monitor: scrape each firm homepage via firecrawl, save markdown,
// diff against previous snapshot, post Telegram alert on changes.

const fs = require('fs');
const path = require('path');
const { execSync, spawnSync } = require('child_process');

// coupon = null: firma nao expoe codigo publico na homepage (referral embutido no link)
const FIRMS = [
  { id: 'apex',         url: 'https://apextraderfunding.com/',    coupon: 'MARKET',         aff: 'https://apextraderfunding.com/member/aff/go/evertonmiranda' },
  { id: 'bulenox',      url: 'https://bulenox.com/',              coupon: 'MARKET89',       aff: 'https://bulenox.com/member/aff/go/marketcoupons' },
  { id: 'ftmo',         url: 'https://ftmo.com/en/',              coupon: null,             aff: 'https://trader.ftmo.com/?affiliates=eyfIptUCGgfcfaUlyrRP' },
  { id: 'tpt',          url: 'https://takeprofittrader.com/',     coupon: 'MARKET40',       aff: 'https://takeprofittrader.com/?referralCode=MARKET40' },
  { id: 'fn',           url: 'https://fundednext.com/',           coupon: 'FNF30',          aff: 'https://fundednext.com/?fpr=everton33' },
  { id: 'e2t',          url: 'https://www.earn2trade.com/',       coupon: 'MARKETSCOUPONS', aff: 'https://www.earn2trade.com/purchase?plan=TCP25&a_pid=marketscoupons&a_bid=2e8e8a14' },
  { id: 'the5ers',      url: 'https://www.the5ers.com/',          coupon: null,             aff: 'https://www.the5ers.com/?afmc=19jp' },
  { id: 'fundingpips',  url: 'https://fundingpips.com/',          coupon: null,             aff: 'https://app.fundingpips.com/register?ref=31985EAA' },
  { id: 'brightfunded', url: 'https://brightfunded.com/',         coupon: null,             aff: 'https://brightfunded.com/a/CLNLTPxtT4Sok0PzHaRIIQ' },
  { id: 'e8',           url: 'https://e8markets.com/',            coupon: 'MARKET',         aff: 'https://e8markets.com/d/MARKET' },
  { id: 'cti',          url: 'https://cityTradersimperium.com/',  coupon: 'APR30',          aff: 'https://app.citytradersimperium.com/user-auth/register?referral_code=1331c5&utm_source=client&utm_medium=referral&utm_id=1331c5' },
];

const OUT_DIR = path.join(__dirname, '..', '.firecrawl', 'firms');
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
  if (r.status !== 0 || !fs.existsSync(out)) {
    console.error(`[${id}] scrape failed`);
    return null;
  }
  return out;
}

function diffLines(a, b) {
  if (!a) return { added: 0, removed: 0, summary: 'initial baseline' };
  const sa = new Set(fs.readFileSync(a, 'utf8').split('\n').map(s => s.trim()).filter(Boolean));
  const sb = new Set(fs.readFileSync(b, 'utf8').split('\n').map(s => s.trim()).filter(Boolean));
  let added = 0, removed = 0;
  const addedLines = [];
  for (const l of sb) if (!sa.has(l)) { added++; if (addedLines.length < 8) addedLines.push(l); }
  for (const l of sa) if (!sb.has(l)) removed++;
  return { added, removed, summary: addedLines.join('\n').slice(0, 400) };
}

async function notifyTelegram(report) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chat = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chat) { console.log('no telegram creds, skipping alert'); return; }
  const text = `*Firm Monitor ${today}*\n\n${report}`;
  const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ chat_id: chat, text, parse_mode: 'Markdown' }),
  });
  console.log('telegram:', res.status);
}

function couponPresent(file, coupon) {
  return fs.readFileSync(file, 'utf8').toUpperCase().includes(coupon.toUpperCase());
}

async function checkAffiliate(url) {
  try {
    const res = await fetch(url, { method: 'GET', redirect: 'follow',
      headers: { 'user-agent': 'Mozilla/5.0 (compatible; MCMonitor/1.0)' } });
    return { ok: res.status < 400, status: res.status };
  } catch (e) {
    return { ok: false, status: 0, err: e.message };
  }
}

(async () => {
  const changes = [];
  const couponAlerts = [];
  const affAlerts = [];
  for (const f of FIRMS) {
    const prev = latestPrevious(f.id);
    const cur = scrape(f.id, f.url);
    if (!cur) { changes.push(`${f.id}: scrape failed`); continue; }
    if (f.coupon && !couponPresent(cur, f.coupon)) {
      couponAlerts.push(`⚠️ ${f.id}: coupon ${f.coupon} NOT found`);
    }
    if (f.aff) {
      const a = await checkAffiliate(f.aff);
      if (!a.ok) affAlerts.push(`🔗 ${f.id}: affiliate link broken (${a.status}${a.err ? ' ' + a.err : ''})`);
    }
    const d = diffLines(prev, cur);
    if (!prev) changes.push(`${f.id}: baseline saved`);
    else if (d.added + d.removed > 0) changes.push(`${f.id}: +${d.added}/-${d.removed}`);
  }
  const allLines = [...affAlerts, ...couponAlerts, ...changes];
  const report = allLines.length ? allLines.join('\n') : 'no changes detected';
  console.log('\n=== REPORT ===\n' + report);
  const hasRealChange = couponAlerts.length > 0 || affAlerts.length > 0 ||
    changes.some(c => !c.includes('baseline') && !c.includes('no changes'));
  if (hasRealChange) await notifyTelegram(report);
})();
