#!/usr/bin/env node
// SVG audit v4 — catches:
//  (a) <line> crossing through TEXT element (line passes within text bbox)
//  (b) <line> crossing through <rect> from different group
//  (c) text-vs-text overlap >30% (the original audit)
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
  'img/blog-diagrams/vpa',
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
    // XML validity: raw ampersand breaks <img> rendering (strict XML) even though HTML parsing is lenient
    const rawAmp = svg.match(/&(?!amp;|lt;|gt;|quot;|apos;|#)/g);
    if (rawAmp) {
      issues.push({ file: fp, bugs: [{ kind: 'raw-ampersand', count: rawAmp.length }] });
    }
    const vbMatch = svg.match(/viewBox="0 0 (\d+(?:\.\d+)?) (\d+(?:\.\d+)?)"/);
    if (!vbMatch) continue;
    const svgFixed = svg.replace(/<svg /, `<svg width="${vbMatch[1]}" height="${vbMatch[2]}" `);
    const html = `<!DOCTYPE html><html><head><style>html,body{margin:0;padding:0;background:#0F1422}svg{display:block}</style></head><body>${svgFixed}</body></html>`;
    await page.setViewportSize({ width: 2000, height: 1800 });
    await page.setContent(html, { waitUntil: 'load' });

    const result = await page.evaluate(() => {
      const svgEl = document.querySelector('svg');
      if (!svgEl) return { error: 'no svg' };

      // Helper: walk up to find parent <g> for grouping
      function parentG(el) {
        let g = el.parentElement;
        while (g && g.tagName !== 'g' && g.tagName !== 'svg') g = g.parentElement;
        return g;
      }
      // Two elements are "logically same group" if they share any ancestor <g>
      // chain (one inside the other's parent g, or both children of same <g>).
      function sameLogicalGroup(a, b) {
        if (a === b) return true;
        if (a && b && (a.contains(b) || b.contains(a))) return true;
        // Walk up a's ancestors looking for one that contains b
        let g = a;
        while (g && g.tagName !== 'svg') {
          if (g.tagName === 'g' && g.contains(b)) return true;
          g = g.parentElement;
        }
        let h = b;
        while (h && h.tagName !== 'svg') {
          if (h.tagName === 'g' && h.contains(a)) return true;
          h = h.parentElement;
        }
        return false;
      }
      function absBBox(el) {
        const bb = el.getBBox();
        const ctm = el.getCTM();
        if (!ctm) return null;
        return {
          x: bb.x + ctm.e,
          y: bb.y + ctm.f,
          w: bb.width,
          h: bb.height,
          right: bb.x + ctm.e + bb.width,
          bottom: bb.y + ctm.f + bb.height,
        };
      }

      // Collect texts (non-empty)
      const texts = [];
      for (const t of svgEl.querySelectorAll('text')) {
        const txt = t.textContent?.trim();
        if (!txt) continue;
        const b = absBBox(t);
        if (!b || b.w < 1 || b.h < 1) continue;
        texts.push({ el: t, txt, ...b, group: parentG(t) });
      }

      // Collect horizontal lines (long, thin)
      const lines = [];
      for (const l of svgEl.querySelectorAll('line')) {
        const b = absBBox(l);
        if (!b) continue;
        if (b.h > 4) continue; // only horizontal-ish lines
        if (b.w < 100) continue; // only long lines
        lines.push({ el: l, ...b, group: parentG(l) });
      }

      // Collect cards (rects with width>200 and not bg)
      const cards = [];
      for (const r of svgEl.querySelectorAll('rect')) {
        const b = absBBox(r);
        if (!b) continue;
        if (b.w < 200 || b.h < 40 || b.w >= 870) continue;
        const fill = r.getAttribute('fill') || '';
        if (fill.includes('url(#bg')) continue;
        cards.push({ el: r, ...b, group: parentG(r) });
      }

      const bugs = [];

      // (a) Line crossing TEXT — line passes within text bbox vertically
      for (const l of lines) {
        for (const t of texts) {
          // Skip if same group (intentional)
          if (sameLogicalGroup(l.el, t.el)) continue;
          // Line vertically inside text bbox?
          const lineY = (l.y + l.bottom) / 2;
          if (lineY < t.y + 2 || lineY > t.bottom - 2) continue;
          // Line horizontally overlaps text bbox?
          const xOv = Math.min(l.right, t.right) - Math.max(l.x, t.x);
          if (xOv < t.w * 0.5) continue; // line must cover at least half the text width
          bugs.push({
            kind: 'line-crosses-text',
            text: t.txt.slice(0, 50),
            lineY: Math.round(lineY),
            textBox: `(${Math.round(t.x)},${Math.round(t.y)}) ${Math.round(t.w)}x${Math.round(t.h)}`,
          });
        }
      }

      // (b) Line crossing CARD from different group
      for (const l of lines) {
        for (const c of cards) {
          if (sameLogicalGroup(l.el, c.el)) continue;
          const lineY = (l.y + l.bottom) / 2;
          if (lineY < c.y + 6 || lineY > c.bottom - 6) continue;
          const xOv = Math.min(l.right, c.right) - Math.max(l.x, c.x);
          if (xOv < 100) continue;
          bugs.push({
            kind: 'line-crosses-card',
            lineY: Math.round(lineY),
            cardBox: `(${Math.round(c.x)},${Math.round(c.y)})→(${Math.round(c.right)},${Math.round(c.bottom)})`,
          });
        }
      }

      // (c) Text-vs-text overlap — ANY two visible labels overlapping is a bug,
      // regardless of group nesting (two distinct labels must never collide).
      for (let i = 0; i < texts.length; i++) {
        for (let j = i + 1; j < texts.length; j++) {
          const a = texts[i], b = texts[j];
          const ix = Math.min(a.right, b.right) - Math.max(a.x, b.x);
          const iy = Math.min(a.bottom, b.bottom) - Math.max(a.y, b.y);
          if (ix <= 2 || iy <= 2) continue;
          const area = ix * iy;
          const minArea = Math.min(a.w * a.h, b.w * b.h);
          if (area / minArea > 0.15) {
            bugs.push({
              kind: 'text-overlap',
              a: a.txt.slice(0, 30),
              b: b.txt.slice(0, 30),
              pct: Math.round(area / minArea * 100),
            });
          }
        }
      }

      // (d) Footer text vertically too close to bottom of last card (< 6px gap)
      for (const t of texts) {
        if (t.txt.length < 20) continue; // only long text (footer is usually long)
        for (const c of cards) {
          if (sameLogicalGroup(t.el, c.el)) continue;
          // text BELOW or OVERLAPPING bottom edge of card?
          const distFromCardBottom = t.y - c.bottom;
          if (distFromCardBottom < -t.h || distFromCardBottom > 8) continue;
          // text horizontally overlaps card?
          const xOv = Math.min(t.right, c.right) - Math.max(t.x, c.x);
          if (xOv < 50) continue;
          bugs.push({
            kind: 'text-near-card-bottom',
            text: t.txt.slice(0, 50),
            gap: Math.round(distFromCardBottom),
          });
        }
      }

      // (e) Text bbox CROSSES BORDER of card from a different group
      // (intentional: text fully inside card · BUG: text straddles a card edge)
      for (const t of texts) {
        for (const c of cards) {
          if (sameLogicalGroup(t.el, c.el)) continue;
          // Skip if text fully contained inside card — that's intentional (tables, captions)
          const fullyInside = t.x >= c.x - 2 && t.right <= c.right + 2 && t.y >= c.y - 2 && t.bottom <= c.bottom + 2;
          if (fullyInside) continue;
          // Skip if no overlap at all
          const xOv = Math.min(t.right, c.right) - Math.max(t.x, c.x);
          const yOv = Math.min(t.bottom, c.bottom) - Math.max(t.y, c.y);
          if (xOv <= 2 || yOv <= 2) continue;
          // text crosses an edge — bug
          const overlapArea = xOv * yOv;
          const textArea = Math.max(1, t.w * t.h);
          const pct = overlapArea / textArea;
          if (pct < 0.15) continue; // need at least 15% overlap to flag
          bugs.push({
            kind: 'text-crosses-card-edge',
            text: t.txt.slice(0, 50),
            pct: Math.round(pct * 100),
            cardBox: `(${Math.round(c.x)},${Math.round(c.y)})→(${Math.round(c.right)},${Math.round(c.bottom)})`,
          });
        }
      }

      return { bugs };
    });

    if (result.bugs?.length) {
      issues.push({ file: fp, bugs: result.bugs });
    }
  }
}

