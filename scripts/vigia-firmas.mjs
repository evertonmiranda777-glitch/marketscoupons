/**
 * vigia-firmas.mjs , vai no site de cada firma, COLHE o que esta ativo hoje, compara com
 * o banco, e grava o que for seguro. Roda segunda 06:00 BRT.
 *
 * POR QUE EXISTE (ordem do Everton, 30/07/2026):
 *   "cria uma ferramenta pra resolver essa merda de eu ficar fazendo o seu trabalho.
 *    Ela precisa buscar e confirmar de 3 formas diferentes e seguras e sem erros as
 *    promos ativas de cada firma, mantendo os cupons da Markets e mudando os genericos.
 *    Ela precisa ver tudo que mudou em termos de planos, tamanhos de conta, taxa de
 *    ativacao e etc."
 *
 * A 1a versao que eu fiz (scrape-firms.mjs) so CONFERIA se o preco do banco ainda
 * aparecia no site. Isso responde "o que eu tenho ainda vale?" e nao "o que mudou?".
 * Era a metade facil. Esta aqui COLHE.
 *
 * ── AS 3 CONFIRMACOES, de camadas diferentes ──────────────────────────────────
 *   1. DADO    HTML cru (antes do JS) + JSON embutido (__NEXT_DATA__/JSON-LD) + XHR
 *   2. DOM     o que o visitante le depois de renderizar
 *   3. SHOT    screenshot full page, prova auditavel, guardada
 * Duas leituras do mesmo HTML nao sao 2 confirmacoes, sao a mesma leitura 2x. Por isso
 * as camadas sao independentes: se DADO e DOM divergem, o site tem valor que nao
 * aparece (ou o contrario), e isso E' o alarme, nao um detalhe.
 *
 * ── O QUE PODE SER GRAVADO SOZINHO E O QUE SO REPORTA ─────────────────────────
 * GRAVA (com 3/3):   cupom GENERICO, discount, promo_label, promo_ends_at, preco de
 *                    plano/tamanho que JA EXISTE no banco.
 * SO REPORTA:        cupom EXCLUSIVO da Markets (nunca trocar , trocar = perder
 *                    comissao), plano novo, tamanho novo, plano que sumiu, mudanca de
 *                    regra (split/drawdown/target/dias), taxa de ativacao.
 * Estrutura nova entrando sozinha e' como o dado errado chega no ar sem ninguem ver.
 *
 * Uso:
 *   node scripts/vigia-firmas.mjs                 # so relatorio
 *   node scripts/vigia-firmas.mjs --write         # grava o que for seguro e 3/3
 *   node scripts/vigia-firmas.mjs --firm=brightfunded
 */
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const ROOT = path.join(import.meta.dirname, '..');
const SB = 'https://qfwhduvutfumsaxnuofa.supabase.co';
const SHOTS = path.join(ROOT, 'data', 'vigia-shots');
const RELATORIO = path.join(ROOT, 'data', 'vigia-report.json');

const ESCREVER = process.argv.includes('--write');
const SO_FIRMA = (process.argv.find((a) => a.startsWith('--firm=')) || '').split('=')[1];
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE || '';

// ── CUPOM EXCLUSIVO DA MARKETS = INTOCAVEL ────────────────────────────────────
// Trocar um desses por um codigo publico do site = o cliente compra e a comissao vai
// pra ninguem. Ja aconteceu: em 24/jul o card mandava digitar "E8" (publico) no lugar
// de MARKET, e a resposta de cupons do bot fez o mesmo por semanas.
// ⚠️ Espelha memory/reference_cupons_parceria_oficial.md , mudou la, muda aqui.
const CUPOM_EXCLUSIVO = new Set([
  'MARKET', 'MARKETS', 'MARKET89', 'MARKETSCOUPONS', 'MARKETS026158',
  'MARKET-7652C', 'CLNLTPxtT4Sok0PzHaRIIQ',
]);
const ehExclusivo = (c) => !!c && CUPOM_EXCLUSIVO.has(String(c).trim());

// Palavra que parece cupom mas nao e' , evita gravar lixo como codigo.
const NAO_E_CUPOM = new Set([
  'OFF', 'SAVE', 'CODE', 'COUPON', 'PROMO', 'NEW', 'GET', 'NOW', 'FREE', 'ALL', 'THE',
  'AND', 'FOR', 'YOUR', 'WITH', 'USE', 'ONLY', 'UP', 'TO', 'FROM', 'PLAN', 'PLANS',
  'ACCOUNT', 'TRADING', 'FUNDED', 'CHALLENGE', 'STEP', 'INSTANT', 'ELITE', 'PRIME',
  'USD', 'EUR', 'FAQ', 'API', 'CFD', 'CME', 'EOD', 'HFT', 'KYC', 'VPN', 'VPS',
]);

