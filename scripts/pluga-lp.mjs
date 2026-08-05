#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// PLUGA A LP NOVA (/novo-lp) NO BANCO , mesma doutrina do pluga-site-novo.mjs:
// cada remendo é idempotente e FALHA ALTO se a âncora sumir.
//
// Diagnóstico 05/08 que motivou isto (a LP era uma vitrine morta):
//   · ZERO <a> na página inteira e 10 botões SEM handler , incluindo os 5
//     "Buy with discount" (o botão de comissão) e o SUBSCRIBE (lead jogado fora).
//   · Nenhuma chamada ao banco: preço/desconto/cupom CHUMBADOS do dia do build.
//     TradeDay já estava velho (LP 50% $230/$115 · banco 55% $240/$108) e
//     Bulenox idem (LP $14.65/$135 · banco $15.95/$145). Preço chumbado apodrece.
//   · "4.2 average" também chumbado (média real hoje: 4.37) e 4 fotos de
//     reviewers que NÃO EXISTEM (r1..r4.png = 404 no console).
//
// Rodar SEMPRE depois de desempacotar uma entrega nova da LP:
//   node scripts/desempacota-design.mjs <arquivo-lp> novo-lp /novo-lp
//   node scripts/pluga-lp.mjs
// ─────────────────────────────────────────────────────────────────────────────
import fs from 'node:fs';

const ARQ = 'novo-lp/index.html';
let d = fs.readFileSync(ARQ, 'utf8');

const ANON = (fs.readFileSync('index.html', 'utf8').match(/eyJ[A-Za-z0-9_.-]{60,}/) || [])[0];
if (!ANON) { console.error('✗ nao achei a anon key no index.html'); process.exit(1); }

const feitos = [], pulados = [];
// ⚠️ NUNCA usar d.replace(de, para) aqui: no String.replace do JS, "$'" DENTRO do texto
// novo significa "tudo depois da âncora" , e código com preço tem '$' pra todo lado
// ('Velocity|$' + ...). O primeiro teste deste script DUPLICOU o rabo do arquivo por
// isso. split/join não tem semântica de $.
function trocar(txt, de, para) { return txt.split(de).join(para); }
function remendo(nome, marca, de, para) {
  if (d.includes(marca)) { pulados.push(nome); return; }
  const n = d.split(de).length - 1;
  if (n !== 1) {
    console.error(`\n✗ ÂNCORA ${n === 0 ? 'SUMIU' : `APARECE ${n}x`} em "${nome}":`);
    console.error(de.slice(0, 160));
    process.exit(1);
  }
  d = trocar(d, de, para);
  feitos.push(nome);
}

