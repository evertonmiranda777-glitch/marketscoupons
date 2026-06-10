// Markets Coupons, Service Worker (PWA Fase 1)
// Cache conservador: app shell em cache-first, HTML/API sempre network.
// Push handlers entram na Fase 2.

const SW_VERSION = 'mc-sw-v4-2026-05-29';
const SHELL_CACHE = 'mc-shell-v3';
const IMG_CACHE = 'mc-img-v2';
const OFFLINE_URL = '/offline.html';

const SHELL_ASSETS = [
  '/manifest.json',
  '/offline.html',
  '/img/pwa/icon-192.png',
  '/img/pwa/icon-512.png',
  '/img/pwa/icon-maskable-512.png',
  '/img/pwa/apple-touch-icon.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then((c) => c.addAll(SHELL_ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((k) => ![SHELL_CACHE, IMG_CACHE].includes(k)).map((k) => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // Same-origin somente
  if (url.origin !== self.location.origin) return;

  // HTML navigations: network-first with offline fallback
  if (req.mode === 'navigate' || (req.headers.get('accept') || '').includes('text/html')) {
    event.respondWith(
      fetch(req).catch(() => caches.match(OFFLINE_URL).then(r => r || new Response('Offline', { status: 503, headers: { 'Content-Type': 'text/plain' } })))
    );
    return;
  }
  // APIs / auth: never cache
  if (url.pathname.startsWith('/api/') || url.pathname.includes('/auth')) {
    return;
  }

  // Imagens em /img/ → stale-while-revalidate
  if (url.pathname.startsWith('/img/')) {
    event.respondWith(
      caches.open(IMG_CACHE).then(async (cache) => {
        const cached = await cache.match(req);
        const network = fetch(req).then((res) => {
          if (res && res.status === 200) cache.put(req, res.clone());
          return res;
        }).catch(() => cached);
        return cached || network;
      })
    );
    return;
  }

  // Shell assets do manifest → cache-first
  if (SHELL_ASSETS.includes(url.pathname)) {
    event.respondWith(
      caches.match(req).then((cached) => cached || fetch(req))
    );
    return;
  }

  // resto: deixa o browser decidir (network com cache HTTP)
});

// Atalho pra forçar atualização via postMessage
self.addEventListener('message', (event) => {
  if (event.data === 'skipWaiting') self.skipWaiting();
});

// Push handlers, recebe push do servidor e exibe notificação
self.addEventListener('push', (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch (e) {
    try { payload = { title: 'Markets Coupons', body: event.data?.text() || '' }; } catch (_) {}
  }
  const title = payload.title || 'Markets Coupons';
  const options = {
    body: payload.body || '',
    icon: payload.icon || '/img/pwa/icon-192.png',
    badge: payload.badge || '/img/pwa/icon-192.png',
    image: payload.image || undefined,
    tag: payload.tag || 'mc-default',
    data: { url: payload.url || '/', event_id: payload.event_id || null, category: payload.category || null },
    requireInteraction: !!payload.requireInteraction,
    actions: payload.actions || []
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

// Click numa notificação, abre URL e registra evento
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const data = event.notification.data || {};
  const url = data.url || '/';
  event.waitUntil((async () => {
    // Ping pro endpoint de tracking (best-effort)
    try {
      await fetch('/api/push?action=click', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event_id: data.event_id, category: data.category, url, ts: Date.now() })
      });
    } catch (_) {}
    // Foca aba existente ou abre nova
    const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const c of clients) {
      if (c.url.includes(new URL(url, self.location.origin).pathname) && 'focus' in c) return c.focus();
    }
    if (self.clients.openWindow) return self.clients.openWindow(url);
  })());
});

// Renovação de subscription (browser pode rodar), re-sincroniza com servidor
self.addEventListener('pushsubscriptionchange', (event) => {
  event.waitUntil((async () => {
    try {
      const oldEndpoint = event.oldSubscription?.endpoint;
      if (oldEndpoint) {
        await fetch('/api/push?action=unsubscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endpoint: oldEndpoint })
        });
      }
      // O pwa-register.js vai reinscrever na próxima visita
    } catch (_) {}
  })());
});
