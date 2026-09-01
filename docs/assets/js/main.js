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
      // To'liq 360 gradusga teng taqsimlanadi — shu bilan halqaning
      // "boshi" ham, "oxiri" ham bo'lmaydi, cheksiz aylanaveradi. Radius
      // qo'shni logotiplar orasida taxminan bir xil, yaqin bo'shliq
      // qolishi uchun hisoblanadi — shu sabab ko'proq logotip qo'shilgan
      // sayin halqa o'zi tabiiy ravishda kengayib boradi.
      var itemWidth = 170;
      var gap = 40;
      var radius = count > 1 ? Math.round((itemWidth + gap) / (2 * Math.sin(Math.PI / count))) : 0;
      radius = Math.max(radius, 160);

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

    // Avval GitHub Pages'dagi statik nusxadan (bir necha daqiqada bir marta
    // GitHub Action orqali yangilanadi) — bu doim tez, Render'ning uxlab
    // qolishini kutib turmaydi. Topilmasa/bo'sh bo'lsa jonli API'ga o'tadi.
    fetch('data/partners.json', { cache: 'no-store' })
      .then(function (r) { if (!r.ok) throw 0; return r.json(); })
      .then(function (data) {
        var partners = (data && data.success && Array.isArray(data.partners)) ? data.partners : [];
        if (!partners.length) throw 0;
        renderPartners(partners);
      })
      .catch(function () {
        fetch(window.EXON_API_BASE + '/api/partners')
          .then(function (r) { return r.json(); })
          .then(function (data) {
            var partners = (data && data.success && Array.isArray(data.partners)) ? data.partners : [];
            if (!partners.length) return;
            renderPartners(partners);
          })
          .catch(function () { /* API ishlamasa yoki hamkor qo'shilmagan bo'lsa — bo'lim yashirin qoladi */ });
      });
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
    var statsIo = null;
    var lastStatsSignature = '';
    function startCountUp() {
      if (started) return;
      started = true;
      row.querySelectorAll('.stat-item__num').forEach(function (el) {
        animateValue(el, Number(el.dataset.target) || 0, 1600);
      });
    }

    function renderStats(stats) {
      var signature = JSON.stringify(stats.map(function (s) { return [s.value, s.suffix, s.label]; }));
      if (signature === lastStatsSignature) return;
      lastStatsSignature = signature;
      started = false;
      if (statsIo) { statsIo.disconnect(); statsIo = null; }

      row.innerHTML = stats.map(function (s) {
        return '<div class="stat-item">' +
          '<div class="stat-item__value"><span class="stat-item__num" data-target="' + Number(s.value) + '">0</span>' + esc(s.suffix) + '</div>' +
          '<div class="stat-item__label">' + esc(s.label) + '</div>' +
          '</div>';
      }).join('');
      row.style.display = '';

      if ('IntersectionObserver' in window) {
        statsIo = new IntersectionObserver(function (entries) {
          entries.forEach(function (entry) {
            if (entry.isIntersecting) { startCountUp(); statsIo.disconnect(); }
          });
        }, { threshold: .3 });
        statsIo.observe(row);
      } else {
        startCountUp();
      }
    }

    function loadLiveStats() {
      return fetch(window.EXON_API_BASE + '/api/stats', { cache: 'no-store' })
        .then(function (r) { if (!r.ok) throw 0; return r.json(); })
        .then(function (data) {
          var stats = (data && data.success && Array.isArray(data.stats)) ? data.stats : [];
          if (!stats.length) return;
          renderStats(stats);
        })
        .catch(function () { /* API ishlamasa statik nusxa ekranda qoladi */ });
    }

    // Statik nusxa sahifani darhol to'ldiradi. Keyin jonli API har safar
    // tekshiriladi va admin paneldagi yangi qiymatlar deploysiz yangilanadi.
    fetch('data/stats.json', { cache: 'no-store' })
      .then(function (r) { if (!r.ok) throw 0; return r.json(); })
      .then(function (data) {
        var stats = (data && data.success && Array.isArray(data.stats)) ? data.stats : [];
        if (!stats.length) throw 0;
        renderStats(stats);
      })
      .catch(function () { /* Statik nusxa bo'lmasa jonli API baribir yuklanadi */ })
      .then(loadLiveStats);
  })();

  /* ── 8. Ariza formasi — bepul konsultatsiya sahifasidagi lid formasi. Yuborilganda
     backend'ga saqlanadi, so'ng tasdiqlash sahifasiga o'tkaziladi — Meta
     Pixel "Lead" hodisasi aynan o'sha sahifaga yetib kelgan foydalanuvchi
     uchun hisoblanadi (server Conversions API bilan bir xil event ID
     orqali ikkilanmasdan). Google Sheets webhook ham parallel ravishda
     ishga tushiriladi (fire-and-forget — foydalanuvchi kutmaydi). ── */
  (function () {
    var form = document.getElementById('leadForm');
    if (!form || !window.EXON_API_BASE) return;

    var submitBtn = document.getElementById('leadFormSubmit');
    var msg = document.getElementById('leadFormMsg');
    var businessSelect = form.elements.businessType;
    var unsupportedTypes = { 'Olib sotar': true, 'Distribyutor': true };

    function eligibilityMessage() {
      var lang = 'uz';
      try { lang = localStorage.getItem('exon_lang') || 'uz'; } catch (err) {}
      if (lang === 'ru') return 'К сожалению, сейчас мы не работаем с реселлерами и дистрибьюторами.';
      if (lang === 'en') return 'Unfortunately, we do not currently work with resellers or distributors.';
      return 'Afsuski, hozircha olib sotuvchilar va distribyutorlar bilan ishlay olmaymiz.';
    }

    function updateBusinessEligibility() {
      var unsupported = !!unsupportedTypes[businessSelect.value];
      if (unsupported) {
        msg.textContent = eligibilityMessage();
        msg.className = 'form-msg error eligibility';
        submitBtn.disabled = true;
      } else {
        if (msg.classList.contains('eligibility')) {
          msg.textContent = '';
          msg.className = 'form-msg';
        }
        submitBtn.disabled = false;
      }
      return !unsupported;
    }

    businessSelect.addEventListener('change', updateBusinessEligibility);
    document.addEventListener('click', function (event) {
      if (event.target.closest('.lang__btn[data-lang]')) setTimeout(updateBusinessEligibility, 0);
    });

    /* Google Sheets'ga yuborish — backend muvaffaqiyatli bo'lgandan keyin
       parallel ravishda, foydalanuvchini kutmasdan (fire-and-forget). Agar
       EXON_SHEETS_URL bo'sh bo'lsa, hech narsa yuborilmaydi. */
    function sendToSheets(body) {
      if (!window.EXON_SHEETS_URL) return;
      fetch(window.EXON_SHEETS_URL, {
        method: 'POST',
        mode: 'no-cors',  // Google Apps Script CORS blokini oldini oladi
        keepalive: true,  // sahifa tasdiqlash oynasiga o'tsa ham so'rov tugaydi
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      }).catch(function () {});  // xatolik foydalanuvchiga ta'sir qilmaydi
    }

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!updateBusinessEligibility()) return;
      msg.textContent = ''; msg.className = 'form-msg';
      submitBtn.disabled = true;

      var eventId = (window.crypto && crypto.randomUUID) ? crypto.randomUUID() : 'evt-' + Date.now() + '-' + Math.random().toString(36).slice(2);
      var body = {
        name: form.name.value.trim(),
        businessType: form.businessType.value,
        phone: form.phone.value.trim(),
        metaEventId: eventId,
        source: 'consultation-page'
      };

      fetch(window.EXON_API_BASE + '/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })
        .then(function (r) { return r.json(); })
        .then(function (data) {
          if (!data.success) throw new Error(data.error || 'Xatolik yuz berdi');
          try { sessionStorage.setItem('exon_lead_event_id', eventId); } catch (err) {}
          // Backend'ga muvaffaqiyatli saqlandi — endi Google Sheets'ga ham yuboramiz
          if (data.lead && data.lead.created_at) body.createdAt = data.lead.created_at;
          sendToSheets(body);
          window.location.href = 'ariza-yuborildi.html';
        })
        .catch(function (err) {
          msg.textContent = err.message || 'Xatolik yuz berdi. Birozdan so\'ng qayta urinib ko\'ring.';
          msg.className = 'form-msg error';
          submitBtn.disabled = false;
        });
    });
  })();

  /* ── 9. Teaser bo'limlar — scroll'da paydo bo'lish ──────────────────── */
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
