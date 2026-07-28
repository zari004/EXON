const express = require('express');
const router = express.Router();
const auth = require('../services/auth');
const db = require('../db');

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

module.exports = router;
