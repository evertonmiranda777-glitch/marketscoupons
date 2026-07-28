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

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const SNAPSHOT = path.join(ROOT, 'firms.json');
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
  const novo = hashOf(snap);
  let antigo = null;
  if (fs.existsSync(SNAPSHOT)) {
    try { antigo = hashOf(JSON.parse(fs.readFileSync(SNAPSHOT, 'utf8'))); } catch { /* snapshot corrompido = regera */ }
  }

  fs.writeFileSync(SNAPSHOT, JSON.stringify(snap, null, 2) + '\n', 'utf8');
  console.log(`firms.json: ${snap.length} firmas | hash ${antigo || 'ausente'} -> ${novo}`);

  if (process.argv.includes('--snapshot')) return;

  const mudou = antigo !== novo;
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
