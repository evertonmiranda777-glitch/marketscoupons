#!/usr/bin/env node
/**
 * build-firm-landings.mjs — Gera 12 páginas /firms/{firmId}.html
 *
 * Hoje /apex, /bulenox etc rewriteam pra index.html (client-side routing).
 * Bots veem todos como duplicate content do home → SEO travado em 12 URLs alta intenção.
 *
 * Esse script gera HTML estático per firma com:
 * - Hero branded (bg_image + logo + accent + discount badge)
 * - Coupon highlight box
 * - Plans grid (cada size) com preço orig + final + savings
 * - Stats grid (drawdown, split, target, news, day1, etc)
 * - Perks list + Proibido
 * - Trustpilot widget
 * - FAQ + schema (Product + FAQPage + BreadcrumbList)
 * - Internal links pras 11 outras firmas + comparativos
 * - CTAs gradient gold com shimmer
 *
 * Output: firms/{firmId}.html (12 arquivos)
 * Roteamento: vercel.json rewrites /{firmId} → /firms/{firmId}.html
 *
 * Usage: SUPABASE_SERVICE_ROLE='sbp_...' node scripts/build-firm-landings.mjs
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const OUT_DIR = path.join(ROOT, 'firms');

// Aceita tanto SUPABASE_SERVICE_ROLE (JWT pra PostgREST) quanto SUPABASE_ACCESS_TOKEN (sbp_ pra Management API).
const SR = process.env.SUPABASE_SERVICE_ROLE || '';
const SBP = process.env.SUPABASE_ACCESS_TOKEN || '';
const SB_URL = 'https://qfwhduvutfumsaxnuofa.supabase.co';
const PROJECT_REF = 'qfwhduvutfumsaxnuofa';
if (!SR && !SBP) { console.error('SUPABASE_SERVICE_ROLE ou SUPABASE_ACCESS_TOKEN obrigatório'); process.exit(1); }

const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
const num = (s) => { const m = String(s ?? '').match(/-?\d+(\.\d+)?/); return m ? parseFloat(m[0]) : null; };
// Safe JSON pra inline em <script type="application/ld+json"> — escape </script>, < e &
const safeJson = (o) => JSON.stringify(o).replace(/</g, '\\u003c').replace(/>/g, '\\u003e').replace(/&/g, '\\u0026');
// Img URL com slash garantido (icon_url do CMS pode vir sem leading /)
const imgUrl = (p) => p ? `https://www.marketscoupons.com${String(p).startsWith('/') ? '' : '/'}${p}` : '';

async function loadFirms() {
  // Tenta PostgREST primeiro se tiver service_role JWT
  if (SR) {
    const r = await fetch(`${SB_URL}/rest/v1/cms_firms?active=eq.true&select=*&order=sort_order`, {
      headers: { apikey: SR, Authorization: `Bearer ${SR}` },
    });
    const data = await r.json();
    if (Array.isArray(data) && data.length) return data;
  }
  // Fallback: Management API (sbp_ token) via raw SQL
  if (SBP) {
    const r = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${SBP}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: 'SELECT * FROM cms_firms WHERE active=true ORDER BY sort_order' }),
    });
    const data = await r.json();
    if (Array.isArray(data)) return data;
    console.error('Management API error:', data);
  }
  return [];
}

function priceMin(prices) {
  if (!Array.isArray(prices) || !prices.length) return null;
  const nums = prices.map(p => num(p.n)).filter(n => n != null);
  return nums.length ? Math.min(...nums) : null;
}

function priceMinOrig(prices) {
  if (!Array.isArray(prices) || !prices.length) return null;
  const nums = prices.map(p => num(p.o)).filter(n => n != null);
  return nums.length ? Math.min(...nums) : null;
}

function genPage(f, allFirms) {
  const minPrice = priceMin(f.prices);
  const minOrig = priceMinOrig(f.prices);
  const savings = (minOrig && minPrice) ? (minOrig - minPrice).toFixed(2) : null;
  const short = f.short_name || f.name.split(' ')[0];
  const others = allFirms.filter(o => o.id !== f.id).slice(0, 6);

  // Title: omitir o segmento "Cupom XXX" se firma não tem código próprio
  const titleCouponPart = f.coupon ? ` | Cupom ${f.coupon}` : '';
  const title = `${f.name} ${f.discount ? f.discount + '% OFF' : 'Cupom Exclusivo'} 2026${titleCouponPart} | Markets Coupons`;
  const desc = `${f.name}: ${f.discount ? f.discount + '% OFF' : 'cupom exclusivo'}${f.coupon ? ' com código ' + f.coupon : ''}. Drawdown ${f.drawdown || ''}, Split ${f.split || ''}. Conta a partir de ${minPrice ? '$' + minPrice.toFixed(2) : 'preços competitivos'}.`.slice(0, 160);

  // Stats compactos
  const stats = [
    { lbl: 'Drawdown', val: f.drawdown || '—', hint: f.dd_pct },
    { lbl: 'Profit Split', val: f.split || '—' },
    { lbl: 'Profit Target', val: f.target || '—' },
    { lbl: 'Min. Days', val: f.min_days ? `${f.min_days} dias` : '—' },
    { lbl: 'Avaliação', val: f.eval_days ? `${f.eval_days} dias` : '—' },
    { lbl: 'Scaling', val: f.scaling || '—' },
    { lbl: 'Leverage', val: f.leverage || '—' },
    { lbl: 'Max Accounts', val: f.max_accounts || '—' },
    { lbl: 'Consistency', val: f.consistency || '—' },
    { lbl: 'Payout Speed', val: f.payout_speed || '—' },
    { lbl: 'News Trading', val: f.news_trading ? '✓ Permitido' : '✗ Bloqueado', win: !!f.news_trading },
    { lbl: 'Day-1 Payout', val: f.day1_payout ? '✓ Sim' : '✗ Não', win: !!f.day1_payout },
  ];

  // Plans grid — cada size com preço
  const plansHtml = (Array.isArray(f.prices) && f.prices.length)
    ? f.prices.map(p => {
        const orig = num(p.o);
        const fin = num(p.n);
        const sav = (orig && fin) ? (orig - fin).toFixed(2) : null;
        const pct = (orig && fin) ? Math.round((1 - fin/orig) * 100) : null;
        return `<div class="plan">
          <div class="plan-size">${esc(p.a || p.size || p.s || '—')}</div>
          ${pct ? `<div class="plan-pct">${pct}% OFF</div>` : ''}
          <div class="plan-prices">
            ${orig ? `<div class="plan-orig">$${orig.toFixed(2)}</div>` : ''}
            <div class="plan-final">${fin ? `$${fin.toFixed(2)}` : '—'}</div>
          </div>
          ${sav ? `<div class="plan-save">Você economiza <strong>$${sav}</strong></div>` : ''}
          <a class="plan-cta" href="${esc(f.link || '#')}" target="_blank" rel="noopener" data-firm="${esc(f.id)}">Ativar com cupom</a>
        </div>`;
      }).join('')
    : '<div style="color:var(--t3);text-align:center;padding:24px;">Preços disponíveis no checkout da firma.</div>';

  const perksHtml = Array.isArray(f.perks) && f.perks.length
    ? `<ul class="check-list">${f.perks.map(p => `<li>${esc(p)}</li>`).join('')}</ul>`
    : '';

  const proibidoHtml = Array.isArray(f.proibido) && f.proibido.length
    ? `<ul class="x-list">${f.proibido.map(p => `<li>${esc(p)}</li>`).join('')}</ul>`
    : '';

  const platformsHtml = Array.isArray(f.platforms) && f.platforms.length
    ? f.platforms.map(p => `<span class="plat-pill">${esc(p)}</span>`).join('')
    : '';

  // Trustpilot
  const tpScore = f.trustpilot_score || f.rating;
  const tpReviews = f.trustpilot_reviews || f.reviews;
  const stars = (s) => {
    const n = parseFloat(s) || 0;
    const full = Math.floor(n);
    const half = (n - full) >= 0.5;
    return '★'.repeat(full) + (half ? '½' : '') + '☆'.repeat(5 - full - (half ? 1 : 0));
  };

  // FAQ — todos os interpolados de DB passam por esc() pra evitar XSS via CMS field
  const eName = esc(f.name);
  const eCoupon = esc(f.coupon || '');
  const eShort = esc(short);
  const eDiscType = esc(f.discount_type || '');
  const eDrawdown = esc(f.drawdown || '—');
  const eDdPct = esc(f.dd_pct || '');
  const eTarget = esc(f.target || '—');
  const eSplit = esc(f.split || '—');
  const eMinDays = esc(f.min_days ? String(f.min_days) : 'alguns');
  const ePlatforms = Array.isArray(f.platforms) && f.platforms.length ? f.platforms.map(esc).join(', ') : '';
  const faqs = [
    {
      q: `Qual o cupom de desconto da ${f.name}?`,
      a: `${f.coupon ? `Use o cupom <strong>${eCoupon}</strong> no checkout da ${eName}` : `Cupons exclusivos disponíveis`} pra ${f.discount ? f.discount + '% de desconto' : 'desconto especial'}${f.discount_type ? ' (' + eDiscType + ')' : ''}.`
    },
    {
      q: `Quanto custa a conta mais barata na ${f.name}?`,
      a: `${minPrice ? `A conta mais barata começa em $${minPrice.toFixed(2)} com cupom Markets` : 'Diversos tamanhos de conta disponíveis'}${minOrig && minPrice && minOrig > minPrice ? ` (preço original $${minOrig.toFixed(2)} — você economiza $${(minOrig-minPrice).toFixed(2)})` : ''}.`
    },
    {
      q: `${short} permite news trading?`,
      a: `${f.news_trading ? `Sim, ${eName} <strong>permite</strong> operar durante notícias econômicas.` : `Não, ${eName} <strong>bloqueia</strong> trades durante janelas de notícias econômicas (5 min antes/depois geralmente).`}`
    },
    {
      q: `Tem Day-1 payout na ${short}?`,
      a: `${f.day1_payout ? `Sim, ${eName} libera saque desde o Day-1 (assim que você bater o profit target da fase paga).` : `Não, ${eName} exige período mínimo (${eMinDays} dias) antes do primeiro payout.`}`
    },
    {
      q: `Qual o drawdown e profit target da ${short}?`,
      a: `Drawdown: ${eDrawdown}${f.dd_pct ? ' (' + eDdPct + ')' : ''}. Profit Target: ${eTarget}. Profit Split: ${eSplit}.`
    },
    {
      q: `Quais plataformas a ${short} oferece?`,
      a: ePlatforms ? `Plataformas suportadas: ${ePlatforms}.` : `Plataformas listadas no checkout oficial da firma.`
    },
  ];

  // Schemas
  const productSchema = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: f.name,
    description: desc,
    brand: { '@type': 'Brand', name: f.name },
    image: f.icon_url ? imgUrl(f.icon_url) : undefined,
    offers: minPrice ? {
      '@type': 'Offer',
      priceCurrency: 'USD',
      price: minPrice.toFixed(2),
      url: `https://www.marketscoupons.com/${f.id}`,
      availability: 'https://schema.org/InStock',
    } : undefined,
    aggregateRating: tpScore ? {
      '@type': 'AggregateRating',
      ratingValue: tpScore,
      reviewCount: tpReviews || 1,
    } : undefined,
  };
  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map(q => ({ '@type': 'Question', name: q.q, acceptedAnswer: { '@type': 'Answer', text: q.a.replace(/<[^>]+>/g, '') } })),
  };
  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Início', item: 'https://www.marketscoupons.com/' },
      { '@type': 'ListItem', position: 2, name: 'Prop Firms', item: 'https://www.marketscoupons.com/firms' },
      { '@type': 'ListItem', position: 3, name: f.name, item: `https://www.marketscoupons.com/${f.id}` },
    ],
  };

  // Other firms grid (internal links)
  const othersHtml = others.map(o => `
    <a class="other-card" href="/${o.id}" style="--c:${o.color || '#F0B429'}">
      ${o.icon_url ? `<img src="${esc(o.icon_url)}" alt="${esc(o.name)}" loading="lazy">` : ''}
      <div class="other-name">${esc(o.short_name || o.name)}</div>
      ${o.discount ? `<div class="other-disc">${o.discount}% OFF</div>` : ''}
    </a>`).join('');

  // Compare links network
  const compareLinks = others.slice(0, 5).map(o => {
    const lhs = (o.sort_order ?? 99) < (f.sort_order ?? 99) ? o.id : f.id;
    const rhs = (o.sort_order ?? 99) < (f.sort_order ?? 99) ? f.id : o.id;
    return `<a class="cmp-link" href="/${lhs}-vs-${rhs}">${esc(short)} <span style="opacity:.5">vs</span> ${esc(o.short_name || o.name.split(' ')[0])}</a>`;
  }).join('');

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<meta name="robots" content="index,follow,max-image-preview:large">
<link rel="canonical" href="https://www.marketscoupons.com/${f.id}">
<link rel="alternate" hreflang="pt-BR" href="https://www.marketscoupons.com/${f.id}">
<link rel="alternate" hreflang="x-default" href="https://www.marketscoupons.com/${f.id}">
<meta property="og:type" content="product">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:url" content="https://www.marketscoupons.com/${f.id}">
<meta property="og:locale" content="pt_BR">
${f.icon_url ? `<meta property="og:image" content="${esc(imgUrl(f.icon_url))}">` : ''}
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" type="image/svg+xml" href="/img/favicon.svg">
<link rel="icon" type="image/png" href="/img/favicon.png">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
<script type="application/ld+json">${safeJson(productSchema)}</script>
<script type="application/ld+json">${safeJson(faqSchema)}</script>
<script type="application/ld+json">${safeJson(breadcrumbSchema)}</script>
<style>
*{box-sizing:border-box;margin:0;padding:0}
:root{
  --bg:#07090D;--sur:#0B0F16;--card:#10151F;--card2:#141B27;
  --b1:#1C2535;--b2:#263145;
  --gold:#F0B429;--green:#10B981;--red:#EF4444;
  --t1:#EDF2F7;--t2:#B8C5D6;--t3:#8A98AE;
  --c:${f.color || '#F0B429'};
}
@keyframes shimmer{0%{background-position:0% 50%}50%{background-position:100% 50%}100%{background-position:0% 50%}}
@keyframes fadeUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
@keyframes pulse{0%,100%{transform:scale(1)}50%{transform:scale(1.04)}}
html,body{background:var(--bg);color:var(--t1);font-family:Inter,system-ui,sans-serif;line-height:1.55;min-height:100vh}
body{padding-bottom:60px}
a{color:inherit}
img{max-width:100%;display:block}

.fp-nav{padding:18px 24px;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid var(--b1);background:rgba(8,12,18,.85);backdrop-filter:blur(8px);position:sticky;top:0;z-index:50}
.fp-nav-logo{font-size:18px;font-weight:800;color:var(--t1);text-decoration:none;letter-spacing:-0.01em}
.fp-nav-logo span{color:#ff8c00}
.fp-nav-back{font-size:13px;color:var(--t3);text-decoration:none;display:inline-flex;align-items:center;gap:6px}
.fp-nav-back:hover{color:var(--gold)}

.fp-wrap{max-width:1100px;margin:0 auto;padding:0 20px}

/* HERO branded */
.fp-hero{position:relative;padding:64px 0 48px;overflow:hidden;animation:fadeUp .5s ease}
.fp-hero-bg{position:absolute;inset:0;background-image:${f.bg_image ? `url('${esc(f.bg_image)}')` : 'none'};background-size:cover;background-position:center;opacity:.18;mix-blend-mode:luminosity;pointer-events:none}
.fp-hero-bg::after{content:'';position:absolute;inset:0;background:linear-gradient(180deg,transparent 0%,var(--bg) 90%)}
.fp-hero > *{position:relative;z-index:1}
.fp-hero-grid{display:grid;grid-template-columns:auto 1fr;gap:32px;align-items:center}
@media(max-width:760px){.fp-hero-grid{grid-template-columns:1fr;text-align:center}}
.fp-hero-logo{width:120px;height:120px;border-radius:24px;background:#0a0d14;padding:14px;border:1px solid color-mix(in srgb,var(--c) 30%,transparent);box-shadow:0 12px 32px color-mix(in srgb,var(--c) 22%,transparent)}
@media(max-width:760px){.fp-hero-logo{margin:0 auto}}
.fp-hero-eyebrow{font-size:11px;text-transform:uppercase;letter-spacing:2px;color:var(--c);font-weight:700;margin-bottom:10px}
.fp-h1{font-size:clamp(32px,6vw,52px);font-weight:900;letter-spacing:-0.025em;line-height:1.05;margin-bottom:14px}
.fp-h1 .accent{background:linear-gradient(135deg,var(--c),color-mix(in srgb,var(--c) 60%,#fff));-webkit-background-clip:text;background-clip:text;color:transparent}
.fp-hero-pills{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:18px}
@media(max-width:760px){.fp-hero-pills{justify-content:center}}
.fp-hero-pill{font-size:11px;font-weight:700;padding:5px 12px;border-radius:99px;background:color-mix(in srgb,var(--c) 14%,transparent);color:var(--c);border:1px solid color-mix(in srgb,var(--c) 30%,transparent);text-transform:uppercase;letter-spacing:.6px}
.fp-hero-desc{font-size:15px;color:var(--t2);max-width:640px;line-height:1.65}
@media(max-width:760px){.fp-hero-desc{margin:0 auto}}

/* Coupon highlight */
.coupon-highlight{margin:32px 0 16px;background:linear-gradient(135deg,color-mix(in srgb,var(--c) 18%,var(--card)) 0%,var(--card) 100%);border:2px dashed color-mix(in srgb,var(--c) 50%,transparent);border-radius:18px;padding:28px 24px;display:grid;grid-template-columns:1fr auto;gap:24px;align-items:center;animation:fadeUp .6s ease}
@media(max-width:760px){.coupon-highlight{grid-template-columns:1fr;text-align:center}}
.ch-disc{font-size:54px;font-weight:900;line-height:1;background:linear-gradient(135deg,var(--c),color-mix(in srgb,var(--c) 70%,#fff));-webkit-background-clip:text;background-clip:text;color:transparent;margin-bottom:6px;letter-spacing:-0.03em}
.ch-disc-lbl{font-size:11px;text-transform:uppercase;letter-spacing:1.6px;color:var(--t3);font-weight:700}
.ch-code-box{background:#0a0d14;border:1px solid color-mix(in srgb,var(--c) 30%,var(--b1));border-radius:14px;padding:18px 22px;text-align:center;min-width:240px}
.ch-code-lbl{font-size:10px;text-transform:uppercase;letter-spacing:2px;color:var(--t3);font-weight:700;margin-bottom:6px}
.ch-code{font-family:'JetBrains Mono',Consolas,monospace;font-size:24px;font-weight:800;color:var(--c);letter-spacing:2px;margin-bottom:12px}
.ch-cta{display:block;padding:13px 20px;border-radius:11px;background:linear-gradient(90deg,#c8941a,var(--gold),#f5d060,var(--gold),#c8941a);background-size:200% 100%;animation:shimmer 3s ease infinite;color:#0d141c;font-weight:800;font-size:14px;text-decoration:none;letter-spacing:.2px;box-shadow:0 8px 22px rgba(240,180,41,.22);transition:transform .15s}
.ch-cta:hover{transform:translateY(-2px)}

/* Sec heads */
.fp-sec{margin:56px 0 22px;text-align:center}
.fp-sec-eyebrow{font-size:11px;text-transform:uppercase;letter-spacing:2.5px;color:var(--gold);font-weight:700;margin-bottom:10px}
.fp-sec-h2{font-size:clamp(22px,3.5vw,30px);font-weight:800;letter-spacing:-0.015em}
.fp-sec-sub{color:var(--t3);font-size:13px;margin-top:6px}

/* Trustpilot row */
.tp-row{display:flex;align-items:center;gap:16px;padding:16px 22px;background:var(--card2);border:1px solid var(--b1);border-radius:14px;margin:24px 0;justify-content:center;flex-wrap:wrap}
.tp-stars{font-size:22px;color:#00b67a;letter-spacing:1.5px}
.tp-score{font-size:28px;font-weight:800;color:var(--t1)}
.tp-meta{font-size:12px;color:var(--t3)}

/* Plans grid */
.plans{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:14px}
.plan{background:var(--card);border:1px solid var(--b1);border-radius:14px;padding:22px 18px;text-align:center;transition:transform .2s,border-color .2s;position:relative}
.plan:hover{transform:translateY(-4px);border-color:color-mix(in srgb,var(--c) 40%,var(--b1))}
.plan-size{font-size:14px;font-weight:800;color:var(--t1);letter-spacing:.4px;margin-bottom:8px}
.plan-pct{position:absolute;top:-10px;right:14px;background:var(--c);color:#0d141c;font-size:10px;font-weight:800;padding:4px 10px;border-radius:99px;letter-spacing:.6px;text-transform:uppercase}
.plan-prices{margin:14px 0 8px}
.plan-orig{font-size:13px;color:var(--t3);text-decoration:line-through;margin-bottom:2px}
.plan-final{font-size:26px;font-weight:900;color:var(--c);letter-spacing:-0.02em}
.plan-save{font-size:11px;color:var(--green);margin-bottom:14px}
.plan-cta{display:block;padding:11px 14px;border-radius:9px;background:color-mix(in srgb,var(--c) 14%,transparent);border:1px solid color-mix(in srgb,var(--c) 36%,transparent);color:var(--c);font-weight:700;font-size:12px;text-decoration:none;letter-spacing:.3px;transition:all .2s}
.plan-cta:hover{background:var(--c);color:#0d141c}

/* Stats grid (4x3) */
.stats{display:grid;grid-template-columns:repeat(4,1fr);gap:10px}
@media(max-width:760px){.stats{grid-template-columns:repeat(2,1fr)}}
.stat{background:var(--card);border:1px solid var(--b1);border-radius:11px;padding:14px 12px;text-align:center;min-height:88px;display:flex;flex-direction:column;justify-content:center}
.stat-lbl{font-size:9px;text-transform:uppercase;letter-spacing:1.4px;color:var(--t3);font-weight:700;margin-bottom:6px}
.stat-val{font-size:14px;font-weight:700;color:var(--t1);line-height:1.25}
.stat-hint{font-size:10px;color:var(--t3);margin-top:4px}
.stat.win .stat-val{color:var(--green)}

/* Perks / Proibido */
.duo{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-top:16px}
@media(max-width:760px){.duo{grid-template-columns:1fr}}
.duo-card{background:var(--card);border:1px solid var(--b1);border-radius:14px;padding:22px 22px;position:relative;overflow:hidden}
.duo-card.perks{border-color:color-mix(in srgb,var(--green) 22%,var(--b1))}
.duo-card.proibido{border-color:color-mix(in srgb,var(--red) 22%,var(--b1))}
.duo-card::before{content:'';position:absolute;top:0;left:0;right:0;height:3px}
.duo-card.perks::before{background:linear-gradient(90deg,transparent,var(--green),transparent)}
.duo-card.proibido::before{background:linear-gradient(90deg,transparent,var(--red),transparent)}
.duo-h{font-size:14px;font-weight:800;color:var(--t1);margin-bottom:12px;display:flex;align-items:center;gap:8px}
.duo-card.perks .duo-h::before{content:'✓';color:var(--green);font-size:18px;font-weight:900}
.duo-card.proibido .duo-h::before{content:'✗';color:var(--red);font-size:18px;font-weight:900}
.check-list,.x-list{list-style:none;padding:0}
.check-list li,.x-list li{padding:7px 0;color:var(--t2);font-size:13px;display:flex;gap:10px;align-items:flex-start}
.check-list li::before{content:'✓';color:var(--green);font-weight:800;flex-shrink:0;margin-top:1px}
.x-list li::before{content:'✗';color:var(--red);font-weight:800;flex-shrink:0;margin-top:1px}

/* Platforms */
.plats-row{display:flex;flex-wrap:wrap;gap:8px;justify-content:center;margin-top:16px}
.plat-pill{font-size:12px;font-weight:600;padding:6px 14px;border-radius:99px;background:var(--card2);color:var(--t2);border:1px solid var(--b1)}

/* FAQ */
.faqs{display:flex;flex-direction:column;gap:10px;margin-top:24px}
.faq{background:var(--card);border:1px solid var(--b1);border-radius:12px;padding:18px 20px}
.faq-q{font-size:14px;font-weight:700;color:var(--t1);margin-bottom:8px}
.faq-q::before{content:'?';display:inline-block;width:20px;height:20px;background:var(--gold);color:#0d141c;border-radius:50%;text-align:center;font-size:12px;line-height:20px;margin-right:8px;font-weight:900}
.faq-a{font-size:13px;color:var(--t2);line-height:1.65}
.faq-a strong{color:var(--c)}

/* Other firms */
.others{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:12px;margin-top:24px}
.other-card{background:var(--card);border:1px solid var(--b1);border-radius:12px;padding:18px 14px;text-align:center;text-decoration:none;color:inherit;transition:transform .2s,border-color .2s}
.other-card:hover{transform:translateY(-3px);border-color:color-mix(in srgb,var(--c) 40%,var(--b1))}
.other-card img{width:48px;height:48px;border-radius:10px;margin:0 auto 10px;background:#0a0d14;padding:6px}
.other-name{font-size:13px;font-weight:700;color:var(--t1);margin-bottom:4px}
.other-disc{font-size:11px;color:var(--c);font-weight:700}

/* Compare links */
.cmp-links{display:flex;flex-wrap:wrap;gap:10px;justify-content:center;margin-top:16px}
.cmp-link{font-size:13px;color:var(--t2);background:var(--card2);border:1px solid var(--b1);border-radius:99px;padding:8px 16px;text-decoration:none;transition:all .2s}
.cmp-link:hover{color:var(--gold);border-color:color-mix(in srgb,var(--gold) 40%,var(--b1))}

/* Bottom CTA */
.bottom-cta{margin-top:48px;background:linear-gradient(135deg,color-mix(in srgb,var(--c) 14%,var(--card)),var(--card));border:1px solid color-mix(in srgb,var(--c) 30%,transparent);border-radius:18px;padding:36px 28px;text-align:center}
.bottom-cta h3{font-size:24px;font-weight:800;margin-bottom:10px;letter-spacing:-0.01em}
.bottom-cta p{font-size:14px;color:var(--t3);margin-bottom:22px;max-width:520px;margin-left:auto;margin-right:auto}
.bottom-cta .ch-cta{display:inline-block}

/* Footer */
.fp-foot{margin-top:48px;padding:28px 0;border-top:1px solid var(--b1);text-align:center;font-size:12px;color:var(--t3)}
.fp-foot a{color:var(--gold);text-decoration:none}
</style>
</head>
<body>
<nav class="fp-nav">
  <a class="fp-nav-logo" href="/">Markets <span>Coupons</span></a>
  <a class="fp-nav-back" href="/">← Voltar</a>
</nav>

<div class="fp-wrap">

  <header class="fp-hero">
    <div class="fp-hero-bg"></div>
    <div class="fp-hero-grid">
      ${f.icon_url ? `<img class="fp-hero-logo" src="${esc(f.icon_url)}" alt="${esc(f.name)} logo" width="120" height="120">` : ''}
      <div>
        <div class="fp-hero-eyebrow">${esc(f.type || 'Prop Firm')}${f.discount ? ` · ${f.discount}% OFF` : ''}</div>
        <h1 class="fp-h1">${esc(f.name)} <span class="accent">${f.discount ? f.discount + '% OFF' : 'Cupom Exclusivo'}</span></h1>
        <div class="fp-hero-pills">
          ${Array.isArray(f.tags) ? f.tags.slice(0,4).map(t => `<span class="fp-hero-pill">${esc(t)}</span>`).join('') : ''}
        </div>
        <p class="fp-hero-desc">${esc(f.description || `${f.name} é uma das prop firms mais reconhecidas do mercado. Compre sua avaliação com cupom Markets e economize${f.discount ? ' até ' + f.discount + '%' : ''}.`)}</p>
      </div>
    </div>
  </header>

  ${f.coupon ? `
  <section class="coupon-highlight">
    <div>
      <div class="ch-disc">${f.discount ? f.discount + '%' : 'OFF'}</div>
      <div class="ch-disc-lbl">${esc(f.discount_type || 'desconto exclusivo')}${minPrice ? ' · a partir de $' + minPrice.toFixed(2) : ''}</div>
    </div>
    <div class="ch-code-box">
      <div class="ch-code-lbl">Cupom oficial</div>
      <div class="ch-code">${esc(f.coupon)}</div>
      <a class="ch-cta" href="${esc(f.link || '#')}" target="_blank" rel="noopener">Ativar agora →</a>
    </div>
  </section>
  ` : ''}

  ${tpScore ? `
  <div class="tp-row">
    <span class="tp-stars">${stars(tpScore)}</span>
    <span class="tp-score">${tpScore}</span>
    <span class="tp-meta">${tpReviews ? tpReviews.toLocaleString('pt-BR') + ' avaliações Trustpilot' : 'Trustpilot'}</span>
  </div>` : ''}

  <section class="fp-sec">
    <div class="fp-sec-eyebrow">Planos com cupom</div>
    <h2 class="fp-sec-h2">Escolha o tamanho da conta</h2>
    <p class="fp-sec-sub">Preços já com cupom <strong style="color:var(--c)">${esc(f.coupon || 'aplicado')}</strong> · Atualizados ${new Date().toLocaleDateString('pt-BR',{month:'long',year:'numeric'})}</p>
  </section>
  <div class="plans">${plansHtml}</div>

  <section class="fp-sec">
    <div class="fp-sec-eyebrow">Regras da firma</div>
    <h2 class="fp-sec-h2">Tudo que você precisa saber</h2>
  </section>
  <div class="stats">
    ${stats.map(s => `
      <div class="stat ${s.win ? 'win' : ''}">
        <div class="stat-lbl">${esc(s.lbl)}</div>
        <div class="stat-val">${esc(s.val)}</div>
        ${s.hint ? `<div class="stat-hint">${esc(s.hint)}</div>` : ''}
      </div>
    `).join('')}
  </div>
  ${platformsHtml ? `<div class="plats-row">${platformsHtml}</div>` : ''}

  ${(perksHtml || proibidoHtml) ? `
  <section class="fp-sec">
    <div class="fp-sec-eyebrow">Vantagens & Restrições</div>
    <h2 class="fp-sec-h2">O que pode e o que não pode</h2>
  </section>
  <div class="duo">
    ${perksHtml ? `<div class="duo-card perks"><div class="duo-h">Permitido</div>${perksHtml}</div>` : ''}
    ${proibidoHtml ? `<div class="duo-card proibido"><div class="duo-h">Proibido</div>${proibidoHtml}</div>` : ''}
  </div>` : ''}

  <section class="fp-sec">
    <div class="fp-sec-eyebrow">FAQ</div>
    <h2 class="fp-sec-h2">Perguntas frequentes</h2>
  </section>
  <div class="faqs">
    ${faqs.map(q => `
      <div class="faq">
        <div class="faq-q">${esc(q.q)}</div>
        <div class="faq-a">${q.a}</div>
      </div>
    `).join('')}
  </div>

  ${compareLinks ? `
  <section class="fp-sec">
    <div class="fp-sec-eyebrow">Comparar</div>
    <h2 class="fp-sec-h2">${esc(short)} vs outras prop firms</h2>
  </section>
  <div class="cmp-links">${compareLinks}</div>` : ''}

  ${othersHtml ? `
  <section class="fp-sec">
    <div class="fp-sec-eyebrow">Outras firmas</div>
    <h2 class="fp-sec-h2">Conhece todas as opções</h2>
  </section>
  <div class="others">${othersHtml}</div>` : ''}

  <div class="bottom-cta">
    <h3>Pronto pra começar com ${esc(short)}?</h3>
    <p>${f.coupon ? `Use o cupom <strong style="color:var(--c)">${esc(f.coupon)}</strong> no checkout pra garantir ${f.discount ? f.discount + '% de desconto' : 'preço promocional'}.` : 'Compare planos e ative com cupom exclusivo Markets Coupons.'}</p>
    <a class="ch-cta" href="${esc(f.link || '#')}" target="_blank" rel="noopener">Comprar avaliação ${esc(short)} →</a>
  </div>

  <footer class="fp-foot">
    Página gerada em ${new Date().toLocaleString('pt-BR')} · <a href="/">Markets Coupons</a>
  </footer>

</div>

</body>
</html>`;
}

// ── Main ──
async function main() {
  const firms = await loadFirms();
  if (!firms.length) { console.error('No firms loaded'); process.exit(1); }
  console.log(`Loaded ${firms.length} firms.`);

  fs.mkdirSync(OUT_DIR, { recursive: true });

  let written = 0;
  for (const f of firms) {
    const html = genPage(f, firms);
    const outPath = path.join(OUT_DIR, `${f.id}.html`);
    fs.writeFileSync(outPath, html, 'utf8');
    console.log(`  ✓ firms/${f.id}.html (${(html.length/1024).toFixed(1)}kb)`);
    written++;
  }

  console.log(`\nDone — ${written} firm landing pages written to ${OUT_DIR}/`);
  console.log(`\nNEXT: update vercel.json rewrite /{firmId} → /firms/{firmId}.html`);
}

main().catch(e => { console.error(e); process.exit(1); });
