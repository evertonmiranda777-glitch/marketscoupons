#!/usr/bin/env node
/**
 * build-sitemap.mjs, Regenera sitemap.xml com TODAS as URLs estáticas.
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
const LANGS = ['en','es','fr','de','it','ar','id'];

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
  'guides', 'blog', 'live', 'quiz', 'awards', 'painel',
  'calculator', 'privacy', 'terms', 'coupons',
];
corePages.forEach(p => {
  entries.push(urlEntry({ loc: `${SITE}/${p}`, priority: '0.6' }));
});

// 🔴 AS 6 LISTAS NAO ESTAVAM NO SITEMAP (achado 06/08).
// Sao exatamente as paginas que atacam o maior cluster de demanda dos EUA:
// "best/top/ranking prop firms" tem 340 impressoes em 30 dias, e "cheapest prop
// firm" e o termo mais forte do autocomplete americano no grupo de preco.
// As paginas existem, sao boas (534 palavras, 18 firmas com preco real, titulo e
// canonical proprios por rota) e o Google nunca foi avisado de que existem , o
// que sobrou foi rastreio por link interno, mais lento e com menos prioridade.
// Prioridade 0.9: e o cluster de maior demanda nao-marca do site.
const LISTAS = [
  'best-prop-firms',
  'best-prop-firms-futures',
  'best-prop-firms-no-activation-fee',
  'best-prop-firms-with-coupon',
  'cheapest-prop-firms',
  'highest-rated-prop-firms',
];
LISTAS.forEach(p => {
  entries.push(urlEntry({ loc: `${SITE}/${p}`, changefreq: 'weekly', priority: '0.9' }));
});

// ── Firm landings (SPA routes via cms_firms) ──
const SB_URL_F = 'https://qfwhduvutfumsaxnuofa.supabase.co';
const ANON_F = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFmd2hkdXZ1dGZ1bXNheG51b2ZhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQzNzc5NDYsImV4cCI6MjA4OTk1Mzk0Nn0.efRel6U68misvPSRj8-p31-gOhzjXN4eIFMiloTNyk4';
let firms = [];
try {
  const r = await fetch(`${SB_URL_F}/rest/v1/cms_firms?active=eq.true&select=id&order=sort_order.asc`, {
    headers: { apikey: ANON_F, Authorization: `Bearer ${ANON_F}` }
  });
  firms = (await r.json()).map(f => f.id);
} catch (e) { console.error('firms fetch fail:', e.message); }
firms.forEach(slug => {
  entries.push(urlEntry({
    loc: `${SITE}/${slug}`,
    changefreq: 'weekly',
    priority: '0.9',
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

// 🔴 CORRIGIDO 06/08 , o sitemap listava 18 guias e existem 91 no disco.
// A causa: ele enumerava a pasta `en/guides` (que tem so 6 arquivos, resto de uma
// estrutura antiga) para montar as URLs da RAIZ, mas os guias em ingles moram em
// `/guides` (17 arquivos). E es/fr/de/it/ar (17 cada) nao entravam de jeito nenhum.
// Efeito medido: "fundednext review" nos EUA aparecia com a versao /pt/ na posicao
// 51 competindo com a inglesa na 31 , duas paginas nossas disputando a mesma busca,
// e as versoes europeias invisiveis.
// A RAIZ e o INGLES (o site e EN-default), igual ao blog.
const OUTRAS = ['pt', 'es', 'fr', 'de', 'it', 'ar', 'id'];
const guidesRaiz = lsHtml('guides');
guidesRaiz.forEach(slug => {
  const alts = [
    { lang: 'en', url: `${SITE}/guides/${slug}` },
    { lang: 'x-default', url: `${SITE}/guides/${slug}` },
  ];
  OUTRAS.forEach(l => {
    if (fs.existsSync(path.join(ROOT, l, 'guides', `${slug}.html`))) {
      alts.push({ lang: l === 'pt' ? 'pt-BR' : l, url: `${SITE}/${l}/guides/${slug}` });
    }
  });
  // uma entrada por idioma que EXISTE no disco, todas apontando uma pra outra
  entries.push(urlEntry({ loc: `${SITE}/guides/${slug}`, changefreq: 'monthly', priority: '0.75', alternates: alts }));
  OUTRAS.forEach(l => {
    if (fs.existsSync(path.join(ROOT, l, 'guides', `${slug}.html`))) {
      entries.push(urlEntry({ loc: `${SITE}/${l}/guides/${slug}`, changefreq: 'monthly', priority: '0.7', alternates: alts }));
    }
  });
});
// guia que so existe em PT (review de firma sem versao inglesa ainda)
guidesPt.forEach(slug => {
  if (guidesRaiz.includes(slug)) return;
  entries.push(urlEntry({ loc: `${SITE}/pt/guides/${slug}`, changefreq: 'monthly', priority: '0.7' }));
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
    // 🔴 CONTRADICAO CORRIGIDA (06/08): este bloco dizia ao Google que a raiz
    // /blog/<slug> era **pt-BR**, e o blog.html diz que a raiz e **INGLES**
    // (hl-en aponta pra raiz, pt vai pra /blog/pt/). O Google confia no sitemap,
    // que e servido pelo servidor, e nao no hreflang injetado por JavaScript ,
    // por isso ele servia a versao EM PORTUGUES pra quem buscava em ingles.
    // Sintoma medido: "apex trader funding vs bulenox" com 71 impressoes e ZERO
    // clique, mostrando "Apex vs Bulenox: Qual Vale Mais em 2026?" no resultado.
    // O site e EN-default: a RAIZ e o ingles, ponto.
    if (langArr.includes('en')) {
      alts.push({ lang: 'en', url: `${SITE}/blog/${slug}` });
      alts.push({ lang: 'x-default', url: `${SITE}/blog/${slug}` });
    }
    langArr.forEach(l => {
      if (l === 'en') return;
      alts.push({ lang: l === 'pt' ? 'pt-BR' : l, url: `${SITE}/blog/${l}/${slug}` });
    });
    // uma entrada por idioma. O ingles mora na RAIZ , /blog/en/<slug> nao entra no
    // sitemap de proposito: serve o mesmo conteudo e seria duplicata da raiz.
    langArr.forEach(l => {
      const loc = l === 'en' ? `${SITE}/blog/${slug}` : `${SITE}/blog/${l}/${slug}`;
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
