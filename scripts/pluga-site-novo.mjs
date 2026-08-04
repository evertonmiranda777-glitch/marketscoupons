#!/usr/bin/env node
/**
 * Religa o site novo no banco DEPOIS de desempacotar.
 *
 * POR QUE ISTO EXISTE: `desempacota-design.mjs` REESCREVE novo/index.html do zero a cada
 * entrega do Design. Toda ligação feita à mão morre junto. Em 03/08 o Everton mandou o
 * arquivo de novo (faltava VolumeFilter e o checkout das plataformas) e as ligações de
 * firmas, calendário e heatmap teriam sido perdidas em silêncio , o pior tipo de perda,
 * porque a página continua abrindo, só volta a mostrar dado inventado.
 *
 * Fluxo a cada entrega:
 *   node scripts/desempacota-design.mjs <arquivo> novo /novo
 *   node scripts/pluga-site-novo.mjs
 *
 * Cada remendo é IDEMPOTENTE: rodar duas vezes não duplica nada. E cada um FALHA ALTO se a
 * âncora sumir , se o Design reescrever a seção, eu quero saber na hora, não descobrir
 * pela tela mostrando preço de mentira pro cliente.
 */
import fs from 'node:fs';

const ARQ = 'novo/index.html';
if (!fs.existsSync(ARQ)) { console.error(`${ARQ} não existe , rode o desempacotador antes`); process.exit(1); }
let d = fs.readFileSync(ARQ, 'utf8');

