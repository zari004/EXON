/* =========================================================================
   EXON — hero logikasi
   ========================================================================= */
(function () {
  'use strict';

  /* ── 1. Egri chiziq uzunligini hisoblash ────────────────────────────
     Bezier egri chiziqlari uchun approx uzunlik: 1400-1600px ning o'rtasi.
     Animatsiya CSS'da static dasharray bilan qilinadi.                   */
  var line = document.getElementById('curveLine');
  if (line) {
    /* M 96 312 dan C 958 80, 1010 50, 1104 18 gacha — ~1520 approx */
    line.style.setProperty('--len', '1520');
  }

  /* ── 2. Kirish animatsiyasini ishga tushirish ─────────────────────── */
  requestAnimationFrame(function () {
    requestAnimationFrame(function () {
      document.body.classList.add('is-ready');
    });
  });

  /* ── 3. Scroll holatida navigatsiya foni ──────────────────────────── */
  var nav = document.getElementById('nav');
  var ticking = false;

  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(function () {
      nav.classList.toggle('is-scrolled', window.scrollY > 12);
      ticking = false;
    });
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ── 4. Mobil menyu ───────────────────────────────────────────────── */
  var burger = document.getElementById('burger');
  var menu = document.getElementById('navMenu');

  function setMenu(open) {
    menu.classList.toggle('is-open', open);
    burger.setAttribute('aria-expanded', String(open));
    burger.setAttribute('aria-label', open ? 'Menyuni yopish' : 'Menyuni ochish');
  }

  burger.addEventListener('click', function () {
    setMenu(burger.getAttribute('aria-expanded') !== 'true');
  });

  menu.addEventListener('click', function (e) {
    if (e.target.tagName === 'A') setMenu(false);
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && burger.getAttribute('aria-expanded') === 'true') {
      setMenu(false);
      burger.focus();
    }
  });

  /* ── 6. Hamkorlar logotiplari — admin paneldan olib, 3D karusel qilib
     chizish. API ishlamasa yoki hamkor qo'shilmagan bo'lsa, statik
     matnli ro'yxat (proof__list) o'zgarishsiz ko'rinishda qoladi. ── */
  (function () {
    var track = document.getElementById('proofTrack');
    var carousel = document.getElementById('proofCarousel');
    var fallbackList = document.getElementById('proofList');
    if (!track || !carousel || !window.EXON_API_BASE) return;

    fetch(window.EXON_API_BASE + '/api/partners')
      .then(function (r) { return r.json(); })
      .then(function (data) {
        var partners = (data && data.success && Array.isArray(data.partners)) ? data.partners : [];
        if (!partners.length) return;

        var count = partners.length;
        var itemWidth = 120;
        var radius = Math.round((itemWidth / 2) / Math.tan(Math.PI / count));
        radius = Math.max(radius, 130);

        track.innerHTML = partners.map(function (p, i) {
          var angle = (360 / count) * i;
          return '<div class="proof__carousel-item" style="transform:rotateY(' + angle + 'deg) translateZ(' + radius + 'px)">' +
            '<img src="' + p.image + '" alt="' + p.name.replace(/"/g, '&quot;') + '" loading="lazy" />' +
            '</div>';
        }).join('');

        carousel.style.display = '';
        if (fallbackList) fallbackList.style.display = 'none';
      })
      .catch(function () { /* API ishlamasa — statik ro'yxat ko'rinishda qoladi */ });
  })();

  /* ── 7. Teaser bo'limlar — scroll'da paydo bo'lish ──────────────────── */
  var revealEls = document.querySelectorAll('.reveal');
  if (revealEls.length) {
    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-in');
            io.unobserve(entry.target);
          }
        });
      }, { threshold: .16, rootMargin: '0px 0px -8% 0px' });
      revealEls.forEach(function (el) { io.observe(el); });
    } else {
      revealEls.forEach(function (el) { el.classList.add('is-in'); });
    }
  }
})();
