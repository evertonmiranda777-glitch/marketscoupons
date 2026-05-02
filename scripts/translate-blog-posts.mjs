#!/usr/bin/env node
/**
 * translate-blog-posts.mjs — Traduz posts PT-only do blog_posts via Gemini 2.5 Flash.
 *
 * Uso:
 *   node scripts/translate-blog-posts.mjs                      # todos faltantes
 *   node scripts/translate-blog-posts.mjs <pt-slug>             # só esse slug pra todos os idiomas
 *   node scripts/translate-blog-posts.mjs <pt-slug> en          # só en
 *
 * Requer GEMINI_API_KEY em ~/.nano-banana/.env
 * Service role do Supabase em SUPABASE_SERVICE_ROLE (env)
 */

import fs from 'node:fs';
import path from 'node:path';

// Load env
const ENV_FILE = path.join(process.env.HOME || process.env.USERPROFILE, '.nano-banana', '.env');
try {
  const txt = fs.readFileSync(ENV_FILE, 'utf8');
  for (const line of txt.split('\n')) {
    const m = line.match(/^([A-Z_]+)\s*=\s*(.*)$/);
    if (m) process.env[m[1]] = m[2].trim();
  }
} catch {}

const GEMINI_KEY = process.env.GEMINI_API_KEY;
const SR = process.env.SUPABASE_SERVICE_ROLE;
const SB_URL = 'https://qfwhduvutfumsaxnuofa.supabase.co';

if (!GEMINI_KEY) { console.error('GEMINI_API_KEY missing'); process.exit(1); }
if (!SR) { console.error('SUPABASE_SERVICE_ROLE missing in env'); process.exit(1); }

const MODEL = 'gemini-2.5-flash';
// Vertex AI endpoint (a key restrita pos-hardening 2026-04-27 — generativelanguage.googleapis.com bloqueada)
const API = `https://aiplatform.googleapis.com/v1/publishers/google/models/${MODEL}:generateContent?key=${GEMINI_KEY}`;

const LANGS = {
  en: { name: 'English (US)', tone: 'natural, professional trading copy, no AI tells' },
  es: { name: 'Spanish (LatAm/Spain neutral)', tone: 'natural, professional' },
  fr: { name: 'French', tone: 'natural, professional' },
  de: { name: 'German', tone: 'natural, professional' },
  it: { name: 'Italian', tone: 'natural, professional' },
  ar: { name: 'Arabic (MSA)', tone: 'natural, professional, RTL-aware' },
};

// PT-only posts elegíveis pra tradução. Excluído gestao-fiscal-* (BR-specific).
const PT_SLUGS = [
  'de-50k-para-300k-scaling-plans',
  'multi-accounting-vale-o-risco',
  'operando-3-mesas-simultaneamente',
];

// Slug mapping per language (pretty URLs)
const SLUG_MAP = {
  'de-50k-para-300k-scaling-plans': {
    en: 'from-50k-to-300k-scaling-plans',
    es: 'de-50k-a-300k-planes-de-escalamiento',
    fr: 'de-50k-a-300k-plans-de-scaling',
    de: 'von-50k-bis-300k-scaling-plaene',
    it: 'da-50k-a-300k-piani-di-scaling',
    ar: 'from-50k-to-300k-scaling-arabic',
  },
  'multi-accounting-vale-o-risco': {
    en: 'multi-accounting-prop-firms-risks-rules',
    es: 'multi-accounting-prop-firms-reglas-riesgos',
    fr: 'multi-accounting-prop-firms-regles-risques',
    de: 'multi-accounting-prop-firms-regeln-risiken',
    it: 'multi-accounting-prop-firms-regole-rischi',
    ar: 'multi-accounting-prop-firms-arabic',
  },
  'operando-3-mesas-simultaneamente': {
    en: 'trading-3-prop-firms-simultaneously',
    es: 'operando-3-mesas-simultaneamente-es',
    fr: 'trader-3-prop-firms-simultanement',
    de: 'mit-3-prop-firms-gleichzeitig-traden',
    it: 'operando-3-prop-firms-simultaneamente',
    ar: 'trading-3-prop-firms-arabic',
  },
};

async function fetchPost(slug, lang = 'pt') {
  const url = `${SB_URL}/rest/v1/blog_posts?slug=eq.${encodeURIComponent(slug)}&lang=eq.${lang}&select=*`;
  const r = await fetch(url, { headers: { apikey: SR, Authorization: `Bearer ${SR}` } });
  const d = await r.json();
  return d[0] || null;
}

