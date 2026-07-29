const express = require('express');
const router = express.Router();
const db = require('../db');
const auth = require('../services/auth');
const notifications = require('../services/notifications');

// Vazifalar bo'yicha to'liq boardni ko'radigan/boshqaradigan rollar.
// Boshqa har qanday rol (menejer_oddiy, dizayner_bosh, dizayner_oddiy va h.k.)
// faqat o'zi yaratgan yoki o'ziga tayinlangan vazifalarni ko'radi/boshqaradi,
// lekin baribir istalgan foydalanuvchiga vazifa bera oladi.
const FULL_BOARD_ROLES = ['superadmin', 'it_bolimi', 'seo', 'menejer_bosh'];
function isFullBoard(role) { return FULL_BOARD_ROLES.includes(role); }

async function getAccessibleTask(req, taskId) {
  const task = await db.get('SELECT * FROM tasks WHERE id = ?', [taskId]);
  if (!task) return null;
  if (isFullBoard(req.user.role)) return task;
  const userId = Number(req.user.userId);
  const isCreator = Number(task.created_by) === userId;
  const isAssignee = Number(task.assigned_to) === userId;
  return isCreator || isAssignee ? task : null;
}

function isOwnComment(req, comment) {
  if (req.user.userId !== null && req.user.userId !== undefined) {
    return Number(comment.user_id) === Number(req.user.userId);
  }
  return Boolean(req.user.email && comment.user_email === req.user.email);
}

function canManageComment(req, comment) {
  return isOwnComment(req, comment) ||
    req.user.role === 'superadmin' ||
    req.user.role === 'it_bolimi';
}

