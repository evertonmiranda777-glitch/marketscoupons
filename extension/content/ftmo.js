// FTMO: raspa Dashboard (cards) + tabela de Leads. Sem CSV nativo.
(async () => {
  try {
    const auto = await mcShouldAutoSyncFT('ftmo');
    if (!auto) return;
    await mcSyncFTMO({ auto: true });
  } catch (e) { console.warn('[MC] ftmo auto-sync erro:', e); }
})();

async function mcShouldAutoSyncFT(firmId) {
  return new Promise(resolve => {
    chrome.storage.local.get(['mc_last_sync'], r => {
      const last = (r.mc_last_sync || {})[firmId] || 0;
      resolve((Date.now() - last) / 3600000 >= 6);
    });
  });
}

async function mcMarkSyncFT(firmId) {
  return new Promise(resolve => {
    chrome.storage.local.get(['mc_last_sync'], r => {
      const map = r.mc_last_sync || {};
      map[firmId] = Date.now();
      chrome.storage.local.set({ mc_last_sync: map }, resolve);
    });
  });
}

async function mcSyncFTMO(opts = {}) {
  // Snapshot dos cards do dashboard
  const snapshot = mcScrapeFTMODashboard();

  // Tabela de leads individuais (Order Id + Amount + Status)
  const leads = mcScrapeFTMOLeads();

  if (!snapshot && !leads.length) {
    mcToastFT('FTMO: sem dados, abra Affiliate Section -> Dashboard');
    return { ok:false };
  }

  const out = await mcSendFT({
    firm: 'ftmo',
    source: 'ext_ftmo_v1',
    snapshot,
    leads
  });
  if (out.ok) {
    mcToastFT(`FTMO: snapshot + ${leads.length} leads sincronizado`);
    await mcMarkSyncFT('ftmo');
  } else {
    mcToastFT('FTMO: erro, ' + (out.error || '?'));
  }
  return out;
}

function mcScrapeFTMODashboard() {
  // Cards visiveis na pagina: Ready for payout, Waiting, Clicks, Conversion rate, Clients registered, Traders referred
  const cards = {};
  document.querySelectorAll('body *').forEach(el => {
    const txt = (el.textContent || '').trim();
    if (!txt || txt.length > 40) return;
    const parent = el.parentElement;
    if (!parent) return;
    const pTxt = parent.textContent.trim();
    const keys = [
      { key: 'ready_for_payout', re: /ready for the payout/i },
      { key: 'waiting_for_approval', re: /waiting for approval/i },
      { key: 'clicks', re: /^clicks$/i },
      { key: 'conversion_rate', re: /conversion rate/i },
      { key: 'clients_registered', re: /clients registered/i },
      { key: 'traders_referred', re: /traders referred/i }
    ];
    for (const k of keys) {
      if (k.re.test(txt)) {
        // valor e geralmente o primeiro numero grande no mesmo card
        const num = (pTxt.match(/[\d.,]+/g) || []).find(s => /\d/.test(s));
        if (num) cards[k.key] = mcFTNum(num);
      }
    }
  });
  if (!Object.keys(cards).length) return null;
  return { captured_at: new Date().toISOString(), ...cards };
}

function mcScrapeFTMOLeads() {
  // Tabela Leads: Date | Lead | Order Id | Amount | Status
  const out = [];
  document.querySelectorAll('table, [role="table"]').forEach(t => {
    const headCells = t.querySelectorAll('thead th, [role="columnheader"]');
    const head = [...headCells].map(x => x.textContent.trim().toLowerCase());
    if (!head.some(h => h.includes('order')) && !head.some(h => h.includes('lead'))) return;
    const iDate = head.findIndex(h => h.includes('date'));
    const iLead = head.findIndex(h => h === 'lead');
    const iOrder = head.findIndex(h => h.includes('order'));
    const iAmt = head.findIndex(h => h.includes('amount'));
    const iStat = head.findIndex(h => h.includes('status'));
    const bodyRows = t.querySelectorAll('tbody tr, [role="row"]');
    bodyRows.forEach(tr => {
      const tds = [...tr.querySelectorAll('td, [role="cell"]')].map(x => x.textContent.trim());
      if (!tds.length) return;
      const d = tds[iDate];
      if (!d) return;
      out.push({
        date: mcFTParseDate(d) || d,
        lead: iLead >= 0 ? tds[iLead] : null,
        order_id: iOrder >= 0 ? tds[iOrder] : null,
        amount: iAmt >= 0 ? mcFTNum(tds[iAmt]) : 0,
        status: iStat >= 0 ? tds[iStat] : null
      });
    });
  });
  return out;
}

function mcFTNum(s) {
  if (s === '' || s == null) return 0;
  const n = parseFloat(String(s).replace(/[^\d.,\-]/g, '').replace(/\.(?=\d{3}\b)/g, '').replace(',', '.'));
  return isNaN(n) ? 0 : n;
}

function mcFTParseDate(s) {
  // "DD.MM.YYYY" ou "DD/MM/YYYY" ou "YYYY-MM-DD"
  let m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  m = /^(\d{1,2})[./\-](\d{1,2})[./\-](\d{4})/.exec(s);
  if (m) return `${m[3]}-${String(m[2]).padStart(2,'0')}-${String(m[1]).padStart(2,'0')}`;
  return null;
}

async function mcSendFT(payload) {
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

function mcToastFT(msg) {
  const el = document.createElement('div');
  el.textContent = '[MC] ' + msg;
  el.style.cssText = 'position:fixed;bottom:20px;right:20px;background:#0a0a0a;color:#f0b429;padding:12px 18px;border-radius:8px;font:13px/1.4 system-ui;z-index:999999;box-shadow:0 8px 24px rgba(0,0,0,.4);border:1px solid rgba(240,180,41,.3);';
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 4000);
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg && msg.action === 'sync_ftmo') {
    mcSyncFTMO({ auto: false }).then(sendResponse);
    return true;
  }
});
