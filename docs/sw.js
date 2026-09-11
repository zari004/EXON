const CACHE = 'exon-v86';
const STATIC = [
  '/',
  '/index.html',
  '/konsultatsiya.html',
  '/admin.html',
  '/audit.html',
  '/blog.html',
  '/biz-haqimizda.html',
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
  '/data/cases.json',
  '/data/posts.json',
  '/assets/img/logo-exon.png',
  '/assets/img/logo-exon-light.png',
  '/assets/img/market-uzum.webp',
  '/assets/img/market-wildberries.png',
  '/assets/img/market-yandex.png',
  '/assets/img/social-instagram.png',
  '/assets/img/social-telegram.png',
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

  // Always prefer the deployed HTML/JS/CSS (navigatsiya + kod fayllari) tarmoqdan —
  // aks holda karusel kabi xatti-harakat tuzatilgan skript versiyasi eski
  // SW keshi ortida "yashiringan" holda qolib, ba'zi qurilmalarda hech qachon
  // yangilanmasdi (CACHE versiyasini har safar qo'lda oshirishga tayanish
  // ishonchsiz chiqdi). Rasmlar/JSON esa tezlik uchun keshdan darhol beriladi.
  var pathname = new URL(url).pathname;
  var isCodeFile = e.request.mode === 'navigate' || /\.(js|css)$/.test(pathname);
  if (isCodeFile) {
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
