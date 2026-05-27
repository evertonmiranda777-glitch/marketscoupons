#!/usr/bin/env node
// Translate 7 EN articles → 6 langs via Gemini Flash with proper rate limiting + retry
// Skips Wyckoff PT (already done) and Wyckoff itself (was already done in earlier run for PT)
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
if (!KEY) { console.error('KEY missing'); process.exit(1); }

const URL_SB = 'https://qfwhduvutfumsaxnuofa.supabase.co';
const ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFmd2hkdXZ1dGZ1bXNheG51b2ZhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQzNzc5NDYsImV4cCI6MjA4OTk1Mzk0Nn0.efRel6U68misvPSRj8-p31-gOhzjXN4eIFMiloTNyk4';
const VERTEX = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${KEY}`;

const SLUGS = [
  'wyckoff-method-2026',  // need ES/IT/FR/DE/AR (PT already done)
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

async function gemini(prompt, maxOut = 65536) {
  for (let attempt = 0; attempt < 6; attempt++) {
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
    } else if (r.status === 429) {
      const backoff = 15000 * (attempt + 1); // 15s, 30s, 45s, 60s, 75s, 90s
      console.error(`  429 backoff ${backoff/1000}s...`);
      await sleep(backoff);
      continue;
    } else {
      console.error(`  HTTP ${r.status}`);
      const t = await r.text();
      console.error(`  ${t.slice(0,200)}`);
      return null;
    }
  }
  return null;
}

const PROMPT = (lang, title, excerpt, body) => `You are translating a trading-blog article from English into ${lang}. RULES:
- Translate ALL prose, headings, FAQ questions and answers, table content.
- Preserve ALL HTML tags exactly (do not translate tag names or attributes).
- Preserve ALL <img>, <figure>, <svg>, JSON-LD <script> blocks UNCHANGED.
- Preserve technical terms: "Prop Firm", "Profit Split", "Drawdown", "Lifetime", "Spring", "UTAD", "Wyckoff", "SOS", "LPS", "JOC", "1R", "POC", "VAH", "VAL", "CVD", "GEX", "0DTE", "Elliott", "ATR".
- Keep CSS class names and IDs unchanged.
- Output ONLY the translated HTML body. No surrounding commentary, no markdown fences.

TITLE: ${title}
EXCERPT: ${excerpt}

ARTICLE HTML:
${body}`;

async function fetchEN(slug) {
  const r = await fetch(`${URL_SB}/rest/v1/blog_posts?slug=eq.${slug}&lang=eq.en&select=*`, {
    headers: { apikey: ANON, Authorization: `Bearer ${ANON}` }
  });
  const arr = await r.json();
  return arr[0];
}

async function checkExists(slug, lang) {
  const r = await fetch(`${URL_SB}/rest/v1/blog_posts?slug=eq.${slug}&lang=eq.${lang}&select=slug,lang,active,body`, {
    headers: { apikey: ANON, Authorization: `Bearer ${ANON}` }
  });
  const arr = await r.json();
  return arr[0];
}

let totalSuccess = 0, totalFailed = 0;

for (const slug of SLUGS) {
  console.error(`\n========== ${slug} ==========`);
  const en = await fetchEN(slug);
  if (!en) { console.error(`  EN missing — skip`); continue; }

  for (const [lang, langName] of Object.entries(LANGS)) {
    // Skip if already exists with 20+ SVGs AND active
    const existing = await checkExists(slug, lang);
    if (existing && existing.active && (existing.body || '').match(/figure class="diagram"/g)?.length >= 18) {
      console.error(`  [${lang}] already has ${(existing.body.match(/figure class="diagram"/g) || []).length} SVGs · SKIP`);
      continue;
    }

    console.error(`  [${lang}] translating ${en.body.length} chars...`);
    const t0 = Date.now();

    const [titleT, bodyT] = await Promise.all([
      gemini(`Translate to ${langName}. Preserve technical terms. Output ONLY the translation, no quotes:\n\n${en.title}`, 512),
      gemini(PROMPT(langName, en.title, en.excerpt, en.body)),
    ]);

    if (!titleT || !bodyT) {
      console.error(`  [${lang}] FAILED`);
      totalFailed++;
      await sleep(5000);
      continue;
    }

    const excerptT = await gemini(`Translate to ${langName}. Output ONLY the translation:\n\n${en.excerpt}`, 512);

    const post = {
      slug, lang,
      title: titleT.trim(),
      excerpt: (excerptT || en.excerpt).trim(),
      body: bodyT.trim().replace(/^```html\s*/i, '').replace(/```\s*$/i, ''),
      category: en.category, level: en.level, read_time: en.read_time, icon: en.icon,
      cover_url: en.cover_url, sort_order: en.sort_order, author: en.author, active: true,
    };

    const up = await fetch(`${URL_SB}/functions/v1/blog-bulk-upsert`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ANON}`, apikey: ANON },
      body: JSON.stringify({ posts: [post] }),
    });
    if (up.ok) {
      console.error(`  [${lang}] OK · body ${post.body.length} · ${((Date.now()-t0)/1000).toFixed(1)}s`);
      totalSuccess++;
    } else {
      console.error(`  [${lang}] upload FAILED ${up.status}`);
      totalFailed++;
    }

    await sleep(5000); // 5s between langs to stay under 15 RPM
  }
}

console.error(`\nDONE · success ${totalSuccess} · failed ${totalFailed}`);
