#!/usr/bin/env node
// Auto-fix SVGs based on audit findings
// Pattern A: extend viewBox bottom by (max_overflow_y - viewBox_height + 12)
// Pattern B: shift left labels (text-anchor=end with negative x after CTM) by adding 10 to wrapping g translate
// We use audit JSON report to identify issues.
import fs from 'node:fs';

const report = JSON.parse(fs.readFileSync('audit-svgs-report.json', 'utf8'));
let fixed = 0;

for (const issue of report.issues) {
  const fp = issue.file.replaceAll('\\', '/');
  let svg = fs.readFileSync(fp, 'utf8');
  let modified = false;

  // Identify viewBox
  const vbMatch = svg.match(/viewBox="(0 0 \d+) (\d+(?:\.\d+)?)"/);
  if (!vbMatch) continue;
  const vbW = parseFloat(svg.match(/viewBox="0 0 (\d+)/)[1]);
  let vbH = parseFloat(vbMatch[2]);

  // Find max overflow Y from issues
  let maxOverflowY = 0;
  if (issue.overflow) {
    for (const o of issue.overflow) {
      if (o.side && o.side.includes('B')) {
        const elBottom = o.y + o.h;
        if (elBottom > maxOverflowY) maxOverflowY = elBottom;
      }
    }
  }
  // If overlaps exist between body text and footer italic, extend viewBox to give footer breathing room
  let footerOverlap = false;
  if (issue.overlaps) {
    for (const ov of issue.overlaps) {
      if (ov.a?.includes('·') || ov.b?.includes('·')) footerOverlap = true;
      if (/master setup|Don't rush|Every Fibonacci|BTC waves|UTAD on declining|Accumulation/.test(ov.a + ov.b)) footerOverlap = true;
    }
  }

  // Pattern A — extend viewBox bottom
  if (maxOverflowY > vbH) {
    const newH = Math.ceil(maxOverflowY + 14);
    svg = svg.replace(/viewBox="0 0 (\d+) \d+(?:\.\d+)?"/, `viewBox="0 0 $1 ${newH}"`);
    // Bg rect: <rect width="900" height="X" fill="url(#bg...)"/>
    svg = svg.replace(/<rect width="(\d+)" height="\d+(?:\.\d+)?" fill="url\(#bg/, `<rect width="$1" height="${newH}" fill="url(#bg`);
    modified = true;
    vbH = newH;
  } else if (footerOverlap) {
    // Just extend viewBox by 24px to give footer clearance
    const newH = vbH + 24;
    svg = svg.replace(/viewBox="0 0 (\d+) \d+(?:\.\d+)?"/, `viewBox="0 0 $1 ${newH}"`);
    svg = svg.replace(/<rect width="(\d+)" height="\d+(?:\.\d+)?" fill="url\(#bg/, `<rect width="$1" height="${newH}" fill="url(#bg`);
    // Move italic footer text down by 24
    svg = svg.replace(/<text x="(\d+)" y="(\d+)" fill="#F0B429" font-size="12" font-style="italic"/g,
      (m, x, y) => `<text x="${x}" y="${parseInt(y) + 24}" fill="#F0B429" font-size="12" font-style="italic"`);
    modified = true;
  }

  // Pattern B — left label overflow (x="-10" or "-20" with anchor=end). Add 10 to negative anchor x values.
  if (issue.overflow) {
    for (const o of issue.overflow) {
      if (o.side === 'L' && o.tag === 'text' && o.x < 0) {
        // Find this text in SVG: look for text with text-anchor="end" and either x="-10" or x="-20"
        // Adjust by adding (-o.x + 4)
        const shift = -o.x + 4;
        // Bulk: any text-anchor="end" with x="-N" pattern → x="0"
        const re = /<text x="(-\d+)" y="(\d+)" fill="([^"]*)" font-size="(\d+)"([^>]*?)text-anchor="end"/g;
        svg = svg.replace(re, (m, x, y, fill, fs2, rest) => {
          const newX = Math.max(0, parseInt(x) + shift);
          return `<text x="${newX}" y="${y}" fill="${fill}" font-size="${fs2}"${rest}text-anchor="end"`;
        });
        modified = true;
        break; // single pass enough
      }
    }
  }

  if (modified) {
    fs.writeFileSync(fp, svg);
    fixed++;
    console.log(`fixed: ${fp}`);
  }
}

console.log(`\n${fixed} files modified.`);