async function postExists(slug, lang) {
  const url = `${SB_URL}/rest/v1/blog_posts?slug=eq.${encodeURIComponent(slug)}&lang=eq.${lang}&select=id`;
  const r = await fetch(url, { headers: { apikey: SR, Authorization: `Bearer ${SR}` } });
  const d = await r.json();
  return d.length > 0;
}

async function insertPost(row) {
  const r = await fetch(`${SB_URL}/rest/v1/blog_posts`, {
    method: 'POST',
    headers: {
      apikey: SR, Authorization: `Bearer ${SR}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    },
    body: JSON.stringify(row),
  });
  if (!r.ok) throw new Error(`insert failed ${r.status}: ${await r.text()}`);
  return r.json();
}

async function translate(srcText, targetLang, fieldHint, contextHint = '') {
  const lang = LANGS[targetLang];
  if (!lang) throw new Error(`unknown lang ${targetLang}`);
  const prompt = `You are a professional translator for a prop trading blog (markets coupons).
Translate the following ${fieldHint} from Brazilian Portuguese to ${lang.name}.

Rules:
- Preserve ALL HTML tags exactly (h2, p, strong, em, ul, li, etc).
- Keep proper nouns: Apex, Bulenox, FTMO, FundedNext, TradeDay, Take Profit Trader, Earn2Trade, The5ers, FundingPips, BrightFunded, E8, CTI.
- Keep technical terms in English: prop firm, drawdown, profit split, scaling, lifetime, payout, SL, TP, news trading, position size, evaluation, challenge.
- Use ${lang.tone}.
- DO NOT add introductions, explanations, or AI disclaimers. Output ONLY the translation.
- Currency stays in USD ($) unless contextually different.
${contextHint}

INPUT:
${srcText}`;

  const r = await fetch(API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 65536,
        responseMimeType: 'text/plain',
      },
    }),
  });
  const j = await r.json();
  if (!r.ok) throw new Error(`gemini ${r.status}: ${JSON.stringify(j).slice(0, 300)}`);
  const text = j.candidates?.[0]?.content?.parts?.[0]?.text || '';
  if (!text) throw new Error(`empty translation: ${JSON.stringify(j).slice(0, 300)}`);
  // Truncation safety
  if (text.length < srcText.length * 0.6) {
    throw new Error(`possibly truncated (${text.length} < ${srcText.length * 0.6})`);
  }
  return text.trim();
}

async function translatePost(ptPost, targetLang) {
  const slugMap = SLUG_MAP[ptPost.slug];
  if (!slugMap) throw new Error(`no slug map for ${ptPost.slug}`);
  const newSlug = slugMap[targetLang];
  if (!newSlug) throw new Error(`no ${targetLang} slug for ${ptPost.slug}`);

  if (await postExists(newSlug, targetLang)) {
    console.log(`  [SKIP] ${newSlug} (${targetLang}) — already exists`);
    return null;
  }

  console.log(`  Translating to ${targetLang}...`);
  const [title, excerpt, body] = await Promise.all([
    translate(ptPost.title, targetLang, 'article title', ''),
    translate(ptPost.excerpt || '', targetLang, 'article excerpt', ''),
    translate(ptPost.body || '', targetLang, 'article body (HTML)', 'Maintain HTML structure.'),
  ]);

  const newRow = {
    title,
    slug: newSlug,
    category: ptPost.category,
    level: ptPost.level,
    read_time: ptPost.read_time,
    body,
    excerpt,
    icon: ptPost.icon,
    active: ptPost.active,
    ai_generated: true,
    sort_order: ptPost.sort_order,
    lang: targetLang,
    article_group: ptPost.article_group,
    cover_url: ptPost.cover_url || null,
    author: ptPost.author,
  };

  const inserted = await insertPost(newRow);
  console.log(`  [OK] ${newSlug} (${targetLang}) inserted`);
  return inserted;
}

(async () => {
  const args = process.argv.slice(2);
  const targetSlug = args[0]; // optional
  const targetLang = args[1]; // optional

  const slugs = targetSlug ? [targetSlug] : PT_SLUGS;
  const langs = targetLang ? [targetLang] : Object.keys(LANGS);

  let success = 0, fail = 0, skip = 0;
  for (const slug of slugs) {
    console.log(`\n=== ${slug} ===`);
    const pt = await fetchPost(slug, 'pt');
    if (!pt) { console.error(`  PT post not found: ${slug}`); fail++; continue; }
    for (const lang of langs) {
      try {
        const r = await translatePost(pt, lang);
        if (r) success++; else skip++;
      } catch (e) {
        console.error(`  [FAIL] ${slug} -> ${lang}: ${e.message}`);
        fail++;
      }
    }
  }
  console.log(`\nDone. Success=${success} Skip=${skip} Fail=${fail}`);
})();
