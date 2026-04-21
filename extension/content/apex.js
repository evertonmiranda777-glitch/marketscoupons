// Apex: pagina /aff/member/stats tem CSV export. Tentamos buscar direto,
// se falhar raspamos a tabela visivel.
(async () => {
  try {
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

  // Statistics page mostra Year selector; exportar CSV do ano atual
  const year = new Date().getUTCFullYear();
  const csvUrl = `/aff/member/stats/export?y=${year}`;

  let rows = [];
  try {
    const res = await fetch(csvUrl, { credentials: 'include' });
    if (res.ok) {
      const text = await res.text();
      rows = mcParseApexCSV(text);
    }
  } catch (e) { /* fallback to DOM scrape */ }

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
  const iDate = header.findIndex(h => h === 'date');
  const iTx = header.findIndex(h => h.includes('transaction'));
  const iCom = header.findIndex(h => h.includes('commission'));
  const iCAll = header.findIndex(h => h.includes('all'));
  const iCUniq = header.findIndex(h => h.includes('unique'));
  if (iDate < 0) return [];
  const out = [];
  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    const d = mcParseMonthDay(row[iDate]);
    if (!d) continue;
    out.push({
      date: d,
      transactions: Math.round(mcNum(row[iTx])),
      commission: mcNum(row[iCom]),
      clicks_all: Math.round(mcNum(row[iCAll])),
      clicks_unique: Math.round(mcNum(row[iCUniq]))
    });
  }
  return out;
}

function mcScrapeApexTable() {
  // Fallback: pega a tabela visivel na pagina Stats
  const tables = document.querySelectorAll('table');
  for (const t of tables) {
    const head = [...t.querySelectorAll('thead th, tr th')].map(x => x.textContent.trim().toLowerCase());
    const hasDate = head.some(h => h === 'date');
    const hasCom = head.some(h => h.includes('commission'));
    if (!hasDate || !hasCom) continue;
    const iDate = head.findIndex(h => h === 'date');
    const iTx = head.findIndex(h => h.includes('transaction'));
    const iCom = head.findIndex(h => h.includes('commission'));
    const iCAll = head.findIndex(h => h.includes('all'));
    const iCUniq = head.findIndex(h => h.includes('unique'));
    const body = t.querySelectorAll('tbody tr');
    const out = [];
    body.forEach(tr => {
      const tds = [...tr.querySelectorAll('td')].map(x => x.textContent.trim());
      const d = mcParseMonthDay(tds[iDate]);
      if (!d) return;
      out.push({
        date: d,
        transactions: Math.round(mcNum(tds[iTx])),
        commission: mcNum(tds[iCom]),
        clicks_all: Math.round(mcNum(tds[iCAll])),
        clicks_unique: Math.round(mcNum(tds[iCUniq]))
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
