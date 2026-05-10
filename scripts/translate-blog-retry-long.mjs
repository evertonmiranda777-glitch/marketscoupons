#!/usr/bin/env node
// Retry só pros 2 artigos longos (VPA + Wyckoff 2.0) que falharam na 1a passada.
// Estratégia: usa gemini-2.5-pro (suporta mais output) + chunking se necessário.

import fs from 'node:fs';
import path from 'node:path';

const ENV_FILE = path.join(process.env.HOME || process.env.USERPROFILE || '', '.nano-banana', '.env');
try {
  const txt = fs.readFileSync(ENV_FILE, 'utf8');
  for (const line of txt.split('\n')) {
    const m = line.match(/^([A-Z_]+)\s*=\s*(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim();
  }
} catch {}

const KEY = process.env.GEMINI_API_KEY;
const ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFmd2hkdXZ1dGZ1bXNheG51b2ZhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQzNzc5NDYsImV4cCI6MjA4OTk1Mzk0Nn0.efRel6U68misvPSRj8-p31-gOhzjXN4eIFMiloTNyk4';
const SB_URL = 'https://qfwhduvutfumsaxnuofa.supabase.co';
// Use Pro for higher output limits
const VERTEX = `https://aiplatform.googleapis.com/v1/publishers/google/models/gemini-2.5-pro:generateContent?key=${KEY}`;

const SLUGS = ['vpa-volume-price-analysis', 'wyckoff-2-volume-profile-order-flow'];
const LANGS = {
  en: 'English',
  es: 'Spanish (Spain)',
  fr: 'French',
  it: 'Italian',
  de: 'German',
  ar: 'Arabic',
};

const TG_BOT = '8733719815:AAGmgFbbBFfcQKuGKeEUZfUtxJcS1YwtwYU';
const TG_CHAT = '1284593409';
async function tg(text) {
  try {
    await fetch(`https://api.telegram.org/bot${TG_BOT}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: TG_CHAT, text }),
    });
  } catch {}
}

async function fetchPt() {
  const url = `${SB_URL}/rest/v1/blog_posts?select=*&lang=eq.pt&slug=in.(${SLUGS.join(',')})`;
  const r = await fetch(url, { headers: { apikey: ANON, Authorization: `Bearer ${ANON}` } });
  return r.json();
}

async function existing() {
  const url = `${SB_URL}/rest/v1/blog_posts?select=slug,lang&slug=in.(${SLUGS.join(',')})&lang=in.(en,es,fr,it,de,ar)`;
  const r = await fetch(url, { headers: { apikey: ANON, Authorization: `Bearer ${ANON}` } });
  return new Set((await r.json()).map((x) => `${x.slug}|${x.lang}`));
}

// Split body into chunks at <h2> boundaries to preserve HTML structure
function splitBody(body) {
  const parts = body.split(/(?=<h2)/);
  const chunks = [];
  let current = '';
  const targetSize = 12000;
  for (const p of parts) {
    if (current.length + p.length > targetSize && current.length > 0) {
      chunks.push(current);
      current = p;
    } else {
      current += p;
    }
  }
  if (current) chunks.push(current);
  return chunks;
}

async function translateChunk(chunk, langName, isFirst) {
  const prompt = `You are a professional translator specialized in financial trading content.
Translate the following Brazilian Portuguese trading article ${isFirst ? 'CHUNK' : 'CONTINUATION CHUNK'} into ${langName}.

CRITICAL RULES:
1. Keep ALL HTML tags exactly as-is (<h2>, <table>, <div class="callout">, <svg>, <img>, <a>, etc).
2. NEVER translate technical terms: "Prop Firm", "Profit Split", "Drawdown", "Lifetime", "Day-1 Payout", "Forex", "Futures", "Long", "Short", "Stop loss", "Take profit", indicator names (RSI, MACD, EMA, Bollinger Bands, ATR, ADX, OBV, VWAP, VPA), instrument symbols (NQ, ES, CL, GC, YM, RTY, ZB, 6E, MES, MNQ, MGC, MCL).
3. Keep dollar/euro amounts exact ($199, €79, R$50). Keep all numbers and percentages exact.
4. Translate naturally for native ${langName} traders.
5. Preserve paragraph breaks and structure exactly.
6. Output ONLY the translated HTML. No preamble, no explanation, no markdown fences. No JSON.

CHUNK TO TRANSLATE:
${chunk}`;

  const res = await fetch(VERTEX, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: { maxOutputTokens: 65536, temperature: 0.2 },
    }),
  });
  if (!res.ok) throw new Error(`gemini ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const data = await res.json();
  let txt = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!txt) throw new Error('empty translation');
  // Strip markdown fences if any
  txt = txt.replace(/^```html\s*/i, '').replace(/^```\s*/, '').replace(/\s*```\s*$/, '').trim();
  return txt;
}

async function translateMeta(article, langName) {
  const prompt = `Translate the title and excerpt of this Brazilian Portuguese trading article into ${langName}.
Keep technical terms (Prop Firm, VPA, Wyckoff, Volume Profile, Order Flow, etc) untranslated.
Output ONLY this JSON, no fences: {"title":"...","excerpt":"..."}

TITLE: ${article.title}
EXCERPT: ${article.excerpt}`;
  const res = await fetch(VERTEX, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: { maxOutputTokens: 2048, temperature: 0.2, responseMimeType: 'application/json' },
    }),
  });
  if (!res.ok) throw new Error(`gemini meta ${res.status}`);
  const data = await res.json();
  const txt = data.candidates?.[0]?.content?.parts?.[0]?.text;
  return JSON.parse(txt);
}

async function insert(row) {
  const r = await fetch(`${SB_URL}/rest/v1/rpc/insert_blog_translation`, {
    method: 'POST',
    headers: {
      apikey: ANON,
      Authorization: `Bearer ${ANON}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      p_slug: row.slug, p_title: row.title, p_category: row.category, p_level: row.level,
      p_read_time: row.read_time, p_body: row.body, p_excerpt: row.excerpt, p_icon: row.icon,
      p_sort_order: row.sort_order, p_lang: row.lang, p_author: row.author, p_cover_url: row.cover_url,
    }),
  });
  if (!r.ok) throw new Error(`rpc ${r.status}: ${(await r.text()).slice(0, 200)}`);
}

