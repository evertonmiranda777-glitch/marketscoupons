// Bulenox: pagina Affiliate Info -> Statistics tem "Download Report (CSV File)"
(async () => {
  try {
    if (typeof mcIsKeywordsPage === 'function' && mcIsKeywordsPage()) {
      const out = await mcSyncKeywords('bulenox', 'ext_bulenox_keywords_v1');
      if (out.ok) mcToastBL(`Bulenox keywords: ${out.rows} linhas sincronizadas`);
      else if (out.reason !== 'no_keyword_rows') mcToastBL('Bulenox keywords: ' + (out.error || out.reason));
      return;
    }
    const auto = await mcShouldAutoSyncBL('bulenox');
    if (!auto) return;
    await mcSyncBulenox({ auto: true });
  } catch (e) { console.warn('[MC] bulenox auto-sync erro:', e); }
})();

async function mcShouldAutoSyncBL(firmId) {
  return new Promise(resolve => {
    chrome.storage.local.get(['mc_last_sync'], r => {
      const last = (r.mc_last_sync || {})[firmId] || 0;
      resolve((Date.now() - last) / 60000 >= 30);
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

  // 3) Bulenox NÃO expõe transactions/day na tabela nem no CSV — só no Morris.Line chart inline.
  // Buscamos a página do mês corrente e extraímos y2 (=sales) por dia.
  try {
    const chartRows = await mcFetchBulenoxChart();
    if (chartRows.length) {
      const byDate = new Map(chartRows.map(r => [r.date, r]));
      rows = rows.map(r => byDate.has(r.date) ? { ...r, ...byDate.get(r.date) } : r);
      // Dias do chart que não estavam em rows (CSV vazio mas chart tem dado)
      for (const cr of chartRows) {
        if (!rows.find(r => r.date === cr.date)) rows.push(cr);
      }
    }
  } catch (e) { console.warn('[MC] bulenox chart parse erro:', e); }

  // 3) NOVO: scrape transactions individuais (vai pra affiliate_conversions)
  const leads = await mcFetchBulenoxTransactions();

  if (!rows.length && !leads.length) { mcToastBL('Bulenox: sem dados — abra /aff/member/stats'); return { ok:false }; }

  const out = await mcSendBL({
    firm: 'bulenox',
    source: 'ext_bulenox_v2',
    affiliate_id: decodeURIComponent(affId),
    rows,
    leads
  });
  if (out.ok) {
    mcToastBL(`Bulenox: ${rows.length} dias + ${leads.length} transacoes sincronizadas`);
    await mcMarkSyncBL('bulenox');
  } else {
    mcToastBL('Bulenox: erro — ' + (out.error || '?'));
  }
  return out;
}

// Bulenox stats page tem Morris.Line chart com {x:ts_ms, y0:unique, y1:all, y2:transactions} por dia.
// Único lugar onde o painel expõe transactions diárias (tabela/CSV só tem commission+clicks).
async function mcFetchBulenoxChart() {
  try {
    const now = new Date();
    const my = `${now.getUTCFullYear()}${String(now.getUTCMonth()+1).padStart(2,'0')}`;
    const r = await fetch(`/member/aff/member/stats?monthyear=${my}`, { credentials: 'include' });
    if (!r.ok) return [];
    const html = await r.text();
    const matches = [...html.matchAll(/new Morris\.Line\((\{[^;]*?\})\);/g)];
    const parsed = matches.map(m => { try { return JSON.parse(m[1]); } catch { return null; } }).filter(Boolean);
    const commChart = parsed.find(c => c.labels && c.labels.includes('Commission') && (c.ykeys || []).length === 1);
    const clkChart = parsed.find(c => (c.ykeys || []).includes('y2'));
    if (!clkChart || !commChart) return [];
    const commByTs = {};
    commChart.data.forEach(p => { commByTs[p.x] = p.y0; });
    return clkChart.data.map(p => {
      const d = new Date(p.x);
      return {
        date: `${d.getUTCFullYear()}-${String(d.getUTCMonth()+1).padStart(2,'0')}-${String(d.getUTCDate()).padStart(2,'0')}`,
        granularity: 'day',
        transactions: Number(p.y2) || 0,
        commission: Number(commByTs[p.x]) || 0,
        clicks_unique: Number(p.y0) || 0,
        clicks_all: Number(p.y1) || 0
      };
    }).filter(r => r.transactions || r.commission || r.clicks_all);
  } catch (e) { return []; }
}

async function mcFetchBulenoxTransactions() {
  const baseUrl = location.origin;
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
      const leads = mcParseBulenoxTransactionsHtml(html);
      if (leads.length) {
        console.log('[MC] Bulenox transactions encontrado em', url, '— leads:', leads.length);
        return leads;
      }
    } catch (e) {}
  }
  return [];
}

function mcParseBulenoxTransactionsHtml(html) {
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
        date: mcParseBulenoxDate(dateRaw) || dateRaw,
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

function mcParseBulenoxDate(s) {
  if (!s) return null;
  let m = /(\d{4})-(\d{2})-(\d{2})/.exec(s);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  m = /(\d{1,2})\/(\d{1,2})\/(\d{4})/.exec(s);
  if (m) return `${m[3]}-${m[1].padStart(2,'0')}-${m[2].padStart(2,'0')}`;
  return null;
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
