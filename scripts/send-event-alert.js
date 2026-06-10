#!/usr/bin/env node
// 2-message flow for 3-star economic events:
//   1) 5 min BEFORE release: send "upcoming" alert (yellow, Actual=Pending)
//   2) After release (actual appears): delete pre-alert + send "released" alert
//      with real data, miss/beat/inline badge, and market context explanation.
//
// State: .firecrawl/events-sent.json, map { eventId: { preMsgId, released } }
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
const TEMPLATE_UPCOMING = path.join(root, 'templates', 'criativo_evento 001.html');
const TEMPLATE_RELEASED = path.join(root, 'templates', 'criativo_evento 002.html');
const OUT_PNG = path.join(root, 'img', 'event-alert.png');
const STATE_FILE = path.join(root, '.firecrawl', 'events-sent.json');

// 2026-05-05: GitHub Actions schedule cron tem throttle pesado (gaps 47-194 min
// observados em 24h vs declarado */5min). Janela alargada pra 120 min compensa.
// Trade-off: alert pode chegar até ~2h antes do evento em vez de 5 min, mas
// chega, antes era miss completo. LEAD_MIN preservado pro display.
const LEAD_MIN = 5;
const WINDOW = 120; // events scheduled in [+5, +125] min get pre-alerted
// CUTOFF dinâmico DST-aware: 18:30 ET (sempre) → UTC convertido com offset atual.
// EDT (mar-nov, UTC-4) → 22:30 UTC. EST (nov-mar, UTC-5) → 23:30 UTC.
function getEtUtcOffset() {
  // Pega offset em horas via tz America/New_York vs UTC
  const now = new Date();
  const utcMs = now.getTime();
  const etStr = now.toLocaleString('en-US', { timeZone: 'America/New_York', hour12: false });
  const etDate = new Date(etStr);
  return Math.round((etDate.getTime() - utcMs) / 3600000); // -4 (EDT) ou -5 (EST)
}
function computeCutoffUtc() {
  const offset = getEtUtcOffset(); // -4 ou -5
  return (18 * 60 + 30) - offset * 60; // 18:30 ET em minutos UTC
}
const CUTOFF_ET = computeCutoffUtc(); // calculado on init
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

// FIX 2026-05-05: economic-calendar API retorna horários em UTC ("02:00 PM" = 14:00 UTC),
// não ET. Antes parseTimeET tratava como ET → alerta saía 3-4h depois do evento real.
// Agora ambos (parseTimeUtc + nowInUtc) usam UTC consistente.
function parseTimeUtc(timeStr) {
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
// alias mantido pra compat
const parseTimeET = parseTimeUtc;

function nowInUtc() {
  const d = new Date();
  return d.getUTCHours() * 60 + d.getUTCMinutes();
}
const nowInET = nowInUtc;

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

const GEMINI_KEY = process.env.GEMINI_API_KEY || '';

async function marketContext(e, result) {
  if (!GEMINI_KEY) return marketContextFallback(e, result);
  const cur = e.currency || '';
  const dir = result === 'miss' ? 'below' : result === 'beat' ? 'above' : 'in line with';
  const prompt = `You are a concise macro analyst. An economic event just released:
Event: ${e.event} (${cur})
Actual: ${e.actual}, Forecast: ${e.forecast}, Previous: ${e.previous}
Result: ${result} (actual came in ${dir} expectations).

Write exactly 1-2 sentences (max 180 chars) explaining the market impact. Use trader language. Wrap the most important phrase in <span> tags for highlighting. No disclaimers, no "I think". Example output format:
Weaker credit demand signals slowdown, watch for <span>CNY pressure</span> and risk-off in Asian markets.`;
  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_KEY}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { maxOutputTokens: 120, temperature: 0.7 } })
    });
    if (!res.ok) throw new Error(`Gemini ${res.status}`);
    const data = await res.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    if (text && text.length > 10) return text;
    throw new Error('empty response');
  } catch (err) {
    console.warn('[marketContext] Gemini failed, using fallback:', err.message);
    return marketContextFallback(e, result);
  }
}

