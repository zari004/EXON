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

  /* ── 6. Hamkorlar logotiplari — faqat admin panelda haqiqiy logotip
     qo'shilgan bo'lsagina "Bizga ishonishdi" bo'limi ko'rsatiladi. API
     ishlamasa yoki hali hech narsa qo'shilmagan bo'lsa, bo'lim butunlay
     yashirin qoladi — hech qanday o'ylab topilgan/noto'g'ri ma'lumot
     ko'rsatilmaydi. Aylanish requestAnimationFrame orqali chiziladi —
     shu bilan foydalanuvchi sichqoncha/barmoq bilan chapga-o'ngga sudrab,
     halqani qo'lda ham burashi mumkin. ── */
  (function () {
    var section = document.getElementById('proofSection');
    var track = document.getElementById('proofTrack');
    var carousel = document.getElementById('proofCarousel');
    if (!section || !track || !carousel || !window.EXON_API_BASE) return;

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
      var radius = Math.round((itemWidth / 2) / Math.tan(Math.PI / count) * 1.15);
      radius = Math.max(radius, 460);

      track.innerHTML = partners.map(function (p, i) {
        var a = (360 / count) * i;
        return '<div class="proof__carousel-item" style="transform:rotateY(' + a + 'deg) translateZ(' + radius + 'px)">' +
          '<img src="' + p.image + '" alt="' + (p.name || '').replace(/"/g, '&quot;') + '" loading="lazy" />' +
          '</div>';
      }).join('');
      autoRotate = count >= MIN_ROTATE_COUNT;
      applyTransform();

      section.style.display = '';
    }

    fetch(window.EXON_API_BASE + '/api/partners')
      .then(function (r) { return r.json(); })
      .then(function (data) {
        var partners = (data && data.success && Array.isArray(data.partners)) ? data.partners : [];
        if (!partners.length) return;
        renderPartners(partners);
      })
      .catch(function () { /* API ishlamasa yoki hamkor qo'shilmagan bo'lsa — bo'lim yashirin qoladi */ });
  })();

  /* ── 7. Statistika — admin paneldan olib, "Keyslar" bo'limida ko'rinishga
     kirganda 0'dan raqamgacha animatsiya bilan ko'rsatish. API ishlamasa
     yoki hali statistika kiritilmagan bo'lsa, qator butunlay yashirin
     qoladi. ── */
  (function () {
    var row = document.getElementById('statsRow');
    if (!row || !window.EXON_API_BASE) return;

    function esc(s) { return String(s || '').replace(/[<>&"]/g, function (c) { return { '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' }[c]; }); }

    function animateValue(el, target, duration) {
      var startTime = null;
      function step(now) {
        if (startTime === null) startTime = now;
        var progress = Math.min((now - startTime) / duration, 1);
        var eased = 1 - Math.pow(1 - progress, 3); // ease-out kub
        el.textContent = Math.round(target * eased).toLocaleString('en-US');
        if (progress < 1) requestAnimationFrame(step);
        else el.textContent = target.toLocaleString('en-US');
      }
      requestAnimationFrame(step);
    }

    var started = false;
    function startCountUp() {
      if (started) return;
      started = true;
      row.querySelectorAll('.stat-item__num').forEach(function (el) {
        animateValue(el, Number(el.dataset.target) || 0, 1600);
      });
    }

    fetch(window.EXON_API_BASE + '/api/stats')
      .then(function (r) { return r.json(); })
      .then(function (data) {
        var stats = (data && data.success && Array.isArray(data.stats)) ? data.stats : [];
        if (!stats.length) return;

        row.innerHTML = stats.map(function (s) {
          return '<div class="stat-item">' +
            '<div class="stat-item__value"><span class="stat-item__num" data-target="' + Number(s.value) + '">0</span>' + esc(s.suffix) + '</div>' +
            '<div class="stat-item__label">' + esc(s.label) + '</div>' +
            '</div>';
        }).join('');
        row.style.display = '';

        if ('IntersectionObserver' in window) {
          var statsIo = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
              if (entry.isIntersecting) { startCountUp(); statsIo.disconnect(); }
            });
          }, { threshold: .3 });
          statsIo.observe(row);
        } else {
          startCountUp();
        }
      })
      .catch(function () { /* API ishlamasa yoki statistika kiritilmagan bo'lsa — qator yashirin qoladi */ });
  })();

  /* ── 8. Teaser bo'limlar — scroll'da paydo bo'lish ──────────────────── */
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
