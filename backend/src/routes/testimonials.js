const express = require('express');
const router = express.Router();
const db = require('../db');
const auth = require('../services/auth');
const storage = require('../services/storage');

const toPublic = (row) => ({
  id: row.id,
  quote: row.quote,
  name: row.name,
  image: row.image || null,
  sortOrder: row.sort_order
});

// GET /api/testimonials — ommaviy, sayt shu yerdan o'qiydi
router.get('/', async (req, res) => {
  try {
    const rows = await db.all('SELECT * FROM testimonials ORDER BY sort_order ASC, id ASC');
    res.json({ success: true, testimonials: rows.map(toPublic) });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch testimonials' });
  }
});

// POST /api/testimonials — admin
router.post('/', auth.requireAuth, async (req, res) => {
  try {
    const { quote, name, image, sortOrder } = req.body;
    if (!quote || !name) {
      return res.status(400).json({ success: false, error: 'quote va name majburiy' });
    }
    const imageUrl = await storage.uploadIfBase64(image, 'testimonials');
    const result = await db.run(
      `INSERT INTO testimonials (quote,name,image,sort_order) VALUES (?,?,?,?)`,
      [quote, name, imageUrl || null, sortOrder || 0]
    );
    const row = await db.get('SELECT * FROM testimonials WHERE id = ?', [result.id]);
    res.json({ success: true, testimonial: toPublic(row) });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to create testimonial' });
  }
});

// PUT /api/testimonials/:id — admin
router.put('/:id', auth.requireAuth, async (req, res) => {
  try {
    const { quote, name, image, sortOrder } = req.body;
    const existing = await db.get('SELECT * FROM testimonials WHERE id = ?', [req.params.id]);
    if (!existing) return res.status(404).json({ success: false, error: 'Fikr topilmadi' });

    const imageUrl = image !== undefined ? await storage.uploadIfBase64(image, 'testimonials') : undefined;
    await db.run(
      `UPDATE testimonials SET quote=?, name=?, image=?, sort_order=? WHERE id=?`,
      [
        quote ?? existing.quote,
        name ?? existing.name,
        imageUrl !== undefined ? imageUrl : existing.image,
        sortOrder ?? existing.sort_order,
        req.params.id
      ]
    );
    const row = await db.get('SELECT * FROM testimonials WHERE id = ?', [req.params.id]);
    res.json({ success: true, testimonial: toPublic(row) });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to update testimonial' });
  }
});

// DELETE /api/testimonials/:id — admin
router.delete('/:id', auth.requireAuth, async (req, res) => {
  try {
    await db.run('DELETE FROM testimonials WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to delete testimonial' });
  }
});

module.exports = router;
