const express = require('express');
const router = express.Router();
const db = require('../db');
const auth = require('../services/auth');

const toPublic = (row) => ({
  id: row.id,
  tag: row.tag,
  title: row.title,
  desc: row.desc,
  date: row.date_label,
  readTime: row.read_time,
  image: row.image,
  sortOrder: row.sort_order
});

// GET /api/posts — ommaviy
router.get('/', async (req, res) => {
  try {
    const rows = await db.all('SELECT * FROM posts ORDER BY sort_order ASC, id ASC');
    res.json({ success: true, posts: rows.map(toPublic) });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch posts' });
  }
});

// POST /api/posts — admin
router.post('/', auth.requireAuth, async (req, res) => {
  try {
    const { tag, title, desc, date, readTime, image, sortOrder } = req.body;
    if (!tag || !title || !desc) {
      return res.status(400).json({ success: false, error: 'tag, title, desc majburiy' });
    }
    const result = await db.run(
      `INSERT INTO posts (tag,title,desc,date_label,read_time,image,sort_order) VALUES (?,?,?,?,?,?,?)`,
      [tag, title, desc, date || '', readTime || '', image || null, sortOrder || 0]
    );
    const row = await db.get('SELECT * FROM posts WHERE id = ?', [result.id]);
    res.json({ success: true, post: toPublic(row) });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to create post' });
  }
});

// PUT /api/posts/:id — admin
router.put('/:id', auth.requireAuth, async (req, res) => {
  try {
    const { tag, title, desc, date, readTime, image, sortOrder } = req.body;
    const existing = await db.get('SELECT * FROM posts WHERE id = ?', [req.params.id]);
    if (!existing) return res.status(404).json({ success: false, error: 'Maqola topilmadi' });

    await db.run(
      `UPDATE posts SET tag=?, title=?, desc=?, date_label=?, read_time=?, image=?, sort_order=? WHERE id=?`,
      [
        tag ?? existing.tag, title ?? existing.title, desc ?? existing.desc,
        date ?? existing.date_label, readTime ?? existing.read_time,
        image !== undefined ? image : existing.image,
        sortOrder ?? existing.sort_order,
        req.params.id
      ]
    );
    const row = await db.get('SELECT * FROM posts WHERE id = ?', [req.params.id]);
    res.json({ success: true, post: toPublic(row) });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to update post' });
  }
});

// DELETE /api/posts/:id — admin
router.delete('/:id', auth.requireAuth, async (req, res) => {
  try {
    await db.run('DELETE FROM posts WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to delete post' });
  }
});

module.exports = router;
