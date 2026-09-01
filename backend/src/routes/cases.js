const express = require('express');
const router = express.Router();
const db = require('../db');
const auth = require('../services/auth');
const storage = require('../services/storage');

const toPublic = (row) => ({
  id: row.id,
  tag: row.tag,
  title: row.title,
  desc: row.description,
  metric1: { value: row.metric1_value, label: row.metric1_label },
  metric2: { value: row.metric2_value, label: row.metric2_label },
  markets: JSON.parse(row.markets || '[]'),
  image: row.image,
  icon: row.icon,
  sortOrder: row.sort_order
});

// GET /api/cases — ommaviy, sayt shu yerdan o'qiydi
router.get('/', async (req, res) => {
  try {
    const rows = await db.all('SELECT * FROM cases ORDER BY sort_order ASC, id ASC');
    res.json({ success: true, cases: rows.map(toPublic) });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch cases' });
  }
});

// POST /api/cases — admin
router.post('/', auth.requireAuth, async (req, res) => {
  try {
    const { tag, title, desc, metric1, metric2, markets, image, icon, sortOrder } = req.body;
    if (!tag || !title || !desc) {
      return res.status(400).json({ success: false, error: 'tag, title, desc majburiy' });
    }
    const imageUrl = await storage.uploadIfBase64(image, 'cases');
    const iconUrl = await storage.uploadIfBase64(icon, 'case-icons');
    const result = await db.run(
      `INSERT INTO cases (tag,title,description,metric1_value,metric1_label,metric2_value,metric2_label,markets,image,icon,sort_order)
       VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
      [tag, title, desc, metric1?.value || '', metric1?.label || '', metric2?.value || '', metric2?.label || '',
        JSON.stringify(markets || []), imageUrl || null, iconUrl || null, sortOrder || 0]
    );
    const row = await db.get('SELECT * FROM cases WHERE id = ?', [result.id]);
    res.json({ success: true, case: toPublic(row) });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to create case' });
  }
});

// PUT /api/cases/:id — admin
router.put('/:id', auth.requireAuth, async (req, res) => {
  try {
    const { tag, title, desc, metric1, metric2, markets, image, icon, sortOrder } = req.body;
    const existing = await db.get('SELECT * FROM cases WHERE id = ?', [req.params.id]);
    if (!existing) return res.status(404).json({ success: false, error: 'Case topilmadi' });

    const imageUrl = image !== undefined ? await storage.uploadIfBase64(image, 'cases') : undefined;
    const iconUrl = icon !== undefined ? await storage.uploadIfBase64(icon, 'case-icons') : undefined;
    await db.run(
      `UPDATE cases SET tag=?, title=?, description=?, metric1_value=?, metric1_label=?, metric2_value=?, metric2_label=?, markets=?, image=?, icon=?, sort_order=?
       WHERE id=?`,
      [
        tag ?? existing.tag, title ?? existing.title, desc ?? existing.description,
        metric1?.value ?? existing.metric1_value, metric1?.label ?? existing.metric1_label,
        metric2?.value ?? existing.metric2_value, metric2?.label ?? existing.metric2_label,
        markets ? JSON.stringify(markets) : existing.markets,
        imageUrl !== undefined ? imageUrl : existing.image,
        iconUrl !== undefined ? iconUrl : existing.icon,
        sortOrder ?? existing.sort_order,
        req.params.id
      ]
    );
    const row = await db.get('SELECT * FROM cases WHERE id = ?', [req.params.id]);
    res.json({ success: true, case: toPublic(row) });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to update case' });
  }
});

// DELETE /api/cases/:id — admin
router.delete('/:id', auth.requireAuth, async (req, res) => {
  try {
    await db.run('DELETE FROM cases WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to delete case' });
  }
});

module.exports = router;
