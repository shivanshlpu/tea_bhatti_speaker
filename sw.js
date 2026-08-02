const CACHE_NAME = 'tea-bhatti-v11';

// All 126 pre-recorded offline audio clips (Items 1-41 in EN, HI, BHO + Smoking Notice)
const AUDIO_CLIPS = [
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
  '/scripts/pwaInstall.js',
  '/data/menu.json',
  '/images/logo.png',
  ...AUDIO_CLIPS
];

// Install Event — Pre-cache core static assets & all audio clips for 100% offline usage
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      console.log('⚡ [SW] Pre-caching static assets and all audio clips for offline PWA...');
      // Cache assets safely (ignore individual fetch errors if any clip is missing)
      for (const asset of STATIC_ASSETS) {
        try {
          await cache.add(asset);
        } catch (err) {
          console.warn('⚠️ [SW] Could not pre-cache asset:', asset);
        }
      }
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

// Fetch Event — Cache-First for static assets & audio clips
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

