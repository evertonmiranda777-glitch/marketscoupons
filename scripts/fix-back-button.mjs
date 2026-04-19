import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve('.');
const LANG_LABELS = {
  en: 'Guides', pt: 'Guias', es: 'Guías', it: 'Guide',
  fr: 'Guides', de: 'Leitfäden', ar: 'الأدلة'
};

function walk(dir, out = []) {
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    const st = fs.statSync(full);
    if (st.isDirectory()) walk(full, out);
    else if (full.endsWith('-review.html')) out.push(full);
  }
  return out;
}

const targets = [
  ...walk(path.join(ROOT, 'guides')),
  ...['pt','es','it','fr','de','ar'].flatMap(l => {
    const p = path.join(ROOT, l, 'guides');
    return fs.existsSync(p) ? walk(p) : [];
  })
];

let updated = 0;
for (const file of targets) {
  const rel = path.relative(ROOT, file).replace(/\\/g, '/');
  const parts = rel.split('/');
  const lang = LANG_LABELS[parts[0]] ? parts[0] : 'en';
  const label = LANG_LABELS[lang];
  const href = lang === 'en' ? '/guides' : `/${lang}/guides`;

  let html = fs.readFileSync(file, 'utf8');
  const before = html;
  html = html.replace(
    /<a href="[^"]*" class="nav-back"[^>]*>[^<]*<\/a>/,
    `<a href="${href}" class="nav-back" aria-label="Back to ${label}">← ${label}</a>`
  );
  if (html !== before) {
    fs.writeFileSync(file, html);
    updated++;
  }
}

console.log(`Updated ${updated}/${targets.length} files`);
