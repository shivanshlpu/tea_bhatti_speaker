const CACHE_NAME = 'tea-bhatti-v15';

// 1. Core App Shell (Cached instantly in <50ms during SW install)
const CORE_STATIC_ASSETS = [
  '/',
  '/index.html',
  '/styles/tokens.css',
  '/styles/light.css',
  '/styles/dark.css',
  '/data/menuData.js',
  '/components/Toast.js',
  '/components/ItemCard.js',
  '/components/CategoryTabs.js',
  '/scripts/socket.io.min.js',
  '/scripts/announceClient.js',
  '/scripts/search.js',
  '/scripts/favorites.js',
  '/scripts/settingsPanel.js',
  '/scripts/historyView.js',
  '/scripts/app.js',
  '/scripts/pwaInstall.js',
  '/images/logo.png'
];

// Install Event — Instant load: cache ONLY critical app shell (0ms latency!)
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('⚡ [SW] Instantly caching core app shell...');
      return cache.addAll(CORE_STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

// Activate Event — Clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

// Fetch Event — Cache-First strategy (Instant 0ms response)
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Cache-First strategy for images & pre-recorded audio clips
  if (url.pathname.startsWith('/menu_images') || url.pathname.startsWith('/images') || url.pathname.startsWith('/audio_clips') || event.request.destination === 'image' || event.request.destination === 'audio') {
    event.respondWith(
      caches.open(CACHE_NAME).then((cache) => {
        return cache.match(event.request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          return fetch(event.request).then((networkResponse) => {
            if (networkResponse.status === 200) {
              cache.put(event.request, networkResponse.clone());
            }
            return networkResponse;
          }).catch(() => cachedResponse);
        });
      })
    );
    return;
  }

  // Network-first for API requests
  if (url.pathname.startsWith('/api')) {
    event.respondWith(
      fetch(event.request).catch(() => caches.match(event.request))
    );
    return;
  }

  // Cache-first for all other static app shell files
  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request))
  );
});

