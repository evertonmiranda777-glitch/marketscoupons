// TradeDay: idevaffiliate-style panel (similar to E2T)
(async () => {
  try {
    const auto = await mcShouldAutoSyncTD('tradeday');
    if (!auto) return;
    await mcSyncTD({ auto: true });
  } catch (e) { console.warn('[MC] tradeday auto-sync erro:', e); }
})();

async function mcShouldAutoSyncTD(firmId) {
  return new Promise(resolve => {
    chrome.storage.local.get(['mc_last_sync'], r => {
      const last = (r.mc_last_sync || {})[firmId] || 0;
      resolve((Date.now() - last) / 3600000 >= 6);
    });
  });
}

async function mcMarkSyncTD(firmId) {
  return new Promise(resolve => {
    chrome.storage.local.get(['mc_last_sync'], r => {
      const map = r.mc_last_sync || {};
      map[firmId] = Date.now();
      chrome.storage.local.set({ mc_last_sync: map }, resolve);
    });
  });
}

async function mcSyncTD(opts = {}) {
  // PostAffiliatePro: transacoes estao em #Commissions, nao em #Home
  const onCommissions = /commission/i.test(location.hash);
  if (!onCommissions) {
    await mcTDNavigateToCommissions();
  }
  // espera tabela renderizar (AJAX), ate 15s
  for (let i = 0; i < 30; i++) {
    await new Promise(r => setTimeout(r, 500));
    const rows = mcScrapeTDTable();
    if (rows.length) break;
    const heads = [...document.querySelectorAll('table th')].map(x => (x.textContent || '').toLowerCase());
    if (heads.some(h => h.includes('commission') || h.includes('amount'))) break;
  }

  const leads = mcScrapeTDTable();

  // painel vazio e cenario legitimo (0 vendas ate agora), marca sync pra nao loop
  if (!leads.length) {
    const bodyText = (document.body.innerText || '').toLowerCase();
    const hasCommissionsTable = [...document.querySelectorAll('table th')].some(th => /commission|amount/i.test(th.textContent || ''));
    const hasCommissionsHeading = /^|\s|>commissions</i.test(document.body.innerHTML) && /commissions/i.test(document.querySelector('h1,h2,h3')?.textContent || '');
    const hasEmptyMessage = /there are no available data|nothing that matches/i.test(bodyText);
    // Chegou na pagina de Commissions (por heading OU mensagem de vazio OU tabela), mas sem linhas
    if (hasCommissionsTable || hasEmptyMessage || hasCommissionsHeading) {
      mcToastTD('TradeDay: 0 transacoes (painel vazio)');
      await mcMarkSyncTD('tradeday');
      // avisa backend mesmo com zero pra registrar atividade
      await mcSendTD({ firm:'tradeday', source:'ext_tradeday_v1', rows:[], leads:[] }).catch(()=>{});
      return { ok:true, rows:0, leads:0 };
    }
    mcToastTD('TradeDay: abra a aba Commissions manualmente');
    return { ok:false, reason:'no_commissions_page' };
  }

  const byDay = {};
  leads.forEach(l => {
    if (!l.date) return;
    if (!byDay[l.date]) byDay[l.date] = { date: l.date, transactions: 0, commission: 0, granularity: 'day' };
    byDay[l.date].transactions += 1;
    byDay[l.date].commission += Number(l.commission) || 0;
  });
  const rows = Object.values(byDay);

  const out = await mcSendTD({
    firm: 'tradeday',
    source: 'ext_tradeday_v1',
    rows,
    leads
  });
  if (out.ok) {
    mcToastTD(`TradeDay: ${rows.length} dias, ${leads.length} leads`);
    await mcMarkSyncTD('tradeday');
  } else {
    mcToastTD('TradeDay: erro, ' + (out.error || '?'));
  }
  return out;
}

async function mcTDNavigateToCommissions() {
  // 1. Procura link "Commissions" na sidebar (exato, case insensitive)
  const candidates = [...document.querySelectorAll('a,span,div,li,button')].filter(el => {
    const t = (el.textContent || '').trim();
    return /^commissions$/i.test(t) && (el.offsetParent !== null);
  });
  // Prefere o mais raso (menos filhos = link direto)
  candidates.sort((a,b) => (a.querySelectorAll('*').length || 0) - (b.querySelectorAll('*').length || 0));
  const target = candidates[0];
  if (target) {
    // Dispara mousedown + mouseup + click pra SPAs que nao escutam .click() puro
    ['mousedown','mouseup','click'].forEach(type => {
      target.dispatchEvent(new MouseEvent(type, { bubbles:true, cancelable:true, view:window, button:0 }));
    });
    await new Promise(r => setTimeout(r, 600));
    if (/commission/i.test(location.hash)) return true;
  }
  // 2. Fallback: tenta hashes conhecidos do PAP
  const hashes = ['#Commissions','#CommissionsOverview','#AffiliateCommissions','#AffiliateCommissionsOverview'];
  for (const h of hashes) {
    location.hash = h;
    await new Promise(r => setTimeout(r, 700));
    // se tabela com Commission apareceu, parou aqui
    if ([...document.querySelectorAll('table th')].some(th => /commission|amount/i.test(th.textContent || ''))) return true;
  }
  return false;
}

function mcScrapeTDTable() {
  const out = [];
  document.querySelectorAll('table').forEach(t => {
    const head = [...t.querySelectorAll('thead th, tr th')].map(x => x.textContent.trim().toLowerCase());
    const hasDate = head.some(h => h.includes('date'));
    const hasValue = head.some(h => h.includes('commission') || h.includes('amount') || h.includes('earning'));
    if (!hasDate || !hasValue) return;
    const iDate = head.findIndex(h => h.includes('date'));
    const iCom = head.findIndex(h => h.includes('commission') || h.includes('earning'));
    const iAmt = head.findIndex(h => h.includes('amount') || h.includes('total'));
    const iStat = head.findIndex(h => h.includes('status'));
    t.querySelectorAll('tbody tr').forEach(tr => {
      const tds = [...tr.querySelectorAll('td')].map(x => x.textContent.trim());
      if (!tds.length) return;
      const d = mcTDParseDate(tds[iDate]);
      if (!d) return;
      const commission = iCom >= 0 ? mcTDNum(tds[iCom]) : (iAmt >= 0 ? mcTDNum(tds[iAmt]) : 0);
      out.push({
        date: d,
        commission,
        amount: iAmt >= 0 ? mcTDNum(tds[iAmt]) : commission,
        status: iStat >= 0 ? tds[iStat] : 'paid'
      });
    });
  });
  return out;
}

function mcTDNum(s) {
  if (s === '' || s == null) return 0;
  const n = parseFloat(String(s).replace(/[^\d.,\-]/g, '').replace(/\.(?=\d{3}\b)/g, '').replace(',', '.'));
  return isNaN(n) ? 0 : n;
}

function mcTDParseDate(s) {
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

async function mcSendTD(payload) {
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

function mcToastTD(msg) {
  const el = document.createElement('div');
  el.textContent = '[MC] ' + msg;
  el.style.cssText = 'position:fixed;bottom:20px;right:20px;background:#0a0a0a;color:#f0b429;padding:12px 18px;border-radius:8px;font:13px/1.4 system-ui;z-index:999999;box-shadow:0 8px 24px rgba(0,0,0,.4);border:1px solid rgba(240,180,41,.3);';
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 4000);
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg && msg.action === 'sync_tradeday') {
    mcSyncTD({ auto: false }).then(sendResponse);
    return true;
  }
});
