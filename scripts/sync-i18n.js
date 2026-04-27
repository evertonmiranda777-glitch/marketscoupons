// Sync i18n table (Supabase) → i18n.js + index.html hardcoded text.
// Roda daily via .github/workflows/i18n-sync.yml.
// Elimina o "flash" de texto velho no primeiro paint após edits no admin.
//
// Strategy:
//  - i18n.js: para cada language block (pt/en/es/fr/it/de/ar), localiza o key
//    e substitui o valor entre aspas pelo valor mais novo do Supabase.
//  - index.html: para cada `<tag data-i18n="key">old</tag>` (só elementos
//    de texto simples, sem nested HTML), substitui pelo valor PT do Supabase.

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

const SUPABASE_URL = 'https://qfwhduvutfumsaxnuofa.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFmd2hkdXZ1dGZ1bXNheG51b2ZhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQzNzc5NDYsImV4cCI6MjA4OTk1Mzk0Nn0.efRel6U68misvPSRj8-p31-gOhzjXN4eIFMiloTNyk4';

const LANGS = ['pt', 'en', 'es', 'fr', 'it', 'de', 'ar'];

async function fetchI18n() {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/i18n?select=key,pt,en,es,fr,it,de,ar`, {
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
  });
  if (!r.ok) throw new Error(`Supabase ${r.status}: ${await r.text()}`);
  return r.json();
}

function escapeJsString(s) {
  return String(s)
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'")
    .replace(/\r/g, '\\r')
    .replace(/\n/g, '\\n');
}

// Localiza o range [start,end] do conteúdo dentro de `LANG: { ... }` em i18n.js
// usando contagem de chaves (respeitando strings com aspas).
function findLangBlockRange(src, lang) {
  // Ancora no início da linha pra não casar com `en:{` dentro de strings tipo "English: {url}"
  const startRe = new RegExp(`^\\s*${lang}\\s*:\\s*\\{`, 'm');
  const m = src.match(startRe);
  if (!m) return null;
  let i = m.index + m[0].length; // primeiro char depois do `{`
  const start = i;
  let depth = 1;
  while (i < src.length && depth > 0) {
    const ch = src[i];
    if (ch === '"' || ch === "'") {
      const q = ch;
      i++;
      while (i < src.length && src[i] !== q) {
        if (src[i] === '\\') i++;
        i++;
      }
    } else if (ch === '{') depth++;
    else if (ch === '}') {
      depth--;
      if (depth === 0) return { start, end: i };
    }
    i++;
  }
  return null;
}

function updateI18nJs(src, rows) {
  // Indexa rows por key pra lookup O(1)
  const rowsByKey = Object.fromEntries(rows.map(r => [r.key, r]));
  // Mapa lang → start/end-line (1-based)
  const lines = src.split('\n');
  const langLineRanges = {};
  let currentLang = null;
  let currentStart = 0;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // Matcha linha tipo `  pt: {` (lang block opener)
    const langStart = line.match(/^\s+(pt|en|es|fr|it|de|ar)\s*:\s*\{\s*$/);
    if (langStart) {
      currentLang = langStart[1];
      currentStart = i + 1; // primeiro line de keys
      continue;
    }
    // Matcha linha tipo `  },` (lang block closer)
    if (currentLang && /^\s+\},?\s*$/.test(line)) {
      langLineRanges[currentLang] = { start: currentStart, end: i }; // i é a linha do `},`
      currentLang = null;
    }
  }
  let changes = 0;
  for (const lang of LANGS) {
    const range = langLineRanges[lang];
    if (!range) {
      console.warn(`[sync-i18n] block "${lang}" não encontrado em i18n.js`);
      continue;
    }
    let langChanges = 0;
    for (let i = range.start; i < range.end; i++) {
      // Matcha `    keyname:'value',` ou `    keyname:"value",`
      const m = lines[i].match(/^(\s+)([a-zA-Z_][a-zA-Z0-9_]*)\s*:\s*(['"])((?:[^'"\\]|\\.)*)\3(\s*,?)\s*$/);
      if (!m) continue;
      const [, indent, key, , , trailing] = m;
      const row = rowsByKey[key];
      if (!row) continue;
      const newVal = row[lang];
      if (newVal == null) continue;
      const escaped = escapeJsString(newVal);
      const newLine = `${indent}${key}:'${escaped}'${trailing || ','}`;
      if (newLine !== lines[i]) {
        lines[i] = newLine;
        changes++;
        langChanges++;
      }
    }
    console.log(`[sync-i18n] ${lang}: ${langChanges} keys updated`);
  }
  return { updated: lines.join('\n'), changes };
}

function updateIndexHtml(src, rows) {
  let out = src;
  let changes = 0;
  // Tags simples sem nested HTML — limita risco de quebrar markup
  const SIMPLE_TAGS = ['p', 'span', 'div', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'button', 'a', 'li', 'small', 'em', 'strong', 'label'];
  for (const row of rows) {
    const ptVal = row.pt;
    if (ptVal == null) continue;
    for (const tag of SIMPLE_TAGS) {
      const re = new RegExp(
        `(<${tag}\\b[^>]*\\bdata-i18n="${row.key.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\$&')}"[^>]*>)([^<]*)(</${tag}>)`,
        'g'
      );
      out = out.replace(re, (full, open, inner, close) => {
        if (inner.trim() === ptVal.trim()) return full;
        changes++;
        return `${open}${ptVal}${close}`;
      });
    }
  }
  return { updated: out, changes };
}

async function main() {
  console.log('[sync-i18n] fetching i18n from Supabase...');
  const rows = await fetchI18n();
  console.log(`[sync-i18n] got ${rows.length} keys`);

  const i18nJsPath = path.join(root, 'i18n.js');
  const indexHtmlPath = path.join(root, 'index.html');

  const i18nJs = fs.readFileSync(i18nJsPath, 'utf8');
  const indexHtml = fs.readFileSync(indexHtmlPath, 'utf8');

  const r1 = updateI18nJs(i18nJs, rows);
  const r2 = updateIndexHtml(indexHtml, rows);

  console.log(`[sync-i18n] i18n.js: ${r1.changes} key/lang updated`);
  console.log(`[sync-i18n] index.html: ${r2.changes} elements updated`);

  if (r1.changes > 0) fs.writeFileSync(i18nJsPath, r1.updated);
  if (r2.changes > 0) fs.writeFileSync(indexHtmlPath, r2.updated);

  console.log('[sync-i18n] done');
}

main().catch((err) => {
  console.error('[sync-i18n] error:', err.message);
  process.exit(1);
});
