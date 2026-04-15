#!/usr/bin/env node
// 2-message flow for 3-star economic events:
//   1) 5 min BEFORE release: send "upcoming" alert (yellow, Actual=Pending)
//   2) After release (actual appears): delete pre-alert + send "released" alert
//      with real data, miss/beat/inline badge, and market context explanation.
//
// State: .firecrawl/events-sent.json — map { eventId: { preMsgId, released } }
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
const STATE_FILE = path.join(root, '.firecrawl', 'events-sent.json');

const LEAD_MIN = 5;
const WINDOW = 6; // events scheduled in [+5,+11] min get pre-alerted
const CUTOFF_ET = 18 * 60 + 30; // 18:30 ET — nao alerta eventos depois desse horario
const US_RX = /united states|^us$|usa/i;

fs.mkdirSync(path.dirname(STATE_FILE), { recursive: true });
fs.mkdirSync(path.dirname(OUT_PNG), { recursive: true });

function loadState() {
  try {
    const raw = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
    if (Array.isArray(raw)) {
      // migrate old format (array of IDs)
      const m = {};
      for (const id of raw) m[id] = { preMsgId: null, released: true };
      return m;
    }
    return raw || {};
  } catch { return {}; }
}
function saveState(state) {
  const keys = Object.keys(state);
  // cap to last 500
  if (keys.length > 500) {
    const trimmed = {};
    for (const k of keys.slice(-500)) trimmed[k] = state[k];
    state = trimmed;
  }
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}
function eventId(e) {
  return `${e.date}|${e.time}|${e.currency}|${e.event}|${e.reference || ''}`;
}

