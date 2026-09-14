/* Risyad Music — Service Worker
 * Hemat kuota & aman:
 *  - App shell di-cache saat install (cache-first).
 *  - Audio TIDAK di-cache saat install. Hanya on-demand setelah diputar.
 *  - Range request (seek) tidak di-cache -> langsung network agar tidak rusak.
 *  - LRU 10 lagu audio terpisah dari app shell.
 */
const APP_CACHE = 'Risyad-app-v8';
const AUDIO_CACHE = 'Risyad-audio-v1';
const MAX_AUDIO_CACHE = 10;

const APP_SHELL = [
  './',
  './index.html',
  './manifest.json',
  './css/style.css',
  './js/songs.js',
  './js/storage.js',
  './js/queue.js',
  './js/playlists.js',
  './js/sleepTimer.js',
  './js/smart.js',
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
  if (url.origin !== self.location.origin) return;

  // === AUDIO: tangani Range dengan hati-hati ===
  if (isAudioRequest(url)) {
    // Jika ada Range header (audio seek), jangan ganggu cache — langsung network.
    if (request.headers.has('range')) {
      return; // biarkan browser fetch langsung tanpa SW
    }
    event.respondWith(
      caches.open(AUDIO_CACHE).then(async (cache) => {
        const cached = await cache.match(request);
        if (cached) {
          // LRU: await agar tidak race (fix 7)
          const clone = cached.clone();
          await cache.delete(request);
          await cache.put(request, clone);
          await trimAudioCache();
          return cached;
        }
        try {
          const res = await fetch(request);
          // Hanya cache respons utuh 200, bukan 206 partial, dan ukuran wajar
          const isFull = res.ok && res.status === 200;
          const len = Number(res.headers.get('content-length') || 0);
          const isRangeRes = res.status === 206 || res.headers.has('content-range');
          if (isFull && !isRangeRes && (len === 0 || len < 25 * 1024 * 1024)) {
            await cache.put(request, res.clone());
            await trimAudioCache();
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

  // === App shell: cache-first ===
  event.respondWith(
    caches.match(request, { ignoreSearch: false }).then((cached) => {
      if (cached) return cached;
      return fetch(request).then((res) => {
        if (res.ok && (request.destination === 'document' ||
            request.destination === 'style' ||
            request.destination === 'script' ||
            request.destination === 'image' ||
            request.destination === 'manifest')) {
          const copy = res.clone();
          caches.open(APP_CACHE).then((cache) => cache.put(request, copy));
        }
        return res;
      }).catch(() => {
        if (request.mode === 'navigate') {
          return caches.match('./index.html');
        }
        throw new Error('offline');
      });
    })
  );
});
