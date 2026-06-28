const CACHE = 'tour-guide-v6';
const ASSETS = [
  '/tour-guide/',
  '/tour-guide/index.html',
  '/tour-guide/css/style.css',
  '/tour-guide/js/app.js',
  '/tour-guide/trips/chongqing-2026-08.json',
  '/tour-guide/audio/chongqing-2026-08-jiefangbei.mp3',
  '/tour-guide/audio/chongqing-2026-08-hongyadong.mp3',
  '/tour-guide/audio/chongqing-2026-08-hotpot.mp3',
  '/tour-guide/audio/chongqing-2026-08-ciqikou.mp3',
  '/tour-guide/audio/chongqing-2026-08-ropeway.mp3',
  '/tour-guide/audio/chongqing-2026-08-chaotianmen.mp3',
  '/tour-guide/audio/chongqing-2026-08-liziba.mp3',
  '/tour-guide/audio/chongqing-2026-08-elingfactory.mp3'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys =>
    Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
  ));
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  e.respondWith(
    caches.match(e.request).then(cached => cached || fetch(e.request).then(res => {
      const clone = res.clone();
      caches.open(CACHE).then(c => c.put(e.request, clone));
      return res;
    }))
  );
});
