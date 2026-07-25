const CACHE = 'tour-guide-v8';
const ASSETS = [
  '/tour-guide/',
  '/tour-guide/index.html',
  '/tour-guide/css/style.css',
  '/tour-guide/js/app.js',
  '/tour-guide/trips/chongqing-2026-08.json',
  '/tour-guide/audio/chongqing-2026-08-raffles.mp3',
  '/tour-guide/audio/chongqing-2026-08-raffles-en.mp3',
  '/tour-guide/audio/chongqing-2026-08-shanchengbudo.mp3',
  '/tour-guide/audio/chongqing-2026-08-shanchengbudo-en.mp3',
  '/tour-guide/audio/chongqing-2026-08-shibati.mp3',
  '/tour-guide/audio/chongqing-2026-08-shibati-en.mp3',
  '/tour-guide/audio/chongqing-2026-08-veghotpot.mp3',
  '/tour-guide/audio/chongqing-2026-08-veghotpot-en.mp3',
  '/tour-guide/audio/chongqing-2026-08-jiefangbei.mp3',
  '/tour-guide/audio/chongqing-2026-08-jiefangbei-en.mp3',
  '/tour-guide/audio/chongqing-2026-08-kuixinglou.mp3',
  '/tour-guide/audio/chongqing-2026-08-kuixinglou-en.mp3',
  '/tour-guide/audio/chongqing-2026-08-hongyadong.mp3',
  '/tour-guide/audio/chongqing-2026-08-hongyadong-en.mp3',
  '/tour-guide/audio/chongqing-2026-08-liangjiangferry.mp3',
  '/tour-guide/audio/chongqing-2026-08-liangjiangferry-en.mp3',
  '/tour-guide/audio/chongqing-2026-08-danzishipu.mp3',
  '/tour-guide/audio/chongqing-2026-08-danzishipu-en.mp3',
  '/tour-guide/audio/chongqing-2026-08-zhonglouguangchang.mp3',
  '/tour-guide/audio/chongqing-2026-08-zhonglouguangchang-en.mp3',
  '/tour-guide/audio/chongqing-2026-08-ciyunsi.mp3',
  '/tour-guide/audio/chongqing-2026-08-ciyunsi-en.mp3',
  '/tour-guide/audio/chongqing-2026-08-xiakuli.mp3',
  '/tour-guide/audio/chongqing-2026-08-xiakuli-en.mp3',
  '/tour-guide/audio/chongqing-2026-08-longmenkuli.mp3',
  '/tour-guide/audio/chongqing-2026-08-longmenkuli-en.mp3',
  '/tour-guide/audio/chongqing-2026-08-huangyechatan.mp3',
  '/tour-guide/audio/chongqing-2026-08-huangyechatan-en.mp3',
  '/tour-guide/audio/chongqing-2026-08-changjiangropeway.mp3',
  '/tour-guide/audio/chongqing-2026-08-changjiangropeway-en.mp3',
  '/tour-guide/audio/chongqing-2026-08-liziba.mp3',
  '/tour-guide/audio/chongqing-2026-08-liziba-en.mp3',
  '/tour-guide/audio/chongqing-2026-08-beibinyihao.mp3',
  '/tour-guide/audio/chongqing-2026-08-beibinyihao-en.mp3',
  '/tour-guide/audio/chongqing-2026-08-yescci.mp3',
  '/tour-guide/audio/chongqing-2026-08-yescci-en.mp3',
  '/tour-guide/audio/chongqing-2026-08-ciqikou.mp3',
  '/tour-guide/audio/chongqing-2026-08-ciqikou-en.mp3',
  '/tour-guide/audio/chongqing-2026-08-chongqing1949.mp3',
  '/tour-guide/audio/chongqing-2026-08-chongqing1949-en.mp3'
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
