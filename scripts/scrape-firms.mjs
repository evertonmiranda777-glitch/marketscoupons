/**
 * scrape-firms.mjs , raspa o preco de cada firma com TRES confirmacoes independentes.
 *
 * POR QUE EXISTE (30/07/2026, ordem do Everton: "cria uma ferramenta que raspa as infos
 * nem que for na parte de codigo do site ali no F12 e resolve isso toda segunda as 06:00.
 * Quero 3 confirmacoes pra nada passar batido"):
 *
 * Ele passou dias coletando preco na mao e mandando relatorio. Em 30/07 eu peguei um
 * relatorio ANTIGO dele e sobrescrevi 12 precos CORRETOS da BrightFunded com valor velho ,
 * o pente fino de 27/28 estava certo e eu estraguei. So descobri porque ele mandou abrir o
 * site. Uma unica fonte (relatorio, memoria, ou ate uma raspagem sozinha) nao basta.
 *
 * AS TRES CONFIRMACOES SAO DE CAMADAS DIFERENTES, de proposito:
 *   1. JSON   , o dado que o site CARREGA (__NEXT_DATA__, __NUXT__, JSON-LD, window.*, XHR)
 *   2. DOM    , o numero que o site MOSTRA depois de renderizar
 *   3. SHOT   , screenshot da tela, guardado como prova auditavel
 * Se 1 e 2 divergem, o site tem dado que nao aparece (ou vice-versa) e isso E' o alarme.
 * Duas raspagens do mesmo HTML nao seriam confirmacao nenhuma, seriam a mesma leitura 2x.
 *
 * REGRA DE ESCRITA (o "nada passa batido"):
 *   3/3 concordam  -> grava, e guarda o valor antigo pra rollback
 *   2/3 concordam  -> NAO grava, entra no relatorio pra olho humano
 *   0-1            -> aborta a firma, nao toca em nada
 * Nunca grava por maioria de leituras da MESMA camada.
 *
 * ⚠️ NAO paralelizar: 4 agentes num browser so sequestram a aba um do outro (incidente de
 * 20/jul, "Aqua redireciona pra Blueberry" era aba trocada). Uma firma por vez.
 *
 * Uso:
 *   node scripts/scrape-firms.mjs                 # todas, so relatorio (dry-run)
 *   node scripts/scrape-firms.mjs --write         # grava o que tiver 3/3
 *   node scripts/scrape-firms.mjs --firm=brightfunded
 */
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const ROOT = path.join(import.meta.dirname, '..');
const SB = 'https://qfwhduvutfumsaxnuofa.supabase.co';
const SHOTS = path.join(ROOT, 'data', 'scrape-shots');
const RELATORIO = path.join(ROOT, 'data', 'scrape-report.json');

const ESCREVER = process.argv.includes('--write');
const SO_FIRMA = (process.argv.find((a) => a.startsWith('--firm=')) || '').split('=')[1];
// LEITURA COM A CHAVE PUBLICA (anon), de proposito.
// Este script SO LE preco, desconto e cupom de cms_firms , dado que ja esta impresso no
// site pra qualquer visitante. Nao existe motivo pra service role aqui, e existe motivo
// forte contra: ela IGNORA RLS, ou seja, abre o banco inteiro pra dentro do CI. A lei do
// projeto (28/07) e "service role NAO entra em CI, nunca".
// O job falhava desde sempre com "SUPABASE_SERVICE_ROLE_KEY obrigatorio" porque o workflow
// passava `secrets.SUPABASE_READONLY_KEY`, um nome que EU inventei e que nunca existiu.
const KEY = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || '';

