#!/usr/bin/env node
/**
 * translate-coupons-lp-id.mjs, Extrai bloco I18N en {} do coupons.html,
 * traduz pra Indonesio via Gemini Flash, e substitui o fallback `I18N.id = I18N.en`
 * por um bloco id: real.
 */

import fs from 'node:fs';

const KEY = (fs.readFileSync('.env.local', 'utf8').match(/GEMINI_API_KEY=(.+)/) || [])[1]?.trim();
if (!KEY) { console.error('GEMINI_API_KEY missing'); process.exit(1); }

const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${KEY}`;

const SYSTEM_PROMPT = `Translate this JavaScript object literal from English to Bahasa Indonesia (id).

RULES:
1. NEVER translate: "Prop Firm", "Prop Firms", "Profit Split", "Drawdown", "Lifetime", "Trailing", "EOD", "Day 1", "Trustpilot", "OFF", "POPULAR".
2. PRESERVE all HTML tags <em>, </em>, <a href="...">, </a>.
3. PRESERVE numbers, currency, emojis, special chars.
4. Output a VALID JavaScript object literal (NOT JSON) with single quotes and unquoted property names, exactly as the source format.
5. Output ONLY the object literal {...}, no const declaration, no semicolon, no markdown.`;

async function translate(enBlockSource) {
  const r = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{
        role: 'user',
        parts: [{ text: `${SYSTEM_PROMPT}\n\nSource (English):\n\n${enBlockSource}\n\nOutput Indonesian object literal:` }]
      }],
      generationConfig: { temperature: 0.2 }
    }),
  });
  const j = await r.json();
  if (!r.ok) { console.error(j); throw new Error(`HTTP ${r.status}`); }
  return j.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
}

async function main() {
  const html = fs.readFileSync('coupons.html', 'utf8');

  // Extract en: { ... } block
  const enMatch = html.match(/(\n  en: \{[\s\S]+?\n  \}),\n  es:/);
  if (!enMatch) { console.error('Cannot find en block'); process.exit(1); }
  const enBlockSource = enMatch[1].replace(/^\n  en: /, '');
  console.log(`Extracted en block: ${enBlockSource.length} chars`);

  console.log('Calling Gemini Flash...');
  let translated = await translate(enBlockSource);

  // Strip code fences if present
  translated = translated.replace(/```(?:javascript|js)?\s*|\s*```/g, '').trim();
  if (!translated.startsWith('{')) {
    console.error('Unexpected response start:', translated.slice(0, 200));
    process.exit(1);
  }

  console.log(`Translated: ${translated.length} chars`);

  // Replace the fallback "I18N.id = I18N.en" with real id block
  const oldFallback = `// Indonesian fallback → English (translate properly in next phase)
I18N.id = I18N.en;`;
  if (!html.includes(oldFallback)) {
    console.error('Cannot find fallback marker to replace');
    process.exit(1);
  }
  const idBlock = `// Indonesian (id), translated via Gemini Flash
I18N.id = ${translated};`;

  const newHtml = html.replace(oldFallback, idBlock);
  fs.writeFileSync('coupons.html', newHtml, 'utf8');
  console.log('coupons.html updated with real Indonesian I18N block');
}

main().catch(e => { console.error(e); process.exit(1); });
