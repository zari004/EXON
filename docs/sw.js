const CACHE = 'exon-v42';
const STATIC = [
  '/',
  '/index.html',
  '/konsultatsiya.html',
  '/admin.html',
  '/audit.html',
  '/blog.html',
  '/maqola.html',
  '/jarayon.html',
  '/keyslar.html',
  '/narxlar.html',
  '/manifest.json',
  '/admin-manifest.json',
  '/assets/css/style.css',
  '/assets/js/api-base.js',
  '/assets/js/i18n.js',
  '/assets/js/main.js',
  '/assets/js/social-footer.js',
  '/assets/js/theme.js',
  '/assets/img/logo-exon.png',
  '/assets/img/logo-exon-light.png',
  '/assets/img/market-uzum.webp',
  '/assets/img/market-wildberries.png',
  '/assets/img/market-yandex.png',
  '/assets/img/icon.svg',
  '/assets/img/app-icon-v2.svg',
  '/assets/img/app-icon-180.png',
  '/assets/img/app-icon-192.png',
  '/assets/img/app-icon-512.png',
  '/assets/img/app-icon-v3.svg',
  '/assets/img/app-icon-v3-180.png',
  '/assets/img/app-icon-v3-192.png',
  '/assets/img/app-icon-v3-512.png'
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

  // Always prefer the deployed HTML for navigations so a release is not
  // hidden behind an older service-worker cache.
  if (e.request.mode === 'navigate') {
    e.respondWith(
      fetch(e.request)
        .then((res) => {
          if (res.ok) {
            const clone = res.clone();
            caches.open(CACHE).then((c) => c.put(e.request, clone));
          }
          return res;
        })
        .catch(() => caches.match(e.request))
    );
    return;
  }

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
