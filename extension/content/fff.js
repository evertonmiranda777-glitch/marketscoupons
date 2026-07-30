// Funded Futures Family (FFF): app.fundedfuturesfamily.com/affiliate/affiliate-orders/
// Painel proprio (app), mesmo padrao do FundingPips. Parser adaptativo de tabela de orders.
(async () => {
  try {
    const auto = await mcShouldFFF('fff');
    if (!auto) return;
    await mcSyncFFF({ auto: true });
  } catch (e) { console.warn('[MC] fff auto-sync erro:', e); }
})();

// SPA-aware: a FFF e React, navegacao client-side (ex: Dashboard -> Orders) NAO
// re-injeta o content script, entao o auto-sync do load nunca via a tabela. Poll leve:
// quando a tabela de orders aparecer na tela e o throttle (30min) permitir, sincroniza sozinho.
// Assim basta VISITAR a pagina de orders (sem recarregar nem clicar Sync) que ela entra no banco.
setInterval(async () => {
  try {
    const hasOrders = [...document.querySelectorAll('table thead th')].some(th => /date/i.test(th.textContent)) &&
                      document.querySelector('table tbody tr');
    if (!hasOrders) return;
    if (await mcShouldFFF('fff')) await mcSyncFFF({ auto: true });
  } catch (e) { /* silent */ }
}, 10000);

async function mcShouldFFF(firmId) {
  return new Promise(resolve => {
    chrome.storage.local.get(['mc_last_sync'], r => {
      const last = (r.mc_last_sync || {})[firmId] || 0;
      // near-real-time: com o tab de orders aberto, re-sincroniza a cada ~2min (era 30)
      resolve((Date.now() - last) / 60000 >= 2);
    });
  });
}

async function mcMarkFFF(firmId) {
  return new Promise(resolve => {
    chrome.storage.local.get(['mc_last_sync'], r => {
      const map = r.mc_last_sync || {};
      map[firmId] = Date.now();
      chrome.storage.local.set({ mc_last_sync: map }, resolve);
    });
  });
}

// Espera a grid React montar E rola a tabela ate o fim pra capturar TODAS as linhas.
// A tabela de orders da FFF pagina/virtualiza: sem rolar, so as linhas visiveis entravam
// no banco (era isso que perdia ~4 orders de 79). Agora rola sozinha, sem depender de clique.
async function mcWaitFFFTable(maxMs = 20000, stepMs = 600) {
  const deadline = Date.now() + maxMs;
  while (Date.now() < deadline) {
    if (mcFFFParseVisible().length) break;   // espera a 1a linha renderizar
    await new Promise(r => setTimeout(r, stepMs));
  }
  return await mcFFFCollectAll();            // rola + acumula todas as linhas unicas
}

// Lista elementos rolaveis: a janela + o ancestral rolavel da tabela de orders.
function mcFFFScrollers() {
  const set = new Set();
  set.add(document.scrollingElement || document.documentElement);
  document.querySelectorAll('table, [role="table"], [role="grid"]').forEach(t => {
    let el = t;
    for (let d = 0; d < 8 && el; d++) {
      const cs = getComputedStyle(el);
      if (/(auto|scroll)/.test(cs.overflowY) && el.scrollHeight > el.clientHeight + 10) { set.add(el); break; }
      el = el.parentElement;
    }
  });
  return [...set];
}

// Rola de cima a baixo acumulando linhas unicas por assinatura. Cobre lazy-load (linhas
// adicionadas ao rolar) E virtualizacao (linhas trocadas ao rolar). Restaura o scroll no fim
// pra nao atrapalhar quem esta olhando a pagina.
async function mcFFFCollectAll(maxSteps = 80) {
  const scrollers = mcFFFScrollers();
  const saved = scrollers.map(el => el.scrollTop);
  const byKey = new Map();
  const collect = () => { for (const r of mcFFFParseVisible()) byKey.set(r._sig, r); };
  // comeca do topo pra nao perder as primeiras
  scrollers.forEach(el => { el.scrollTop = 0; });
  await new Promise(r => setTimeout(r, 250));
  collect();
  let stable = 0, last = 0;
  for (let i = 0; i < maxSteps; i++) {
    let moved = false;
    for (const el of scrollers) {
      const before = el.scrollTop;
      el.scrollTop = Math.min(el.scrollHeight, el.scrollTop + Math.max(300, el.clientHeight - 80));
      if (el.scrollTop > before + 2) moved = true;
    }
    await new Promise(r => setTimeout(r, 320));
    collect();
    if (byKey.size === last) stable++; else { stable = 0; last = byKey.size; }
    if (!moved && stable >= 3) break; // no fundo e parou de crescer
  }
  // restaura posicao original
  scrollers.forEach((el, i) => { el.scrollTop = saved[i]; });
  return [...byKey.values()];
}

