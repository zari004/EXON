const express = require('express');
const router = express.Router();
const db = require('../db');
const auth = require('../services/auth');

const toPublic = (row) => ({
  id: row.id,
  platform: row.platform,
  url: row.url,
  sortOrder: row.sort_order
});

// GET /api/social — ommaviy, sayt shu yerdan o'qiydi
router.get('/', async (req, res) => {
  try {
    const rows = await db.all('SELECT * FROM social_links ORDER BY sort_order ASC, id ASC');
    res.json({ success: true, links: rows.map(toPublic) });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch social links' });
  }
});

// POST /api/social — admin
router.post('/', auth.requireAuth, async (req, res) => {
  try {
    const { platform, url, sortOrder } = req.body;
    if (!platform || !url) {
      return res.status(400).json({ success: false, error: 'platform va url majburiy' });
    }
    const result = await db.run(
      `INSERT INTO social_links (platform,url,sort_order) VALUES (?,?,?)`,
      [platform, url, sortOrder || 0]
    );
    const row = await db.get('SELECT * FROM social_links WHERE id = ?', [result.id]);
    res.json({ success: true, link: toPublic(row) });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to create social link' });
  }
});

// PUT /api/social/:id — admin
router.put('/:id', auth.requireAuth, async (req, res) => {
  try {
    const { platform, url, sortOrder } = req.body;
    const existing = await db.get('SELECT * FROM social_links WHERE id = ?', [req.params.id]);
    if (!existing) return res.status(404).json({ success: false, error: 'Havola topilmadi' });

    await db.run(
      `UPDATE social_links SET platform=?, url=?, sort_order=? WHERE id=?`,
      [
        platform ?? existing.platform,
        url ?? existing.url,
        sortOrder ?? existing.sort_order,
        req.params.id
      ]
    );
    const row = await db.get('SELECT * FROM social_links WHERE id = ?', [req.params.id]);
    res.json({ success: true, link: toPublic(row) });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to update social link' });
  }
});

// DELETE /api/social/:id — admin
router.delete('/:id', auth.requireAuth, async (req, res) => {
  try {
    await db.run('DELETE FROM social_links WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to delete social link' });
  }
});

module.exports = router;