function parseTimeET(timeStr) {
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

function fmtDate(isoDate) {
  try {
    const d = new Date(isoDate + 'T12:00:00');
    return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
  } catch { return isoDate; }
}

function parseNum(s) {
  if (s == null) return null;
  const m = String(s).match(/-?\d+(\.\d+)?/);
  return m ? parseFloat(m[0]) : null;
}

function classifyResult(actual, forecast) {
  const a = parseNum(actual), f = parseNum(forecast);
  if (a == null || f == null) return 'inline';
  if (Math.abs(a - f) / Math.max(Math.abs(f), 1) < 0.01) return 'inline';
  return a > f ? 'beat' : 'miss';
}

function marketContext(e, result) {
  const cur = e.currency || '';
  const dir = result === 'miss' ? 'below' : result === 'beat' ? 'above' : 'in line with';
  const ev = (e.event || '').toLowerCase();
  const pressure = result === 'miss' ? `${cur} pressure` : result === 'beat' ? `${cur} strength` : `muted ${cur} reaction`;
  let sector = 'FX and risk assets';
  if (ev.includes('cpi') || ev.includes('inflation') || ev.includes('ppi')) sector = 'bonds and rate-sensitive assets';
  else if (ev.includes('employment') || ev.includes('payroll') || ev.includes('nfp') || ev.includes('jobless')) sector = 'equities and USD';
  else if (ev.includes('gdp')) sector = 'growth-sensitive sectors';
  else if (ev.includes('retail')) sector = 'consumer-sector equities';
  else if (ev.includes('loan') || ev.includes('credit')) sector = 'Asian markets and commodities';
  else if (ev.includes('pmi') || ev.includes('manufacturing')) sector = 'cyclical equities';
  return `${cur} ${e.event} came in ${dir} expectations. Watch for <span>${pressure}</span> and shifts in ${sector}.`;
}

async function renderEvent(event, mode) {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 1350 }, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  await page.goto('file://' + TEMPLATE.replace(/\\/g, '/'), { waitUntil: 'networkidle' });

  await page.evaluate(({ e, mode }) => {
    const set = (sel, val) => { const el = document.querySelector(sel); if (el && val != null) el.textContent = val; };
    const setHTML = (sel, val) => { const el = document.querySelector(sel); if (el && val != null) el.innerHTML = val; };

    // Header / event identity
    set('.event-name', e.event || '');
    const country = e.country ? e.country.replace(/\b\w/g, c => c.toUpperCase()) : '';
    const ref = (e.reference || '').toUpperCase();
    setHTML('.event-sub', `${country} &nbsp;&bull;&nbsp; ${ref}`);
    set('.time-val', (e.time || '').replace(/\s*(AM|PM)/i, ''));
    set('.ev-date', e.dateFmt || '');

    // Currency badge — reset classes
    const cb = document.querySelector('.cur-badge');
    if (cb) {
      cb.textContent = e.currency || '';
      cb.className = 'cur-badge';
      const map = { CNY:'cny', USD:'usd', EUR:'eur', JPY:'jpy', GBP:'gbp' };
      const cls = map[e.currency] || 'usd';
      cb.classList.add(cls);
    }

    const actualCard = document.querySelectorAll('.data-card')[0];
    const forecastCard = document.querySelectorAll('.data-card')[1];
    const previousCard = document.querySelectorAll('.data-card')[2];
    const curLbl = e.currency || '';

    if (forecastCard) {
      const v = forecastCard.querySelector('.data-val');
      if (v) { v.innerHTML = e.forecast ? `${curLbl}<br>${e.forecast}` : '—'; v.className = 'data-val warn'; }
    }
    if (previousCard) {
      const v = previousCard.querySelector('.data-val');
      if (v) { v.innerHTML = e.previous ? `${curLbl}<br>${e.previous}` : '—'; v.className = 'data-val'; v.style.color = 'rgba(255,255,255,.6)'; }
    }

    if (mode === 'upcoming') {
      // Alert pill → yellow UPCOMING
      const albl = document.querySelector('.albl');
      if (albl) { albl.textContent = `UPCOMING IN ${e.leadMin} MIN`; albl.style.color = '#f5c518'; }
      const adot = document.querySelector('.adot');
      if (adot) { adot.style.background = '#f5c518'; adot.style.boxShadow = '0 0 14px rgba(245,197,24,.9)'; }
      const ap = document.querySelector('.alert-pill');
      if (ap) { ap.style.background = 'rgba(245,197,24,.1)'; ap.style.borderColor = 'rgba(245,197,24,.3)'; }

      // Actual → Pending, badge → yellow "In X Min"
      if (actualCard) {
        const v = actualCard.querySelector('.data-val');
        if (v) { v.innerHTML = 'Pending'; v.className = 'data-val na'; }
        const badge = actualCard.querySelector('.result-badge');
        if (badge) {
          badge.className = 'result-badge inline';
          badge.innerHTML = `⏱ In ${e.leadMin} Min`;
        }
      }

      // Market context → prep message
      setHTML('.mc-txt', `Scheduled at <span>${e.time || ''}</span>. Prepare for potential <span>${e.currency} volatility</span> — position before release.`);
    } else {
      // released
      const albl = document.querySelector('.albl');
      if (albl) albl.textContent = 'ECONOMIC CALENDAR — RELEASED';

      if (actualCard) {
        const v = actualCard.querySelector('.data-val');
        if (v) {
          v.innerHTML = e.actual ? `${curLbl}<br>${e.actual}` : '—';
          v.className = 'data-val ' + (e.result === 'beat' ? 'pos' : e.result === 'miss' ? 'neg' : 'warn');
        }
        const badge = actualCard.querySelector('.result-badge');
        if (badge) {
          badge.className = 'result-badge ' + e.result;
          badge.innerHTML = e.result === 'beat' ? '▲ Beat' : e.result === 'miss' ? '▼ Miss' : '● In Line';
        }
      }

      setHTML('.mc-txt', e.contextHtml || '');
    }
  }, { e: event, mode });

  await page.waitForTimeout(400);
  await page.screenshot({ path: OUT_PNG, clip: { x: 0, y: 0, width: 1080, height: 1350 }, type: 'png' });
  await browser.close();
  return OUT_PNG;
}

