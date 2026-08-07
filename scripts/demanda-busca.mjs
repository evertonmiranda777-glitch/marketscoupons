#!/usr/bin/env node
/**
 * demanda-busca.mjs , o que as pessoas REALMENTE digitam sobre prop firm.
 *
 * POR QUE EXISTE: o Search Console so mostra as buscas em que JA aparecemos. Pra
 * saber o que existe de demanda la fora (inclusive o que nao alcancamos), uso o
 * autocomplete do Google , a mesma fonte que alimenta a caixa de sugestao. E
 * publico, gratuito, sem chave, e reflete busca real por pais e idioma.
 *
 *   node scripts/demanda-busca.mjs            -> EUA / ingles
 *   node scripts/demanda-busca.mjs de de      -> Alemanha / alemao
 *
 * ⚠️ NAO E VOLUME. O autocomplete diz o que se busca e em que ordem de
 * popularidade relativa, nunca quantas vezes por mes. Nao apresentar como volume.
 */
const PAIS = (process.argv[2] || 'us').toLowerCase();
const IDIOMA = (process.argv[3] || 'en').toLowerCase();

// sementes: o vocabulario do nicho + os modificadores que revelam intencao
const SEMENTES = [
  'prop firm', 'prop firms', 'futures prop firm', 'best prop firm',
  'prop firm coupon', 'prop firm discount', 'prop trading firm',
  'apex trader funding', 'funded account', 'prop firm challenge',
];
const SUFIXOS = 'abcdefghijklmnopqrstuvwxyz'.split('');
const PERGUNTAS = ['how', 'what', 'which', 'why', 'is', 'are', 'can', 'does', 'best', 'cheapest', 'top'];

const dorme = (ms) => new Promise((r) => setTimeout(r, ms));

async function sugestoes(q) {
  const url = 'https://suggestqueries.google.com/complete/search?client=firefox'
    + `&hl=${IDIOMA}&gl=${PAIS}&q=${encodeURIComponent(q)}`;
  try {
    const r = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    if (!r.ok) return [];
    const t = await r.text();
    const j = JSON.parse(t);
    return Array.isArray(j) && Array.isArray(j[1]) ? j[1] : [];
  } catch (e) { return []; }
}

const vistos = new Map();   // termo -> posicao media na sugestao (proxy de popularidade)
function registra(lista) {
  lista.forEach((termo, i) => {
    const t = String(termo).toLowerCase().trim();
    if (!t || t.length < 6) return;
    const a = vistos.get(t) || { n: 0, soma: 0 };
    a.n++; a.soma += i;
    vistos.set(t, a);
  });
}

const consultas = [];
for (const s of SEMENTES) {
  consultas.push(s);
  for (const c of SUFIXOS) consultas.push(s + ' ' + c);
}
for (const p of PERGUNTAS) consultas.push(p + ' prop firm');

console.error(`consultando ${consultas.length} variacoes (${PAIS}/${IDIOMA})...`);
let feitas = 0;
for (const q of consultas) {
  registra(await sugestoes(q));
  if (++feitas % 40 === 0) console.error(`  ${feitas}/${consultas.length}`);
  await dorme(90);   // educado com o endpoint
}

// ── agrupa por intencao ──────────────────────────────────────────────────────
const GRUPOS = [
  ['melhor / ranking', /\b(best|top|ranking|rated|leading)\b/],
  ['comparacao', /\b(vs|versus|compare|comparison|or)\b/],
  ['preco / barato', /\b(cheap|cheapest|price|pricing|cost|affordable)\b/],
  ['cupom / desconto', /\b(coupon|discount|promo|code|deal|off)\b/],
  ['review / confiavel', /\b(review|reviews|legit|scam|trustworthy|safe|reliable)\b/],
  ['como funciona', /\b(how|what is|what are|explained|guide|work|works)\b/],
  ['regra / payout', /\b(payout|withdraw|rule|rules|drawdown|split|evaluation|challenge)\b/],
  ['pais / acesso', /\b(usa|us|america|india|brazil|uk|canada|accepted|allowed)\b/],
];
const grupo = (t) => (GRUPOS.find(([, re]) => re.test(t)) || ['outros'])[0];

const lista = [...vistos.entries()]
  .map(([t, a]) => ({ termo: t, vezes: a.n, pos: a.soma / a.n, g: grupo(t) }))
  .sort((x, y) => y.vezes - x.vezes || x.pos - y.pos);

console.log(`\nDEMANDA DE BUSCA , ${PAIS.toUpperCase()} / ${IDIOMA} , ${lista.length} termos distintos`);
console.log('⚠️ autocomplete do Google: mostra O QUE se busca e a ordem relativa, NAO volume.');
console.log('='.repeat(70));

const porGrupo = {};
lista.forEach((x) => { (porGrupo[x.g] = porGrupo[x.g] || []).push(x); });
for (const [nome] of GRUPOS.concat([['outros']])) {
  const arr = porGrupo[nome];
  if (!arr || !arr.length) continue;
  console.log(`\n── ${nome.toUpperCase()}  (${arr.length} termos)`);
  arr.slice(0, 12).forEach((x) => {
    console.log('   ' + x.termo.slice(0, 52).padEnd(54) + 'aparece ' + String(x.vezes).padStart(3) + 'x');
  });
}
console.log();
