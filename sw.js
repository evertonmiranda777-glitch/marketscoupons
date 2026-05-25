// Markets Coupons — Service Worker (PWA Fase 1)
// Cache conservador: app shell em cache-first, HTML/API sempre network.
// Push handlers entram na Fase 2.

const SW_VERSION = 'mc-sw-v1-2026-05-25';
const SHELL_CACHE = 'mc-shell-v1';
const IMG_CACHE = 'mc-img-v1';

const SHELL_ASSETS = [
  '/manifest.json',
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

  // Nunca cachear: HTML, APIs, auth, Supabase, qualquer rota dinâmica
  if (
    req.headers.get('accept')?.includes('text/html') ||
    url.pathname.startsWith('/api/') ||
    url.pathname.includes('/auth') ||
    url.pathname.endsWith('.html')
  ) {
    return; // browser default network
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

// Push handlers (Fase 2) — placeholders pra não dar erro se push chegar antes
self.addEventListener('push', (event) => {
  // Implementado na Fase 2
});

self.addEventListener('notificationclick', (event) => {
  // Implementado na Fase 2
});