async function tgSendPhoto(pngPath, caption) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chat = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chat) throw new Error('missing TELEGRAM env');

  const buf = fs.readFileSync(pngPath);
  const fd = new FormData();
  fd.append('chat_id', chat);
  fd.append('photo', new Blob([buf], { type: 'image/png' }), 'event.png');
  if (caption) fd.append('caption', caption.slice(0, 1020));
  fd.append('reply_markup', JSON.stringify({
    inline_keyboard: [[{ text: '📅 Open Calendar', url: CALENDAR_PAGE }]],
  }));

  const res = await fetch(`https://api.telegram.org/bot${token}/sendPhoto`, { method: 'POST', body: fd });
  const body = await res.json();
  console.log(`[tg sendPhoto] ${res.status} ok=${body.ok} msg_id=${body.result?.message_id}`);
  if (!res.ok || !body.ok) throw new Error('sendPhoto failed: ' + JSON.stringify(body).slice(0,200));
  return body.result.message_id;
}

async function tgDeleteMessage(msgId) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chat = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chat || !msgId) return;
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/deleteMessage`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ chat_id: chat, message_id: msgId }),
    });
    const body = await res.text();
    console.log(`[tg deleteMessage] ${res.status} — ${body.slice(0,120)}`);
  } catch (err) {
    console.error('[tg deleteMessage] failed:', err.message);
  }
}

(async () => {
  console.log('[event-alert] fetching calendar…');
  const res = await fetch(CALENDAR_URL, { headers: { Authorization: `Bearer ${ANON}` } });
  if (!res.ok) { console.error('calendar fetch failed', res.status); process.exit(1); }
  const { events } = await res.json();
  const todayISO = new Date().toISOString().slice(0, 10);
  const now = nowInET();
  console.log(`[event-alert] nowET=${now}min, ${(events || []).length} events total`);

  const state = loadState();

  // Pass 1: upcoming pre-alerts (events in [+LEAD, +LEAD+WINDOW] not yet pre-alerted)
  const upcoming = (events || []).filter(e => {
    if (e.importance !== 3) return false;
    if (e.date !== todayISO) return false;
    if (e.currency !== 'USD' && !US_RX.test(e.country || '')) return false;
    const t = parseTimeET(e.time);
    if (t == null) return false;
    if (t > CUTOFF_ET) return false;
    const delta = t - now;
    if (delta < LEAD_MIN || delta > LEAD_MIN + WINDOW) return false;
    const id = eventId(e);
    return !state[id]?.preMsgId && !state[id]?.released;
  });
  console.log(`[event-alert] ${upcoming.length} pre-alerts to send`);

  for (const e of upcoming) {
    const id = eventId(e);
    console.log(`[pre] → ${e.time} ${e.currency} ${e.event}`);
    try {
      await renderEvent({ ...e, leadMin: LEAD_MIN, dateFmt: fmtDate(e.date) }, 'upcoming');
      const msgId = await tgSendPhoto(OUT_PNG, `⏱ ${e.currency} ${e.event} — in ${LEAD_MIN} min`);
      state[id] = { preMsgId: msgId, released: false };
      saveState(state);
    } catch (err) {
      console.error('[pre] failed:', err.message);
    }
  }

  // Pass 2: release follow-ups (events already pre-alerted that now have actual and not yet released)
  const released = (events || []).filter(e => {
    if (e.importance !== 3) return false;
    if (e.date !== todayISO) return false;
    if (e.currency !== 'USD' && !US_RX.test(e.country || '')) return false;
    const id = eventId(e);
    const st = state[id];
    if (!st || st.released) return false;
    return e.actual != null && String(e.actual).trim() !== '' && String(e.actual).trim() !== '-';
  });
  console.log(`[event-alert] ${released.length} release follow-ups to send`);

  for (const e of released) {
    const id = eventId(e);
    const st = state[id];
    const result = classifyResult(e.actual, e.forecast);
    console.log(`[rel] → ${e.time} ${e.currency} ${e.event} (${result})`);
    try {
      await renderEvent({
        ...e, leadMin: LEAD_MIN, dateFmt: fmtDate(e.date),
        result, contextHtml: marketContext(e, result),
      }, 'released');
      // delete the pre-alert first
      if (st.preMsgId) await tgDeleteMessage(st.preMsgId);
      await tgSendPhoto(OUT_PNG, `📊 ${e.currency} ${e.event} — ${result.toUpperCase()}`);
      state[id] = { preMsgId: null, released: true };
      saveState(state);
    } catch (err) {
      console.error('[rel] failed:', err.message);
    }
  }

  console.log('[event-alert] done');
})();