// ─────────────────────────────── 1. banco ao vivo
// Preço, desconto, cupom, rating e reviews saem do cms_firms na hora, nunca do
// arquivo. O id 'fff' da LP é 'funded-futures-family' no banco.
remendo('banco ao vivo', '_lpBanco',
  '  renderVals() {',
  `  _lpBanco() {
    if (this._lpBuscou) return;
    this._lpBuscou = true;
    var self = this;
    var AN = '${ANON}';
    var IDS = { apex: 'apex', bulenox: 'bulenox', fff: 'funded-futures-family', fn: 'fn', tradeday: 'tradeday' };
    var kfmt = function (n) { n = parseInt(n, 10) || 0; return n >= 1000 ? (n / 1000).toFixed(1).replace(/\\.0$/, '') + 'K' : String(n); };
    fetch('https://qfwhduvutfumsaxnuofa.supabase.co/rest/v1/cms_firms?active=eq.true&select=id,discount,coupon,link,rating,trustpilot_reviews,prices',
      { headers: { apikey: AN, Authorization: 'Bearer ' + AN } })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (linhas) {
        if (!linhas || !linhas.length) return;   // banco fora: fica o retrato, nunca esvazia
        var por = {}; linhas.forEach(function (x) { por[x.id] = x; });
        self._lpLinks = {};
        // media REAL do rating das firmas listadas ("4.2" era chumbado; hoje da 4.37)
        var rs = linhas.map(function (x) { return parseFloat(x.rating); }).filter(function (x) { return x; });
        if (rs.length) self._lpMedia = (rs.reduce(function (a, b) { return a + b; }, 0) / rs.length).toFixed(1);
        self.firms.forEach(function (f) {
          var b = por[IDS[f.id]];
          if (!b) return;
          self._lpLinks[f.id] = b.link || '';
          if (b.discount) f.discount = b.discount + '%';
          if (b.coupon) f.coupon = b.coupon;
          if (b.rating != null) f.rating = String(b.rating);
          if (b.trustpilot_reviews) f.reviews = kfmt(b.trustpilot_reviews);
          // preços: traduz cada linha do banco pra chave 'Tipo|Tamanho' que a LP usa
          (b.prices || []).forEach(function (p) {
            var a = String(p.a || ''), par = [p.n, p.o];
            if (!p.n) return;
            if (f.id === 'apex' && /^\\d+K$/.test(a)) {
              f.px['Intraday Trail|' + a] = [p.n, p.o];
              if (p.n2) f.px['End of Day|' + a] = [p.n2, p.o2];
            } else if (f.id === 'bulenox' && /^\\d+K$/.test(a)) {
              f.px['EOD DD|' + a] = par;
            } else if (f.id === 'fff') {
              var mV = a.match(/^(\\d+K) Velocity/); if (mV) f.px['Velocity|$' + mV[1]] = par;
            } else if (f.id === 'fn') {
              var mF = a.match(/^(\\$\\d+K) Futures Flex/); if (mF) f.px['Futures Flex|' + mF[1]] = par;
            } else if (f.id === 'tradeday') {
              var mT = a.match(/^(\\d+K) (Intraday|End of Day)/);
              if (mT) f.px[(mT[2] === 'Intraday' ? 'Intraday' : 'End of Day') + '|' + mT[1]] = par;
            }
          });
        });
        self.setState({ _lpBanco: 1 });
      }).catch(function () {});
  }

  renderVals() {
    this._lpBanco();`);

// ─────────────────────────────── 2. handlers dos botões mortos
remendo('handlers', 'goSite:',
  '      toast: s.toast,',
  `      toast: s.toast,
      // Botões que existiam SEM handler nenhum , numa LP de tráfego pago.
      goSite: () => { location.href = '/novo'; },
      goLegacy: () => { location.href = '/apex'; },
      tpMedia: this._lpMedia || '4.4',
      lpSubscribe: () => {
        var inp = document.querySelector('input[placeholder="you@email.com"]');
        var em = inp ? String(inp.value || '').trim().toLowerCase() : '';
        if (!/^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$/.test(em)) { this.setState({ toast: 'Enter a valid email' }); return; }
        try {
          fetch('/api/leads/volumefilter?action=subscribe', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: em, lang: 'en', source: 'novo-lp', tags: ['novo-lp-lead'] })
          });
        } catch (e) {}
        if (inp) inp.value = '';
        this.setState({ toast: 'Subscribed! Watch your inbox.' });
      },`);

// o card precisa do destino de compra (link de afiliado vindo do banco)
remendo('onBuy do card', 'onBuy:',
  '          onCopy: () => this.copy(f),',
  `          onCopy: () => this.copy(f),
          // comissão: abre o link de afiliado LIDO DO BANCO. Sem fallback escrito aqui ,
          // link chumbado foi como a Aqua ficou 152 páginas anunciando domínio morto.
          onBuy: () => {
            var u = (this._lpLinks || {})[f.id];
            if (u) window.open(u, '_blank', 'noopener');
            else location.href = '/' + (f.id === 'fff' ? 'funded-futures-family' : f.id);
          },`);

// ─────────────────────────────── 3. liga os atributos nos botões
function attr(nome, trecho) {
  const marcado = trocar(trecho, '<button ', `<button ${nome} `);
  if (d.includes(marcado)) { pulados.push('attr ' + nome); return; }
  const n = d.split(trecho).length - 1;
  if (n !== 1) { console.error(`\n✗ BOTÃO não achado (${n}x): ${nome}`); process.exit(1); }
  d = trocar(d, trecho, marcado);
  feitos.push('attr ' + nome);
}
attr('sc-camel-on-click="{{ c.onBuy }}"',
  '<button style="display: flex; align-items: center; justify-content: center; gap: 9px; width: 100%; padding: 16px; border-radius: 12px; border: none; cursor: pointer; background: linear-gradient(180deg, #d4ff4d, #bfff00); color: #070a06; font-family: inherit; font-weight: 800; font-size: 15.5px;" style-hover="filter: brightness(1.06);">Buy with discount');
