// Scraper genérico adaptativo para painéis de afiliado app-based (Goat, Top One, Blue Guardian,
// Aqua, Blueberry, Alpha, Futures Elite ...). Mesmo parser do FFF: acha qualquer tabela/grid com
// coluna de DATA + coluna de VALOR (commission/amount) e manda pro finance-sync.
// A firma é identificada pelo hostname (HOST_FIRM). Cada venda vira lead com transaction_id +
// commission + date -> finance-sync cria conversão REAL -> dispara Purchase (Meta) + Telegram.

// hostname (contém) -> firm_id do cms_firms. Cobre subdomínios (app./portal./dashboard./affiliates.).
const MC_HOST_FIRM = [
  { m: 'goatfundedfutures.com', firm: 'goat' },
  { m: 'futureselite.com',      firm: 'futureselite' },
  { m: 'alpha-futures.com',     firm: 'alphafutures' },
  { m: 'alphafutures.',         firm: 'alphafutures' },
  { m: 'blueberryfutures.com',  firm: 'blueberryfutures' },
  { m: 'aquafutures.io',        firm: 'aquafutures' },
  { m: 'aquafutures.com',       firm: 'aquafutures' },
  { m: 'blueguardian.com',      firm: 'blueguardian' },
  { m: 'toponefutures.com',     firm: 'toponefutures' },
];

function mcGenericFirmId() {
  const h = location.hostname.toLowerCase();
  const hit = MC_HOST_FIRM.find(x => h.includes(x.m));
  return hit ? hit.firm : null;
}

// Só auto-sincroniza em páginas que parecem painel de afiliado (evita rodar no checkout do cliente).
function mcGenericIsAffiliatePage() {
  const p = (location.pathname + location.search).toLowerCase();
  return /affiliat|partner|referral|dashboard|orders|stats|payout|commission/.test(p);
}

(async () => {
  try {
    const firm = mcGenericFirmId();
    if (!firm) return;
    if (!mcGenericIsAffiliatePage()) return;
    const auto = await mcGShould(firm);
    if (!auto) return;
    await mcGSync(firm, { auto: true });
  } catch (e) { console.warn('[MC] generic auto-sync erro:', e); }
})();

function mcGShould(firmId) {
  return new Promise(resolve => {
    chrome.storage.local.get(['mc_last_sync'], r => {
      const last = (r.mc_last_sync || {})[firmId] || 0;
      resolve((Date.now() - last) / 3600000 >= 6);
    });
  });
}

function mcGMark(firmId) {
  return new Promise(resolve => {
    chrome.storage.local.get(['mc_last_sync'], r => {
      const map = r.mc_last_sync || {};
      map[firmId] = Date.now();
      chrome.storage.local.set({ mc_last_sync: map }, resolve);
    });
  });
}

async function mcGSync(firmId, opts = {}) {
  const leads = mcGScrapeTable();
  if (!leads.length) { mcGToast(`${firmId}: sem transações na página (abra o histórico de orders/vendas do painel de afiliado)`); return { ok:false, error:'no_data' }; }

  const byDay = {};
  leads.forEach(l => {
    if (!l.date) return;
    if (!byDay[l.date]) byDay[l.date] = { date: l.date, transactions: 0, commission: 0, granularity: 'day' };
    byDay[l.date].transactions += 1;
    byDay[l.date].commission += Number(l.commission) || 0;
  });
  const rows = Object.values(byDay);

  const out = await mcGSend({ firm: firmId, source: 'ext_generic_v1', snapshot: null, rows, leads });
  if (out.ok) { mcGToast(`${firmId}: ${leads.length} transações sincronizadas`); await mcGMark(firmId); }
  else { mcGToast(`${firmId}: erro, ` + (out.error || '?')); }
  return out;
}

