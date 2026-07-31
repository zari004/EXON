const express = require('express');
const router = express.Router();
const db = require('../db');
const auth = require('../services/auth');

// Ishxona hududini (geofencing) sozlash — IT bo'limi/superadmin
const OFFICE_MANAGE_ROLES = ['it_bolimi', 'superadmin'];
// Kechikish siyosati (imtiyoz daqiqasi + foiz bosqichlari) — bosh menejer/superadmin
const POLICY_MANAGE_ROLES = ['menejer_bosh', 'superadmin'];
// Barcha xodimlarning keldi-ketdi hisobotini ko'rish
const VIEW_ALL_ROLES = ['menejer_bosh', 'seo', 'it_bolimi', 'superadmin'];
// Xodimlarning keldi-ketdi vaqtini qo'lda tahrirlash
const EDIT_ROLES = ['menejer_bosh', 'seo', 'it_bolimi', 'superadmin'];

function requireRole(roles, msg) {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ success: false, error: msg || "Bu amalni bajarishga ruxsat yo'q" });
    }
    next();
  };
}

// O'zbekiston — yil bo'yi UTC+5, DST yo'q. Server qaysi TZ'da ishlashidan qat'i
// nazar Toshkent devor-soatini to'g'ri hisoblash uchun UTC asosida siljitiladi.
const TZ_OFFSET_MS = 5 * 60 * 60 * 1000;

function tzShift(d) { return new Date(d.getTime() + TZ_OFFSET_MS); }
function tzDateStr(d) {
  const s = tzShift(d);
  return s.getUTCFullYear() + '-' + String(s.getUTCMonth() + 1).padStart(2, '0') + '-' + String(s.getUTCDate()).padStart(2, '0');
}
function tzMinutesOfDay(d) {
  const s = tzShift(d);
  return s.getUTCHours() * 60 + s.getUTCMinutes();
}
// pg DATE ustunini (Date obyekti yoki satr bo'lishi mumkin) "YYYY-MM-DD" satrga aylantiradi.
// DIQQAT: mahalliy (local) getterlar ishlatiladi, toISOString() emas — chunki node-postgres
// DATE ustunini serverning MAHALLIY vaqt zonasi asosida Date obyektiga aylantiradi (UTC emas).
// Local getterlar bilan o'qish shu jarayonni aynan teskarisiga aylantiradi, shuning uchun
// server qaysi TZ'da ishlashidan qat'i nazar natija to'g'ri bo'ladi.
function workDateStr(v) {
  if (v instanceof Date) {
    return v.getFullYear() + '-' + String(v.getMonth() + 1).padStart(2, '0') + '-' + String(v.getDate()).padStart(2, '0');
  }
  return String(v).slice(0, 10);
}
// "YYYY-MM-DD" sana + Toshkent HH:MM asosida to'g'ri UTC ISO vaqt yaratadi
function tashkentTimestamp(dateOnlyStr, hh, mm) {
  const [y, mo, d] = dateOnlyStr.split('-').map(Number);
  return new Date(Date.UTC(y, mo - 1, d, hh - 5, mm, 0, 0)).toISOString();
}

