#!/usr/bin/env node
// Traduz as 132 paginas /compare/*.html (PT) para EN/ES/FR/IT/DE/AR via Vertex Gemini.
// Output: /<lang>/compare/<file>.html
// Uso: node scripts/translate-compare-pages.mjs [lang]
//   lang opcional: en, es, fr, it, de, ar (sem = todos)

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

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

const VERTEX = `https://aiplatform.googleapis.com/v1/publishers/google/models/gemini-2.5-flash:generateContent?key=${KEY}`;

const LANGS = {
  en: { name: 'English', code: 'en', locale: 'en-US' },
  es: { name: 'Spanish (Spain)', code: 'es', locale: 'es-ES' },
  fr: { name: 'French', code: 'fr', locale: 'fr-FR' },
  it: { name: 'Italian', code: 'it', locale: 'it-IT' },
  de: { name: 'German', code: 'de', locale: 'de-DE' },
  ar: { name: 'Arabic', code: 'ar', locale: 'ar-SA' },
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

async function translate(html, langName, langCode, locale) {
  const prompt = `You are a professional translator. Translate the visible TEXT CONTENT of this Brazilian Portuguese HTML page into ${langName}.

CRITICAL RULES:
1. Keep ALL HTML tags, attributes, classes, IDs, scripts, styles, JSON-LD UNCHANGED.
2. Translate ONLY user-visible text content (between tags), <title>, meta descriptions, alt attributes, aria-labels.
3. NEVER translate technical terms: "Prop Firm", "Profit Split", "Drawdown", "Lifetime", "Day-1 Payout", "Forex", "Futures", "Trustpilot", "Markets Coupons", firm names (Apex, FTMO, Bulenox, etc), coupon codes (MARKET, MARKET89, etc), instrument symbols.
4. Keep dollar/euro amounts EXACT. Keep all numbers and percentages exact.
5. Update lang attribute: html lang="pt-BR" -> "${locale}".
6. Update locale references: pt_BR -> ${langCode === 'en' ? 'en_US' : langCode === 'es' ? 'es_ES' : langCode === 'fr' ? 'fr_FR' : langCode === 'it' ? 'it_IT' : langCode === 'de' ? 'de_DE' : 'ar_SA'}, pt-BR -> ${locale}.
7. Update canonical and alternate URLs: prepend /${langCode}/ to firm-vs-firm path. Example: /apex-vs-bulenox -> /${langCode}/apex-vs-bulenox. Update og:url, hreflang too.
8. Translate naturally for native ${langName} traders. Idiomatic, not literal.
9. Output ONLY the full translated HTML. No preamble, no explanation, no markdown fences.

INPUT HTML:
${html}`;

  const res = await fetch(VERTEX, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: { maxOutputTokens: 65536, temperature: 0.2 },
    }),
  });
  if (!res.ok) throw new Error(`gemini ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const data = await res.json();
  let txt = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!txt) throw new Error('empty translation');
  txt = txt.replace(/^```html\s*/i, '').replace(/^```\s*/, '').replace(/\s*```\s*$/, '').trim();
  if (!txt.startsWith('<!DOCTYPE')) throw new Error('not HTML: ' + txt.slice(0, 100));
  if (txt.length < html.length * 0.55) throw new Error(`truncated ${txt.length} vs ${html.length}`);
  return txt;
}

async function processLang(langCode, lang, files) {
  const outDir = path.join(ROOT, langCode, 'compare');
  fs.mkdirSync(outDir, { recursive: true });
  let done = 0, skipped = 0, failed = 0;
  // Run 4 in parallel per language to balance speed and rate limits
  const queue = [...files];
  const workers = Array(4).fill(0).map(async () => {
    while (queue.length) {
      const file = queue.shift();
      if (!file) break;
      const outPath = path.join(outDir, file);
      if (fs.existsSync(outPath) && fs.statSync(outPath).size > 5000) {
        skipped++;
        continue;
      }
      let attempt = 0;
      while (attempt < 2) {
        try {
          attempt++;
          const html = fs.readFileSync(path.join(ROOT, 'compare', file), 'utf8');
          const out = await translate(html, lang.name, langCode, lang.locale);
          fs.writeFileSync(outPath, out);
          done++;
          if (done % 10 === 0) console.log(`[${langCode}] ${done}/${files.length}`);
          break;
        } catch (e) {
          if (attempt >= 2) {
            console.log(`[${langCode}] FAIL ${file}: ${e.message.slice(0, 150)}`);
            failed++;
          } else {
            await new Promise(r => setTimeout(r, 3000 * attempt));
          }
        }
      }
    }
  });
  await Promise.all(workers);
  return { done, skipped, failed };
}

(async () => {
  const argLang = process.argv[2];
  const targetLangs = argLang ? { [argLang]: LANGS[argLang] } : LANGS;
  if (argLang && !LANGS[argLang]) {
    console.error('Invalid lang:', argLang);
    process.exit(1);
  }
  const files = fs.readdirSync(path.join(ROOT, 'compare')).filter(f => f.endsWith('.html'));
  console.log(`Source files: ${files.length}`);
  await tg(`Compare translation start: ${files.length} files x ${Object.keys(targetLangs).length} langs`);

  for (const [code, lang] of Object.entries(targetLangs)) {
    console.log(`\n=== ${code.toUpperCase()} (${lang.name}) ===`);
    const r = await processLang(code, lang, files);
    console.log(`[${code}] DONE: ${r.done} new, ${r.skipped} skipped, ${r.failed} failed`);
    await tg(`Compare ${code}: ${r.done} new, ${r.skipped} skipped, ${r.failed} failed`);
  }

  await tg(`Compare translation FINAL complete`);
})();