// Parser adaptativo: acha qualquer <table>/grid com coluna de DATA + coluna de VALOR.
function mcGScrapeTable() {
  const out = [];
  document.querySelectorAll('table, [role="table"], [role="grid"]').forEach(t => {
    const head = [...t.querySelectorAll('thead th, [role="columnheader"]')].map(x => x.textContent.trim().toLowerCase());
    if (!head.length) return;
    const hasDate = head.some(h => h.includes('date') || h.includes('data') || h.includes('created') || h.includes('time'));
    const hasValue = head.some(h => h.includes('commission') || h.includes('comiss') || h.includes('earning') || h.includes('payout') || h.includes('amount') || h.includes('total') || h.includes('valor') || h.includes('reward'));
    if (!hasDate || !hasValue) return;
    const iDate = head.findIndex(h => h.includes('date') || h.includes('data') || h.includes('created') || h.includes('time'));
    // "Commission" EXATO ($) — NÃO "Commission Type" (texto tipo "Purchase")
    const iComExact = head.findIndex(h => h === 'commission');
    const iCom = iComExact !== -1 ? iComExact
      : head.findIndex(h => (h.includes('commission') || h.includes('comiss') || h.includes('earning') || h.includes('payout') || h.includes('reward')) && !h.includes('type'));
    // valor da venda: "Final Amount" (o que o cliente pagou) > amount > total
    const iFinal = head.findIndex(h => h.includes('final'));
    const iAmt = iFinal !== -1 ? iFinal : head.findIndex(h => h.includes('amount') || h.includes('valor') || h.includes('total'));
    const iTxn = head.findIndex(h => h.includes('transaction') || h.includes('order') || h.includes('id'));
    const iStatus = head.findIndex(h => h.includes('status'));
    t.querySelectorAll('tbody tr, [role="row"]').forEach(tr => {
      const cells = [...tr.querySelectorAll('td, [role="cell"], [role="gridcell"]')].map(x => x.textContent.trim());
      if (!cells.length) return;
      if (/^total/i.test(cells[0] || '')) return; // linha "Total:"
      if (iStatus >= 0 && /cancel|refund|void|reject|declin|fail/i.test(cells[iStatus] || '')) return;
      const d = mcGParseDate(cells[iDate]);
      if (!d) return;
      const commission = iCom >= 0 ? mcGNum(cells[iCom]) : 0;
      const amount = iAmt >= 0 ? mcGNum(cells[iAmt]) : commission;
      const txn = iTxn >= 0 ? (cells[iTxn] || '').split('#')[0].trim() : '';
      const firm = mcGenericFirmId();
      out.push({ date: d, commission, amount, transaction_id: txn ? (firm + ':' + txn) : undefined });
    });
  });
  return out;
}

function mcGNum(s) {
  if (s === '' || s == null) return 0;
  const n = parseFloat(String(s).replace(/[^\d.,\-]/g, '').replace(/\.(?=\d{3}\b)/g, '').replace(',', '.'));
  return isNaN(n) ? 0 : n;
}

function mcGParseDate(s) {
  if (!s) return null;
  let m = /(\d{4})-(\d{2})-(\d{2})/.exec(s);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  m = /^(\d{1,2})[./\-](\d{1,2})[./\-](\d{4})/.exec(s);
  if (m) return `${m[3]}-${String(m[1]).padStart(2,'0')}-${String(m[2]).padStart(2,'0')}`; // US MM-DD-YYYY (ajustar por firma se for DD-MM)
  const months = { jan:'01',feb:'02',mar:'03',apr:'04',may:'05',jun:'06',jul:'07',aug:'08',sep:'09',oct:'10',nov:'11',dec:'12' };
  m = /([A-Za-z]{3,})\s+(\d{1,2}),?\s+(\d{4})/.exec(s);
  if (m) { const mm = months[m[1].slice(0,3).toLowerCase()]; if (mm) return `${m[3]}-${mm}-${String(m[2]).padStart(2,'0')}`; }
  return null;
}

async function mcGSend(payload) {
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

function mcGToast(msg) {
  const el = document.createElement('div');
  el.textContent = '[MC] ' + msg;
  el.style.cssText = 'position:fixed;bottom:20px;right:20px;background:#0a0a0a;color:#f0b429;padding:12px 18px;border-radius:8px;font:13px/1.4 system-ui;z-index:999999;box-shadow:0 8px 24px rgba(0,0,0,.4);border:1px solid rgba(240,180,41,.3);';
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 4000);
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg && msg.action && msg.action.indexOf('sync_') === 0) {
    const firm = mcGenericFirmId();
    if (!firm) { sendResponse({ ok:false, error:'firma nao reconhecida nesta pagina' }); return true; }
    mcGSync(firm, { auto: false }).then(sendResponse);
    return true;
  }
});
