const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const db = require('../db');

const tokens = new Map(); // token -> { expiresAt, role, userId, email, name }
const TOKEN_TTL_MS = 12 * 60 * 60 * 1000; // 12 soat

// Eski parol-only login — superadmin uchun backward compat
const login = (password) => {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected || password !== expected) return null;
  const token = crypto.randomBytes(32).toString('hex');
  tokens.set(token, { expiresAt: Date.now() + TOKEN_TTL_MS, role: 'superadmin', userId: null, email: process.env.ADMIN_EMAIL || 'admin', name: 'Admin' });
  return token;
};

// Email + parol orqali kirish (superadmin yoki ro'yxatdagi foydalanuvchi)
const loginByEmail = async (email, password) => {
  const adminEmail = process.env.ADMIN_EMAIL;   // ixtiyoriy: sozlangan bo'lsa aniq email tekshiriladi
  const adminPassword = process.env.ADMIN_PASSWORD;

  // Superadmin tekshiruvi:
  // - ADMIN_EMAIL sozlangan bo'lsa: faqat shu email + ADMIN_PASSWORD
  // - ADMIN_EMAIL sozlanmagan bo'lsa: istalgan email + ADMIN_PASSWORD (legacy/migration)
  const isSuperAdminAttempt = adminEmail ? email === adminEmail : true;
  if (isSuperAdminAttempt && adminPassword && password === adminPassword) {
    const token = crypto.randomBytes(32).toString('hex');
    tokens.set(token, { expiresAt: Date.now() + TOKEN_TTL_MS, role: 'superadmin', userId: null, email, name: 'Admin' });
    return { token, role: 'superadmin', name: 'Admin' };
  }

  // DB dan foydalanuvchi qidirish
  const user = await db.get('SELECT * FROM admin_users WHERE email = ?', [email]);
  if (!user) return { error: "Email yoki parol noto'g'ri" };
  if (user.status === 'pending') return { code: 'PENDING', error: 'Hisobingiz hali tasdiqlanmagan' };
  if (user.status === 'rejected') return { code: 'REJECTED', error: 'Hisobingiz rad etildi' };

  const match = await bcrypt.compare(password, user.password_hash);
  if (!match) return { error: "Email yoki parol noto'g'ri" };

  const token = crypto.randomBytes(32).toString('hex');
  tokens.set(token, { expiresAt: Date.now() + TOKEN_TTL_MS, role: user.role, userId: user.id, email, name: user.name });
  return { token, role: user.role, name: user.name };
};

// Yangi foydalanuvchi ro'yxatdan o'tishi
const registerUser = async (name, email, password, role) => {
  const existing = await db.get('SELECT id FROM admin_users WHERE email = ?', [email]);
  if (existing) throw new Error("Bu email allaqachon ro'yxatdan o'tgan");
  const hash = await bcrypt.hash(password, 10);
  await db.run(
    'INSERT INTO admin_users (name, email, password_hash, role, status) VALUES (?, ?, ?, ?, ?)',
    [name, email, hash, role, 'pending']
  );
};

const verify = (token) => {
  const data = tokens.get(token);
  if (!data) return false;
  if (Date.now() > data.expiresAt) { tokens.delete(token); return false; }
  return data;
};

const logout = (token) => { tokens.delete(token); };

const requireAuth = (req, res, next) => {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  const data = token ? verify(token) : false;
  if (!data) return res.status(401).json({ success: false, error: 'Avtorizatsiya talab qilinadi' });
  req.user = data;
  next();
};

const requireSuperAdmin = (req, res, next) => {
  if (req.user && req.user.role === 'superadmin') return next();
  res.status(403).json({ success: false, error: 'Bu amalni faqat superadmin bajarishi mumkin' });
};

module.exports = { login, loginByEmail, registerUser, verify, logout, requireAuth, requireSuperAdmin };
