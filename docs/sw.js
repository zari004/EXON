const CACHE = 'exon-v1';
const STATIC = [
  '/',
  '/index.html',
  '/admin.html',
  '/audit.html',
  '/blog.html',
  '/jarayon.html',
  '/keyslar.html',
  '/narxlar.html',
  '/manifest.json',
  '/assets/css/style.css',
  '/assets/js/api-base.js',
  '/assets/js/i18n.js',
  '/assets/js/main.js',
  '/assets/js/theme.js',
  '/assets/img/logo-exon.png',
  '/assets/img/logo-exon-light.png',
  '/assets/img/icon.svg'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(STATIC)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const url = e.request.url;
  // API so'rovlari keshlanmaydi — har doim tarmoqdan
  if (url.includes('/api/') || e.request.method !== 'GET') return;

  e.respondWith(
    caches.match(e.request).then((cached) => {
      const network = fetch(e.request).then((res) => {
        if (res.ok) {
          const clone = res.clone();
          caches.open(CACHE).then((c) => c.put(e.request, clone));
        }
        return res;
      });
      // Keshda bor bo'lsa darhol qaytaradi, fonda yangilaydi (stale-while-revalidate)
      return cached || network;
    })
  );
});
