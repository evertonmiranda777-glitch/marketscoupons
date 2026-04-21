// The5ers: hub.the5ers.com/en/affiliate
(async () => {
  try {
    const auto = await mcShould5('the5ers');
    if (!auto) return;
    await mcSync5({ auto: true });
  } catch (e) { console.warn('[MC] the5ers auto-sync erro:', e); }
})();

async function mcShould5(firmId) {
  return new Promise(resolve => {
    chrome.storage.local.get(['mc_last_sync'], r => {
      const last = (r.mc_last_sync || {})[firmId] || 0;
      resolve((Date.now() - last) / 3600000 >= 6);
    });
  });
}

async function mcMark5(firmId) {
  return new Promise(resolve => {
    chrome.storage.local.get(['mc_last_sync'], r => {
      const map = r.mc_last_sync || {};
      map[firmId] = Date.now();
      chrome.storage.local.set({ mc_last_sync: map }, resolve);
    });
  });
}

async function mcSync5(opts = {}) {
  const snapshot = mcScrape5Snapshot();
  const leads = mcScrape5Table();

  if (!snapshot && !leads.length) {
    mcToast5('The5ers: sem dados — abra /en/affiliate');
    return { ok:false };
  }

  const byDay = {};
  leads.forEach(l => {
    if (!l.date) return;
    if (!byDay[l.date]) byDay[l.date] = { date: l.date, transactions: 0, commission: 0, granularity: 'day' };
    byDay[l.date].transactions += 1;
    byDay[l.date].commission += Number(l.commission) || 0;
  });
  const rows = Object.values(byDay);

  const out = await mcSend5({
    firm: 'the5ers',
    source: 'ext_the5ers_v1',
    snapshot,
    rows,
    leads
  });
  if (out.ok) {
    mcToast5(`The5ers: snap=${!!snapshot}, ${leads.length} leads`);
    await mcMark5('the5ers');
  } else {
    mcToast5('The5ers: erro — ' + (out.error || '?'));
  }
  return out;
}

function mcScrape5Snapshot() {
  const snap = {};
  document.querySelectorAll('*').forEach(el => {
    const t = (el.textContent || '').trim();
    if (!t || t.length > 40) return;
    const lower = t.toLowerCase();
    const parent = el.parentElement;
    if (!parent) return;
    const pTxt = parent.textContent;

    const check = (label, key) => {
      if (snap[key] != null) return;
      if (lower === label || lower.includes(label)) {
        const nums = (pTxt.match(/\$?\s*[\d.,]+\s*%?/g) || []).map(mc5Num).filter(n => !isNaN(n));
        if (nums.length) snap[key] = nums[0];
      }
    };
    check('total payout', 'total_paid');
    check('available credit', 'available_credit');
    check('of referrals', 'referrals');
    check('purchases', 'customers');
    check('withdrawals', 'withdrawals');
  });
  if (!Object.keys(snap).length) return null;
  snap.ready_for_payout = snap.available_credit || 0;
  snap.clients_registered = snap.customers || 0;
  snap.captured_at = new Date().toISOString();
  return snap;
}

function mcScrape5Table() {
  const out = [];
  document.querySelectorAll('table, [role="table"]').forEach(t => {
    const head = [...t.querySelectorAll('thead th, [role="columnheader"]')].map(x => x.textContent.trim().toLowerCase());
    const hasDate = head.some(h => h.includes('date'));
    const hasValue = head.some(h => h.includes('commission') || h.includes('amount') || h.includes('payout'));
    if (!hasDate || !hasValue) return;
    const iDate = head.findIndex(h => h.includes('date'));
    const iCom = head.findIndex(h => h.includes('commission') || h.includes('payout'));
    const iAmt = head.findIndex(h => h.includes('amount') || h.includes('total'));
    t.querySelectorAll('tbody tr, [role="row"]').forEach(tr => {
      const tds = [...tr.querySelectorAll('td, [role="cell"]')].map(x => x.textContent.trim());
      if (!tds.length) return;
      const d = mc5ParseDate(tds[iDate]);
      if (!d) return;
      const commission = iCom >= 0 ? mc5Num(tds[iCom]) : (iAmt >= 0 ? mc5Num(tds[iAmt]) : 0);
      out.push({ date: d, commission, amount: iAmt >= 0 ? mc5Num(tds[iAmt]) : commission });
    });
  });
  return out;
}

function mc5Num(s) {
  if (s === '' || s == null) return 0;
  const n = parseFloat(String(s).replace(/[^\d.,\-]/g, '').replace(/\.(?=\d{3}\b)/g, '').replace(',', '.'));
  return isNaN(n) ? 0 : n;
}

function mc5ParseDate(s) {
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

async function mcSend5(payload) {
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

function mcToast5(msg) {
  const el = document.createElement('div');
  el.textContent = '[MC] ' + msg;
  el.style.cssText = 'position:fixed;bottom:20px;right:20px;background:#0a0a0a;color:#f0b429;padding:12px 18px;border-radius:8px;font:13px/1.4 system-ui;z-index:999999;box-shadow:0 8px 24px rgba(0,0,0,.4);border:1px solid rgba(240,180,41,.3);';
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 4000);
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg && msg.action === 'sync_the5ers') {
    mcSync5({ auto: false }).then(sendResponse);
    return true;
  }
});
