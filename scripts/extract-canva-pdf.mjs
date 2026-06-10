import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const { getDocument } = await import('pdfjs-dist/legacy/build/pdf.mjs');

const file = process.argv[2];
if (!file) { console.error('uso: node extract-canva-pdf.mjs <pdf>'); process.exit(1); }

const data = new Uint8Array(fs.readFileSync(file));
const doc = await getDocument({ data, useSystemFonts: false }).promise;
const page = await doc.getPage(1);
const vp = page.getViewport({ scale: 1 });
const pageHeight = vp.height;
const pageWidth = vp.width;

console.log(`# PDF: ${path.basename(file)}`);
console.log(`# Page: ${pageWidth.toFixed(0)} x ${pageHeight.toFixed(0)}`);

const tc = await page.getTextContent();
console.log('\n## Elementos de texto (x, y, w, h, fontSize, fontName, text):\n');

const items = tc.items.filter(it => it.str && it.str.trim());
for (const it of items) {
  // transform: [a, b, c, d, e, f], escala em a,d, posição em e,f
  const [a, b, c, d, e, f] = it.transform;
  const fontSize = Math.hypot(a, b);
  const x = e;
  const y = pageHeight - f; // PDF Y é bottom-up; converter pra top-down
  const w = it.width;
  const h = it.height || fontSize;
  const fontName = it.fontName;
  console.log(`x=${x.toFixed(1)} y=${y.toFixed(1)} w=${w.toFixed(1)} fs=${fontSize.toFixed(1)} font=${fontName} | "${it.str}"`);
}

// Cor: precisa do operator list
console.log('\n## Cores (rgb usadas):\n');
const ops = await page.getOperatorList();
const fns = ops.fnArray;
const args = ops.argsArray;
const OPS = (await import('pdfjs-dist/legacy/build/pdf.mjs')).OPS;
const colors = new Set();
for (let i = 0; i < fns.length; i++) {
  const fn = fns[i];
  if (fn === OPS.setFillRGBColor || fn === OPS.setStrokeRGBColor) {
    const [r, g, bl] = args[i].map(x => Math.round(x * 255));
    colors.add(`#${r.toString(16).padStart(2,'0')}${g.toString(16).padStart(2,'0')}${bl.toString(16).padStart(2,'0')}`);
  }
}
[...colors].forEach(c => console.log(c));
