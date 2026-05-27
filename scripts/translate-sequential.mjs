#!/usr/bin/env node
// Pure sequential translation · 12s sleep between calls · 5 RPM (under 15 RPM free limit)
// Resumes by checking existing rows with 18+ SVGs
import fs from 'node:fs';
import path from 'node:path';

const ENV_TMP = path.join(process.cwd(), '.env.tmp.txt');
let KEY = process.env.GEMINI_API_KEY;
try {
  const txt = fs.readFileSync(ENV_TMP, 'utf8');
  const m = txt.match(/GEMINI_API_KEY\s*=\s*"?([^"\n]+)"?/);
  if (m) {
    const keys = m[1].split(',').map(s => s.trim()).filter(k => k.startsWith('AIzaSy'));
    if (keys.length) KEY = keys[0];
  }
} catch {}

const URL_SB = 'https://qfwhduvutfumsaxnuofa.supabase.co';
const ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFmd2hkdXZ1dGZ1bXNheG51b2ZhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQzNzc5NDYsImV4cCI6MjA4OTk1Mzk0Nn0.efRel6U68misvPSRj8-p31-gOhzjXN4eIFMiloTNyk4';
const VERTEX = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${KEY}`;

const SLUGS = [
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

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function geminiOne(prompt, maxOut = 65536) {
  for (let attempt = 0; attempt < 8; attempt++) {
    const r = await fetch(VERTEX, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.2, maxOutputTokens: maxOut },
      }),
    });
    if (r.ok) {
      const j = await r.json();
      const text = j.candidates?.[0]?.content?.parts?.[0]?.text;
      if (text) return text;
      console.error(`  empty body, retry...`);
      await sleep(8000);
      continue;
    }
    if (r.status === 429) {
      const backoff = Math.min(60000, 10000 * (attempt + 1)); // 10s → 60s cap
      console.error(`  429 backoff ${backoff/1000}s (attempt ${attempt+1})...`);
      await sleep(backoff);
      continue;
    }
    if (r.status >= 500) {
      console.error(`  ${r.status} retry...`);
      await sleep(5000);
      continue;
    }
    console.error(`  HTTP ${r.status} non-retryable`);
    return null;
  }
  return null;
}

const PROMPT = (lang, title, body) => `Translate this trading-blog article from English to ${lang}.
RULES:
- Translate ALL prose, headings, FAQ content
- Preserve ALL HTML tags exactly (do not change tag names, attributes, classes, ids)
- Preserve <img>, <figure>, <svg>, JSON-LD <script> blocks UNCHANGED
- Preserve technical terms verbatim: Prop Firm, Profit Split, Drawdown, Lifetime, Spring, UTAD, Wyckoff, SOS, LPS, JOC, 1R, POC, VAH, VAL, CVD, GEX, 0DTE, Elliott, ATR
- Output ONLY translated HTML — no commentary, no markdown fences

TITLE: ${title}

ARTICLE:
${body}`;

async function fetchEN(slug) {
  const r = await fetch(`${URL_SB}/rest/v1/blog_posts?slug=eq.${slug}&lang=eq.en&select=*`, {
    headers: { apikey: ANON, Authorization: `Bearer ${ANON}` }
  });
  return (await r.json())[0];
}
async function checkExists(slug, lang) {
  const r = await fetch(`${URL_SB}/rest/v1/blog_posts?slug=eq.${slug}&lang=eq.${lang}&select=slug,active,body`, {
    headers: { apikey: ANON, Authorization: `Bearer ${ANON}` }
  });
  return (await r.json())[0];
}

let ok = 0, skip = 0, fail = 0;
const t0_global = Date.now();

for (const slug of SLUGS) {
  console.error(`\n=== ${slug} ===`);
  const en = await fetchEN(slug);
  if (!en) { console.error(`  no EN row`); continue; }

  for (const [lang, langName] of Object.entries(LANGS)) {
    const existing = await checkExists(slug, lang);
    const svgs = (existing?.body || '').match(/figure class="diagram"/g)?.length || 0;
    if (existing && existing.active && svgs >= 18) {
      console.error(`  [${lang}] SKIP (${svgs} svgs)`);
      skip++;
      continue;
    }

    console.error(`  [${lang}] start (en body ${en.body.length} chars)`);
    const tL = Date.now();

    const titleT = await geminiOne(`Translate to ${langName}. Preserve technical terms. Output only the translated title:\n\n${en.title}`, 512);
    if (!titleT) { console.error(`  [${lang}] title FAIL`); fail++; continue; }
    await sleep(12000);

    const bodyT = await geminiOne(PROMPT(langName, en.title, en.body));
    if (!bodyT) { console.error(`  [${lang}] body FAIL`); fail++; continue; }
    await sleep(12000);

    const excerptT = await geminiOne(`Translate to ${langName}. Output only the translation:\n\n${en.excerpt}`, 512) || en.excerpt;
    await sleep(12000);

    const post = {
      slug, lang,
      title: titleT.trim(),
      excerpt: excerptT.trim(),
      body: bodyT.trim().replace(/^```html\s*/i, '').replace(/```\s*$/i, ''),
      category: en.category, level: en.level, read_time: en.read_time, icon: en.icon,
      cover_url: en.cover_url, sort_order: en.sort_order, author: en.author, active: true,
    };

    const up = await fetch(`${URL_SB}/functions/v1/blog-bulk-upsert`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ANON}`, apikey: ANON },
      body: JSON.stringify({ posts: [post] }),
    });
    const upText = await up.text();
    if (up.ok) {
      const svgsOut = (post.body.match(/figure class="diagram"/g) || []).length;
      console.error(`  [${lang}] OK · ${post.body.length} chars · ${svgsOut} svgs · ${((Date.now()-tL)/1000).toFixed(1)}s`);
      ok++;
    } else {
      console.error(`  [${lang}] upload FAIL ${up.status}: ${upText.slice(0,150)}`);
      fail++;
    }
  }
}

console.error(`\n=== DONE in ${((Date.now()-t0_global)/60000).toFixed(1)} min · OK=${ok} SKIP=${skip} FAIL=${fail} ===`);
