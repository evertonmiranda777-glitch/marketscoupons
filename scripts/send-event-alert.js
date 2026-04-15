#!/usr/bin/env node
// Fires 5 minutes BEFORE a 3-star economic event, not after.
// Polls economic-calendar, finds 3-star events scheduled in the next 5–10 min
// window (matches a 5-min cron), renders criativo_evento.html in "upcoming"
// mode, sends to Telegram with inline "Open Calendar" button.
//
// Dedup: .firecrawl/events-sent.json — keeps IDs already alerted.
// Env: TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID
// Run: node scripts/send-event-alert.js

import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

const SUPABASE_URL = 'https://qfwhduvutfumsaxnuofa.supabase.co';
const ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFmd2hkdXZ1dGZ1bXNheG51b2ZhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQzNzc5NDYsImV4cCI6MjA4OTk1Mzk0Nn0.efRel6U68misvPSRj8-p31-gOhzjXN4eIFMiloTNyk4';

const CALENDAR_URL = `${SUPABASE_URL}/functions/v1/economic-calendar`;
const CALENDAR_PAGE = 'https://www.marketscoupons.com/calendar';
const TEMPLATE = path.join(root, 'templates', 'criativo_evento.html');
const OUT_PNG = path.join(root, 'img', 'event-alert.png');
const SENT_FILE = path.join(root, '.firecrawl', 'events-sent.json');

// Window: alert for events scheduled between LEAD_MIN and LEAD_MIN+WINDOW min from now
const LEAD_MIN = 5;
const WINDOW = 6; // 5..10 covers a 5-min cron even with 1-2 min drift

fs.mkdirSync(path.dirname(SENT_FILE), { recursive: true });

function loadSent() {
  try { return new Set(JSON.parse(fs.readFileSync(SENT_FILE, 'utf8'))); }
  catch { return new Set(); }
}
function saveSent(set) {
  fs.writeFileSync(SENT_FILE, JSON.stringify([...set].slice(-500), null, 2));
}
function eventId(e) {
  return `${e.date}|${e.time}|${e.currency}|${e.event}|${e.reference || ''}`;
}

function parseTimeET(timeStr) {
  // "09:00 AM" / "01:30 PM" → minutes-of-day (ET), or null
  if (!timeStr) return null;
  const m = timeStr.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
  if (!m) return null;
  let h = parseInt(m[1], 10);
  const min = parseInt(m[2], 10);
  const ap = (m[3] || '').toUpperCase();
  if (ap === 'PM' && h < 12) h += 12;
  if (ap === 'AM' && h === 12) h = 0;
  return h * 60 + min;
}

function nowInET() {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York', hour: '2-digit', minute: '2-digit', hour12: false,
  }).formatToParts(new Date());
  const h = parseInt(parts.find(p => p.type === 'hour').value, 10);
  const m = parseInt(parts.find(p => p.type === 'minute').value, 10);
  return h * 60 + (isNaN(m) ? 0 : m);
}

function pickUpcomingEvents(events, todayISO) {
  const now = nowInET();
  return events.filter(e => {
    if (e.importance !== 3) return false;
    if (e.date !== todayISO) return false;
    const t = parseTimeET(e.time);
    if (t == null) return false;
    const delta = t - now;
    return delta >= LEAD_MIN && delta <= LEAD_MIN + WINDOW;
  });
}

