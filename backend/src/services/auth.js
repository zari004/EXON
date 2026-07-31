const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const db = require('../db');

// Sessiyalar bazada saqlanadi (jadval: sessions) — server qayta ishga
// tushsa ham (masalan Render sovuqdan uyg'onganda) foydalanuvchilar
// tizimdan chiqarilib yuborilmaydi.
const TOKEN_TTL_MS = 12 * 60 * 60 * 1000; // 12 soat

const resetCodes = new Map(); // email -> { code, expiresAt }
const RESET_CODE_TTL_MS = 10 * 60 * 1000; // 10 daqiqa

// Parolni tiklash uchun 6 xonali kod yaratadi va vaqtinchalik saqlaydi
const createResetCode = (email) => {
  const code = String(Math.floor(100000 + Math.random() * 900000));
  resetCodes.set(email, { code, expiresAt: Date.now() + RESET_CODE_TTL_MS });
  return code;
};

const verifyResetCode = (email, code) => {
  const entry = resetCodes.get(email);
  if (!entry) return false;
  if (Date.now() > entry.expiresAt) { resetCodes.delete(email); return false; }
  return entry.code === code;
};

const clearResetCode = (email) => { resetCodes.delete(email); };

// Eski, muddati o'tgan sessiyalarni tozalaydi — jadval cheksiz o'smasligi uchun
const pruneExpiredSessions = () => db.run('DELETE FROM sessions WHERE expires_at < NOW()').catch(() => {});

const createSession = async (row) => {
  const expiresAt = new Date(Date.now() + TOKEN_TTL_MS);
  const token = crypto.randomBytes(32).toString('hex');
  await pruneExpiredSessions();
  await db.run(
    // "sessions" jadvalida "id" ustuni yo'q (asosiy kalit — token), shu
    // sabab db.run() avtomatik qo'shadigan "RETURNING id" xato berardi —
    // shuning uchun bu yerda o'zimiz aniq "RETURNING token" yozamiz
    'INSERT INTO sessions (token, user_id, role, email, name, expires_at) VALUES (?, ?, ?, ?, ?, ?) RETURNING token',
    [token, row.userId, row.role, row.email, row.name, expiresAt]
  );
  return token;
};

// Eski parol-only login — superadmin uchun backward compat
const login = async (password) => {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected || password !== expected) return null;
  return createSession({ userId: null, role: 'superadmin', email: process.env.ADMIN_EMAIL || 'admin', name: 'Admin' });
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
    // Agar shu email bilan DB'da haqiqiy hisob mavjud bo'lsa — o'sha profilga bog'laymiz,
    // shunda Sozlamalar orqali ism/parol/rasm tahrirlash ishlaydi (userId null bo'lmaydi).
    // Aks holda (hali birorta hisob yaratilmagan bo'lsa) — eski "anonim" superadmin.
    const existing = await db.get('SELECT * FROM admin_users WHERE email = ?', [email]);
    if (existing && (existing.role === 'superadmin' || existing.role === 'it_bolimi')) {
      const token = await createSession({ userId: existing.id, role: existing.role, email, name: existing.name });
      return { token, role: existing.role, name: existing.name };
    }
    const token = await createSession({ userId: null, role: 'superadmin', email, name: 'Admin' });
    return { token, role: 'superadmin', name: 'Admin' };
  }

  // DB dan foydalanuvchi qidirish
  const user = await db.get('SELECT * FROM admin_users WHERE email = ?', [email]);
  if (!user) return { error: "Email yoki parol noto'g'ri" };
  if (user.status === 'pending') return { code: 'PENDING', error: 'Hisobingiz hali tasdiqlanmagan' };
  if (user.status === 'rejected') return { code: 'REJECTED', error: 'Hisobingiz rad etildi' };

  const match = await bcrypt.compare(password, user.password_hash);
  if (!match) return { error: "Email yoki parol noto'g'ri" };

  const token = await createSession({ userId: user.id, role: user.role, email, name: user.name });
  return { token, role: user.role, name: user.name };
};

// Yangi foydalanuvchi ro'yxatdan o'tishi
const registerUser = async (name, email, password, role, status = 'pending') => {
  const existing = await db.get('SELECT id FROM admin_users WHERE email = ?', [email]);
  if (existing) throw new Error("Bu email allaqachon ro'yxatdan o'tgan");
  const hash = await bcrypt.hash(password, 10);
  await db.run(
    'INSERT INTO admin_users (name, email, password_hash, role, status) VALUES (?, ?, ?, ?, ?)',
    [name, email, hash, role, status]
  );
};

const verify = async (token) => {
  const row = await db.get('SELECT * FROM sessions WHERE token = ?', [token]);
  if (!row) return false;
  if (Date.now() > new Date(row.expires_at).getTime()) {
    await db.run('DELETE FROM sessions WHERE token = ?', [token]);
    return false;
  }
  return { role: row.role, userId: row.user_id, email: row.email, name: row.name };
};

// Profil tahrirlangandan so'ng joriy sessiyadagi ismni yangilaydi —
// qayta login qilmasdan turib created_name kabi joylarda yangi ism ko'rinsin
const updateTokenName = async (token, name) => {
  await db.run('UPDATE sessions SET name = ? WHERE token = ?', [name, token]);
};

const logout = async (token) => { await db.run('DELETE FROM sessions WHERE token = ?', [token]); };

const requireAuth = async (req, res, next) => {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    const data = token ? await verify(token) : false;
    if (!data) return res.status(401).json({ success: false, error: 'Avtorizatsiya talab qilinadi' });
    req.user = data;
    req.token = token;
    next();
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

const requireSuperAdmin = (req, res, next) => {
  if (req.user && (req.user.role === 'superadmin' || req.user.role === 'it_bolimi')) return next();
  res.status(403).json({ success: false, error: "Bu amalni faqat IT bo'limi yoki superadmin bajarishi mumkin" });
};

module.exports = {
  login, loginByEmail, registerUser, verify, updateTokenName, logout, requireAuth, requireSuperAdmin,
  createResetCode, verifyResetCode, clearResetCode
};
