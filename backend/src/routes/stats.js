const express = require('express');
const router = express.Router();
const db = require('../db');
const auth = require('../services/auth');

const toPublic = (row) => ({
  id: row.id,
  value: row.value,
  suffix: row.suffix,
  label: row.label,
  sortOrder: row.sort_order
});

// GET /api/stats — ommaviy, sayt shu yerdan o'qiydi
router.get('/', async (req, res) => {
  try {
    const rows = await db.all('SELECT * FROM stats ORDER BY sort_order ASC, id ASC');
    res.json({ success: true, stats: rows.map(toPublic) });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch stats' });
  }
});

// POST /api/stats — admin
router.post('/', auth.requireAuth, async (req, res) => {
  try {
    const { value, suffix, label, sortOrder } = req.body;
    if (value === undefined || value === null || !label) {
      return res.status(400).json({ success: false, error: 'value va label majburiy' });
    }
    const result = await db.run(
      `INSERT INTO stats (value,suffix,label,sort_order) VALUES (?,?,?,?)`,
      [value, suffix || '+', label, sortOrder || 0]
    );
    const row = await db.get('SELECT * FROM stats WHERE id = ?', [result.id]);
    res.json({ success: true, stat: toPublic(row) });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to create stat' });
  }
});

// PUT /api/stats/:id — admin
router.put('/:id', auth.requireAuth, async (req, res) => {
  try {
    const { value, suffix, label, sortOrder } = req.body;
    const existing = await db.get('SELECT * FROM stats WHERE id = ?', [req.params.id]);
    if (!existing) return res.status(404).json({ success: false, error: 'Statistika topilmadi' });

    await db.run(
      `UPDATE stats SET value=?, suffix=?, label=?, sort_order=? WHERE id=?`,
      [
        value ?? existing.value,
        suffix ?? existing.suffix,
        label ?? existing.label,
        sortOrder ?? existing.sort_order,
        req.params.id
      ]
    );
    const row = await db.get('SELECT * FROM stats WHERE id = ?', [req.params.id]);
    res.json({ success: true, stat: toPublic(row) });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to update stat' });
  }
});

// DELETE /api/stats/:id — admin
router.delete('/:id', auth.requireAuth, async (req, res) => {
  try {
    await db.run('DELETE FROM stats WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to delete stat' });
  }
});

module.exports = router;
