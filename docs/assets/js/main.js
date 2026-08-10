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
     matnli ro'yxat (proof__list) o'zgarishsiz ko'rinishda qoladi.
     Aylanish requestAnimationFrame orqali chiziladi — shu bilan
     foydalanuvchi sichqoncha/barmoq bilan chapga-o'ngga sudrab, halqani
     qo'lda ham burashi mumkin. ── */
  (function () {
    var track = document.getElementById('proofTrack');
    var carousel = document.getElementById('proofCarousel');
    var fallbackList = document.getElementById('proofList');
    if (!track || !carousel || !window.EXON_API_BASE) return;

    // Kam sonli logotipda aylanish katta bo'sh joylar bilan chiroysiz
    // ko'rinadi — shu sabab kamida shuncha logotip bo'lgandagina avtomatik
    // aylanadi (admin panelda ham shu son ko'rsatiladi). Qo'lda sudrash esa
    // logotiplar soni qanday bo'lishidan qat'i nazar ishlaydi.
    var MIN_ROTATE_COUNT = 6;
    var AUTO_DEG_PER_SEC = 360 / 45; // "45 soniyada bir aylanish" — sekin, xotirjam harakat
    var DRAG_SENSITIVITY = 0.35; // piksel siljish -> gradus

    var angle = 0;
    var autoRotate = false;
    var dragging = false;
    var hovering = false;
    var dragStartX = 0;
    var dragStartAngle = 0;
    var lastFrameTime = null;
    var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    function applyTransform() { track.style.transform = 'rotateY(' + angle + 'deg)'; }

    function tick(now) {
      if (!dragging && !hovering && autoRotate && !reduceMotion) {
        if (lastFrameTime !== null) angle += AUTO_DEG_PER_SEC * (now - lastFrameTime) / 1000;
        applyTransform();
      }
      lastFrameTime = now;
      requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);

    carousel.addEventListener('mouseenter', function () { hovering = true; });
    carousel.addEventListener('mouseleave', function () { hovering = false; });

    carousel.addEventListener('pointerdown', function (e) {
      dragging = true;
      carousel.classList.add('is-dragging');
      dragStartX = e.clientX;
      dragStartAngle = angle;
    });
    window.addEventListener('pointermove', function (e) {
      if (!dragging) return;
      angle = dragStartAngle + (e.clientX - dragStartX) * DRAG_SENSITIVITY;
      applyTransform();
    });
    function endDrag() {
      if (!dragging) return;
      dragging = false;
      carousel.classList.remove('is-dragging');
    }
    window.addEventListener('pointerup', endDrag);
    window.addEventListener('pointercancel', endDrag);

    function renderPartners(partners) {
      var count = partners.length;
      var itemWidth = 170;
      var radius = Math.round((itemWidth / 2) / Math.tan(Math.PI / count));
      radius = Math.max(radius, 190);

      track.innerHTML = partners.map(function (p, i) {
        var a = (360 / count) * i;
        return '<div class="proof__carousel-item" style="transform:rotateY(' + a + 'deg) translateZ(' + radius + 'px)">' +
          '<img src="' + p.image + '" alt="' + (p.name || '').replace(/"/g, '&quot;') + '" loading="lazy" />' +
          '</div>';
      }).join('');
      autoRotate = count >= MIN_ROTATE_COUNT;
      applyTransform();

      carousel.style.display = '';
      if (fallbackList) fallbackList.style.display = 'none';
    }

    fetch(window.EXON_API_BASE + '/api/partners')
      .then(function (r) { return r.json(); })
      .then(function (data) {
        var partners = (data && data.success && Array.isArray(data.partners)) ? data.partners : [];
        if (!partners.length) return;
        renderPartners(partners);
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
