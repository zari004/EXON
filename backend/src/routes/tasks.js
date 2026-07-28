const express = require('express');
const router = express.Router();
const db = require('../db');
const auth = require('../services/auth');

// GET /api/tasks
router.get('/', auth.requireAuth, async (req, res) => {
  try {
    let tasks;
    if (req.user.role === 'superadmin' || req.user.role === 'it_bolimi') {
      tasks = await db.all('SELECT * FROM tasks ORDER BY created_at DESC');
    } else {
      tasks = await db.all(
        'SELECT * FROM tasks WHERE assigned_to = ? ORDER BY created_at DESC',
        [req.user.userId]
      );
    }
    res.json({ success: true, tasks });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/tasks
router.post('/', auth.requireAuth, auth.requireSuperAdmin, async (req, res) => {
  try {
    const { title, description, priority, status, due_date, assigned_to, assigned_name } = req.body;
    if (!title || !title.trim()) {
      return res.status(400).json({ success: false, error: 'Sarlavha talab qilinadi' });
    }
    const result = await db.run(
      `INSERT INTO tasks (title, description, priority, status, due_date, assigned_to, assigned_name, created_by, created_name)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        title.trim(), description || null, priority || 'medium',
        status || 'new', due_date || null,
        assigned_to ? Number(assigned_to) : null,
        assigned_name || null,
        req.user.userId, req.user.name
      ]
    );
    res.json({ success: true, id: result.id });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT /api/tasks/:id — to'liq yangilash (tahrirlash)
router.put('/:id', auth.requireAuth, auth.requireSuperAdmin, async (req, res) => {
  try {
    const { title, description, priority, status, due_date, assigned_to, assigned_name } = req.body;
    const VALID_STATUS = ['new', 'in_progress', 'review', 'done'];
    if (!title || !title.trim()) {
      return res.status(400).json({ success: false, error: 'Sarlavha talab qilinadi' });
    }
    if (status && !VALID_STATUS.includes(status)) {
      return res.status(400).json({ success: false, error: "Noto'g'ri status" });
    }
    await db.run(
      `UPDATE tasks SET title=?, description=?, priority=?, status=COALESCE(?,status),
       due_date=?, assigned_to=?, assigned_name=?, updated_at=NOW() WHERE id=?`,
      [
        title.trim(), description || null, priority || 'medium',
        status || null, due_date || null,
        assigned_to ? Number(assigned_to) : null,
        assigned_name || null,
        req.params.id
      ]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PATCH /api/tasks/:id/status — statusni o'zgartirish (drag-drop)
router.patch('/:id/status', auth.requireAuth, async (req, res) => {
  try {
    const { status } = req.body;
    const VALID_STATUS = ['new', 'in_progress', 'review', 'done'];
    if (!VALID_STATUS.includes(status)) {
      return res.status(400).json({ success: false, error: "Noto'g'ri status" });
    }
    // IT bo'limi / superadmin — hamma vazifani o'zgartira oladi
    // Boshqalar — faqat o'ziga tayinlangan vazifani
    if (req.user.role !== 'superadmin' && req.user.role !== 'it_bolimi') {
      const task = await db.get('SELECT assigned_to FROM tasks WHERE id = ?', [req.params.id]);
      if (!task) return res.status(404).json({ success: false, error: 'Vazifa topilmadi' });
      if (Number(task.assigned_to) !== Number(req.user.userId)) {
        return res.status(403).json({ success: false, error: "Bu vazifani o'zgartirishga ruxsat yo'q" });
      }
    }
    await db.run('UPDATE tasks SET status = ?, updated_at = NOW() WHERE id = ?', [status, req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE /api/tasks/:id
router.delete('/:id', auth.requireAuth, auth.requireSuperAdmin, async (req, res) => {
  try {
    await db.run('DELETE FROM tasks WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