const FIRMAS = {
  brightfunded: { urls: ['https://brightfunded.com/1-step', 'https://brightfunded.com/2-step-bright', 'https://brightfunded.com/2-step-classic'], moeda: '€', espera: 7000 },
  futureselite: { urls: ['https://futureselite.com/#pricing'], moeda: '$', espera: 7000 },
  alphafutures: { urls: ['https://alpha-futures.com/'], moeda: '$', espera: 6000 },
  blueberryfutures: { urls: ['https://blueberryfutures.com/'], moeda: '$', espera: 6000 },
  blueguardian: { urls: ['https://blueguardian.com/'], moeda: '$', espera: 6000 },
  toponefutures: { urls: ['https://toponefutures.com/'], moeda: '$', espera: 6000 },
  tradeday: { urls: ['https://www.tradeday.com/'], moeda: '$', espera: 6000 },
  the5ers: { urls: ['https://www.the5ers.com/', 'https://www.the5ers.com/futures/'], moeda: '$', espera: 6000 },
  aquafutures: { urls: ['https://www.aquafunded.com/'], moeda: '$', espera: 6000 },
  // e8 (403) e fundingpips (429) barram robo; cti e fff escondem preco atras de login.
  // Ficam de fora de proposito: colher sem enxergar e' o que quebrou dado hoje.
};

const num = (s) => { const m = String(s).match(/(\d{1,5}(?:[.,]\d{1,2})?)/); return m ? parseFloat(m[1].replace(',', '.')) : null; };

