#!/usr/bin/env node
// Sync docs/guias-piloto/*/bulenox.md sources with HTML truth: MARKET89 89% off,
// correct 50K/100K prices ($19.25/$23.65), no more $50OFF/$60OFF.
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

const FILES = [
  'docs/guias-piloto/bulenox.md',
  'docs/guias-piloto/pt/bulenox.md',
  'docs/guias-piloto/es/bulenox.md',
  'docs/guias-piloto/fr/bulenox.md',
  'docs/guias-piloto/de/bulenox.md',
  'docs/guias-piloto/it/bulenox.md',
  'docs/guias-piloto/ar/bulenox.md',
];

// Language-agnostic patterns (code spans, fee numbers in table cells, etc)
const REPLACEMENTS = [
  // Coupon code spans, always the same
  [/`\$50OFF`/g, '`MARKET89`'],
  [/`\$60OFF`/g, '`MARKET89`'],
  [/\$50OFF\s*\/\s*\$60OFF/g, 'MARKET89 89% off'],
  [/\$50OFF/g, 'MARKET89'],
  [/\$60OFF/g, 'MARKET89'],

  // Table fee cells: **$125/mo** / **$125/mes** / **$125/mese** / **US$125/mes** etc.
  [/\*\*(US\$|\$)\s*125\/(mo|mes|mês|mese|mois|Monat|شهر)\*\*/g, '**$1 19.25/$2**'],
  [/\*\*(US\$|\$)\s*155\/(mo|mes|mês|mese|mois|Monat|شهر)\*\*/g, '**$1 23.65/$2**'],

  // Prose "Monthly fee: $125" style (various langs)
  [/(Monthly fee|Cuota mensual|Quota mensile|Tarif mensuel|Monatsgebühr|Mensalidade|الرسوم الشهرية):\*\*\s*(US\$|\$)\s*125/g, '$1:** $2 19.25'],
  [/(Monthly fee|Cuota mensual|Quota mensile|Tarif mensuel|Monatsgebühr|Mensalidade|الرسوم الشهرية):\*\*\s*(US\$|\$)\s*155/g, '$1:** $2 23.65'],

  // "$50K account at $125/month" / equivalents
  [/(\$|US\$)\s*50K (account|conta|cuenta|conto|compte|Konto|الحساب) at (\$|US\$)\s*125\//g, '$1 50K $2 at $3 19.25/'],
  [/(\$|US\$)\s*50K a (\$|US\$)\s*125\//g, '$1 50K a $2 19.25/'],
  [/(\$|US\$)\s*50K da (\$|US\$)\s*125\//g, '$1 50K da $2 19.25/'],

  // Meta descriptions: "monthly pricing with $50OFF/$60OFF coupons" and translations
  [/monthly pricing with MARKET89 89% off coupons?/g, 'monthly pricing with the exclusive MARKET89 coupon (89% off)'],
];

let totalFiles = 0, totalReplacements = 0;
for (const rel of FILES) {
  const file = path.join(root, rel);
  if (!fs.existsSync(file)) { console.log(`SKIP (not found): ${rel}`); continue; }
  let src = fs.readFileSync(file, 'utf8');
  const before = src;
  let fileCount = 0;
  for (const [re, to] of REPLACEMENTS) {
    const matches = src.match(re);
    if (matches) {
      fileCount += matches.length;
      src = src.replace(re, to);
    }
  }
  if (src !== before) {
    fs.writeFileSync(file, src);
    console.log(`✓ ${rel}, ${fileCount} replacements`);
    totalFiles++;
    totalReplacements += fileCount;
  } else {
    console.log(`— no changes: ${rel}`);
  }
}
console.log(`\nDone: ${totalFiles} files, ${totalReplacements} replacements.`);
