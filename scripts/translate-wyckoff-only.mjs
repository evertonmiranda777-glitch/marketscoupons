#!/usr/bin/env node
// Translate ONLY wyckoff-method-2026 EN → 6 langs via Gemini Flash
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
if (!KEY) { console.error('GEMINI_API_KEY missing'); process.exit(1); }

const SUPABASE_URL = 'https://qfwhduvutfumsaxnuofa.supabase.co';
const ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFmd2hkdXZ1dGZ1bXNheG51b2ZhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQzNzc5NDYsImV4cCI6MjA4OTk1Mzk0Nn0.efRel6U68misvPSRj8-p31-gOhzjXN4eIFMiloTNyk4';
const VERTEX = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${KEY}`;

const SLUG = 'wyckoff-method-2026';
const LANGS = { pt:'Portuguese (Brazil)', es:'Spanish (Spain)', fr:'French', it:'Italian', de:'German', ar:'Arabic' };

// Fetch EN article
const enRes = await fetch(`${SUPABASE_URL}/rest/v1/blog_posts?slug=eq.${SLUG}&lang=eq.en&select=*`, {
  headers: { apikey: ANON, Authorization: `Bearer ${ANON}` }
});
const [en] = await enRes.json();
if (!en) { console.error('EN article not found'); process.exit(1); }
console.error(`EN body: ${en.body.length} chars · title: ${en.title.slice(0,50)}...`);

async function gemini(prompt, maxOut = 65536) {
  for (let attempt = 0; attempt < 3; attempt++) {
    const r = await fetch(VERTEX, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.2, maxOutputTokens: maxOut },
      }),
    });
    if (!r.ok) {
      console.error(`  HTTP ${r.status} attempt ${attempt+1}`);
      if (attempt < 2) { await new Promise(r => setTimeout(r, 5000)); continue; }
      console.error((await r.text()).slice(0,400));
      return null;
    }
    const j = await r.json();
    const text = j.candidates?.[0]?.content?.parts?.[0]?.text;
    if (text) return text;
  }
  return null;
}

const PROMPT = (lang, title, excerpt, body) => `You are translating a trading-blog article from English into ${lang}. RULES:
- Translate ALL prose, headings, FAQ questions and answers, table content.
- Preserve ALL HTML tags exactly (do not translate tag names or attributes).
- Preserve ALL <img>, <figure>, <svg>, JSON-LD <script> blocks UNCHANGED.
- Preserve technical terms: "Prop Firm", "Profit Split", "Drawdown", "Lifetime", "Spring", "UTAD", "Wyckoff", "SOS", "LPS", "JOC".
- Keep CSS class names and IDs unchanged.
- Output ONLY the translated HTML body. No surrounding commentary, no \`\`\`html fences.

TITLE: ${title}
EXCERPT: ${excerpt}

ARTICLE HTML:
${body}`;

for (const [lang, langName] of Object.entries(LANGS)) {
  console.error(`\n[${lang}] translating...`);
  const t0 = Date.now();
  const [titleT, excerptT, bodyT] = await Promise.all([
    gemini(`Translate this trading-blog article title to ${langName}. Preserve technical terms (Wyckoff, Spring, etc). Output ONLY the translated title, no quotes:\n\n${en.title}`, 512),
    gemini(`Translate this trading-blog article excerpt to ${langName}. Preserve technical terms. Output ONLY the translated excerpt:\n\n${en.excerpt}`, 512),
    gemini(PROMPT(langName, en.title, en.excerpt, en.body)),
  ]);
  if (!titleT || !bodyT) { console.error(`  FAILED for ${lang}`); continue; }

  const post = {
    slug: SLUG, lang,
    title: titleT.trim(),
    excerpt: (excerptT || en.excerpt).trim(),
    body: bodyT.trim().replace(/^```html\s*/i, '').replace(/```\s*$/i, ''),
    category: en.category, level: en.level, read_time: en.read_time, icon: en.icon,
    cover_url: en.cover_url, sort_order: en.sort_order, author: en.author, active: true,
  };

  const up = await fetch(`${SUPABASE_URL}/functions/v1/blog-bulk-upsert`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ANON}`, apikey: ANON },
    body: JSON.stringify({ posts: [post] }),
  });
  const upText = await up.text();
  console.error(`  ${lang}: HTTP ${up.status} · body ${post.body.length} chars · ${((Date.now()-t0)/1000).toFixed(1)}s`);
  console.error(`  ${upText.slice(0,200)}`);
}
console.error('\nDone.');
