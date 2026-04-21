// TakeProfitTrader: pagina /affiliate-dashboard/transactions
(async () => {
  try {
    const auto = await mcShouldAutoSyncTPT('tpt');
    if (!auto) return;
    await mcSyncTPT({ auto: true });
  } catch (e) { console.warn('[MC] tpt auto-sync erro:', e); }
})();

async function mcShouldAutoSyncTPT(firmId) {
  return new Promise(resolve => {
    chrome.storage.local.get(['mc_last_sync'], r => {
      const last = (r.mc_last_sync || {})[firmId] || 0;
      resolve((Date.now() - last) / 3600000 >= 6);
    });
  });
}

async function mcMarkSyncTPT(firmId) {
  return new Promise(resolve => {
    chrome.storage.local.get(['mc_last_sync'], r => {
      const map = r.mc_last_sync || {};
      map[firmId] = Date.now();
      chrome.storage.local.set({ mc_last_sync: map }, resolve);
    });
  });
}

async function mcSyncTPT(opts = {}) {
  const leads = mcScrapeTPTTransactions();
  if (!leads.length) {
    mcToastTPT('TPT: sem transacoes — abra /affiliate-dashboard/transactions');
    return { ok:false };
  }

  // Agregar por dia pra salvar em affiliate_daily_stats
  const byDay = {};
  leads.forEach(l => {
    if (!l.date) return;
    if (!byDay[l.date]) byDay[l.date] = { date: l.date, transactions: 0, commission: 0, granularity: 'day' };
    byDay[l.date].transactions += 1;
    byDay[l.date].commission += Number(l.commission) || 0;
  });
  const rows = Object.values(byDay);

  const out = await mcSendTPT({
    firm: 'tpt',
    source: 'ext_tpt_v1',
    rows,
    leads
  });
  if (out.ok) {
    mcToastTPT(`TPT: ${rows.length} dias + ${leads.length} transacoes`);
    await mcMarkSyncTPT('tpt');
  } else {
    mcToastTPT('TPT: erro — ' + (out.error || '?'));
  }
  return out;
}

function mcScrapeTPTTransactions() {
  const out = [];
  document.querySelectorAll('table, [role="table"]').forEach(t => {
    const headCells = t.querySelectorAll('thead th, [role="columnheader"]');
    const head = [...headCells].map(x => x.textContent.trim().toLowerCase());
    // precisa ter coluna de data e alguma coluna de valor/comissao
    const hasDate = head.some(h => h.includes('date'));
    const hasValue = head.some(h => h.includes('commission') || h.includes('amount') || h.includes('earning') || h.includes('payout') || h.includes('value'));
    if (!hasDate || !hasValue) return;

    const iDate = head.findIndex(h => h.includes('date'));
    const iCom = head.findIndex(h => h.includes('commission') || h.includes('earning') || h.includes('payout'));
    const iAmt = head.findIndex(h => h.includes('amount') || h.includes('value') || h.includes('total'));
    const iOrder = head.findIndex(h => h.includes('order') || h.includes('transaction') || h.includes('id') || h.includes('ref'));
    const iStat = head.findIndex(h => h.includes('status'));
    const iCust = head.findIndex(h => h.includes('customer') || h.includes('buyer') || h.includes('user') || h.includes('email'));

    const bodyRows = t.querySelectorAll('tbody tr, [role="row"]');
    bodyRows.forEach(tr => {
      const tds = [...tr.querySelectorAll('td, [role="cell"]')].map(x => x.textContent.trim());
      if (!tds.length) return;
      const d = mcTPTParseDate(tds[iDate]);
      if (!d) return;
      const commission = iCom >= 0 ? mcTPTNum(tds[iCom]) : (iAmt >= 0 ? mcTPTNum(tds[iAmt]) : 0);
      out.push({
        date: d,
        commission,
        amount: iAmt >= 0 ? mcTPTNum(tds[iAmt]) : commission,
        order_id: iOrder >= 0 ? tds[iOrder] : null,
        lead: iCust >= 0 ? tds[iCust] : null,
        status: iStat >= 0 ? tds[iStat] : 'paid'
      });
    });
  });
  return out;
}

function mcTPTNum(s) {
  if (s === '' || s == null) return 0;
  const n = parseFloat(String(s).replace(/[^\d.,\-]/g, '').replace(/\.(?=\d{3}\b)/g, '').replace(',', '.'));
  return isNaN(n) ? 0 : n;
}

function mcTPTParseDate(s) {
  if (!s) return null;
  let m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  m = /^(\d{1,2})[./\-](\d{1,2})[./\-](\d{4})/.exec(s);
  if (m) {
    // assumir MM/DD/YYYY (US) — TPT e empresa americana
    return `${m[3]}-${String(m[1]).padStart(2,'0')}-${String(m[2]).padStart(2,'0')}`;
  }
  // "Apr 1, 2026"
  const months = { jan:'01',feb:'02',mar:'03',apr:'04',may:'05',jun:'06',jul:'07',aug:'08',sep:'09',oct:'10',nov:'11',dec:'12' };
  m = /^([A-Za-z]{3,})\s+(\d{1,2}),?\s+(\d{4})/.exec(s);
  if (m) {
    const mm = months[m[1].slice(0,3).toLowerCase()];
    if (mm) return `${m[3]}-${mm}-${String(m[2]).padStart(2,'0')}`;
  }
  return null;
}

async function mcSendTPT(payload) {
  try {
    const res = await fetch(MC_CONFIG.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + MC_CONFIG.anonKey,
        'apikey': MC_CONFIG.anonKey
      },
      body: JSON.stringify(payload)
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { ok:false, error: data.error || data.message || ('HTTP ' + res.status) };
    return { ok:true, ...data };
  } catch (e) { return { ok:false, error: e.message }; }
}

function mcToastTPT(msg) {
  const el = document.createElement('div');
  el.textContent = '[MC] ' + msg;
  el.style.cssText = 'position:fixed;bottom:20px;right:20px;background:#0a0a0a;color:#f0b429;padding:12px 18px;border-radius:8px;font:13px/1.4 system-ui;z-index:999999;box-shadow:0 8px 24px rgba(0,0,0,.4);border:1px solid rgba(240,180,41,.3);';
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 4000);
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg && msg.action === 'sync_tpt') {
    mcSyncTPT({ auto: false }).then(sendResponse);
    return true;
  }
});