async function renderEvent(event) {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 1350 }, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  await page.goto('file://' + TEMPLATE.replace(/\\/g, '/'), { waitUntil: 'networkidle' });

  await page.evaluate((e) => {
    const set = (sel, val) => { const el = document.querySelector(sel); if (el && val != null) el.textContent = val; };

    set('.time-val', (e.time || '').replace(/\s*(AM|PM)/i, ''));
    set('.ev-name', e.event);
    set('.ev-period', (e.reference || '').toUpperCase());
    set('.ev-country', e.country ? e.country.replace(/\b\w/g, c => c.toUpperCase()) : '');

    const cur = document.querySelector('.cur');
    if (cur) cur.textContent = e.currency || '';

    // header label → "UPCOMING" mode
    const chLabel = document.querySelector('.ch-label');
    if (chLabel) chLabel.textContent = `High Impact Event — In ${e.leadMin} Minutes`;

    // data cells: Actual = pending, Forecast, Previous
    const cells = document.querySelectorAll('.data-cell .dc-val');
    if (cells[0]) { cells[0].innerHTML = 'Pending'; cells[0].style.color = 'rgba(255,255,255,.35)'; cells[0].style.fontSize = '22px'; }
    if (cells[1]) cells[1].innerHTML = String(e.forecast || '—');
    if (cells[2]) cells[2].innerHTML = String(e.previous || '—');

    // badge becomes countdown pill
    const miss = document.querySelector('.miss-lbl');
    if (miss) { miss.textContent = `In ${e.leadMin} Min`; miss.style.color = '#f5c518'; }
    const dot = document.querySelector('.miss-dot');
    if (dot) dot.style.background = '#f5c518';
    const badge = document.querySelector('.miss-badge');
    if (badge) {
      badge.style.background = 'rgba(245,197,24,.1)';
      badge.style.borderColor = 'rgba(245,197,24,.3)';
    }
    // sub-line under badge
    const subLine = badge?.parentElement?.querySelector('div:not(.miss-badge)');
    if (subLine) subLine.innerHTML = `Scheduled <span style="color:#f5c518;font-weight:700">${e.time || ''}</span>`;

    const ctxEl = document.querySelector('.context');
    if (ctxEl) {
      ctxEl.innerHTML = `Prepare for potential<br><span>${e.currency} volatility</span> — position<br>before release.`;
    }
  }, { ...event, leadMin: 5 });

  await page.waitForTimeout(400);
  await page.screenshot({ path: OUT_PNG, clip: { x: 0, y: 0, width: 1080, height: 1350 }, type: 'png' });
  await browser.close();
  return OUT_PNG;
}

async function sendTelegram(pngPath) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chat = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chat) throw new Error('missing TELEGRAM env');

  const buf = fs.readFileSync(pngPath);
  const fd = new FormData();
  fd.append('chat_id', chat);
  fd.append('photo', new Blob([buf], { type: 'image/png' }), 'event.png');
  fd.append('reply_markup', JSON.stringify({
    inline_keyboard: [[{ text: '📅 Open Calendar', url: CALENDAR_PAGE }]],
  }));

  const res = await fetch(`https://api.telegram.org/bot${token}/sendPhoto`, { method: 'POST', body: fd });
  const body = await res.text();
  console.log(`[telegram] ${res.status} — ${body.slice(0, 200)}`);
  if (!res.ok) throw new Error('telegram sendPhoto failed');
}

(async () => {
  console.log('[event-alert] fetching calendar…');
  const res = await fetch(CALENDAR_URL, { headers: { Authorization: `Bearer ${ANON}` } });
  if (!res.ok) { console.error('calendar fetch failed', res.status); process.exit(1); }
  const { events } = await res.json();
  const todayISO = new Date().toISOString().slice(0, 10);
  const candidates = pickUpcomingEvents(events || [], todayISO);
  console.log(`[event-alert] nowET=${nowInET()}min | ${candidates.length} upcoming 3-star events in window`);

  const sent = loadSent();
  const fresh = candidates.filter(e => !sent.has(eventId(e)));
  console.log(`[event-alert] ${fresh.length} not yet alerted`);

  for (const e of fresh) {
    console.log(`[event-alert] → ${e.time} ${e.currency} ${e.event}`);
    try {
      await renderEvent(e);
      await sendTelegram(OUT_PNG);
      sent.add(eventId(e));
      saveSent(sent);
    } catch (err) {
      console.error(`[event-alert] failed:`, err.message);
    }
  }
  console.log('[event-alert] done');
})();