// A chave anon é pública por design: vive no HTML do site atual, o navegador precisa dela,
// e quem protege o dado é o RLS. Lida do index.html pra nunca ficar escrita em dois lugares.
const ANON = (fs.readFileSync('index.html', 'utf8')
  .match(/['"](eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]+)['"]/) || [])[1];
if (!ANON) { console.error('não achei a anon key no index.html'); process.exit(1); }

const feitos = [];
const pulados = [];

/** Aplica um remendo. `marca` = trecho que prova que já foi aplicado. */
function remendo(nome, marca, de, para) {
  if (d.includes(marca)) { pulados.push(nome); return; }
  if (!d.includes(de)) { console.error(`\n✗ ÂNCORA SUMIU em "${nome}"\n   procurava: ${de.slice(0, 90)}…\n   o Design mudou essa seção. Conferir na mão antes de publicar.`); process.exit(1); }
  d = d.replace(de, para);
  feitos.push(nome);
}

// ─────────────────────────────────────────────── 1. tipo de firma em português
const TRAD_TIPO = `          // ⚠️ cms_firms.type está em PORTUGUÊS (o admin é PT). O site é EN-default: sem isto
          // o card inglês exibe "Futuros" pro visitante da Índia, que é 75% do tráfego.
          type: (function (v) {
            var m = { 'Futuros': 'Futures', 'Forex/Futuros': 'Forex/Futures',
                      'Forex': 'Forex', 'Cripto': 'Crypto', 'Acoes': 'Stocks', 'Ações': 'Stocks' };
            return m[v] || v || velha.type || 'Futures';
          })(f.type),`;

// ─────────────────────────────────────────────── 2. firmas + calendário
const LIGACOES = `  // ══════════════════════════════════════════════════════════════════════════
  // FIRMAS AO VIVO , troca o \`firms\` de demonstração pelo cms_firms.
  // O próprio build do Design diz: "real build binds to cms_firms at runtime". É aqui.
  //
  // ⚠️ CUPOM E PREÇO NUNCA FICAM ESCRITOS NO ARQUIVO. Cupom em código apodrece e chega
  // errado no cliente , foi assim que o bot mandou digitar "E8", que paga ZERO comissão.
  _mcLigarBanco() {
    if (this._mcJaBuscou) return;
    this._mcJaBuscou = true;
    try { window.__mcBanco = { chamado: true }; } catch (e) {}
    var SB = 'https://qfwhduvutfumsaxnuofa.supabase.co';
    var AN = '${ANON}';
    var cols = 'id,name,discount,discount_type,coupon,rating,prices,split,drawdown,sort_order,active,type';
    var self = this;
    fetch(SB + '/rest/v1/cms_firms?active=eq.true&select=' + cols + '&order=sort_order.asc', {
      headers: { apikey: AN, Authorization: 'Bearer ' + AN }
    }).then(function (r) { return r.ok ? r.json() : null; }).then(function (linhas) {
      try { window.__mcBanco.linhas = linhas ? linhas.length : 0; } catch (e) {}
      if (!linhas || !linhas.length) return;   // banco fora: fica a demo, NUNCA esvazia a tela
      var antigas = {};
      (self.firms || []).forEach(function (f) { antigas[f.id] = f; });
      self.firms = linhas.map(function (f) {
        var velha = antigas[f.id] || {};
        var pr = (f.prices || [])[0] || {};
        var vit = f.discount_type === 'lifetime';
        return {
          id: f.id,
          name: f.name || velha.name || f.id,
${TRAD_TIPO}
          initials: velha.initials || String(f.name || f.id).slice(0, 2).toUpperCase(),
          logo: velha.logo || (f.id + '.webp'),
          color: velha.color || '#bfff00',
          discount: f.discount ? (f.discount + '%') : '',
          discNote: f.discount ? (vit ? 'OFF LIFETIME' : 'OFF') : '',
          discColor: velha.discColor || '#bfff00',
          coupon: f.coupon || '',                    // sem cupom é estado VÁLIDO (ex: FTMO)
          rating: f.rating != null ? String(f.rating) : (velha.rating || ''),
          priceNow: pr.n || '', priceOld: pr.o || '',
          split: f.split || velha.split || '',
          dd: f.drawdown || velha.dd || ''
        };
      });
      try { window.__mcBanco.ok = true; window.__mcBanco.qtd = self.firms.length; } catch (e) {}
      self.setState({ _mcBanco: 1 });
    }).catch(function (e) { try { window.__mcBanco.erro = String(e).slice(0, 120); } catch (_) {} });
  }

  // CALENDÁRIO AO VIVO , mesma edge function que o site atual usa há meses.
  // A demo trazia eventos de JUNHO chumbados. Evento econômico com data velha é pior que
  // nenhum: o trader confere e perde a confiança no resto da página.
  _mcLigarCalendario() {
    if (this._mcCalBuscou) return;
    this._mcCalBuscou = true;
    var self = this;
    fetch('https://qfwhduvutfumsaxnuofa.supabase.co/functions/v1/economic-calendar')
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (j) {
        var ev = j && j.events;
        if (!ev || !ev.length) return;
        var hoje = new Date().toISOString().slice(0, 10);
        var imp = { 3: 'high', 2: 'medium', 1: 'low' };
        var num = function (v) { if (v == null) return null; var n = parseFloat(String(v).replace(/[^0-9.-]/g, '')); return isNaN(n) ? null : n; };
        self.calData = ev.slice(0, 60).map(function (e, i) {
          var a = num(e.actual), f = num(e.forecast);
          return {
            id: i + 1, day: e.date === hoje ? 'today' : 'week',
            time: e.time || '', ccy: e.currency || '', name: e.event || '',
            period: e.reference || '', actual: e.actual || '',
            forecast: e.forecast || '', previous: e.previous || '',
            impact: imp[e.importance] || 'low',
            // seta só quando dá pra comparar número com número. Sem forecast, sem seta.
            dir: (a != null && f != null) ? (a > f ? 'up' : (a < f ? 'down' : '')) : ''
          };
        });
        self.setState({ _mcCal: 1 });
      }).catch(function () {});
  }

  renderVals() {
    this._mcLigarBanco();
    this._mcLigarCalendario();`;

remendo('firmas + calendário', '_mcLigarBanco', '  renderVals() {', LIGACOES);

// ─────────────────────────────────────────────── 3. opções do heatmap
const OPCOES = `// Opções dos 4 controles do heatmap. Valores idênticos aos que o app.js do site atual usa.
const MC_HEAT = {
  fonte: [ {v:'SPX500', l:'S&P 500'}, {v:'AllUSA', l:'All US stocks'},
           {v:'NASDAQ100', l:'Nasdaq 100'}, {v:'Crypto', l:'Crypto'} ],
  tam:   [ {v:'market_cap_basic', l:'Market cap'}, {v:'volume', l:'Volume'},
           {v:'Value.Traded', l:'Traded value'} ],
  cor:   [ {v:'change', l:'Change 1D %'}, {v:'Perf.W', l:'Change 1W %'},
           {v:'Perf.1M', l:'Change 1M %'}, {v:'Perf.YTD', l:'Change YTD %'} ],
  grupo: [ {v:'sector', l:'Sector'}, {v:'no_group', l:'No grouping'} ],
};

class Component extends DCLogic {`;
remendo('opções do heatmap', 'const MC_HEAT', 'class Component extends DCLogic {', OPCOES);

remendo('estado do heatmap', 'heatFonte: 0',
  "state = { route: 'specials',",
  "state = { heatFonte: 0, heatTam: 0, heatCor: 0, heatGrupo: 0, route: 'specials',");

// ─────────────────────────────────────────────── 4. controles do heatmap
remendo('controles do heatmap', 'heatUrl:',
  `heatTabs: [{k:'sp',label:'S&P 500 Index'},{k:'cap',label:'Market cap'},{k:'chg',label:'Change 1D %'},{k:'sec',label:'Sector'}].map(t => ({
        label: t.label, onClick: () => {},`,
  `heatUrl: (function () {
        var cfg = { dataSource: MC_HEAT.fonte[s.heatFonte].v, blockSize: MC_HEAT.tam[s.heatTam].v,
          blockColor: MC_HEAT.cor[s.heatCor].v, grouping: MC_HEAT.grupo[s.heatGrupo].v,
          locale: 'en', colorTheme: 'dark', hasTopBar: false, isDataSetEnabled: false,
          isZoomEnabled: true, hasSymbolTooltip: true, width: '100%', height: '100%' };
        var base = MC_HEAT.fonte[s.heatFonte].v === 'Crypto'
          ? 'https://www.tradingview.com/embed-widget/crypto-coins-heatmap/?locale=en#'
          : 'https://www.tradingview.com/embed-widget/stock-heatmap/?locale=en#';
        return base + encodeURIComponent(JSON.stringify(cfg));
      })(),
      // ⚠️ Vinham com \`onClick: () => {}\` e rótulo FIXO , enfeite, e nem dava pra perceber.
      // O rótulo agora mostra o valor ATUAL, senão o usuário clica e não sabe no que mexeu.
      heatTabs: [
        { k:'heatFonte', label: MC_HEAT.fonte[s.heatFonte].l, n: MC_HEAT.fonte.length },
        { k:'heatTam',   label: MC_HEAT.tam[s.heatTam].l,     n: MC_HEAT.tam.length },
        { k:'heatCor',   label: MC_HEAT.cor[s.heatCor].l,     n: MC_HEAT.cor.length },
        { k:'heatGrupo', label: MC_HEAT.grupo[s.heatGrupo].l, n: MC_HEAT.grupo.length },
      ].map(t => ({
        label: t.label,
        onClick: () => this.setState(function (st) { var o = {}; o[t.k] = ((st[t.k] || 0) + 1) % t.n; return o; }),`);

// ─────────────────────────────────────────────── 5. grade falsa -> widget real
if (!d.includes('mc-heatmap')) {
  const ini = d.indexOf('<div data-heatgrid="1"');
  if (ini < 0) { console.error('✗ não achei a grade do heatmap'); process.exit(1); }
  const fim = d.indexOf('</div>', d.indexOf('</sc-for>', ini)) + 6;
  d = d.slice(0, ini) + `<!-- Heatmap REAL. A grade que vem no pacote é mock: ~40 ações com variação inventada
         (NVDA -2.40, AAPL +1.76...). Número de mercado inventado não é placeholder bonito,
         é informação falsa , o trader confere no celular e perde a confiança na página. -->
    <div data-heatgrid="1" style="height: 560px; border-radius: 14px; overflow: hidden; border: 1px solid rgba(255,255,255,0.07);">
      <iframe id="mc-heatmap" title="Market heat map" loading="lazy" src="{{ heatUrl }}"
        style="width: 100%; height: 100%; border: 0; display: block;"></iframe>
    </div>` + d.slice(fim);
  // a remoção deixa um </sc-for> órfão; tag desbalanceada quebra a PÁGINA INTEIRA no runtime
  d = d.replace('</iframe>\n    </div>\n        </div>\n      </sc-for>\n    </div>\n', '</iframe>\n    </div>\n');
  feitos.push('heatmap real');
} else pulados.push('heatmap real');

// ─────────────────────────────────────────────── 6. hero do celular
// Sob o comentário "portrait crop on phones" do PRÓPRIO Design, o CSS faz o oposto: mostra
// a foto DEITADA (2752x1536, desktop) e esconde a EM PÉ (1792x2400, feita pro celular, com
// enquadramento pronto 82% 30%). No telefone a deitada entra numa caixa 417x519 com
// object-fit:cover e a raposa vira uma tirinha fina. Já veio errado em 2 entregas seguidas.
remendo('hero do celular', 'img[data-hero="tall"] { display: block',
  `img[data-hero="wide"] { display: block !important; object-position: 50% 32% !important; }
    img[data-hero="tall"] { display: none !important; }`,
  `img[data-hero="wide"] { display: none !important; }
    img[data-hero="tall"] { display: block !important; object-position: 82% 30% !important; }`);

// ─────────────────────────────────────────────── 7. o arrastar do Everton
// O Design fez um AJUSTE POR ARRASTO: no celular dá pra segurar na foto e mover, e a
// posição fica salva em localStorage.mc_hero_pos. Só que ele escreve o CSS mirando
// `img[data-hero="wide"]` , a foto do DESKTOP. Como o remendo 6 passou o celular a usar a
// `tall`, o arrasto dele deixou de mexer no que aparece na tela: ele arrastava e nada
// acontecia. Agora o CSS vale pras duas, então funciona seja qual for a que estiver visível.
remendo('arrastar do hero', "data-hero=\"wide\"],img[data-hero=\"tall\"]",
  `'img[data-hero="wide"]{object-position:' + x + '% ' + y + '% !important;}}';`,
  `'img[data-hero="wide"],img[data-hero="tall"]{object-position:' + x + '% ' + y + '% !important;}}';`);

remendo('arrastar do hero (2)', "tall\"]{object-position:' + pos.x",
  `'@media (max-width:960px){img[data-hero="wide"]{object-position:' + pos.x + '% ' + pos.y + '% !important;}}';`,
  `'@media (max-width:960px){img[data-hero="wide"],img[data-hero="tall"]{object-position:' + pos.x + '% ' + pos.y + '% !important;}}';`);

// ─────────────────────────────────────────────── 8. Awards da home, calculados
// LEI DO PROJETO (20/jul): "AWARDS 100% DATA-DRIVEN , NUNCA voltar a chumbar firma/valor".
// O build veio com os 3 vencedores escritos a mao (bulenox/apex/fff). Firma nova entrando
// no cms_firms jamais apareceria, e o dia que uma delas saisse do ar o premio continuaria
// no site. Agora sai do proprio `this.firms`, que ja e o banco:
//   Best Overall  -> maior nota
//   Best Futures  -> maior nota entre as de futuros
//   Best Discount -> maior desconto  (era "Best Payout", que eu NAO tenho como medir:
//                    payout de verdade exige dado de saque da firma, que nao existe aqui.
//                    Categoria que eu nao consigo apurar vira alegacao inventada.)
remendo('awards da home', 'MC_AWARDS',
  `homeAwards: [
        { place:'1', rank:'Winner', category:'Best Overall', slug:'bulenox' },
        { place:'2', rank:'Runner-up', category:'Best for Futures', slug:'apex' },
        { place:'3', rank:'Third', category:'Best Payout', slug:'funded-futures-family' },
      ]`,
  `homeAwards: MC_AWARDS(this.firms)`);

const AWARDS_FN = `// Vencedores calculados, nunca escritos. Ver remendo 8.
function MC_AWARDS(firms) {
  var lista = (firms || []).filter(function (f) { return f && f.id; });
  var nota = function (f) { return parseFloat(f.rating) || 0; };
  var desc = function (f) { return parseFloat(String(f.discount).replace('%', '')) || 0; };
  var melhor = function (arr, chave) {
    return arr.slice().sort(function (a, b) { return chave(b) - chave(a); })[0];
  };
  var futuros = lista.filter(function (f) { return /futur/i.test(f.type || ''); });
  var geral = melhor(lista, nota);
  var fut = melhor(futuros.length ? futuros : lista, nota);
  var dsc = melhor(lista, desc);
  // sem repetir firma nos 3 lugares: premio que da tudo pra mesma nao informa nada
  var usados = {};
  var escolher = function (cand, arr, chave) {
    var op = arr.slice().sort(function (a, b) { return chave(b) - chave(a); });
    for (var i = 0; i < op.length; i++) if (!usados[op[i].id]) { usados[op[i].id] = 1; return op[i]; }
    return cand;
  };
  var c1 = escolher(geral, lista, nota);
  var c2 = escolher(fut, futuros.length ? futuros : lista, nota);
  var c3 = escolher(dsc, lista, desc);
  return [
    { place: '1', rank: 'Winner',    category: 'Best Overall',      slug: c1 && c1.id },
    { place: '2', rank: 'Runner-up', category: 'Best for Futures',  slug: c2 && c2.id },
    { place: '3', rank: 'Third',     category: 'Biggest Discount',  slug: c3 && c3.id },
  ];
}

const MC_HEAT = {`;
remendo('funcao dos awards', 'function MC_AWARDS', 'const MC_HEAT = {', AWARDS_FN);

// ─────────────────────────────────────────────── 9. contagem de reviews dos Awards
// Dois problemas visiveis na tela: (1) os Awards liam um mapa de SO 4 firmas, entao
// vencedor fora dele saia como "★ 4.9 · reviews", com a palavra solta e nenhum numero;
// (2) o mapa grande (19 firmas) usa `alpha` e `topone`, mas o banco usa `alphafutures` e
// `toponefutures` , as chaves nunca casavam.
// Agora usa o mapa grande com apelido de id, e quando nao souber a contagem NAO escreve
// "reviews" sozinho: mostra so a nota. Rotulo sem numero e pior que rotulo nenhum.
remendo('reviews dos awards', 'MC_REVIEWS(',
  `const rv = { apex:'19.4K reviews', bulenox:'1.6K reviews', 'funded-futures-family':'2.1K reviews', tradeday:'1.3K reviews' }[f.id] || 'reviews';`,
  `const rv = MC_REVIEWS(f.id);`);

remendo('funcao de reviews', 'function MC_REVIEWS',
  'function MC_AWARDS(firms) {',
  `// Contagem de reviews com apelido de id. Ver remendo 9.
function MC_REVIEWS(id) {
  // ⚠️ mapa PROPRIO de proposito. Eu tinha recebido \`reviewsMap\` por parametro, mas ela e
  // declarada dentro de renderVals() e o homeStatic() NAO a enxerga , deu
  // "ReferenceError: reviewsMap is not defined" e derrubou a home inteira no ar.
  var M = { apex:'19.4K', bulenox:'1.6K', fn:'69.7K', 'funded-futures-family':'2.1K',
    aquafutures:'0.4K', blueberryfutures:'0.3K', e2t:'3.1K', tradeday:'1.3K',
    brightfunded:'0.9K', ftmo:'43.5K', the5ers:'5.8K', goat:'0.7K', alphafutures:'4.6K',
    toponefutures:'4.1K', cti:'1.2K', e8:'2.4K', fundingpips:'12.1K', futureselite:'0.6K',
    blueguardian:'1.9K' };
  var v = M[id];
  return v ? (' · ' + v + ' reviews') : '';   // separador junto: sem numero, sem ponto orfao
}

function MC_AWARDS(firms) {`);

// ─────────────────────────────────────────────── 10. o separador solto
// O molde escreve "★ {{rating}} · {{reviews}}" com o "·" LITERAL. Quando a firma nao tem
// contagem, sobrava "★ 4.9 ·" com o ponto orfao pendurado. O separador passa a fazer parte
// do valor: existe contagem, existe ponto; nao existe, nao aparece nada.
remendo('separador dos reviews', '{{ ha.rating }}{{ ha.reviews }}',
  '{{ ha.rating }} · {{ ha.reviews }}',
  '{{ ha.rating }}{{ ha.reviews }}');

remendo('separador dos reviews (lista)', '{{ r.rating }}★</span>{{ r.reviews }}',
  '{{ r.rating }}★</span> · {{ r.reviews }}',
  '{{ r.rating }}★</span>{{ r.reviews }}');

// ─────────────────────────────────────────────── 11. blog da home
// Os 3 cards vinham com titulos inventados. Existem 70 artigos reais em blog_posts.
// Busca junto com as firmas pra nao abrir uma 3a conexao no carregamento.
remendo('blog da home', '_mcLigarBlog',
  '  _mcLigarCalendario() {',
  `  // BLOG AO VIVO , 3 artigos reais de blog_posts (EN, ativos, mais recentes).
  _mcLigarBlog() {
    if (this._mcBlogBuscou) return;
    this._mcBlogBuscou = true;
    var self = this;
    var AN = '${ANON}';
    fetch('https://qfwhduvutfumsaxnuofa.supabase.co/rest/v1/blog_posts' +
      '?select=title,slug,category,level,read_time&lang=eq.en&active=eq.true&order=id.desc&limit=3',
      { headers: { apikey: AN, Authorization: 'Bearer ' + AN } })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (ps) {
        if (!ps || !ps.length) return;
        var cor = { beginner: '#34d399', intermediate: '#fbbf24', advanced: '#f87171' };
        var fundo = ['linear-gradient(135deg,#12321f,#0b0f0c)',
                     'linear-gradient(135deg,#0f2a36,#0b0f0c)',
                     'linear-gradient(135deg,#2a1414,#0b0f0c)'];
        self._mcBlog = ps.map(function (b, i) {
          var lv = String(b.level || '').toLowerCase();
          return {
            title: b.title, slug: b.slug,
            lvl: (lv || 'guide').toUpperCase(),
            lvlColor: cor[lv] || '#8a94a0',
            // read_time ja vem em minutos; o campo do banco as vezes traz "44 min",
            // por isso limpo antes , senao sai "44 min min" na tela, como estava no admin
            read: String(b.read_time || '').replace(/\s*min.*$/i, '') + ' min read',
            icon: 'ti-article', imgBg: fundo[i % 3]
          };
        });
        self.setState({ _mcBlogPronto: 1 });
      }).catch(function () {});
  }

  _mcLigarCalendario() {`);

remendo('chamada do blog', 'this._mcLigarBlog();',
  '    this._mcLigarCalendario();',
  '    this._mcLigarCalendario();\n    this._mcLigarBlog();');

// usa os artigos reais quando chegarem; ate la, os do pacote
remendo('homeGuides ao vivo', '_mcBlog ||',
  'homeGuides: [',
  'homeGuides: this._mcBlog || [');

// ─────────────────────────────────────────────── 12. logo nova no navegador
// fox-lime.png (handoff/Logo) com transparencia de verdade, entao fica bem em aba clara e
// escura. Sem isto o /novo pedia /favicon.ico e tomava 404 em toda visita.
// ⚠️ O manifest.json da RAIZ segue apontando pro "M" dourado de proposito: ele e do site
// ATUAL, que ainda e dourado. Trocar agora poria logo limao em site dourado e mudaria o
// icone de quem ja instalou o app. Vira junto com o site.
if (!d.includes('rel="icon"')) {
  const TAGS = `<link rel="icon" type="image/png" sizes="32x32" href="/novo/assets/icons/icon-32.png">
<link rel="icon" type="image/png" sizes="16x16" href="/novo/assets/icons/icon-16.png">
<link rel="apple-touch-icon" sizes="180x180" href="/novo/assets/icons/icon-180.png">
<meta name="theme-color" content="#070a06">
`;
  d = d.replace('<html><head>', '<html><head>' + String.fromCharCode(10) + TAGS);
  feitos.push('logo no navegador');
} else pulados.push('logo no navegador');

// ─────────────────────────────────────────────── 13. o cache que congelava a home
// ⚠️ ACHADO TARDE, e explica por que o blog continuava de mentira mesmo com o fetch
// voltando 200: `homeStatic()` guarda o resultado na PRIMEIRA chamada
//     homeStatic() { if (this._homeStatic) return this._homeStatic; ... }
// e ela roda ANTES das buscas assincronas voltarem. Ou seja, a home inteira , blog,
// calendario da home e AWARDS , ficava congelada no dado de demonstracao, e o setState
// nao adiantava nada porque devolvia sempre o objeto velho.
// Cada ligacao agora joga o cache fora antes de redesenhar.
['self.setState({ _mcBanco: 1 });',
 'self.setState({ _mcCal: 1 });',
 'self.setState({ _mcBlogPronto: 1 });'].forEach(function (linha) {
  if (d.includes('self._homeStatic = null; ' + linha)) return;
  if (!d.includes(linha)) { console.error('✗ não achei: ' + linha); process.exit(1); }
  d = d.replace(linha, 'self._homeStatic = null; ' + linha);
  feitos.push('invalida cache (' + linha.slice(17, 25) + ')');
});

// ─────────────────────────────────────────────── 14. calendario DA HOME
// A home tem o proprio array (`homeCalendar`, dentro do homeStatic), separado do `calData`
// da pagina cheia. Eu tinha ligado so o segundo, entao a previa da home continuava com
// "Non-Farm Payrolls 142K/190K" chumbado enquanto a pagina interna ja mostrava o real.
// Agora as duas bebem da mesma fonte: 4 eventos de MAIOR IMPACTO, que e o que a previa
// promete ("Next high-impact event").
remendo('calendario da home', 'this._mcCalHome ||',
  'homeCalendar: [',
  'homeCalendar: this._mcCalHome || [');

remendo('monta calendario da home', '_mcCalHome =',
  '        self._homeStatic = null; self.setState({ _mcCal: 1 });',
  `        // PREVIA DA HOME , 3 eventos DE HOJE, com cascata de importancia (ordem do
        // Everton, 03/08): pega os de 3 estrelas; se o dia nao tiver, cai pra 2; se nao
        // tiver, cai pra 1. Dia parado sem cascata deixaria a secao VAZIA na home, que e
        // pior que mostrar um evento pequeno.
        // ⚠️ O molde le stars e starColor, NAO impact , eu tinha mandado impact e a
        // coluna IMPACT ficou VAZIA na tela. So vi no print que o Everton mandou.
        var ESTRELA = { high: '★★★', medium: '★★', low: '★' };
        var COR = { high: '#f87171', medium: '#fbbf24', low: '#8a94a0' };
        var deHoje = self.calData.filter(function (e) { return e.day === 'today'; });
        var base = deHoje.length ? deHoje : self.calData;
        var escolha = [];
        ['high', 'medium', 'low'].forEach(function (nivel) {
          if (escolha.length >= 3) return;
          base.filter(function (e) { return e.impact === nivel; })
              .slice(0, 3 - escolha.length)
              .forEach(function (e) { escolha.push(e); });
        });
        self._mcCalHome = escolha.slice(0, 3).map(function (e) {
          return { time: e.time, ccy: e.ccy, name: e.name,
                   actual: e.actual || '—', forecast: e.forecast || '—',
                   stars: ESTRELA[e.impact] || '★', starColor: COR[e.impact] || '#8a94a0' };
        });
        self._homeStatic = null; self.setState({ _mcCal: 1 });`);

// ─────────────────────────────────────────────── 15. ordem das firmas na home
// Vinha na ordem do `sort_order` do banco, e o resultado era FTMO com 19% na frente da
// Earn2Trade com 50% , exatamente o oposto do que a secao promete ("BEST DEALS RIGHT NOW").
// Agora e DESCONTO DECRESCENTE, com a FundedNext FIXADA em 3o: ordem direta do Everton em
// 08/jul, que vale no site atual (helper `pinFN` no app.js). Se um dia cair, cai nos dois.
remendo('ordem das firmas', 'MC_ORDEM(',
  '      self.firms = linhas.map(function (f) {',
  '      self.firms = MC_ORDEM(linhas.map(function (f) {');

// fecha o MC_ORDEM( aberto acima. Se ficar sem fechar, e erro de sintaxe e a pagina
// INTEIRA some , nao so a ordem. Ja aconteceu, por isso o marcador e' explicito.
if (d.includes('MC_ORDEM(linhas.map') && !d.includes("velha.dd || '';
        };
      }));")) {
  const de = "velha.dd || '';
        };
      });";
  if (!d.includes(de)) { console.error('
✗ nao achei o fechamento do map das firmas'); process.exit(1); }
  d = d.replace(de, "velha.dd || '';
        };
      }));");
  feitos.push('fecha a ordenacao');
} else pulados.push('fecha a ordenacao');