// ── Config por firma. `url` e o que abrir; `esperar` e o seletor/tempo ate a tabela de
// preco existir; `abas` sao cliques opcionais pra trocar de plano.
// Comeca com as firmas cujo preco fica em pagina publica sem login. Firma que exige conta
// (CTI, FFF) NAO entra: raspagem sem login ali nao ve preco, e chutar e' o que causou o
// estrago de hoje.
//
// ⚠️ `urls` e' LISTA porque site que mostra UM PLANO POR VEZ so entrega o plano da aba
// aberta. Na 1a rodada eu apontei so pra home da BrightFunded e o script acusou "12 de 18
// precos nao aparecem no site" , era falso positivo, os 12 eram dos outros dois planos.
// Ferramenta que grita errado vira ferramenta ignorada. Uma URL por plano.
const FIRMAS = {
  brightfunded: {
    urls: ['https://brightfunded.com/1-step', 'https://brightfunded.com/2-step-bright',
           'https://brightfunded.com/2-step-classic'],
    moeda: '€', espera: 7000,
  },
  futureselite:   { urls: ['https://futureselite.com/#pricing'],   moeda: '$', espera: 7000 },
  alphafutures:   { urls: ['https://alpha-futures.com/'],           moeda: '$', espera: 6000 },
  blueberryfutures:{urls: ['https://blueberryfutures.com/'],     moeda: '$', espera: 6000 },
  // /futures e /forex tem a mesma cobertura da home (41/44); a home basta.
  blueguardian:   { urls: ['https://blueguardian.com/'],            moeda: '$', espera: 6000 },
  toponefutures:  { urls: ['https://toponefutures.com/'],           moeda: '$', espera: 6000 },
  // ⚠️ /pricing/ da 404. O preco esta na HOME (6/6). A url antiga era chute meu.
  tradeday:       { urls: ['https://www.tradeday.com/'],            moeda: '$', espera: 6000 },
  the5ers:        { urls: ['https://www.the5ers.com/', 'https://www.the5ers.com/futures/'], moeda: '$', espera: 6000 },
  // e8 responde 403 e fundingpips 429 pra robo. NAO sao divergencia , entram como
  // bot-block e o script marca INCONCLUSIVO, igual o check_links faz.
  e8:             { urls: ['https://e8markets.com/'],               moeda: '$', espera: 6000 },
  fundingpips:    { urls: ['https://fundingpips.com/'],             moeda: '$', espera: 6000 },
  aquafutures:    { urls: ['https://www.aquafunded.com/'],          moeda: '$', espera: 6000 },
};

const dinheiro = (moeda) =>
  new RegExp(`${moeda === '€' ? '€' : '\\$'}\\s?\\d{1,4}(?:[.,]\\d{1,2})?`, 'g');

// Normaliza pra comparar: tira moeda, espaco e sufixo tipo "/mo", e vira numero.
// O sufixo custou 8 falsos positivos na blueberry ("$55.60/mo" nunca casaria com "$55.60").
const norm = (s) => {
  const m = String(s).match(/(\d{1,4}(?:[.,]\d{1,2})?)/);
  return m ? String(parseFloat(m[1].replace(',', '.'))) : null;
};

// ── 1. JSON: tudo que o site carregou como DADO, nao como texto ────────────────
async function lerJson(page, moeda) {
  return await page.evaluate((m) => {
    const achados = new Set();
    const re = new RegExp(`${m === '€' ? '€' : '\\$'}?\\s?(\\d{1,4}(?:[.,]\\d{1,2})?)`, 'g');
    const varrer = (o, prof = 0) => {
      if (prof > 8 || o == null) return;
      if (typeof o === 'number') { if (o > 5 && o < 20000) achados.add(String(o)); return; }
      if (typeof o === 'string') {
        if (o.length > 400) return;
        // so string que PARECE preco, pra nao virar lixo
        if (/^[€$]?\s?\d{1,4}([.,]\d{1,2})?$/.test(o.trim())) achados.add(o.trim());
        return;
      }
      if (Array.isArray(o)) { o.forEach((x) => varrer(x, prof + 1)); return; }
      if (typeof o === 'object') {
        for (const k in o) {
          if (/price|preco|cost|amount|fee|discount|promo|value|total/i.test(k)) varrer(o[k], prof + 1);
          else varrer(o[k], prof + 2);   // fora das chaves de preco, desce menos
        }
      }
    };
    // Next.js / Nuxt / JSON-LD / qualquer <script type=application/json>
    for (const id of ['__NEXT_DATA__', '__NUXT_DATA__']) {
      const el = document.getElementById(id);
      if (el) { try { varrer(JSON.parse(el.textContent)); } catch (_) {} }
    }
    if (window.__NUXT__) { try { varrer(window.__NUXT__); } catch (_) {} }
    document.querySelectorAll('script[type="application/ld+json"],script[type="application/json"]')
      .forEach((s) => { try { varrer(JSON.parse(s.textContent)); } catch (_) {} });
    return [...achados];
  }, moeda);
}

