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
  { id:'tradeday',     name:'TradeDay',     url:'https://tradeday.postaffiliatepro.com/affiliates/panel.php#Home', action:'sync_tradeday' },
  { id:'fff',          name:'FFF',          url:'https://app.fundedfuturesfamily.com/affiliate/affiliate-orders/?filter=all_time', action:'sync_fff' },
  { id:'goat',         name:'Goat',         url:'https://app.goatfundedfutures.com/affiliate', action:'sync_goat',         domain:'goatfundedfutures.com' },
  { id:'toponefutures',name:'Top One',      url:'https://toponefutures.com/',                  action:'sync_toponefutures', domain:'toponefutures.com' },
  { id:'blueguardian', name:'Blue Guardian',url:'https://blueguardian.com/',                   action:'sync_blueguardian',  domain:'blueguardian.com' },
  { id:'aquafutures',  name:'Aqua',         url:'https://checkout.aquafutures.io/',            action:'sync_aquafutures',   domain:'aquafutures.io' },
  { id:'blueberryfutures', name:'Blueberry',url:'https://portal.blueberryfutures.com/',        action:'sync_blueberryfutures', domain:'blueberryfutures.com' },
  { id:'alphafutures', name:'Alpha',        url:'https://app.alpha-futures.com/',              action:'sync_alphafutures',  domain:'alpha-futures.com' },
  { id:'futureselite', name:'Futures Elite',url:'https://app.futureselite.com/',               action:'sync_futureselite',  domain:'futureselite.com' }
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
      <button data-firm="${f.id}" data-url="${f.url}" data-action="${f.action}" data-domain="${f.domain || ''}">Sync</button>
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

  // Acha ou abre aba na URL do painel. Match por DOMINIO base (qualquer subdominio/caminho do painel)
  // quando a firma tem `domain`; senao match exato de host (firmas antigas).
  const domain = btn.dataset.domain || '';
  const tabs = await chrome.tabs.query({});
  const host = new URL(url).host;
  let tab = tabs.find(t => {
    if (!t.url) return false;
    let h; try { h = new URL(t.url).host; } catch { return false; }
    return domain ? (h === domain || h.endsWith('.' + domain)) : (h === host);
  });
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
