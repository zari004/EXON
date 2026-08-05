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

  /* ── 6. Teaser bo'limlar — scroll'da paydo bo'lish ──────────────────── */
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
