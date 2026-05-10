#!/usr/bin/env node
// Traduz os 10 artigos PT do blog_posts para EN/ES/FR/IT/DE/AR via Vertex AI Gemini.
// Uso: SUPABASE_SERVICE_ROLE_KEY=xxx node scripts/translate-blog-vertex.mjs
// Ou só com GEMINI_API_KEY no ~/.nano-banana/.env (anon key pode ler, mas insert exige SK).

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
const SK = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFmd2hkdXZ1dGZ1bXNheG51b2ZhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQzNzc5NDYsImV4cCI6MjA4OTk1Mzk0Nn0.efRel6U68misvPSRj8-p31-gOhzjXN4eIFMiloTNyk4';

if (!KEY) {
  console.error('GEMINI_API_KEY missing — set in ~/.nano-banana/.env');
  process.exit(1);
}

const SB_URL = 'https://qfwhduvutfumsaxnuofa.supabase.co';
const VERTEX = `https://aiplatform.googleapis.com/v1/publishers/google/models/gemini-2.5-flash:generateContent?key=${KEY}`;

const SLUGS = [
  'indicadores-tecnicos-guia-completo',
  'introducao-analise-tecnica',
  'mercado-americano-guia-trader',
  'metagame-prop-firm-trader',
  'ondas-de-elliott-guia-completo',
  'plano-de-trading-guia-pratico',
  'teorias-dos-mercados-dow-emh',
  'trading-for-a-living-alexander-elder',
  'vpa-volume-price-analysis',
  'wyckoff-2-volume-profile-order-flow',
];

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

async function fetchPtArticles() {
  const url = `${SB_URL}/rest/v1/blog_posts?select=*&lang=eq.pt&slug=in.(${SLUGS.join(',')})`;
  const r = await fetch(url, { headers: { apikey: ANON, Authorization: `Bearer ${ANON}` } });
  if (!r.ok) throw new Error('fetch PT failed: ' + r.status);
  return r.json();
}

async function existingTranslations() {
  const url = `${SB_URL}/rest/v1/blog_posts?select=slug,lang&slug=in.(${SLUGS.join(',')})&lang=in.(en,es,fr,it,de,ar)`;
  const r = await fetch(url, { headers: { apikey: ANON, Authorization: `Bearer ${ANON}` } });
  return new Set((await r.json()).map((x) => `${x.slug}|${x.lang}`));
}