function marketContextFallback(e, result) {
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
  const tpl = mode === 'upcoming' ? TEMPLATE_UPCOMING : TEMPLATE_RELEASED;
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 1350 }, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  await page.goto('file://' + tpl.replace(/\\/g, '/'), { waitUntil: 'networkidle' });

  if (mode === 'upcoming') {
    // Template 001, card horizontal layout
    await page.evaluate(({ e }) => {
      const set = (sel, val) => { const el = document.querySelector(sel); if (el && val != null) el.textContent = val; };
      const setHTML = (sel, val) => { const el = document.querySelector(sel); if (el && val != null) el.innerHTML = val; };

      // Header label → UPCOMING (usa leadDisplay que pode ser '45 min' ou '2h 15min')
      set('.ch-label', `High Impact Event, Upcoming in ${e.leadDisplay || (e.leadMin + ' Min')}`);
      // Make header yellow for upcoming
      const adot = document.querySelector('.adot');
      if (adot) { adot.style.background = '#f5c518'; adot.style.boxShadow = '0 0 10px rgba(245,197,24,.9)'; }
      const accent = document.querySelector('.accent');
      if (accent) accent.style.background = 'linear-gradient(90deg,#f5c518 0%,#ffdd57 50%,rgba(245,197,24,0) 100%)';
      const card = document.querySelector('.card');
      if (card) card.style.borderColor = 'rgba(245,197,24,.18)';

      // Time
      set('.time-val', (e.time || '').replace(/\s*(AM|PM)/i, ''));

      // Currency badge
      const cb = document.querySelector('.cur');
      if (cb) {
        cb.textContent = e.currency || '';
        cb.className = 'cur';
        const map = { CNY:'cny', USD:'usd', EUR:'eur', JPY:'jpy', GBP:'gbp' };
        cb.classList.add(map[e.currency] || 'usd');
      }

      // Event name + meta
      set('.ev-name', e.event || '');
      const country = e.country ? e.country.replace(/\b\w/g, c => c.toUpperCase()) : '';
      set('.ev-period', (e.reference || '').toUpperCase());
      set('.ev-country', country);

      // Data cells
      const cells = document.querySelectorAll('.data-cell');
      if (cells[0]) { // Actual → Pending
        const v = cells[0].querySelector('.dc-val');
        if (v) { v.innerHTML = 'Pending'; v.className = 'dc-val muted'; v.style.fontSize = '22px'; }
      }
      if (cells[1]) { // Forecast
        const v = cells[1].querySelector('.dc-val');
        if (v) { v.innerHTML = e.forecast ? `${e.currency}<br>${e.forecast}` : '—'; v.className = 'dc-val warn'; }
      }
      if (cells[2]) { // Previous
        const v = cells[2].querySelector('.dc-val');
        if (v) { v.innerHTML = e.previous ? `${e.currency}<br>${e.previous}` : '—'; v.className = 'dc-val muted'; }
      }

      // Bottom row → upcoming style
      const missBadge = document.querySelector('.miss-badge');
      if (missBadge) {
        const dot = missBadge.querySelector('.miss-dot');
        if (dot) { dot.style.background = '#f5c518'; }
        const lbl = missBadge.querySelector('.miss-lbl');
        if (lbl) { lbl.textContent = `In ${e.leadDisplay || (e.leadMin + ' Min')}`; lbl.style.color = '#f5c518'; }
        missBadge.style.background = 'rgba(245,197,24,.1)';
        missBadge.style.borderColor = 'rgba(245,197,24,.25)';
      }
      // Diff text
      const diffText = missBadge?.parentNode?.querySelector('div:nth-child(2)');
      if (diffText) diffText.innerHTML = `Scheduled at <span style="color:#f5c518;font-weight:700;">${e.time || ''}</span>`;

      // Context
      const ctx = document.querySelector('.context');
      if (ctx) ctx.innerHTML = `Prepare for potential <span>${e.currency} volatility</span>, position before release.`;
    }, { e: event });
  } else {
    // Template 002, vertical centered layout (released)
    await page.evaluate(({ e }) => {
      const set = (sel, val) => { const el = document.querySelector(sel); if (el && val != null) el.textContent = val; };
      const setHTML = (sel, val) => { const el = document.querySelector(sel); if (el && val != null) el.innerHTML = val; };

      set('.event-name', e.event || '');
      const country = e.country ? e.country.replace(/\b\w/g, c => c.toUpperCase()) : '';
      const ref = (e.reference || '').toUpperCase();
      setHTML('.event-sub', `${country} &nbsp;&bull;&nbsp; ${ref}`);
      set('.time-val', (e.time || '').replace(/\s*(AM|PM)/i, ''));
      set('.ev-date', e.dateFmt || '');

      const cb = document.querySelector('.cur-badge');
      if (cb) {
        cb.textContent = e.currency || '';
        cb.className = 'cur-badge';
        const map = { CNY:'cny', USD:'usd', EUR:'eur', JPY:'jpy', GBP:'gbp' };
        cb.classList.add(map[e.currency] || 'usd');
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

      const albl = document.querySelector('.albl');
      if (albl) albl.textContent = 'ECONOMIC CALENDAR, RELEASED';

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
    }, { e: event });
  }

  await page.waitForTimeout(400);
  if (mode === 'upcoming') {
    const card = await page.$('.card');
    if (card) await card.screenshot({ path: OUT_PNG, type: 'png' });
    else await page.screenshot({ path: OUT_PNG, clip: { x: 0, y: 0, width: 1080, height: 1350 }, type: 'png' });
  } else {
    await page.screenshot({ path: OUT_PNG, clip: { x: 0, y: 0, width: 1080, height: 1350 }, type: 'png' });
  }
  await browser.close();
  return OUT_PNG;
}

