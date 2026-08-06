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

// ⚠️ Toda troca passa por trocar(): no String.replace do JS, "$'" DENTRO do texto novo
// significa "tudo depois da âncora" , e código com preço tem '$' pra todo lado. Foi assim
// que o primeiro teste do pluga-lp DUPLICOU o rabo do arquivo. split/join não tem $.
function trocar(txt, de, para) { return txt.split(de).join(para); }

/** Aplica um remendo. `marca` = trecho que prova que já foi aplicado. */
function remendo(nome, marca, de, para) {
  if (d.includes(marca)) { pulados.push(nome); return; }
  if (!d.includes(de)) { console.error(`\n✗ ÂNCORA SUMIU em "${nome}"\n   procurava: ${de.slice(0, 90)}…\n   o Design mudou essa seção. Conferir na mão antes de publicar.`); process.exit(1); }
  d = trocar(d, de, para);
  feitos.push(nome);
}

// ─────────────────────────────────────────────── 1. tipo de firma em português
const TRAD_TIPO = `          // ⚠️ cms_firms.type está em PORTUGUÊS (o admin é PT). O site é EN-default: sem isto
          // o card inglês exibe "Futuros" pro visitante da Índia, que é 75% do tráfego.
          type: (function (v) {
            // ⚠️ PALAVRA A PALAVRA, nao string inteira. O mapa exato deixava passar
            // qualquer combinacao nova: "Futuros & Forex" (blueguardian) chegava CRU na
            // tela inglesa, e ainda fazia o quiz nao reconhecer a firma como de futuros.
            var m = { 'futuros': 'Futures', 'forex': 'Forex', 'cripto': 'Crypto',
                      'acoes': 'Stocks', 'ações': 'Stocks', 'indices': 'Indices',
                      'índices': 'Indices', 'acoes/etf': 'Stocks/ETF' };
            var t = String(v || velha.type || 'Futures');
            return t.replace(/[A-Za-zÀ-ÿ]+/g, function (w) { return m[w.toLowerCase()] || w; });
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
    var cols = 'id,name,discount,discount_type,coupon,rating,prices,split,drawdown,sort_order,active,type' +
      ',tags,min_days,scaling,news_trading,day1_payout,consistency,payout_speed';
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
        // ⚠️ O CARD TEM O ROTULO "100K" FIXO NA MARCACAO e eu pegava prices[0], que e o
        // 25K , ou seja, tamanho de um plano com preco de OUTRO, na home que vai receber
        // anuncio. Agora busco a linha marcada com pop (a 100K, que e a que o card anuncia);
        // sem essa marca, procuro 100K pelo nome; so entao caio na primeira.
        // REGRA DO CARD (ordem do Everton): o rotulo e "100K" FIXO na casca do Design, e o
        // preco tem que ser o do 100K MAIS BARATO daquela firma , e a conta grande que
        // chama atencao, e o valor baixo que puxa o clique.
        // Duas coisas quebravam isso antes: eu ligava prices[0] (o 25K na maioria, e o card
        // dizia "Apex 100K $16.70"), e depois a marca de "popular" (na FFF ela esta no 25K).
        // E mesmo pegando o 1o 100K ficava errado em 9 firmas , a E8 anunciava $440 tendo
        // plano de $167. Agora e o MENOR entre as linhas de 100K.
        var _px = f.prices || [];
        var _n = function (v) { var x = parseFloat(String(v || '').replace(/[^0-9.]/g, '')); return isFinite(x) ? x : null; };
        var _cem = _px.filter(function (x) { return x && x.n && /(^|[^\d])100K/i.test(String(x.a || '')); })
                      .sort(function (a, b) { return (_n(a.n) === null ? 1e9 : _n(a.n)) - (_n(b.n) === null ? 1e9 : _n(b.n)); });
        var pr = _cem[0]
              || _px.filter(function (x) { return x && x.pop; })[0]
              || _px[0] || {};
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
          dd: f.drawdown || velha.dd || '',
          // sinais que o QUIZ pontua e que os claims do modal conferem antes de afirmar
          tags: f.tags || [], minDays: f.min_days, scaling: f.scaling || '',
          newsTrading: !!f.news_trading, day1Payout: !!f.day1_payout,
          consistency: f.consistency || '', payoutSpeed: f.payout_speed || '',
          discNum: parseInt(f.discount, 10) || 0
        };
      });
      try { window.__mcBanco.ok = true; window.__mcBanco.qtd = self.firms.length; } catch (e) {}
      // RODAPE: a coluna "Trading Firms" era escrita a mao e trazia a GOAT FUNDED FUTURES,
      // tirada do ar em 28/jul (296 URLs viraram 301). Levava o visitante pra uma firma que
      // nao existe mais. E faltava a Funded Futures Family, que esta ativa.
      self._mcRodapeFirmas = self.firms.map(function (f) { return f.name; });
      self._homeStatic = null;   // homeStatic() CONGELA e roda antes do fetch voltar
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
  _mcLigarBlog(forcarLang) {
    if (this._mcBlogBuscou) return;
    this._mcBlogBuscou = true;
    var self = this;
    var AN = '${ANON}';
    var lang = (forcarLang || window.MC_LANG || 'EN').toLowerCase();
    fetch('https://qfwhduvutfumsaxnuofa.supabase.co/rest/v1/blog_posts' +
      '?select=title,slug,category,level,read_time&lang=eq.' + lang + '&active=eq.true&order=id.desc&limit=3',
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
// ⚠️ NAO existe mais remendo 'homeGuides ao vivo'. Eu tinha enchido a secao
// "Guides & Education" com posts do BLOG , sao coisas diferentes, e o remendo
// desfazia a correcao a cada rodada. Os guias agora sao os 3 canonicos, com titulo
// lido dos arquivos en/guides/*.html. O blog continua ligado na SUA secao.

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
  d = trocar(d, linha, 'self._homeStatic = null; ' + linha);
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

// fecha o MC_ORDEM( aberto acima. Sem fechar e erro de sintaxe e a pagina INTEIRA some ,
// nao so a ordem. Ja aconteceu, por isso a checagem e explicita.
//
// ⚠️ USA REGEX COM \r?\n: o arquivo do Design vem com quebra de linha do WINDOWS
// (\r\n) e todo marcador de varias linhas escrito com \n simples NUNCA casa. Perdi tempo
// achando que o remendo tinha sido aplicado quando ele nem rodava.
{
  // ancora na ultima linha do map (discNum) , era `velha.dd` e quebrou quando o map ganhou
  // os campos do quiz. Ancorar em "ultima linha" e fragil por natureza: se mexer no map,
  // conferir este fechamento junto.
  const jaFechado = /discNum: parseInt\(f\.discount, 10\) \|\| 0\r?\n\s*\};\r?\n\s*\}\)\);/;
  const aberto    = /(discNum: parseInt\(f\.discount, 10\) \|\| 0\r?\n\s*\};\r?\n\s*\})(\);)/;
  if (d.includes('MC_ORDEM(linhas.map') && !jaFechado.test(d)) {
    if (!aberto.test(d)) { console.error('\u2717 nao achei o fechamento do map das firmas'); process.exit(1); }
    d = d.replace(aberto, '$1)$2');
    feitos.push('fecha a ordenacao');
  } else pulados.push('fecha a ordenacao');
}

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
//
// ⚠️ CORRIGIDO 05/08 , meu diagnostico de 04/08 estava ERRADO. Eu disse que a barra "rola,
// so nao avisa". Medido de novo: os itens tem flex-shrink:1, entao ela NAO rola , os itens
// ENCOLHEM e o texto do ultimo fica cortado no meio ("Live Ro..."). Apertar padding so
// adiava: eu tinha ganho 28px e o Everton continuou vendo cortado no zoom dele.
// Agora sao tres coisas:
//   1. flex-shrink:0 , item nunca encolhe, entao texto nunca corta pela metade;
//   2. a barra rola de verdade, com a rolagem escondida (ela some no Mac e fica feia no PC);
//   3. um esmaecido na borda direita QUANDO ha mais coisa , sem isso rolagem sem barra
//      vira conteudo invisivel, que e pior que cortado.
// 15 itens nao cabem em notebook nem espremendo. Preferi rolar a esconder item do menu.
//
// ⚠️ 05/08, segunda correcao: apertar padding NUNCA ia resolver. Com o encolhimento
// travado o conteudo natural da barra e 1.690px , faltavam 154px a 410px em qualquer
// notebook, e padding devolve no maximo ~60. O que devolve de verdade sao os ICONES:
// 16px + 6 de vao x 15 itens = ~330px. Abaixo de 1750px de tela os icones somem e os
// rotulos ficam , medido no ar: cabe inteiro ate ~1100px. So abaixo disso rola (com o
// esmaecido avisando). O Everton usa zoom 125%: 1920 fisicos = ~1536 de CSS, e era por
// isso que "cabia pra mim e cortava pra ele".
if (!d.includes('mc-navwrap > *')) {
  const CSS = `<style>
    .mc-navwrap { scrollbar-width: none; -ms-overflow-style: none; scroll-behavior: smooth; }
    .mc-navwrap::-webkit-scrollbar { display: none; }
    .mc-navwrap > * { flex-shrink: 0 !important; }
    /* ⚠️ 05/08, TERCEIRA tentativa. A segunda ESCONDIA o ícone abaixo de 1750px e o menu
       ficou sem cara , o Everton mandou o print. Medindo direito: o ícone custa 16px + 6
       de vão, mas o vão, o padding e a fonte juntos devolvem quase o mesmo SEM apagar
       nada. Aperto em degraus, ícone SEMPRE visível até 1280px. */
    /* ⚠️ O RECUO DA BARRA NAO SE MEXE. Eu tinha baixado de 26px pra 16px pra ganhar
       espaco e o menu ficou 16px A ESQUERDA DO LOGO , o Everton mandou o print. O
       cabecalho tem 32px de cada lado e o logo comeca exatamente em 32: a barra alinha
       nos 32 tambem. E nem precisava do aperto: sobravam 136px. Quem cede espaco sao os
       ITENS (vao e padding), nunca a margem da pagina. */
    .mc-navwrap { padding-left: 32px !important; padding-right: 32px !important; }
    /* BARRA DE ROLAGEM , o Everton mandou o print do cadastro com DUAS barras brancas.
       Nao e defeito de layout: o painel do modal tem 1073px de conteudo em 1000px de
       altura, entao rola mesmo, e o Windows desenha a barra CLARA por padrao. Num site
       preto ela vira um risco branco no meio da tela. Deixo fina e escura (aparece,
       porque sumir esconderia que ha mais conteudo abaixo do botao). Vale pra pagina
       inteira, o Log in tem o mesmo painel. */
    * { scrollbar-width: thin; scrollbar-color: rgba(191,255,0,0.28) transparent; }
    *::-webkit-scrollbar { width: 8px; height: 8px; }
    *::-webkit-scrollbar-track { background: transparent; }
    *::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.16); border-radius: 8px; }
    *::-webkit-scrollbar-thumb:hover { background: rgba(191,255,0,0.45); }
    *::-webkit-scrollbar-corner { background: transparent; }
    @media (max-width: 1749px) {
      .mc-navwrap { gap: 1px !important; }
      .mc-navwrap > * { gap: 5px !important; padding: 8px 8px !important; font-size: 13px !important; }
      .mc-navwrap > * > i.ti { font-size: 14px !important; }
    }
    @media (max-width: 1449px) {
      .mc-navwrap > * { gap: 4px !important; padding: 8px 6px !important; font-size: 12.5px !important; }
      .mc-navwrap > * > i.ti { font-size: 13px !important; }
    }
    /* abaixo de 1280px nem apertando cabe: aí sim o ícone sai, que é melhor que rolar */
    @media (max-width: 1279px) {
      .mc-navwrap > * > i.ti { display: none; }
    }
    .mc-navfade { position: relative; }
    .mc-navfade::after {
      content: ''; position: absolute; top: 0; right: 0; bottom: 10px; width: 64px;
      pointer-events: none; opacity: 0; transition: opacity .18s;
      background: linear-gradient(90deg, rgba(10,13,7,0), rgba(10,13,7,.94) 72%);
    }
    .mc-navfade.mc-tem-mais::after { opacity: 1; }
  </style>`;
  const JS = `<script>
  // pista de "tem mais pra direita" no menu. Ver remendo 16.
  (function () {
    // ── DESTINO DOS BOTOES DE PLATAFORMA ────────────────────────────────────────
    // Os 6 cards da pagina Platforms tem "View plans · <nome> →" e o botao NAO LEVAVA
    // A LUGAR NENHUM , sendo que TradingView e NinjaTrader sao links de AFILIADO, ou
    // seja, comissao jogada fora em toda visita.
    // ⚠️ POR QUE NAO DA PRA USAR O BINDING: o markup liga em {{ p.onOpen }}, mas o
    // runtime do Design NAO passa funcao dentro dessa lista , ele instala um no-op
    // (um kd(){} vazio). Descobri lendo o onclick do botao no ar depois de dois
    // deploys achando que era nome errado de propriedade. Entao o destino e amarrado
    // aqui pelo ROTULO, que e estavel, e reaplicado a cada remontagem.
    // Links identicos aos do site no ar (app.js PLATFORMS_LANGS).
    // ⚠️ SO ESTAS DUAS. Eu tinha adicionado Rithmic, Tradovate, MT5 e WealthCharts
    // porque vi 6 no array PLATFORMS_LANGS do app.js , e NAO OLHEI A TELA. O site no ar
    // filtra por PLAT_ACTIVE = {ninjatrader, tradingview}, que e a whitelist de PARCERIA
    // ATIVA (esta escrito no comentario do proprio renderPlatforms). As outras 4 estao no
    // array como catalogo, nao como oferta. O site novo foi feito EM CIMA do que existe
    // de verdade , nao invento pagina.
    var PLAT = {
      'TradingView': 'https://tradingview.com/?aff_id=164855',
      'NinjaTrader': 'https://ninjatraderdomesticvendor.sjv.io/xJJ7ZO'
    };
    // ── PAINEL DE CADASTRO / LOGIN ──────────────────────────────────────────────
    // O Everton: "nao rola ate em cima". O painel tem 1073px de conteudo e na tela dele
    // (zoom 125%, sobram ~778px) faltam ~300px, entao ele ROLA , mas abria ja rolado,
    // com o titulo "Create Account" cortado, e a roda do mouse escapava pra pagina de
    // tras em vez de mover o painel. Duas coisas: volta pro topo ao abrir, e prende a
    // rolagem dentro do painel (overscroll-behavior) pra roda nao vazar.
    function ajustaPainelAuth() {
      var ds = document.querySelectorAll('div');
      for (var i = 0; i < ds.length; i++) {
        var e = ds[i];
        if (e.__mcAuth) continue;
        var cs = getComputedStyle(e);
        if (cs.overflowY !== 'auto' && cs.overflowY !== 'scroll') continue;
        if (e.scrollHeight <= e.clientHeight + 2) continue;      // nao transborda, nada a fazer
        if (e.clientHeight > window.innerHeight + 4) continue;   // e a pagina, nao um painel
        var t = e.textContent || '';
        if (!/Sign up with Google|Create Account|Welcome back|Log in to/i.test(t)) continue;
        e.__mcAuth = 1;
        // ⚠️ ESTE E O DEFEITO DE VERDADE. O painel e um flex column com
        // justify-content:center. Quando o conteudo passa da altura da caixa, o excesso
        // sobra dos DOIS lados e a parte de CIMA fica FORA da area rolavel , some e nao
        // volta com scroll nenhum. E o "nao rola ate em cima" do print: o titulo
        // "Create Account" cortado e inalcancavel. Centralizar so pode valer quando cabe.
        if (cs.justifyContent === 'center') e.style.justifyContent = 'flex-start';
        e.style.overscrollBehavior = 'contain';
        e.scrollTop = 0;
        (function (el) {
          setTimeout(function () { el.scrollTop = 0; }, 60);
          setTimeout(function () { el.scrollTop = 0; }, 320);
        })(e);
      }
    }

    // ── DESTINO DOS CARDS DE REVIEW (página Guides) ─────────────────────────────
    // Mesma armadilha das plataformas: o runtime do Design NÃO passa função dentro
    // dessa lista, então onOpen vira no-op e o botão "Read full review" não leva a
    // lugar nenhum. Amarro pelo DOM: leio o nome da firma no próprio card.
    var REV = {
      'Apex Trader Funding': 'apex', 'Bulenox': 'bulenox', 'FundedNext': 'fn',
      'TradeDay': 'tradeday', 'FTMO': 'ftmo', 'The5ers': 'the5ers',
      'Funded Futures Family': 'funded-futures-family', 'Blue Guardian': 'blueguardian',
      'Top One Futures': 'toponefutures'
    };
    function ligaReviews() {
      // ⚠️ NAO sao <button>: o Design fez o "Read full review" como <div> com
      // cursor:pointer. Meu 1o seletor procurava button e achava zero , o conserto
      // parecia nao ter pegado. Conferir a TAG antes de escrever o seletor.
      var bs = document.querySelectorAll('div,span,a,button');
      for (var i = 0; i < bs.length; i++) {
        var b = bs[i];
        if (b.__mcRev) continue;
        var tt = (b.innerText || '').trim();
        if (tt.indexOf('Read full review') !== 0 || tt.length > 40) continue;
        var card = b.closest('div');
        for (var k = 0; k < 4 && card; k++) {
          var txt = card.textContent || '';
          var achou = null;
          for (var nome in REV) { if (txt.indexOf(nome + ' Review') >= 0) { achou = REV[nome]; break; } }
          if (achou) { b.__mcRev = achou; break; }
          card = card.parentElement;
        }
        if (!b.__mcRev) continue;
        b.addEventListener('click', function (ev) {
          ev.preventDefault();
          var lg = String(window.MC_LANG || 'EN').toLowerCase();
          location.href = (lg === 'en' ? '' : '/' + lg) + '/' + this.__mcRev + '-coupon';
        });
      }
    }

    // ── CLIQUE DO BLOG E DOS GUIAS ──────────────────────────────────────────────
    // 3ª vez que caio na MESMA armadilha hoje (plataformas, reviews, e agora estes):
    // o runtime do Design NÃO passa função dentro de lista , o onOpen vira no-op e o
    // card não abre nada. O Everton: "blog ao clicar eu não consigo acessar".
    // Aqui amarro pelo TEXTO do card, que é estável.
    var GUIAS = {
      'What is a prop firm?': 'o-que-e-uma-prop-firm',
      'Drawdown Management': 'gerenciamento-drawdown',
      'How to Pass the Challenge': 'como-passar-no-desafio',
      'Position Sizing at Prop Firms': 'position-sizing',
      'How to Withdraw Your Winnings': 'como-sacar-lucros'
      // "Apex vs FTMO vs Bulenox" não tem guia próprio , cai na comparação, tratado abaixo
    };
    function lg() { return String(window.MC_LANG || 'EN').toLowerCase(); }
    function pre() { var l = lg(); return l === 'en' ? '' : '/' + l; }

    function ligaCards() {
      // guias educativos
      var ds = document.querySelectorAll('div');
      for (var i = 0; i < ds.length; i++) {
        var e = ds[i];
        if (e.__mcCard) continue;
        var t = (e.innerText || '').trim();
        if (!t || t.length > 260) continue;
        var alvo = null;
        for (var titulo in GUIAS) { if (t.indexOf(titulo) === 0) { alvo = GUIAS[titulo]; break; } }
        if (!alvo && t.indexOf('Apex vs FTMO vs Bulenox') === 0) alvo = '__compare';
        if (!alvo) continue;
        e.__mcCard = alvo;
        e.style.cursor = 'pointer';
        e.addEventListener('click', function (ev) {
          ev.preventDefault();
          if (this.__mcCard === '__compare') location.href = '/apex-vs-bulenox';
          else location.href = pre() + '/guides/' + this.__mcCard;
        });
      }
      // artigos do blog: o slug fica no dado, então marco pelo TÍTULO
      var mapa = {};
      try {
        var app = window.__mcBlogSlugs || {};
        for (var k in app) mapa[k] = app[k];
      } catch (e2) {}
      var todos = document.querySelectorAll('div');
      for (var j = 0; j < todos.length; j++) {
        var c = todos[j];
        if (c.__mcArt) continue;
        var tx = (c.innerText || '').trim();
        if (!tx || tx.length > 400) continue;
        var linha1 = tx.split(String.fromCharCode(10))[0].trim();
        if (!mapa[linha1]) continue;
        c.__mcArt = mapa[linha1];
        c.style.cursor = 'pointer';
        c.addEventListener('click', function (ev) {
          ev.preventDefault();
          location.href = pre() + '/blog/' + this.__mcArt;
        });
      }
    }

    // ── BOTÕES DO HEATMAP ───────────────────────────────────────────────────────
    // "OS BOTÕES NÃO FUNCIONAM": Nasdaq 100, Market cap, Change 1W %, Sector.
    // O rótulo TROCAVA e o mapa não mudava , e a causa é sutil: a configuração do widget
    // do TradingView vai no HASH da URL (#...), e trocar só o hash de um iframe que já
    // carregou NÃO recarrega nada. O React atualizava o src e o navegador ignorava.
    // Aqui eu observo o src e, quando muda, TROCO o iframe por um clone , que é a única
    // forma de forçar carga nova sem tocar no runtime do Design.
    var ifrSrc = null;
    function ligaHeatmap() {
      var f = document.querySelector('iframe[src*="tradingview.com/embed-widget"]');
      if (!f) { ifrSrc = null; return; }
      if (ifrSrc === null) { ifrSrc = f.src; return; }
      if (f.src === ifrSrc) return;
      ifrSrc = f.src;
      var novo = f.cloneNode(false);
      novo.src = f.src;
      f.parentNode.replaceChild(novo, f);
    }

    // ══ AUTENTICACAO DE VERDADE ═══════════════════════════════════════════════
    // A casca fingia: doAuth vira setState({ authed: true, toast: Logged in as
    // Everton }). Virava um booleano com o nome do Everton chumbado , qualquer
    // visitante virava "Everton" na tela, nenhuma conta era criada e nenhum lead
    // salvo. Testado: ZERO chamada de rede ao clicar em Create account.
    //
    // Falo direto com a API de auth do Supabase (sem SDK, sem dependencia nova).
    // O token fica no localStorage com a MESMA chave do site atual (mc-user-auth),
    // entao quem loga aqui continua logado la e vice-versa.
    var SBURL = 'https://qfwhduvutfumsaxnuofa.supabase.co';
    var SBKEY = '${ANON}';
    var CHAVE = 'mc-novo-auth';

    function authSalvar(sessao) {
      try { localStorage.setItem(CHAVE, JSON.stringify(sessao)); } catch (e) {}
    }
    function authLer() {
      try { return JSON.parse(localStorage.getItem(CHAVE) || 'null'); } catch (e) { return null; }
    }
    function authLimpar() { try { localStorage.removeItem(CHAVE); } catch (e) {} }

    function authPost(caminho, corpo) {
      return fetch(SBURL + '/auth/v1/' + caminho, {
        method: 'POST',
        headers: { apikey: SBKEY, 'Content-Type': 'application/json' },
        body: JSON.stringify(corpo)
      }).then(function (r) {
        return r.json().then(function (j) { return { ok: r.ok, dados: j }; });
      });
    }

    function nomeDoUsuario() {
      var s = authLer();
      if (!s || !s.user) return null;
      var m = s.user.user_metadata || {};
      return m.full_name || m.name || (s.user.email || '').split('@')[0] || null;
    }

    // troca o "Everton" chumbado pelo nome de quem esta logado de verdade
    function ajustaNome() {
      var nome = nomeDoUsuario();
      if (!nome) return;
      var it = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null);
      var n;
      while ((n = it.nextNode())) {
        var t = (n.nodeValue || '').trim();
        if (t === 'Everton' && nome !== 'Everton') n.nodeValue = n.nodeValue.replace('Everton', nome);
      }
    }

    function avisa(msg) {
      var el = document.getElementById('mc-auth-aviso');
      if (!el) {
        el = document.createElement('div');
        el.id = 'mc-auth-aviso';
        el.style.cssText = 'position:fixed;left:50%;transform:translateX(-50%);bottom:28px;z-index:99999;' +
          'padding:12px 18px;border-radius:12px;font:600 13.5px Inter,system-ui,sans-serif;' +
          'background:#0f1409;border:1px solid rgba(191,255,0,0.35);color:#E7ECEF;box-shadow:0 10px 30px rgba(0,0,0,.5);';
        document.body.appendChild(el);
      }
      el.textContent = msg;
      el.style.display = 'block';
      clearTimeout(el.__t);
      el.__t = setTimeout(function () { el.style.display = 'none'; }, 4200);
    }

    function campos(botao) {
      // ⚠️ EXISTEM DOIS PAINEIS de cadastro no DOM ao mesmo tempo (o de 340px e o de
      // 620px), cada um com o seu "Create account", e ainda ha o campo de busca e o de
      // newsletter na pagina. Subir procurando "2 inputs" pegava um container que
      // englobava tudo e o e-mail vazio ganhava , dava "Enter a valid email" com o campo
      // preenchido na tela. Agora subo UM NIVEL POR VEZ e paro no PRIMEIRO container que
      // tem campo de senha: esse e o formulario do botao que foi clicado, sem ambiguidade.
      var raiz = null, e = botao;
      for (var k = 0; k < 10 && e; k++) {
        if (e.querySelector && e.querySelector('input[type=password]')) { raiz = e; break; }
        e = e.parentElement;
      }
      if (!raiz) return { nome: null, email: null, senha: null };
      var vis = [].slice.call(raiz.querySelectorAll('input'));
      var nome = null, email = null, senha = null;
      vis.forEach(function (i) {
        var ph = (i.placeholder || '').toLowerCase();
        if (i.type === 'password') { if (!senha) senha = i; return; }
        if (ph === 'you@email.com') return;                 // esse e da newsletter
        if (ph.indexOf('search') >= 0) return;              // esse e a busca
        if (!email && ph.indexOf('@') >= 0) { email = i; return; }
        if (!nome && (ph.indexOf('smith') >= 0 || ph.indexOf('name') >= 0)) { nome = i; return; }
      });
      return { nome: nome, email: email, senha: senha };
    }

    function ligaAuth() {
      var bs = document.querySelectorAll('button');
      for (var i = 0; i < bs.length; i++) {
        var b = bs[i];
        if (b.__mcAuthLig) continue;
        var t = (b.innerText || '').trim();
        var ehCriar = /^Create account$/i.test(t);
        var ehEntrar = /^(Sign In|Log in)$/i.test(t) && b.closest('div') &&
                       /password|senha/i.test((b.closest('div').textContent || ''));
        var ehSair = /^(Log out|Sair)$/i.test(t);
        if (!ehCriar && !ehEntrar && !ehSair) continue;
        b.__mcAuthLig = 1;
        b.__mcModo = ehCriar ? 'criar' : (ehEntrar ? 'entrar' : 'sair');
        b.addEventListener('click', function (ev) {
          var self = this;
          if (self.__mcPassar) { self.__mcPassar = false; return; }   // 2a passada: deixa a casca agir
          ev.preventDefault();
          ev.stopImmediatePropagation();

          if (self.__mcModo === 'sair') {
            authLimpar();
            self.__mcPassar = true; self.click();
            return;
          }

          var c = campos(self);
          var email = c.email ? c.email.value.trim() : '';
          var senha = c.senha ? c.senha.value : '';
          var nome = c.nome ? c.nome.value.trim() : '';
          // ⚠️ SEM REGEX. A versao com \s escapado PERDEU a barra na escrita e virou
          // [^@s], que rejeita qualquer e-mail com a letra S , 6a vez que caio nisso hoje.
          var arroba = email.indexOf('@');
          var ponto = email.lastIndexOf('.');
          if (arroba < 1 || ponto < arroba + 2 || ponto >= email.length - 1 || email.indexOf(' ') >= 0) {
            avisa('Enter a valid email'); return;
          }
          if ((senha || '').length < 6) { avisa('Password needs at least 6 characters'); return; }

          avisa(self.__mcModo === 'criar' ? 'Creating your account...' : 'Signing in...');

          var chamada = self.__mcModo === 'criar'
            ? authPost('signup', { email: email, password: senha, data: { full_name: nome } })
            : authPost('token?grant_type=password', { email: email, password: senha });

          chamada.then(function (r) {
            if (!r.ok) {
              var msg = (r.dados && (r.dados.msg || r.dados.error_description || r.dados.message)) || 'Could not complete';
              avisa(msg);
              return;
            }
            var s = r.dados;
            if (s.access_token) {
              authSalvar({ access_token: s.access_token, refresh_token: s.refresh_token, user: s.user });
              self.__mcPassar = true; self.click();
              setTimeout(ajustaNome, 300);
              avisa(self.__mcModo === 'criar' ? 'Account created' : 'Signed in');
            } else {
              // signup com confirmacao de e-mail ligada: conta criada, sessao vem depois
              avisa('Account created. Check your email to confirm.');
            }
          }).catch(function () { avisa('Network error, try again'); });
        }, true);
      }
    }

    // ja logado? destrava sozinho ao abrir
    function restaurarSessao() {
      if (window.__mcSessaoOk) return;
      var s = authLer();
      if (!s || !s.access_token) return;
      window.__mcSessaoOk = 1;
      fetch(SBURL + '/auth/v1/user', {
        headers: { apikey: SBKEY, Authorization: 'Bearer ' + s.access_token }
      }).then(function (r) { return r.ok ? r.json() : null; }).then(function (u) {
        if (!u || !u.id) { authLimpar(); return; }
        s.user = u; authSalvar(s);
        // aciona o botao de login da casca so pra virar o estado, sem rede
        var b = [].slice.call(document.querySelectorAll('button')).find(function (x) {
          return /^(Sign In|Log in)$/i.test((x.innerText || '').trim());
        });
        if (b) { b.__mcPassar = true; b.click(); }
        setTimeout(ajustaNome, 400);
      }).catch(function () {});
    }


    // ══ BARRA DE PROMOCAO (contagem regressiva) ═══════════════════════════════
    // O site atual mostra em TODAS as paginas. A casca do Design nao tem o
    // elemento, entao eu CRIO e insiro como primeiro filho do body , sem mexer na
    // marcacao existente.
    // ⚠️ O prazo vem SO do banco (promo_ends_at). Codigo NUNCA inventa prazo: foi
    // exatamente 'Date.now() + 48h' chumbado que fez o Telegram publicar
    // "89% OFF vitalicio" e "Termina em 48h" na mesma mensagem em 28/07.
    var PROMO_FIM = {};
    function textoTermina() {
      var m = {
        pt: 'Termina em:', es: 'Termina en:', it: 'Termina tra:', fr: 'Se termine dans :',
        de: 'Endet in:', ar: 'ينتهي خلال:', id: 'Berakhir dalam:'
      };
      // ⚠️ o evento mc:lang dispara ANTES do atributo lang ser gravado no <html>,
      // entao ler o atributo aqui devolvia o idioma ANTERIOR. window.MC_LANG e
      // atualizado pelo tradutor antes do disparo.
      var l = String(window.MC_LANG || document.documentElement.lang || 'en').toLowerCase().slice(0, 2);
      return m[l] || 'Ends in:';
    }
    function montaBarra(linhas) {
      var bar = document.getElementById('mc-promo-topbar');
      if (!bar) {
        bar = document.createElement('div');
        bar.id = 'mc-promo-topbar';
        bar.style.cssText = 'position:relative;z-index:60;display:flex;align-items:center;' +
          'justify-content:center;flex-wrap:wrap;gap:18px;padding:9px 16px;' +
          'background:linear-gradient(90deg,rgba(191,255,0,0.10),rgba(191,255,0,0.04));' +
          'border-bottom:1px solid rgba(191,255,0,0.22);' +
          'font:700 12.5px Inter,system-ui,sans-serif;color:#E7ECEF;';
        document.body.insertBefore(bar, document.body.firstChild);
      }
      bar.innerHTML = linhas.map(function (f, i) {
        return '<span style="display:inline-flex;align-items:center;gap:8px">' +
          '<span style="color:#F4F8F9">' + f.nome + '</span>' +
          '<span style="color:#8a94a0;font-weight:600">' + textoTermina() + '</span>' +
          '<span data-mc-fim="' + f.fim + '" style="color:#bfff00;font-variant-numeric:tabular-nums">--</span>' +
          '</span>' + (i < linhas.length - 1 ? '<span style="color:#3a4340">•</span>' : '');
      }).join('');
      bar.style.display = linhas.length ? 'flex' : 'none';
    }
    function tiquePromo() {
      var els = document.querySelectorAll('[data-mc-fim]');
      for (var i = 0; i < els.length; i++) {
        var fim = parseInt(els[i].getAttribute('data-mc-fim'), 10);
        var resta = fim - Date.now();
        if (!isFinite(resta) || resta <= 0) { els[i].textContent = '--'; continue; }
        var s = Math.floor(resta / 1000), d = Math.floor(s / 86400);
        var h = Math.floor((s % 86400) / 3600), m = Math.floor((s % 3600) / 60), sg = s % 60;
        var z = function (n) { return (n < 10 ? '0' : '') + n; };
        els[i].textContent = z(d) + 'd ' + z(h) + 'h ' + z(m) + 'm ' + z(sg) + 's';
      }
    }
    function ligaPromoBar() {
      if (window.__mcPromoBar) return;
      window.__mcPromoBar = 1;
      var AN2 = '${ANON}';
      fetch('https://qfwhduvutfumsaxnuofa.supabase.co/rest/v1/cms_firms' +
        '?select=id,name,short_name,promo_ends_at&active=eq.true', {
        headers: { apikey: AN2, Authorization: 'Bearer ' + AN2 }
      }).then(function (r) { return r.ok ? r.json() : null; }).then(function (rows) {
        if (!rows) return;
        var agora = Date.now();
        var vivas = rows.filter(function (f) {
          var t = f.promo_ends_at ? Date.parse(f.promo_ends_at) : 0;
          return t && t > agora;
        }).sort(function (a, b) { return Date.parse(a.promo_ends_at) - Date.parse(b.promo_ends_at); })
          .map(function (f) {
            return { nome: f.short_name || f.name, fim: Date.parse(f.promo_ends_at) };
          });
        if (!vivas.length) return;   // sem prazo no banco = sem barra, nunca inventada
        PROMO_FIM = vivas;
        montaBarra(vivas);
        tiquePromo();
        setInterval(tiquePromo, 1000);
        document.addEventListener('mc:lang', function () { setTimeout(function () { montaBarra(PROMO_FIM); tiquePromo(); }, 0); });
      }).catch(function () {});
    }

    function ligaPlataformas() {
      var bs = document.querySelectorAll('button');
      for (var i = 0; i < bs.length; i++) {
        var b = bs[i];
        if (b.__mcPlat) continue;
        // ⚠️ sem regex de proposito: a versao com \s escapado ja se perdeu uma vez na
        // escrita e virou /View planss*/, que nao casa com nada e falha em SILENCIO.
        var txt = (b.textContent || '');
        if (txt.indexOf('View plans') < 0) continue;
        var nome = null;
        for (var k in PLAT) { if (txt.indexOf(k) >= 0) { nome = k; break; } }
        if (!nome) continue;
        b.__mcPlat = PLAT[nome];
        b.addEventListener('click', function (ev) {
          ev.preventDefault();
          window.open(this.__mcPlat, '_blank', 'noopener');
        });
      }
    }

    function liga() {
      var w = document.querySelector('.mc-navwrap');
      if (!w || !w.parentElement) return false;
      var p = w.parentElement;
      p.classList.add('mc-navfade');
      function ver() {
        p.classList.toggle('mc-tem-mais', w.scrollWidth - w.scrollLeft - w.clientWidth > 4);
      }
      w.addEventListener('scroll', ver, { passive: true });
      ligaPlataformas();
      addEventListener('resize', ver);
      ver();
      return true;
    }
    // ⚠️ NAO basta ligar uma vez. O runtime do Design REMONTA a barra a cada troca de
    // pagina e a classe some junto , foi assim que a 1a versao subiu sem o esmaecido:
    // o CSS estava la, o JS tinha rodado, e a marca ja tinha sido apagada quando eu medi.
    liga();
    var esperando = 0;
    new MutationObserver(function () {
      if (esperando) return;
      esperando = setTimeout(function () { esperando = 0; liga(); ligaPlataformas(); ligaReviews(); ligaCards(); ligaHeatmap(); ligaAuth(); ajustaNome(); ajustaPainelAuth(); ligaPromoBar(); }, 120);
    }).observe(document.body, { childList: true, subtree: true });
  })();
  </scr` + `ipt>`;
  d = d.replace('</head>', CSS + String.fromCharCode(10) + '</head>');
  d = d.replace('</body>', JS + String.fromCharCode(10) + '</body>');
  feitos.push('menu completo no desktop');
} else pulados.push('menu completo no desktop');

// ─────────────────────────────────────────────── 16b. números do hero
// "18+ firmas", "90% max discount" e "2.7K+ códigos copiados/mês" vinham ESCRITOS. Os três
// estavam certos no dia da entrega (o de cupom bate exato com coupon_clicks: 2.714 em 30
// dias), e é justamente por isso que era perigoso: número certo hoje apodrece sem avisar,
// e isto é claim público na home que recebe anúncio.
// "74K+ monthly views" fica escrito de propósito , é GA4, não tenho de onde ler no cliente.
remendo('numeros do hero', '_mcLigarNumeros',
  '  _mcLigarCalendario() {',
  `  _mcLigarNumeros() {
    if (this._mcNumBuscou) return;
    this._mcNumBuscou = true;
    var self = this;
    var AN = '${ANON}';
    var kf = function (n) {
      if (n < 1000) return String(n) + '+';
      var v = (n / 1000).toFixed(1);
      if (v.slice(-2) === '.0') v = v.slice(0, -2);
      return v + 'K+';
    };
    // ⚠️ UMA CHAMADA SO, e por RPC. Tentei contar coupon_clicks direto do navegador e
    // voltava ZERO: o RLS nao deixa o anon ler essa tabela, entao a tela caia calada no
    // numero escrito a mao. A funcao numeros_publicos() devolve so o AGREGADO (nenhuma linha,
    // nenhum dado de pessoa) e e a unica porta que o anon tem pra esse total.
    fetch('https://qfwhduvutfumsaxnuofa.supabase.co/rest/v1/rpc/numeros_publicos', {
      method: 'POST',
      headers: { apikey: AN, Authorization: 'Bearer ' + AN, 'Content-Type': 'application/json' },
      body: '{}'
    }).then(function (r) { return r.ok ? r.json() : null; }).then(function (j) {
      if (!j) return;
      var n = {};
      if (j.firmas) n.firmas = j.firmas + '+';
      if (j.desconto_max) n.desconto = j.desconto_max + '%';
      if (j.cupons_30d) n.cupons = kf(j.cupons_30d);
      if (!Object.keys(n).length) return;
      self._mcNum = n;
      self._homeStatic = null;
      self.setState({ _mcNum: 1 });
    }).catch(function () {});
  }

  _mcLigarCalendario() {`);

remendo('chamada dos numeros', 'this._mcLigarNumeros();',
  '    this._mcLigarBlog();',
  '    this._mcLigarBlog();' + String.fromCharCode(10) + '    this._mcLigarNumeros();');

remendo('numeros do hero ao vivo', '(this._mcNum || {}).firmas',
  `        { big:'18+', bigLabel:'Trading firms', numColor:'#bfff00', key:'firms' },
        { big:'90%', bigLabel:'Max discount', numColor:'#F4F8F9', key:'specials' },
        { big:'74K+', bigLabel:'Monthly views', numColor:'#F4F8F9', key:'quiz' },
        { big:'2.7K+', bigLabel:'Codes copied / mo', numColor:'#F4F8F9', key:'specials' },`,
  `        { big:(this._mcNum || {}).firmas || '18+', bigLabel:'Trading firms', numColor:'#bfff00', key:'firms' },
        { big:(this._mcNum || {}).desconto || '90%', bigLabel:'Max discount', numColor:'#F4F8F9', key:'specials' },
        { big:'74K+', bigLabel:'Monthly views', numColor:'#F4F8F9', key:'quiz' },
        { big:(this._mcNum || {}).cupons || '2.7K+', bigLabel:'Codes copied / mo', numColor:'#F4F8F9', key:'specials' },`);

// ─────────────────────────────────────────────── 16c. idiomas
// O seletor da casca do Design era DECORATIVO: trocava o selo de EN pra PT e não
// traduzia nada. O site atual tem 8 idiomas há meses e 75% do tráfego vem da Índia.
//
// Traduz por NÓ DE TEXTO, comparando com o inglês exatamente como aparece na tela, e
// reaplica depois de cada renderização do runtime. Sem chave inventada e sem tocar na
// marcação , por isso sobrevive a uma entrega nova do Design.
// ⚠️ O DICIONÁRIO MORA NA RAIZ, não em novo/: o desempacotador APAGA novo/ inteira a
// cada entrega. Deixei ele lá na 1ª tentativa e sumiu no rebuild , 404 no ar. Mesmo
// erro que já tinha custado as logos das firmas.
// ⚠️ É ALLOWLIST: o que não está no dicionário fica em inglês. Nunca tradução
// automática por cima, que traduziria nome de firma, cupom e preço.
if (!d.includes('i18n-novo.js')) {
  d = d.replace('</head>', '<script src="/i18n-novo.js"></scr' + 'ipt>' + String.fromCharCode(10) + '</head>');
  feitos.push('carrega o dicionario');
} else pulados.push('carrega o dicionario');

if (!d.includes('mcTraduzir')) {
  const TRAD = `<script>
  (function () {
    var LANG = 'EN';
    try { window.MC_LANG = localStorage.getItem('mc_novo_lang') || 'EN'; } catch (e) { window.MC_LANG = 'EN'; }
    var ORIG = new WeakMap();   // guarda o inglês pra poder VOLTAR ao trocar de idioma

    function dic() { return window.MC_I18N_NOVO || {}; }

    function traduzNo(n) {
      var bruto = n.nodeValue;
      if (bruto == null) return;
      if (!ORIG.has(n)) {
        var t = bruto.trim();
        if (t.length < 3) return;
        if (!dic()[t]) return;                 // não está no dicionário: fica em inglês
        ORIG.set(n, bruto);
      }
      var orig = ORIG.get(n);
      var chave = orig.trim();
      var linha = dic()[chave];
      var alvo = (LANG === 'EN' || !linha) ? chave : (linha[LANG.toLowerCase()] || chave);
      var novo = orig.replace(chave, alvo);
      if (n.nodeValue !== novo) n.nodeValue = novo;
    }

    function mcTraduzir() {
      if (!window.MC_I18N_NOVO) return;
      var it = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null);
      var n;
      while ((n = it.nextNode())) {
        var pai = n.parentNode;
        if (!pai) continue;
        var tag = pai.nodeName;
        if (tag === 'SCRIPT' || tag === 'STYLE') continue;
        traduzNo(n);
      }
      // árabe lê da direita pra esquerda
      document.documentElement.setAttribute('dir', LANG === 'AR' ? 'rtl' : 'ltr');
      document.documentElement.setAttribute('lang', LANG.toLowerCase());
    }

    // o idioma escolhido vive no estado do runtime; leio pelo SELO do botão
    function idiomaDaTela() {
      var bs = document.querySelectorAll('button');
      for (var i = 0; i < bs.length; i++) {
        var t = (bs[i].textContent || '').trim();
        if (/^(PT|EN|ES|IT|FR|DE|AR|ID)$/.test(t)) return t;
      }
      return LANG;
    }

    var esperando = 0;
    function ciclo() {
      var atual = idiomaDaTela();
      if (atual !== LANG) {
        LANG = atual;
        window.MC_LANG = LANG;
        try { localStorage.setItem('mc_novo_lang', LANG); } catch (e) {}
        // blog e guias JA existem traduzidos no banco/repo , rebusca no idioma novo
        try { document.dispatchEvent(new CustomEvent('mc:lang', { detail: LANG })); } catch (e) {}
      }
      mcTraduzir();
    }

    function agenda() {
      if (esperando) return;
      esperando = setTimeout(function () { esperando = 0; ciclo(); }, 80);
    }

    try { LANG = localStorage.getItem('mc_novo_lang') || 'EN'; } catch (e) {}
    agenda();
    new MutationObserver(agenda).observe(document.body, { childList: true, subtree: true, characterData: true });
  })();
  </scr` + `ipt>`;
  d = d.replace('</body>', TRAD + String.fromCharCode(10) + '</body>');
  feitos.push('tradutor');
} else pulados.push('tradutor');

// ─────────────────────────────────────────────── 16d. página do Blog e dos Guias
//
// ACHADO 05/08: a página de Blog do site novo NÃO fazia chamada nenhuma ao banco , os
// 8 artigos estavam ESCRITOS na casca. Coincidiam com os reais no dia da entrega, e por
// isso passavam despercebidos: no dia em que o Everton publicar o 11º, ele não aparece,
// e artigo despublicado continua na tela.
//
// PIOR, na página de Guias: ela oferecia "Apex Trader Funding Review", "FTMO Review",
// "Bulenox Review"... e essas páginas DÃO 404. Só existe tradeday-review. Ou seja, o
// site novo mandava o visitante pra parede.
remendo('blog e guias ao vivo', '_mcLigarBlogPagina',
  '  _mcLigarBlog(forcarLang) {',
  `  // PÁGINA de blog (a home usa _mcLigarBlog, que traz só 3). Aqui vêm todos, com a
  // CAPA de verdade do blog_posts , a casca desenhava um degradê no lugar da imagem.
  _mcLigarBlogPagina(forcarLang) {
    var lang = (forcarLang || window.MC_LANG || 'EN').toLowerCase();
    if (this._mcBlogPagLang === lang) return;
    this._mcBlogPagLang = lang;
    var self = this;
    var AN = '${ANON}';
    // ⚠️ NAO traduzo titulo de artigo na tela: os 70 artigos JA existem traduzidos em 7
    // idiomas no blog_posts. Traduzir na interface criaria uma 2a versao divergente da
    // real. Aqui e so buscar no idioma certo.
    if (!this._mcLangOuvindo) {
      this._mcLangOuvindo = 1;
      document.addEventListener('mc:lang', function (e) {
        self._mcLigarBlogPagina(String(e.detail || 'EN'));
        self._mcBlogBuscou = false; self._mcLigarBlog(String(e.detail || 'EN'));
      });
    }
    fetch('https://qfwhduvutfumsaxnuofa.supabase.co/rest/v1/blog_posts' +
      '?select=title,slug,category,level,read_time,cover_url,excerpt' +
      '&lang=eq.' + lang + '&active=eq.true&order=id.desc&limit=24',
      { headers: { apikey: AN, Authorization: 'Bearer ' + AN } })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (ps) {
        if (!ps || !ps.length) return;   // banco fora: fica o que veio na casca
        var cor = { beginner: '#34d399', intermediate: '#fbbf24', advanced: '#f87171', professional: '#f87171' };
        self._mcBlogPag = ps.map(function (b) {
          var lv = String(b.level || '').toLowerCase();
          return {
            title: b.title,
            slug: b.slug,
            excerpt: b.excerpt || '',
            cat: b.category || 'Prop Firms',
            catColor: '#60a5fa',
            // ⚠️ o mapa da casca só conhece beginner/intermediate/professional. O banco
            // também usa 'advanced', e lvlMap['advanced'] vinha undefined , derrubava a
            // RENDERIZAÇÃO INTEIRA da página (Cannot read properties of undefined).
            lvl: (lv === 'advanced' ? 'professional'
                 : (lv === 'intermediate' ? 'intermediate'
                 : (lv === 'professional' ? 'professional' : 'beginner'))),
            lvlLabel: (lv || 'beginner').toUpperCase(),
            lvlColor: cor[lv] || '#8a94a0',
            read: String(b.read_time || '').replace(/\s*min.*$/i, '') + ' min',
            cover: b.cover_url || '',
            imgBg: b.cover_url ? ('center/cover no-repeat url(' + b.cover_url + ')')
                               : 'linear-gradient(135deg,#122036,#0d1119)',
            onOpen: (function (s, lg) { return function () { location.href = (lg === 'en' ? '' : '/' + lg) + '/blog/' + s; }; })(b.slug, lang)
          };
        });
        // mapa título -> slug pro clique do card (o runtime não passa a função)
        try {
          window.__mcBlogSlugs = {};
          ps.forEach(function (x) { window.__mcBlogSlugs[x.title] = x.slug; });
        } catch (e) {}
        self._homeStatic = null;
        self.setState({ _mcBlogPag: 1 });
      }).catch(function () {});
  }

  _mcLigarBlog(forcarLang) {`);

remendo('chamada do blog da pagina', 'this._mcLigarBlogPagina();',
  '    this._mcLigarBlog();',
  '    this._mcLigarBlog();' + String.fromCharCode(10) + '    this._mcLigarBlogPagina();');

// ⚠️ GUIAS: troco os cards de "review" (que dão 404) pelos 5 guias que EXISTEM em
// en/guides/. Não invento página , aponto pro que está no ar.
remendo('guias reais', 'MC_GUIAS',
  '      reviewCards: [',
  `      reviewCards: MC_GUIAS(),
      _reviewCardsAntigo: [`);

remendo('funcao dos guias', 'function MC_GUIAS',
  'function MC_ORDEM(fs) {',
  `// Os 5 guias canônicos que EXISTEM em en/guides/. A casca oferecia "Apex Review",
// "FTMO Review", "Bulenox Review"... e essas páginas dão 404 , só existe tradeday-review.
// Título e resumo iguais aos dos arquivos, pra não criar uma segunda versão do texto.
// O molde deste card é de REVIEW DE FIRMA ("The X review, honest and complete").
// A casca oferecia Apex Review, FTMO Review, Bulenox Review... e essas páginas DÃO 404.
// Tentei trocar pelos 5 guias e ficou pior: virou "The Guide review".
// A saída certa é apontar pras páginas que EXISTEM e que são exatamente isso , as
// landings /{firma}-coupon, com regra, preço e payout de cada firma (200 conferido).
function MC_GUIAS() {
  return [
    { name: 'Apex Trader Funding', short: 'Apex',        accent: '#f97316', tint: '#3a2410', slug: 'apex' },
    { name: 'Bulenox',             short: 'Bulenox',     accent: '#3b82f6', tint: '#122036', slug: 'bulenox' },
    { name: 'FundedNext',          short: 'FundedNext',  accent: '#a855f7', tint: '#241236', slug: 'fn' },
    { name: 'TradeDay',            short: 'TradeDay',    accent: '#22d3ee', tint: '#0c302c', slug: 'tradeday' },
    { name: 'FTMO',                short: 'FTMO',        accent: '#22c55e', tint: '#12321f', slug: 'ftmo' },
    { name: 'The5ers',             short: 'The5ers',     accent: '#34d399', tint: '#123028', slug: 'the5ers' },
    { name: 'Funded Futures Family', short: 'FFF',       accent: '#eab308', tint: '#332a0c', slug: 'funded-futures-family' },
    { name: 'Blue Guardian',       short: 'Blue Guardian', accent: '#60a5fa', tint: '#12203a', slug: 'blueguardian' },
    { name: 'Top One Futures',     short: 'Top One',     accent: '#f472b6', tint: '#33121f', slug: 'toponefutures' }
  ].map(function (g) {
    g.onOpen = function () { var lg = String(window.MC_LANG || 'EN').toLowerCase();
      location.href = (lg === 'en' ? '' : '/' + lg) + '/' + g.slug + '-coupon'; };
    return g;
  });
}

function MC_ORDEM(fs) {`);

// ─────────────────────────────────────────────── 17. as prévias da home
// Análise diária (NQ real), GEX (níveis reais), mini heatmap, fita do Live Room,
// plataformas, calculadora de posição e quiz.
//
// ⚠️ POR QUE ESTES ESTÃO NUM ARQUIVO E NÃO ESCRITOS AQUI: são 26 trocas, várias delas de
// blocos longos de HTML. Escrever à mão foi exatamente como quebrei a página 3× (contei o
// `</div>` errado). A tabela `remendos-previas.json` foi GERADA comparando o arquivo
// desempacotado limpo com o que está no ar, então é fiel por construção, não por digitação.
// Cada entrada tem âncora comprovadamente ÚNICA no arquivo limpo.
//
// Regenerar depois de mexer no /novo na mão: desempacota numa pasta temporária, roda este
// script nela, e faz o diff contra novo/index.html.
const PREVIAS = JSON.parse(fs.readFileSync('scripts/remendos-previas.json', 'utf8'));
// ⚠️ Tabela vazia = geração quebrada. Sem esta guarda o script "roda bem", o deploy sobe e
// o site perde TODAS as ligações em silêncio , exatamente o que aconteceu em 05/08.
if (!Array.isArray(PREVIAS) || PREVIAS.length < 30) {
  console.error(`
✗ remendos-previas.json tem ${PREVIAS.length} entradas (esperado 30+).`);
  console.error('  Publicar assim tira as prévias do ar. Regere a tabela antes.');
  process.exit(1);
}
let novasPrevias = 0, jaPrevias = 0;
for (const p of PREVIAS) {
  // "já aplicado" = a marca está lá. A marca é um trecho ADICIONADO por este remendo que
  // não existe em lugar nenhum do arquivo limpo , provado na geração da tabela.
  // ⚠️ Duas tentativas anteriores falharam calado: usar um trecho curto qualquer deixou 7
  // remendos de fora, e usar o texto final inteiro fez a 2ª rodada DUPLICAR o MC_DATA e o
  // rodapé dos Awards (numa inserção pura, o contexto sobrevive e a âncora casa de novo).
  // Remendo que só APAGA não tem marca própria (não acrescenta texto): a prova de que já
  // rodou é a AUSÊNCIA do trecho removido. Sem tratar isso a geração da tabela abortava,
  // e uma tabela vazia publica o site SEM NENHUMA ligação , foi o que eu acabei de fazer.
  if (p.ausente !== undefined) { if (!d.includes(p.ausente)) { jaPrevias++; continue; } }
  else if (d.includes(p.marca)) { jaPrevias++; continue; }
  const n = d.split(p.de).length - 1;
  if (n !== 1) {
    console.error(`\n✗ ÂNCORA DAS PRÉVIAS ${n === 0 ? 'SUMIU' : `APARECE ${n}x`}:`);
    console.error(p.de.slice(0, 200));
    console.error('\nO Design mexeu nesse trecho. Regere a tabela (ver comentário do remendo 17).');
    process.exit(1);
  }
  d = trocar(d, p.de, p.para);
  novasPrevias++;
}
feitos.push(`prévias da home (${novasPrevias} aplicadas, ${jaPrevias} já estavam)`);

// ─────────────────────────────────────────────── 17b. página da Análise e datas do GEX
//
// ACHADO 05/08: a PÁGINA de Análise Diária , a ferramenta que 316 membros do Telegram
// usam todo dia , tinha os 4 ativos ESCRITOS na casca: CL a 79.07, ES a 7,496.25, com
// viés e níveis inventados junto. Eu tinha plugado só a prévia do NQ na home e dei a
// página por boa. E o seletor de datas do GEX estava congelado em JULHO (Jul 16 a 27).
remendo('analise da pagina', '_mcLigarAnalisePagina',
  '  _mcLigarAnalise() {',
  `  // Os 4 ativos da página, do daily_analysis de hoje. Se o banco não tiver o ativo,
  // ele simplesmente não entra , nunca completo a lista com número inventado.
  _mcLigarAnalisePagina() {
    if (this._mcAnaPagBuscou) return;
    this._mcAnaPagBuscou = true;
    var self = this;
    var AN = '${ANON}';
    var H = { headers: { apikey: AN, Authorization: 'Bearer ' + AN } };
    var SB = 'https://qfwhduvutfumsaxnuofa.supabase.co/rest/v1/';
    var NOME = { ES: 'S&P 500', NQ: 'Nasdaq 100', CL: 'WTI Crude Oil', GC: 'Gold' };
    Promise.all([
      fetch(SB + 'daily_analysis?select=*&order=date.desc&limit=16', H).then(function (r) { return r.ok ? r.json() : []; }),
      fetch(SB + 'gex_levels?select=date&order=date.desc&limit=60', H).then(function (r) { return r.ok ? r.json() : []; })
    ]).then(function (res) {
      var linhas = res[0] || [], datas = res[1] || [];
      if (linhas.length) {
        var vistos = {}, cards = [];
        linhas.forEach(function (a) {
          if (vistos[a.asset] || cards.length >= 4) return;
          vistos[a.asset] = 1;
          var pos = Number(a.change_pct) >= 0;
          var vies = String(a.bias || '').toUpperCase();
          var rgb = vies === 'BULLISH' ? '52,211,153' : (vies === 'BEARISH' ? '239,68,68' : '191,255,0');
          var txt = vies === 'BULLISH' ? '#34d399' : (vies === 'BEARISH' ? '#f87171' : '#bfff00');
          cards.push({
            sym: a.asset,
            desc: NOME[a.asset] || a.asset_name || a.asset,
            price: Number(a.last_price).toLocaleString('en-US', { maximumFractionDigits: 2 }),
            chg: (a.change_pct > 0 ? '+' : '') + a.change_pct + '%',
            chgColor: pos ? '#34d399' : '#f87171',
            bias: vies,
            biasStyle: 'display:inline-block;padding:5px 12px;border-radius:8px;font-size:11px;' +
                       'font-weight:800;letter-spacing:0.06em;background:rgba(' + rgb + ',0.14);color:' + txt + ';',
            s1: a.support_1 != null ? String(a.support_1) : '',
            r1: a.resistance_1 != null ? String(a.resistance_1) : '',
            s2: a.support_2 != null ? String(a.support_2) : '',
            r2: a.resistance_2 != null ? String(a.resistance_2) : '',
            // GRAFICO DE VERDADE. A casca desenhava uma caixa vazia escrita
            // "TradingView chart · ES · 1h" , e a propria pagina promete logo acima
            // "Live TradingView chart embedded for each asset". Era claim sem entrega.
            // Simbolo de FUTURO CONTINUO da CME, que e o que a analise cobre.
            chartUrl: (function (sym) {
              // ⚠️ FUTURO DA CME NAO ABRE no widget gratuito , o TradingView devolve
              // "The content is not available" (caixa branca no meio do card escuro).
              // O proprio rodape desta pagina ja diz o certo: "Charts display real-time
              // spot indices (NDX, SPX, GOLD, USOIL) that closely track the corresponding
              // futures". Uso exatamente esses, entao o grafico abre E o aviso continua
              // verdadeiro , nao invento que e o futuro.
              // ⚠️ Nem todo simbolo abre no widget gratuito. Testado na tela:
              // CME_MINI:ES1! e NASDAQ:NDX -> "The content is not available" (caixa
              // branca). TVC:USOIL e TVC:GOLD abrem. Pros indices uso os feeds livres
              // da FOREXCOM, que sao os mesmos spot citados no aviso do rodape.
              var S = { ES: 'FOREXCOM:SPXUSD', NQ: 'FOREXCOM:NSXUSD', CL: 'TVC:USOIL', GC: 'TVC:GOLD' };
              var cfg = {
                symbol: S[sym] || 'FOREXCOM:SPXUSD',
                interval: '60', timezone: 'Etc/UTC', theme: 'dark', style: '1',
                locale: 'en', hide_top_toolbar: true, hide_legend: false,
                allow_symbol_change: false, save_image: false,
                backgroundColor: 'rgba(10,14,8,1)', gridColor: 'rgba(255,255,255,0.05)',
                width: '100%', height: '100%'
              };
              return 'https://s.tradingview.com/widgetembed/?locale=en#' + encodeURIComponent(JSON.stringify(cfg));
            })(a.asset)
          });
        });
        if (cards.length) self._mcAnaCards = cards;
        // ZONA DE ATENCAO e NOTICIAS , estavam ESCRITAS na casca ("Zero Gamma at 7539",
        // "Pivot S1 (79.00)"), numeros de outro dia na ferramenta que 316 membros usam.
        // Os campos sao MULTILINGUES no banco ({en,pt,...}), nao string , sem tratar,
        // a tela mostraria "[object Object]".
        // ⚠️ ESTAVA PEGANDO SEMPRE O INGLES. O campo e multilingue no banco
        // ({en,pt,es,...}) e eu lia "v.en" primeiro, entao o brasileiro via a analise
        // em ingles mesmo com o site em portugues , numa ferramenta que 316 membros do
        // Telegram usam todo dia. Agora segue o idioma da pagina.
        var _lg = (function () {
          try {
            var l = (document.documentElement.lang || '').toLowerCase().slice(0, 2);
            return l || 'en';
          } catch (e) { return 'en'; }
        })();
        var txt = function (v) {
          if (v == null) return '';
          if (typeof v === 'object') return v[_lg] || v.en || v.pt || '';
          return String(v);
        };
        // O OFICIAL mostra, por ativo: zona de atencao, contexto, volume, cenario
        // favoravel, cenario alternativo e impacto de noticias. O novo mostrava so os
        // dois primeiros. Como o molde do cartao tem 2 campos, eu gero 3 cartoes por
        // ativo e os ROTULOS viraram binding (t1/t2) , sem inventar marcacao nova.
        var notas = [];
        var vistos2 = {};
        linhas.forEach(function (a) {
          if (vistos2[a.asset]) return;
          vistos2[a.asset] = 1;
          if (notas.length >= 12) return;
          var sym = a.asset;
          var zona = txt(a.attention_zone), news = txt(a.news_impact);
          var bull = txt(a.scenario_bull), bear = txt(a.scenario_bear);
          var vol = txt(a.volume_analysis), vix = txt(a.vix_context);
          var ctx = txt(a.context);
          if (zona || news) notas.push({ t1: sym + ' · Attention Zone', zone: zona, t2: sym + ' · News Impact', news: news });
          if (bull || bear) notas.push({ t1: sym + ' · Favorable Scenario', zone: bull, t2: sym + ' · Alternative Scenario', news: bear });
          if (vol || vix || ctx) notas.push({ t1: sym + ' · Volume', zone: vol, t2: sym + (vix ? ' · VIX Context' : ' · Market Context'), news: vix || ctx });
        });
        if (notas.length) self._mcAnaNotas = notas;
      }
      if (datas.length) {
        var ja = {}, uniq = [];
        datas.forEach(function (x) { if (x.date && !ja[x.date]) { ja[x.date] = 1; uniq.push(x.date); } });
        var M = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
        self._mcGexDatas = uniq.slice(0, 8).map(function (iso) {
          var pd = iso.split('-');
          return { k: iso, l: M[Number(pd[1]) - 1] + ' ' + Number(pd[2]) };
        });
      }
      self._homeStatic = null;
      self.setState({ _mcAnaPag: 1 });
    }).catch(function () {});
  }

  _mcLigarAnalise() {`);

remendo('chamada da analise da pagina', 'this._mcLigarAnalisePagina();',
  '    this._mcLigarAnalise();',
  '    this._mcLigarAnalise();' + String.fromCharCode(10) + '    this._mcLigarAnalisePagina();');

// Estes dois vêm de tabela GERADA do texto exato da casca , eu ia contar colchete na mão
// pra fechar o array e foi exatamente assim que quebrei a página 3× em 04/08.
// A casca monta os artigos numa funcao com `const posts = [...]` escrito. Eu tinha
// criado _mcBlogPag e esquecido de LIGAR , os dados chegavam do banco e ninguem usava.
// 🚨 COMPLIANCE , NAO REMOVER. O chat do Live Room veio com "Long ES 7620",
// "TP1 hit, moving stop to BE" e "FVG on the 15m": entrada, take profit e stop, que sao
// PROIBIDOS em superficie publica. Ja tinhamos tirado isso em 04/08 e VOLTOU na entrega
// nova do Design , prova de que toda entrega tem que passar por este filtro de novo.
// O Live Room e "conteudo exclusivo VIP, nunca sinais".
const COMPL = JSON.parse(fs.readFileSync('scripts/remendos-compliance.json', 'utf8'));
for (const r of COMPL) {
  if (d.includes(r.marca)) { pulados.push(r.nome); continue; }
  const n = d.split(r.de).length - 1;
  if (n !== 1) { console.error(`
✗ ANCORA de compliance ${n === 0 ? 'SUMIU' : `APARECE ${n}x`}: ${r.nome}`); process.exit(1); }
  d = trocar(d, r.de, r.para);
  feitos.push(r.nome);
}

// ⚠️ SAO DOIS PORTOES: o sc-if das notas (analysisUnlocked) e o BORRAO dos cards
// (analysisLocked/analysisBlur). Abri o primeiro e o "Unlock full access" continuou na
// tela , conferir a tela depois de cada um, nao supor que era o mesmo.
remendo('analise sem borrao', 'analysisLocked: false',
  '      analysisLocked: !s.authed,',
  '      analysisLocked: false,');
remendo('analise sem blur', "analysisBlur: 'none',",
  "      analysisBlur: s.authed ? 'none' : 'blur(7px)',",
  "      analysisBlur: 'none',");
remendo('analise clicavel', "analysisPE: 'auto',",
  "      analysisPE: s.authed ? 'auto' : 'none',",
  "      analysisPE: 'auto',");

remendo('analise sempre visivel', 'analysisSempre:',
  '      analysisLocked: false,',
  '      analysisSempre: true,' + String.fromCharCode(10) + '      analysisLocked: false,');

const NOTAS2 = JSON.parse(fs.readFileSync('scripts/remendos-notas2.json', 'utf8'));
for (const r of NOTAS2) {
  if (d.includes(r.marca)) { pulados.push(r.nome); continue; }
  const n = d.split(r.de).length - 1;
  if (n !== 1) { console.error(`\n✗ ANCORA ${r.nome} ${n === 0 ? 'SUMIU' : `APARECE ${n}x`}`); process.exit(1); }
  d = trocar(d, r.de, r.para);
  feitos.push(r.nome);
}

const NOTAS = JSON.parse(fs.readFileSync('scripts/remendos-notas.json', 'utf8'));
for (const r of NOTAS) {
  if (d.includes(r.marca)) { pulados.push(r.nome); continue; }
  const n = d.split(r.de).length - 1;
  if (n !== 1) { console.error(`\n✗ ANCORA das notas ${n === 0 ? 'SUMIU' : `APARECE ${n}x`}`); process.exit(1); }
  d = trocar(d, r.de, r.para);
  feitos.push(r.nome);
}

// PRECO DE PLATAFORMA , o pacote do Design trazia "$12.95 /mo · save 17%" pra
// TradingView. O proprio LEIA-ME dele avisa: "todo dado esta escrito a mao" e
// "preco so aparece quando existe, nunca invente valor". Conferido na fonte
// (tradingview.com/pricing, 06/08): o preco e GEO-DEPENDENTE (daqui aparece
// R$66,95) e sai como "Special price" promocional , numero fixo em dolar estaria
// errado pros 75% de trafego da India. O desconto de 17% e o credito de $15 sao
// NOSSOS (vem do PLATFORMS do app.js) e esses sim podem ser afirmados.
// RODAPE , a coluna "Trading Firms" era lista escrita a mao com 18 nomes, e trazia a
// GOAT FUNDED FUTURES, tirada do ar em 28/jul (painel de afiliado sumiu e trader sem
// sacar; as 296 URLs viraram 301). Levava o visitante pra uma firma que nao existe mais
// no site. Faltava a Funded Futures Family, que esta ativa. Agora vem do banco.
const RODAPE = JSON.parse(fs.readFileSync('scripts/remendos-rodape.json', 'utf8'));
// ⚠️ QUEBRA DE LINHA DO WINDOWS: o arquivo do Design vem com CRLF e o git converte
// de volta a cada checkout. O Python monta a tabela lendo em modo texto (converte e
// casa), o Node le CRU e NAO casa , a ancora "some" mesmo estando la, e o remendo
// falha em cima de um arquivo intacto. Ja esta no CLAUDE.md e me pegou de novo.
const LF = String.fromCharCode(10);
const CRLF = String.fromCharCode(13, 10);
for (const r of RODAPE) {
  if (d.includes(r.marca)) { pulados.push(r.nome); continue; }
  if (!d.includes(r.de) && d.includes(r.de.split(LF).join(CRLF))) {
    r.de = r.de.split(LF).join(CRLF);
    r.para = r.para.split(LF).join(CRLF);
  }
  const n = d.split(r.de).length - 1;
  if (n !== 1) { console.error(`
✗ ANCORA ${r.nome} ${n === 0 ? 'SUMIU' : `APARECE ${n}x`}`); process.exit(1); }
  d = trocar(d, r.de, r.para);
  feitos.push(r.nome);
}

const PLAT_TAB = JSON.parse(fs.readFileSync('scripts/remendos-plataformas.json', 'utf8'));
for (const r of PLAT_TAB) {
  if (d.includes(r.marca)) { pulados.push(r.nome); continue; }
  const n = d.split(r.de).length - 1;
  if (n !== 1) { console.error(`
✗ ANCORA ${r.nome} ${n === 0 ? 'SUMIU' : `APARECE ${n}x`}`); process.exit(1); }
  d = trocar(d, r.de, r.para);
  feitos.push(r.nome);
}

const GRAF = JSON.parse(fs.readFileSync('scripts/remendos-grafico.json', 'utf8'));
for (const r of GRAF) {
  if (d.includes(r.marca)) { pulados.push(r.nome); continue; }
  const n = d.split(r.de).length - 1;
  if (n !== 1) { console.error(`\n✗ ANCORA do grafico ${n === 0 ? 'SUMIU' : `APARECE ${n}x`}`); process.exit(1); }
  d = trocar(d, r.de, r.para);
  feitos.push(r.nome);
}

const BLOGTAB = JSON.parse(fs.readFileSync('scripts/remendos-blog.json', 'utf8'));
for (const r of BLOGTAB) {
  if (d.includes(r.marca)) { pulados.push(r.nome); continue; }
  const n = d.split(r.de).length - 1;
  if (n !== 1) { console.error(`
✗ ÂNCORA do blog ${n === 0 ? 'SUMIU' : `APARECE ${n}x`}`); process.exit(1); }
  d = trocar(d, r.de, r.para);
  feitos.push(r.nome);
}

const ANALISE = JSON.parse(fs.readFileSync('scripts/remendos-analise.json', 'utf8'));
for (const r of ANALISE) {
  if (d.includes(r.marca)) { pulados.push(r.nome); continue; }
  const n = d.split(r.de).length - 1;
  if (n !== 1) {
    console.error(`\n✗ ÂNCORA ${n === 0 ? 'SUMIU' : `APARECE ${n}x`} em "${r.nome}"`);
    process.exit(1);
  }
  d = trocar(d, r.de, r.para);
  feitos.push(r.nome);
}



// ─────────────────────────────────────────────── fim
fs.writeFileSync(ARQ, d);
const tags = { ab: (d.match(/<sc-for/g) || []).length, fe: (d.match(/<\/sc-for>/g) || []).length };
console.log(`aplicados : ${feitos.join(', ') || '(nenhum)'}`);
if (pulados.length) console.log(`já estavam: ${pulados.join(', ')}`);
console.log(`sc-for    : ${tags.ab} abertos / ${tags.fe} fechados${tags.ab === tags.fe ? ' ok' : '  ⚠️ DESBALANCEADO , a página inteira quebra'}`);
if (tags.ab !== tags.fe) process.exit(1);
