#!/usr/bin/env node
/**
 * kill-firm.mjs — tira uma firma do ar POR COMPLETO, incluindo as paginas geradas.
 *
 * Diferenca pra "pausar" (que e so `active=false` no banco):
 *   pausar  -> some das superficies dinamicas, mas as ~300 paginas estaticas
 *              (seo/ e compare/) continuam no ar mandando trafego pra firma
 *   matar   -> as paginas tambem saem, e o trafego que ja existe no Google e
 *              REDIRECIONADO pra /coupons em vez de virar 404
 *
 * POR QUE REDIRECT E NAO DELETE: URL indexada que vira 404 perde posicao e leva
 * meses pra voltar, e o visitante que veio do Google vai embora. Com 301 a
 * autoridade da pagina passa pra /coupons e a visita ainda vira venda de OUTRA
 * firma. Deletar joga fora as duas coisas.
 *
 * Uso:
 *   node scripts/kill-firm.mjs goat            # DRY RUN: so mostra o que faria
 *   node scripts/kill-firm.mjs goat --go       # executa
 *   node scripts/kill-firm.mjs goat --undo     # desfaz (tira os redirects; as
 *                                              # paginas voltam com regen --force)
 *
 * Requer SUPABASE_SERVICE_ROLE_KEY no ambiente.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const SB = 'https://qfwhduvutfumsaxnuofa.supabase.co';
const LANGS = ['en', 'es', 'it', 'fr', 'de', 'ar', 'id'];
const DESTINO = '/coupons';           // pra onde o trafego orfao vai
const MARCA_INI = '__KILL_FIRM_INI__';
const MARCA_FIM = '__KILL_FIRM_FIM__';

const slug = process.argv[2];
const GO = process.argv.includes('--go');
const UNDO = process.argv.includes('--undo');
if (!slug) {
  console.error('uso: node scripts/kill-firm.mjs <slug> [--go|--undo]');
  process.exit(2);
}

function sr() {
  const k = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE;
  if (!k) { console.error('falta SUPABASE_SERVICE_ROLE_KEY'); process.exit(2); }
  return k;
}

async function patch(tabela, filtro, corpo) {
  const k = sr();
  const r = await fetch(`${SB}/rest/v1/${tabela}?${filtro}`, {
    method: 'PATCH',
    headers: { apikey: k, Authorization: `Bearer ${k}`, 'Content-Type': 'application/json', Prefer: 'return=representation' },
    body: JSON.stringify(corpo),
  });
  return r.ok ? await r.json() : null;
}

// ── 1. arquivos gerados dessa firma ──────────────────────────────────────────
function arquivosDaFirma() {
  const achados = [];
  const dirs = [];
  for (const base of ['seo', 'compare']) {
    dirs.push(path.join(ROOT, base));
    for (const l of LANGS) dirs.push(path.join(ROOT, l, base));
  }
  for (const d of dirs) {
    if (!fs.existsSync(d)) continue;
    for (const n of fs.readdirSync(d)) {
      if (!n.endsWith('.html')) continue;
      const nome = n.slice(0, -5);
      if (nome === slug || nome.startsWith(`${slug}-vs-`) || nome.endsWith(`-vs-${slug}`)) {
        achados.push(path.join(d, n));
      }
    }
  }
  return achados;
}

// ── 2. redirects 301 no vercel.json ──────────────────────────────────────────
function regrasRedirect() {
  // Sintaxe path-to-regexp com grupo NOMEADO, que e a que o vercel.json deste repo
  // ja usa e comprovadamente funciona (ex: "/:path(.*)"). Grupo nomeado e
  // obrigatorio quando o parametro nao ocupa o segmento inteiro: "/:a-vs-goat"
  // nao casa de forma confiavel, "/:a([a-z0-9-]+)-vs-goat" casa.
  const L = '(en|es|it|fr|de|ar|id)';
  return [
    { source: `/${slug}`,                                    destination: DESTINO, permanent: true },
    { source: `/${slug}-coupon`,                             destination: DESTINO, permanent: true },
    { source: `/:lang${L}/${slug}`,                          destination: DESTINO, permanent: true },
    { source: `/:lang${L}/${slug}-coupon`,                   destination: DESTINO, permanent: true },
    { source: `/:a([a-z0-9-]+)-vs-${slug}`,                  destination: '/compare', permanent: true },
    { source: `/${slug}-vs-:b([a-z0-9-]+)`,                  destination: '/compare', permanent: true },
    { source: `/:lang${L}/:a([a-z0-9-]+)-vs-${slug}`,        destination: '/compare', permanent: true },
    { source: `/:lang${L}/${slug}-vs-:b([a-z0-9-]+)`,        destination: '/compare', permanent: true },
  ];
}

function mexeVercel(remover) {
  const p = path.join(ROOT, 'vercel.json');
  const cfg = JSON.parse(fs.readFileSync(p, 'utf8'));
  cfg.redirects = cfg.redirects || [];
  // tira o que ja existir dessa firma (idempotente)
  cfg.redirects = cfg.redirects.filter((r) => !String(r.source || '').includes(slug));
  if (!remover) cfg.redirects = regrasRedirect().concat(cfg.redirects);
  return { p, txt: JSON.stringify(cfg, null, 2) + '\n', n: remover ? 0 : regrasRedirect().length };
}

// ── main ─────────────────────────────────────────────────────────────────────
const arquivos = arquivosDaFirma();
const { p: vpath, txt: vtxt, n: nreg } = mexeVercel(UNDO);

console.log(`\n${UNDO ? 'DESFAZER' : 'MATAR'} a firma: ${slug}\n${'='.repeat(60)}`);
console.log(`  paginas geradas encontradas : ${arquivos.length}`);
console.log(`  regras de redirect 301      : ${nreg}  -> ${DESTINO} / /compare`);
console.log(`  banco                       : cms_firms.active=${UNDO} , firms.ativo=${UNDO}`);
if (arquivos.length) {
  console.log(`\n  exemplos:`);
  arquivos.slice(0, 5).forEach((f) => console.log(`    ${path.relative(ROOT, f)}`));
  if (arquivos.length > 5) console.log(`    ... +${arquivos.length - 5}`);
}

if (!GO && !UNDO) {
  console.log(`\nDRY RUN. Nada foi alterado.`);
  console.log(`Pra executar de verdade:  node scripts/kill-firm.mjs ${slug} --go\n`);
  process.exit(0);
}

const alvo = UNDO;   // undo religa
await patch('cms_firms', `id=eq.${slug}`, { active: alvo });
await patch('firms', `slug=eq.${slug}`, { ativo: alvo });
console.log(`\n  banco atualizado (active/ativo = ${alvo})`);

if (!UNDO) {
  for (const f of arquivos) fs.unlinkSync(f);
  console.log(`  ${arquivos.length} paginas removidas do disco`);
}
fs.writeFileSync(vpath, vtxt, 'utf8');
console.log(`  vercel.json: ${UNDO ? 'redirects removidos' : nreg + ' redirects 301 adicionados'}`);

// Pipeline completo aqui dentro: o objetivo e ser UM comando. Deixar passo manual
// depois significa, na pratica, banco atualizado com o site ainda servindo o velho.
function rodar(cmd, args, rotulo) {
  process.stdout.write(`  ${rotulo}... `);
  try {
    execFileSync(cmd, args, { cwd: ROOT, stdio: 'pipe', env: process.env, shell: process.platform === 'win32' });
    console.log('ok');
    return true;
  } catch (e) {
    console.log('FALHOU');
    console.error(`    ${String(e.stderr || e.message).slice(0, 300)}`);
    return false;
  }
}

console.log(`\nPUBLICANDO:`);
rodar('node', ['scripts/regen-static.mjs', '--force'], 'regen das paginas');
rodar('node', ['scripts/build-compat.mjs'], 'build ES2019');

const vt = (() => {
  try {
    const m = fs.readFileSync(path.join(ROOT, '.env.local'), 'utf8').match(/^VERCEL_TOKEN=(.*)$/m);
    return m ? m[1].trim().replace(/^["']|["']$/g, '') : '';
  } catch { return ''; }
})();
if (!vt) {
  console.log(`\n  sem VERCEL_TOKEN no .env.local — deploye na mao:`);
  console.log(`    npx vercel --prod --yes --token=<token>`);
} else {
  rodar('npx', ['vercel', '--prod', '--yes', '--token', vt], 'deploy Vercel');
}

console.log(`\nCONFIRA (301 esperado nos dois):`);
console.log(`  curl -sI https://www.marketscoupons.com/${slug} | head -1`);
console.log(`  curl -sI https://www.marketscoupons.com/apex-vs-${slug} | head -1\n`);
