// Bulenox: pagina Affiliate Info -> Statistics tem "Download Report (CSV File)"
(async () => {
  try {
    const auto = await mcShouldAutoSyncBL('bulenox');
    if (!auto) return;
    await mcSyncBulenox({ auto: true });
  } catch (e) { console.warn('[MC] bulenox auto-sync erro:', e); }
})();

async function mcShouldAutoSyncBL(firmId) {
  return new Promise(resolve => {
    chrome.storage.local.get(['mc_last_sync'], r => {
      const last = (r.mc_last_sync || {})[firmId] || 0;
      resolve((Date.now() - last) / 3600000 >= 6);
    });
  });
}

async function mcMarkSyncBL(firmId) {
  return new Promise(resolve => {
    chrome.storage.local.get(['mc_last_sync'], r => {
      const map = r.mc_last_sync || {};
      map[firmId] = Date.now();
      chrome.storage.local.set({ mc_last_sync: map }, resolve);
    });
  });
}

async function mcSyncBulenox(opts = {}) {
  const affId = (document.cookie.match(/amember_aff_id=([^;]+)/) || [])[1];
  if (!affId) { mcToastBL('Bulenox: nao identificou aff_id'); return { ok:false }; }

  // 1) Tenta achar link "Download Report" na pagina
  let csvUrl = null;
  document.querySelectorAll('a').forEach(a => {
    const txt = (a.textContent || '').toLowerCase();
    if (txt.includes('download report') || (txt.includes('csv') && txt.includes('report'))) {
      csvUrl = a.href;
    }
  });

  let rows = [];
  if (csvUrl) {
    try {
      const res = await fetch(csvUrl, { credentials: 'include' });
      if (res.ok) {
        const text = await res.text();
        rows = mcParseBulenoxCSV(text);
      }
    } catch (e) {}
  }

  // 2) Fallback: raspa tabela mensal Report
  if (!rows.length) rows = mcScrapeBulenoxTable();

  if (!rows.length) { mcToastBL('Bulenox: sem linhas — abra /aff/member/stats'); return { ok:false }; }

  const out = await mcSendBL({
    firm: 'bulenox',
    source: 'ext_bulenox_v1',
    affiliate_id: decodeURIComponent(affId),
    rows
  });
  if (out.ok) {
    mcToastBL(`Bulenox: ${rows.length} linhas sincronizadas`);
    await mcMarkSyncBL('bulenox');
  } else {
    mcToastBL('Bulenox: erro — ' + (out.error || '?'));
  }
  return out;
}

function mcParseBulenoxCSV(text) {
  const rows = mcParseCSV(text);
  if (!rows.length) return [];
  const header = rows[0].map(h => h.trim().toLowerCase());
  const iDate = header.findIndex(h => h === 'date' || h.includes('date'));
  const iTx = header.findIndex(h => h.includes('transaction') || h === 'sales');
  const iCom = header.findIndex(h => h.includes('commission'));
  const iCAll = header.findIndex(h => h.includes('all') && h.includes('click'));
  const iCUniq = header.findIndex(h => h.includes('unique') && h.includes('click'));
  if (iDate < 0) return [];
  const out = [];
  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    const raw = (row[iDate] || '').trim();
    const dDay = mcParseMonthDay(raw);
    const dMonth = mcParseMonthYear(raw);
    const date = dDay || (dMonth && dMonth.firstDay);
    if (!date) continue;
    out.push({
      date,
      granularity: dDay ? 'day' : 'month',
      transactions: iTx >= 0 ? Math.round(mcNum(row[iTx])) : 0,
      commission: iCom >= 0 ? mcNum(row[iCom]) : 0,
      clicks_all: iCAll >= 0 ? Math.round(mcNum(row[iCAll])) : 0,
      clicks_unique: iCUniq >= 0 ? Math.round(mcNum(row[iCUniq])) : 0
    });
  }
  return out;
}

function mcScrapeBulenoxTable() {
  const tables = document.querySelectorAll('table');
  for (const t of tables) {
    const head = [...t.querySelectorAll('thead th, tr th')].map(x => x.textContent.trim().toLowerCase());
    if (!head.some(h => h.includes('commission'))) continue;
    const iDate = head.findIndex(h => h.includes('date'));
    const iCom = head.findIndex(h => h.includes('commission'));
    const iClicks = head.findIndex(h => h.includes('click'));
    const out = [];
    t.querySelectorAll('tbody tr').forEach(tr => {
      const tds = [...tr.querySelectorAll('td')].map(x => x.textContent.trim());
      const raw = tds[iDate] || '';
      const dMonth = mcParseMonthYear(raw);
      const dDay = mcParseMonthDay(raw);
      const date = dDay || (dMonth && dMonth.firstDay);
      if (!date) return;
      // "125/103" -> all=125 unique=103
      let clicks_all = 0, clicks_unique = 0;
      if (iClicks >= 0) {
        const m = /(\d+)\s*\/\s*(\d+)/.exec(tds[iClicks] || '');
        if (m) { clicks_all = +m[1]; clicks_unique = +m[2]; }
        else clicks_all = Math.round(mcNum(tds[iClicks]));
      }
      out.push({
        date,
        granularity: dDay ? 'day' : 'month',
        transactions: 0,
        commission: iCom >= 0 ? mcNum(tds[iCom]) : 0,
        clicks_all,
        clicks_unique
      });
    });
    if (out.length) return out;
  }
  return [];
}

async function mcSendBL(payload) {
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

function mcToastBL(msg) {
  const el = document.createElement('div');
  el.textContent = '[MC] ' + msg;
  el.style.cssText = 'position:fixed;bottom:20px;right:20px;background:#0a0a0a;color:#f0b429;padding:12px 18px;border-radius:8px;font:13px/1.4 system-ui;z-index:999999;box-shadow:0 8px 24px rgba(0,0,0,.4);border:1px solid rgba(240,180,41,.3);';
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 4000);
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg && msg.action === 'sync_bulenox') {
    mcSyncBulenox({ auto: false }).then(sendResponse);
    return true;
  }
});