attr('sc-camel-on-click="{{ c.onLegacy }}"',
  '<button style="width: 100%; padding: 14px; border-radius: 12px; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.14); color: #E7ECEF; cursor: pointer; font-family: inherit; font-weight: 700; font-size: 14px;" style-hover="border-color: rgba(191,255,0,0.4); color: #bfff00;">View Legacy Accounts');
attr('sc-camel-on-click="{{ goSite }}"',
  '<button style="display: inline-flex; align-items: center; gap: 8px; padding: 12px 24px; border-radius: 11px; background: rgba(191,255,0,0.1); border: 1px solid rgba(191,255,0,0.35); color: #bfff00; cursor: pointer; font-family: inherit; font-weight: 700; font-size: 14px;" style-hover="background: rgba(191,255,0,0.16);">Explore full site');
attr('sc-camel-on-click="{{ lpSubscribe }}"',
  '<button style="padding: 14px 24px; border-radius: 11px; background: linear-gradient(180deg, #d4ff4d, #bfff00); border: none; color: #070a06; font-family: inherit; font-weight: 800; font-size: 13.5px; letter-spacing: 0.04em; cursor: pointer; white-space: nowrap;" style-hover="filter: brightness(1.06);">SUBSCRIBE');
attr('sc-camel-on-click="{{ goSite }}" data-allfirms="1"',
  '<button style="display: flex; align-items: center; gap: 12px; width: 100%; padding: 18px 20px; border-radius: 15px; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); color: #F4F8F9; cursor: pointer; font-family: inherit; font-weight: 700; font-size: 15px; text-align: left; margin-bottom: 16px;" style-hover="border-color: rgba(191,255,0,0.4);"><i class="ti ti-layout-grid" style="font-size: 19px; color: #bfff00;"></i><span style="flex: 1;">See all 18 firms on the site</span>');
attr('sc-camel-on-click="{{ goSite }}" data-alerts="1"',
  '<button style="display: inline-flex; align-items: center; gap: 9px; padding: 15px 28px; border-radius: 12px; background: linear-gradient(180deg, #d4ff4d, #bfff00); border: none; color: #070a06; cursor: pointer; font-family: inherit; font-weight: 800; font-size: 15px;" style-hover="filter: brightness(1.06);"><i class="ti ti-bell" style="font-size: 17px;"></i>Enable alerts');

// o onLegacy vive no card , precisa entrar no objeto do card também
remendo('goLegacy no card', 'onLegacy:',
  '          hasLegacy: !!f.hasLegacy,',
  `          hasLegacy: !!f.hasLegacy,
          onLegacy: () => { location.href = '/apex'; },`);

// ─────────────────────────────── 3b. caminho dos avatares
// O desempacotador reescreve as referências ESTÁTICAS pra /novo-lp/assets, mas este src é
// montado em JS ('./assets/...') e a rota /novo-lp não tem barra final , './' resolve pra
// RAIZ do domínio e dava 404 nos 4 avatares. Regra antiga do repo: URL absoluta sempre.
remendo('caminho dos avatares', "'/novo-lp/assets/reviewers/r'",
  "src: './assets/reviewers/r' + (i+1) + '.png'",
  "src: '/novo-lp/assets/reviewers/r' + (i+1) + '.png'");

// ─────────────────────────────── 4. média do Trustpilot ao vivo
remendo('media do trustpilot', '{{ tpMedia }}',
  'white-space: nowrap;">4.2 <span style="font-weight: 500; color: #8a94a0;">average of the firms we list</span>',
  'white-space: nowrap;">{{ tpMedia }} <span style="font-weight: 500; color: #8a94a0;">average of the firms we list</span>');

// ─────────────────────────────── fim
fs.writeFileSync(ARQ, d);
console.log(`aplicados : ${feitos.join(', ') || '(nenhum)'}`);
if (pulados.length) console.log(`já estavam: ${pulados.join(', ')}`);
const sf = { ab: (d.match(/<sc-for/g) || []).length, fe: (d.match(/<\/sc-for>/g) || []).length };
console.log(`sc-for    : ${sf.ab} abertos / ${sf.fe} fechados${sf.ab === sf.fe ? ' ok' : ' ⚠️ DESBALANCEADO'}`);
if (sf.ab !== sf.fe) process.exit(1);
