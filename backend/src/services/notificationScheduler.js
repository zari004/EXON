const db = require('../db');
const notifications = require('./notifications');

// Muddatiga necha daqiqa qolganda "vaqt oz qoldi" bildirishnomasi yuborilsin
const DUE_SOON_WINDOW_MIN = 120;

// Vazifaning tugash sanasi+vaqtini Date obyektiga aylantiradi.
// Vaqt ko'rsatilmagan bo'lsa — kun oxiri (23:59) deb hisoblanadi.
function dueAt(dueDate, dueTime) {
  var d = new Date(dueDate);
  if (dueTime) {
    var parts = String(dueTime).split(':');
    d.setHours(Number(parts[0]) || 0, Number(parts[1]) || 0, 0, 0);
  } else {
    d.setHours(23, 59, 0, 0);
  }
  return d;
}

// Muddati yaqinlashgan yoki o'tib ketgan vazifalarni tekshirib,
// tayinlangan foydalanuvchiga bir martalik bildirishnoma yuboradi.
async function checkDueSoonAndOverdue() {
  try {
    const rows = await db.all(`
      SELECT id, title, due_date, due_time, assigned_to, due_soon_notified, overdue_notified
      FROM tasks
      WHERE status != 'done' AND due_date IS NOT NULL AND assigned_to IS NOT NULL
    `);
    const now = new Date();
    for (const t of rows) {
      const due = dueAt(t.due_date, t.due_time);
      const minutesLeft = (due.getTime() - now.getTime()) / 60000;
      if (!t.overdue_notified && minutesLeft < 0) {
        await notifications.notify(
          t.assigned_to, 'task_overdue',
          "Muddati o'tdi: " + t.title,
          '"' + t.title + '" vazifasining topshirish muddati o\'tib ketdi.',
          t.id
        );
        await db.run('UPDATE tasks SET overdue_notified = true WHERE id = ?', [t.id]);
      } else if (!t.due_soon_notified && minutesLeft >= 0 && minutesLeft <= DUE_SOON_WINDOW_MIN) {
        await notifications.notify(
          t.assigned_to, 'task_due_soon',
          'Muddati yaqinlashmoqda: ' + t.title,
          '"' + t.title + '" vazifasini topshirish vaqti kam qoldi.',
          t.id
        );
        await db.run('UPDATE tasks SET due_soon_notified = true WHERE id = ?', [t.id]);
      }
    }
  } catch (err) {
    console.error('Muddat bildirishnomalarini tekshirishda xato:', err.message);
  }
}

module.exports = { checkDueSoonAndOverdue };
