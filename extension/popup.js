const FIRMS = [
  { id:'apex',    name:'Apex',    url:'https://dashboard.apextraderfunding.com/aff/member/stats', action:'sync_apex' },
  { id:'bulenox', name:'Bulenox', url:'https://dashboard.bulenox.com/aff/member/stats',           action:'sync_bulenox' },
  { id:'ftmo',    name:'FTMO',    url:'https://trader.ftmo.com/affiliate',                         action:'sync_ftmo' }
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
