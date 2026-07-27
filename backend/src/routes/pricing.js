const express = require('express');
const router = express.Router();
const db = require('../db');
const auth = require('../services/auth');

const toPublic = (row) => ({
  id: row.id,
  badge: row.badge,
  featured: !!row.featured,
  name: row.name,
  desc: row.desc,
  amount: row.amount,
  currency: row.currency,
  period: row.period,
  features: JSON.parse(row.features || '[]'),
  ctaLabel: row.cta_label,
  ctaType: row.cta_type,
  sortOrder: row.sort_order
});

// GET /api/pricing — ommaviy
router.get('/', async (req, res) => {
  try {
    const rows = await db.all('SELECT * FROM pricing ORDER BY sort_order ASC, id ASC');
    res.json({ success: true, pricing: rows.map(toPublic) });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch pricing' });
  }
});

// POST /api/pricing — admin
router.post('/', auth.requireAuth, async (req, res) => {
  try {
    const { badge, featured, name, desc, amount, currency, period, features, ctaLabel, ctaType, sortOrder } = req.body;
    if (!name || !amount) {
      return res.status(400).json({ success: false, error: 'name, amount majburiy' });
    }
    const result = await db.run(
      `INSERT INTO pricing (badge,featured,name,desc,amount,currency,period,features,cta_label,cta_type,sort_order)
       VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
      [badge || '', featured ? 1 : 0, name, desc || '', amount, currency || '', period || '',
        JSON.stringify(features || []), ctaLabel || 'Batafsil', ctaType || 'secondary', sortOrder || 0]
    );
    const row = await db.get('SELECT * FROM pricing WHERE id = ?', [result.id]);
    res.json({ success: true, plan: toPublic(row) });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to create plan' });
  }
});

// PUT /api/pricing/:id — admin
router.put('/:id', auth.requireAuth, async (req, res) => {
  try {
    const { badge, featured, name, desc, amount, currency, period, features, ctaLabel, ctaType, sortOrder } = req.body;
    const existing = await db.get('SELECT * FROM pricing WHERE id = ?', [req.params.id]);
    if (!existing) return res.status(404).json({ success: false, error: 'Paket topilmadi' });

    await db.run(
      `UPDATE pricing SET badge=?, featured=?, name=?, desc=?, amount=?, currency=?, period=?, features=?, cta_label=?, cta_type=?, sort_order=?
       WHERE id=?`,
      [
        badge ?? existing.badge, featured !== undefined ? (featured ? 1 : 0) : existing.featured,
        name ?? existing.name, desc ?? existing.desc, amount ?? existing.amount,
        currency ?? existing.currency, period ?? existing.period,
        features ? JSON.stringify(features) : existing.features,
        ctaLabel ?? existing.cta_label, ctaType ?? existing.cta_type,
        sortOrder ?? existing.sort_order,
        req.params.id
      ]
    );
    const row = await db.get('SELECT * FROM pricing WHERE id = ?', [req.params.id]);
    res.json({ success: true, plan: toPublic(row) });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to update plan' });
  }
});

// DELETE /api/pricing/:id — admin
router.delete('/:id', auth.requireAuth, async (req, res) => {
  try {
    await db.run('DELETE FROM pricing WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to delete plan' });
  }
});

module.exports = router;
