// build-compat.mjs — transpila optional chaining (?.) e nullish (??) pra ES2019
// in-place, preservando comentarios. Motivo: WebView velho (Instagram Android <2020)
// nao entende ?. e falha ao parsear o app.js INTEIRO = site em branco pra esse aparelho
// (trafego pago Instagram/India cai em pagina branca). Rodar ANTES do deploy se algum
// desses arquivos ganhar ?. novo. Idempotente (rodar 2x nao muda nada).
import { createRequire } from 'module';
import fs from 'fs';
const require = createRequire(import.meta.url);
const babel = require('@babel/core');

// TODOS os .js servidos ao browser (o script pula sozinho os que ja estao limpos).
// Cobrir tudo = qualquer arquivo que ganhar ?. no futuro e convertido sem eu lembrar.
const FILES = [
  'app.js', 'tracking.js', 'js/polyfills.js',
  'js/pwa-register.js', 'js/reviews.js', 'js/tracking-init.js',
  'js/giveaway-popup.js', 'js/onboarding.js', 'js/tickets.js',
  'js/lang-dd-fix.js', 'js/og-lang.js', 'js/page-boot.js', 'js/promo-topbar-fit.js',
];
const plugins = [
  '@babel/plugin-transform-optional-chaining',
  '@babel/plugin-transform-nullish-coalescing-operator',
];

let changed = 0;
for (const f of FILES) {
  const src = fs.readFileSync(f, 'utf8');
  if (!/\?\.|\?\?/.test(src)) { console.log(`${f}: ja limpo`); continue; }
  const out = babel.transformSync(src, {
    plugins,
    comments: true,
    retainLines: true,
    compact: false,
    babelrc: false,
    configFile: false,
    sourceType: 'script',
  });
  fs.writeFileSync(f, out.code);
  const left = (out.code.match(/\?\.|\?\?/g) || []).length;
  console.log(`${f}: transpilado (${left} restantes)`);
  changed++;
}
console.log(`\n${changed} arquivo(s) alterado(s).`);
