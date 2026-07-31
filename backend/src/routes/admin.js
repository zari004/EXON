const express = require('express');
const router = express.Router();
const db = require('../db');
const auth = require('../services/auth');

/**
 * POST /api/admin/login
 * Body: { password }
 */
router.post('/login', async (req, res) => {
  try {
    const { password } = req.body;
    const token = await auth.login(password);
    if (!token) {
      return res.status(401).json({ success: false, error: "Parol noto'g'ri" });
    }
    res.json({ success: true, token });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/admin/logout
 */
router.post('/logout', auth.requireAuth, async (req, res) => {
  const token = req.headers.authorization.slice(7);
  await auth.logout(token);
  res.json({ success: true });
});

/**
 * GET /api/admin/me — token hali amal qiladimi tekshirish, role qaytaradi
 */
router.get('/me', auth.requireAuth, (req, res) => {
  res.json({ success: true, role: req.user.role, name: req.user.name, email: req.user.email });
});

/**
 * GET /api/admin/database-usage — Supabase/Postgres baza hajmi
 * (faqat IT bo'limi va superadmin ko'ra oladi)
 */
router.get('/database-usage', auth.requireAuth, auth.requireSuperAdmin, async (req, res) => {
  try {
    const row = await db.get(
      'SELECT COALESCE(SUM(pg_database_size(datname)), 0)::bigint AS used_bytes FROM pg_database'
    );
    const usedBytes = Number(row && row.used_bytes) || 0;
    const limitBytes = 500 * 1024 * 1024;
    const percent = Math.round((usedBytes / limitBytes) * 1000) / 10;

    res.json({
      success: true,
      usage: {
        usedBytes,
        limitBytes,
        remainingBytes: Math.max(0, limitBytes - usedBytes),
        percent,
        measuredAt: new Date().toISOString()
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/admin/assignable-users — vazifa tayinlash uchun minimal ro'yxat
 * (istalgan tizimga kirgan foydalanuvchi chaqira oladi — endi hamma
 * boshqalarga vazifa bera olishi kerak, shuning uchun email/rol kabi
 * nozik maydonlarsiz, faqat id+ism qaytariladi)
 */
router.get('/assignable-users', auth.requireAuth, async (req, res) => {
  try {
    const users = await db.all(
      "SELECT id, name FROM admin_users WHERE status = 'approved' ORDER BY name"
    );
    res.json({ success: true, users });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Do'konlarni boshqarish (qo'shish/o'chirish) huquqiga ega rollar —
// vazifani odamga tayinlashdan farqli o'laroq, do'kon ro'yxati ochiq emas,
// faqat shu rollar yangi do'kon kirita/o'chira oladi
const STORE_MANAGER_ROLES = ['superadmin', 'it_bolimi', 'menejer_bosh'];
function canManageStores(role) { return STORE_MANAGER_ROLES.indexOf(role) !== -1; }

/**
 * GET /api/admin/stores — vazifaga "do'kon" tayinlash uchun umumiy ro'yxat
 * (assignable-users kabi — istalgan tizimga kirgan foydalanuvchi tanlab
 * ko'ra oladi, lekin faqat ro'yxatdan tanlaydi, qo'shа olmaydi)
 */
router.get('/stores', auth.requireAuth, async (req, res) => {
  try {
    const stores = await db.all('SELECT id, name, logo FROM stores ORDER BY name');
    res.json({ success: true, stores, canManage: canManageStores(req.user.role) });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/admin/stores — yangi do'kon qo'shish (faqat do'kon boshqaruvchilari)
 */
router.post('/stores', auth.requireAuth, async (req, res) => {
  try {
    if (!canManageStores(req.user.role)) {
      return res.status(403).json({ success: false, error: "Do'kon qo'shishga ruxsat yo'q" });
    }
    const { name, logo } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, error: "Do'kon nomi talab qilinadi" });
    }
    const result = await db.run(
      'INSERT INTO stores (name, logo, created_by, created_name) VALUES (?, ?, ?, ?)',
      [name.trim(), logo || null, req.user.userId, req.user.name || null]
    );
    res.json({ success: true, store: { id: result.id, name: name.trim(), logo: logo || null } });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * PUT /api/admin/stores/:id — do'kon nomi/logosini tahrirlash
 * (faqat do'kon boshqaruvchilari)
 */
router.put('/stores/:id', auth.requireAuth, async (req, res) => {
  try {
    if (!canManageStores(req.user.role)) {
      return res.status(403).json({ success: false, error: "Do'konni tahrirlashga ruxsat yo'q" });
    }
    const { name, logo } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, error: "Do'kon nomi talab qilinadi" });
    }
    await db.run('UPDATE stores SET name=?, logo=? WHERE id=?', [name.trim(), logo || null, req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * DELETE /api/admin/stores/:id — do'konni ro'yxatdan olib tashlash
 * (faqat do'kon boshqaruvchilari; shu do'konga tayinlangan eski
 * vazifalardagi nom saqlanib qoladi, faqat ro'yxatdan yo'qoladi)
 */
router.delete('/stores/:id', auth.requireAuth, async (req, res) => {
  try {
    if (!canManageStores(req.user.role)) {
      return res.status(403).json({ success: false, error: "Do'kon o'chirishga ruxsat yo'q" });
    }
    await db.run('DELETE FROM stores WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/admin/users — barcha foydalanuvchilar ro'yxati (superadmin)
 */
router.get('/users', auth.requireAuth, auth.requireSuperAdmin, async (req, res) => {
  try {
    // Bu ro'yxatni IT bo'limi ham ko'radi (requireSuperAdmin ikkalasiga ham
    // ruxsat beradi) — superadmin hisobi hech kimga (IT bo'limiga ham)
    // ko'rinmasligi kerak, shu sabab bu yerdan chiqarib tashlanadi
    const users = await db.all(
      "SELECT id, name, email, role, status, created_at FROM admin_users WHERE role != 'superadmin' ORDER BY created_at DESC"
    );
    res.json({ success: true, users });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/admin/users/:id/approve — foydalanuvchini tasdiqlash (superadmin)
 */
router.post('/users/:id/approve', auth.requireAuth, auth.requireSuperAdmin, async (req, res) => {
  try {
    await db.run('UPDATE admin_users SET status = ? WHERE id = ?', ['approved', req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/admin/users/:id/reject — foydalanuvchini rad etish (superadmin)
 */
router.post('/users/:id/reject', auth.requireAuth, auth.requireSuperAdmin, async (req, res) => {
  try {
    await db.run('UPDATE admin_users SET status = ? WHERE id = ?', ['rejected', req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/admin/users/:id/role — foydalanuvchi rolini o'zgartirish (IT bo'limi / superadmin)
 */
router.post('/users/:id/role', auth.requireAuth, auth.requireSuperAdmin, async (req, res) => {
  try {
    const { role } = req.body;
    const VALID = ['it_bolimi', 'seo', 'menejer_bosh', 'menejer_oddiy', 'dizayner_bosh', 'dizayner_oddiy'];
    if (!VALID.includes(role)) {
      return res.status(400).json({ success: false, error: "Noto'g'ri rol" });
    }
    await db.run('UPDATE admin_users SET role = ? WHERE id = ?', [role, req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * DELETE /api/admin/users/:id — foydalanuvchini butunlay o'chirish (superadmin)
 * Barcha faol sessiyalari ham bekor qilinadi — shu bilan tizimdan
 * darhol (keyingi so'rovidayoq) chiqarib yuboriladi
 */
router.delete('/users/:id', auth.requireAuth, auth.requireSuperAdmin, async (req, res) => {
  try {
    if (Number(req.params.id) === Number(req.user.userId)) {
      return res.status(400).json({ success: false, error: "O'zingizni o'chira olmaysiz" });
    }
    await db.run('DELETE FROM sessions WHERE user_id = ?', [req.params.id]);
    await db.run('DELETE FROM admin_users WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/admin/my-permissions — joriy foydalanuvchi ko'ra oladigan tablar
 */
// IT bo'limi Ruxsatlar sahifasi orqali har bir rol uchun shu bo'limlarning
// har birini alohida yoqib/o'chira oladi (sayt boshqaruvi ham shu jumladan)
const ALL_PERM_TABS = ['dashboard', 'cases', 'posts', 'pricing', 'tasks', 'stores', 'calendar', 'kpi', 'salary', 'productivity', 'attendance', 'settings'];

router.get('/my-permissions', auth.requireAuth, async (req, res) => {
  const role = req.user.role;
  if (role === 'superadmin' || role === 'it_bolimi') {
    return res.json({ success: true, tabs: ALL_PERM_TABS });
  }
  try {
    const perm = await db.get('SELECT tabs FROM role_permissions WHERE role = ?', [role]);
    const tabs = perm ? JSON.parse(perm.tabs) : ['dashboard', 'tasks'];
    res.json({ success: true, tabs });
  } catch (err) {
    res.json({ success: true, tabs: ['dashboard', 'tasks'] });
  }
});

/**
 * GET /api/admin/permissions — barcha rol ruxsatlari (IT bo'limi / superadmin)
 */
router.get('/permissions', auth.requireAuth, auth.requireSuperAdmin, async (req, res) => {
  try {
    const rows = await db.all('SELECT role, tabs FROM role_permissions ORDER BY role');
    res.json({ success: true, permissions: rows.map(function(r) { return { role: r.role, tabs: JSON.parse(r.tabs) }; }) });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * PUT /api/admin/permissions/:role — rol uchun ruxsatlarni yangilash (IT bo'limi / superadmin)
 */
router.put('/permissions/:role', auth.requireAuth, auth.requireSuperAdmin, async (req, res) => {
  try {
    const VALID_ROLES = ['seo', 'menejer_bosh', 'menejer_oddiy', 'dizayner_bosh', 'dizayner_oddiy'];
    if (!VALID_ROLES.includes(req.params.role)) {
      return res.status(400).json({ success: false, error: "Noto'g'ri rol" });
    }
    const tabs = (req.body.tabs || []).filter(function(t) { return ALL_PERM_TABS.includes(t); });
    // "role_permissions" jadvalida "id" ustuni yo'q (asosiy kalit — role),
    // shu sabab db.run() avtomatik qo'shadigan "RETURNING id" xato berardi
    await db.run('INSERT INTO role_permissions (role, tabs) VALUES (?, ?) ON CONFLICT (role) DO UPDATE SET tabs = ? RETURNING role',
      [req.params.role, JSON.stringify(tabs), JSON.stringify(tabs)]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/admin/stats — audit hisobotlari (segment bo'yicha, so'nggi lidlar)
 */
router.get('/stats', auth.requireAuth, async (req, res) => {
  try {
    const total = await db.get('SELECT COUNT(*) as count FROM leads');
    const bySegment = await db.all('SELECT segment, COUNT(*) as count FROM leads GROUP BY segment');
    const avgScore = await db.get('SELECT AVG(score) as avg FROM leads');
    const recent = await db.all('SELECT id, email, score, segment, created_at FROM leads ORDER BY created_at DESC LIMIT 20');

    res.json({
      success: true,
      total: total.count,
      averageScore: total.count ? Math.round(avgScore.avg) : 0,
      bySegment: bySegment.reduce((acc, row) => { acc[row.segment] = row.count; return acc; }, {}),
      recent
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch statistics' });
  }
});

module.exports = router;