function distanceMeters(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const toRad = (v) => (v * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Boshlanish vaqti + imtiyoz + bosqichlar asosida kechikish daqiqasi va ushlab
// qolinadigan foizni hisoblaydi. Bosqichlar orasidan kechikishga mos ENG YUQORI
// (after_minutes eng katta, lekin kechikishdan oshmaydigan) bosqich tanlanadi.
function computeLateness(policy, checkInAt) {
  const parts = String(policy.work_start_time || '09:00').split(':');
  const startMinutes = (Number(parts[0]) || 0) * 60 + (Number(parts[1]) || 0);
  const nowMinutes = tzMinutesOfDay(checkInAt);
  const lateMinutes = Math.max(0, nowMinutes - startMinutes);
  const grace = Number(policy.grace_minutes) || 0;
  if (lateMinutes <= grace) return { lateMinutes, deductPercent: 0 };

  let tiers = [];
  try { tiers = JSON.parse(policy.tiers || '[]'); } catch (e) { tiers = []; }
  tiers = tiers.slice().sort((a, b) => Number(a.after_minutes) - Number(b.after_minutes));

  let deductPercent = 0;
  for (const t of tiers) {
    if (lateMinutes >= Number(t.after_minutes)) deductPercent = Number(t.deduct_percent);
  }
  return { lateMinutes, deductPercent };
}

async function getOfficeLocation() {
  return db.get('SELECT * FROM office_location WHERE id = 1');
}
async function getPolicy() {
  const p = await db.get('SELECT * FROM attendance_policy WHERE id = 1');
  if (p) return p;
  await db.run('INSERT INTO attendance_policy (id) VALUES (1) ON CONFLICT (id) DO NOTHING');
  return db.get('SELECT * FROM attendance_policy WHERE id = 1');
}

function monthRange(monthStr) {
  const m = /^(\d{4})-(0[1-9]|1[0-2])$/.exec(monthStr || '');
  const todayParts = tzDateStr(new Date()).split('-');
  const y = m ? Number(m[1]) : Number(todayParts[0]);
  const mon = m ? Number(m[2]) : Number(todayParts[1]);
  const start = y + '-' + String(mon).padStart(2, '0') + '-01';
  const endMonth = mon === 12 ? 1 : mon + 1;
  const endYear = mon === 12 ? y + 1 : y;
  const end = endYear + '-' + String(endMonth).padStart(2, '0') + '-01';
  return { start, end, monthStr: y + '-' + String(mon).padStart(2, '0') };
}

// Faqat "data:image/<turi>;base64,<base64belgilar>" qat'iy formatiga mos rasm qabul
// qilinadi — bu HTML/skript in'ektsiyasi (XSS) uchun ishlatilishi mumkin bo'lgan istalgan
// begona belgini (masalan qo'shtirnoq, teg) rad etadi, chunki base64 alifbosida ular yo'q.
const PHOTO_RE = /^data:image\/(jpeg|jpg|png|webp);base64,[A-Za-z0-9+/]+=*$/;

function validateCheckBody(body) {
  const lat = Number(body.latitude);
  const lng = Number(body.longitude);
  if (!isFinite(lat) || !isFinite(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    return { error: "Joylashuv ma'lumoti noto'g'ri" };
  }
  const photo = String(body.photo || '');
  if (photo.length > 3500000) {
    return { error: "Rasm hajmi juda katta" };
  }
  if (!PHOTO_RE.test(photo)) {
    return { error: "Rasm formati noto'g'ri" };
  }
  return { lat, lng, photo };
}

// ── ISHXONA HUDUDI ──
// Oddiy xodimlarga aniq koordinatalar berilmaydi (faqat sozlanganmi-yo'qmi) — bu geofencing'ni
// browser GPS'ni chetlab o'tib to'g'ridan-to'g'ri so'rov yuborish orqali aylanib o'tishni
// qiyinlashtiradi (koordinatalarni oldindan bilib olib, soxta lat/lng yuborish imkonini kamaytiradi).
router.get('/office-location', auth.requireAuth, async (req, res) => {
  try {
    const loc = await getOfficeLocation();
    if (!loc) return res.json({ success: true, location: null });
    if (!OFFICE_MANAGE_ROLES.includes(req.user.role)) {
      return res.json({ success: true, location: { name: loc.name, configured: true } });
    }
    res.json({ success: true, location: loc });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.put('/office-location', auth.requireAuth, requireRole(OFFICE_MANAGE_ROLES, "Bu amalni faqat IT bo'limi yoki superadmin bajarishi mumkin"), async (req, res) => {
  try {
    const { name, latitude, longitude, radius_meters } = req.body;
    const lat = Number(latitude);
    const lng = Number(longitude);
    const rad = Number(radius_meters);
    if (!isFinite(lat) || !isFinite(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      return res.status(400).json({ success: false, error: "Noto'g'ri koordinatalar" });
    }
    if (!isFinite(rad) || rad < 10 || rad > 5000) {
      return res.status(400).json({ success: false, error: "Radius 10 dan 5000 metrgacha bo'lishi kerak" });
    }
    const finalName = (name || 'Bosh ofis').trim() || 'Bosh ofis';
    await db.run(
      `INSERT INTO office_location (id, name, latitude, longitude, radius_meters, updated_by, updated_at)
       VALUES (1, ?, ?, ?, ?, ?, NOW())
       ON CONFLICT (id) DO UPDATE SET name=?, latitude=?, longitude=?, radius_meters=?, updated_by=?, updated_at=NOW()`,
      [finalName, lat, lng, rad, req.user.userId, finalName, lat, lng, rad, req.user.userId]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── KECHIKISH SIYOSATI ──
router.get('/policy', auth.requireAuth, async (req, res) => {
  try {
    const p = await getPolicy();
    let tiers = [];
    try { tiers = JSON.parse(p.tiers || '[]'); } catch (e) { tiers = []; }
    res.json({ success: true, policy: Object.assign({}, p, { tiers }) });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.put('/policy', auth.requireAuth, requireRole(POLICY_MANAGE_ROLES, "Bu amalni faqat bosh menejer yoki superadmin bajarishi mumkin"), async (req, res) => {
  try {
    const { work_start_time, grace_minutes, tiers } = req.body;
    if (!/^\d{2}:\d{2}$/.test(work_start_time || '')) {
      return res.status(400).json({ success: false, error: "Ish boshlanish vaqti HH:MM formatida bo'lishi kerak" });
    }
    const grace = Number(grace_minutes);
    if (!isFinite(grace) || grace < 0 || grace > 240) {
      return res.status(400).json({ success: false, error: "Imtiyoz daqiqasi 0 dan 240 gachа bo'lishi kerak" });
    }
    if (!Array.isArray(tiers)) return res.status(400).json({ success: false, error: "Bosqichlar ro'yxati noto'g'ri" });
    const cleanTiers = tiers
      .map((t) => ({
        after_minutes: Math.max(0, Math.round(Number(t.after_minutes) || 0)),
        deduct_percent: Math.min(100, Math.max(0, Number(t.deduct_percent) || 0))
      }))
      .sort((a, b) => a.after_minutes - b.after_minutes);

    await db.run(
      `INSERT INTO attendance_policy (id, work_start_time, grace_minutes, tiers, updated_by, updated_at)
       VALUES (1, ?, ?, ?, ?, NOW())
       ON CONFLICT (id) DO UPDATE SET work_start_time=?, grace_minutes=?, tiers=?, updated_by=?, updated_at=NOW()`,
      [work_start_time, grace, JSON.stringify(cleanTiers), req.user.userId, work_start_time, grace, JSON.stringify(cleanTiers), req.user.userId]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── BUGUNGI HOLAT ──
// TEST REJIMIDA doim "hali kelmagan" holatni qaytaradi — shunda sahifa har safar
// ochilganda/qayta yuklanganda "Keldim" tugmasi bilan boshidan boshlaydi, avvalgi
// sinov urinishlarini ko'rsatmaydi. Haqiqiy yozuv baribir bazada saqlanadi —
// bu faqat KO'RSATISHNI (frontendni) qayta boshlaydi.
router.get('/today', auth.requireAuth, async (req, res) => {
  try {
    const today = tzDateStr(new Date());
    const rec = await db.get(
      'SELECT * FROM attendance_records WHERE employee_id = ? AND work_date = ?',
      [req.user.userId, today]
    );
    res.json({ success: true, date: today, record: rec || null });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── KELDIM ──
router.post('/check-in', auth.requireAuth, async (req, res) => {
  try {
    const v = validateCheckBody(req.body);
    if (v.error) return res.status(400).json({ success: false, error: v.error });

    const loc = await getOfficeLocation();
    if (!loc) {
      return res.status(400).json({ success: false, error: "Ishxona hududi hali sozlanmagan. IT bo'limiga murojaat qiling." });
    }
    const dist = distanceMeters(v.lat, v.lng, Number(loc.latitude), Number(loc.longitude));
    if (dist > Number(loc.radius_meters)) {
      return res.status(403).json({ success: false, error: 'not_in_area', distance: Math.round(dist), radius: Number(loc.radius_meters) });
    }

    const now = new Date();
    const workDate = tzDateStr(now);
    const existing = await db.get('SELECT * FROM attendance_records WHERE employee_id = ? AND work_date = ?', [req.user.userId, workDate]);
    if (existing && existing.check_in_at) {
      return res.status(400).json({ success: false, error: 'Bugun allaqachon kelganingiz belgilangan' });
    }

    const policy = await getPolicy();
    const { lateMinutes, deductPercent } = computeLateness(policy, now);

    try {
      if (existing) {
        await db.run(
          `UPDATE attendance_records SET check_in_at=?, check_in_lat=?, check_in_lng=?, check_in_photo=?, late_minutes=?, deduct_percent=? WHERE id=?`,
          [now.toISOString(), v.lat, v.lng, v.photo, lateMinutes, deductPercent, existing.id]
        );
      } else {
        await db.run(
          `INSERT INTO attendance_records (employee_id, work_date, check_in_at, check_in_lat, check_in_lng, check_in_photo, late_minutes, deduct_percent)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [req.user.userId, workDate, now.toISOString(), v.lat, v.lng, v.photo, lateMinutes, deductPercent]
        );
      }
    } catch (dbErr) {
      // Tugmani ikki marta bosish/tarmoq qayta urinishi tufayli bir vaqtda ikkita so'rov
      // kelib, UNIQUE(employee_id, work_date) cheklovi bilan to'qnashishi mumkin — bu holatda
      // xom Postgres xatosi o'rniga tushunarli xabar qaytariladi
      if (dbErr.code === '23505') {
        return res.status(400).json({ success: false, error: 'Bugun allaqachon kelganingiz belgilangan' });
      }
      throw dbErr;
    }
    res.json({ success: true, lateMinutes, deductPercent, checkInAt: now.toISOString() });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── KETDIM ──
router.post('/check-out', auth.requireAuth, async (req, res) => {
  try {
    const v = validateCheckBody(req.body);
    if (v.error) return res.status(400).json({ success: false, error: v.error });

    const loc = await getOfficeLocation();
    if (!loc) {
      return res.status(400).json({ success: false, error: "Ishxona hududi hali sozlanmagan. IT bo'limiga murojaat qiling." });
    }
    const dist = distanceMeters(v.lat, v.lng, Number(loc.latitude), Number(loc.longitude));
    if (dist > Number(loc.radius_meters)) {
      return res.status(403).json({ success: false, error: 'not_in_area', distance: Math.round(dist), radius: Number(loc.radius_meters) });
    }

    const now = new Date();
    const workDate = tzDateStr(now);
    // Avval bugungi sanadagi yozuvni qidiramiz; agar xodim yarim tundan keyin (masalan 00:20da)
    // "ketdim" desa, kelgan kuni bilan hozirgi sana boshqacha bo'lib qoladi — shu holatni
    // qamrab olish uchun eng so'nggi ochiq (kelgan, lekin hali ketmagan) yozuvga qaraymiz.
    let existing = await db.get('SELECT * FROM attendance_records WHERE employee_id = ? AND work_date = ?', [req.user.userId, workDate]);
    if (!existing || !existing.check_in_at) {
      existing = await db.get(
        `SELECT * FROM attendance_records WHERE employee_id = ? AND check_in_at IS NOT NULL AND check_out_at IS NULL
         AND check_in_at >= ? ORDER BY check_in_at DESC LIMIT 1`,
        [req.user.userId, new Date(now.getTime() - 20 * 60 * 60 * 1000).toISOString()]
      );
    }
    if (!existing || !existing.check_in_at) {
      return res.status(400).json({ success: false, error: "Avval kelganingizni belgilashingiz kerak" });
    }
    if (existing.check_out_at) {
      return res.status(400).json({ success: false, error: 'Bugun allaqachon ketganingiz belgilangan' });
    }

    await db.run(
      `UPDATE attendance_records SET check_out_at=?, check_out_lat=?, check_out_lng=?, check_out_photo=? WHERE id=?`,
      [now.toISOString(), v.lat, v.lng, v.photo, existing.id]
    );
    res.json({ success: true, checkOutAt: now.toISOString() });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── MENING TARIXIM ──
router.get('/my', auth.requireAuth, async (req, res) => {
  try {
    const { start, end, monthStr } = monthRange(req.query.month);
    const rows = await db.all(
      `SELECT id, work_date, check_in_at, late_minutes, deduct_percent, check_out_at, check_in_photo, check_out_photo
       FROM attendance_records WHERE employee_id = ? AND work_date >= ? AND work_date < ? ORDER BY work_date DESC`,
      [req.user.userId, start, end]
    );
    res.json({ success: true, month: monthStr, records: rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── BARCHA XODIMLAR ──
// start/end (YYYY-MM-DD) berilsa aniq oraliq ishlatiladi (haftalik/yillik
// hisobot yuklab olish uchun) — aks holda oddiy oylik ko'rinish (month)
router.get('/all', auth.requireAuth, requireRole(VIEW_ALL_ROLES, "Bu bo'limni ko'rishga ruxsat yo'q"), async (req, res) => {
  try {
    const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
    let start, end, monthStr;
    if (DATE_RE.test(req.query.start || '') && DATE_RE.test(req.query.end || '')) {
      start = req.query.start;
      end = req.query.end;
      monthStr = start + '_' + end;
    } else {
      ({ start, end, monthStr } = monthRange(req.query.month));
    }
    const rows = await db.all(
      `SELECT r.id, r.employee_id, u.name AS employee_name, u.role AS employee_role,
       r.work_date, r.check_in_at, r.late_minutes, r.deduct_percent, r.check_out_at,
       r.check_in_photo, r.check_out_photo, r.edited_by, r.edited_at
       FROM attendance_records r JOIN admin_users u ON u.id = r.employee_id
       WHERE r.work_date >= ? AND r.work_date < ? AND u.role != 'superadmin' ORDER BY u.name, r.work_date DESC`,
      [start, end]
    );
    res.json({ success: true, month: monthStr, records: rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── QO'LDA TAHRIRLASH ──
router.put('/:id', auth.requireAuth, requireRole(EDIT_ROLES, "Bu yozuvni tahrirlashga ruxsat yo'q"), async (req, res) => {
  try {
    const rec = await db.get('SELECT * FROM attendance_records WHERE id = ?', [req.params.id]);
    if (!rec) return res.status(404).json({ success: false, error: 'Yozuv topilmadi' });
    // Manfaatlar to'qnashuvining oldini olish uchun — hech kim (bosh menejer, SEO va h.k.)
    // o'zining shaxsiy keldi-ketdi yozuvini (demak, o'ziga tegishli maosh jazosini) qo'lda
    // tahrirlay olmaydi. Buni faqat boshqa admin/menejer tuzatishi mumkin.
    if (Number(rec.employee_id) === Number(req.user.userId)) {
      return res.status(403).json({ success: false, error: "O'zingizning keldi-ketdi yozuvingizni tahrirlay olmaysiz — boshqa administratorga murojaat qiling" });
    }

    const dateOnly = workDateStr(rec.work_date);
    const TIME_RE = /^\d{2}:\d{2}$/;
    const { check_in_time, check_out_time } = req.body;

    let checkInAt = rec.check_in_at;
    let lateMinutes = rec.late_minutes;
    let deductPercent = rec.deduct_percent;
    if (check_in_time !== undefined) {
      if (!check_in_time) {
        checkInAt = null; lateMinutes = 0; deductPercent = 0;
      } else if (TIME_RE.test(check_in_time)) {
        const [h, m] = check_in_time.split(':').map(Number);
        checkInAt = tashkentTimestamp(dateOnly, h, m);
        const policy = await getPolicy();
        const computed = computeLateness(policy, new Date(checkInAt));
        lateMinutes = computed.lateMinutes;
        deductPercent = computed.deductPercent;
      } else {
        return res.status(400).json({ success: false, error: "Kelish vaqti HH:MM formatida bo'lishi kerak" });
      }
    }

    let checkOutAt = rec.check_out_at;
    if (check_out_time !== undefined) {
      if (!check_out_time) {
        checkOutAt = null;
      } else if (TIME_RE.test(check_out_time)) {
        const [h, m] = check_out_time.split(':').map(Number);
        checkOutAt = tashkentTimestamp(dateOnly, h, m);
      } else {
        return res.status(400).json({ success: false, error: "Ketish vaqti HH:MM formatida bo'lishi kerak" });
      }
    }

    await db.run(
      `UPDATE attendance_records SET check_in_at=?, late_minutes=?, deduct_percent=?, check_out_at=?, edited_by=?, edited_at=NOW() WHERE id=?`,
      [checkInAt, lateMinutes, deductPercent, checkOutAt, req.user.userId, req.params.id]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
