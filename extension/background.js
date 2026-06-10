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
});

chrome.runtime.onStartup.addListener(() => {
  console.log('[MC] Chrome iniciou, re-armando keep-alive.');
  ensureKeepAlive();
});

// Toda vez que o SW carrega (cold start), garante o alarm
ensureKeepAlive();

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
