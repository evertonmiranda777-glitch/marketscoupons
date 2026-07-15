#!/usr/bin/env node
/**
 * build-firm-seo-shells.mjs
 *
 * Problema: /apex, /bulenox... (~19 rotas de firma) hoje rewriteam pra index.html.
 * O HTML cru que o Googlebot vê na 1a passada tem o <title>/description/canonical
 * DA HOME (canonical -> "/"). O app.js corrige tudo via JS, mas canonical->home no
 * HTML cru = sinal forte de "duplicate da home" -> as paginas de maior intencao
 * comercial ("{firm} coupon code") nao rankeiam.
 *
 * Fix (minimo, EN-default, ZERO divergencia de conteudo): gera firms/{id}.html =
 * index.html byte-identico, so com o <head> patchado por firma (title/description/
 * canonical/OG/twitter/keywords EN reusando FIRM_SEO_META.en do app.js) + JSON-LD
 * Product + BreadcrumbList. O corpo continua o SPA (mesmo design, dados ao vivo).
 * app.js re-seta os mesmos valores no cliente => sem flicker/mismatch.
 *
 * Roteamento: vercel.json linha ~89 muda de "/index.html" pra "/firms/$1.html".
 *
 * Uso: SUPABASE_ACCESS_TOKEN='sbp_...' node scripts/build-firm-seo-shells.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const OUT_DIR = path.join(ROOT, 'firms');
const SBP = process.env.SUPABASE_ACCESS_TOKEN || '';
const SR = process.env.SUPABASE_SERVICE_ROLE || '';
const SB_URL = 'https://qfwhduvutfumsaxnuofa.supabase.co';
const PROJECT_REF = 'qfwhduvutfumsaxnuofa';
if (!SR && !SBP) { console.error('SUPABASE_ACCESS_TOKEN ou SUPABASE_SERVICE_ROLE obrigatorio'); process.exit(1); }

// EN money-keyword templates (copia EXATA do FIRM_SEO_META.en do app.js)
const SEO = {
  title: '{name} Coupon, {discount}% OFF | {coupon} | MarketsCoupons',
  titleNoCoupon: '{name}, Plans & Review | MarketsCoupons',
  desc: 'Save up to {discount}% on {name} with exclusive coupon code {coupon}. Plans from {minPrice}. Trustpilot {rating}/5 ({reviews} reviews).',
  descNoCoupon: '{name}: plans from {minPrice}, {split} profit split. Trustpilot {rating}/5 ({reviews} reviews). Compare and choose.',
  og: 'Exclusive {name} coupon with up to {discount}% OFF. Code {coupon}. Compare plans, prices and reviews on MarketsCoupons.',
};
// Rotas de firma que existem no vercel.json (linha 89). So geramos essas.
const ROUTE_IDS = new Set(['apex','bulenox','ftmo','fn','e2t','the5ers','fundingpips','brightfunded','e8','cti','tradeday','blueguardian','toponefutures','aquafutures','blueberryfutures','alphafutures','futureselite','goat','funded-futures-family']);

const escHtml = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const safeJson = (o) => JSON.stringify(o).replace(/</g, '\\u003c').replace(/>/g, '\\u003e').replace(/&/g, '\\u0026');
const num = (s) => { const m = String(s ?? '').match(/-?\d+(\.\d+)?/); return m ? parseFloat(m[0]) : null; };

async function loadFirms() {
  if (SR) {
    const r = await fetch(`${SB_URL}/rest/v1/cms_firms?active=eq.true&select=*&order=sort_order`, { headers: { apikey: SR, Authorization: `Bearer ${SR}` } });
    const d = await r.json(); if (Array.isArray(d) && d.length) return d;
  }
  const r = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`, {
    method: 'POST', headers: { Authorization: `Bearer ${SBP}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: 'SELECT * FROM cms_firms WHERE active=true ORDER BY sort_order' }),
  });
  const d = await r.json();
  if (Array.isArray(d)) return d;
  console.error('Management API error:', d); return [];
}

function fill(tpl, v) { let s = tpl; for (const [k, val] of Object.entries(v)) s = s.replaceAll(k, val); return s; }

function patchHead(html, f) {
  const id = f.id;
  const hasCoupon = f.coupon && f.coupon.length <= 16 && f.discount > 0;
  const minPrice = (f.prices && f.prices[0]) ? f.prices[0].n : '';
  const v = { '{name}': f.name, '{discount}': f.discount, '{coupon}': f.coupon || '', '{minPrice}': minPrice, '{rating}': f.rating, '{reviews}': f.reviews, '{split}': f.split };
  const title = fill(hasCoupon ? SEO.title : SEO.titleNoCoupon, v);
  const desc = fill(hasCoupon ? SEO.desc : SEO.descNoCoupon, v);
  const og = fill(hasCoupon ? SEO.og : SEO.descNoCoupon, v);
  const url = `https://www.marketscoupons.com/${id}`;
  const img = f.icon_url ? `https://www.marketscoupons.com${String(f.icon_url).startsWith('/') ? '' : '/'}${f.icon_url}` : 'https://www.marketscoupons.com/img/og-coupons.png';
  const keywords = `${f.name} coupon, ${f.name} coupon code, ${f.name} discount, ${f.name} promo code, ${f.name} review, ${f.name} prop firm, prop firm coupon, ${new Date().getFullYear()}`;

  let out = html;
  const rep = (re, val, label) => {
    if (!re.test(out)) { console.warn(`  ! [${id}] nao achei ${label}`); return; }
    out = out.replace(re, val);
  };
  // title
  rep(/<title>[\s\S]*?<\/title>/, `<title>${escHtml(title)}</title>`, 'title');
  // description
  rep(/<meta name="description" content="[^"]*">/, `<meta name="description" content="${escHtml(desc)}">`, 'description');
  // keywords
  rep(/<meta name="keywords" content="[^"]*">/, `<meta name="keywords" content="${escHtml(keywords)}">`, 'keywords');
  // canonical
  rep(/<link rel="canonical" href="[^"]*">/, `<link rel="canonical" href="${url}">`, 'canonical');
  // og
  rep(/<meta property="og:url" content="[^"]*">/, `<meta property="og:url" content="${url}">`, 'og:url');
  rep(/<meta property="og:title" content="[^"]*">/, `<meta property="og:title" content="${escHtml(title)}">`, 'og:title');
  rep(/<meta property="og:description" content="[^"]*">/, `<meta property="og:description" content="${escHtml(og)}">`, 'og:description');
  rep(/<meta property="og:image" content="[^"]*">/, `<meta property="og:image" content="${img}">`, 'og:image');
  // twitter
  rep(/<meta name="twitter:title" content="[^"]*">/, `<meta name="twitter:title" content="${escHtml(title)}">`, 'twitter:title');
  rep(/<meta name="twitter:description" content="[^"]*">/, `<meta name="twitter:description" content="${escHtml(og)}">`, 'twitter:description');

  // JSON-LD Product + BreadcrumbList (antes de </head>)
  const minP = num(minPrice);
  const rating = num(f.rating), reviews = num(f.reviews);
  const product = {
    '@context': 'https://schema.org', '@type': 'Product',
    name: `${f.name} Prop Firm Challenge`,
    description: desc, image: img, brand: { '@type': 'Brand', name: f.name },
    ...(minP ? { offers: { '@type': 'Offer', priceCurrency: 'USD', price: minP.toFixed(2), availability: 'https://schema.org/InStock', url } } : {}),
    ...(rating && reviews ? { aggregateRating: { '@type': 'AggregateRating', ratingValue: rating, reviewCount: reviews, bestRating: 5 } } : {}),
  };
  const crumbs = {
    '@context': 'https://schema.org', '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://www.marketscoupons.com/' },
      { '@type': 'ListItem', position: 2, name: `${f.name} Coupon`, item: url },
    ],
  };
  const ld = `<script type="application/ld+json">${safeJson(product)}</script>\n<script type="application/ld+json">${safeJson(crumbs)}</script>\n</head>`;
  out = out.replace('</head>', ld);
  return out;
}

async function main() {
  const src = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  const firms = await loadFirms();
  if (!firms.length) { console.error('Sem firmas.'); process.exit(1); }
  fs.mkdirSync(OUT_DIR, { recursive: true });
  let n = 0, skipped = [];
  for (const f of firms) {
    if (!ROUTE_IDS.has(f.id)) { skipped.push(f.id); continue; }
    const html = patchHead(src, f);
    fs.writeFileSync(path.join(OUT_DIR, `${f.id}.html`), html);
    const hasCoupon = f.coupon && f.coupon.length <= 16 && f.discount > 0;
    console.log(`  ok ${f.id.padEnd(24)} ${hasCoupon ? f.discount + '% ' + f.coupon : '(no code)'}`);
    n++;
  }
  const missing = [...ROUTE_IDS].filter(id => !firms.some(f => f.id === id));
  console.log(`\nGerados: ${n} arquivos em firms/`);
  if (missing.length) console.log(`Rotas sem firma ativa no DB: ${missing.join(', ')}`);
}
main().catch(e => { console.error(e); process.exit(1); });
