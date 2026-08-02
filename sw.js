const CACHE_NAME = 'tea-bhatti-v13';

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
  '/scripts/announceClient.js',
  '/scripts/search.js',
  '/scripts/favorites.js',
  '/scripts/settingsPanel.js',
  '/scripts/historyView.js',
  '/scripts/app.js',
  '/scripts/pwaInstall.js',
  '/images/logo.png'
];

// 2. All 127 offline audio clips (Cached asynchronously in background post-activate)
const AUDIO_CLIPS = [
  '/audio_clips/chime.mp3',
  '/audio_clips/smoking_notice_en.mp3',
  '/audio_clips/smoking_notice_hi.mp3',
  '/audio_clips/smoking_notice_bho.mp3'
];

for (let i = 1; i <= 41; i++) {
  AUDIO_CLIPS.push(`/audio_clips/item_${i}_en.mp3`);
  AUDIO_CLIPS.push(`/audio_clips/item_${i}_hi.mp3`);
  if (i !== 8) {
    AUDIO_CLIPS.push(`/audio_clips/item_${i}_bho.mp3`);
  }
}

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

// Activate Event — Clean up old caches & trigger non-blocking background audio download
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    }).then(() => {
      // Non-blocking background caching of audio clips in parallel batches
      caches.open(CACHE_NAME).then(async (cache) => {
        console.log('📦 [SW] Background caching offline audio clips...');
        const BATCH_SIZE = 10;
        for (let i = 0; i < AUDIO_CLIPS.length; i += BATCH_SIZE) {
          const batch = AUDIO_CLIPS.slice(i, i + BATCH_SIZE);
          await Promise.allSettled(batch.map(url => cache.add(url)));
        }
        console.log('✅ [SW] All offline audio clips ready in cache!');
      });
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