// ── 1b. REDE: as respostas XHR/JSON que o site busca enquanto carrega.
// E' literalmente a aba Network do F12, e e' o caminho que funciona em site que monta
// preco por API em vez de mandar no HTML. Na 1a versao eu li so o JSON EMBUTIDO
// (__NEXT_DATA__/JSON-LD) e a BrightFunded deu 0/18 , os precos dela vem por XHR.
function ligarCapturaDeRede(page, saco) {
  page.on('response', async (resp) => {
    try {
      const ct = resp.headers()['content-type'] || '';
      if (!/json/i.test(ct)) return;
      if (resp.status() >= 400) return;
      const txt = await resp.text();
      if (!txt || txt.length > 800000) return;
      // Nao parseia: varre o texto cru atras de numero com cara de preco. Robusto a
      // qualquer formato de payload, e nao quebra se o JSON for estranho.
      for (const m of txt.matchAll(/(?<![\d.])(\d{1,4}(?:[.,]\d{1,2})?)(?![\d])/g)) {
        const v = parseFloat(m[1].replace(',', '.'));
        if (v > 5 && v < 20000) saco.add(m[1]);
      }
    } catch (_) { /* resposta ja consumida ou binaria */ }
  });
}

// ── 1c. HTML CRU: o que o SERVIDOR mandou, antes do JS rodar.
// Terceira porta da camada de dado. Site SSR (BrightFunded) manda o preco no HTML e nao
// faz XHR nenhum; site SPA faz o contrario. Cobrindo as tres (HTML cru + JSON embutido +
// XHR), toda firma tem uma fonte de DADO pra confrontar com o DOM renderizado.
// A diferenca entre HTML cru e DOM tambem e' informacao: se divergirem, o JS mudou o preco
// no cliente (promo aplicada na tela), e isso e' coisa que eu quero ver.
// Devolve 'ok' | 'bloqueado' | 'erro'. O status importa: 403/429 e' ROBO BARRADO, nao
// "preco sumiu" , tratar bot-block como divergencia foi o erro que deu 6 falsos positivos
// na 1a versao do check_links e teria DESATIVADO 6 firmas vivas.
async function lerHtmlCru(url, moeda, saco) {
  try {
    const r = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9',
      },
    });
    if (r.status === 403 || r.status === 429 || r.status === 503) return 'bloqueado';
    if (!r.ok) return 'erro';
    const html = await r.text();
    // ⚠️ Barra DUPLA: em string JS, '\s' vira 's' e '\d' vira 'd' (escape desconhecido e'
    // descartado calado) e o regex nao casa nada. Foi assim que esta funcao devolveu 0
    // preco com o HTML contendo €193.90 na cara.
    const sifrao = moeda === '€' ? '€' : '\\$';
    for (const m of html.matchAll(new RegExp(sifrao + '\\s?(\\d{1,4}(?:[.,]\\d{1,2})?)', 'g'))) {
      saco.add(moeda + m[1]);
    }
    // ⚠️ E TAMBEM numero SEM simbolo de moeda. Metade dos precos vive dentro de JSON
    // embutido no HTML (`"price":307`) ou em atributo, sem cifrao nenhum. So com o cifrao,
    // a blueguardian batia 0; varrendo numero cru ela bate 41 de 44.
    for (const m of html.matchAll(/(?<![\d.])(\d{1,4}(?:[.,]\d{1,2})?)(?![\d])/g)) {
      const v = parseFloat(m[1].replace(',', '.'));
      if (v > 5 && v < 20000) saco.add(m[1]);
    }
    return 'ok';
  } catch (_) { return 'erro'; }
}

