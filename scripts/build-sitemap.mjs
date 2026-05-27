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

// ── Compare pages (132 PT + ate 132x6 traducoes) ──
const compares = lsHtml('compare');
compares.forEach(slug => {
  const alts = [{ lang: 'pt-BR', url: `${SITE}/${slug}` }];
  for (const lng of LANGS) {
    if (fs.existsSync(path.join(ROOT, lng, 'compare', `${slug}.html`))) {
      alts.push({ lang: lng, url: `${SITE}/${lng}/${slug}` });
    }
  }
  alts.push({ lang: 'x-default', url: `${SITE}/${slug}` });
  entries.push(urlEntry({ loc: `${SITE}/${slug}`, changefreq: 'weekly', priority: '0.85', alternates: alts }));
  for (const lng of LANGS) {
    if (fs.existsSync(path.join(ROOT, lng, 'compare', `${slug}.html`))) {
      entries.push(urlEntry({ loc: `${SITE}/${lng}/${slug}`, changefreq: 'weekly', priority: '0.75', alternates: alts }));
    }
  }
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

// ── Blog posts (fetch from Supabase blog_posts) ──
const SB_URL = 'https://qfwhduvutfumsaxnuofa.supabase.co';
const ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFmd2hkdXZ1dGZ1bXNheG51b2ZhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQzNzc5NDYsImV4cCI6MjA4OTk1Mzk0Nn0.efRel6U68misvPSRj8-p31-gOhzjXN4eIFMiloTNyk4';
try {
  const res = await fetch(`${SB_URL}/rest/v1/blog_posts?active=eq.true&select=slug,lang&order=sort_order.asc`, {
    headers: { apikey: ANON, Authorization: `Bearer ${ANON}` }
  });
  const posts = await res.json();
  // Group by slug to compute hreflang alternates
  const bySlug = {};
  posts.forEach(p => { (bySlug[p.slug] = bySlug[p.slug] || new Set()).add(p.lang); });
  Object.entries(bySlug).forEach(([slug, langs]) => {
    const langArr = [...langs];
    const alts = [];
    if (langArr.includes('pt')) alts.push({ lang: 'pt-BR', url: `${SITE}/blog/${slug}` });
    langArr.forEach(l => {
      if (l === 'pt') return;
      alts.push({ lang: l, url: `${SITE}/blog/${l}/${slug}` });
    });
    if (langArr.includes('pt')) alts.push({ lang: 'x-default', url: `${SITE}/blog/${slug}` });
    // Emit one URL entry per language variant
    langArr.forEach(l => {
      const loc = l === 'pt' ? `${SITE}/blog/${slug}` : `${SITE}/blog/${l}/${slug}`;
      entries.push(urlEntry({ loc, changefreq: 'monthly', priority: '0.7', alternates: alts.length > 1 ? alts : null }));
    });
  });
  console.error(`Blog posts: ${posts.length} variants across ${Object.keys(bySlug).length} slugs`);
} catch (e) {
  console.error('Failed to fetch blog_posts:', e.message);
}

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
