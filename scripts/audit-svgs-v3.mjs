#!/usr/bin/env node
// SVG audit v3, narrowly detects the specific bug: <line> crossing into another container <rect>
// (the static-math.svg bug pattern)
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

      // Collect rects (only filled cards with width>200 - skip backgrounds and small markers) and lines
      const cards = [];
      for (const r of svgEl.querySelectorAll('rect')) {
        const bbox = r.getBBox();
        if (bbox.width < 200 || bbox.height < 40) continue; // skip small rects
        const fill = r.getAttribute('fill') || '';
        // skip the bg rect (full-width gradient)
        if (fill.includes('url(#bg') || bbox.width >= 850) continue;
        const ctm = r.getCTM();
        if (!ctm) continue;
        const x = bbox.x + ctm.e, y = bbox.y + ctm.f;
        // Find parent <g> for ownership
        let g = r.parentElement;
        while (g && g.tagName !== 'g' && g.tagName !== 'svg') g = g.parentElement;
        cards.push({
          x, y, right: x + bbox.width, bottom: y + bbox.height,
          group: g, fill,
        });
      }

      const lines = [];
      for (const l of svgEl.querySelectorAll('line')) {
        const bbox = l.getBBox();
        const ctm = l.getCTM();
        if (!ctm) continue;
        const x1 = bbox.x + ctm.e;
        const y1 = bbox.y + ctm.f;
        const x2 = x1 + bbox.width;
        const y2 = y1 + bbox.height;
        let g = l.parentElement;
        while (g && g.tagName !== 'g' && g.tagName !== 'svg') g = g.parentElement;
        // Only check horizontal long lines (the diagnostic pattern)
        if (Math.abs(y2 - y1) > 4) continue;
        if (bbox.width < 300) continue;
        lines.push({
          x1, y1, x2, y2,
          group: g,
          stroke: l.getAttribute('stroke') || '',
        });
      }

      const issues = [];
      for (const l of lines) {
        for (const c of cards) {
          if (l.group === c.group) continue;
          // Line y inside card y range?
          if (l.y1 < c.y + 6 || l.y1 > c.bottom - 6) continue;
          // Line x range overlaps card x range?
          const xOverlap = Math.min(l.x2, c.right) - Math.max(l.x1, c.x);
          if (xOverlap < 100) continue;
          issues.push({
            lineStroke: l.stroke,
            lineY: Math.round(l.y1),
            cardBbox: `(${Math.round(c.x)},${Math.round(c.y)})→(${Math.round(c.right)},${Math.round(c.bottom)})`,
            cardFill: c.fill,
          });
        }
      }

      return { issues };
    });

    if (result.issues?.length) {
      issues.push({ file: fp, ...result });
    }
  }
}

await browser.close();

console.log(`\nAudited ${total} SVGs`);
console.log(`Files with horizontal-line-crossing-card bugs: ${issues.length}`);
console.log('-'.repeat(80));

for (const i of issues) {
  console.log(`\n${i.file}`);
  for (const o of i.issues) {
    console.log(`  line ${o.lineStroke} at y=${o.lineY} crosses through card ${o.cardBbox}`);
  }
}

fs.writeFileSync('audit-svgs-v3-report.json', JSON.stringify({ total, issues }, null, 2));
