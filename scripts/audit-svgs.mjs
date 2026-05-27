#!/usr/bin/env node
// SVG auditor — programmatic check via headless browser (chromium via Playwright)
// Detects: viewBox overflow, text overlap, elements clipped
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const DIRS = [
  'img/blog-diagrams/wyckoff',
  'img/blog-diagrams/order-flow',
  'img/blog-diagrams/0dte',
  'img/blog-diagrams/elliott',
  'img/blog-diagrams/risk-1r',
  'img/blog-diagrams/pass-prop-firm',
  'img/blog-diagrams/trailing-vs-eod',
  'img/blog-diagrams/position-sizing',
];

const browser = await chromium.launch();
const page = await browser.newPage();

const issues = [];
let total = 0;

for (const dir of DIRS) {
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.svg')).sort();
  for (const file of files) {
    total++;
    const fp = path.join(dir, file);
    const svg = fs.readFileSync(fp, 'utf8');
    // Force SVG to render at 1:1 by setting explicit width/height = viewBox dimensions
    const vbMatch = svg.match(/viewBox="0 0 (\d+(?:\.\d+)?) (\d+(?:\.\d+)?)"/);
    let svgFixed = svg;
    if (vbMatch) {
      svgFixed = svg.replace(/<svg /, `<svg width="${vbMatch[1]}" height="${vbMatch[2]}" `);
    }
    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>html,body{margin:0;padding:0;background:#0F1422}svg{display:block}</style></head><body>${svgFixed}</body></html>`;
    await page.setViewportSize({ width: 2000, height: 1600 });
    await page.setContent(html, { waitUntil: 'load' });

    const result = await page.evaluate(() => {
      const svgEl = document.querySelector('svg');
      if (!svgEl) return { error: 'no svg' };

      const vb = svgEl.viewBox.baseVal;
      const vbX = vb.x, vbY = vb.y, vbW = vb.width, vbH = vb.height;

      const overflow = [];
      const texts = [];

      // Check every element for overflow
      const all = svgEl.querySelectorAll('text, rect, circle, line, path');
      for (const el of all) {
        let bbox;
        try { bbox = el.getBBox(); } catch (e) { continue; }
        if (bbox.width === 0 && bbox.height === 0) continue;

        // Walk up transforms (rough: use getCTM for absolute position)
        let ctm;
        try { ctm = el.getCTM(); } catch (e) { ctm = null; }
        let absX = bbox.x, absY = bbox.y;
        if (ctm) {
          absX = bbox.x * ctm.a + bbox.y * ctm.c + ctm.e;
          absY = bbox.x * ctm.b + bbox.y * ctm.d + ctm.f;
        }
        const absRight = absX + bbox.width;
        const absBottom = absY + bbox.height;

        const out = {
          tag: el.tagName,
          text: el.textContent?.slice(0, 50),
          x: Math.round(absX), y: Math.round(absY),
          w: Math.round(bbox.width), h: Math.round(bbox.height),
        };

        // Overflow check (small tolerance)
        const tol = 2;
        if (absX < vbX - tol || absY < vbY - tol || absRight > vbX + vbW + tol || absBottom > vbY + vbH + tol) {
          overflow.push({ ...out, side: [
            absX < vbX - tol ? 'L' : '',
            absY < vbY - tol ? 'T' : '',
            absRight > vbX + vbW + tol ? 'R' : '',
            absBottom > vbY + vbH + tol ? 'B' : '',
          ].filter(Boolean).join('') });
        }

        if (el.tagName === 'text' && el.textContent?.trim()) {
          texts.push({ ...out, t: el.textContent.trim() });
        }
      }

      // Overlap check (text-text only)
      const overlaps = [];
      for (let i = 0; i < texts.length; i++) {
        for (let j = i + 1; j < texts.length; j++) {
          const a = texts[i], b = texts[j];
          // Intersection rect (with minimal overlap threshold 4px to ignore touches)
          const ix = Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x));
          const iy = Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y));
          if (ix > 4 && iy > 4) {
            const overlapArea = ix * iy;
            const minArea = Math.min(a.w * a.h, b.w * b.h);
            if (overlapArea / minArea > 0.3) { // >30% of smaller text overlapped
              overlaps.push({
                a: a.t.slice(0, 30),
                b: b.t.slice(0, 30),
                pct: Math.round(overlapArea / minArea * 100),
              });
            }
          }
        }
      }

      return { vbW, vbH, overflow, overlaps };
    });

    if (result.error) { issues.push({ file: fp, error: result.error }); continue; }
    if (result.overflow.length || result.overlaps.length) {
      issues.push({
        file: fp,
        vb: `${result.vbW}×${result.vbH}`,
        overflow: result.overflow,
        overlaps: result.overlaps,
      });
    }
  }
}

await browser.close();

console.log(`\nAudited ${total} SVGs`);
console.log(`Issues found in ${issues.length} files`);
console.log('-'.repeat(80));

for (const i of issues) {
  console.log(`\n${i.file}  (viewBox ${i.vb})`);
  if (i.error) { console.log(`  ERROR: ${i.error}`); continue; }
  if (i.overflow?.length) {
    console.log(`  OVERFLOW (${i.overflow.length}):`);
    for (const o of i.overflow.slice(0, 10)) {
      console.log(`    [${o.side}] ${o.tag} "${(o.text || '').slice(0,40)}" at (${o.x},${o.y}) ${o.w}×${o.h}`);
    }
    if (i.overflow.length > 10) console.log(`    ... +${i.overflow.length - 10} more`);
  }
  if (i.overlaps?.length) {
    console.log(`  OVERLAPS (${i.overlaps.length}):`);
    for (const o of i.overlaps.slice(0, 10)) {
      console.log(`    "${o.a}" ⇆ "${o.b}" (${o.pct}%)`);
    }
    if (i.overlaps.length > 10) console.log(`    ... +${i.overlaps.length - 10} more`);
  }
}

// Save full report
fs.writeFileSync('audit-svgs-report.json', JSON.stringify({ total, issues }, null, 2));
console.log(`\nFull JSON report: audit-svgs-report.json`);
