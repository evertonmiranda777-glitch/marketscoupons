import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve('.');
const L = {
  pt: { home: 'Início',      guides: 'Guias',     blog: 'Blog' },
  es: { home: 'Inicio',      guides: 'Guías',     blog: 'Blog' },
  it: { home: 'Home',        guides: 'Guide',     blog: 'Blog' },
  fr: { home: 'Accueil',     guides: 'Guides',    blog: 'Blog' },
  de: { home: 'Startseite',  guides: 'Leitfäden', blog: 'Blog' },
  ar: { home: 'الرئيسية',    guides: 'الأدلة',    blog: 'المدونة' }
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

let updated = 0;
for (const lang of Object.keys(L)) {
  const dir = path.join(ROOT, lang, 'guides');
  if (!fs.existsSync(dir)) continue;
  const { home, guides, blog } = L[lang];

  for (const file of walk(dir)) {
    let html = fs.readFileSync(file, 'utf8');
    const before = html;

    // Breadcrumb: <a href="/<lang>/">Home</a> / <a href="/<lang>/guides">Guides</a>
    html = html.replace(
      new RegExp(`<a href="/${lang}/">Home</a>\\s*/\\s*<a href="/${lang}/guides">Guides</a>`),
      `<a href="/${lang}/">${home}</a> / <a href="/${lang}/guides">${guides}</a>`
    );

    // Footer: · separated
    html = html.replace(
      new RegExp(`<a href="/${lang}/">Home</a>\\s*·\\s*<a href="/${lang}/blog">Blog</a>\\s*·\\s*<a href="/${lang}/guides">Guides</a>`),
      `<a href="/${lang}/">${home}</a> · <a href="/${lang}/blog">${blog}</a> · <a href="/${lang}/guides">${guides}</a>`
    );

    if (html !== before) {
      fs.writeFileSync(file, html);
      updated++;
    }
  }
}

console.log(`Updated ${updated} files`);
