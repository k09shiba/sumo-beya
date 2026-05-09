// Service Worker（フェーズ7で本実装）
// 現時点では基本的なキャッシュのみ対応

const CACHE_NAME = 'sumo-beya-v1';
const CACHE_FILES = [
  '/',
  '/index.html',
  '/css/style.css',
  '/js/main.js',
  '/js/game.js',
  '/js/wrestler.js',
  '/js/tournament.js',
  '/js/stable.js',
  '/js/save.js',
  'https://fonts.googleapis.com/css2?family=DotGothic16&display=swap'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(CACHE_FILES))
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
      )
    )
  );
});

// Cache First戦略
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then(cached => {
      return cached || fetch(event.request);
    })
  );
});
