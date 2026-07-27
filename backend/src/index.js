require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');

const db = require('./db');
const auditRoutes = require('./routes/audit');

const app = express();
const PORT = process.env.PORT || 3000;

// ════════════════════════════════════════════════════════════════════════════
// MIDDLEWARE
// ════════════════════════════════════════════════════════════════════════════

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:8888',
  credentials: true
}));

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// ════════════════════════════════════════════════════════════════════════════
// DATABASE INITIALIZATION
// ════════════════════════════════════════════════════════════════════════════

db.init().then(() => {
  console.log('✅ Database initialized');
}).catch(err => {
  console.error('❌ Database error:', err);
  process.exit(1);
});

// ════════════════════════════════════════════════════════════════════════════
// ROUTES
// ════════════════════════════════════════════════════════════════════════════

app.use('/api/audit', auditRoutes);

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
