#!/usr/bin/env node
/**
 * build-compare-pages.mjs — Gera páginas /{firmA}-vs-{firmB} a partir de cms_firms.
 *
 * Output: HTML estático em /compare/{slugA}-vs-{slugB}.html (66 páginas)
 * Vercel rewrites: /(firmA)-vs-(firmB) → /compare/{firmA}-vs-{firmB}.html
 *
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

const escapeHtml = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');

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

function comparisonRow(label, valA, valB, hint = '') {
  const v = (x) => escapeHtml(x ?? '—');
  return `<tr><td class="cmp-lbl">${escapeHtml(label)}${hint ? `<span class="cmp-hint">${escapeHtml(hint)}</span>` : ''}</td><td class="cmp-val">${v(valA)}</td><td class="cmp-val">${v(valB)}</td></tr>`;
}

function genPage(a, b) {
  const minA = priceMin(a.prices);
  const minB = priceMin(b.prices);
  const minLabel = (n) => n ? `$${n.toFixed(2)}` : '—';

  // Title curto pra SEO (~60 chars max — Google trunca acima disso)
  const shortA = a.short_name || a.name.split(' ')[0];
  const shortB = b.short_name || b.name.split(' ')[0];
  const title = `${shortA} vs ${shortB} 2026: Comparativo | Markets Coupons`;
  const desc = `Compare ${a.name} e ${b.name}: preços, drawdown, profit split, payout. Cupons exclusivos atualizados.`;
  const h1 = `${a.name} vs ${b.name}`;
  const sub = `Comparativo lado a lado das duas prop firms. Atualizado em ${new Date().toISOString().slice(0,10)}.`;
  const slugPair = `${a.id}-vs-${b.id}`;

  const rows = [
    comparisonRow('Tipo', a.type, b.type),
    comparisonRow('Avaliação Trustpilot', `${a.trustpilot_score || a.rating || '—'} ★ (${(a.trustpilot_reviews || a.reviews || 0).toLocaleString('pt-BR')} reviews)`, `${b.trustpilot_score || b.rating || '—'} ★ (${(b.trustpilot_reviews || b.reviews || 0).toLocaleString('pt-BR')} reviews)`),
    comparisonRow('Profit Split', a.split, b.split, 'Quanto do lucro o trader fica'),
    comparisonRow('Drawdown', a.drawdown, b.drawdown),
    comparisonRow('Drawdown Limit', a.dd_pct, b.dd_pct),
    comparisonRow('Profit Target', a.target, b.target),
    comparisonRow('Min. Days', a.min_days || '—', b.min_days || '—'),
    comparisonRow('Eval Days', a.eval_days ?? '—', b.eval_days ?? '—'),
    comparisonRow('News Trading', a.news_trading ? '✓ Permitido' : '✗ Bloqueado', b.news_trading ? '✓ Permitido' : '✗ Bloqueado'),
    comparisonRow('Day-1 Payout', a.day1_payout ? '✓ Sim' : '✗ Não', b.day1_payout ? '✓ Sim' : '✗ Não'),
    comparisonRow('Scaling', a.scaling, b.scaling),
    comparisonRow('Plataformas', (a.platforms || []).join(', '), (b.platforms || []).join(', ')),
    comparisonRow('Conta menor (preço c/ cupom)', minLabel(minA), minLabel(minB)),
    comparisonRow('Cupom', a.coupon || '—', b.coupon || '—'),
    comparisonRow('Desconto', `${a.discount}% ${a.discount_type || ''}`, `${b.discount}% ${b.discount_type || ''}`),
  ].join('\n');

  // Recommendation logic — naive but better than nothing
  const recLines = [];
  if ((a.discount || 0) > (b.discount || 0)) recLines.push(`<li><strong>Maior desconto:</strong> ${a.name} (${a.discount}% vs ${b.discount}% da ${b.name}).</li>`);
  else if ((b.discount || 0) > (a.discount || 0)) recLines.push(`<li><strong>Maior desconto:</strong> ${b.name} (${b.discount}% vs ${a.discount}% da ${a.name}).</li>`);
  if (minA && minB) {
    if (minA < minB) recLines.push(`<li><strong>Conta mais barata:</strong> ${a.name} a partir de $${minA.toFixed(2)} (vs $${minB.toFixed(2)} da ${b.name}).</li>`);
    else if (minB < minA) recLines.push(`<li><strong>Conta mais barata:</strong> ${b.name} a partir de $${minB.toFixed(2)} (vs $${minA.toFixed(2)} da ${a.name}).</li>`);
  }
  if (a.day1_payout && !b.day1_payout) recLines.push(`<li><strong>Payout mais rápido:</strong> ${a.name} (Day-1) — ${b.name} não tem.</li>`);
  else if (b.day1_payout && !a.day1_payout) recLines.push(`<li><strong>Payout mais rápido:</strong> ${b.name} (Day-1) — ${a.name} não tem.</li>`);
  if (a.news_trading && !b.news_trading) recLines.push(`<li><strong>News trading:</strong> só ${a.name} permite.</li>`);
  else if (b.news_trading && !a.news_trading) recLines.push(`<li><strong>News trading:</strong> só ${b.name} permite.</li>`);
  if (!recLines.length) recLines.push(`<li>Ambas têm proposta similar. Decisão fica em <strong>plataforma preferida</strong> e <strong>tipo de drawdown</strong>.</li>`);

  // Schema markup — FAQPage com perguntas comuns
  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: `Qual é melhor: ${a.name} ou ${b.name}?`,
        acceptedAnswer: { '@type': 'Answer', text: `Depende do perfil. ${a.name} tem ${a.discount}% off${a.discount_type ? ` ${a.discount_type}` : ''} e drawdown ${a.drawdown}. ${b.name} tem ${b.discount}% off${b.discount_type ? ` ${b.discount_type}` : ''} e drawdown ${b.drawdown}. Para ver os preços lado a lado, consulte a tabela acima.` }
      },
      {
        '@type': 'Question',
        name: `Quanto custa a conta de ${a.name} vs ${b.name}?`,
        acceptedAnswer: { '@type': 'Answer', text: `${a.name} começa em ${minLabel(minA)} (com cupom ${a.coupon || 'incluído'}). ${b.name} começa em ${minLabel(minB)}${b.coupon ? ` (com cupom ${b.coupon})` : ''}.` }
      },
      {
        '@type': 'Question',
        name: `${a.name} ou ${b.name} permite news trading?`,
        acceptedAnswer: { '@type': 'Answer', text: `${a.name} ${a.news_trading ? 'permite' : 'NÃO permite'} operar durante notícias. ${b.name} ${b.news_trading ? 'permite' : 'NÃO permite'}.` }
      }
    ]
  };

  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Início', item: 'https://www.marketscoupons.com/' },
      { '@type': 'ListItem', position: 2, name: 'Comparativo', item: 'https://www.marketscoupons.com/comparar' },
      { '@type': 'ListItem', position: 3, name: `${a.name} vs ${b.name}`, item: `https://www.marketscoupons.com/${slugPair}` }
    ]
  };

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>${escapeHtml(title)}</title>
<meta name="description" content="${escapeHtml(desc)}">
<meta name="robots" content="index,follow">
<link rel="canonical" href="https://www.marketscoupons.com/${slugPair}">
<meta property="og:type" content="article">
<meta property="og:title" content="${escapeHtml(title)}">
<meta property="og:description" content="${escapeHtml(desc)}">
<meta property="og:url" content="https://www.marketscoupons.com/${slugPair}">
<meta property="og:locale" content="pt_BR">
<meta property="og:image" content="https://www.marketscoupons.com/og-image.png">
<meta name="twitter:card" content="summary_large_image">
<link rel="alternate" hreflang="pt-BR" href="https://www.marketscoupons.com/${slugPair}">
<link rel="alternate" hreflang="x-default" href="https://www.marketscoupons.com/${slugPair}">
<link rel="icon" href="/favicon.png">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap" rel="stylesheet">
<script type="application/ld+json">${JSON.stringify(breadcrumbSchema)}</script>
<script type="application/ld+json">${JSON.stringify(faqSchema)}</script>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:Inter,system-ui,sans-serif;background:radial-gradient(ellipse at top,#1a1410 0%,#0a0e13 60%,#000 100%);color:#E6EDF3;line-height:1.6;min-height:100vh}
.cmp-wrap{max-width:980px;margin:0 auto;padding:40px 20px 80px}
.cmp-back{display:inline-flex;align-items:center;gap:6px;color:#8A98AE;font-size:13px;text-decoration:none;margin-bottom:24px}
.cmp-back:hover{color:#F0B429}
.cmp-h1{font-size:clamp(28px,5vw,42px);font-weight:800;letter-spacing:-0.02em;margin-bottom:8px;line-height:1.15}
.cmp-h1 .vs{color:#F0B429;margin:0 12px;font-weight:600}
.cmp-sub{color:#8A98AE;font-size:14px;margin-bottom:32px}
.cmp-firms{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:32px}
@media(max-width:600px){.cmp-firms{grid-template-columns:1fr}}
.cmp-firm{background:rgba(13,17,23,.6);border:1px solid rgba(240,180,41,.18);border-radius:14px;padding:20px;text-align:center}
.cmp-firm img{width:48px;height:48px;border-radius:10px;margin:0 auto 12px;display:block;background:#0f0f10;padding:6px}
.cmp-firm h2{font-size:18px;font-weight:700;margin-bottom:4px}
.cmp-firm-type{font-size:11px;color:#8A98AE;text-transform:uppercase;letter-spacing:1px;margin-bottom:12px}
.cmp-firm .disc{font-size:24px;font-weight:800;color:#F0B429;margin-bottom:10px}
.cmp-firm .cta{display:block;background:linear-gradient(90deg,#c8941a,#F0B429,#f5d060,#F0B429,#c8941a);background-size:200% 100%;color:#0d141c;font-weight:700;padding:11px 18px;border-radius:8px;text-decoration:none;font-size:13px}
.cmp-firm .cta:hover{filter:brightness(1.05)}
table.cmp{width:100%;border-collapse:collapse;background:rgba(13,17,23,.6);border:1px solid rgba(107,182,201,.18);border-radius:12px;overflow:hidden;margin-bottom:32px}
table.cmp th{background:rgba(240,180,41,.08);color:#F0B429;font-size:12px;text-transform:uppercase;letter-spacing:1px;padding:12px 16px;text-align:left}
table.cmp td{padding:12px 16px;border-top:1px solid rgba(107,182,201,.10);font-size:14px;vertical-align:top}
table.cmp .cmp-lbl{color:#8A98AE;font-weight:600;width:34%}
table.cmp .cmp-hint{display:block;color:#5d6c80;font-size:11px;font-weight:400;margin-top:2px}
table.cmp .cmp-val{color:#E6EDF3}
.cmp-rec{background:rgba(13,17,23,.6);border:1px solid rgba(240,180,41,.22);border-radius:12px;padding:22px 24px;margin-bottom:32px}
.cmp-rec h3{font-size:15px;color:#F0B429;text-transform:uppercase;letter-spacing:1px;margin-bottom:12px}
.cmp-rec ul{padding-left:20px}
.cmp-rec li{margin-bottom:8px;color:#B8C5D6}
.cmp-rec li strong{color:#E6EDF3}
.cmp-foot{text-align:center;color:#5d6c80;font-size:12px;padding-top:24px;border-top:1px solid rgba(107,182,201,.10)}
.cmp-foot a{color:#F0B429;text-decoration:none}
</style>
</head>
<body>
<div class="cmp-wrap">
<a href="/" class="cmp-back">← Voltar pra Markets Coupons</a>
<h1 class="cmp-h1">${escapeHtml(a.name)}<span class="vs">vs</span>${escapeHtml(b.name)}</h1>
<p class="cmp-sub">${escapeHtml(sub)}</p>

<div class="cmp-firms">
  <div class="cmp-firm" style="border-color:${a.color}33">
    <img src="https://www.marketscoupons.com/${a.icon_url}" alt="${escapeHtml(a.name)}" loading="lazy">
    <h2>${escapeHtml(a.name)}</h2>
    <div class="cmp-firm-type">${escapeHtml(a.type || '')}</div>
    <div class="disc" style="color:${a.color}">${a.discount}% OFF</div>
    <a class="cta" href="${escapeHtml(a.link)}" target="_blank" rel="noopener">Conferir ${escapeHtml(a.name)} →</a>
  </div>
  <div class="cmp-firm" style="border-color:${b.color}33">
    <img src="https://www.marketscoupons.com/${b.icon_url}" alt="${escapeHtml(b.name)}" loading="lazy">
    <h2>${escapeHtml(b.name)}</h2>
    <div class="cmp-firm-type">${escapeHtml(b.type || '')}</div>
    <div class="disc" style="color:${b.color}">${b.discount}% OFF</div>
    <a class="cta" href="${escapeHtml(b.link)}" target="_blank" rel="noopener">Conferir ${escapeHtml(b.name)} →</a>
  </div>
</div>

<table class="cmp">
<thead><tr><th>Atributo</th><th>${escapeHtml(a.name)}</th><th>${escapeHtml(b.name)}</th></tr></thead>
<tbody>
${rows}
</tbody>
</table>

<div class="cmp-rec">
<h3>Recomendação</h3>
<ul>${recLines.join('\n')}</ul>
</div>

<div class="cmp-foot">
Comparativo gerado de dados oficiais. Cupons e condições podem mudar — confirme no site da firma.<br>
<a href="/">marketscoupons.com</a>
</div>
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
      const reverseSlug   = `${b.id}-vs-${a.id}`;
      // Canonical: full page com conteúdo
      fs.writeFileSync(path.join(outDir, `${canonicalSlug}.html`), genPage(a, b), 'utf8');
      canonicalCount++;
      // Reverse: redirect HTML mínimo apontando pro canonical (evita 404 + duplicate content)
      const redirectHtml = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><title>${escapeHtml(b.name)} vs ${escapeHtml(a.name)} | Markets Coupons</title><link rel="canonical" href="https://www.marketscoupons.com/${canonicalSlug}"><meta http-equiv="refresh" content="0;url=/${canonicalSlug}"><meta name="robots" content="noindex,follow"></head><body>Redirecionando para <a href="/${canonicalSlug}">${escapeHtml(a.name)} vs ${escapeHtml(b.name)}</a>...</body></html>`;
      fs.writeFileSync(path.join(outDir, `${reverseSlug}.html`), redirectHtml, 'utf8');
      redirectCount++;
    }
  }
  console.log(`Generated ${canonicalCount} canonical + ${redirectCount} reverse-redirect pages in /compare/`);
})();
