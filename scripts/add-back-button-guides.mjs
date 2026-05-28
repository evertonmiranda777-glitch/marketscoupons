#!/usr/bin/env node
// Add "back to guides" button before </article> in all guide HTML files.
import fs from 'node:fs';
import path from 'node:path';

const LABELS = {
  pt: '← Ver todos os guias',
  en: '← See all guides',
  es: '← Ver todas las guías',
  fr: '← Voir tous les guides',
  de: '← Alle Anleitungen ansehen',
  it: '← Vedi tutte le guide',
  ar: '← عرض جميع الأدلة',
};

const ROOTS = ['guides', 'en/guides', 'es/guides', 'fr/guides', 'de/guides', 'it/guides', 'ar/guides'];
const SLUGS = ['o-que-e-uma-prop-firm', 'como-passar-no-desafio', 'gerenciamento-drawdown', 'position-sizing', 'como-sacar-lucros'];

const MARK = 'guide-back-cta';
let touched = 0, skipped = 0;

for (const root of ROOTS) {
  const lang = root === 'guides' ? 'pt' : root.split('/')[0];
  const label = LABELS[lang];
  const href = lang === 'pt' ? '/guides' : `/${lang}/guides`;
  const block = `\n<div class="${MARK}" style="margin:40px 0 8px;display:flex;justify-content:center"><a href="${href}" style="display:inline-flex;align-items:center;gap:8px;padding:14px 28px;border:1px solid rgba(255,255,255,.18);border-radius:10px;color:#E6EAF2;font-weight:600;font-size:15px;text-decoration:none;background:rgba(255,255,255,.03);transition:.2s" onmouseover="this.style.borderColor='#F0B429';this.style.color='#F0B429'" onmouseout="this.style.borderColor='rgba(255,255,255,.18)';this.style.color='#E6EAF2'">${label}</a></div>\n`;
  for (const slug of SLUGS) {
    const fp = path.join(root, slug + '.html');
    if (!fs.existsSync(fp)) continue;
    let html = fs.readFileSync(fp, 'utf8');
    if (html.includes(MARK)) { skipped++; continue; }
    if (html.includes('</article>')) {
      html = html.replace('</article>', block + '  </article>');
    } else if (html.includes('</main>')) {
      html = html.replace('</main>', block + '</main>');
    } else if (html.includes('</body>')) {
      html = html.replace('</body>', block + '</body>');
    } else {
      // truncated file — just append
      html = html.trimEnd() + block;
    }
    fs.writeFileSync(fp, html);
    touched++;
  }
}
console.log(`touched: ${touched}, skipped (already had): ${skipped}`);
