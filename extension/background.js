// MarketsCoupons Sync, background service worker (MV3)
// Keep-alive agressivo pra impedir Chrome de matar o SW.
// Estratégia: chrome.alarms periodic (30s) + touch storage + ping fetch leve.
// Combinado, mantém SW reativo continuamente. SW pode ainda mostrar "inativa"
// entre ticks no chrome://extensions, mas responde imediatamente quando precisa
// (content script dispara, alarm acorda, mensagem chega).

const KEEPALIVE_ALARM = 'mc_keepalive';
const KEEPALIVE_PERIOD_MIN = 0.5; // 30 segundos (mínimo permitido pelo MV3)

// Cria/recria o alarm em todos os eventos de vida do SW
function ensureKeepAlive() {
  chrome.alarms.get(KEEPALIVE_ALARM, (existing) => {
    if (!existing) {
      chrome.alarms.create(KEEPALIVE_ALARM, { periodInMinutes: KEEPALIVE_PERIOD_MIN });
      console.log('[MC] keep-alive alarm criado');
    }
  });
}

chrome.runtime.onInstalled.addListener(() => {
  console.log('[MC] MarketsCoupons Sync instalada/atualizada.');
  ensureKeepAlive();
  ensureAutoFetch();
});

chrome.runtime.onStartup.addListener(() => {
  console.log('[MC] Chrome iniciou, re-armando keep-alive.');
  ensureKeepAlive();
  ensureAutoFetch();
});

// Toda vez que o SW carrega (cold start), garante os alarms
ensureKeepAlive();
ensureAutoFetch();

// ===== Auto-fetch de firmas que so sincronizam via DOM (sem Markets Monitor) =====
// Abre a pagina de orders numa aba de FUNDO usando a sessao ja logada do usuario,
// deixa o content script (fff.js) raspar+sincronizar, e fecha a aba. SEM credencial:
// reusa o cookie de sessao do proprio navegador. So abre se houver sessao ativa.
const AUTOFETCH_ALARM = 'mc_autofetch';
const AUTOFETCH_PERIOD_MIN = 30;
const AUTOFETCH_TARGETS = [
  {
    id: 'fff',
    cookieDomain: 'fundedfuturesfamily.com',
    url: 'https://app.fundedfuturesfamily.com/affiliate/affiliate-orders/?filter=all_time',
    closeAfterMs: 40000
  }
];

function ensureAutoFetch() {
  chrome.alarms.get(AUTOFETCH_ALARM, (existing) => {
    if (!existing) {
      chrome.alarms.create(AUTOFETCH_ALARM, { periodInMinutes: AUTOFETCH_PERIOD_MIN, delayInMinutes: 1 });
      console.log('[MC] auto-fetch alarm criado (' + AUTOFETCH_PERIOD_MIN + 'min)');
    }
  });
}

function mcHasSession(domain) {
  return new Promise((resolve) => {
    try {
      chrome.cookies.getAll({ domain }, (cookies) => {
        resolve(Array.isArray(cookies) && cookies.length > 0);
      });
    } catch (e) { resolve(false); }
  });
}

async function runAutoFetch() {
  for (const t of AUTOFETCH_TARGETS) {
    try {
      const logged = await mcHasSession(t.cookieDomain);
      if (!logged) { console.log('[MC] auto-fetch ' + t.id + ': sem sessao, pula'); continue; }
      chrome.tabs.create({ url: t.url, active: false }, (tab) => {
        if (!tab || !tab.id) return;
        console.log('[MC] auto-fetch ' + t.id + ': aba de fundo aberta');
        // Da tempo do content script rodar (document_idle + scrape + POST) e fecha.
        setTimeout(() => {
          try { chrome.tabs.remove(tab.id).catch(() => {}); } catch (e) { /* silent */ }
        }, t.closeAfterMs);
      });
    } catch (e) { console.warn('[MC] auto-fetch erro ' + t.id + ':', e); }
  }
}

// Listener do alarm, operação curta pra manter SW reativo
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === KEEPALIVE_ALARM) {
    const now = Date.now();
    // Touch storage (operação async leve), força SW a permanecer awake
    chrome.storage.local.set({ mc_last_keepalive: now }, () => {
      // Ping silencioso pra Supabase (apenas pra manter a network connection ativa).
      // Chrome estende lifetime do SW enquanto houver fetch pendente.
      fetch('https://qfwhduvutfumsaxnuofa.supabase.co/rest/v1/', {
        method: 'HEAD',
        cache: 'no-store'
      }).catch(() => { /* silent */ });
    });
  } else if (alarm.name === AUTOFETCH_ALARM) {
    runAutoFetch();
  }
});

// Listener de mensagens, mantém SW reativo quando popup ou content scripts comunicam
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg && msg.action === 'ping') {
    sendResponse({ alive: true, ts: Date.now() });
    return true;
  }
  // Outras actions: deixa passar pros listeners específicos dos content scripts
  return false;
});

// Listener de connect, qualquer port aberto mantém SW vivo
chrome.runtime.onConnect.addListener((port) => {
  port.onDisconnect.addListener(() => {
    // Garante que keep-alive continua após disconnect
    ensureKeepAlive();
  });
});
