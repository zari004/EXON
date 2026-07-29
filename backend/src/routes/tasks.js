const express = require('express');
const router = express.Router();
const db = require('../db');
const auth = require('../services/auth');

// Vazifalar bo'yicha to'liq boardni ko'radigan/boshqaradigan rollar.
// Boshqa har qanday rol (menejer_oddiy, dizayner_bosh, dizayner_oddiy va h.k.)
// faqat o'zi yaratgan yoki o'ziga tayinlangan vazifalarni ko'radi/boshqaradi,
// lekin baribir istalgan foydalanuvchiga vazifa bera oladi.
const FULL_BOARD_ROLES = ['superadmin', 'it_bolimi', 'seo', 'menejer_bosh'];
function isFullBoard(role) { return FULL_BOARD_ROLES.includes(role); }

// Takrorlanuvchi vazifa bajarilganda keyingi nusxasini yaratadi
async function maybeCreateNextOccurrence(task) {
  if (!task || !task.repeat_rule || task.repeat_rule === 'none' || !task.due_date) return;
  const next = new Date(task.due_date);
  if (task.repeat_rule === 'daily') next.setDate(next.getDate() + 1);
  else if (task.repeat_rule === 'weekly') next.setDate(next.getDate() + 7);
  else if (task.repeat_rule === 'monthly') next.setMonth(next.getMonth() + 1);
  else return;
  const nextDueDate = next.toISOString().split('T')[0];
  await db.run(
    `INSERT INTO tasks (title, description, priority, status, due_date, due_time, reminder_minutes, reminder_sent, repeat_rule, assigned_to, assigned_name, created_by, created_name)
     VALUES (?, ?, ?, 'new', ?, ?, ?, false, ?, ?, ?, ?, ?)`,
    [
      task.title, task.description, task.priority, nextDueDate,
      task.due_time || null, task.reminder_minutes || null, task.repeat_rule,
      task.assigned_to, task.assigned_name, task.created_by, task.created_name
    ]
  );
}

