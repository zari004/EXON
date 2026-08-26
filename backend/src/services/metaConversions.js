// Meta (Facebook) Conversions API — brauzerdagi Pixel bilan bir qatorda
// server tomonidan ham xuddi shu "Lead" hodisasini yuboradi (masalan
// brauzerda ad-blocker yoki cookie cheklovlari bo'lganda ham hodisa
// Meta'ga yetib boradi). Har bir Pixel o'zining alohida System User
// token'iga ega (bir-biridan mustaqil ruxsat) — tokenlar maxfiy, repo'da
// emas, faqat Render'ning environment o'zgaruvchilarida saqlanadi.
const crypto = require('crypto');

const API_VERSION = 'v19.0';
const PIXELS = [
  { id: '1554557782253530', tokenEnv: 'META_CONVERSIONS_TOKEN' },
  { id: '4291431417787119', tokenEnv: 'META_CONVERSIONS_TOKEN_2' }
]; // Pixel ID'lar brauzer kodida ham ochiq ko'rinadi — maxfiy emas

const sha256 = (value) => crypto.createHash('sha256').update(String(value).trim().toLowerCase()).digest('hex');
// Meta talabiga ko'ra telefon raqami xeshlanishdan oldin faqat raqamlardan
// (davlat kodi bilan, "+" va bo'shliqlarsiz) iborat bo'lishi kerak
const normalizePhone = (phone) => String(phone).replace(/[^0-9]/g, '');

async function sendLeadEvent({ email, phone, eventId, req }) {
  const ip = (req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').split(',')[0].trim();
  const userData = {
    client_ip_address: ip || undefined,
    client_user_agent: req.headers['user-agent'] || undefined
  };
  if (email) userData.em = [sha256(email)];
  if (phone) userData.ph = [sha256(normalizePhone(phone))];

  const payload = {
    data: [{
      event_name: 'Lead',
      event_time: Math.floor(Date.now() / 1000),
      event_id: eventId,
      action_source: 'website',
      event_source_url: req.headers['referer'] || 'https://exon-marketing.uz/',
      user_data: userData
    }]
  };

  const results = await Promise.allSettled(PIXELS.map(async (px) => {
    const token = process.env[px.tokenEnv];
    if (!token) return; // shu pixel uchun token sozlanmagan — jimgina o'tkazib yuboriladi

    const res = await fetch(`https://graph.facebook.com/${API_VERSION}/${px.id}/events?access_token=${encodeURIComponent(token)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`pixel ${px.id}: ${res.status} ${text}`);
    }
  }));

  const failed = results.filter((r) => r.status === 'rejected');
  if (failed.length) {
    throw new Error(`Meta Conversions API xato — ${failed.map((f) => f.reason.message).join('; ')}`);
  }
}

module.exports = { sendLeadEvent };
