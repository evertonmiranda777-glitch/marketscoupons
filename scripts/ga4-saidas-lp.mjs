#!/usr/bin/env node
// Quantas pessoas saem da LP /coupons PRA DENTRO do site.
//
// Everton pediu a contagem a partir de 06/08/2026. As tres portas (logo, "Explore
// full site" e "See all 18 firms") mandam o mesmo evento `select_content`, separadas
// pelo campo `location` , ver coupons.html, GA4_FUNNEL.
//
//   node scripts/ga4-saidas-lp.mjs             -> de 06/08 ate hoje
//   node scripts/ga4-saidas-lp.mjs 2026-08-10  -> de uma data especifica
//   node scripts/ga4-saidas-lp.mjs hoje        -> so hoje (tempo real, ultimos 30min)
//
// Le com a service account ga4-reader (JSON em ~/.gcp/, fora do repo, nunca commitado).
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';

const PROPRIEDADE = '505861794';               // mesma do admin.html
const INICIO_PADRAO = '2026-08-06';            // dia em que o rastreio subiu
const CRED = path.join(os.homedir(), '.gcp', 'markets-ga4-reader.json');

if (!fs.existsSync(CRED)) {
  console.error('Credencial do GA4 nao encontrada em ~/.gcp/markets-ga4-reader.json');
  process.exit(1);
}
const sa = JSON.parse(fs.readFileSync(CRED, 'utf8'));

// ── token OAuth (JWT assinado, sem dependencia externa) ────────────────────────
function b64(o) {
  return Buffer.from(typeof o === 'string' ? o : JSON.stringify(o))
    .toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}
async function token() {
  const agora = Math.floor(Date.now() / 1000);
  const corpo = b64({ alg: 'RS256', typ: 'JWT' }) + '.' + b64({
    iss: sa.client_email,
    scope: 'https://www.googleapis.com/auth/analytics.readonly',
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
  if (!j.access_token) { console.error('Falha no token:', j.error_description || j.error); process.exit(1); }
  return j.access_token;
}

const arg = process.argv[2];
const agora = new Date().toISOString().slice(0, 10);
const tempoReal = arg === 'hoje' || arg === 'realtime';
const inicio = tempoReal ? null : (arg || INICIO_PADRAO);

const ROTULO = {
  lp_coupons_logo: 'Logo do topo',
  lp_coupons_more: '"Explore full site"',
  lp_coupons_see_all: '"See all 18 firms"',
};

const t = await token();
const base = `https://analyticsdata.googleapis.com/v1beta/properties/${PROPRIEDADE}`;
const corpo = tempoReal
  ? { dimensions: [{ name: 'customEvent:location' }], metrics: [{ name: 'eventCount' }],
      dimensionFilter: { filter: { fieldName: 'eventName', stringFilter: { value: 'select_content' } } } }
  : { dateRanges: [{ startDate: inicio, endDate: agora }],
      dimensions: [{ name: 'customEvent:location' }], metrics: [{ name: 'eventCount' }],
      dimensionFilter: { filter: { fieldName: 'eventName', stringFilter: { value: 'select_content' } } } };

const r = await fetch(`${base}:${tempoReal ? 'runRealtimeReport' : 'runReport'}`, {
  method: 'POST',
  headers: { Authorization: 'Bearer ' + t, 'Content-Type': 'application/json' },
  body: JSON.stringify(corpo),
});
const j = await r.json();
if (j.error) { console.error('GA4:', j.error.message); process.exit(1); }

const linhas = (j.rows || [])
  .map(x => ({ onde: x.dimensionValues[0].value, n: Number(x.metricValues[0].value) }))
  .filter(x => x.onde.startsWith('lp_coupons'))
  .sort((a, b) => b.n - a.n);

console.log(tempoReal ? '\nSAIDAS DA LP PRO SITE (tempo real, ultimos 30 min)'
                      : `\nSAIDAS DA LP PRO SITE (${inicio} ate ${agora})`);
console.log('-'.repeat(46));
if (!linhas.length) {
  console.log('  nenhum clique registrado ainda');
  console.log('  (o GA4 leva ate ~24h no relatorio normal; use "hoje" pro tempo real)');
} else {
  for (const l of linhas) console.log(`  ${(ROTULO[l.onde] || l.onde).padEnd(24)} ${String(l.n).padStart(5)}`);
  console.log('-'.repeat(46));
  console.log(`  ${'TOTAL'.padEnd(24)} ${String(linhas.reduce((s, l) => s + l.n, 0)).padStart(5)}`);
}
console.log();