function commentJson(req, comment) {
  return Object.assign({}, comment, {
    is_own: isOwnComment(req, comment),
    can_manage: canManageComment(req, comment)
  });
}

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
    const currentUserId = req.user.userId;
    const taskList = tasks.map((task) => Object.assign({}, task, {
      is_own_creator: currentUserId !== null && currentUserId !== undefined
        ? Number(task.created_by) === Number(currentUserId)
        : Boolean(req.user.name && task.created_name === req.user.name)
    }));
    res.json({ success: true, tasks: taskList });
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
    const assigneeId = assigned_to ? Number(assigned_to) : null;
    if (assigneeId && assigneeId !== Number(req.user.userId)) {
      await notifications.notify(
        assigneeId, 'task_assigned',
        'Sizga yangi vazifa berildi',
        (req.user.name || 'Foydalanuvchi') + ' sizga "' + title.trim() + '" vazifasini berdi.',
        result.id
      );
    }
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
    const newAssigneeId = assigned_to ? Number(assigned_to) : null;
    await db.run(
      `UPDATE tasks SET title=?, description=?, priority=?, status=COALESCE(?,status),
       due_date=?, start_date=?, due_time=?, reminder_minutes=?, reminder_sent=false, repeat_rule=?,
       assigned_to=?, assigned_name=?, due_soon_notified=false, overdue_notified=false, updated_at=NOW() WHERE id=?`,
      [
        title.trim(), description || null, priority || 'medium',
        status || null, due_date || null,
        start_date || null,
        due_time || null, reminderMinutesVal, repeat_rule || 'none',
        newAssigneeId,
        assigned_name || null,
        req.params.id
      ]
    );
    // Yangi tayinlash yoki qayta tayinlash bo'lsa — yangi mas'ulga bildirishnoma
    if (newAssigneeId && newAssigneeId !== Number(before.assigned_to) && newAssigneeId !== Number(req.user.userId)) {
      await notifications.notify(
        newAssigneeId, 'task_assigned',
        'Sizga vazifa tayinlandi',
        (req.user.name || 'Foydalanuvchi') + ' sizga "' + title.trim() + '" vazifasini tayinladi.',
        Number(req.params.id)
      );
    }
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
// GET /api/tasks/:id/comments — vazifa savol-javoblari
router.get('/:id/comments', auth.requireAuth, async (req, res) => {
  try {
    const task = await getAccessibleTask(req, req.params.id);
    if (!task) return res.status(404).json({ success: false, error: 'Vazifa topilmadi' });
    const comments = await db.all(
      `SELECT c.id, c.task_id, c.user_id, c.user_email, c.user_name,
       c.message, c.created_at, c.updated_at, u.avatar
       FROM task_comments c
       LEFT JOIN admin_users u ON u.id = c.user_id
       WHERE c.task_id = ? ORDER BY c.created_at ASC, c.id ASC`,
      [req.params.id]
    );
    res.json({ success: true, comments: comments.map((c) => commentJson(req, c)) });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/tasks/:id/comments — savol yoki javob yozish
router.post('/:id/comments', auth.requireAuth, async (req, res) => {
  try {
    const task = await getAccessibleTask(req, req.params.id);
    if (!task) return res.status(404).json({ success: false, error: 'Vazifa topilmadi' });
    const message = String(req.body.message || '').trim();
    if (!message) return res.status(400).json({ success: false, error: 'Xabar bo‘sh bo‘lishi mumkin emas' });
    if (message.length > 2000) {
      return res.status(400).json({ success: false, error: 'Xabar 2000 belgidan oshmasligi kerak' });
    }
    const result = await db.run(
      `INSERT INTO task_comments (task_id, user_id, user_email, user_name, message)
       VALUES (?, ?, ?, ?, ?)`,
      [req.params.id, req.user.userId || null, req.user.email || null, req.user.name || 'Foydalanuvchi', message]
    );
    const comment = await db.get(
      `SELECT c.id, c.task_id, c.user_id, c.user_email, c.user_name,
       c.message, c.created_at, c.updated_at, u.avatar
       FROM task_comments c
       LEFT JOIN admin_users u ON u.id = c.user_id WHERE c.id = ?`,
      [result.id]
    );
    // Vazifa yaratuvchisi va mas'uliga (izoh yozgan kishidan tashqari) bildirishnoma
    const notifyIds = new Set();
    if (task.created_by) notifyIds.add(Number(task.created_by));
    if (task.assigned_to) notifyIds.add(Number(task.assigned_to));
    notifyIds.delete(Number(req.user.userId));
    const preview = message.length > 80 ? message.slice(0, 80) + '…' : message;
    for (const uid of notifyIds) {
      await notifications.notify(
        uid, 'task_comment',
        'Yangi izoh: ' + task.title,
        (req.user.name || 'Foydalanuvchi') + ': ' + preview,
        task.id
      );
    }
    res.status(201).json({ success: true, comment: commentJson(req, comment) });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT /api/tasks/:id/comments/:commentId — xabarni tahrirlash
router.put('/:id/comments/:commentId', auth.requireAuth, async (req, res) => {
  try {
    const task = await getAccessibleTask(req, req.params.id);
    if (!task) return res.status(404).json({ success: false, error: 'Vazifa topilmadi' });
    const comment = await db.get(
      'SELECT * FROM task_comments WHERE id = ? AND task_id = ?',
      [req.params.commentId, req.params.id]
    );
    if (!comment) return res.status(404).json({ success: false, error: 'Xabar topilmadi' });
    if (!canManageComment(req, comment)) {
      return res.status(403).json({ success: false, error: 'Bu xabarni tahrirlashga ruxsat yo‘q' });
    }
    const message = String(req.body.message || '').trim();
    if (!message) return res.status(400).json({ success: false, error: 'Xabar bo‘sh bo‘lishi mumkin emas' });
    if (message.length > 2000) {
      return res.status(400).json({ success: false, error: 'Xabar 2000 belgidan oshmasligi kerak' });
    }
    await db.run(
      'UPDATE task_comments SET message = ?, updated_at = NOW() WHERE id = ?',
      [message, req.params.commentId]
    );
    const updated = await db.get(
      `SELECT c.id, c.task_id, c.user_id, c.user_email, c.user_name,
       c.message, c.created_at, c.updated_at, u.avatar
       FROM task_comments c
       LEFT JOIN admin_users u ON u.id = c.user_id WHERE c.id = ?`,
      [req.params.commentId]
    );
    res.json({ success: true, comment: commentJson(req, updated) });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE /api/tasks/:id/comments/:commentId — xabarni o'chirish
router.delete('/:id/comments/:commentId', auth.requireAuth, async (req, res) => {
  try {
    const task = await getAccessibleTask(req, req.params.id);
    if (!task) return res.status(404).json({ success: false, error: 'Vazifa topilmadi' });
    const comment = await db.get(
      'SELECT * FROM task_comments WHERE id = ? AND task_id = ?',
      [req.params.commentId, req.params.id]
    );
    if (!comment) return res.status(404).json({ success: false, error: 'Xabar topilmadi' });
    if (!canManageComment(req, comment)) {
      return res.status(403).json({ success: false, error: 'Bu xabarni o‘chirishga ruxsat yo‘q' });
    }
    await db.run('DELETE FROM task_comments WHERE id = ?', [req.params.commentId]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

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
