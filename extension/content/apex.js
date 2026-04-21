// Apex: pagina /aff/member/stats tem CSV export. Tentamos buscar direto,
// se falhar raspamos a tabela visivel.
(async () => {
  try {
    if (typeof mcIsKeywordsPage === 'function' && mcIsKeywordsPage()) {
      const out = await mcSyncKeywords('apex', 'ext_apex_keywords_v1');
      if (out.ok) mcToast(`Apex keywords: ${out.rows} linhas sincronizadas`);
      else if (out.reason !== 'no_keyword_rows') mcToast('Apex keywords: ' + (out.error || out.reason));
      return;
    }
    const auto = await mcShouldAutoSync('apex');
    if (!auto) return;
    await mcSyncApex({ auto: true });
  } catch (e) {
    console.warn('[MC] apex auto-sync erro:', e);
  }
})();

async function mcShouldAutoSync(firmId) {
  return new Promise(resolve => {
    chrome.storage.local.get(['mc_last_sync'], r => {
      const last = (r.mc_last_sync || {})[firmId] || 0;
      const hoursSince = (Date.now() - last) / 3600000;
      resolve(hoursSince >= 6);
    });
  });
}

async function mcMarkSync(firmId) {
  return new Promise(resolve => {
    chrome.storage.local.get(['mc_last_sync'], r => {
      const map = r.mc_last_sync || {};
      map[firmId] = Date.now();
      chrome.storage.local.set({ mc_last_sync: map }, resolve);
    });
  });
}

async function mcSyncApex(opts = {}) {
  const affId = mcApexAffId();
  if (!affId) { mcToast('Apex: nao identificou aff_id — estou logado no painel de afiliado?'); return { ok:false, reason:'no_aff_id' }; }

  // 1) Procurar link "Download Report" na pagina (amember pattern)
  let csvUrl = null;
  document.querySelectorAll('a').forEach(a => {
    const txt = (a.textContent || '').toLowerCase();
    const href = a.href || '';
    if (txt.includes('download report') || txt.includes('csv') || /aff-stat-.+\.csv/i.test(href)) {
      csvUrl = a.href;
    }
  });

  let rows = [];
  if (csvUrl) {
    try {
      const res = await fetch(csvUrl, { credentials: 'include' });
      if (res.ok) {
        const text = await res.text();
        rows = mcParseApexCSV(text);
      }
    } catch (e) {}
  }

  if (!rows.length) rows = mcScrapeApexTable();
  if (!rows.length) { mcToast('Apex: nenhuma linha encontrada'); return { ok:false, reason:'no_rows' }; }

  const payload = {
    firm: 'apex',
    source: 'ext_apex_v1',
    affiliate_id: affId,
    rows
  };
  const out = await mcSend(payload);
  if (out.ok) {
    mcToast(`Apex: ${rows.length} dias sincronizados`);
    await mcMarkSync('apex');
  } else {
    mcToast('Apex: erro ao enviar — ' + (out.error || 'desconhecido'));
  }
  return out;
}

function mcApexAffId() {
  // cookie amember_aff_id ou na URL
  const m = document.cookie.match(/amember_aff_id=([^;]+)/);
  if (m) return decodeURIComponent(m[1]);
  return null;
}

