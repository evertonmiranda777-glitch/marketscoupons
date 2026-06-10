#!/usr/bin/env node
/**
 * translate-i18n-id.mjs, Traduz i18n-en.js → i18n-id.js (Bahasa Indonesia)
 * via Gemini 2.5 Flash (Google AI Studio free tier).
 *
 * Preserva:
 * - Termos técnicos: Prop Firm, Profit Split, Drawdown, Lifetime
 * - Tags HTML: <em>, <a href>, <strong>
 * - Placeholders: {name}, {n}, %s
 * - Emojis, simbolos monetarios, numeros
 *
 * Uso: node scripts/translate-i18n-id.mjs
 */

import fs from 'node:fs';
import path from 'node:path';

const KEY = (fs.readFileSync('.env.local', 'utf8').match(/GEMINI_API_KEY=(.+)/) || [])[1]?.trim();
if (!KEY) { console.error('GEMINI_API_KEY missing in .env.local'); process.exit(1); }

const MODEL = 'gemini-2.5-flash';
const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${KEY}`;
const BATCH_SIZE = 30;
const RPM_DELAY_MS = 8000; // free tier 2.5 Flash ~10 RPM efetivo, 8s = 7.5 RPM safe
const MAX_RETRY = 4;

const SYSTEM_PROMPT = `You are a professional translator EN → Bahasa Indonesia (id) for a prop trading firm coupon site.

CRITICAL RULES:
1. NEVER translate these technical terms, keep them in English: "Prop Firm", "Prop Firms", "Profit Split", "Drawdown", "Lifetime", "Trailing", "EOD", "Day 1", "Trustpilot"
2. PRESERVE all HTML tags exactly: <em>, </em>, <a href="...">, </a>, <strong>, etc.
3. PRESERVE placeholders verbatim: {name}, {n}, {firm}, %s, %d
4. PRESERVE all emojis and currency symbols ($, €, £)
5. PRESERVE numbers exactly (no localization of decimals)
6. Tone: professional, clear, trader-friendly. Avoid overly formal Indonesian.
7. Output ONLY valid JSON object, no markdown, no explanation.

INPUT: a JSON object {key: english_text}
OUTPUT: same JSON shape with values translated to id`;

async function translateBatch(batch, attempt = 1) {
  const body = {
    contents: [{
      role: 'user',
      parts: [{
        text: `${SYSTEM_PROMPT}\n\nTranslate this JSON to Bahasa Indonesia (id), return ONLY the JSON:\n\n${JSON.stringify(batch, null, 2)}`
      }]
    }],
    generationConfig: { temperature: 0.2, responseMimeType: 'application/json' }
  };
  const r = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const j = await r.json();
  if (r.status === 429 && attempt < MAX_RETRY) {
    const retryDelay = j?.error?.details?.find(d => d['@type']?.includes('RetryInfo'))?.retryDelay;
    const wait = retryDelay ? parseInt(retryDelay) * 1000 + 2000 : Math.min(30000, 5000 * attempt);
    console.log(`    429, backoff ${wait}ms (attempt ${attempt+1}/${MAX_RETRY})`);
    await new Promise(rs => setTimeout(rs, wait));
    return translateBatch(batch, attempt + 1);
  }
  if (!r.ok) {
    console.error('API error:', JSON.stringify(j).slice(0, 300));
    throw new Error(`HTTP ${r.status}`);
  }
  const text = j.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error('Empty response');
  try {
    return JSON.parse(text);
  } catch (e) {
    // Fallback strip markdown fences
    const cleaned = text.replace(/```json\s*|\s*```/g, '').trim();
    return JSON.parse(cleaned);
  }
}

async function main() {
  // Load EN source
  const enSrc = fs.readFileSync('i18n-en.js', 'utf8');
  const m = enSrc.match(/window\.I18N\.en=(\{[\s\S]+?\});?\s*$/);
  if (!m) { console.error('Cannot parse i18n-en.js'); process.exit(1); }
  const enObj = JSON.parse(m[1]);
  const keys = Object.keys(enObj);
  console.log(`Loaded ${keys.length} keys from i18n-en.js`);

  // Resume: check if i18n-id.js already has partial real translations
  let idObj = {};
  if (fs.existsSync('i18n-id.js')) {
    try {
      const idSrc = fs.readFileSync('i18n-id.js', 'utf8');
      const im = idSrc.match(/window\.I18N\.id=(\{[\s\S]+?\});?\s*$/);
      if (im) idObj = JSON.parse(im[1]);
    } catch {}
  }

  // Filter keys not yet translated OR still equal to EN (fallback clones)
  const toTranslate = keys.filter(k => !idObj[k] || idObj[k] === enObj[k]);
  console.log(`Need to translate: ${toTranslate.length} keys (${keys.length - toTranslate.length} already real)`);

  // Save progress every batch
  const saveProgress = () => {
    const out = `window.I18N=window.I18N||{};window.I18N.id=${JSON.stringify(idObj)};`;
    fs.writeFileSync('i18n-id.js', out, 'utf8');
  };

  let done = 0;
  for (let i = 0; i < toTranslate.length; i += BATCH_SIZE) {
    const slice = toTranslate.slice(i, i + BATCH_SIZE);
    const batch = {};
    slice.forEach(k => { batch[k] = enObj[k]; });

    try {
      const translated = await translateBatch(batch);
      slice.forEach(k => {
        if (translated[k] !== undefined) idObj[k] = translated[k];
        else idObj[k] = enObj[k]; // fallback if model missed key
      });
      done += slice.length;
      console.log(`  batch ${Math.floor(i/BATCH_SIZE)+1}/${Math.ceil(toTranslate.length/BATCH_SIZE)}, ${done}/${toTranslate.length} keys`);
      saveProgress();
    } catch (e) {
      console.error(`  batch failed: ${e.message}, keeping EN fallback for this batch`);
      slice.forEach(k => { idObj[k] = enObj[k]; });
      saveProgress();
    }

    // Rate limit
    if (i + BATCH_SIZE < toTranslate.length) {
      await new Promise(r => setTimeout(r, RPM_DELAY_MS));
    }
  }

  saveProgress();
  const finalSize = fs.statSync('i18n-id.js').size;
  console.log(`\nDone. i18n-id.js ${(finalSize/1024).toFixed(1)}KB · ${Object.keys(idObj).length} keys translated`);
}

main().catch(e => { console.error(e); process.exit(1); });