async function mcSyncFFF(opts = {}) {
  // ---------------------------------------------------------------------------
  // LE A API, NAO A TELA (v0.5.0, 29/07/2026).
  //
  // O que a raspagem de DOM nunca ia resolver: a tabela e' MUI TablePagination,
  // 30 linhas por pagina, botoes 1..5. O mcFFFCollectAll ROLAVA, mas rolar nao
  // vira pagina , entao a extensao SO ENXERGAVA A PAGINA 1, sempre. Sintoma que
  // o Everton pegou: painel oficial 23 vendas / $47.98 no dia, admin 11 / $29.02.
  // A tentativa anterior de tapar isso (somar o total oficial e jogar a diferenca
  // no dia mais recente) virou dado inventado , o acumulado da vida inteira
  // aparecendo como venda de hoje.
  //
  // O painel e' Next.js e busca de uma API REST no MESMO dominio, entao o content
  // script pode chamar direto com o cookie de sessao:
  //   GET /api/dashboard/affiliate-orders/?filter=all_time&page_size=100&page=N
  //   -> { success, data: { count, results:[...], totals, sales } }
  // Cada item traz commission_amount, order_date em ISO UTC, order_final_amount,
  // coupon_code e transaction_id. Venda a venda, sem paginacao pra adivinhar.
  //
  // Conferido em 29/07 contra o painel, ao vivo: count 125 = 125 baixadas em 2
  // paginas; soma das comissoes $338.28 = "Grand Total Commission"; o dia
  // 2026-07-29 deu 23 vendas / $47.98 = exatamente o painel filtrado no dia.
  //
  // Data em ISO UTC tambem mata o parse de "07-29-202605:03 PM" (data e hora
  // colados, sem separador) que a tabela renderiza.
  // ---------------------------------------------------------------------------
  var pedidos = [];
  var contaOficial = null;
  try {
    for (var pag = 1; pag <= 40; pag++) {
      var r = await fetch('/api/dashboard/affiliate-orders/?filter=all_time&page_size=100&page=' + pag, { credentials: 'include' });
      if (!r.ok) throw new Error('HTTP ' + r.status);
      var j = await r.json();
      var d = (j && j.data) || {};
      contaOficial = (typeof d.count === 'number') ? d.count : contaOficial;
      var res = d.results || [];
      pedidos = pedidos.concat(res);
      if (!res.length) break;
      if (contaOficial != null && pedidos.length >= contaOficial) break;
    }
  } catch (e) {
    // Sem a API nao inventa nada e nao grava pedaco: avisa e sai.
    mcToastFFF('FFF: nao consegui ler a API de orders (' + (e.message || e) + '). Nada foi gravado.');
    return { ok: false, error: 'api_falhou' };
  }
  if (!pedidos.length) { mcToastFFF('FFF: a API nao devolveu nenhuma order.'); return { ok: false, error: 'no_data' }; }

  // Conferencia de completude: se baixou menos que o count oficial, NAO grava.
  // Gravar parcial e' o que fazia o mes ficar menor que o dia.
  if (contaOficial != null && pedidos.length < contaOficial) {
    mcToastFFF('FFF: baixei ' + pedidos.length + ' de ' + contaOficial + ' orders. Parcial NAO e gravado.');
    return { ok: false, error: 'incompleto', baixadas: pedidos.length, total: contaOficial };
  }

  // Dia de calendario em BRT, que e' o fuso que o resto do admin usa
  // (ad_spend_daily e affiliate_daily_stats sao dia LOCAL, ver admin.html _localDay).
  // O painel da FFF mostra ET, entao perto da meia-noite um dia pode diferir de 1-2
  // orders , o acumulado fecha igual, o corte do dia e' que muda de fuso.
  var diaBRT = function (iso) {
    try { return new Date(iso).toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' }); }
    catch (e) { return String(iso).slice(0, 10); }
  };

  var porDia = {};
  var leads = [];
  pedidos.forEach(function (o) {
    var iso = o.order_date;
    if (!iso) return;
    var dia = diaBRT(iso);
    var com = Number(o.commission_amount) || 0;
    var val = Number(o.order_final_amount) || 0;
    if (!porDia[dia]) porDia[dia] = { date: dia, transactions: 0, commission: 0, granularity: 'day' };
    porDia[dia].transactions += 1;
    porDia[dia].commission += com;
    // transaction_id no MESMO formato de antes ('fff:' + 1o segmento) pra nao duplicar
    // as vendas que ja estao gravadas em affiliate_conversions.
    var txn = String(o.transaction_id || o.order_id || '').split('#')[0].trim();
    leads.push({
      transaction_id: txn ? ('fff:' + txn) : undefined,
      order_id: txn ? undefined : o.order_id,
      date: dia,
      sold_at: iso,               // timestamp REAL da venda (a finance-sync usa se vier)
      commission: com,
      amount: val,
      coupon: o.coupon_code || '',
      product: o.product_name || o.account_type || '',
      status: 'approved'
    });
  });
  Object.keys(porDia).forEach(function (k) {
    porDia[k].commission = Math.round(porDia[k].commission * 100) / 100;
  });
  var rows = Object.keys(porDia).map(function (k) { return porDia[k]; });

  // fff_replace NAO e' mais mandado: ele disparava um delete de TODA a FFF no
  // servidor, e com scrape parcial isso apagava o historico. O upsert por
  // (firma, data) ja substitui exatamente os dias que estao neste lote.
  var out = await mcSendFFF({
    firm: 'funded-futures-family', source: 'ext_fff_v1', snapshot: null,
    rows: rows, leads: leads, parser_version: '0.5.0'
  });
  if (out.ok) {
    mcToastFFF('FFF: ' + pedidos.length + '/' + contaOficial + ' orders da API, ' + rows.length + ' dias, ' + (out.leads_saved != null ? out.leads_saved : '?') + ' vendas gravadas');
    await mcMarkFFF('fff');
  } else {
    mcToastFFF('FFF: erro, ' + (out.error || '?'));
  }
  return out;
}

// Parseia as linhas ATUALMENTE renderizadas (uma passada). mcFFFCollectAll chama varias
// vezes enquanto rola, acumulando por _sig. Cobre <table> classico E grids React.
function mcFFFParseVisible() {
  const out = [];
  document.querySelectorAll('table, [role="table"], [role="grid"]').forEach(t => {
    const head = [...t.querySelectorAll('thead th, [role="columnheader"]')].map(x => x.textContent.trim().toLowerCase());
    if (!head.length) return;
    const hasDate = head.some(h => h.includes('date') || h.includes('data') || h.includes('created') || h.includes('time'));
    const hasValue = head.some(h => h.includes('commission') || h.includes('comiss') || h.includes('earning') || h.includes('payout') || h.includes('amount') || h.includes('total') || h.includes('valor') || h.includes('reward'));
    if (!hasDate || !hasValue) return;
    const iDate = head.findIndex(h => h.includes('date') || h.includes('data') || h.includes('created') || h.includes('time'));
    // "Commission" EXATO ($) , NÃO "Commission Type" (que é texto tipo "Purchase")
    const iComExact = head.findIndex(h => h === 'commission');
    const iCom = iComExact !== -1 ? iComExact
      : head.findIndex(h => (h.includes('commission') || h.includes('comiss') || h.includes('earning') || h.includes('payout') || h.includes('reward')) && !h.includes('type'));
    // valor da venda: "Final Amount" (o que o cliente pagou) > amount > total
    const iFinal = head.findIndex(h => h.includes('final'));
    const iAmt = iFinal !== -1 ? iFinal : head.findIndex(h => h.includes('amount') || h.includes('valor') || h.includes('total'));
    const iTxn = head.findIndex(h => h.includes('transaction'));
    const iStatus = head.findIndex(h => h.includes('status'));
    t.querySelectorAll('tbody tr, [role="row"]').forEach(tr => {
      const cells = [...tr.querySelectorAll('td, [role="cell"], [role="gridcell"]')].map(x => x.textContent.trim());
      if (!cells.length) return;
      if (/^total/i.test(cells[0] || '')) return; // linha de resumo "Total:"
      // ignora orders cancelados/estornados/rejeitados (nao contam comissao)
      if (iStatus >= 0 && /cancel|refund|void|reject|declin|fail/i.test(cells[iStatus] || '')) return;
      const d = mcFFFParseDate(cells[iDate]);
      if (!d) return;
      const commission = iCom >= 0 ? mcFFFNum(cells[iCom]) : 0;
      const amount = iAmt >= 0 ? mcFFFNum(cells[iAmt]) : commission;
      const txn = iTxn >= 0 ? (cells[iTxn] || '').split('#')[0].trim() : '';
      // assinatura unica da linha (dedup no acumulo do scroll): txn se houver, senao
      // data+valor+texto da linha inteira -> orders distintas NAO colapsam mesmo sem coluna de id.
      const rowText = cells.join('|').slice(0, 90);
      const _sig = txn ? ('t:' + txn) : ('r:' + d + '|' + commission + '|' + amount + '|' + rowText);
      out.push({ date: d, commission, amount, transaction_id: txn ? ('fff:' + txn) : undefined, _sig });
    });
  });
  return out;
}

// Le o total OFICIAL do resumo da FFF (cartoes "Total Purchase Commission" / "Grand Total
// Commission" e "Total Orders"). Numeros estaveis, imunes a paginacao/virtualizacao da tabela.
function mcFFFScrapeSummary() {
  const cardVal = (labelRe, valRe) => {
    const leaves = [...document.querySelectorAll('div,span,p,h1,h2,h3,h4,label')]
      .filter(e => labelRe.test((e.textContent || '').trim()) && (e.textContent || '').length < 70);
    for (const el of leaves) {
      let p = el;
      for (let d = 0; d < 3 && p; d++) {           // sobe do rotulo ate o cartao (pouco, p/ nao pegar cartao vizinho)
        const m = (p.textContent || '').match(valRe);
        if (m) return m[1];
        p = p.parentElement;
      }
    }
    return null;
  };
  const c = cardVal(/(grand total|total purchase)\s+commission/i, /\$\s*([\d,]+\.\d{2})/);
  const o = cardVal(/total orders/i, /total orders\D*(\d{1,5})/i);
  return {
    total: c ? parseFloat(c.replace(/,/g, '')) : null,
    orders: o ? parseInt(o, 10) : null
  };
}

function mcFFFNum(s) {
  if (s === '' || s == null) return 0;
  const n = parseFloat(String(s).replace(/[^\d.,\-]/g, '').replace(/\.(?=\d{3}\b)/g, '').replace(',', '.'));
  return isNaN(n) ? 0 : n;
}

function mcFFFParseDate(s) {
  if (!s) return null;
  let m = /(\d{4})-(\d{2})-(\d{2})/.exec(s);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  m = /^(\d{1,2})[./\-](\d{1,2})[./\-](\d{4})/.exec(s);
  if (m) return `${m[3]}-${String(m[1]).padStart(2,'0')}-${String(m[2]).padStart(2,'0')}`; // FFF = MM-DD-YYYY (US)
  const months = { jan:'01',feb:'02',mar:'03',apr:'04',may:'05',jun:'06',jul:'07',aug:'08',sep:'09',oct:'10',nov:'11',dec:'12' };
  m = /([A-Za-z]{3,})\s+(\d{1,2}),?\s+(\d{4})/.exec(s);
  if (m) { const mm = months[m[1].slice(0,3).toLowerCase()]; if (mm) return `${m[3]}-${mm}-${String(m[2]).padStart(2,'0')}`; }
  return null;
}

async function mcSendFFF(payload) {
  try {
    const res = await fetch(MC_CONFIG.endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + MC_CONFIG.anonKey, 'apikey': MC_CONFIG.anonKey },
      body: JSON.stringify(payload)
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { ok:false, error: data.error || data.message || ('HTTP ' + res.status) };
    return { ok:true, ...data };
  } catch (e) { return { ok:false, error: e.message }; }
}

function mcToastFFF(msg) {
  const el = document.createElement('div');
  el.textContent = '[MC] ' + msg;
  el.style.cssText = 'position:fixed;bottom:20px;right:20px;background:#0a0a0a;color:#f0b429;padding:12px 18px;border-radius:8px;font:13px/1.4 system-ui;z-index:999999;box-shadow:0 8px 24px rgba(0,0,0,.4);border:1px solid rgba(240,180,41,.3);';
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 4000);
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg && msg.action === 'sync_fff') { mcSyncFFF({ auto: false }).then(sendResponse); return true; }
});
