const express = require('express');
const router = express.Router();
const db = require('../db');
const auth = require('../services/auth');

/**
 * POST /api/admin/login
 * Body: { password }
 */
router.post('/login', (req, res) => {
  try {
    const { password } = req.body;
    const token = auth.login(password);
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
router.post('/logout', auth.requireAuth, (req, res) => {
  const token = req.headers.authorization.slice(7);
  auth.logout(token);
  res.json({ success: true });
});

/**
 * GET /api/admin/me — token hali amal qiladimi tekshirish, role qaytaradi
 */
router.get('/me', auth.requireAuth, (req, res) => {
  res.json({ success: true, role: req.user.role, name: req.user.name, email: req.user.email });
});

/**
 * GET /api/admin/users — barcha foydalanuvchilar ro'yxati (superadmin)
 */
router.get('/users', auth.requireAuth, auth.requireSuperAdmin, async (req, res) => {
  try {
    const users = await db.all(
      'SELECT id, name, email, role, status, created_at FROM admin_users ORDER BY created_at DESC'
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
 * GET /api/admin/my-permissions — joriy foydalanuvchi ko'ra oladigan tablar
 */
router.get('/my-permissions', auth.requireAuth, async (req, res) => {
  const role = req.user.role;
  if (role === 'superadmin' || role === 'it_bolimi') {
    return res.json({ success: true, tabs: ['dashboard', 'cases', 'posts', 'pricing', 'tasks'] });
  }
  try {
    const perm = await db.get('SELECT tabs FROM role_permissions WHERE role = ?', [role]);
    const tabs = perm ? JSON.parse(perm.tabs) : ['dashboard'];
    // Vazifalar — har bir foydalanuvchining shaxsiy oynasi, admin ruxsatidan qat'i nazar har doim ochiq
    if (!tabs.includes('tasks')) tabs.push('tasks');
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
    const VALID_TABS = ['dashboard', 'cases', 'posts', 'pricing', 'tasks'];
    const VALID_ROLES = ['seo', 'menejer_bosh', 'menejer_oddiy', 'dizayner_bosh', 'dizayner_oddiy'];
    if (!VALID_ROLES.includes(req.params.role)) {
      return res.status(400).json({ success: false, error: "Noto'g'ri rol" });
    }
    const tabs = (req.body.tabs || []).filter(function(t) { return VALID_TABS.includes(t); });
    await db.run('INSERT INTO role_permissions (role, tabs) VALUES (?, ?) ON CONFLICT (role) DO UPDATE SET tabs = ?',
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
