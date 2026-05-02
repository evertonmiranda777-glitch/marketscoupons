#!/usr/bin/env node
/**
 * build-compare-pages.mjs — Gera páginas /{firmA}-vs-{firmB} a partir de cms_firms.
 *
 * PADRÃO PREMIUM (per memory feedback_padrao_premium_default.md):
 * - Hero 2-col com bg image branded por firma + logo grande + accent color
 * - Preço cards grandes (não tabela)
 * - Stats grid com vencedor por categoria badge
 * - Trustpilot widget (estrelas + score em destaque)
 * - CTAs gradient gold com shimmer
 * - Recomendação 3 personas
 * - FAQ visível + schema
 * - Internal links network
 * - Mobile-first
 *
 * Output: 66 canonical + 66 reverse-redirect em /compare/
 * Usage: node scripts/build-compare-pages.mjs
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const SR = process.env.SUPABASE_SERVICE_ROLE;
const SB_URL = 'https://qfwhduvutfumsaxnuofa.supabase.co';
if (!SR) { console.error('SUPABASE_SERVICE_ROLE missing in env'); process.exit(1); }

const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');

async function loadFirms() {
  const r = await fetch(`${SB_URL}/rest/v1/cms_firms?active=eq.true&select=*&order=sort_order`, {
    headers: { apikey: SR, Authorization: `Bearer ${SR}` },
  });
  return r.json();
}

function priceMin(prices) {
  if (!prices?.length) return null;
  const nums = prices.map(p => parseFloat(String(p.n || '').replace(/[^0-9.]/g, ''))).filter(Boolean);
  return nums.length ? Math.min(...nums) : null;
}

function priceMinOrig(prices) {
  if (!prices?.length) return null;
  const nums = prices.map(p => parseFloat(String(p.o || '').replace(/[^0-9.]/g, ''))).filter(n => n && !isNaN(n));
  return nums.length ? Math.min(...nums) : null;
}

// Compara duas métricas e retorna 'a', 'b' ou 'tie'
function winner(metric, a, b) {
  switch (metric) {
    case 'discount': return a > b ? 'a' : b > a ? 'b' : 'tie';
    case 'price_low':  return a && b ? (a < b ? 'a' : a > b ? 'b' : 'tie') : 'tie';
    case 'rating': return a > b ? 'a' : b > a ? 'b' : 'tie';
    case 'reviews': return a > b ? 'a' : b > a ? 'b' : 'tie';
    case 'bool': return a && !b ? 'a' : b && !a ? 'b' : 'tie';
    default: return 'tie';
  }
}

function genPage(a, b, allFirms) {
  const minA = priceMin(a.prices);
  const minB = priceMin(b.prices);
  const minOrigA = priceMinOrig(a.prices);
  const minOrigB = priceMinOrig(b.prices);
  const savingsA = minOrigA && minA ? (minOrigA - minA).toFixed(2) : null;
  const savingsB = minOrigB && minB ? (minOrigB - minB).toFixed(2) : null;

  const shortA = a.short_name || a.name.split(' ')[0];
  const shortB = b.short_name || b.name.split(' ')[0];
  const title = `${shortA} vs ${shortB} 2026: Comparativo | Markets Coupons`;
  const desc = `Compare ${a.name} e ${b.name}: preços, drawdown, profit split, payout. Cupom exclusivo${a.coupon ? ' ' + a.coupon : ''}${b.coupon ? ' e ' + b.coupon : ''}.`.slice(0, 160);
  const slugPair = `${a.id}-vs-${b.id}`;

  // Stats com vencedor
  const wDisc = winner('discount', a.discount || 0, b.discount || 0);
  const wPrice = winner('price_low', minA, minB);
  const wRating = winner('rating', a.trustpilot_score || a.rating || 0, b.trustpilot_score || b.rating || 0);
  const wReviews = winner('reviews', a.trustpilot_reviews || a.reviews || 0, b.trustpilot_reviews || b.reviews || 0);
  const wNews = winner('bool', a.news_trading, b.news_trading);
  const wPayout = winner('bool', a.day1_payout, b.day1_payout);

  // Stars helper
  const stars = (score) => {
    const s = parseFloat(score) || 0;
    const full = Math.floor(s);
    const half = (s - full) >= 0.5;
    return '★'.repeat(full) + (half ? '½' : '') + '☆'.repeat(5 - full - (half ? 1 : 0));
  };

  // Comparison categories — pares de stats com winner badge
  const categories = [
    { key: 'discount', label: 'Desconto', valA: `${a.discount}% ${a.discount_type || ''}`.trim(), valB: `${b.discount}% ${b.discount_type || ''}`.trim(), winner: wDisc, hint: 'Quanto OFF do preço original' },
    { key: 'price', label: 'Conta menor', valA: minA ? `$${minA.toFixed(2)}` : '—', valB: minB ? `$${minB.toFixed(2)}` : '—', winner: wPrice, hint: 'Preço final c/ cupom (entrada mais barata)' },
    { key: 'split', label: 'Profit Split', valA: a.split || '—', valB: b.split || '—', winner: 'tie', hint: 'Quanto do lucro fica com o trader' },
    { key: 'drawdown', label: 'Drawdown', valA: a.drawdown || '—', valB: b.drawdown || '—', winner: 'tie', hint: 'Tipo de limite de perda' },
    { key: 'dd_pct', label: 'DD Limit', valA: a.dd_pct || '—', valB: b.dd_pct || '—', winner: 'tie' },
    { key: 'target', label: 'Profit Target', valA: a.target || '—', valB: b.target || '—', winner: 'tie' },
    { key: 'min_days', label: 'Min. Days', valA: a.min_days || '—', valB: b.min_days || '—', winner: 'tie' },
    { key: 'news', label: 'News Trading', valA: a.news_trading ? '✓ Permitido' : '✗ Bloqueado', valB: b.news_trading ? '✓ Permitido' : '✗ Bloqueado', winner: wNews },
    { key: 'day1', label: 'Day-1 Payout', valA: a.day1_payout ? '✓ Sim' : '✗ Não', valB: b.day1_payout ? '✓ Sim' : '✗ Não', winner: wPayout },
    { key: 'scaling', label: 'Scaling', valA: a.scaling || '—', valB: b.scaling || '—', winner: 'tie' },
    { key: 'plat', label: 'Plataformas', valA: (a.platforms || []).slice(0, 3).join(', ') + ((a.platforms || []).length > 3 ? '...' : ''), valB: (b.platforms || []).slice(0, 3).join(', ') + ((b.platforms || []).length > 3 ? '...' : ''), winner: 'tie' },
    { key: 'rating', label: 'Trustpilot', valA: `${a.trustpilot_score || a.rating || '—'} (${(a.trustpilot_reviews || a.reviews || 0).toLocaleString('pt-BR')})`, valB: `${b.trustpilot_score || b.rating || '—'} (${(b.trustpilot_reviews || b.reviews || 0).toLocaleString('pt-BR')})`, winner: wRating, hint: 'Reputação real' },
  ];

  // Personas — copy persuasivo per perfil
  const buildPersonas = () => {
    const lines = [];
    // Persona 1: Quem deve A
    const reasonsA = [];
    if (a.day1_payout && !b.day1_payout) reasonsA.push('precisa de payout no Day-1');
    if (a.news_trading && !b.news_trading) reasonsA.push('opera durante notícias');
    if (minA && minB && minA < minB) reasonsA.push(`quer entrar com pouco capital (a partir de $${minA.toFixed(2)})`);
    if ((a.discount || 0) > (b.discount || 0)) reasonsA.push(`prioriza maior desconto (${a.discount}% OFF)`);
    if ((a.trustpilot_score || 0) > (b.trustpilot_score || 0)) reasonsA.push(`valoriza reputação Trustpilot (${a.trustpilot_score} ★)`);
    if (!reasonsA.length) reasonsA.push(`prefere ${a.type?.toLowerCase() || 'esse modelo'} e plataformas como ${(a.platforms || []).slice(0, 2).join(', ')}`);

    const reasonsB = [];
    if (b.day1_payout && !a.day1_payout) reasonsB.push('precisa de payout no Day-1');
    if (b.news_trading && !a.news_trading) reasonsB.push('opera durante notícias');
    if (minA && minB && minB < minA) reasonsB.push(`quer entrar com pouco capital (a partir de $${minB.toFixed(2)})`);
    if ((b.discount || 0) > (a.discount || 0)) reasonsB.push(`prioriza maior desconto (${b.discount}% OFF)`);
    if ((b.trustpilot_score || 0) > (a.trustpilot_score || 0)) reasonsB.push(`valoriza reputação Trustpilot (${b.trustpilot_score} ★)`);
    if (!reasonsB.length) reasonsB.push(`prefere ${b.type?.toLowerCase() || 'esse modelo'} e plataformas como ${(b.platforms || []).slice(0, 2).join(', ')}`);

    return { reasonsA, reasonsB };
  };
  const { reasonsA, reasonsB } = buildPersonas();

  // FAQ visível + schema
  const faqs = [
    {
      q: `Qual é melhor: ${a.name} ou ${b.name}?`,
      a: `Depende do perfil. ${a.name} tem ${a.discount}% off${a.discount_type ? ' ' + a.discount_type : ''} e drawdown ${a.drawdown}. ${b.name} tem ${b.discount}% off${b.discount_type ? ' ' + b.discount_type : ''} e drawdown ${b.drawdown}. ${minA && minB ? `Conta mais barata: ${minA < minB ? a.name : b.name} (a partir de $${(Math.min(minA, minB)).toFixed(2)}).` : ''}`
    },
    {
      q: `Quanto custa a conta de ${shortA} vs ${shortB}?`,
      a: `${a.name} começa em ${minA ? '$' + minA.toFixed(2) : '—'}${a.coupon ? ` com cupom ${a.coupon}` : ''}. ${b.name} começa em ${minB ? '$' + minB.toFixed(2) : '—'}${b.coupon ? ` com cupom ${b.coupon}` : ''}.`
    },
    {
      q: `${shortA} ou ${shortB} permite news trading?`,
      a: `${a.name} ${a.news_trading ? 'PERMITE' : 'NÃO permite'} operar durante notícias econômicas. ${b.name} ${b.news_trading ? 'PERMITE' : 'NÃO permite'}. ${a.news_trading !== b.news_trading ? `Se você precisa operar news, escolha ${a.news_trading ? a.name : b.name}.` : ''}`
    },
    {
      q: `Quanto tempo pra fazer payout em ${shortA} e ${shortB}?`,
      a: `${a.name} ${a.day1_payout ? 'libera payout desde o Day-1' : 'não tem Day-1 payout'}. ${b.name} ${b.day1_payout ? 'libera payout desde o Day-1' : 'não tem Day-1 payout'}.`
    },
    {
      q: `Posso ter conta nas duas firmas ao mesmo tempo?`,
      a: `Sim, é permitido ter conta em prop firms diferentes ao mesmo tempo (multi-prop). Algumas firmas restringem múltiplas contas DENTRO da mesma firma — confirme as regras de cada uma antes de comprar.`
    },
  ];

  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map(f => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } }))
  };
  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Início', item: 'https://www.marketscoupons.com/' },
      { '@type': 'ListItem', position: 2, name: 'Comparativos', item: 'https://www.marketscoupons.com/' },
      { '@type': 'ListItem', position: 3, name: `${shortA} vs ${shortB}`, item: `https://www.marketscoupons.com/${slugPair}` }
    ]
  };

  // Internal links — outras combos com firma A e firma B
  const otherCombos = allFirms
    .filter(f => f.id !== a.id && f.id !== b.id)
    .slice(0, 8)
    .map(f => {
      // Slug ordering by sort_order — use whichever comes first
      const lhs = f.sort_order < a.sort_order ? f.id : a.id;
      const rhs = f.sort_order < a.sort_order ? a.id : f.id;
      return `<a class="cmp-link" href="/${lhs}-vs-${rhs}">${esc(shortA)} <span style="opacity:.6">vs</span> ${esc(f.short_name || f.name.split(' ')[0])}</a>`;
    }).join('');

  // Render category cards (mini-UIs com winner badge)
  const renderCategories = categories.map(c => {
    const aWin = c.winner === 'a';
    const bWin = c.winner === 'b';
    return `<div class="cat">
      <div class="cat-lbl">${esc(c.label)}${c.hint ? `<span class="cat-hint">${esc(c.hint)}</span>` : ''}</div>
      <div class="cat-row">
        <div class="cat-side ${aWin ? 'win' : ''}" style="--c:${a.color}">
          <div class="cat-val">${esc(c.valA)}</div>
          ${aWin ? '<div class="cat-badge">✓ Vence</div>' : ''}
        </div>
        <div class="cat-vs">vs</div>
        <div class="cat-side ${bWin ? 'win' : ''}" style="--c:${b.color}">
          <div class="cat-val">${esc(c.valB)}</div>
          ${bWin ? '<div class="cat-badge">✓ Vence</div>' : ''}
        </div>
      </div>
    </div>`;
  }).join('');

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<meta name="robots" content="index,follow,max-image-preview:large">
<link rel="canonical" href="https://www.marketscoupons.com/${slugPair}">
<link rel="alternate" hreflang="pt-BR" href="https://www.marketscoupons.com/${slugPair}">
<link rel="alternate" hreflang="x-default" href="https://www.marketscoupons.com/${slugPair}">
<meta property="og:type" content="article">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:url" content="https://www.marketscoupons.com/${slugPair}">
<meta property="og:locale" content="pt_BR">
<meta property="og:image" content="https://www.marketscoupons.com/og-image.png">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" href="/favicon.png">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
<script type="application/ld+json">${JSON.stringify(breadcrumbSchema)}</script>
<script type="application/ld+json">${JSON.stringify(faqSchema)}</script>
<style>
*{box-sizing:border-box;margin:0;padding:0}
:root{
  --bg:#07090D;--sur:#0B0F16;--card:#10151F;--card2:#141B27;
  --b1:#1C2535;--b2:#263145;
  --gold:#F0B429;--green:#10B981;--red:#EF4444;
  --t1:#EDF2F7;--t2:#B8C5D6;--t3:#8A98AE;
  --colA:${a.color};--colB:${b.color};
}
@keyframes shimmer{0%{background-position:0% 50%}50%{background-position:100% 50%}100%{background-position:0% 50%}}
@keyframes fadeUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
html,body{background:var(--bg);color:var(--t1);font-family:Inter,system-ui,sans-serif;line-height:1.55;min-height:100vh}
body{padding-bottom:60px}
a{color:inherit}
img{max-width:100%;display:block}

/* Top nav */
.cmp-nav{padding:18px 24px;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid var(--b1);background:rgba(8,12,18,.85);backdrop-filter:blur(8px);position:sticky;top:0;z-index:50}
.cmp-nav-logo{font-size:18px;font-weight:800;color:var(--t1);text-decoration:none;letter-spacing:-0.01em}
.cmp-nav-logo span{color:#ff8c00}
.cmp-nav-back{font-size:13px;color:var(--t3);text-decoration:none;display:inline-flex;align-items:center;gap:6px}
.cmp-nav-back:hover{color:var(--gold)}

.cmp-wrap{max-width:1100px;margin:0 auto;padding:0 20px}

/* HERO — 2 col side-by-side, bg branded */
.cmp-hero{padding:56px 0 28px;text-align:center;animation:fadeUp .5s ease}
.cmp-hero-eyebrow{font-size:11px;text-transform:uppercase;letter-spacing:2px;color:var(--gold);font-weight:700;margin-bottom:14px}
.cmp-h1{font-size:clamp(28px,5.5vw,48px);font-weight:900;letter-spacing:-0.025em;line-height:1.1;margin-bottom:10px}
.cmp-h1 .vs{display:inline-block;margin:0 12px;background:linear-gradient(90deg,var(--colA),var(--colB));-webkit-background-clip:text;background-clip:text;color:transparent;font-weight:900}
.cmp-sub{color:var(--t3);font-size:14px}

/* Firm cards (hero) */
.cmp-firms{display:grid;grid-template-columns:1fr auto 1fr;gap:16px;align-items:stretch;margin:36px 0 12px;animation:fadeUp .6s ease}
@media(max-width:760px){.cmp-firms{grid-template-columns:1fr;gap:12px}.cmp-firms .vs-circle{order:2;margin:6px auto}}
.cmp-firm{position:relative;border-radius:18px;padding:30px 24px 24px;text-align:center;overflow:hidden;background:var(--card);border:1px solid color-mix(in srgb,var(--c) 28%,var(--b1));box-shadow:0 8px 32px color-mix(in srgb,var(--c) 12%,transparent)}
.cmp-firm::before{content:'';position:absolute;inset:0;background:linear-gradient(135deg,color-mix(in srgb,var(--c) 14%,transparent) 0%,transparent 60%);pointer-events:none}
.cmp-firm.a{--c:var(--colA)}.cmp-firm.b{--c:var(--colB)}
.cmp-firm-bg{position:absolute;inset:0;background-size:cover;background-position:center;opacity:.18;mix-blend-mode:luminosity;pointer-events:none}
.cmp-firm > *{position:relative;z-index:1}
.cmp-firm-logo{width:64px;height:64px;border-radius:14px;margin:0 auto 14px;background:#0a0d14;padding:8px;border:1px solid color-mix(in srgb,var(--c) 22%,transparent)}
.cmp-firm-name{font-size:20px;font-weight:800;color:var(--t1);margin-bottom:4px;letter-spacing:-0.01em}
.cmp-firm-type{font-size:10px;text-transform:uppercase;letter-spacing:1.4px;color:var(--c);font-weight:700;margin-bottom:18px}
.cmp-firm-stat-row{display:flex;justify-content:center;gap:18px;margin-bottom:18px;font-size:11px;color:var(--t3)}
.cmp-firm-stat-row strong{color:var(--c);font-size:13px;font-weight:700}
.cmp-firm-disc{display:inline-block;font-size:32px;font-weight:900;line-height:1;margin-bottom:12px;background:linear-gradient(135deg,var(--c),color-mix(in srgb,var(--c) 60%,#fff));-webkit-background-clip:text;background-clip:text;color:transparent;letter-spacing:-0.02em}
.cmp-firm-disc-label{display:block;font-size:10px;color:var(--t3);text-transform:uppercase;letter-spacing:1.2px;font-weight:600;margin-top:-6px;margin-bottom:14px}
.cmp-firm-pills{display:flex;flex-wrap:wrap;gap:6px;justify-content:center;margin-bottom:18px;min-height:24px}
.cmp-firm-pill{font-size:10px;font-weight:700;padding:4px 9px;border-radius:99px;background:color-mix(in srgb,var(--c) 14%,transparent);color:var(--c);border:1px solid color-mix(in srgb,var(--c) 30%,transparent);text-transform:uppercase;letter-spacing:.6px}
.cmp-firm-cta{display:block;padding:13px 18px;border-radius:11px;background:linear-gradient(90deg,#c8941a,var(--gold),#f5d060,var(--gold),#c8941a);background-size:200% 100%;animation:shimmer 3s ease infinite;color:#0d141c;font-weight:800;font-size:14px;text-decoration:none;text-align:center;letter-spacing:.2px;box-shadow:0 8px 22px rgba(240,180,41,.22);transition:transform .15s}
.cmp-firm-cta:hover{transform:translateY(-2px)}
.cmp-firm-coupon{font-size:11px;color:var(--t3);margin-top:10px;font-family:'JetBrains Mono',Consolas,monospace}
.cmp-firm-coupon strong{color:var(--c);letter-spacing:1.5px;font-weight:800}

/* VS circle */
.vs-circle{align-self:center;width:64px;height:64px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:18px;font-weight:900;color:#0d141c;background:linear-gradient(135deg,var(--colA),var(--colB));box-shadow:0 8px 24px rgba(240,180,41,.18)}

/* Trustpilot row */
.cmp-tp-row{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin:24px 0 0}
@media(max-width:760px){.cmp-tp-row{grid-template-columns:1fr}}
.cmp-tp{display:flex;align-items:center;gap:12px;padding:14px 18px;background:var(--card2);border:1px solid var(--b1);border-radius:12px}
.cmp-tp-stars{font-size:18px;color:#00b67a;letter-spacing:1px}
.cmp-tp-score{font-size:22px;font-weight:800;color:var(--t1)}
.cmp-tp-meta{font-size:11px;color:var(--t3)}

/* Section heading */
.cmp-sec{margin:60px 0 20px;text-align:center}
.cmp-sec-eyebrow{font-size:11px;text-transform:uppercase;letter-spacing:2.5px;color:var(--gold);font-weight:700;margin-bottom:10px}
.cmp-sec-h2{font-size:clamp(22px,3.5vw,30px);font-weight:800;letter-spacing:-0.015em}
.cmp-sec-sub{color:var(--t3);font-size:13px;margin-top:6px}

/* Categories (stat split) */
.cats{display:flex;flex-direction:column;gap:14px}
.cat{background:var(--card);border:1px solid var(--b1);border-radius:14px;padding:18px 20px}
.cat-lbl{font-size:11px;text-transform:uppercase;letter-spacing:1.6px;color:var(--t3);font-weight:700;margin-bottom:14px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px}
.cat-hint{font-size:10px;color:var(--t3);text-transform:none;letter-spacing:0;font-weight:400;opacity:.7}
.cat-row{display:grid;grid-template-columns:1fr auto 1fr;gap:14px;align-items:center}
.cat-side{position:relative;padding:14px 18px;border-radius:10px;background:color-mix(in srgb,var(--c) 6%,var(--card2));border:1px solid color-mix(in srgb,var(--c) 14%,var(--b1));text-align:center;transition:all .2s}
.cat-side.win{border-color:color-mix(in srgb,var(--c) 50%,transparent);box-shadow:0 4px 16px color-mix(in srgb,var(--c) 18%,transparent);background:color-mix(in srgb,var(--c) 12%,var(--card2))}
.cat-val{font-size:15px;font-weight:700;color:var(--t1)}
.cat-side.win .cat-val{color:var(--c)}
.cat-badge{position:absolute;top:-9px;right:8px;font-size:9px;font-weight:800;padding:3px 8px;border-radius:99px;background:var(--c);color:#0d141c;text-transform:uppercase;letter-spacing:.6px}
.cat-vs{color:var(--t3);font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1.4px}

/* Personas — quem deve escolher cada uma */
.personas{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-top:24px}
@media(max-width:760px){.personas{grid-template-columns:1fr}}
.persona{position:relative;background:var(--card);border:1px solid color-mix(in srgb,var(--c) 22%,var(--b1));border-radius:14px;padding:22px 20px;overflow:hidden}
.persona::before{content:'';position:absolute;top:0;left:0;right:0;height:3px;background:linear-gradient(90deg,transparent,var(--c),transparent)}
.persona.a{--c:var(--colA)}.persona.b{--c:var(--colB)}
.persona-h{font-size:15px;font-weight:800;color:var(--t1);margin-bottom:12px;display:flex;align-items:center;gap:10px}
.persona-h img{width:28px;height:28px;border-radius:7px;background:#0a0d14;padding:3px}
.persona-h span{color:var(--c)}
.persona ul{list-style:none;padding:0}
.persona li{padding:7px 0;color:var(--t2);font-size:13px;display:flex;gap:10px;align-items:flex-start}
.persona li::before{content:'✓';color:var(--c);font-weight:800;flex-shrink:0;margin-top:2px}

/* FAQ */
.faqs{display:flex;flex-direction:column;gap:10px;margin-top:24px}
.faq{background:var(--card);border:1px solid var(--b1);border-radius:12px;padding:18px 20px}
.faq-q{font-size:14px;font-weight:700;color:var(--t1);margin-bottom:8px}
.faq-q::before{content:'?';display:inline-block;width:20px;height:20px;background:var(--gold);color:#0d141c;border-radius:50%;text-align:center;font-size:12px;line-height:20px;margin-right:8px;font-weight:900}
.faq-a{font-size:13px;color:var(--t2);line-height:1.6}

/* Internal links */
.cmp-others{display:flex;flex-wrap:wrap;gap:8px;justify-content:center;margin-top:18px}
.cmp-link{padding:8px 14px;background:var(--card2);border:1px solid var(--b1);border-radius:99px;font-size:12px;color:var(--t2);text-decoration:none;transition:all .15s}
.cmp-link:hover{border-color:var(--gold);color:var(--gold)}

/* Bottom CTA dual */
.cmp-cta-bottom{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-top:32px}
@media(max-width:760px){.cmp-cta-bottom{grid-template-columns:1fr}}
.cmp-cta-final{display:block;padding:18px 22px;border-radius:14px;background:var(--card);border:1px solid color-mix(in srgb,var(--c) 32%,var(--b1));text-align:center;text-decoration:none;transition:all .2s}
.cmp-cta-final.a{--c:var(--colA)}.cmp-cta-final.b{--c:var(--colB)}
.cmp-cta-final:hover{border-color:var(--c);background:color-mix(in srgb,var(--c) 8%,var(--card));transform:translateY(-2px)}
.cmp-cta-final-label{font-size:11px;color:var(--t3);text-transform:uppercase;letter-spacing:1.4px;font-weight:700;margin-bottom:8px}
.cmp-cta-final-name{font-size:18px;font-weight:800;color:var(--c);margin-bottom:4px}
.cmp-cta-final-disc{font-size:12px;color:var(--t2)}

/* Footer */
.cmp-foot{margin-top:50px;padding:28px 0;border-top:1px solid var(--b1);text-align:center;font-size:12px;color:var(--t3)}
.cmp-foot a{color:var(--gold);text-decoration:none}
.cmp-foot-disc{font-size:11px;color:var(--t3);max-width:600px;margin:8px auto 0;line-height:1.6;opacity:.7}
</style>
</head>
<body>

<!-- TOP NAV -->
<nav class="cmp-nav">
  <a class="cmp-nav-logo" href="/">Markets <span>Coupons</span></a>
  <a class="cmp-nav-back" href="/">← Voltar pra home</a>
</nav>

<div class="cmp-wrap">

  <!-- HERO -->
  <section class="cmp-hero">
    <div class="cmp-hero-eyebrow">Comparativo Prop Firms 2026</div>
    <h1 class="cmp-h1">${esc(a.name)}<span class="vs">vs</span>${esc(b.name)}</h1>
    <p class="cmp-sub">Análise lado a lado das duas prop firms. ${minA && minB ? `Conta de entrada a partir de $${(Math.min(minA, minB)).toFixed(2)}.` : ''}</p>
  </section>

  <!-- FIRM CARDS -->
  <div class="cmp-firms">
    <article class="cmp-firm a">
      ${a.bg_image ? `<div class="cmp-firm-bg" style="background-image:url('https://www.marketscoupons.com/${esc(a.bg_image)}')"></div>` : ''}
      <img class="cmp-firm-logo" src="https://www.marketscoupons.com/${esc(a.icon_url)}" alt="${esc(a.name)} logo" loading="lazy" width="64" height="64">
      <div class="cmp-firm-name">${esc(a.name)}</div>
      <div class="cmp-firm-type">${esc(a.type || '')}</div>
      <div class="cmp-firm-disc">${a.discount}% OFF</div>
      <div class="cmp-firm-disc-label">${esc(a.discount_type || '')}</div>
      <div class="cmp-firm-pills">${(a.tags || []).slice(0, 3).map(t => `<span class="cmp-firm-pill">${esc(t)}</span>`).join('')}</div>
      <div class="cmp-firm-stat-row">
        <span><strong>${a.split || '—'}</strong> split</span>
        <span><strong>${minA ? '$' + minA.toFixed(2) : '—'}</strong> entry</span>
        <span><strong>${a.trustpilot_score || a.rating || '—'} ★</strong></span>
      </div>
      <a class="cmp-firm-cta" href="${esc(a.link)}" target="_blank" rel="noopener" data-firm="${esc(a.id)}">Acessar ${esc(shortA)} →</a>
      ${a.coupon ? `<div class="cmp-firm-coupon">Cupom: <strong>${esc(a.coupon)}</strong></div>` : ''}
    </article>

    <div class="vs-circle">VS</div>

    <article class="cmp-firm b">
      ${b.bg_image ? `<div class="cmp-firm-bg" style="background-image:url('https://www.marketscoupons.com/${esc(b.bg_image)}')"></div>` : ''}
      <img class="cmp-firm-logo" src="https://www.marketscoupons.com/${esc(b.icon_url)}" alt="${esc(b.name)} logo" loading="lazy" width="64" height="64">
      <div class="cmp-firm-name">${esc(b.name)}</div>
      <div class="cmp-firm-type">${esc(b.type || '')}</div>
      <div class="cmp-firm-disc">${b.discount}% OFF</div>
      <div class="cmp-firm-disc-label">${esc(b.discount_type || '')}</div>
      <div class="cmp-firm-pills">${(b.tags || []).slice(0, 3).map(t => `<span class="cmp-firm-pill">${esc(t)}</span>`).join('')}</div>
      <div class="cmp-firm-stat-row">
        <span><strong>${b.split || '—'}</strong> split</span>
        <span><strong>${minB ? '$' + minB.toFixed(2) : '—'}</strong> entry</span>
        <span><strong>${b.trustpilot_score || b.rating || '—'} ★</strong></span>
      </div>
      <a class="cmp-firm-cta" href="${esc(b.link)}" target="_blank" rel="noopener" data-firm="${esc(b.id)}">Acessar ${esc(shortB)} →</a>
      ${b.coupon ? `<div class="cmp-firm-coupon">Cupom: <strong>${esc(b.coupon)}</strong></div>` : ''}
    </article>
  </div>

  <!-- TRUSTPILOT ROW -->
  <div class="cmp-tp-row">
    <div class="cmp-tp">
      <div class="cmp-tp-stars">${stars(a.trustpilot_score || a.rating)}</div>
      <div>
        <div class="cmp-tp-score">${a.trustpilot_score || a.rating || '—'}</div>
        <div class="cmp-tp-meta">${(a.trustpilot_reviews || a.reviews || 0).toLocaleString('pt-BR')} reviews · Trustpilot</div>
      </div>
    </div>
    <div class="cmp-tp">
      <div class="cmp-tp-stars">${stars(b.trustpilot_score || b.rating)}</div>
      <div>
        <div class="cmp-tp-score">${b.trustpilot_score || b.rating || '—'}</div>
        <div class="cmp-tp-meta">${(b.trustpilot_reviews || b.reviews || 0).toLocaleString('pt-BR')} reviews · Trustpilot</div>
      </div>
    </div>
  </div>

  <!-- COMPARISON CATEGORIES -->
  <section class="cmp-sec">
    <div class="cmp-sec-eyebrow">Lado a lado</div>
    <h2 class="cmp-sec-h2">${esc(shortA)} vs ${esc(shortB)} — Comparação</h2>
    <p class="cmp-sec-sub">Cada categoria mostra o vencedor entre as duas firmas.</p>
  </section>
  <div class="cats">${renderCategories}</div>

  <!-- PERSONAS -->
  <section class="cmp-sec">
    <div class="cmp-sec-eyebrow">Quem deve escolher</div>
    <h2 class="cmp-sec-h2">Pra quem cada firma é melhor</h2>
  </section>
  <div class="personas">
    <article class="persona a">
      <div class="persona-h">
        <img src="https://www.marketscoupons.com/${esc(a.icon_url)}" alt="" width="28" height="28">
        Escolha <span>${esc(a.name)}</span> se você...
      </div>
      <ul>${reasonsA.map(r => `<li>${esc(r)}</li>`).join('')}</ul>
    </article>
    <article class="persona b">
      <div class="persona-h">
        <img src="https://www.marketscoupons.com/${esc(b.icon_url)}" alt="" width="28" height="28">
        Escolha <span>${esc(b.name)}</span> se você...
      </div>
      <ul>${reasonsB.map(r => `<li>${esc(r)}</li>`).join('')}</ul>
    </article>
  </div>

  <!-- FAQ visível -->
  <section class="cmp-sec">
    <div class="cmp-sec-eyebrow">Perguntas frequentes</div>
    <h2 class="cmp-sec-h2">${esc(shortA)} vs ${esc(shortB)} — FAQ</h2>
  </section>
  <div class="faqs">
    ${faqs.map(f => `<details class="faq"><summary class="faq-q">${esc(f.q)}</summary><div class="faq-a">${esc(f.a)}</div></details>`).join('')}
  </div>

  <!-- INTERNAL LINKS NETWORK -->
  <section class="cmp-sec">
    <div class="cmp-sec-eyebrow">Outros comparativos</div>
    <h2 class="cmp-sec-h2">Compare também</h2>
  </section>
  <div class="cmp-others">${otherCombos}</div>

  <!-- FINAL CTAs -->
  <div class="cmp-cta-bottom">
    <a class="cmp-cta-final a" href="${esc(a.link)}" target="_blank" rel="noopener">
      <div class="cmp-cta-final-label">Pronto pra começar?</div>
      <div class="cmp-cta-final-name">${esc(a.name)}</div>
      <div class="cmp-cta-final-disc">${a.discount}% OFF${a.coupon ? ` · cupom ${esc(a.coupon)}` : ''}</div>
    </a>
    <a class="cmp-cta-final b" href="${esc(b.link)}" target="_blank" rel="noopener">
      <div class="cmp-cta-final-label">Pronto pra começar?</div>
      <div class="cmp-cta-final-name">${esc(b.name)}</div>
      <div class="cmp-cta-final-disc">${b.discount}% OFF${b.coupon ? ` · cupom ${esc(b.coupon)}` : ''}</div>
    </a>
  </div>

  <footer class="cmp-foot">
    <a href="/">marketscoupons.com</a> · Comparativo gerado de dados oficiais e atualizado em ${new Date().toLocaleDateString('pt-BR')}
    <p class="cmp-foot-disc">Cupons e condições podem mudar. Confirme no checkout da firma. Markets Coupons recebe comissão de afiliado em compras feitas via links acima — sem custo adicional pra você.</p>
  </footer>

</div>

</body>
</html>`;
}

(async () => {
  console.log('Loading firms...');
  const firms = await loadFirms();
  console.log(`Loaded ${firms.length} firms.`);

  const outDir = path.join(ROOT, 'compare');
  fs.mkdirSync(outDir, { recursive: true });

  let canonicalCount = 0, redirectCount = 0;
  for (let i = 0; i < firms.length; i++) {
    for (let j = i + 1; j < firms.length; j++) {
      const a = firms[i];
      const b = firms[j];
      const canonicalSlug = `${a.id}-vs-${b.id}`;
      const reverseSlug = `${b.id}-vs-${a.id}`;
      fs.writeFileSync(path.join(outDir, `${canonicalSlug}.html`), genPage(a, b, firms), 'utf8');
      canonicalCount++;
      // Reverse: redirect mínimo
      const shortA = a.short_name || a.name.split(' ')[0];
      const shortB = b.short_name || b.name.split(' ')[0];
      const redirectHtml = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><title>${esc(shortB)} vs ${esc(shortA)} | Markets Coupons</title><link rel="canonical" href="https://www.marketscoupons.com/${canonicalSlug}"><meta http-equiv="refresh" content="0;url=/${canonicalSlug}"><meta name="robots" content="noindex,follow"></head><body>Redirecionando para <a href="/${canonicalSlug}">${esc(a.name)} vs ${esc(b.name)}</a>...</body></html>`;
      fs.writeFileSync(path.join(outDir, `${reverseSlug}.html`), redirectHtml, 'utf8');
      redirectCount++;
    }
  }
  console.log(`Generated ${canonicalCount} canonical + ${redirectCount} reverse-redirect pages.`);
})();
