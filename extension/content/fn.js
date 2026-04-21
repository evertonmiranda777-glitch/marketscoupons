// FundedNext (FirstPromoter): /home snapshot + /commissions transactions
(async () => {
  try {
    const auto = await mcShouldAutoSyncFN('fn');
    if (!auto) return;
    await mcSyncFN({ auto: true });
  } catch (e) { console.warn('[MC] fn auto-sync erro:', e); }
})();

async function mcShouldAutoSyncFN(firmId) {
  return new Promise(resolve => {
    chrome.storage.local.get(['mc_last_sync'], r => {
      const last = (r.mc_last_sync || {})[firmId] || 0;
      resolve((Date.now() - last) / 3600000 >= 6);
    });
  });
}

async function mcMarkSyncFN(firmId) {
  return new Promise(resolve => {
    chrome.storage.local.get(['mc_last_sync'], r => {
      const map = r.mc_last_sync || {};
      map[firmId] = Date.now();
      chrome.storage.local.set({ mc_last_sync: map }, resolve);
    });
  });
}

async function mcSyncFN(opts = {}) {
  const snapshot = null;
  const leads = mcScrapeFNTable();

  if (!leads.length) {
    mcToastFN('FN: sem transacoes na pagina');
    return { ok:false };
  }

  // Agregar leads por dia
  const byDay = {};
  leads.forEach(l => {
    if (!l.date) return;
    if (!byDay[l.date]) byDay[l.date] = { date: l.date, transactions: 0, commission: 0, granularity: 'day' };
    byDay[l.date].transactions += 1;
    byDay[l.date].commission += Number(l.commission) || 0;
  });
  const rows = Object.values(byDay);

  const out = await mcSendFN({
    firm: 'fn',
    source: 'ext_fn_v1',
    snapshot,
    rows,
    leads
  });
  if (out.ok) {
    mcToastFN(`FN: ${rows.length} dias, ${leads.length} leads, snapshot=${!!snapshot}`);
    await mcMarkSyncFN('fn');
  } else {
    mcToastFN('FN: erro — ' + (out.error || '?'));
  }
  return out;
}

function mcScrapeFNSnapshot() {
  // Cards: DUE IN X DAYS, TOTAL UNPAID, TOTAL PAID, tier (clicks, referrals, customers)
  const snap = {};
  const all = document.body.textContent || '';
  const matchNum = (re) => {
    const m = re.exec(all);
    return m ? mcFNNum(m[1]) : null;
  };

  // Scan cards visiveis
  document.querySelectorAll('*').forEach(el => {
    const t = (el.textContent || '').trim();
    if (!t || t.length > 30) return;
    const lower = t.toLowerCase();
    const parent = el.parentElement;
    if (!parent) return;
    const pTxt = parent.textContent;

    const check = (label, key) => {
      if (lower === label || lower.includes(label)) {
        const nums = (pTxt.match(/\$?\s*[\d.,]+/g) || []).map(mcFNNum).filter(n => !isNaN(n));
        if (nums.length && snap[key] == null) snap[key] = nums[0];
      }
    };
    check('total paid', 'total_paid');
    check('total unpaid', 'total_unpaid');
    check('clicks', 'clicks');
    check('referrals', 'referrals');
    check('customers', 'customers');
  });

  if (!Object.keys(snap).length) return null;
  snap.clients_registered = snap.customers || 0;
  snap.ready_for_payout = snap.total_unpaid || 0;
  snap.captured_at = new Date().toISOString();
  return snap;
}

function mcScrapeFNTable() {
  const out = [];
  document.querySelectorAll('table, [role="table"]').forEach(t => {
    const head = [...t.querySelectorAll('thead th, [role="columnheader"]')].map(x => x.textContent.trim().toLowerCase());
    const hasDate = head.some(h => h.includes('date'));
    const hasValue = head.some(h => h.includes('commission') || h.includes('amount') || h.includes('earning') || h.includes('payout'));
    if (!hasDate || !hasValue) return;
    const iDate = head.findIndex(h => h.includes('date'));
    const iCom = head.findIndex(h => h.includes('commission') || h.includes('earning') || h.includes('payout'));
    const iAmt = head.findIndex(h => h.includes('amount') || h.includes('total'));
    const iStat = head.findIndex(h => h.includes('status'));
    const iCust = head.findIndex(h => h.includes('customer') || h.includes('email') || h.includes('referral'));
    t.querySelectorAll('tbody tr, [role="row"]').forEach(tr => {
      const tds = [...tr.querySelectorAll('td, [role="cell"]')].map(x => x.textContent.trim());
      if (!tds.length) return;
      const d = mcFNParseDate(tds[iDate]);
      if (!d) return;
      const commission = iCom >= 0 ? mcFNNum(tds[iCom]) : (iAmt >= 0 ? mcFNNum(tds[iAmt]) : 0);
      out.push({
        date: d,
        commission,
        amount: iAmt >= 0 ? mcFNNum(tds[iAmt]) : commission,
        lead: iCust >= 0 ? tds[iCust] : null,
        status: iStat >= 0 ? tds[iStat] : 'paid'
      });
    });
  });
  return out;
}

function mcFNNum(s) {
  if (s === '' || s == null) return 0;
  const n = parseFloat(String(s).replace(/[^\d.,\-]/g, '').replace(/\.(?=\d{3}\b)/g, '').replace(',', '.'));
  return isNaN(n) ? 0 : n;
}

function mcFNParseDate(s) {
  if (!s) return null;
  let m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  m = /^(\d{1,2})[./\-](\d{1,2})[./\-](\d{4})/.exec(s);
  if (m) return `${m[3]}-${String(m[1]).padStart(2,'0')}-${String(m[2]).padStart(2,'0')}`;
  const months = { jan:'01',feb:'02',mar:'03',apr:'04',may:'05',jun:'06',jul:'07',aug:'08',sep:'09',oct:'10',nov:'11',dec:'12' };
  m = /^([A-Za-z]{3,})\s+(\d{1,2}),?\s+(\d{4})/.exec(s);
  if (m) {
    const mm = months[m[1].slice(0,3).toLowerCase()];
    if (mm) return `${m[3]}-${mm}-${String(m[2]).padStart(2,'0')}`;
  }
  return null;
}

async function mcSendFN(payload) {
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

function mcToastFN(msg) {
  const el = document.createElement('div');
  el.textContent = '[MC] ' + msg;
  el.style.cssText = 'position:fixed;bottom:20px;right:20px;background:#0a0a0a;color:#f0b429;padding:12px 18px;border-radius:8px;font:13px/1.4 system-ui;z-index:999999;box-shadow:0 8px 24px rgba(0,0,0,.4);border:1px solid rgba(240,180,41,.3);';
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 4000);
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg && msg.action === 'sync_fn') {
    mcSyncFN({ auto: false }).then(sendResponse);
    return true;
  }
});