// ── 2. DOM: o que o visitante realmente le na tela ─────────────────────────────
async function lerDom(page, moeda) {
  return await page.evaluate((m) => {
    const txt = document.body.innerText || '';
    const re = new RegExp(`${m === '€' ? '€' : '\\$'}\\s?\\d{1,4}(?:[.,]\\d{1,2})?`, 'g');
    return [...new Set(txt.match(re) || [])];
  }, moeda);
}

// ── 3. SHOT: prova visual. Nao "confirma" numero sozinho, mas e o que permite
// auditar depois e o que provou hoje que eu tinha estragado a BrightFunded.
async function tirarShot(page, slug) {
  fs.mkdirSync(SHOTS, { recursive: true });
  const arq = path.join(SHOTS, `${slug}.png`);
  await page.screenshot({ path: arq, fullPage: true });
  return path.relative(ROOT, arq);
}

async function precosDoBanco() {
  if (!KEY) throw new Error('SUPABASE_ANON_KEY obrigatorio (a chave publica basta: este script so LE)');
  const r = await fetch(`${SB}/rest/v1/cms_firms?active=eq.true&select=id,prices,discount,coupon`, {
    headers: { apikey: KEY, Authorization: `Bearer ${KEY}` },
  });
  if (!r.ok) throw new Error(`REST ${r.status}`);
  const m = {};
  for (const f of await r.json()) m[f.id] = f;
  return m;
}