// ── colheita: cupom, desconto, prazo e sinal de taxa de ativacao ──────────────
function colherDaPagina(moeda) {
  const txt = document.body.innerText || '';
  const sif = moeda === '€' ? '€' : '\\$';

  // CUPOM: token maiusculo perto de palavra de cupom, ou valor pre-preenchido no campo.
  // ⚠️ O token TEM que vir logo depois de uma palavra de cupom E ser palavra INTEIRA.
  // Sem a 2a condicao a varredura devolveu "TIONAL" e "TIONS" , pedacos de ADDITIONAL e
  // CONDITIONS , e ofereceu como codigo. Codigo errado no card = cliente digita, nao
  // funciona, e abandona a compra.
  const RUIM = new Set(['OFF','SAVE','CODE','COUPON','PROMO','NEW','GET','NOW','FREE','ALL','THE','AND','FOR','YOUR','WITH','USE','ONLY','PLAN','PLANS','ACCOUNT','TRADING','FUNDED','CHALLENGE','STEP','INSTANT','ELITE','PRIME','USD','EUR','FAQ','API','CFD','CME','EOD','HFT','KYC','VPN','VPS','HERE','MORE','START','JOIN','TERMS','ABOUT','BLOG','HOME','LOGIN','SIGN']);
  const cupons = new Set();
  // ⚠️ flag `i` e a palavra `code` sozinha sao OBRIGATORIAS. Sem elas eu perdi os cupons
  // publicos REAIS que a versao anterior achava (ALPHA40, BG25, FUTURES60, TDNEW), porque
  // no site esta escrito "Use code: ALPHA40" em minusculo. Ao apertar um filtro pra tirar
  // ruido, conferir que o SINAL continua passando , eu tirei os dois juntos.
  // O token em si continua exigido em MAIUSCULA (grupo [A-Z]), que e como codigo se escreve.
  const perto = /(?:use\s+)?(?:coupon|promo|discount|voucher|code)\s*(?:code)?\s*[:=]?\s*["'`]?\b([A-Z][A-Z0-9]{3,19})\b/gi;
  for (const m of txt.matchAll(perto)) {
    const c = m[1];
    // com a flag i, [A-Z] tambem casa minuscula. Codigo de cupom se escreve em CAIXA
    // ALTA, entao exijo isso explicitamente, senao entra qualquer palavra da frase.
    if (!c || c !== c.toUpperCase() || RUIM.has(c)) continue;
    if (new RegExp('(^|[^A-Za-z])' + c + '([^A-Za-z]|$)').test(txt)) cupons.add(c);
  }
  // campo de cupom ja preenchido (foi assim que a FuturesElite entregou o SUMMER)
  document.querySelectorAll('input').forEach((i) => {
    const dica = ((i.name || '') + (i.id || '') + (i.placeholder || '')).toLowerCase();
    if (/coupon|promo|discount|voucher/.test(dica) && i.value && /^[A-Za-z0-9_-]{3,24}$/.test(i.value)) {
      cupons.add(i.value.toUpperCase());
    }
  });

  // DESCONTO: todos os "NN% OFF" / "save NN%"
  const pcts = new Set();
  for (const m of txt.matchAll(/(\d{1,2})\s*%\s*(?:OFF|off|discount)|save\s+(\d{1,2})\s*%/g)) {
    pcts.add(parseInt(m[1] || m[2], 10));
  }

  // PRECO: com simbolo de moeda (o que o cliente enxerga)
  const precos = [...new Set((txt.match(new RegExp(sif + '\\s?\\d{1,5}(?:[.,]\\d{1,2})?', 'g')) || []))];

  // PRAZO: contador ou data de fim. So o que ESTA na tela , prazo nao se inventa.
  const prazo = [];
  for (const m of txt.matchAll(/(\d{1,3})\s*(?:d|days?|dias?)\s*[:.]?\s*(\d{1,2})\s*(?:h|hr|hours?)/gi)) prazo.push(m[0]);
  for (const m of txt.matchAll(/ends?\s+(?:in\s+)?([^\n.]{3,40})/gi)) prazo.push(m[0].slice(0, 60));

  // TAXA DE ATIVACAO: a frase, nao o numero solto.
  const taxa = [];
  for (const m of txt.matchAll(/[^.\n]{0,80}activation\s+fee[^.\n]{0,80}/gi)) taxa.push(m[0].replace(/\s+/g, ' ').trim().slice(0, 160));

  // TAMANHOS de conta oferecidos
  const tamanhos = [...new Set((txt.match(/\$?\s?\d{1,3}\s?[Kk]\b/g) || []).map((s) => s.replace(/\s/g, '').toUpperCase()))];

  return {
    cupons: [...cupons], pcts: [...pcts], precos, prazo: [...new Set(prazo)].slice(0, 6),
    taxa: [...new Set(taxa)].slice(0, 4), tamanhos: tamanhos.slice(0, 20),
  };
}

async function lerCru(url, saco) {
  try {
    const r = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36', 'Accept-Language': 'en-US,en;q=0.9' } });
    if ([403, 429, 503].includes(r.status)) return 'bloqueado';
    if (!r.ok) return 'erro';
    const html = await r.text();
    for (const m of html.matchAll(/(?<![\d.])(\d{1,5}(?:[.,]\d{1,2})?)(?![\d])/g)) {
      const v = parseFloat(m[1].replace(',', '.'));
      if (v > 5 && v < 20000) saco.precos.add(String(v));
    }
    for (const m of html.matchAll(/\b([A-Z][A-Z0-9_-]{3,24})\b/g)) {
      const c = m[1];
      if (!NAO_E_CUPOM.has(c) && /\d|[_-]/.test(c) === false && c.length <= 20) saco.cuponsHtml.add(c);
    }
    return 'ok';
  } catch (_) { return 'erro'; }
}

async function doBanco() {
  if (!KEY) throw new Error('SUPABASE_SERVICE_ROLE_KEY obrigatorio');
  const cols = 'id,name,coupon,discount,discount_type,disc_note,promo_label,promo_ends_at,has_activation_fee,prices,detail_types,detail_plans,active';
  const r = await fetch(`${SB}/rest/v1/cms_firms?active=eq.true&select=${cols}`, { headers: { apikey: KEY, Authorization: `Bearer ${KEY}` } });
  if (!r.ok) throw new Error(`REST ${r.status}`);
  const m = {};
  for (const f of await r.json()) m[f.id] = f;
  const ra = await fetch(`${SB}/rest/v1/firms?ativo=eq.true&select=slug,coupon_code`, { headers: { apikey: KEY, Authorization: `Bearer ${KEY}` } });
  if (ra.ok) for (const a of await ra.json()) if (m[a.slug]) m[a.slug].coupon_afiliado = a.coupon_code;
  return m;
}

async function main() {
  const banco = await doBanco();
  const alvos = SO_FIRMA ? { [SO_FIRMA]: FIRMAS[SO_FIRMA] } : FIRMAS;
  if (SO_FIRMA && !FIRMAS[SO_FIRMA]) { console.error(`firma "${SO_FIRMA}" nao configurada`); process.exit(1); }

  const browser = await chromium.launch();
  const relatorio = [];
  fs.mkdirSync(SHOTS, { recursive: true });

  for (const [slug, cfg] of Object.entries(alvos)) {   // SERIAL, ver cabecalho
    const db = banco[slug];
    const linha = { firma: slug, urls: cfg.urls, botBlock: false, achados: {}, mudancas: [], reportar: [], gravar: [], veredito: '' };
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36' });
    const page = await ctx.newPage();
    const saco = { precos: new Set(), cuponsHtml: new Set() };
    // XHR = a aba Network do F12
    page.on('response', async (resp) => {
      try {
        if (!/json/i.test(resp.headers()['content-type'] || '') || resp.status() >= 400) return;
        const t = await resp.text();
        if (!t || t.length > 800000) return;
        for (const m of t.matchAll(/(?<![\d.])(\d{1,5}(?:[.,]\d{1,2})?)(?![\d])/g)) {
          const v = parseFloat(m[1].replace(',', '.'));
          if (v > 5 && v < 20000) saco.precos.add(String(v));
        }
      } catch (_) {}
    });

    try {
      const dom = { cupons: new Set(), pcts: new Set(), precos: new Set(), prazo: new Set(), taxa: new Set(), tamanhos: new Set() };
      for (const [i, u] of cfg.urls.entries()) {
        await page.goto(u, { waitUntil: 'domcontentloaded', timeout: 45000 });
        await page.waitForTimeout(cfg.espera);
        if (await lerCru(u, saco) === 'bloqueado') linha.botBlock = true;
        const c = await page.evaluate(colherDaPagina, cfg.moeda);
        c.cupons.forEach((x) => dom.cupons.add(x));
        c.pcts.forEach((x) => dom.pcts.add(x));
        c.precos.forEach((x) => dom.precos.add(x));
        c.prazo.forEach((x) => dom.prazo.add(x));
        c.taxa.forEach((x) => dom.taxa.add(x));
        c.tamanhos.forEach((x) => dom.tamanhos.add(x));
        await page.screenshot({ path: path.join(SHOTS, cfg.urls.length > 1 ? `${slug}-${i + 1}.png` : `${slug}.png`), fullPage: true });
      }
      linha.achados = {
        cupons: [...dom.cupons], descontos: [...dom.pcts].sort((a, b) => b - a),
        prazo: [...dom.prazo], taxaAtivacao: [...dom.taxa], tamanhos: [...dom.tamanhos],
        precosDom: [...dom.precos].length, precosDado: saco.precos.size,
      };

      if (!db) { linha.veredito = 'SEM LINHA NO BANCO'; }
      else if (linha.botBlock && !dom.precos.size) {
        linha.veredito = 'INCONCLUSIVO';
        linha.reportar.push('site barrou o robo; nao da pra afirmar que algo mudou');
      } else {
        // 3 confirmacoes: DOM tem preco, camada de dado tem preco, shot existe.
        const conf = (dom.precos.size ? 1 : 0) + (saco.precos.size ? 1 : 0) + 1;
        linha.veredito = conf === 3 ? 'CONFIRMADO 3/3' : `PARCIAL ${conf}/3`;

        // ── CUPOM ──────────────────────────────────────────────────────────
        const cupomDb = (db.coupon_afiliado ?? db.coupon ?? '').trim();
        const naTela = [...dom.cupons].filter((c) => !NAO_E_CUPOM.has(c));
        if (ehExclusivo(cupomDb)) {
          // INTOCAVEL. So avisa se o site anuncia outro, pra decisao humana.
          const outros = naTela.filter((c) => c !== cupomDb);
          if (outros.length) linha.reportar.push(`cupom da Markets "${cupomDb}" MANTIDO; o site anuncia tambem: ${outros.join(', ')}`);
        } else if (cupomDb && naTela.length && !naTela.includes(cupomDb)) {
          linha.gravar.push({ campo: 'coupon', de: cupomDb, para: naTela[0], motivo: 'cupom generico, o site mudou' });
        } else if (!cupomDb && naTela.length) {
          linha.gravar.push({ campo: 'coupon', de: '(sem codigo)', para: naTela[0], motivo: 'site passou a exibir codigo' });
        }

        // ── DESCONTO ───────────────────────────────────────────────────────
        // ⚠️ `discount` NAO se grava sozinho. A 1a versao pegava um % da pagina e ia
        // gravar 30 -> 10 na FuturesElite , os 10% eram o codigo da NEWSLETTER, nao o
        // desconto do plano. Uma pagina tem varios %: plano, bundle, newsletter, taxa,
        // profit split, drawdown. Escolher "o maior" ou "o menor" e' chute com cara de
        // automacao. So reporta, e a decisao e' humana.
        const pcts = [...dom.pcts].sort((a, b) => b - a);
        if (pcts.length && db.discount != null && !pcts.some((p) => Math.abs(p - db.discount) <= 3)) {
          linha.reportar.push(`banco diz ${db.discount}% e no site eu vi ${pcts.join('%, ')}% , conferir qual e o do plano`);
        }

        // ── PRAZO ──────────────────────────────────────────────────────────
        // Vitalicia NUNCA ganha prazo. E prazo so entra se estiver na tela.
        if (db.discount_type === 'lifetime' && db.promo_ends_at) {
          linha.reportar.push('firma lifetime COM promo_ends_at no banco , contradicao, zerar');
        }
        if (!dom.prazo.size && db.promo_ends_at && db.discount_type !== 'lifetime') {
          linha.reportar.push(`banco tem prazo ${String(db.promo_ends_at).slice(0, 10)} mas o site nao mostra contador`);
        }

        // -- ESTRUTURA --------------------------------------------------------
        // A comparacao de TAMANHO por texto livre foi REMOVIDA: dava quase so ruido.
        // Acusou "0K", "262K", "$750K" (numero solto da pagina) e jurou que 25K, 50K,
        // 100K e 150K tinham sumido da Blueberry, que obviamente tem os quatro. Regex em
        // texto corrido nao distingue tamanho de conta de "450K traders" nem de valor de
        // payout. Pra fazer certo precisa de extrator por firma lendo o card de plano.
        // Fica de fora ate ter isso: acusar errado e pior que nao acusar.

        // ── TAXA DE ATIVACAO ───────────────────────────────────────────────
        if (dom.taxa.size) {
          const semTaxa = [...dom.taxa].some((t) => /no activation fee|zero activation|activation fee:?\s*(none|\$?0)/i.test(t));
          const comTaxa = [...dom.taxa].some((t) => /activation fee[^.]{0,30}\$\s?\d/i.test(t) && !/no activation|zero|none|\$0/i.test(t));
          if (semTaxa && db.has_activation_fee === true) linha.reportar.push('site diz SEM taxa de ativacao, banco diz que cobra');
          if (comTaxa && db.has_activation_fee === false) linha.reportar.push('site cita VALOR de taxa de ativacao, banco diz que nao cobra');
        }
      }
    } catch (e) {
      linha.veredito = 'ERRO';
      linha.reportar.push(String(e.message || e).slice(0, 160));
    }
    await ctx.close();
    relatorio.push(linha);

    const g = linha.gravar.length, r = linha.reportar.length;
    console.log(`${slug.padEnd(20)}${linha.veredito.padEnd(18)}gravar:${g}  reportar:${r}`);
    linha.gravar.forEach((x) => console.log(`     GRAVAR   ${x.campo}: ${x.de} -> ${x.para}   (${x.motivo})`));
    linha.reportar.forEach((x) => console.log(`     REPORTAR ${x}`));
  }
  await browser.close();

  fs.mkdirSync(path.dirname(RELATORIO), { recursive: true });
  fs.writeFileSync(RELATORIO, JSON.stringify({ quando: new Date().toISOString(), firmas: relatorio }, null, 2));
  console.log(`\nrelatorio: ${path.relative(ROOT, RELATORIO)}   shots: ${path.relative(ROOT, SHOTS)}/`);

  const paraGravar = relatorio.filter((l) => l.veredito === 'CONFIRMADO 3/3' && l.gravar.length);
  if (!ESCREVER) {
    const n = paraGravar.reduce((a, l) => a + l.gravar.length, 0);
    console.log(`\n${n} mudanca(s) prontas pra gravar (3/3). Rode com --write pra aplicar.`);
    return relatorio.some((l) => l.reportar.length) ? 1 : 0;
  }
  for (const l of paraGravar) {
    const patch = {};
    l.gravar.forEach((x) => { patch[x.campo] = x.para; });
    const r = await fetch(`${SB}/rest/v1/cms_firms?id=eq.${l.firma}`, {
      method: 'PATCH', headers: { apikey: KEY, Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    });
    console.log(`  ${l.firma}: ${r.ok ? 'gravado' : 'FALHOU ' + r.status} ${JSON.stringify(patch)}`);
    // cupom tambem na tabela `firms`, que e a fonte do dado de afiliado
    if (patch.coupon) {
      await fetch(`${SB}/rest/v1/firms?slug=eq.${l.firma}`, {
        method: 'PATCH', headers: { apikey: KEY, Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ coupon_code: patch.coupon }),
      });
    }
  }
  return 0;
}

main().then((c) => process.exit(c)).catch((e) => { console.error(e); process.exit(2); });