remendo('funcao de ordem', 'function MC_ORDEM',
  'function MC_REVIEWS(id) {',
  `// Desconto decrescente + FundedNext presa em 3o. Ver remendo 15.
function MC_ORDEM(fs) {
  var n = function (f) { return parseFloat(String(f.discount).replace('%', '')) || 0; };
  var lista = fs.slice().sort(function (a, b) { return n(b) - n(a); });
  var i = lista.findIndex(function (f) { return f.id === 'fn'; });
  if (i > -1) { var fn = lista.splice(i, 1)[0]; lista.splice(Math.min(2, lista.length), 0, fn); }
  return lista;
}

function MC_REVIEWS(id) {`);

// ─────────────────────────────────────────────── 16. menu cortado no desktop
// O Everton mandou o print: a barra terminava em "Awards" e o "Live Room" nao aparecia.
// Medido em 1440px: .mc-navwrap tem 1583px de largura e 1661px de conteudo , 77px sobrando.
// Ela tem overflow-x:auto, entao ROLA, mas sem nenhuma pista visual: parece cortado.
// 15 itens com padding 8px 11px. Tirando 3px de cada lado libera 90px, mais que os 77 que
// faltam, e a diferenca e imperceptivel. Preferi apertar a esconder item do menu.
if (!d.includes('mc-navwrap > *')) {
  const CSS = `<style>
    /* cabe os 15 itens ate 1400px sem rolagem escondida , ver remendo 16 */
    @media (min-width: 1100px) {
      .mc-navwrap > * { padding-left: 8px !important; padding-right: 8px !important; }
    }
  </style>`;
  d = d.replace('</head>', CSS + String.fromCharCode(10) + '</head>');
  feitos.push('menu completo no desktop');
} else pulados.push('menu completo no desktop');

// ─────────────────────────────────────────────── fim
fs.writeFileSync(ARQ, d);
const tags = { ab: (d.match(/<sc-for/g) || []).length, fe: (d.match(/<\/sc-for>/g) || []).length };
console.log(`aplicados : ${feitos.join(', ') || '(nenhum)'}`);
if (pulados.length) console.log(`já estavam: ${pulados.join(', ')}`);
console.log(`sc-for    : ${tags.ab} abertos / ${tags.fe} fechados${tags.ab === tags.fe ? ' ok' : '  ⚠️ DESBALANCEADO , a página inteira quebra'}`);
if (tags.ab !== tags.fe) process.exit(1);
