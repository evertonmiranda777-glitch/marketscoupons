const FIRMS = [
  { id:'apex',    name:'Apex',    url:'https://dashboard.apextraderfunding.com/aff/member/stats', action:'sync_apex' },
  { id:'bulenox', name:'Bulenox', url:'https://bulenox.com/member/aff/member/stats',               action:'sync_bulenox' },
  { id:'ftmo',    name:'FTMO',    url:'https://affiliate.ftmo.com/',                               action:'sync_ftmo' },
  { id:'tpt',     name:'Take Profit', url:'https://takeprofittrader.com/affiliate-dashboard/transactions', action:'sync_tpt' },
  { id:'fn',      name:'FundedNext',  url:'https://fundednext.firstpromoter.com/home',                     action:'sync_fn' },
  { id:'e2t',     name:'Earn2Trade',  url:'https://partners.earn2trade.com/affiliates/panel.php#Home',     action:'sync_e2t' },
  { id:'the5ers', name:'The5ers',     url:'https://hub.the5ers.com/en/affiliate',                         action:'sync_the5ers' },
  { id:'brightfunded', name:'BrightFunded', url:'https://app.brightfunded.com/affiliate/dashboard',        action:'sync_brightfunded' },
  { id:'fundingpips',  name:'FundingPips',  url:'https://app.fundingpips.com/affiliate',                   action:'sync_fundingpips' },
  { id:'e8',           name:'E8 Markets',   url:'https://e8x.e8markets.com/affiliate',                     action:'sync_e8' },
  { id:'cti',          name:'CTI',          url:'https://app.citytradersimperium.com/affiliates',          action:'sync_cti' },
  { id:'tradeday',     name:'TradeDay',     url:'https://tradeday.postaffiliatepro.com/affiliates/panel.php#Home', action:'sync_tradeday' }
];

function fmtAgo(ts) {
  if (!ts) return 'nunca';
  const diff = Date.now() - ts;
  const h = diff / 3600000;
  if (h < 1) return Math.round(diff/60000) + ' min atras';
  if (h < 24) return Math.round(h) + 'h atras';
  return Math.round(h/24) + 'd atras';
}

async function render() {
  const wrap = document.getElementById('firms');
  const { mc_last_sync = {} } = await chrome.storage.local.get(['mc_last_sync']);
  wrap.innerHTML = '';
  FIRMS.forEach(f => {
    const row = document.createElement('div');
    row.className = 'row';
    const last = mc_last_sync[f.id];
    const hours = last ? (Date.now() - last) / 3600000 : Infinity;
    const statusClass = !last ? '' : (hours < 12 ? 'ok' : 'old');
    row.innerHTML = `
      <div>
        <div class="firm">${f.name}</div>
        <div class="status ${statusClass}">${fmtAgo(last)}</div>
      </div>
      <button data-firm="${f.id}" data-url="${f.url}" data-action="${f.action}">Sync</button>
    `;
    wrap.appendChild(row);
  });
  wrap.querySelectorAll('button').forEach(b => b.addEventListener('click', onSync));
}

async function onSync(e) {
  const btn = e.currentTarget;
  const url = btn.dataset.url;
  const action = btn.dataset.action;
  btn.disabled = true; btn.textContent = '...';

  // Acha ou abre aba na URL do painel
  const tabs = await chrome.tabs.query({});
  const host = new URL(url).host;
  let tab = tabs.find(t => t.url && new URL(t.url).host === host);
  if (!tab) {
    tab = await chrome.tabs.create({ url, active: true });
    btn.textContent = 'Abra painel';
    setTimeout(() => render(), 2000);
    return;
  }
  await chrome.tabs.update(tab.id, { active: true });
  try {
    const resp = await chrome.tabs.sendMessage(tab.id, { action });
    btn.textContent = resp && resp.ok ? 'OK' : 'Erro';
  } catch (err) {
    btn.textContent = 'Recarregue';
  }
  setTimeout(() => render(), 1500);
}

render();
