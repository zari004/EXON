const db = require('../db');

// Har bir foydalanuvchi uchun alohida bildirishnoma yozadi (jim xato — asosiy
// amalni to'xtatmasligi kerak, masalan vazifa yaratish bildirishnoma
// yozishda xato bo'lsa ham muvaffaqiyatli yakunlanishi kerak)
async function notify(userId, type, title, message, taskId) {
  if (!userId) return;
  try {
    await db.run(
      'INSERT INTO notifications (user_id, type, title, message, task_id) VALUES (?, ?, ?, ?, ?)',
      [userId, type, title, message || null, taskId || null]
    );
  } catch (err) {
    console.error('Bildirishnoma yaratishda xato:', err.message);
  }
}

module.exports = { notify };
