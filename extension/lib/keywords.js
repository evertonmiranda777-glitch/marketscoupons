// Shared Keywords page scraper para amember (Apex, Bulenox).
// Pagina tipica: /aff/member/keywords — tabela com colunas:
//   keyword | clicks | unique clicks | leads/signups | sales/transactions | commission
// Nomes variam um pouco; a deteccao e por substring case-insensitive.

function mcIsKeywordsPage() {
  const p = location.pathname.toLowerCase();
  return /\/aff\/(member\/)?keywords?(\/|$)/.test(p) || /\/keywords?(\/|$)/.test(p) && /aff/.test(p);
}

function mcScrapeKeywordsTable() {
  const tables = document.querySelectorAll('table');
  for (const t of tables) {
    const head = [...t.querySelectorAll('thead th, tr th')].map(x => x.textContent.trim().toLowerCase());
    if (!head.length) continue;
    const iKw = head.findIndex(h => h === 'keyword' || h.includes('keyword') || h === 'subid' || h.includes('sub id'));
    if (iKw < 0) continue;
    const iComm = head.findIndex(h => h.includes('commission') || h.includes('referral fee') || h.includes('fee earned') || h.includes('earned'));
    const iSales = head.findIndex(h => h === 'sales' || h.includes('transaction') || h === 'tx');
    const iLeads = head.findIndex(h => h.includes('lead') || h.includes('signup') || h.includes('sign-up') || h.includes('registration'));
    const iClicksAll = head.findIndex(h => h.includes('all') && h.includes('click'));
    const iClicksUniq = head.findIndex(h => h.includes('unique') && h.includes('click'));
    const iClicksCombined = head.findIndex((h, idx) => idx !== iClicksAll && idx !== iClicksUniq && h.includes('click'));

    const rows = t.querySelectorAll('tbody tr');
    const out = [];
    rows.forEach(tr => {
      const tds = [...tr.querySelectorAll('td')].map(x => x.textContent.trim());
      if (!tds.length) return;
      const keyword = (tds[iKw] || '').trim();
      if (!keyword || /^total/i.test(keyword)) return;
      let clicks = 0, unique_clicks = 0;
      if (iClicksAll >= 0) clicks = Math.round(mcNum(tds[iClicksAll]));
      if (iClicksUniq >= 0) unique_clicks = Math.round(mcNum(tds[iClicksUniq]));
      if (!clicks && !unique_clicks && iClicksCombined >= 0) {
        const raw = tds[iClicksCombined] || '';
        const m = /(\d+)\s*\/\s*(\d+)/.exec(raw);
        if (m) { clicks = +m[1]; unique_clicks = +m[2]; }
        else clicks = Math.round(mcNum(raw));
      }
      out.push({
        keyword,
        clicks,
        unique_clicks,
        leads: iLeads >= 0 ? Math.round(mcNum(tds[iLeads])) : 0,
        sales: iSales >= 0 ? Math.round(mcNum(tds[iSales])) : 0,
        commission: iComm >= 0 ? mcNum(tds[iComm]) : 0
      });
    });
    if (out.length) return out;
  }
  return [];
}

async function mcSyncKeywords(firmId, source) {
  if (!mcIsKeywordsPage()) return { ok:false, reason:'not_keywords_page' };
  const rows = mcScrapeKeywordsTable();
  if (!rows.length) return { ok:false, reason:'no_keyword_rows' };
  const affId = (document.cookie.match(/amember_aff_id=([^;]+)/) || [])[1] || null;
  const res = await fetch(MC_CONFIG.endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + MC_CONFIG.anonKey,
      'apikey': MC_CONFIG.anonKey
    },
    body: JSON.stringify({
      firm: firmId,
      source: source || ('ext_' + firmId + '_keywords_v1'),
      affiliate_id: affId ? decodeURIComponent(affId) : null,
      keyword_rows: rows
    })
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return { ok:false, error: data.error || ('HTTP ' + res.status), rows: rows.length };
  return { ok:true, rows: rows.length, ...data };
}