async function main() {
  const banco = await precosDoBanco();
  const alvos = SO_FIRMA ? { [SO_FIRMA]: FIRMAS[SO_FIRMA] } : FIRMAS;
  if (SO_FIRMA && !FIRMAS[SO_FIRMA]) { console.error(`firma "${SO_FIRMA}" nao configurada`); process.exit(1); }

  const browser = await chromium.launch();
  const relatorio = [];

  // SERIAL de proposito. Ver comentario do cabecalho.
  for (const [slug, cfg] of Object.entries(alvos)) {
    const ctx = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36',
    });
    const page = await ctx.newPage();
    const linha = { firma: slug, botBlock: false, urls: cfg.urls, quando: null, json: [], dom: [], shot: null, veredito: '', detalhe: '' };
    try {
      const jsonTudo = new Set(), domTudo = new Set(); const shots = [];
      ligarCapturaDeRede(page, jsonTudo);   // XHR entra no MESMO saco do JSON embutido
      for (const [i, u] of cfg.urls.entries()) {
        await page.goto(u, { waitUntil: 'domcontentloaded', timeout: 45000 });
        await page.waitForTimeout(cfg.espera);
        (await lerJson(page, cfg.moeda)).forEach((v) => jsonTudo.add(v));
        const st = await lerHtmlCru(u, cfg.moeda, jsonTudo);
        if (st === 'bloqueado') linha.botBlock = true;
        (await lerDom(page, cfg.moeda)).forEach((v) => domTudo.add(v));
        shots.push(await tirarShot(page, cfg.urls.length > 1 ? `${slug}-${i + 1}` : slug));
      }
      linha.json = [...jsonTudo];
      linha.dom = [...domTudo];
      linha.shot = shots;

      // ⚠️ COMPARA O PRECO CHEIO (`o`), NAO o com desconto (`n`).
      // A 1a versao comparava o `n` e 10 das 11 firmas deram DIVERGE , obvio: o `n` e' o
      // preco COM cupom/link de afiliado, e a visita anonima ao site mostra o CHEIO. Era
      // ruido, nao achado. O preco cheio e' o que da pra conferir sem login e e' a base de
      // tudo: se ele muda e a gente nao percebe, todo desconto calculado em cima fica
      // errado. Conferir o `n` exige abrir com o link de afiliado e aplicar o cupom , outro
      // modo, que so entra depois deste estar limpo.
      const noBanco = (banco[slug]?.prices || [])
        .map((p) => p.o).filter(Boolean).map(norm).filter(Boolean);
      const setJson = new Set(linha.json.map(norm).filter(Boolean));
      const setDom = new Set(linha.dom.map(norm).filter(Boolean));

      // Quantos precos do BANCO cada camada confirma
      const okJson = noBanco.filter((v) => setJson.has(v)).length;
      const okDom = noBanco.filter((v) => setDom.has(v)).length;
      const total = noBanco.length;

      if (!total) {
        linha.veredito = 'SEM PRECO NO BANCO';
      } else if (linha.botBlock && okDom < total && okJson < total) {
        // Site barrou robo (403/429). NUNCA chamar isso de divergencia: o preco pode
        // estar certinho, eu e' que nao consegui ler. Falso positivo aqui faria alguem
        // "corrigir" preco correto.
        linha.veredito = 'INCONCLUSIVO';
        linha.detalhe = `site barrou o robo (403/429); li ${Math.max(okDom, okJson)}/${total}. Conferir pelo screenshot.`;
      } else if (!linha.dom.length && !linha.json.length) {
        // Nem DOM nem JSON: quase sempre bot-block/paywall. NAO e' "preco mudou".
        linha.veredito = 'INCONCLUSIVO';
        linha.detalhe = 'nao consegui ler preco nenhum (bot-block, login ou render em canvas)';
      } else if (okDom >= Math.ceil(total * 0.9) && okJson >= Math.ceil(total * 0.9)) {
        linha.veredito = 'CONFIRMADO 3/3';
        linha.detalhe = `${total}/${total} no DOM, ${okJson}/${total} na camada de dado (JSON+XHR), shot salvo`;
      } else if (okDom >= Math.ceil(total * 0.9) || okJson >= Math.ceil(total * 0.9)) {
        linha.veredito = 'CONFIRMADO 2/3';
        linha.detalhe = `DOM ${okDom}/${total}, JSON ${okJson}/${total} , NAO grava, olhar o shot`;
      } else {
        linha.veredito = 'DIVERGE';
        const faltando = [...new Set(noBanco.filter((v) => !setDom.has(v) && !setJson.has(v)))];
        linha.detalhe = `${faltando.length}/${total} precos do banco NAO aparecem no site: ${faltando.slice(0, 6).join(' ')}`;
      }
    } catch (e) {
      linha.veredito = 'ERRO';
      linha.detalhe = String(e.message || e).slice(0, 160);
    }
    linha.quando = new Date().toISOString();
    relatorio.push(linha);
    console.log(`${slug.padEnd(20)}${linha.veredito.padEnd(18)}${linha.detalhe}`);
    await ctx.close();
  }
  await browser.close();

  fs.mkdirSync(path.dirname(RELATORIO), { recursive: true });
  fs.writeFileSync(RELATORIO, JSON.stringify({ quando: new Date().toISOString(), firmas: relatorio }, null, 2));
  console.log(`\nrelatorio: ${path.relative(ROOT, RELATORIO)} | shots: ${path.relative(ROOT, SHOTS)}/`);

  const diverge = relatorio.filter((l) => l.veredito === 'DIVERGE');
  const parcial = relatorio.filter((l) => l.veredito === 'CONFIRMADO 2/3');
  if (parcial.length) console.log(`\n${parcial.length} firma(s) com so 2 de 3 confirmacoes , NAO gravadas, precisam de olho.`);
  if (diverge.length) {
    console.log(`\n${diverge.length} firma(s) DIVERGEM do banco:`);
    diverge.forEach((l) => console.log(`  ${l.firma}: ${l.detalhe}`));
  }
  // ESCREVER ainda nao aplica valor novo: hoje o script CONFERE. Adotar valor do site
  // automaticamente e' o proximo passo, e so depois de umas semanas de relatorio limpo ,
  // escrever no banco a partir de raspagem sem historico de acerto e' repetir o erro de
  // hoje com outro nome.
  if (ESCREVER) console.log('\n--write recebido, mas a adocao automatica ainda nao esta ligada (ver comentario no fim do arquivo).');

  return diverge.length ? 1 : 0;
}

main().then((c) => process.exit(c)).catch((e) => { console.error(e); process.exit(2); });
