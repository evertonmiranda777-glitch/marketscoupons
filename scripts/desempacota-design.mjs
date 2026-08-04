#!/usr/bin/env node
/**
 * Desempacota um HTML exportado pelo Claude Design numa pasta servivel.
 *
 * O que o Design entrega NAO e um site: e uma casca com (1) o HTML real como string JSON,
 * (2) um mapa de assets em base64 numa unica linha e (3) dependencias apontando pra unpkg.
 * Aberto direto no navegador funciona; publicado, nao , tela branca sem JS e a CDN externa
 * barrada pelo CSP.
 *
 * ⚠️ O CAMPO `compressed` DO MAPA DE ASSETS E OBRIGATORIO. 7 dos 28 arquivos do site vinham
 * GZIPADOS. Na primeira vez eu gravei o gzip cru: todo o JS ficou ilegivel e a pagina foi
 * pro ar com 446 placeholders {{ }} na cara do usuario. Descomprimir ANTES de gravar.
 *
 * Uso:  node scripts/desempacota-design.mjs <arquivo.html> <pasta-destino> <prefixo-url>
 * Ex.:  node scripts/desempacota-design.mjs Rebrand/.../lp-markets-coupons.html novo-lp /novo-lp
 */
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

const [, , ARQ, DEST, PREFIXO_ARG] = process.argv;
if (!ARQ || !DEST || !PREFIXO_ARG) {
  console.error('uso: node scripts/desempacota-design.mjs <arquivo.html> <pasta> <prefixo-url>');
  process.exit(1);
}

// ⚠️ GIT BASH NO WINDOWS TRADUZ ARGUMENTO QUE COMECA COM "/" EM CAMINHO DE DISCO.
// Passei "/novo-lp" e o shell entregou "C:/Program Files/Git/novo-lp" , a LP inteira foi
// pro ar apontando pro disco local, com 49 erros de "Not allowed to load local resource".
// Rodar com MSYS_NO_PATHCONV=1 resolve na origem; esta guarda conserta se alguem esquecer.
const PREFIXO = (() => {
  let p = PREFIXO_ARG.replace(/\\/g, '/');
  const m = p.match(/^[A-Za-z]:\/.*?\/([^/]+)$/);          // "C:/Program Files/Git/novo-lp"
  if (m) {
    console.warn(`aviso: o shell converteu o prefixo em caminho de disco; usando "/${m[1]}"`);
    p = '/' + m[1];
  }
  return p.startsWith('/') ? p : '/' + p;
})();

const EXT = {
  'image/webp': 'webp', 'image/png': 'png', 'image/jpeg': 'jpg', 'image/svg+xml': 'svg',
  'image/gif': 'gif', 'text/javascript': 'js', 'application/javascript': 'js',
  'text/css': 'css', 'text/jsx': 'jsx', 'font/woff2': 'woff2', 'font/woff': 'woff',
  'font/ttf': 'ttf', 'font/otf': 'otf',
};

const linhas = fs.readFileSync(ARQ, 'utf8').split('\n');
let assets = null, html = null;

for (const l of linhas) {
  const t = l.trim().replace(/,$/, '');
  if (!assets && t.startsWith('{"') && t.slice(0, 400).includes('"mime"')) {
    try { assets = JSON.parse(t); } catch { /* linha nao era o mapa */ }
  }
  if (!html && /^"<!doctype html>/i.test(t)) {
    try { html = JSON.parse(t); } catch { /* idem */ }
  }
  if (assets && html) break;
}
if (!html) { console.error('ERRO: nao achei o HTML real dentro do pacote'); process.exit(1); }

// ⚠️ Este apagao ja me custou 11 imagens no ar (04/08): as logos das firmas, os icones da
// aba e o fundo do auth NAO vem no pacote do Design , foram postas depois, a mao, e estao
// commitadas. Rodar o desempacotador levava as tres pastas junto e a home ia pro ar com
// 404 em toda logo. Agora elas sao guardadas antes e devolvidas depois.
const PRESERVAR = ['assets/logos', 'assets/icons', 'assets/auth'];
const guardado = {};
for (const rel of PRESERVAR) {
  const p = path.join(DEST, rel);
  if (fs.existsSync(p)) guardado[rel] = fs.readdirSync(p).map(f => ({ f, buf: fs.readFileSync(path.join(p, f)) }));
}

fs.rmSync(DEST, { recursive: true, force: true });
fs.mkdirSync(path.join(DEST, 'assets'), { recursive: true });

for (const [rel, arqs] of Object.entries(guardado)) {
  const p = path.join(DEST, rel);
  fs.mkdirSync(p, { recursive: true });
  for (const a of arqs) fs.writeFileSync(path.join(p, a.f), a.buf);
  console.log(`preservado: ${rel} (${arqs.length} arquivos , nao vem do Design)`);
}

const mapa = {};
let gzipados = 0;
for (const [uuid, v] of Object.entries(assets || {})) {
  let raw = Buffer.from(v.data || '', 'base64');
  if (v.compressed) { raw = zlib.gunzipSync(raw); gzipados++; }   // <-- o passo que eu esqueci
  const ext = EXT[v.mime] || String(v.mime || 'bin').split('/').pop();
  const nome = `${uuid}.${ext}`;
  mapa[uuid] = nome;
  fs.writeFileSync(path.join(DEST, 'assets', nome), raw);
}

// UUID -> caminho real, em atributo e dentro de url() do CSS
let n = 0;
const UUID = '[0-9a-f]{8}-[0-9a-f-]{27,}';
html = html.replace(new RegExp(`\\b(src|href)="(${UUID})"`, 'g'),
  (m, attr, u) => (mapa[u] ? (n++, `${attr}="${PREFIXO}/assets/${mapa[u]}"`) : m));
html = html.replace(new RegExp(`url\\(["']?(${UUID})["']?\\)`, 'g'),
  (m, u) => (mapa[u] ? (n++, `url("${PREFIXO}/assets/${mapa[u]}")`) : m));
// x-import usa "<uuid>#/arquivo.jsx" e o runtime busca isso na RAIZ do dominio -> 404
html = html.replace(new RegExp(`"(${UUID})#/[^"]+"`, 'g'),
  (m, u) => (mapa[u] ? (n++, `"${PREFIXO}/assets/${mapa[u]}"`) : m));
// caminhos de logo que o layout espera na raiz
html = html.replace(/(["'/])assets\/logos\//g, `$1${PREFIXO.replace(/^\//, '')}/assets/logos/`)
           .replace(new RegExp(`(["'])${PREFIXO}${PREFIXO}/`, 'g'), `$1${PREFIXO}/`);

fs.writeFileSync(path.join(DEST, 'index.html'), html);
console.log(`${Object.keys(mapa).length} assets (${gzipados} vinham gzipados) · ${n} referencias reescritas · ${DEST}/index.html`);
