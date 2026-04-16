// Render templates/criativo_*.html → img/<name>-creative.png (1080x1350)
// Run: node scripts/render-firms-png.js [firms|calendar|gamma|analysis|all]
//
// Dynamic data injection: pulls live data from Supabase before screenshot.
// Required env (optional — falls back to defaults if missing):
//   SUPABASE_URL, SUPABASE_ANON_KEY
import { chromium } from 'playwright';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://qfwhduvutfumsaxnuofa.supabase.co';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFmd2hkdXZ1dGZ1bXNheG51b2ZhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQzNzc5NDYsImV4cCI6MjA4OTk1Mzk0Nn0.efRel6U68misvPSRj8-p31-gOhzjXN4eIFMiloTNyk4';

const TARGETS = {
  firms:    { html: 'criativo_firms.html',    png: 'firms-creative.png',    inject: injectFirms },
  calendar: { html: 'criativo_calendar.html', png: 'calendar-creative.png', inject: injectCalendar },
  gamma:    { html: 'criativo_gamma.html',    png: 'gamma-creative.png',    inject: injectGamma },
  analysis: { html: 'criativo_analysis.html', png: 'analysis-creative.png', inject: injectAnalysis },
};

async function sb(table, query) {
  const url = `${SUPABASE_URL}/rest/v1/${table}?${query}`;
  const res = await fetch(url, { headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` } });
  if (!res.ok) { console.warn(`[sb] ${table} ${res.status}`); return null; }
  return await res.json();
}

function fmtReviews(n) {
  if (!n) return '0';
  if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
  return String(n);
}

function star(filled) { return `<span class="st"${filled ? '' : ' style="opacity:.28"'}>★</span>`; }
function stars(rating) {
  const r = Math.round(rating || 0);
  return [1,2,3,4,5].map(i => star(i <= r)).join('');
}

async function injectFirms(page) {
  const firms = await sb('cms_firms', 'select=name,short_name,discount,split,rating,reviews,coupon,type,sort_order,icon_url&active=eq.true&id=neq.e2t&order=discount.desc.nullslast&limit=5');
  if (!firms || firms.length === 0) { console.warn('[firms] no data, keeping static template'); return; }

  const totalFirms = await sb('cms_firms', 'select=id&active=eq.true');
  const total = totalFirms ? totalFirms.length : firms.length;
  const maxDiscount = Math.max(...firms.map(f => f.discount || 0));
  const maxSplit = firms.map(f => parseInt(String(f.split || '').replace(/[^0-9]/g, '')) || 0).reduce((a,b) => Math.max(a,b), 0);

  // Pre-load firm logos as base64
  const logoCache = {};
  for (const f of firms) {
    if (f.icon_url) {
      const logoPath = path.join(root, f.icon_url);
      try {
        const buf = fs.readFileSync(logoPath);
        const ext = path.extname(logoPath).slice(1) || 'png';
        logoCache[f.icon_url] = `data:image/${ext};base64,${buf.toString('base64')}`;
      } catch (e) { console.warn(`[logo] missing: ${logoPath}`); }
    }
  }

  const rows = firms.map((f, i) => {
    const isTop = i === 0;
    const splitNum = parseInt(String(f.split || '').replace(/[^0-9]/g, '')) || 0;
    const discColor = (f.discount || 0) >= 50 ? '#00dc82' : '#f5c518';
    const typeTag = (f.type || '').toLowerCase().includes('forex')
      ? `<span class="tag frx">${f.type}</span>`
      : `<span class="tag fut">Futures</span>`;
    const hiTag = isTop ? `<span class="tag hi">Biggest Discount</span>` : '';
    const name = f.short_name || f.name;
    const ratingStars = [1,2,3,4,5].map(n => `<span class="st"${n <= Math.round(f.rating || 0) ? '' : ' style="opacity:.28"'}>★</span>`).join('');
    const logoSrc = logoCache[f.icon_url] || '';
    const logoImg = logoSrc ? `<img src="${logoSrc}" style="width:66px;height:66px;object-fit:cover;border-radius:12px;">` : '';

    return `<div class="firm ${isTop ? 'top1' : ''}">
      <div class="fl">${logoImg}</div>
      <div class="fi"><div class="fn_">${name}</div><div class="tags">${typeTag}${hiTag}</div></div>
      <div class="st_"><div class="sv" style="color:${discColor};">${f.discount || 0}%</div><div class="sl">Disc</div></div>
      <div class="st_"><div class="sv green">${splitNum}%</div><div class="sl">Split</div></div>
      <div class="rat"><div class="rv">${(f.rating || 0).toFixed(1)}</div><div class="sr">${ratingStars}</div></div>
      <div class="rw"><div class="sv" style="font-size:24px;color:rgba(255,255,255,.6);">${fmtReviews(f.reviews)}</div><div class="sl">Reviews</div></div>
      <div class="cp_"><div class="ci"><div class="cc">${f.coupon || '—'}</div><div class="cl">Exclusive</div></div></div>
    </div>`;
  }).join('');

  await page.evaluate(({ rows, total, maxDiscount, maxSplit }) => {
    const sumCards = document.querySelectorAll('.summary .sum-val');
    if (sumCards[0]) sumCards[0].textContent = String(total);
    if (sumCards[1]) sumCards[1].textContent = `Up to ${maxDiscount}%`;
    if (sumCards[2]) sumCards[2].textContent = `${maxSplit}%`;
    const meta = document.querySelector('.meta');
    if (meta) meta.innerHTML = `Showing <b>${total} companies</b> &nbsp;&bull;&nbsp; Sorted by Biggest Discount`;

    // Replace visible (non-blurred) firm rows
    const visibleFirms = document.querySelectorAll('.firm:not(.bl)');
    const parent = visibleFirms[0]?.parentNode;
    if (parent && visibleFirms.length) {
      const firstRef = visibleFirms[0];
      visibleFirms.forEach(el => el.remove());
      const tmp = document.createElement('div');
      tmp.innerHTML = rows;
      Array.from(tmp.children).reverse().forEach(child => parent.insertBefore(child, parent.children[Array.from(parent.children).indexOf(parent.querySelector('.bwrap'))] || null));
    }
  }, { rows, total, maxDiscount, maxSplit });
}

async function injectCalendar(page) {
  // TODO: fetch from economic-calendar edge function and inject events
  console.log('[calendar] dynamic injection not yet implemented — using static template');
}

async function injectGamma(page) {
  const rows = await sb('gex_levels', 'select=*&order=date.desc&limit=1');
  if (!rows || rows.length === 0) { console.warn('[gamma] no data'); return; }
  const g = rows[0];
  await page.evaluate((g) => {
    const set = (sel, val) => { const el = document.querySelector(sel); if (el && val != null) el.textContent = String(val); };
    set('[data-spot]', g.spot);
    set('[data-call-wall]', g.call_wall);
    set('[data-put-wall]', g.put_wall);
    set('[data-flip]', g.gamma_flip);
  }, g);
}

async function injectAnalysis(page) {
  const rows = await sb('daily_analysis', 'select=*&order=date.desc&limit=1');
  if (!rows || rows.length === 0) { console.warn('[analysis] no data'); return; }
  // TODO: map analysis fields to template once placeholders exist
  console.log('[analysis] data fetched but template injection not yet wired');
}

const arg = process.argv[2] || 'all';
const list = arg === 'all' ? Object.keys(TARGETS) : [arg];

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1080, height: 1350 }, deviceScaleFactor: 2 });
const page = await ctx.newPage();

for (const name of list) {
  const t = TARGETS[name];
  if (!t) { console.error('unknown target:', name); continue; }
  const htmlPath = path.join(root, 'templates', t.html);
  const outPath = path.join(root, 'img', t.png);
  await page.goto('file://' + htmlPath.replace(/\\/g, '/'), { waitUntil: 'networkidle' });
  if (t.inject) {
    try { await t.inject(page); } catch (e) { console.warn(`[${name}] inject failed:`, e.message); }
  }
  await page.waitForTimeout(500);
  await page.screenshot({ path: outPath, clip: { x: 0, y: 0, width: 1080, height: 1350 }, type: 'png' });
  console.log('✅', outPath);
}

await browser.close();
