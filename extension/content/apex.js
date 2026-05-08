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

  // 1) Daily aggregates (existente — vai pra affiliate_daily_stats)
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

  // 2) Transactions individuais (NOVO — vai pra affiliate_conversions, alimenta matcher)
  const leads = await mcFetchApexTransactions(affId);

  if (!rows.length && !leads.length) { mcToast('Apex: nenhum dado encontrado'); return { ok:false, reason:'no_data' }; }

  const payload = {
    firm: 'apex',
    source: 'ext_apex_v2',
    affiliate_id: affId,
    rows,
    leads
  };
  const out = await mcSend(payload);
  if (out.ok) {
    mcToast(`Apex: ${rows.length} dias + ${leads.length} transacoes sincronizadas`);
    await mcMarkSync('apex');
  } else {
    mcToast('Apex: erro ao enviar — ' + (out.error || 'desconhecido'));
  }
  return out;
}

// NOVO: scrape transactions individuais. amember-pro tipicamente expõe em:
//   /aff/member/transactions
//   /aff/member/leads (algumas firmas)
//   /aff/stat?group=transactions
// Tentamos os 3 + parse adaptativo da tabela.
async function mcFetchApexTransactions(affId) {
  const baseUrl = location.origin; // ex: https://dashboard.apextraderfunding.com
  const candidates = [
    baseUrl + '/aff/member/transactions',
    baseUrl + '/aff/stat?period=last-3m&group=transactions',
    baseUrl + '/aff/member/leads'
  ];
  for (const url of candidates) {
    try {
      const res = await fetch(url, { credentials: 'include', headers: { 'Accept': 'text/html' }});
      if (!res.ok) continue;
      const html = await res.text();
      const leads = mcParseApexTransactionsHtml(html);
      if (leads.length) {
        console.log('[MC] Apex transactions encontrado em', url, '— leads:', leads.length);
        return leads;
      }
    } catch (e) {}
  }
  return [];
}

function mcParseApexTransactionsHtml(html) {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const tables = doc.querySelectorAll('table');
  for (const t of tables) {
    const head = [...t.querySelectorAll('thead th, tr th')].map(x => x.textContent.trim().toLowerCase());
    const hasOrder = head.some(h => h.includes('order') || h.includes('invoice') || h.includes('id'));
    const hasAmt = head.some(h => h.includes('amount') || h.includes('commission') || h.includes('fee') || h.includes('value'));
    const hasDate = head.some(h => h.includes('date') || h.includes('time'));
    if (!(hasOrder && hasAmt && hasDate)) continue;

    const iOrder = head.findIndex(h => h.includes('order') || h.includes('invoice') || (h.includes('id') && !h.includes('user')));
    const iAmt = head.findIndex(h => h.includes('commission') || h.includes('amount') || h.includes('fee') || h.includes('value'));
    const iDate = head.findIndex(h => h.includes('date') || h.includes('time'));
    const iKw = head.findIndex(h => h.includes('keyword') || h.includes('sub') || h.includes('campaign') || h.includes('source'));
    const iStatus = head.findIndex(h => h.includes('status'));
    const iEmail = head.findIndex(h => h.includes('email') || h.includes('user') || h.includes('customer'));

    const rows = t.querySelectorAll('tbody tr');
    const leads = [];
    rows.forEach(tr => {
      const tds = [...tr.querySelectorAll('td')].map(x => x.textContent.trim());
      const order_id = tds[iOrder] || '';
      const amount = mcNum(tds[iAmt] || '');
      const dateRaw = tds[iDate] || '';
      const sub_id = iKw >= 0 ? (tds[iKw] || '') : '';
      const status = iStatus >= 0 ? (tds[iStatus] || 'approved').toLowerCase() : 'approved';
      const email = iEmail >= 0 ? (tds[iEmail] || '') : '';
      if (!order_id || !amount) return;
      leads.push({
        order_id,
        amount,
        date: mcParseDateIso(dateRaw) || dateRaw,
        sub_id,
        status: status.includes('paid') || status.includes('approved') ? 'approved' : (status.includes('pend') ? 'pending' : 'approved'),
        email,
        raw: { dateRaw, order_id, amount, sub_id }
      });
    });
    if (leads.length) return leads;
  }
  return [];
}

function mcParseDateIso(s) {
  if (!s) return null;
  // tenta YYYY-MM-DD ou MM/DD/YYYY
  let m = /(\d{4})-(\d{2})-(\d{2})/.exec(s);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  m = /(\d{1,2})\/(\d{1,2})\/(\d{4})/.exec(s);
  if (m) return `${m[3]}-${m[1].padStart(2,'0')}-${m[2].padStart(2,'0')}`;
  return null;
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
