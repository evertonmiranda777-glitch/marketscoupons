#!/usr/bin/env node
// Generic splicer: inserts the 12k-expansion blocks into a VPA lang body file,
// using language-independent anchors (id="pX", class="lead", <hr>, wyckoff link).
// Usage: node scripts/expand-vpa-langs.mjs <lang>
import fs from 'node:fs';

const lang = process.argv[2];
if(!lang){ console.error('usage: expand-vpa-langs.mjs <lang>'); process.exit(1); }
const file = `data/preview/vpa-v7-${lang}.body.html`;
const blocksPath = new URL(`./_vpa-blocks-${lang}.mjs`, import.meta.url);
const { B } = await import(blocksPath.href);
let html = fs.readFileSync(file,'utf8');

if(html.includes('id="lineage"')){ console.log(lang,'already expanded, skipping'); process.exit(0); }

function before(id, block){
  const m = `<h2 id="${id}"`;
  const i = html.indexOf(m);
  if(i<0){ console.warn('  MISSING anchor', id); return; }
  html = html.slice(0,i) + block + '\n\n' + html.slice(i);
}
function afterTocItem(hrefId, li){
  const i = html.indexOf(`href="#${hrefId}"`);
  if(i<0){ console.warn('  MISSING toc', hrefId); return; }
  const e = html.indexOf('</li>', i) + 5;
  html = html.slice(0,e) + '\n    ' + li + html.slice(e);
}

// TOC new entries
afterTocItem('p1', B.toc.lineage);
afterTocItem('p2', B.toc.analogies);
afterTocItem('p7', B.toc.psych);
afterTocItem('p9', B.toc.walkthrough);
afterTocItem('p9', B.toc.cases);   // inserted after p9 too; will sit before p10 entry, adjust order below
afterTocItem('p12', B.toc.myths);
afterTocItem('p13', B.toc.manage);
afterTocItem('p13', B.toc.hacks);

// NOTE: cases should come after walkthrough; afterTocItem inserts right after p9 each time,
// so the later call lands first. We inserted walkthrough then cases -> cases ends up before walkthrough.
// Fix ordering: rebuild those two cleanly.
html = html.replace(B.toc.cases+'\n    '+B.toc.walkthrough, B.toc.walkthrough+'\n    '+B.toc.cases);
// Same for manage/hacks after p13 (hacks inserted last lands first)
html = html.replace(B.toc.hacks+'\n    '+B.toc.manage, B.toc.manage+'\n    '+B.toc.hacks);

// Lead 2nd paragraph: before the TOC div
html = html.replace('<div class="toc">', B.lead2 + '\n\n<div class="toc">');

// Section blocks
before('p2', B.lineage);
before('p3', B.analogies);
before('p7', B.nosupply);
before('p8', B.climax + '\n\n' + B.psych);
before('p10', B.spring + '\n\n' + B.walkthrough + '\n\n' + B.cases);
before('p11', B.instruments);
before('p13', B.myths);
before('p14', B.confluence + '\n\n' + B.manage + '\n\n' + B.hacks);

// 4 new FAQ before <hr>
html = html.replace('<hr>', B.faq4 + '\n\n<hr>');

// Conclusion extra paragraphs: append at end
html = html.trimEnd() + '\n\n' + B.conclusion + '\n';

fs.writeFileSync(file, html);
const words = html.replace(/<style>[\s\S]*?<\/style>/,'').replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim().split(' ').length;
const rawAmp = (html.match(/&(?!amp;|lt;|gt;|quot;|apos;|#)/g)||[]).length;
const svgs = (html.match(/blog-diagrams\/vpa\//g)||[]).length;
console.log(`${lang}: words=${words} svgs=${svgs} rawAmp=${rawAmp} h2=${(html.match(/<h2 /g)||[]).length}`);
