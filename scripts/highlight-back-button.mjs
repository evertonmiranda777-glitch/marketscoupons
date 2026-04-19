import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve('.');
const LANG_LABELS = {
  en: 'Close',  pt: 'Fechar', es: 'Cerrar', it: 'Chiudi',
  fr: 'Fermer', de: 'Schließen', ar: 'إغلاق'
};
const GUIDES_LABELS = {
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

const NEW_CSS = `.nav-back{display:inline-flex;align-items:center;gap:8px;padding:9px 16px 9px 14px;background:linear-gradient(135deg,rgba(240,180,41,0.18),rgba(240,180,41,0.10));border:1px solid rgba(240,180,41,0.45);border-radius:999px;color:var(--gold);text-decoration:none;font-size:13px;font-weight:700;transition:all .2s ease;box-shadow:0 2px 12px rgba(240,180,41,0.15)}
.nav-back:hover{background:linear-gradient(135deg,rgba(240,180,41,0.28),rgba(240,180,41,0.16));border-color:var(--gold);box-shadow:0 4px 18px rgba(240,180,41,0.3);transform:translateY(-1px)}
.nav-back .x{display:inline-flex;align-items:center;justify-content:center;width:18px;height:18px;border-radius:50%;background:rgba(240,180,41,0.25);font-size:14px;font-weight:800;line-height:1}`;

let updated = 0;
for (const file of targets) {
  const rel = path.relative(ROOT, file).replace(/\\/g, '/');
  const parts = rel.split('/');
  const lang = GUIDES_LABELS[parts[0]] ? parts[0] : 'en';
  const closeLabel = LANG_LABELS[lang];
  const guidesLabel = GUIDES_LABELS[lang];
  const href = lang === 'en' ? '/guides' : `/${lang}/guides`;

  let html = fs.readFileSync(file, 'utf8');
  const before = html;

  // Replace CSS for .nav-back (and hover) — covers both old one-liner forms
  html = html.replace(
    /\.nav-back\{[^}]*\}\s*\.nav-back:hover\{[^}]*\}/,
    NEW_CSS
  );

  // Replace anchor markup
  html = html.replace(
    /<a href="[^"]*" class="nav-back"[^>]*>[^<]*<\/a>/,
    `<a href="${href}" class="nav-back" aria-label="${closeLabel} — ${guidesLabel}"><span class="x">×</span>${closeLabel}</a>`
  );

  if (html !== before) {
    fs.writeFileSync(file, html);
    updated++;
  }
}

console.log(`Updated ${updated}/${targets.length} files`);
