#!/usr/bin/env node
// SVG audit v2 — detects text-vs-rect AND text-vs-line overlaps (not just text-vs-text)
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
    const vbMatch = svg.match(/viewBox="0 0 (\d+(?:\.\d+)?) (\d+(?:\.\d+)?)"/);
    if (!vbMatch) continue;
    const svgFixed = svg.replace(/<svg /, `<svg width="${vbMatch[1]}" height="${vbMatch[2]}" `);
    const html = `<!DOCTYPE html><html><head><style>html,body{margin:0;padding:0;background:#0F1422}svg{display:block}</style></head><body>${svgFixed}</body></html>`;
    await page.setViewportSize({ width: 2000, height: 1600 });
    await page.setContent(html, { waitUntil: 'load' });

    const result = await page.evaluate(() => {
      const svgEl = document.querySelector('svg');
      if (!svgEl) return { error: 'no svg' };

      // Collect all elements with their absolute bounding boxes
      const elements = [];
      for (const el of svgEl.querySelectorAll('text, rect, line, path, circle')) {
        let bbox;
        try { bbox = el.getBBox(); } catch (e) { continue; }
        if (bbox.width < 1 && bbox.height < 1) continue;
        const ctm = el.getCTM();
        if (!ctm) continue;
        const absX = bbox.x + ctm.e;
        const absY = bbox.y + ctm.f;
        // Determine "owner group" by walking up to find first <g> ancestor
        let group = el.parentElement;
        while (group && group.tagName !== 'g' && group.tagName !== 'svg') group = group.parentElement;
        elements.push({
          tag: el.tagName,
          text: el.textContent?.trim().slice(0, 60) || '',
          x: absX, y: absY,
          w: bbox.width, h: bbox.height,
          right: absX + bbox.width,
          bottom: absY + bbox.height,
          group: group?.getAttribute('transform') || ''
        });
      }

      const overlaps = [];
      // For each TEXT element, check if it overlaps with a RECT/LINE from a DIFFERENT group
      const texts = elements.filter(e => e.tag === 'text' && e.text);
      const boxes = elements.filter(e => e.tag === 'rect' || e.tag === 'line');

      for (const t of texts) {
        for (const b of boxes) {
          // Skip if same group (intentional layout)
          if (t.group === b.group) continue;
          // Compute intersection
          const ix = Math.max(0, Math.min(t.right, b.right) - Math.max(t.x, b.x));
          const iy = Math.max(0, Math.min(t.bottom, b.bottom) - Math.max(t.y, b.y));
          if (ix > 5 && iy > 5) {
            // For lines (height ~0), treat as overlap if text crosses
            const isLine = b.tag === 'line' && b.h < 4;
            const textArea = t.w * t.h;
            const overlapArea = ix * iy;
            // Threshold: line passes through text OR rect covers >20% of text
            if (isLine || overlapArea / textArea > 0.2) {
              overlaps.push({
                text: t.text,
                with: `${b.tag}${isLine ? ' (line)' : ''}`,
                textPos: `(${Math.round(t.x)},${Math.round(t.y)}) ${Math.round(t.w)}x${Math.round(t.h)}`,
                pct: Math.round(overlapArea / textArea * 100),
              });
            }
          }
        }
      }

      return { overlaps };
    });

    if (result.overlaps?.length) {
      issues.push({ file: fp, overlaps: result.overlaps });
    }
  }
}

await browser.close();

console.log(`\nAudited ${total} SVGs`);
console.log(`Files with text-vs-shape overlaps: ${issues.length}`);
console.log('-'.repeat(80));

for (const i of issues) {
  console.log(`\n${i.file}`);
  for (const o of i.overlaps.slice(0, 6)) {
    console.log(`  "${o.text}" overlaps ${o.with} at ${o.textPos} (${o.pct}%)`);
  }
  if (i.overlaps.length > 6) console.log(`  ... +${i.overlaps.length - 6} more`);
}

fs.writeFileSync('audit-svgs-v2-report.json', JSON.stringify({ total, issues }, null, 2));
console.log(`\nFull report: audit-svgs-v2-report.json`);
