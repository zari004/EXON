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

  /* ── 5. Audit formasi ─────────────────────────────────────────────────
     Hozircha faqat mijoz tomonida tekshiruv. Backend ulanganda bu yer
     POST /api/audit ga almashtiriladi (skoring server tomonida hisoblanadi). */
  var form = document.getElementById('auditForm');
  var input = document.getElementById('storeUrl');
  var hint = document.getElementById('captureHint');
  var HINT_DEFAULT = hint.textContent;

  function say(message, state) {
    hint.textContent = message;
    hint.classList.toggle('is-error', state === 'error');
    hint.classList.toggle('is-ok', state === 'ok');
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var value = input.value.trim();

    if (!value) {
      say("Do'koningiz havolasini kiriting — masalan, uzum.uz/uz/shop/...", 'error');
      input.focus();
      return;
    }

    // Havola yoki do'kon nomi — ikkalasi ham qabul qilinadi.
    if (value.length < 4) {
      say('Havola juda qisqa. To’liq manzilni joylashtiring.', 'error');
      input.focus();
      return;
    }

    say('Qabul qilindi. Auditga o\'tkazilyapti...', 'ok');

    window.location.href = 'audit.html?store=' + encodeURIComponent(value);
  });

  input.addEventListener('input', function () {
    if (hint.textContent !== HINT_DEFAULT) say(HINT_DEFAULT, null);
  });
})();
