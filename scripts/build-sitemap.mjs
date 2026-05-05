#!/usr/bin/env node
/**
 * build-sitemap.mjs — Regenera sitemap.xml com TODAS as URLs estáticas.
 *
 * Lê:
 * - firms/*.html → /apex, /bulenox, etc (12)
 * - compare/*.html → /apex-vs-bulenox, etc (132)
 * - en/guides/*.html, pt/guides/*.html → /guides/{slug}, /pt/guides/{slug}
 * - Páginas core hardcoded
 *
 * Hreflang só pra páginas que têm variante linguística.
 *
 * Output: sitemap.xml na raiz.
 *
 * Usage: node scripts/build-sitemap.mjs
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const SITE = 'https://www.marketscoupons.com';
const NOW = new Date().toISOString().slice(0, 10);
const LANGS = ['en', 'es', 'fr', 'de', 'it', 'ar'];

function urlEntry({ loc, changefreq = 'weekly', priority = '0.7', lastmod = NOW, alternates = null }) {
  const altLines = alternates ? alternates.map(a => `    <xhtml:link rel="alternate" hreflang="${a.lang}" href="${a.url}"/>`).join('\n') : '';
  return `  <url>
    <loc>${loc}</loc>
${altLines ? altLines + '\n' : ''}    <lastmod>${lastmod}</lastmod>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`;
}

function lsHtml(dir) {
  try {
    return fs.readdirSync(path.join(ROOT, dir)).filter(f => f.endsWith('.html')).map(f => f.replace('.html', ''));
  } catch { return []; }
}

const entries = [];

// ── Home (com hreflang completo) ──
entries.push(urlEntry({
  loc: `${SITE}/`,
  changefreq: 'daily',
  priority: '1.0',
  alternates: [
    { lang: 'pt-BR', url: `${SITE}/` },
    ...LANGS.map(l => ({ lang: l, url: `${SITE}/${l}/` })),
    { lang: 'x-default', url: `${SITE}/` },
  ],
}));
LANGS.forEach(lang => {
  entries.push(urlEntry({
    loc: `${SITE}/${lang}/`,
    changefreq: 'daily',
    priority: '0.9',
  }));
});

// ── Páginas core (PT + 6 idiomas) ──
const corePages = [
  'firms', 'compare', 'calendar', 'heatmap', 'analise', 'gamma',
  'guides', 'blog', 'live', 'quiz', 'awards', 'painel', 'loyalty',
  'calculator', 'privacy', 'terms',
];
corePages.forEach(p => {
  entries.push(urlEntry({ loc: `${SITE}/${p}`, priority: '0.6' }));
});

// ── Firm landings (12) ──
const firms = lsHtml('firms');
firms.forEach(slug => {
  entries.push(urlEntry({
    loc: `${SITE}/${slug}`,
    changefreq: 'weekly',
    priority: '0.9',
    alternates: [{ lang: 'pt-BR', url: `${SITE}/${slug}` }],
  }));
});

// ── Compare pages (132) ──
const compares = lsHtml('compare');
compares.forEach(slug => {
  entries.push(urlEntry({
    loc: `${SITE}/${slug}`,
    changefreq: 'weekly',
    priority: '0.85',
    alternates: [{ lang: 'pt-BR', url: `${SITE}/${slug}` }],
  }));
});

// ── Guides (PT + EN como exemplos) ──
const guidesPt = lsHtml('pt/guides');
const guidesEn = lsHtml('en/guides');

// PT-only guides (reviews por firma)
guidesPt.forEach(slug => {
  entries.push(urlEntry({
    loc: `${SITE}/pt/guides/${slug}`,
    changefreq: 'monthly',
    priority: '0.75',
  }));
});
// EN guides + outros idiomas
guidesEn.forEach(slug => {
  const alts = [
    { lang: 'en', url: `${SITE}/guides/${slug}` },
    { lang: 'pt-BR', url: `${SITE}/pt/guides/${slug}` },
  ];
  // Tenta alternates noutros idiomas
  ['es', 'fr', 'de', 'it', 'ar'].forEach(l => {
    if (fs.existsSync(path.join(ROOT, l, 'guides', `${slug}.html`))) {
      alts.push({ lang: l, url: `${SITE}/${l}/guides/${slug}` });
    }
  });
  entries.push(urlEntry({
    loc: `${SITE}/guides/${slug}`,
    changefreq: 'monthly',
    priority: '0.75',
    alternates: alts,
  }));
});

// ── Composição final ──
const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">

  <!-- Generated ${new Date().toISOString()} by scripts/build-sitemap.mjs -->
  <!-- ${entries.length} URLs total -->

${entries.join('\n\n')}

</urlset>
`;

fs.writeFileSync(path.join(ROOT, 'sitemap.xml'), xml, 'utf8');

console.log(`Sitemap regenerated:`);
console.log(`  - 1 home + ${LANGS.length} lang variants`);
console.log(`  - ${corePages.length} core pages`);
console.log(`  - ${firms.length} firm landings`);
console.log(`  - ${compares.length} compare pages`);
console.log(`  - ${guidesPt.length} PT guides`);
console.log(`  - ${guidesEn.length} EN guides`);
console.log(`  TOTAL: ${entries.length} URLs · ${(xml.length / 1024).toFixed(1)}kb`);
