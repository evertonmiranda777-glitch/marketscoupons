#!/usr/bin/env node
// Translate 9 v7 EN articles → PT/ES/IT/FR/DE/AR via Vertex AI Gemini Flash
// Uses blog-bulk-upsert edge function for writes
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
if (!KEY) { console.error('GEMINI_API_KEY missing'); process.exit(1); }

const SUPABASE_URL = 'https://qfwhduvutfumsaxnuofa.supabase.co';
const ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFmd2hkdXZ1dGZ1bXNheG51b2ZhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQzNzc5NDYsImV4cCI6MjA4OTk1Mzk0Nn0.efRel6U68misvPSRj8-p31-gOhzjXN4eIFMiloTNyk4';
const VERTEX = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${KEY}`;

const SLUGS = [
  'vpa-volume-price-analysis',
  'wyckoff-method-2026',
  'order-flow-footprint',
  '0dte-options-deep-dive',
  'elliott-wave-practical',
  'risk-management-1r',
  'how-to-pass-prop-firm',
  'trailing-drawdown-vs-eod',
  'position-sizing-scaling',
];

const LANGS = {
  pt: 'Portuguese (Brazil)',
  es: 'Spanish (Spain)',
  fr: 'French',
  it: 'Italian',
  de: 'German',
  ar: 'Arabic',
};

// Fetch EN source from Supabase REST
async function fetchEn(slug) {
  const url = `${SUPABASE_URL}/rest/v1/blog_posts?slug=eq.${slug}&lang=eq.en&select=*`;
  const r = await fetch(url, { headers: { apikey: ANON, Authorization: `Bearer ${ANON}` } });
  const data = await r.json();
  return data[0];
}

async function translate(text, targetLang) {
  const prompt = `Translate the following article from English to ${targetLang}. Preserve ALL HTML tags exactly (h2, h3, h4, p, ul, ol, li, table, tr, td, th, b, i, blockquote, div, class names, hr, etc). Do NOT translate inside code blocks or technical terms like "VPA", "Wyckoff", "0DTE", "EOD", "Prop Firm", "drawdown", "split", "Profit Split", "Trustpilot", coupon codes (MARKET, MARKETS026158, etc), or firm names. Output ONLY the translated HTML, no explanations, no markdown code fences.\n\n---ARTICLE START---\n${text}\n---ARTICLE END---`;

  const body = {
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: { temperature: 0.2, maxOutputTokens: 65536 },
  };

  const r = await fetch(VERTEX, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  if (!r.ok) { console.error('  HTTP', r.status, (await r.text()).slice(0, 300)); return null; }
  const data = await r.json();
  const out = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!out) { console.error('  no content'); return null; }
  // Strip leading/trailing code fences if any
  return out.replace(/^```html?\s*/m, '').replace(/```\s*$/m, '').trim();
}

async function translateField(text, targetLang) {
  if (!text) return text;
  const prompt = `Translate to ${targetLang}. Output ONLY the translation, no explanations. Keep technical terms (VPA, Wyckoff, etc) untranslated: ${text}`;
  const body = { contents: [{ role: 'user', parts: [{ text: prompt }] }], generationConfig: { temperature: 0.2, maxOutputTokens: 1024 } };
  const r = await fetch(VERTEX, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  if (!r.ok) return text;
  const data = await r.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || text;
}

async function upsert(post) {
  const r = await fetch(`${SUPABASE_URL}/functions/v1/blog-bulk-upsert`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ANON}`, apikey: ANON },
    body: JSON.stringify({ posts: [post] }),
  });
  return r.ok;
}

const ONLY_LANG = process.argv[2]; // optional filter
const ONLY_SLUG = process.argv[3];

const targetLangs = ONLY_LANG ? [ONLY_LANG] : Object.keys(LANGS);
const targetSlugs = ONLY_SLUG ? [ONLY_SLUG] : SLUGS;

for (const slug of targetSlugs) {
  console.error(`\n=== ${slug} ===`);
  const en = await fetchEn(slug);
  if (!en) { console.error('  EN source not found'); continue; }
  console.error(`  EN body: ${en.body.length} chars`);

  for (const lang of targetLangs) {
    console.error(`  → ${lang} (${LANGS[lang]})`);
    const t0 = Date.now();
    const tBody = await translate(en.body, LANGS[lang]);
    if (!tBody || tBody.length < en.body.length * 0.4) {
      console.error(`    skip — output too short (${tBody?.length || 0} vs en ${en.body.length})`);
      continue;
    }
    const tTitle = await translateField(en.title, LANGS[lang]);
    const tExcerpt = await translateField(en.excerpt, LANGS[lang]);
    const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
    console.error(`    translated in ${elapsed}s → body ${tBody.length} chars`);

    const ok = await upsert({
      slug, lang, title: tTitle, category: en.category, level: en.level, read_time: en.read_time,
      body: tBody, excerpt: tExcerpt, icon: en.icon, cover_url: en.cover_url,
      sort_order: en.sort_order, author: en.author,
    });
    console.error(`    upsert: ${ok ? 'OK' : 'FAIL'}`);
  }
}
console.error('\nDone.');
