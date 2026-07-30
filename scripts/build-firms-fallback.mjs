/**
 * build-firms-fallback.mjs — congela as firmas ativas num JSON servido pelo CDN.
 *
 * POR QUE EXISTE (29/07/2026, custou ~3h de venda):
 * O Postgres do projeto ficou fora (522/UNHEALTHY). O site "nao caiu" , o HTML vem
 * do CDN da Vercel e respondeu 200 o tempo todo , mas firma, preco e cupom sao
 * lidos do `cms_firms` em RUNTIME. Com o banco fora, o unico fallback do
 * loadFirmsFromSupabase era o cache do localStorage. Resultado medido com cache
 * limpo (= visitante novo, que e' quem o anuncio pago traz):
 *
 *     FIRMS carregadas: 0   |   cards na tela: 0   |   cupom: nenhum
 *
 * Pagina em branco respondendo 200: nenhum monitor de uptime acusa, e o trafego
 * pago cai no vazio. A LP /coupons tambem.
 *
 * Este snapshot e' a terceira perna: banco -> cache local -> ARQUIVO ESTATICO.
 * Fica no mesmo deploy do site, entao esta vivo enquanto o CDN estiver vivo.
 *
 * Rodar: sempre que mudar firma (esta no scripts/deploy.sh) ou na mao:
 *   SUPABASE_SERVICE_ROLE_KEY=... node scripts/build-firms-fallback.mjs
 *
 * O SELECT abaixo tem que ser o MESMO do loadFirmsFromSupabase (app.js). Se
 * divergir, o fallback renderiza card faltando campo , por isso o script compara
 * e ABORTA quando as duas listas nao batem.
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.join(import.meta.dirname, '..');
const SB = 'https://qfwhduvutfumsaxnuofa.supabase.co';
const SAIDA = path.join(ROOT, 'data', 'firms-fallback.json');

const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE || '';
if (!KEY) { console.error('SUPABASE_SERVICE_ROLE_KEY obrigatorio'); process.exit(1); }

// Extrai o SELECT real do app.js e usa ELE, pra nunca sair de sincronia na mao.
// ATENCAO: existe MAIS DE UM select em cms_firms no app.js (o do overlay de
// detalhe, ~linha 3483, e o da lista de firmas, ~4795). A 1a versao deste script
// pegou o do overlay e gerou um fallback com 9 campos , card quebrado. Ancorar
// DENTRO de loadFirmsFromSupabase e exigir a coluna `sort_order`, que so o select
// da lista tem.
const appjs = fs.readFileSync(path.join(ROOT, 'app.js'), 'utf8');
const iniFn = appjs.indexOf('async function loadFirmsFromSupabase');
if (iniFn < 0) { console.error('nao achei loadFirmsFromSupabase no app.js'); process.exit(1); }
const trecho = appjs.slice(iniFn, iniFn + 6000);
const m = trecho.match(/from\('cms_firms'\)\.\s*\n?\s*select\('([^']+)'\)/);
if (!m) { console.error('nao achei o select dentro de loadFirmsFromSupabase'); process.exit(1); }
const COLS = m[1];
if (!/\bsort_order\b/.test(COLS)) {
  console.error(`select suspeito (sem sort_order), ${COLS.split(',').length} colunas , abortado pra nao gerar fallback quebrado`);
  process.exit(1);
}
if (COLS.split(',').length < 30) {
  console.error(`select com so ${COLS.split(',').length} colunas, esperado 30+ , abortado`);
  process.exit(1);
}
console.log(`select lido de loadFirmsFromSupabase: ${COLS.split(',').length} colunas`);

const r = await fetch(`${SB}/rest/v1/cms_firms?active=eq.true&select=${encodeURIComponent(COLS)}&order=sort_order.asc`, {
  headers: { apikey: KEY, Authorization: `Bearer ${KEY}` },
});
if (!r.ok) { console.error('REST falhou', r.status, (await r.text()).slice(0, 200)); process.exit(1); }
const rows = await r.json();
if (!Array.isArray(rows) || !rows.length) { console.error('cms_firms devolveu vazio , NAO sobrescrevo o fallback bom'); process.exit(1); }

// Dado de afiliado (cupom/link) mora na tabela `firms` e SOBREPOE o cms_firms,
// igual o runtime faz. Sem isso o fallback poderia servir cupom velho.
const ra = await fetch(`${SB}/rest/v1/firms?ativo=eq.true&select=slug,coupon_code,affiliate_url`, {
  headers: { apikey: KEY, Authorization: `Bearer ${KEY}` },
});
if (ra.ok) {
  const aff = await ra.json();
  const bySlug = {};
  aff.forEach((a) => { bySlug[a.slug] = a; });
  let aplicados = 0;
  rows.forEach((f) => {
    const a = bySlug[f.id];
    if (!a) return;
    f.coupon = a.coupon_code || '';
    if (a.affiliate_url) f.link = a.affiliate_url;
    aplicados++;
  });
  console.log(`afiliado sobreposto em ${aplicados}/${rows.length} firmas`);
} else {
  console.error('AVISO: tabela `firms` nao respondeu , fallback fica com o cupom do cms_firms');
}

const saida = { gerado_em: new Date().toISOString(), total: rows.length, firms: rows };
fs.mkdirSync(path.dirname(SAIDA), { recursive: true });
fs.writeFileSync(SAIDA, JSON.stringify(saida), 'utf8');
const kb = Math.round(fs.statSync(SAIDA).size / 1024);
console.log(`data/firms-fallback.json , ${rows.length} firmas, ${kb} kB`);