(async () => {
  const articles = await fetchPt();
  const have = await existing();
  const tasks = [];
  for (const art of articles) {
    for (const [code, name] of Object.entries(LANGS)) {
      if (!have.has(`${art.slug}|${code}`)) tasks.push({ art, code, name });
    }
  }
  console.log(`To translate: ${tasks.length}`);
  await tg(`Retry long articles: ${tasks.length} pending (Pro model + chunking)`);

  let done = 0, failed = 0;
  for (const { art, code, name } of tasks) {
    const tag = `[${code}] ${art.slug}`;
    let attempt = 0;
    while (attempt < 2) {
      try {
        attempt++;
        console.log(`Start ${tag} (chunks=${splitBody(art.body).length})`);
        // Translate meta
        const meta = await translateMeta(art, name);
        // Translate body in chunks
        const chunks = splitBody(art.body);
        const translated = [];
        for (let i = 0; i < chunks.length; i++) {
          const t = await translateChunk(chunks[i], name, i === 0);
          translated.push(t);
        }
        const fullBody = translated.join('\n\n');
        if (fullBody.length < art.body.length * 0.55) {
          throw new Error(`too short ${fullBody.length} vs ${art.body.length}`);
        }
        await insert({
          slug: art.slug, title: meta.title, category: art.category, level: art.level,
          read_time: art.read_time, body: fullBody, excerpt: meta.excerpt, icon: art.icon,
          sort_order: art.sort_order, lang: code, author: art.author, cover_url: art.cover_url,
        });
        done++;
        console.log(`OK ${tag} (${done}/${tasks.length})`);
        break;
      } catch (e) {
        console.log(`FAIL ${tag} attempt ${attempt}: ${e.message.slice(0, 200)}`);
        if (attempt >= 2) failed++;
        else await new Promise((r) => setTimeout(r, 3000));
      }
    }
  }
  await tg(`Long articles retry done: ${done} OK, ${failed} failed`);
})();
