const CACHE_NAME = 'tea-bhatti-v1';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/styles/tokens.css',
  '/styles/light.css',
  '/styles/dark.css',
  '/components/Toast.js',
  '/components/ItemCard.js',
  '/components/CategoryTabs.js',
  '/scripts/announceClient.js',
  '/scripts/search.js',
  '/scripts/favorites.js',
  '/scripts/settingsPanel.js',
  '/scripts/historyView.js',
  '/scripts/app.js',
  '/images/logo.png'
];

// Install Event — Pre-cache core static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('⚡ [SW] Pre-caching static kiosk assets...');
      return cache.addAll(STATIC_ASSETS);
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

// Fetch Event — Stale-While-Revalidate caching strategy
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Cache static images, scripts & pre-recorded audio clips with SWR
  if (url.pathname.startsWith('/menu_images') || url.pathname.startsWith('/images') || url.pathname.startsWith('/audio_clips') || event.request.destination === 'image' || event.request.destination === 'audio') {
    event.respondWith(
      caches.open(CACHE_NAME).then((cache) => {
        return cache.match(event.request).then((cachedResponse) => {
          const fetchPromise = fetch(event.request).then((networkResponse) => {
            if (networkResponse.status === 200) {
              cache.put(event.request, networkResponse.clone());
            }
            return networkResponse;
          }).catch(() => cachedResponse);

          return cachedResponse || fetchPromise;
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
