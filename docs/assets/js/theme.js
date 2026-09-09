/* EXON — barcha sahifalar uchun saqlanuvchi Dark/Light mavzu. */
(function () {
  'use strict';
  var STORAGE_KEY = 'exon_theme';
  var theme = 'dark';

  try {
    // Tizim mavzusidan qat'i nazar sayt har doim qorong'i mavzuda ochiladi —
    // foydalanuvchi tugma orqali yorug' mavzuni tanlasa, o'sha keyingi
    // tashriflarda saqlanadi.
    var saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'dark' || saved === 'light') {
      theme = saved;
    }
  } catch (e) {}

  document.documentElement.setAttribute('data-theme', theme);

  function buttonLabel() {
    var lang = document.documentElement.lang || 'uz';
    var wantsDark = theme === 'light';
    if (lang === 'ru') return wantsDark ? 'Тёмная тема' : 'Светлая тема';
    if (lang === 'en') return wantsDark ? 'Dark theme' : 'Light theme';
    return wantsDark ? "Qorong'i mavzu" : "Yorug' mavzu";
  }

  function setTheme(next) {
    theme = next;
    document.documentElement.setAttribute('data-theme', theme);
    try { localStorage.setItem(STORAGE_KEY, theme); } catch (e) {}
    var buttons = document.querySelectorAll('.theme-toggle');
    for (var i = 0; i < buttons.length; i++) {
      buttons[i].setAttribute('aria-pressed', String(theme === 'light'));
      buttons[i].setAttribute('title', buttonLabel());
      buttons[i].setAttribute('aria-label', buttonLabel());
    }
  }

  document.addEventListener('DOMContentLoaded', function () {
    var buttons = document.querySelectorAll('.theme-toggle');
    for (var i = 0; i < buttons.length; i++) {
      buttons[i].setAttribute('aria-pressed', String(theme === 'light'));
      buttons[i].setAttribute('title', buttonLabel());
      buttons[i].setAttribute('aria-label', buttonLabel());
      buttons[i].addEventListener('click', function () {
        setTheme(theme === 'light' ? 'dark' : 'light');
      });
    }
  });
})();
