const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const db = require('../db');
const auth = require('../services/auth');

// GET /api/account/me — joriy foydalanuvchi profili
router.get('/me', auth.requireAuth, async (req, res) => {
  if (!req.user.userId) {
    // Legacy superadmin (env parol orqali) — DB'da qatori yo'q
    return res.json({
      success: true,
      account: { id: null, name: req.user.name, email: req.user.email, role: req.user.role, avatar: null, isLegacy: true }
    });
  }
  try {
    const user = await db.get('SELECT id, name, email, role, avatar FROM admin_users WHERE id = ?', [req.user.userId]);
    if (!user) return res.status(404).json({ success: false, error: 'Foydalanuvchi topilmadi' });
    res.json({ success: true, account: user });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT /api/account/profile — ism va rasmni yangilash (faqat o'ziniki)
router.put('/profile', auth.requireAuth, async (req, res) => {
  if (!req.user.userId) {
    return res.status(400).json({ success: false, error: "Bu hisob profili shu yerdan sozlanmaydi" });
  }
  try {
    const { name, avatar } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, error: 'Ism talab qilinadi' });
    }
    await db.run('UPDATE admin_users SET name = ?, avatar = ? WHERE id = ?', [name.trim(), avatar || null, req.user.userId]);
    auth.updateTokenName(req.token, name.trim());
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT /api/account/password — o'z parolini almashtirish
router.put('/password', auth.requireAuth, async (req, res) => {
  if (!req.user.userId) {
    return res.status(400).json({ success: false, error: "Bu hisob paroli shu yerdan sozlanmaydi" });
  }
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, error: 'Joriy va yangi parol talab qilinadi' });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ success: false, error: "Yangi parol kamida 6 ta belgidan iborat bo'lishi kerak" });
    }
    const user = await db.get('SELECT password_hash FROM admin_users WHERE id = ?', [req.user.userId]);
    if (!user) return res.status(404).json({ success: false, error: 'Foydalanuvchi topilmadi' });
    const match = await bcrypt.compare(currentPassword, user.password_hash);
    if (!match) return res.status(401).json({ success: false, error: "Joriy parol noto'g'ri" });
    const hash = await bcrypt.hash(newPassword, 10);
    await db.run('UPDATE admin_users SET password_hash = ? WHERE id = ?', [hash, req.user.userId]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/account/site-settings — veb-sayt sozlamalari (faqat IT bo'limi / superadmin)
router.get('/site-settings', auth.requireAuth, auth.requireSuperAdmin, async (req, res) => {
  try {
    const rows = await db.all('SELECT key, value FROM site_settings ORDER BY key');
    res.json({ success: true, settings: rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT /api/account/site-settings — bir nechta sozlamani saqlash (upsert)
router.put('/site-settings', auth.requireAuth, auth.requireSuperAdmin, async (req, res) => {
  try {
    const settings = Array.isArray(req.body.settings) ? req.body.settings : [];
    for (const s of settings) {
      const key = (s.key || '').trim();
      if (!key) continue;
      await db.run(
        `INSERT INTO site_settings (key, value, updated_at) VALUES (?, ?, NOW())
         ON CONFLICT (key) DO UPDATE SET value = ?, updated_at = NOW()`,
        [key, s.value || '', s.value || '']
      );
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE /api/account/site-settings/:key — bitta sozlamani o'chirish
router.delete('/site-settings/:key', auth.requireAuth, auth.requireSuperAdmin, async (req, res) => {
  try {
    await db.run('DELETE FROM site_settings WHERE key = ?', [req.params.key]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