await browser.close();

const counts = {};
for (const i of issues) {
  for (const b of i.bugs) counts[b.kind] = (counts[b.kind] || 0) + 1;
}

console.log(`\nAudited ${total} SVGs`);
console.log(`Files with bugs: ${issues.length}`);
console.log(`Bug counts: ${JSON.stringify(counts)}`);
console.log('-'.repeat(80));

for (const i of issues) {
  console.log(`\n${i.file}`);
  for (const b of i.bugs.slice(0, 8)) {
    if (b.kind === 'line-crosses-text') console.log(`  LINE crosses TEXT "${b.text}" at y=${b.lineY}`);
    else if (b.kind === 'line-crosses-card') console.log(`  LINE crosses CARD ${b.cardBox} at y=${b.lineY}`);
    else if (b.kind === 'text-overlap') console.log(`  TEXT overlap "${b.a}" ⇆ "${b.b}" (${b.pct}%)`);
    else if (b.kind === 'text-near-card-bottom') console.log(`  TEXT "${b.text}" too close to card bottom (gap ${b.gap}px)`);
    else if (b.kind === 'text-crosses-card-edge') console.log(`  TEXT "${b.text}" crosses EDGE of card ${b.cardBox} (${b.pct}%)`);
    else if (b.kind === 'raw-ampersand') console.log(`  RAW & x${b.count} — breaks <img> rendering, escape as &amp;`);
  }
  if (i.bugs.length > 8) console.log(`  ... +${i.bugs.length - 8} more`);
}

fs.writeFileSync('audit-svgs-v4-report.json', JSON.stringify({ total, issues, counts }, null, 2));
