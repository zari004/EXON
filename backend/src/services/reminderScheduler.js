const db = require('../db');
const mailer = require('./mailer');

function fmtDue(dueDate, dueTime) {
  var d = new Date(dueDate);
  var txt = d.toLocaleDateString('uz-UZ', { day: '2-digit', month: 'long', year: 'numeric' });
  if (dueTime) txt += ', ' + dueTime;
  return txt;
}

// Eslatma vaqti kelgan, hali yuborilmagan vazifalarni tekshirib, emailga eslatma yuboradi.
// Render bepul tarifda xizmat uxlab qolganda ishlamaydi — servis uyg'ongan
// har safar (deploy, kimdir saytga kirganda) va har DAQIQA_ORALIQ'da tekshiradi.
async function checkReminders() {
  if (!mailer.isConfigured()) return;
  try {
    const rows = await db.all(`
      SELECT t.id, t.title, t.due_date, t.due_time, t.reminder_minutes, u.email AS assignee_email
      FROM tasks t
      JOIN admin_users u ON u.id = t.assigned_to
      WHERE t.reminder_minutes IS NOT NULL
        AND t.reminder_sent = false
        AND t.status != 'done'
        AND t.due_date IS NOT NULL
    `);
    const now = new Date();
    for (const t of rows) {
      var due = new Date(t.due_date);
      if (t.due_time) {
        var parts = String(t.due_time).split(':');
        due.setHours(Number(parts[0]) || 0, Number(parts[1]) || 0, 0, 0);
      }
      var reminderAt = new Date(due.getTime() - t.reminder_minutes * 60000);
      if (now < reminderAt) continue;
      try {
        await mailer.sendTaskReminder(t.assignee_email, t.title, fmtDue(t.due_date, t.due_time));
        await db.run('UPDATE tasks SET reminder_sent = true WHERE id = ?', [t.id]);
      } catch (err) {
        console.error('Eslatma yuborishda xato (task #' + t.id + '):', err.message);
      }
    }
  } catch (err) {
    console.error('Eslatmalarni tekshirishda xato:', err.message);
  }
}

module.exports = { checkReminders };
