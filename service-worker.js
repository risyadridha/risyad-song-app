/* Kirana Music — Service Worker
 * Strategi hemat kuota:
 *  - App shell (HTML/CSS/JS/ikon) di-cache saat install (cache-first).
 *  - Audio TIDAK di-cache saat install. Audio yang sudah pernah diputar
 *    di-cache on-demand dengan batas maksimal (MAX_AUDIO_CACHE).
 */
const APP_CACHE = 'Risyad-app-v2';
const AUDIO_CACHE = 'Risyad-audio-v1';
const MAX_AUDIO_CACHE = 10;

const APP_SHELL = [
  './',
  './index.html',
  './manifest.json',
  './css/style.css',
  './js/songs.js',
  './js/storage.js',
  './js/player.js',
  './js/search.js',
  './js/ui.js',
  './js/app.js',
  './assets/icons/icon-192.png',
  './assets/icons/icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(APP_CACHE).then((cache) => cache.addAll(APP_SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.map((k) => {
          if (k !== APP_CACHE && k !== AUDIO_CACHE) return caches.delete(k);
          return null;
        })
      )
    ).then(() => self.clients.claim())
  );
});

function isAudioRequest(url) {
  return url.pathname.includes('/assets/music/') ||
    url.pathname.endsWith('.mp3') ||
    url.pathname.endsWith('.wav') ||
    url.pathname.endsWith('.ogg') ||
    url.pathname.endsWith('.m4a');
}

async function trimAudioCache() {
  const cache = await caches.open(AUDIO_CACHE);
  const keys = await cache.keys();
  if (keys.length > MAX_AUDIO_CACHE) {
    // Hapus yang paling lama (FIFO sederhana)
    const excess = keys.length - MAX_AUDIO_CACHE;
    for (let i = 0; i < excess; i++) {
      await cache.delete(keys[i]);
    }
  }
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);

  // Hanya handle same-origin. Biarkan request cross-origin lewat.
  if (url.origin !== self.location.origin) return;

  // Audio: cache on-demand setelah pernah diputar (bukan saat install).
  if (isAudioRequest(url)) {
    event.respondWith(
      caches.open(AUDIO_CACHE).then(async (cache) => {
        const cached = await cache.match(request);
        if (cached) return cached;
        try {
          const res = await fetch(request);
          // Hanya cache response valid + file kecil (< 25MB) agar storage aman.
          const len = Number(res.headers.get('content-length') || 0);
          if (res.ok && (len === 0 || len < 25 * 1024 * 1024)) {
            cache.put(request, res.clone()).then(() => trimAudioCache());
          }
          return res;
        } catch (err) {
          if (cached) return cached;
          throw err;
        }
      })
    );
    return;
  }

  // App shell: cache-first, fallback ke network lalu update cache.
  event.respondWith(
    caches.match(request, { ignoreSearch: false }).then((cached) => {
      if (cached) return cached;
      return fetch(request).then((res) => {
        if (res.ok && (request.destination === 'document' ||
            request.destination === 'style' ||
            request.destination === 'script' ||
            request.destination === 'image')) {
          const copy = res.clone();
          caches.open(APP_CACHE).then((cache) => cache.put(request, copy));
        }
        return res;
      }).catch(() => {
        // Fallback offline untuk navigasi
        if (request.mode === 'navigate') {
          return caches.match('./index.html');
        }
        throw new Error('offline');
      });
    })
  );
});
