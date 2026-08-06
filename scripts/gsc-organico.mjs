#!/usr/bin/env node
// Diagnostico do organico via Search Console API.
//
// POR QUE EXISTE: o painel de afiliado da Apex mostrou que o trafego ORGANICO
// converte muito melhor que o pago , $4,71 por clique vindo do proprio site contra
// $0,28 do Instagram pago. Sem medir o organico direito, nao da pra saber onde
// atacar.
//
//   node scripts/gsc-organico.mjs          -> ultimos 28 dias
//   node scripts/gsc-organico.mjs 90       -> ultimos 90 dias
//
// Le com a service account ga4-reader (JSON em ~/.gcp/, fora do repo).
// ⚠️ GA4 e Search Console sao produtos SEPARADOS: acesso num nao da acesso no outro.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';

const SITE = 'https://www.marketscoupons.com/';   // propriedade e PREFIXO DE URL, nao sc-domain
const CRED = path.join(os.homedir(), '.gcp', 'markets-ga4-reader.json');
const DIAS = parseInt(process.argv[2] || '28', 10);

if (!fs.existsSync(CRED)) { console.error('Credencial nao encontrada em ~/.gcp/'); process.exit(1); }
const sa = JSON.parse(fs.readFileSync(CRED, 'utf8'));

const b64 = (o) => Buffer.from(typeof o === 'string' ? o : JSON.stringify(o))
  .toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');

async function token() {
  const agora = Math.floor(Date.now() / 1000);
  const corpo = b64({ alg: 'RS256', typ: 'JWT' }) + '.' + b64({
    iss: sa.client_email,
    scope: 'https://www.googleapis.com/auth/webmasters.readonly',
    aud: 'https://oauth2.googleapis.com/token',
    iat: agora, exp: agora + 3600,
  });
  const assin = crypto.createSign('RSA-SHA256').update(corpo).end()
    .sign(sa.private_key, 'base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  const r = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: corpo + '.' + assin,
    }),
  });
  const j = await r.json();
  if (!j.access_token) { console.error('token:', j.error_description || j.error); process.exit(1); }
  return j.access_token;
}

const dia = (d) => new Date(Date.now() - d * 864e5).toISOString().slice(0, 10);
const t = await token();

async function consulta(corpo) {
  const r = await fetch(
    `https://searchconsole.googleapis.com/webmasters/v3/sites/${encodeURIComponent(SITE)}/searchAnalytics/query`,
    { method: 'POST', headers: { Authorization: 'Bearer ' + t, 'Content-Type': 'application/json' }, body: JSON.stringify(corpo) });
  const j = await r.json();
  if (j.error) { console.error('GSC:', j.error.message); process.exit(1); }
  return j.rows || [];
}

const base = { startDate: dia(DIAS + 2), endDate: dia(2), rowLimit: 25000 };

// ── 1. total do periodo ────────────────────────────────────────────────────────
const tot = await consulta({ ...base, dimensions: [] });
const T = tot[0] || { clicks: 0, impressions: 0, position: 0 };
console.log(`\nORGANICO , ultimos ${DIAS} dias (${base.startDate} a ${base.endDate})`);
console.log('─'.repeat(58));
console.log(`  cliques ${String(T.clicks).padStart(6)}   impressoes ${String(T.impressions).padStart(7)}   posicao media ${T.position.toFixed(1)}`);

// ── 2. marca x nao-marca ───────────────────────────────────────────────────────
const qs = await consulta({ ...base, dimensions: ['query'] });
const ehMarca = (q) => /market\s?s?coupons?|marketscoupon/i.test(q);
const somar = (arr) => arr.reduce((a, r) => ({ c: a.c + r.clicks, i: a.i + r.impressions }), { c: 0, i: 0 });
const marca = somar(qs.filter((r) => ehMarca(r.keys[0])));
const nao = somar(qs.filter((r) => !ehMarca(r.keys[0])));
console.log(`\n  MARCA      ${String(marca.c).padStart(5)} cliques / ${String(marca.i).padStart(6)} impressoes`);
console.log(`  NAO-MARCA  ${String(nao.c).padStart(5)} cliques / ${String(nao.i).padStart(6)} impressoes   <- e aqui que mora o crescimento`);

// ── 3. onde o Google ja nos mostra e nao clicamos (a demanda desperdicada) ──────
const clusters = [
  ['best / top / ranking prop firms', /\b(best|top|melhor|ranking|rated)\b/i],
  ['comparacao entre firmas',         /\b(vs|versus|compare|comparison)\b/i],
  ['review de firma',                 /\b(review|reviews|avalia)/i],
  ['cupom / desconto',                /\b(coupon|cupom|discount|promo|code)\b/i],
  ['barata / preco',                  /\b(cheap|cheapest|price|pricing|barata)\b/i],
];
console.log('\n  ONDE O GOOGLE JA NOS MOSTRA (nao-marca):');
console.log('  ' + 'cluster'.padEnd(34) + 'impress.'.padStart(9) + 'cliques'.padStart(9) + 'posicao'.padStart(9));
for (const [nome, re] of clusters) {
  const linhas = qs.filter((r) => !ehMarca(r.keys[0]) && re.test(r.keys[0]));
  if (!linhas.length) continue;
  const s = somar(linhas);
  const pos = linhas.reduce((a, r) => a + r.position * r.impressions, 0) / (s.i || 1);
  console.log('  ' + nome.padEnd(34) + String(s.i).padStart(9) + String(s.c).padStart(9) + pos.toFixed(1).padStart(9));
}

// ── 4. as 12 consultas nao-marca com mais impressao e zero (ou quase) clique ────
const perto = qs.filter((r) => !ehMarca(r.keys[0]) && r.impressions >= 5)
  .sort((a, b) => b.impressions - a.impressions).slice(0, 12);
console.log('\n  MAIS VISTAS SEM CLIQUE (a fila de espera do SEO):');
for (const r of perto) {
  console.log('   ' + String(r.keys[0]).slice(0, 40).padEnd(42) + String(r.impressions).padStart(5) + ' impr  ' + String(r.clicks).padStart(3) + ' cliq   pos ' + r.position.toFixed(0).padStart(3));
}

// ── 5. paginas que ja trazem clique ────────────────────────────────────────────
const pgs = (await consulta({ ...base, dimensions: ['page'] }))
  .filter((r) => r.clicks > 0).sort((a, b) => b.clicks - a.clicks).slice(0, 10);
console.log('\n  PAGINAS QUE TRAZEM CLIQUE:');
for (const r of pgs) {
  console.log('   ' + String(r.keys[0]).replace(SITE, '/').slice(0, 44).padEnd(46) + String(r.clicks).padStart(4) + ' cliq  ' + String(r.impressions).padStart(5) + ' impr');
}
console.log();
