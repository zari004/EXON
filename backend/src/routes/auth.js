const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const auth = require('../services/auth');
const db = require('../db');
const mailer = require('../services/mailer');

const VALID_ROLES = ['seo', 'menejer_bosh', 'menejer_oddiy', 'dizayner_bosh', 'dizayner_oddiy'];

/**
 * POST /api/auth/register
 * Body: { name, email, password, role }
 * Birinchi ro'yxatdan o'tgan foydalanuvchi avtomatik it_bolimi rolini oladi va tasdiqlanadi.
 */
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, role } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ success: false, error: 'Ism, email va parol talab qilinadi' });
    }
    if (password.length < 6) {
      return res.status(400).json({ success: false, error: "Parol kamida 6 ta belgidan iborat bo'lishi kerak" });
    }

    const adminEmail = (process.env.ADMIN_EMAIL || '').toLowerCase().trim();
    const isAdminEmail = adminEmail && email.toLowerCase().trim() === adminEmail;

    // Tasdiqlanganlar sonini tekshirish
    const approvedRow = await db.get("SELECT COUNT(*) as count FROM admin_users WHERE status = 'approved'");
    const noApprovedYet = Number(approvedRow.count) === 0;

    // Auto-approve: ADMIN_EMAIL bilan mos kelsa YOKI hali birorta approved foydalanuvchi yo'q bo'lsa
    const autoApprove = isAdminEmail || noApprovedYet;
    const assignedRole = autoApprove ? 'it_bolimi' : (VALID_ROLES.includes(role) ? role : 'menejer_oddiy');
    const assignedStatus = autoApprove ? 'approved' : 'pending';

    await auth.registerUser(name, email, password, assignedRole, assignedStatus);
    res.json({ success: true, firstUser: autoApprove });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/auth/login
 * Body: { email, password }
 */
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, error: 'Email va parol talab qilinadi' });
    }
    const result = await auth.loginByEmail(email, password);
    if (result.error) {
      const statusCode = result.code ? 403 : 401;
      return res.status(statusCode).json({ success: false, error: result.error, code: result.code });
    }
    res.json({ success: true, token: result.token, role: result.role, name: result.name });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/auth/forgot-password
 * Body: { email }
 * Agar email ro'yxatdan o'tgan bo'lsa, 6 xonali tasdiqlash kodi yuboriladi.
 * Xavfsizlik uchun email mavjud yoki yo'qligi bildirilmaydi — javob har doim bir xil.
 */
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ success: false, error: 'Email talab qilinadi' });
    const cleanEmail = email.toLowerCase().trim();
    const user = await db.get('SELECT id FROM admin_users WHERE email = ?', [cleanEmail]);
    if (user) {
      const code = auth.createResetCode(cleanEmail);
      mailer.sendResetCode(cleanEmail, code).catch(function (err) {
        console.error('Mail yuborishda xato:', err.message);
      });
    }
    res.json({ success: true, message: "Agar bu email ro'yxatdan o'tgan bo'lsa, tasdiqlash kodi yuborildi" });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/auth/reset-password
 * Body: { email, code, newPassword }
 * Emailga yuborilgan kodni tasdiqlab, yangi parol o'rnatadi.
 */
router.post('/reset-password', async (req, res) => {
  try {
    const { email, code, newPassword } = req.body;
    if (!email || !code || !newPassword) {
      return res.status(400).json({ success: false, error: 'Barcha maydonlar talab qilinadi' });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ success: false, error: "Yangi parol kamida 6 ta belgidan iborat bo'lishi kerak" });
    }
    const cleanEmail = email.toLowerCase().trim();
    if (!auth.verifyResetCode(cleanEmail, String(code).trim())) {
      return res.status(400).json({ success: false, error: "Kod noto'g'ri yoki muddati o'tgan" });
    }
    const user = await db.get('SELECT id FROM admin_users WHERE email = ?', [cleanEmail]);
    if (!user) return res.status(404).json({ success: false, error: 'Foydalanuvchi topilmadi' });
    const hash = await bcrypt.hash(newPassword, 10);
    await db.run('UPDATE admin_users SET password_hash = ? WHERE id = ?', [hash, user.id]);
    auth.clearResetCode(cleanEmail);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
