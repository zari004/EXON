/* EXON — Dark/Light mavzu almashtiruvchi.
   Har bir sahifa har doim "dark" bilan boshlanadi — tanlov saqlanmaydi,
   tugma faqat joriy ko'rish uchun ishlaydi. */
(function () {
  'use strict';
  var theme = 'dark';
  document.documentElement.setAttribute('data-theme', theme);

  function setTheme(next) {
    theme = next;
    document.documentElement.setAttribute('data-theme', theme);
    var buttons = document.querySelectorAll('.theme-toggle');
    for (var i = 0; i < buttons.length; i++) {
      buttons[i].setAttribute('aria-pressed', String(theme === 'light'));
    }
  }

  document.addEventListener('DOMContentLoaded', function () {
    var buttons = document.querySelectorAll('.theme-toggle');
    for (var i = 0; i < buttons.length; i++) {
      buttons[i].setAttribute('aria-pressed', String(theme === 'light'));
      buttons[i].addEventListener('click', function () {
        setTheme(theme === 'light' ? 'dark' : 'light');
      });
    }
  });
})();
