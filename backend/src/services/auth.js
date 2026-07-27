const crypto = require('crypto');

// Oddiy xotiradagi sessiya — bitta admin uchun yetarli, alohida jadval kerak emas.
const tokens = new Map(); // token -> expiresAt
const TOKEN_TTL_MS = 12 * 60 * 60 * 1000; // 12 soat

const login = (password) => {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) {
    throw new Error('ADMIN_PASSWORD .env faylida sozlanmagan');
  }
  if (password !== expected) {
    return null;
  }
  const token = crypto.randomBytes(32).toString('hex');
  tokens.set(token, Date.now() + TOKEN_TTL_MS);
  return token;
};

const verify = (token) => {
  const expiresAt = tokens.get(token);
  if (!expiresAt) return false;
  if (Date.now() > expiresAt) {
    tokens.delete(token);
    return false;
  }
  return true;
};

const logout = (token) => {
  tokens.delete(token);
};

const requireAuth = (req, res, next) => {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token || !verify(token)) {
    return res.status(401).json({ success: false, error: 'Avtorizatsiya talab qilinadi' });
  }
  next();
};

module.exports = { login, verify, logout, requireAuth };