async function translate(article, langCode, langName) {
  const prompt = `You are a professional translator specialized in financial trading content.
Translate the following Brazilian Portuguese trading article into ${langName}.

CRITICAL RULES:
1. Keep ALL HTML tags exactly as-is (<h2>, <table>, <div class="callout">, <svg>, <img>, <a>, etc).
2. NEVER translate technical terms: "Prop Firm", "Profit Split", "Drawdown", "Lifetime", "Day-1 Payout", "Forex", "Futures", "Long", "Short", "Stop loss", "Take profit", indicator names (RSI, MACD, EMA, Bollinger Bands, ATR, ADX, OBV, VWAP, VPA), instrument symbols (NQ, ES, CL, GC, YM, RTY, ZB, 6E, MES, MNQ, MGC, MCL).
3. Translate firm names ONLY when they have a generic word: "Apex Trader Funding" stays, "TPT (Take Profit Trader)" stays.
4. Keep dollar/euro amounts exact ($199, €79, R$50). Keep all numbers and percentages exact.
5. Keep code/formula blocks unchanged.
6. Translate naturally for native ${langName} traders. Use idiomatic ${langName} financial vocabulary, not literal translation.
7. Preserve paragraph breaks and structure exactly.
8. Output ONLY the translated HTML body. No preamble, no explanation, no markdown fences.

TITLE TO TRANSLATE: ${article.title}
EXCERPT TO TRANSLATE: ${article.excerpt}

BODY HTML TO TRANSLATE (keep all HTML tags):
${article.body}

OUTPUT FORMAT (exactly this JSON, no markdown fences):
{"title":"<translated title>","excerpt":"<translated excerpt>","body":"<translated HTML body>"}`;

  const res = await fetch(VERTEX, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        maxOutputTokens: 65536,
        temperature: 0.2,
        responseMimeType: 'application/json',
      },
    }),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Gemini ${res.status}: ${t.slice(0, 300)}`);
  }
  const data = await res.json();
  const txt = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!txt) throw new Error('empty translation');
  let parsed;
  try {
    parsed = JSON.parse(txt);
  } catch {
    const m = txt.match(/\{[\s\S]*\}/);
    if (!m) throw new Error('not JSON: ' + txt.slice(0, 200));
    parsed = JSON.parse(m[0]);
  }
  if (!parsed.title || !parsed.body) throw new Error('missing fields in JSON');
  // Safety: translation should be at least 60% of original
  if (parsed.body.length < article.body.length * 0.6) {
    throw new Error(`truncated: ${parsed.body.length} vs ${article.body.length}`);
  }
  return parsed;
}

async function insert(row) {
  // Use RPC function insert_blog_translation (SECURITY DEFINER, anon-callable)
  const r = await fetch(`${SB_URL}/rest/v1/rpc/insert_blog_translation`, {
    method: 'POST',
    headers: {
      apikey: ANON,
      Authorization: `Bearer ${ANON}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      p_slug: row.slug,
      p_title: row.title,
      p_category: row.category,
      p_level: row.level,
      p_read_time: row.read_time,
      p_body: row.body,
      p_excerpt: row.excerpt,
      p_icon: row.icon,
      p_sort_order: row.sort_order,
      p_lang: row.lang,
      p_author: row.author,
      p_cover_url: row.cover_url,
    }),
  });
  if (!r.ok) {
    const t = await r.text();
    throw new Error(`rpc failed ${r.status}: ${t.slice(0, 200)}`);
  }
}

(async () => {
  console.log('Fetching 10 PT articles...');
  const articles = await fetchPtArticles();
  console.log(`Got ${articles.length} articles`);
  if (articles.length !== 10) {
    console.error('Expected 10, got', articles.length);
    process.exit(1);
  }

  const existing = await existingTranslations();
  console.log(`Existing translations: ${existing.size}`);

  const tasks = [];
  for (const art of articles) {
    for (const [langCode, langName] of Object.entries(LANGS)) {
      const key = `${art.slug}|${langCode}`;
      if (existing.has(key)) continue;
      tasks.push({ art, langCode, langName });
    }
  }
  console.log(`Total to translate: ${tasks.length}`);
  await tg(`Translation start: ${tasks.length} articles via Vertex AI Gemini 2.5 Flash`);

  let done = 0,
    failed = 0;
  for (const { art, langCode, langName } of tasks) {
    const tag = `[${langCode}] ${art.slug}`;
    let attempt = 0;
    while (attempt < 3) {
      try {
        attempt++;
        const t = await translate(art, langCode, langName);
        const row = {
          slug: art.slug,
          title: t.title,
          category: art.category,
          level: art.level,
          read_time: art.read_time,
          body: t.body,
          excerpt: t.excerpt,
          icon: art.icon,
          active: true,
          ai_generated: true,
          sort_order: art.sort_order,
          lang: langCode,
          author: art.author,
          cover_url: art.cover_url,
        };
        await insert(row);
        done++;
        console.log(`OK ${tag} (${done}/${tasks.length})`);
        break;
      } catch (e) {
        console.log(`FAIL ${tag} attempt ${attempt}: ${e.message.slice(0, 200)}`);
        if (attempt >= 3) {
          failed++;
          await tg(`FAIL after 3 retries: ${tag}\n${e.message.slice(0, 200)}`);
        } else {
          await new Promise((r) => setTimeout(r, 2000 * attempt));
        }
      }
    }
  }

  const summary = `Translation complete: ${done}/${tasks.length} OK, ${failed} failed`;
  console.log(summary);
  await tg(summary);
})();
