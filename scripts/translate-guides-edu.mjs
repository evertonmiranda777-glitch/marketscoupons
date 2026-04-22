#!/usr/bin/env node
/**
 * translate-guides-edu.mjs — Traduz guias educacionais (G1-G5) via Gemini 2.5 Flash.
 *
 * Uso:
 *   node scripts/translate-guides-edu.mjs             # traduz todos os faltantes
 *   node scripts/translate-guides-edu.mjs g1 en       # só G1 em EN
 *   node scripts/translate-guides-edu.mjs g3          # G3 em todos os idiomas faltantes
 *
 * Requer GEMINI_API_KEY em ~/.nano-banana/.env
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

// ─── Config ────────────────────────────────────────────────────────────

const ENV_FILE = path.join(process.env.HOME || process.env.USERPROFILE, '.nano-banana', '.env');
function loadEnv() {
  const txt = fs.readFileSync(ENV_FILE, 'utf8');
  for (const line of txt.split('\n')) {
    const m = line.match(/^([A-Z_]+)\s*=\s*(.*)$/);
    if (m) process.env[m[1]] = m[2].trim();
  }
}
loadEnv();
const KEY = process.env.GEMINI_API_KEY;
if (!KEY) { console.error('Falta GEMINI_API_KEY'); process.exit(1); }

const MODEL = 'gemini-2.5-flash';
const API = `https://aiplatform.googleapis.com/v1/publishers/google/models/${MODEL}:generateContent?key=${KEY}`;

// Guias (pt slug = slug universal, mantido em todas as línguas)
const GUIDES = [
  { id: 'g1', slug: 'o-que-e-uma-prop-firm' },
  { id: 'g2', slug: 'como-passar-no-desafio' },
  { id: 'g3', slug: 'gerenciamento-drawdown' },
  { id: 'g4', slug: 'position-sizing' },
  { id: 'g5', slug: 'como-sacar-lucros' },
  { id: 'cmp1', slug: 'comparativo-apex-tpt-bulenox' },
  { id: 'tdy', slug: 'tradeday-review' },
];

const LANGS = [
  { code: 'en', name: 'English', locale: 'en_US', dir: 'ltr' },
  { code: 'pt', name: 'Portuguese (Brazil)', locale: 'pt_BR', dir: 'ltr' },
  { code: 'es', name: 'Spanish (Spain)', locale: 'es_ES', dir: 'ltr' },
  { code: 'it', name: 'Italian', locale: 'it_IT', dir: 'ltr' },
  { code: 'fr', name: 'French', locale: 'fr_FR', dir: 'ltr' },
  { code: 'de', name: 'German', locale: 'de_DE', dir: 'ltr' },
  { code: 'ar', name: 'Arabic', locale: 'ar_AR', dir: 'rtl' },
];

// ─── Core ──────────────────────────────────────────────────────────────

function buildPrompt(html, lang) {
  return `You are a professional translator specialized in financial/trading content.

TASK: Translate this HTML page from Portuguese (Brazil) to ${lang.name}.

STRICT RULES:
1. Preserve ALL HTML tags, attributes, CSS, <script>, <style> blocks EXACTLY.
2. Translate ONLY visible text content + these attributes: title, alt, content (for <meta>), placeholder, aria-label.
3. Inside JSON-LD schema.org blocks, translate string VALUES only (not keys, not URLs, not dates).
4. DO NOT translate these technical terms: "Prop Firm", "Prop Firms", "Profit Split", "Drawdown", "Lifetime", "Trailing", "Static", "EOD", "Futuros" (keep as "Futures" in EN, else keep as-is), "Forex", "CFD", "Rithmic", "Tradovate", "NinjaTrader", "MetaTrader", "cTrader", "Markets Coupons", "MarketsCoupons", firm names (Apex, Bulenox, FTMO, etc), ticker symbols.
5. DO NOT translate URLs, CSS classes, IDs, JavaScript code, hex colors.
6. DO NOT translate image filenames or paths.
7. Update these specific elements for target language:
   - <html lang="pt"> → <html lang="${lang.code}">
   - <html ... dir="ltr"> → <html ... dir="${lang.dir}">
   - All canonical/og:url: "marketscoupons.com/guides/" → "marketscoupons.com/${lang.code}/guides/"
   - Schema.org "@id" and "url" fields: same URL prefix update
   - Schema.org "inLanguage": "${lang.code}"
   - <meta property="og:locale" content="pt_BR"> → content="${lang.locale}"
   - hreflang links: keep ALL hreflang lines IDENTICAL to source (they point to all langs, don't touch)
   - hreflang="x-default" href stays pointing to "/guides/" (PT = default)
8. Keep coupon codes ("MARKET", "MARKET89", etc), prices ($XX), percentages, and numeric data EXACTLY.
9. Output ONLY the translated HTML, no markdown fences, no commentary.

SOURCE HTML:
${html}`;
}

async function callGemini(prompt) {
  const body = {
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0.2,
      maxOutputTokens: 65536,
      responseMimeType: 'text/plain',
    },
  };
  const resp = await fetch(API, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!resp.ok) {
    const t = await resp.text();
    throw new Error(`Gemini ${resp.status}: ${t.slice(0, 500)}`);
  }
  const data = await resp.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error('Resposta Gemini vazia: ' + JSON.stringify(data).slice(0, 500));
  return text.trim().replace(/^```html\n?/i, '').replace(/```\s*$/, '').trim();
}

function sanitize(html, lang) {
  // Safety net: force critical attrs even if Gemini slipped
  let h = html;
  h = h.replace(/<html\s+lang="pt"/i, `<html lang="${lang.code}"`);
  h = h.replace(/<html([^>]*?)\sdir="ltr"/i, `<html$1 dir="${lang.dir}"`);
  h = h.replace(/og:locale"\s+content="pt_BR"/g, `og:locale" content="${lang.locale}"`);
  return h;
}

async function translateFile(srcPath, dstPath, lang) {
  const src = fs.readFileSync(srcPath, 'utf8');
  console.log(`  → ${lang.code.toUpperCase()} (${(src.length/1024).toFixed(1)}kb in)`);
  const prompt = buildPrompt(src, lang);
  const out = await callGemini(prompt);
  const cleaned = sanitize(out, lang);
  if (cleaned.length < src.length * 0.85) {
    throw new Error(`Saída suspeitamente curta (provável truncamento): ${cleaned.length}b vs ${src.length}b origem`);
  }
  fs.mkdirSync(path.dirname(dstPath), { recursive: true });
  fs.writeFileSync(dstPath, cleaned, 'utf8');
  console.log(`    ✓ ${(cleaned.length/1024).toFixed(1)}kb out`);
}

// ─── CLI ───────────────────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2).map(a => a.toLowerCase());
  const filterGuide = args.find(a => /^(g[1-5]|cmp\d+|tdy)$/.test(a));
  const filterLang = args.find(a => LANGS.some(l => l.code === a));

  const guides = filterGuide ? GUIDES.filter(g => g.id === filterGuide) : GUIDES;
  const langs = filterLang ? LANGS.filter(l => l.code === filterLang) : LANGS;

  let total = 0, done = 0, skipped = 0, failed = 0;
  for (const g of guides) {
    const srcPath = path.join(ROOT, 'guides', `${g.slug}.html`);
    if (!fs.existsSync(srcPath)) {
      console.warn(`Skip ${g.id}: source missing ${srcPath}`);
      continue;
    }
    console.log(`\n=== ${g.id.toUpperCase()} (${g.slug}) ===`);
    for (const lang of langs) {
      total++;
      const dstPath = path.join(ROOT, lang.code, 'guides', `${g.slug}.html`);
      if (fs.existsSync(dstPath) && !args.includes('--force')) {
        console.log(`  skip ${lang.code} (exists)`);
        skipped++;
        continue;
      }
      try {
        await translateFile(srcPath, dstPath, lang);
        done++;
      } catch (e) {
        console.error(`  ✗ ${lang.code}: ${e.message}`);
        failed++;
      }
    }
  }
  console.log(`\n===== DONE: ${done}/${total} (skipped ${skipped}, failed ${failed}) =====`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch(e => { console.error(e); process.exit(1); });
