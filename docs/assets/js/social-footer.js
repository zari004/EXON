/* EXON — header ijtimoiy tarmoq ikonkalari. Admin panelda ("Ijtimoiy
   tarmoqlar") kiritilgan havolalarni /api/social'dan olib, nav'da
   ko'rsatadi. Hech qanday havola kiritilmagan bo'lsa yoki API ishlamasa
   — ikonkalar qatori butunlay yashirin qoladi, hech qanday noto'g'ri/
   o'ylab topilgan havola ko'rsatilmaydi. */
(function () {
  var iconsRow = document.getElementById('socialIconsNav');
  if (!iconsRow || !window.EXON_API_BASE) return;

  var ICONS = {
    instagram: '<path d="M12 2c2.7 0 3.1 0 4.1.1 1.1.1 1.8.2 2.5.5.7.3 1.2.6 1.8 1.2.6.6.9 1.1 1.2 1.8.3.7.4 1.4.5 2.5.1 1 .1 1.4.1 4.1s0 3.1-.1 4.1c-.1 1.1-.2 1.8-.5 2.5-.3.7-.6 1.2-1.2 1.8-.6.6-1.1.9-1.8 1.2-.7.3-1.4.4-2.5.5-1 .1-1.4.1-4.1.1s-3.1 0-4.1-.1c-1.1-.1-1.8-.2-2.5-.5-.7-.3-1.2-.6-1.8-1.2-.6-.6-.9-1.1-1.2-1.8-.3-.7-.4-1.4-.5-2.5C2 15.1 2 14.7 2 12s0-3.1.1-4.1c.1-1.1.2-1.8.5-2.5.3-.7.6-1.2 1.2-1.8.6-.6 1.1-.9 1.8-1.2.7-.3 1.4-.4 2.5-.5C8.9 2 9.3 2 12 2Zm0 1.8c-2.7 0-3 0-4 .1-.9 0-1.5.2-1.8.3-.5.2-.8.4-1.1.7-.3.3-.5.6-.7 1.1-.1.3-.3.9-.3 1.8-.1 1-.1 1.3-.1 4s0 3 .1 4c0 .9.2 1.5.3 1.8.2.5.4.8.7 1.1.3.3.6.5 1.1.7.3.1.9.3 1.8.3 1 .1 1.3.1 4 .1s3 0 4-.1c.9 0 1.5-.2 1.8-.3.5-.2.8-.4 1.1-.7.3-.3.5-.6.7-1.1.1-.3.3-.9.3-1.8.1-1 .1-1.3.1-4s0-3-.1-4c0-.9-.2-1.5-.3-1.8-.2-.5-.4-.8-.7-1.1a2.9 2.9 0 0 0-1.1-.7c-.3-.1-.9-.3-1.8-.3-1-.1-1.3-.1-4-.1Zm0 3.5a4.7 4.7 0 1 1 0 9.4 4.7 4.7 0 0 1 0-9.4Zm0 1.8a2.9 2.9 0 1 0 0 5.8 2.9 2.9 0 0 0 0-5.8Zm5-2a1.1 1.1 0 1 1-2.2 0 1.1 1.1 0 0 1 2.2 0Z"/>',
    facebook: '<path d="M22 12a10 10 0 1 0-11.6 9.9v-7H7.9V12h2.5V9.8c0-2.5 1.5-3.9 3.8-3.9 1.1 0 2.2.2 2.2.2v2.5h-1.3c-1.2 0-1.6.8-1.6 1.6V12h2.8l-.4 2.9h-2.4v7A10 10 0 0 0 22 12Z"/>',
    telegram: '<path d="M21.9 4.3 18.7 20c-.2 1-.9 1.3-1.7.8l-4.7-3.5-2.3 2.2c-.3.3-.5.5-1 .5l.3-4.8L18 7.6c.4-.4-.1-.6-.6-.2L6.5 14.1 1.8 12.6c-1-.3-1-1 .2-1.5L20.6 3.4c.8-.3 1.6.2 1.3.9Z"/>',
    linkedin: '<path d="M4.98 3.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5ZM3 9h4v12H3V9Zm7 0h3.8v1.7h.1c.5-1 1.9-2 3.9-2 4.2 0 5 2.7 5 6.3V21h-4v-5.6c0-1.3 0-3-1.8-3s-2.1 1.4-2.1 2.9V21h-4V9Z"/>',
    youtube: '<path d="M22.5 7.2a3 3 0 0 0-2.1-2.1C18.6 4.6 12 4.6 12 4.6s-6.6 0-8.4.5A3 3 0 0 0 1.5 7.2 31 31 0 0 0 1 12a31 31 0 0 0 .5 4.8 3 3 0 0 0 2.1 2.1c1.8.5 8.4.5 8.4.5s6.6 0 8.4-.5a3 3 0 0 0 2.1-2.1A31 31 0 0 0 23 12a31 31 0 0 0-.5-4.8ZM9.8 15.5V8.5L15.8 12l-6 3.5Z"/>',
    tiktok: '<path d="M16.6 2h-3.3v13.9a2.6 2.6 0 1 1-2.6-2.6c.2 0 .5 0 .7.1V10a5.9 5.9 0 1 0 5.2 5.9V8.7a7.6 7.6 0 0 0 4.4 1.4V6.8a4.3 4.3 0 0 1-4.4-4.3V2Z"/>',
    x: '<path d="M18.3 2h3.2l-7 8 8.2 12h-6.4l-5-6.5L4.6 22H1.4l7.5-8.6L1 2h6.6l4.5 6 6.2-6Zm-1.1 18h1.8L7 4H5.1l12.1 16Z"/>'
  };
  var LABELS = { instagram: 'Instagram', facebook: 'Facebook', telegram: 'Telegram', linkedin: 'LinkedIn', youtube: 'YouTube', tiktok: 'TikTok', x: 'X (Twitter)' };
  var FALLBACK_ICON = '<circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M8.5 15.5 15.5 8.5M9 8h6.5v6.5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>';

  function esc(s) { return String(s || '').replace(/[<>&"]/g, function (c) { return { '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' }[c]; }); }

  function renderLinks(links) {
    iconsRow.innerHTML = links.map(function (l, i) {
      var icon = ICONS[l.platform] || FALLBACK_ICON;
      var label = LABELS[l.platform] || l.platform;
      return '<a class="social-icon" href="' + esc(l.url) + '" target="_blank" rel="noopener noreferrer" aria-label="' + esc(label) + '" style="--i:' + i + '">' +
        '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">' + icon + '</svg>' +
        '</a>';
    }).join('');
    iconsRow.style.display = 'flex';
  }

  // Avval statik nusxadan (tez, Render'ni kutmaydi), topilmasa jonli API'dan
  fetch('data/social.json', { cache: 'no-store' })
    .then(function (r) { if (!r.ok) throw 0; return r.json(); })
    .then(function (data) {
      var links = (data && data.success && Array.isArray(data.links)) ? data.links : [];
      if (!links.length) throw 0;
      renderLinks(links);
    })
    .catch(function () {
      fetch(window.EXON_API_BASE + '/api/social')
        .then(function (r) { return r.json(); })
        .then(function (data) {
          var links = (data && data.success && Array.isArray(data.links)) ? data.links : [];
          if (!links.length) return;
          renderLinks(links);
        })
        .catch(function () { /* API ishlamasa yoki havola kiritilmagan bo'lsa — ikonkalar yashirin qoladi */ });
    });
})();
