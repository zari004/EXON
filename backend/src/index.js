require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');

const db = require('./db');
const auditRoutes = require('./routes/audit');
const adminRoutes = require('./routes/admin');
const casesRoutes = require('./routes/cases');
const postsRoutes = require('./routes/posts');
const pricingRoutes = require('./routes/pricing');

const app = express();
const PORT = process.env.PORT || 3000;

// ════════════════════════════════════════════════════════════════════════════
// MIDDLEWARE
// ════════════════════════════════════════════════════════════════════════════

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:8888',
  credentials: true
}));

// limit oshirilgan — admin paneldan base64 rasm yuklanadi
app.use(bodyParser.json({ limit: '6mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '6mb' }));

// ════════════════════════════════════════════════════════════════════════════
// DATABASE INITIALIZATION
// ════════════════════════════════════════════════════════════════════════════

db.init()
  .then(() => db.seed())
  .then(() => {
    console.log('✅ Database initialized');
  }).catch(err => {
    console.error('❌ Database error:', err);
    process.exit(1);
  });

// ════════════════════════════════════════════════════════════════════════════
// ROUTES
// ════════════════════════════════════════════════════════════════════════════

app.use('/api/audit', auditRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/cases', casesRoutes);
app.use('/api/posts', postsRoutes);
app.use('/api/pricing', pricingRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'EXON API is running' });
});

// ════════════════════════════════════════════════════════════════════════════
// ERROR HANDLING
// ════════════════════════════════════════════════════════════════════════════

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({
    error: 'Server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// ════════════════════════════════════════════════════════════════════════════
// START SERVER
// ════════════════════════════════════════════════════════════════════════════

app.listen(PORT, () => {
  console.log(`
  ╔════════════════════════════════════════╗
  ║  EXON API Server                       ║
  ║  🚀 Running on port ${PORT}              ║
  ║  📍 http://localhost:${PORT}               ║
  ║  ✅ Ready to accept audit requests     ║
  ╚════════════════════════════════════════╝
  `);
});

module.exports = app;
