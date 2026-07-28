#!/usr/bin/env node
/**
 * regen-static.mjs — regera TODA pagina estatica que carrega dado de afiliado.
 *
 * Por que existe: o site (index/app.js/coupons) le a tabela `firms` em runtime,
 * entao um cupom corrigido no banco aparece na hora. Mas seo/, compare/ e guides/
 * sao HTML gravado em disco. Se nao forem regerados, continuam servindo o valor
 * antigo indefinidamente — e nenhum verificador de LINK enxerga isso, porque o
 * link da tabela esta certo; quem esta errado e a pagina.
 *
 * Foi exatamente esse buraco que deixou seo/aquafutures.html anunciando 60% OFF
 * (real: 45%) apontando pro dominio morto aquafutures.io.
 *
 * Uso:
 *   node scripts/regen-static.mjs            # regera tudo
 *   node scripts/regen-static.mjs --snapshot # so reescreve firms.json
 *
 * Requer SUPABASE_SERVICE_ROLE_KEY no ambiente (.env.local local, secret no CI).
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { affiliateMap } from './lib/firms-source.mjs';

// As paginas nao carregam so dado de afiliado: elas estampam desconto, preco e
// disc_note, que moram no `cms_firms`. Vigiar so a tabela `firms` deixa passar
// exatamente o caso de 28/07: corrigi The5ers de 5% pra 70% no cms_firms, a
// `firms` nao mudou, o regen disse "nada pra regerar" e as ~3.000 paginas
// continuaram anunciando 5%. Agora o hash cobre as DUAS fontes.
async function fetchConteudo() {
  const SR = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE || '';
  const tok = process.env.FIRMS_CHECK_TOKEN;
  if (!SR) {
    // No CI so existe o token da Edge Function, que nao expoe cms_firms.
    // Sem poder ler o conteudo, o certo e regerar sempre em vez de assumir
    // que nada mudou (o lado seguro do erro).
    return tok ? null : null;
  }
  const cols = 'id,discount,disc_note,prices,detail_plans';
  const r = await fetch(
    `https://qfwhduvutfumsaxnuofa.supabase.co/rest/v1/cms_firms?active=eq.true&select=${cols}&order=id`,
    { headers: { apikey: SR, Authorization: `Bearer ${SR}` } },
  );
  if (!r.ok) return null;
  return await r.json();
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const SNAPSHOT = path.join(ROOT, 'firms.json');
const ESTADO = path.join(ROOT, 'data', 'regen-state.json');
const LANGS_COMPARE = ['pt', 'en', 'es', 'fr', 'de', 'it', 'ar', 'id'];

// Espelho da tabela `firms` em disco. Serve pra 2 coisas:
//   1. fallback do check_links.py / check_pages.py quando o Supabase nao responde
//   2. deteccao de mudanca: se o hash mudou, as paginas precisam ser regeradas
function buildSnapshot(map) {
  return Object.keys(map).sort().map((slug) => {
    const a = map[slug];
    return {
      slug,
      nome: a.nome || slug,                // check_links.py usa "nome" como rotulo
      url: a.affiliate_url,
      param: a.tracking_param,
      valor: a.tracking_value,
      coupon_code: a.coupon_code,          // null = firma sem codigo (estado valido)
      needs_review: a.needs_review === true,
    };
  });
}

function hashOf(obj) {
  return crypto.createHash('sha256').update(JSON.stringify(obj)).digest('hex').slice(0, 16);
}

function run(cmd, args) {
  console.log(`\n$ ${cmd} ${args.join(' ')}`);
  execFileSync(cmd, args, { cwd: ROOT, stdio: 'inherit', env: process.env });
}

async function main() {
  const map = await affiliateMap();
  if (!Object.keys(map).length) {
    console.error('tabela `firms` vazia/inacessivel — abortado (nao regera com dado velho)');
    process.exit(1);
  }

  const snap = buildSnapshot(map);
  fs.writeFileSync(SNAPSHOT, JSON.stringify(snap, null, 2) + '\n', 'utf8');

  // Estado = afiliado (tabela `firms`) + conteudo (cms_firms). Qualquer um dos
  // dois mudando obriga a regerar, porque os dois aparecem na pagina.
  const conteudo = await fetchConteudo();
  const novo = {
    afiliado: hashOf(snap),
    conteudo: conteudo ? hashOf(conteudo) : null,
  };
  let antigo = {};
  if (fs.existsSync(ESTADO)) {
    try { antigo = JSON.parse(fs.readFileSync(ESTADO, 'utf8')); } catch { /* corrompido = regera */ }
  }
  fs.mkdirSync(path.dirname(ESTADO), { recursive: true });
  fs.writeFileSync(ESTADO, JSON.stringify(novo, null, 2) + '\n', 'utf8');

  console.log(`firms.json: ${snap.length} firmas`);
  console.log(`  afiliado: ${antigo.afiliado || 'ausente'} -> ${novo.afiliado}`);
  console.log(`  conteudo: ${antigo.conteudo || 'ausente'} -> ${novo.conteudo || '(sem acesso ao cms_firms)'}`);

  if (process.argv.includes('--snapshot')) return;

  // Sem conseguir ler o conteudo, regera: assumir "nada mudou" e o erro caro.
  const mudou = novo.conteudo == null
    || antigo.afiliado !== novo.afiliado
    || antigo.conteudo !== novo.conteudo;
  if (!mudou && !process.argv.includes('--force')) {
    console.log('\nTabela `firms` inalterada. Nada pra regerar. (use --force pra regerar mesmo assim)');
    return;
  }
  console.log(mudou ? '\nTabela `firms` MUDOU — regerando paginas estaticas.' : '\n--force: regerando.');

  run('node', ['scripts/build-firm-pages.mjs']);            // seo/ + <lang>/seo/
  for (const l of LANGS_COMPARE) run('node', ['scripts/build-compare-pages.mjs', l]);
  run('node', ['scripts/build-guides.js']);                 // guides/ + <lang>/guides/

  console.log('\nPronto. Rode `python3 check_pages.py` pra conferir e depois deploye.');
}

main().catch((e) => { console.error(e.message || e); process.exit(1); });
