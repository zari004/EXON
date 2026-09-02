const express = require('express');
const router = express.Router();
const db = require('../db');
const auth = require('../services/auth');
const storage = require('../services/storage');

const toPublic = (row) => ({
  id: row.id,
  name: row.name,
  image: row.image,
  strokeColor: row.stroke_color || null,
  sortOrder: row.sort_order
});

const normalizeStrokeColor = (value) => {
  if (value === null || value === undefined || value === '') return null;
  return /^#[0-9a-f]{6}$/i.test(String(value)) ? String(value).toLowerCase() : null;
};

// GET /api/partners — ommaviy, sayt shu yerdan o'qiydi
router.get('/', async (req, res) => {
  try {
    const rows = await db.all('SELECT * FROM partners ORDER BY sort_order ASC, id ASC');
    res.json({ success: true, partners: rows.map(toPublic) });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch partners' });
  }
});

// POST /api/partners — admin
router.post('/', auth.requireAuth, async (req, res) => {
  try {
    const { name, image, strokeColor, sortOrder } = req.body;
    if (!name || !image) {
      return res.status(400).json({ success: false, error: 'name va image majburiy' });
    }
    const imageUrl = await storage.uploadIfBase64(image, 'partners');
    const result = await db.run(
      `INSERT INTO partners (name,image,stroke_color,sort_order) VALUES (?,?,?,?)`,
      [name, imageUrl, normalizeStrokeColor(strokeColor), sortOrder || 0]
    );
    const row = await db.get('SELECT * FROM partners WHERE id = ?', [result.id]);
    res.json({ success: true, partner: toPublic(row) });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to create partner' });
  }
});

// PUT /api/partners/:id — admin
router.put('/:id', auth.requireAuth, async (req, res) => {
  try {
    const { name, image, strokeColor, sortOrder } = req.body;
    const existing = await db.get('SELECT * FROM partners WHERE id = ?', [req.params.id]);
    if (!existing) return res.status(404).json({ success: false, error: 'Hamkor topilmadi' });

    const imageUrl = image !== undefined ? await storage.uploadIfBase64(image, 'partners') : undefined;
    await db.run(
      `UPDATE partners SET name=?, image=?, stroke_color=?, sort_order=? WHERE id=?`,
      [
        name ?? existing.name,
        imageUrl !== undefined ? imageUrl : existing.image,
        strokeColor !== undefined ? normalizeStrokeColor(strokeColor) : existing.stroke_color,
        sortOrder ?? existing.sort_order,
        req.params.id
      ]
    );
    const row = await db.get('SELECT * FROM partners WHERE id = ?', [req.params.id]);
    res.json({ success: true, partner: toPublic(row) });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to update partner' });
  }
});

// DELETE /api/partners/:id — admin
router.delete('/:id', auth.requireAuth, async (req, res) => {
  try {
    await db.run('DELETE FROM partners WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to delete partner' });
  }
});

module.exports = router;
