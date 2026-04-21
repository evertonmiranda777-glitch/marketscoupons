// FundingPips: app.fundingpips.com/affiliate
(async () => {
  try {
    const auto = await mcShouldFP('fundingpips');
    if (!auto) return;
    await mcSyncFP({ auto: true });
  } catch (e) { console.warn('[MC] fp auto-sync erro:', e); }
})();

async function mcShouldFP(firmId) {
  return new Promise(resolve => {
    chrome.storage.local.get(['mc_last_sync'], r => {
      const last = (r.mc_last_sync || {})[firmId] || 0;
      resolve((Date.now() - last) / 3600000 >= 6);
    });
  });
}

async function mcMarkFP(firmId) {
  return new Promise(resolve => {
    chrome.storage.local.get(['mc_last_sync'], r => {
      const map = r.mc_last_sync || {};
      map[firmId] = Date.now();
      chrome.storage.local.set({ mc_last_sync: map }, resolve);
    });
  });
}

async function mcSyncFP(opts = {}) {
  const snapshot = null;
  const leads = mcScrapeFPTable();

  if (!leads.length) {
    mcToastFP('FP: sem transacoes na pagina');
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

  const out = await mcSendFP({
    firm: 'fundingpips',
    source: 'ext_fp_v1',
    snapshot,
    rows,
    leads
  });
  if (out.ok) {
    mcToastFP(`FP: snap=${!!snapshot}, ${leads.length} leads`);
    await mcMarkFP('fundingpips');
  } else {
    mcToastFP('FP: erro — ' + (out.error || '?'));
  }
  return out;
}

function mcScrapeFPSnapshot() {
  const snap = {};
  document.querySelectorAll('*').forEach(el => {
    const t = (el.textContent || '').trim();
    if (!t || t.length > 40) return;
    const lower = t.toLowerCase();
    const parent = el.parentElement;
    if (!parent) return;
    const pTxt = parent.textContent;

    const check = (labels, key) => {
      if (snap[key] != null) return;
      if (labels.some(l => lower === l || lower.includes(l))) {
        const nums = (pTxt.match(/[€$]\s*[\d.,]+|\d+(?:[.,]\d+)?/g) || []).map(mcFPNum).filter(n => !isNaN(n));
        if (nums.length) snap[key] = nums[0];
      }
    };
    check(['total pago', 'total paid'], 'total_paid');
    check(['total de referências', 'total de referencias', 'total referrals'], 'referrals');
  });
  if (!Object.keys(snap).length) return null;
  snap.ready_for_payout = 0;
  snap.clients_registered = snap.referrals || 0;
  snap.captured_at = new Date().toISOString();
  return snap;
}

function mcScrapeFPTable() {
  const out = [];
  document.querySelectorAll('table, [role="table"]').forEach(t => {
    const head = [...t.querySelectorAll('thead th, [role="columnheader"]')].map(x => x.textContent.trim().toLowerCase());
    const hasDate = head.some(h => h.includes('date') || h.includes('data'));
    const hasValue = head.some(h => h.includes('commission') || h.includes('comiss') || h.includes('amount') || h.includes('valor') || h.includes('ganho'));
    if (!hasDate || !hasValue) return;
    const iDate = head.findIndex(h => h.includes('date') || h.includes('data'));
    const iCom = head.findIndex(h => h.includes('commission') || h.includes('comiss') || h.includes('ganho'));
    const iAmt = head.findIndex(h => h.includes('amount') || h.includes('valor') || h.includes('total'));
    t.querySelectorAll('tbody tr, [role="row"]').forEach(tr => {
      const tds = [...tr.querySelectorAll('td, [role="cell"]')].map(x => x.textContent.trim());
      if (!tds.length) return;
      const d = mcFPParseDate(tds[iDate]);
      if (!d) return;
      const commission = iCom >= 0 ? mcFPNum(tds[iCom]) : (iAmt >= 0 ? mcFPNum(tds[iAmt]) : 0);
      out.push({ date: d, commission, amount: iAmt >= 0 ? mcFPNum(tds[iAmt]) : commission });
    });
  });
  return out;
}

function mcFPNum(s) {
  if (s === '' || s == null) return 0;
  const n = parseFloat(String(s).replace(/[^\d.,\-]/g, '').replace(/\.(?=\d{3}\b)/g, '').replace(',', '.'));
  return isNaN(n) ? 0 : n;
}

function mcFPParseDate(s) {
  if (!s) return null;
  let m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  m = /^(\d{1,2})[./\-](\d{1,2})[./\-](\d{4})/.exec(s);
  if (m) return `${m[3]}-${String(m[2]).padStart(2,'0')}-${String(m[1]).padStart(2,'0')}`;
  const months = { jan:'01',feb:'02',mar:'03',apr:'04',may:'05',jun:'06',jul:'07',aug:'08',sep:'09',oct:'10',nov:'11',dec:'12' };
  m = /^([A-Za-z]{3,})\s+(\d{1,2}),?\s+(\d{4})/.exec(s);
  if (m) {
    const mm = months[m[1].slice(0,3).toLowerCase()];
    if (mm) return `${m[3]}-${mm}-${String(m[2]).padStart(2,'0')}`;
  }
  return null;
}

async function mcSendFP(payload) {
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

function mcToastFP(msg) {
  const el = document.createElement('div');
  el.textContent = '[MC] ' + msg;
  el.style.cssText = 'position:fixed;bottom:20px;right:20px;background:#0a0a0a;color:#f0b429;padding:12px 18px;border-radius:8px;font:13px/1.4 system-ui;z-index:999999;box-shadow:0 8px 24px rgba(0,0,0,.4);border:1px solid rgba(240,180,41,.3);';
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 4000);
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg && msg.action === 'sync_fundingpips') {
    mcSyncFP({ auto: false }).then(sendResponse);
    return true;
  }
});
