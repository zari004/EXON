const express = require('express');
const router = express.Router();
const db = require('../db');
const auth = require('../services/auth');

/**
 * POST /api/admin/login
 * Body: { password }
 */
router.post('/login', (req, res) => {
  try {
    const { password } = req.body;
    const token = auth.login(password);
    if (!token) {
      return res.status(401).json({ success: false, error: "Parol noto'g'ri" });
    }
    res.json({ success: true, token });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/admin/logout
 */
router.post('/logout', auth.requireAuth, (req, res) => {
  const token = req.headers.authorization.slice(7);
  auth.logout(token);
  res.json({ success: true });
});

/**
 * GET /api/admin/me — token hali amal qiladimi tekshirish
 */
router.get('/me', auth.requireAuth, (req, res) => {
  res.json({ success: true });
});

/**
 * GET /api/admin/stats — audit hisobotlari (segment bo'yicha, so'nggi lidlar)
 */
router.get('/stats', auth.requireAuth, async (req, res) => {
  try {
    const total = await db.get('SELECT COUNT(*) as count FROM leads');
    const bySegment = await db.all('SELECT segment, COUNT(*) as count FROM leads GROUP BY segment');
    const avgScore = await db.get('SELECT AVG(score) as avg FROM leads');
    const recent = await db.all('SELECT id, email, score, segment, created_at FROM leads ORDER BY created_at DESC LIMIT 20');

    res.json({
      success: true,
      total: total.count,
      averageScore: total.count ? Math.round(avgScore.avg) : 0,
      bySegment: bySegment.reduce((acc, row) => { acc[row.segment] = row.count; return acc; }, {}),
      recent
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch statistics' });
  }
});

module.exports = router;