// GET /api/tasks
router.get('/', auth.requireAuth, async (req, res) => {
  try {
    let tasks;
    if (isFullBoard(req.user.role)) {
      tasks = await db.all('SELECT * FROM tasks ORDER BY created_at DESC');
    } else {
      tasks = await db.all(
        'SELECT * FROM tasks WHERE assigned_to = ? OR created_by = ? ORDER BY created_at DESC',
        [req.user.userId, req.user.userId]
      );
    }
    res.json({ success: true, tasks });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/tasks — endi istalgan tizimga kirgan foydalanuvchi boshqalarga vazifa bera oladi
router.post('/', auth.requireAuth, async (req, res) => {
  try {
    const { title, description, priority, status, due_date, start_date, due_time, reminder_minutes, repeat_rule, assigned_to, assigned_name } = req.body;
    if (!title || !title.trim()) {
      return res.status(400).json({ success: false, error: 'Sarlavha talab qilinadi' });
    }
    const result = await db.run(
      `INSERT INTO tasks (title, description, priority, status, due_date, start_date, due_time, reminder_minutes, repeat_rule, assigned_to, assigned_name, created_by, created_name)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        title.trim(), description || null, priority || 'medium',
        status || 'new', due_date || null,
        start_date || null,
        due_time || null,
        reminder_minutes !== undefined && reminder_minutes !== null && reminder_minutes !== '' ? Number(reminder_minutes) : null,
        repeat_rule || 'none',
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

// PUT /api/tasks/:id — to'liq yangilash (tahrirlash). Faqat admin/to'liq-board
// rollari yoki shu vazifaning yaratuvchisi bajara oladi — sof tayinlangan
// (lekin yaratmagan) kishi bu yerga kelmasligi kerak, u status'ni
// PATCH /:id/status orqali o'zgartiradi.
router.put('/:id', auth.requireAuth, async (req, res) => {
  try {
    const before = await db.get('SELECT * FROM tasks WHERE id = ?', [req.params.id]);
    if (!before) return res.status(404).json({ success: false, error: 'Vazifa topilmadi' });
    const canEditFull = isFullBoard(req.user.role) || Number(before.created_by) === Number(req.user.userId);
    if (!canEditFull) {
      return res.status(403).json({ success: false, error: "Bu vazifani to'liq tahrirlashga ruxsat yo'q" });
    }
    const { title, description, priority, status, due_date, start_date, due_time, reminder_minutes, repeat_rule, assigned_to, assigned_name } = req.body;
    const VALID_STATUS = ['new', 'in_progress', 'review', 'done'];
    if (!title || !title.trim()) {
      return res.status(400).json({ success: false, error: 'Sarlavha talab qilinadi' });
    }
    if (status && !VALID_STATUS.includes(status)) {
      return res.status(400).json({ success: false, error: "Noto'g'ri status" });
    }
    const reminderMinutesVal = reminder_minutes !== undefined && reminder_minutes !== null && reminder_minutes !== ''
      ? Number(reminder_minutes) : null;
    await db.run(
      `UPDATE tasks SET title=?, description=?, priority=?, status=COALESCE(?,status),
       due_date=?, start_date=?, due_time=?, reminder_minutes=?, reminder_sent=false, repeat_rule=?,
       assigned_to=?, assigned_name=?, updated_at=NOW() WHERE id=?`,
      [
        title.trim(), description || null, priority || 'medium',
        status || null, due_date || null,
        start_date || null,
        due_time || null, reminderMinutesVal, repeat_rule || 'none',
        assigned_to ? Number(assigned_to) : null,
        assigned_name || null,
        req.params.id
      ]
    );
    // Agar vazifa hozirgina "bajarildi"ga o'tgan bo'lsa va takrorlanuvchi bo'lsa — keyingi nusxasini yaratish
    if (status === 'done' && before && before.status !== 'done') {
      const updated = await db.get('SELECT * FROM tasks WHERE id = ?', [req.params.id]);
      await maybeCreateNextOccurrence(updated);
    }
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
    const existing = await db.get('SELECT * FROM tasks WHERE id = ?', [req.params.id]);
    if (!existing) return res.status(404).json({ success: false, error: 'Vazifa topilmadi' });
    // To'liq board rollari — hammasini o'zgartira oladi
    // Boshqalar — faqat o'zi yaratgan yoki o'ziga tayinlangan vazifani
    if (!isFullBoard(req.user.role)) {
      const isAssignee = Number(existing.assigned_to) === Number(req.user.userId);
      const isCreator = Number(existing.created_by) === Number(req.user.userId);
      if (!isAssignee && !isCreator) {
        return res.status(403).json({ success: false, error: "Bu vazifani o'zgartirishga ruxsat yo'q" });
      }
    }
    await db.run('UPDATE tasks SET status = ?, updated_at = NOW() WHERE id = ?', [status, req.params.id]);
    // Agar vazifa hozirgina "bajarildi"ga o'tgan bo'lsa va takrorlanuvchi bo'lsa — keyingi nusxasini yaratish
    if (status === 'done' && existing.status !== 'done') {
      await maybeCreateNextOccurrence(Object.assign({}, existing, { status: 'done' }));
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE /api/tasks/:id — faqat admin/to'liq-board rollari yoki yaratuvchi o'chira oladi
router.delete('/:id', auth.requireAuth, async (req, res) => {
  try {
    const existing = await db.get('SELECT created_by FROM tasks WHERE id = ?', [req.params.id]);
    if (!existing) return res.status(404).json({ success: false, error: 'Vazifa topilmadi' });
    const canDelete = isFullBoard(req.user.role) || Number(existing.created_by) === Number(req.user.userId);
    if (!canDelete) {
      return res.status(403).json({ success: false, error: "Bu vazifani o'chirishga ruxsat yo'q" });
    }
    await db.run('DELETE FROM tasks WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
