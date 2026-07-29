const express = require('express');
const router = express.Router();
const db = require('../db');
const auth = require('../services/auth');

// GET /api/notifications — joriy foydalanuvchining o'ziga tegishli bildirishnomalari
router.get('/', auth.requireAuth, async (req, res) => {
  try {
    const rows = await db.all(
      `SELECT id, type, title, message, task_id, is_read, created_at
       FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 50`,
      [req.user.userId]
    );
    res.json({ success: true, notifications: rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/notifications/unread-count
router.get('/unread-count', auth.requireAuth, async (req, res) => {
  try {
    const row = await db.get(
      'SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = false',
      [req.user.userId]
    );
    res.json({ success: true, count: Number(row.count) || 0 });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/notifications/:id/read — bitta bildirishnomani o'qilgan deb belgilash
router.post('/:id/read', auth.requireAuth, async (req, res) => {
  try {
    await db.run(
      'UPDATE notifications SET is_read = true WHERE id = ? AND user_id = ?',
      [req.params.id, req.user.userId]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/notifications/read-all
router.post('/read-all', auth.requireAuth, async (req, res) => {
  try {
    await db.run(
      'UPDATE notifications SET is_read = true WHERE user_id = ? AND is_read = false',
      [req.user.userId]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