async function tgSendPhoto(pngPath, caption) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  // Aceita TELEGRAM_CHAT_ID OU TELEGRAM_ADMIN_CHAT_ID, varia conforme onde foi configurado.
  const chat = process.env.TELEGRAM_CHAT_ID || process.env.TELEGRAM_ADMIN_CHAT_ID;
  if (!token) throw new Error('missing TELEGRAM_BOT_TOKEN env');
  if (!chat) throw new Error('missing TELEGRAM_CHAT_ID/TELEGRAM_ADMIN_CHAT_ID env');

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
  const chat = process.env.TELEGRAM_CHAT_ID || process.env.TELEGRAM_ADMIN_CHAT_ID;
  if (!token || !chat || !msgId) return;
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/deleteMessage`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ chat_id: chat, message_id: msgId }),
    });
    const body = await res.text();
    console.log(`[tg deleteMessage] ${res.status}, ${body.slice(0,120)}`);
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

  // Boost known high-impact US events from imp 2 → 3
  const BOOST_RX = /\b(non.?farm|nfp|payroll|cpi\b|inflation rate|ppi\b|producer price|retail sales|gdp |initial jobless|philadelph|philly fed|ism |fomc|fed.*rate|interest rate decision|core pce|pce price|consumer confidence|durable goods|s&p global.*pmi|adp employment|housing starts|building permits|michigan consumer|jolts|import price|export price|employment cost|trade balance)\b/i;
  for (const e of (events || [])) {
    if (e.importance === 2 && (e.currency === 'USD' || US_RX.test(e.country || '')) && BOOST_RX.test(e.event)) {
      e.importance = 3;
    }
  }

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
    const t = parseTimeET(e.time);
    const actualLeadMin = t != null ? Math.max(LEAD_MIN, t - now) : LEAD_MIN;
    const leadDisplay = actualLeadMin >= 60 ? `${Math.floor(actualLeadMin/60)}h${actualLeadMin%60 ? ' '+actualLeadMin%60+'min' : ''}` : `${actualLeadMin} min`;
    console.log(`[pre] → ${e.time} ${e.currency} ${e.event} (in ${leadDisplay})`);
    try {
      await renderEvent({ ...e, leadMin: actualLeadMin, leadDisplay, dateFmt: fmtDate(e.date) }, 'upcoming');
      const msgId = await tgSendPhoto(OUT_PNG, `⏱ ${e.currency} ${e.event}, in ${leadDisplay}`);
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
        result, contextHtml: await marketContext(e, result),
      }, 'released');
      // delete the pre-alert first
      if (st.preMsgId) await tgDeleteMessage(st.preMsgId);
      await tgSendPhoto(OUT_PNG, `📊 ${e.currency} ${e.event}, ${result.toUpperCase()}`);
      state[id] = { preMsgId: null, released: true };
      saveState(state);
    } catch (err) {
      console.error('[rel] failed:', err.message);
    }
  }

  // Sempre persiste state (mesmo vazio) pra prova de execução + debug timestamp
  state.__last_run = new Date().toISOString();
  state.__last_now_et = now;
  state.__last_summary = { events_total: events.length, upcoming_sent: upcoming.length, released_sent: released.length };
  saveState(state);
  console.log('[event-alert] done');
})();
