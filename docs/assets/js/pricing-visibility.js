/* EXON — Narxlar bo'limi ko'rinishini boshqaradi. Admin panelda ("Narxlar"
   bo'limidagi tumbler orqali) o'chirilgan bo'lsa — nav'dagi "Narxlar"
   havolalari va bosh sahifadagi narxlar bo'limi butunlay yashiriladi.
   Standart holat — ko'rinadi: tekshiruv tugamaguncha yoki API ishlamasa
   hech narsa o'zgartirilmaydi, shuning uchun hech qachon noto'g'ri
   yashirilib qolmaydi. */
(function () {
  if (!window.EXON_API_BASE) return;

  fetch(window.EXON_API_BASE + '/api/pricing/visibility')
    .then(function (r) { return r.json(); })
    .then(function (data) {
      if (!data || !data.success || data.visible !== false) return;
      document.querySelectorAll('a[href="index.html#narxlar"], a[href="#narxlar"], a[href="narxlar.html"]').forEach(function (a) {
        a.style.display = 'none';
      });
      var section = document.getElementById('narxlar');
      if (section) section.style.display = 'none';
    })
    .catch(function () { /* xato bo'lsa hech narsa o'zgartirilmaydi */ });
})();
