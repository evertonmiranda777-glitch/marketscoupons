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

// Espera a grid React montar (auto-fetch em aba de fundo abre a pagina "crua",
// o document_idle dispara antes das linhas existirem). Poll ate achar linhas ou timeout.
async function mcWaitFFFTable(maxMs = 18000, stepMs = 600) {
  const deadline = Date.now() + maxMs;
  while (Date.now() < deadline) {
    const leads = mcScrapeFFFTable();
    if (leads.length) return leads;
    await new Promise(r => setTimeout(r, stepMs));
  }
  return mcScrapeFFFTable(); // ultima tentativa (pode voltar vazio)
}

async function mcSyncFFF(opts = {}) {
  const leads = await mcWaitFFFTable();
  if (!leads.length) { mcToastFFF('FFF: sem transacoes na pagina (abra affiliate-orders com filter=all_time)'); return { ok:false, error:'no_data' }; }

  const byDay = {};
  leads.forEach(l => {
    if (!l.date) return;
    if (!byDay[l.date]) byDay[l.date] = { date: l.date, transactions: 0, commission: 0, granularity: 'day' };
    byDay[l.date].transactions += 1;
    byDay[l.date].commission += Number(l.commission) || 0;
  });
  const rows = Object.values(byDay);

  const out = await mcSendFFF({ firm: 'funded-futures-family', source: 'ext_fff_v1', snapshot: null, rows, leads });
  if (out.ok) { mcToastFFF(`FFF: ${leads.length} raspadas, ${out.leads_saved ?? '?'} gravadas`); await mcMarkFFF('fff'); }
  else { mcToastFFF('FFF: erro, ' + (out.error || '?')); }
  return out;
}

// Parser adaptativo: acha qualquer tabela/grid com coluna de DATA + coluna de VALOR (comissao/amount).
// Cobre <table> classico E grids React (role="table"/"row"/"cell").
function mcScrapeFFFTable() {
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
      out.push({ date: d, commission, amount, transaction_id: txn ? ('fff:' + txn) : undefined });
    });
  });
  return out;
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
