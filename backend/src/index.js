require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');

const db = require('./db');
const auditRoutes = require('./routes/audit');
const adminRoutes = require('./routes/admin');
const authRoutes = require('./routes/auth');
const casesRoutes = require('./routes/cases');
const postsRoutes = require('./routes/posts');
const pricingRoutes = require('./routes/pricing');
const tasksRoutes = require('./routes/tasks');
const accountRoutes = require('./routes/account');
const reminderScheduler = require('./services/reminderScheduler');

const app = express();
const PORT = process.env.PORT || 3000;

// ════════════════════════════════════════════════════════════════════════════
// MIDDLEWARE
// ════════════════════════════════════════════════════════════════════════════

// CORS — barcha ruxsat etilgan manzil variantlarini qabul qiladi:
// http/https, www/www-siz exon-marketing.uz, GitHub Pages va localhost.
// Sabab: agar sayt http:// yoki www. bilan ochilsa, oldingi qat'iy
// tekshiruv Origin'ni rad etib, brauzerda "Failed to fetch" berardi.
const allowedOriginPatterns = [
  /^https?:\/\/(www\.)?exon-marketing\.uz$/,
  /^https:\/\/zari004\.github\.io$/,
  /^http:\/\/localhost(:\d+)?$/,
  /^http:\/\/127\.0\.0\.1(:\d+)?$/
];

app.use(cors({
  origin: function (origin, callback) {
    // origin bo'lmasa (curl, mobil app, server-to-server) — ruxsat
    if (!origin) return callback(null, true);
    const allowed = allowedOriginPatterns.some(function (re) { return re.test(origin); });
    callback(null, allowed);
  },
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
    // Vazifa eslatmalari — server ishga tushganda darhol va har 2 daqiqada tekshiriladi
    reminderScheduler.checkReminders();
    setInterval(reminderScheduler.checkReminders, 2 * 60 * 1000);
  }).catch(err => {
    console.error('❌ Database error:', err);
    process.exit(1);
  });

// ════════════════════════════════════════════════════════════════════════════
// ROUTES
// ════════════════════════════════════════════════════════════════════════════

app.use('/api/audit', auditRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/cases', casesRoutes);
app.use('/api/posts', postsRoutes);
app.use('/api/pricing', pricingRoutes);
app.use('/api/tasks', tasksRoutes);
app.use('/api/account', accountRoutes);

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