function mcParseApexCSV(text) {
  const rows = mcParseCSV(text);
  if (!rows.length) return [];
  const header = rows[0].map(h => h.trim().toLowerCase());
  const iDate = header.findIndex(h => h === 'date' || h.includes('date'));
  const iTx = header.findIndex(h => h.includes('transaction') || h === 'sales');
  const iCom = header.findIndex(h => h.includes('commission') || h.includes('referral fee') || h.includes('fee earned'));
  const iCAll = header.findIndex(h => h.includes('all') && h.includes('click'));
  const iCUniq = header.findIndex(h => h.includes('unique') && h.includes('click'));
  const iClicksCombined = header.findIndex(h => h.includes('click') && (h.includes('/') || h.includes('all/unique')));
  if (iDate < 0) return [];
  const out = [];
  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    const raw = (row[iDate] || '').trim();
    const dDay = mcParseMonthDay(raw);
    const dMonth = mcParseMonthYear(raw);
    const date = dDay || (dMonth && dMonth.firstDay);
    if (!date) continue;
    let clicks_all = iCAll >= 0 ? Math.round(mcNum(row[iCAll])) : 0;
    let clicks_unique = iCUniq >= 0 ? Math.round(mcNum(row[iCUniq])) : 0;
    if (iClicksCombined >= 0) {
      const m = /(\d+)\s*\/\s*(\d+)/.exec(row[iClicksCombined] || '');
      if (m) { clicks_all = +m[1]; clicks_unique = +m[2]; }
    }
    out.push({
      date,
      granularity: dDay ? 'day' : 'month',
      transactions: iTx >= 0 ? Math.round(mcNum(row[iTx])) : 0,
      commission: iCom >= 0 ? mcNum(row[iCom]) : 0,
      clicks_all,
      clicks_unique
    });
  }
  return out;
}

function mcScrapeApexTable() {
  const tables = document.querySelectorAll('table');
  for (const t of tables) {
    const head = [...t.querySelectorAll('thead th, tr th')].map(x => x.textContent.trim().toLowerCase());
    const hasDate = head.some(h => h.includes('date'));
    const hasCom = head.some(h => h.includes('commission') || h.includes('referral fee') || h.includes('fee earned'));
    if (!hasDate || !hasCom) continue;
    const iDate = head.findIndex(h => h.includes('date'));
    const iTx = head.findIndex(h => h.includes('transaction') || h === 'sales');
    const iCom = head.findIndex(h => h.includes('commission') || h.includes('referral fee') || h.includes('fee earned'));
    const iClicks = head.findIndex(h => h.includes('click'));
    const iCAll = head.findIndex(h => h.includes('all') && h.includes('click'));
    const iCUniq = head.findIndex(h => h.includes('unique') && h.includes('click'));
    const body = t.querySelectorAll('tbody tr');
    const out = [];
    body.forEach(tr => {
      const tds = [...tr.querySelectorAll('td')].map(x => x.textContent.trim());
      const raw = tds[iDate] || '';
      const dDay = mcParseMonthDay(raw);
      const dMonth = mcParseMonthYear(raw);
      const date = dDay || (dMonth && dMonth.firstDay);
      if (!date) return;
      let clicks_all = 0, clicks_unique = 0;
      if (iCAll >= 0) clicks_all = Math.round(mcNum(tds[iCAll]));
      if (iCUniq >= 0) clicks_unique = Math.round(mcNum(tds[iCUniq]));
      if ((!clicks_all && !clicks_unique) && iClicks >= 0) {
        const m = /(\d+)\s*\/\s*(\d+)/.exec(tds[iClicks] || '');
        if (m) { clicks_all = +m[1]; clicks_unique = +m[2]; }
        else clicks_all = Math.round(mcNum(tds[iClicks]));
      }
      out.push({
        date,
        granularity: dDay ? 'day' : 'month',
        transactions: iTx >= 0 ? Math.round(mcNum(tds[iTx])) : 0,
        commission: iCom >= 0 ? mcNum(tds[iCom]) : 0,
        clicks_all,
        clicks_unique
      });
    });
    if (out.length) return out;
  }
  return [];
}

async function mcSend(payload) {
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
  } catch (e) {
    return { ok:false, error: e.message };
  }
}

function mcToast(msg) {
  const el = document.createElement('div');
  el.textContent = '[MC] ' + msg;
  el.style.cssText = 'position:fixed;bottom:20px;right:20px;background:#0a0a0a;color:#f0b429;padding:12px 18px;border-radius:8px;font:13px/1.4 system-ui;z-index:999999;box-shadow:0 8px 24px rgba(0,0,0,.4);border:1px solid rgba(240,180,41,.3);';
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 4000);
}

// Expor pra popup/background chamar via messaging
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg && msg.action === 'sync_apex') {
    mcSyncApex({ auto: false }).then(sendResponse);
    return true;
  }
});
