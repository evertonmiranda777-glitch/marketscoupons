#!/usr/bin/env node
// One-shot: fix Bulenox guide prices across 7 langs to reflect MARKET89 (89% off)
// Sticker: 25K=$145, 50K=$175, 100K=$215, 150K=$325, 250K=$535
// MARKET89 (pay 11%): 25K=$15.95, 50K=$19.25, 100K=$23.65, 150K=$35.75, 250K=$58.85
// Only 50K and 100K had wrong stickers ($125/$155 — those were post-partial-coupon prices, NOT real sticker)

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

const FILES = [
  'guides/bulenox-review.html',
  'pt/guides/bulenox-review.html',
  'es/guides/bulenox-review.html',
  'fr/guides/bulenox-review.html',
  'de/guides/bulenox-review.html',
  'it/guides/bulenox-review.html',
  'ar/guides/bulenox-review.html',
];

// Patterns language-agnostic (don't depend on currency format)
const GLOBAL_REPLACEMENTS = [
  // Coupon codes — same across all langs
  [/<code>\$50OFF<\/code>/g, '<code>MARKET89</code>'],
  [/<code>\$60OFF<\/code>/g, '<code>MARKET89</code>'],
  [/`\$50OFF`/g, '`MARKET89`'],
  [/`\$60OFF`/g, '`MARKET89`'],
  // Fix the wrong sticker prices — these were the post-partial-coupon bulenox prices, not real stickers
  // The real stickers ARE $175 and $215
];

// Per-language currency/price patterns
// Lang key -> { currency, thousandSep, decimalSep, perMonth, was }
const LANG_FMT = {
  'guides/bulenox-review.html': { cur: '\\$', curOut: '$', per: '/mo', was: 'was', ts: ',', ds: '.' },
  'pt/guides/bulenox-review.html': { cur: 'US\\$\\s*', curOut: 'US$ ', per: '/mês', was: 'era', ts: '.', ds: ',' },
  'es/guides/bulenox-review.html': { cur: 'US\\$\\s*', curOut: 'US$ ', per: '/mes', was: 'antes', ts: '.', ds: ',' },
  'fr/guides/bulenox-review.html': { cur: 'US\\$\\s*', curOut: 'US$ ', per: '/mois', was: 'auparavant', ts: ' ', ds: ',' },
  'de/guides/bulenox-review.html': { cur: 'US\\$\\s*', curOut: 'US$ ', per: '/Monat', was: 'vorher', ts: '.', ds: ',' },
  'it/guides/bulenox-review.html': { cur: 'US\\$\\s*', curOut: 'US$ ', per: '/mese', was: 'prima', ts: '.', ds: ',' },
  'ar/guides/bulenox-review.html': { cur: 'US\\$\\s*', curOut: 'US$ ', per: '/شهر', was: 'كان', ts: ',', ds: '.' },
};

// Table rows: old -> new by plan key
// Format: { key: { oldDisc, oldSticker, newDisc, newSticker } }
const PLAN_DATA = {
  '25K':  { oldFee: 145,  newFee: 15.95, sticker: 145 },
  '50K':  { oldFee: 125,  newFee: 19.25, sticker: 175 }, // was showing $125 (wrong sticker), fix to $19.25 with $175 real sticker
  '100K': { oldFee: 155,  newFee: 23.65, sticker: 215 }, // was showing $155 (wrong sticker), fix to $23.65 with $215 real sticker
  '150K': { oldFee: 325,  newFee: 35.75, sticker: 325 },
  '250K': { oldFee: 535,  newFee: 58.85, sticker: 535 },
};

// Format number with locale-specific separators
function fmtNum(n, fmt) {
  const [int, dec] = n.toFixed(2).split('.');
  const intFmt = int.replace(/\B(?=(\d{3})+(?!\d))/g, fmt.ts);
  return dec === '00' ? intFmt : `${intFmt}${fmt.ds}${dec}`;
}

for (const rel of FILES) {
  const file = path.join(root, rel);
  if (!fs.existsSync(file)) { console.log(`SKIP (not found): ${rel}`); continue; }
  let src = fs.readFileSync(file, 'utf8');
  const before = src;
  const fmt = LANG_FMT[rel];

  // Global replacements
  for (const [from, to] of GLOBAL_REPLACEMENTS) {
    src = src.replace(from, to);
  }

  // For each plan row in the pricing table, replace the "Monthly fee" cell
  // Patterns we need to match:
  //   <strong>$125/mo</strong> (was $175)   → <strong>$19.25/mo</strong> (was $175)
  //   <strong>$155/mo</strong> (was $215)   → <strong>$23.65/mo</strong> (was $215)
  //   <strong>$145/mo</strong>              → <strong>$15.95/mo</strong> (was $145) + MARKET89 coupon
  //   <strong>$325/mo</strong>              → <strong>$35.75/mo</strong> (was $325)
  //   <strong>$535/mo</strong>              → <strong>$58.85/mo</strong> (was $535)
  // And replace the adjacent coupon cell `—` with `<code>MARKET89</code>` for rows that didn't have a coupon

  for (const [key, p] of Object.entries(PLAN_DATA)) {
    const oldFeeStr = fmtNum(p.oldFee, fmt);
    const newFeeStr = fmtNum(p.newFee, fmt);
    const stickerStr = fmtNum(p.sticker, fmt);

    // Pattern 1: "$125/mo" (was $175) — for 50K/100K which had wrong stickers
    // The "was $175" / "was $215" is already the correct sticker — keep it, just update the discounted price
    if (p.oldFee !== p.sticker) {
      const re = new RegExp(
        `<strong>${fmt.cur}${oldFeeStr.replace(/[.]/g, '\\.')}${fmt.per}</strong>\\s*\\(${fmt.was}\\s+${fmt.cur}${stickerStr.replace(/[.]/g, '\\.')}\\)`,
        'g'
      );
      src = src.replace(re, `<strong>${fmt.curOut}${newFeeStr}${fmt.per}</strong> (${fmt.was} ${fmt.curOut}${stickerStr})`);
    } else {
      // Pattern 2: "$145/mo" alone (no coupon) — for 25K/150K/250K
      // Match the full cell + adjacent "—" coupon cell, replace both
      const re = new RegExp(
        `<td><strong>${fmt.cur}${oldFeeStr.replace(/[.]/g, '\\.')}${fmt.per}</strong></td>\\s*\\n?\\s*<td>—</td>`,
        'g'
      );
      src = src.replace(re, `<td><strong>${fmt.curOut}${newFeeStr}${fmt.per}</strong> (${fmt.was} ${fmt.curOut}${stickerStr})</td>\n<td><code>MARKET89</code></td>`);
    }
  }

  if (src !== before) {
    fs.writeFileSync(file, src);
    console.log(`✓ ${rel}`);
  } else {
    console.log(`— no changes: ${rel}`);
  }
}
