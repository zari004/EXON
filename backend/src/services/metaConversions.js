// Meta (Facebook) Conversions API — brauzerdagi Pixel bilan bir qatorda
// server tomonidan ham xuddi shu "Lead" hodisasini yuboradi (masalan
// brauzerda ad-blocker yoki cookie cheklovlari bo'lganda ham hodisa
// Meta'ga yetib boradi). Token maxfiy — repo'da emas, faqat Render'ning
// environment o'zgaruvchisida (META_CONVERSIONS_TOKEN) saqlanadi.
const crypto = require('crypto');

const PIXEL_ID = '1554557782253530'; // brauzer kodida ham ochiq ko'rinadi — maxfiy emas
const API_VERSION = 'v19.0';

const sha256 = (value) => crypto.createHash('sha256').update(String(value).trim().toLowerCase()).digest('hex');

async function sendLeadEvent({ email, eventId, req }) {
  const token = process.env.META_CONVERSIONS_TOKEN;
  if (!token) return; // sozlanmagan bo'lsa — jimgina o'tkazib yuboriladi

  const ip = (req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').split(',')[0].trim();
  const payload = {
    data: [{
      event_name: 'Lead',
      event_time: Math.floor(Date.now() / 1000),
      event_id: eventId,
      action_source: 'website',
      event_source_url: req.headers['referer'] || 'https://exon-marketing.uz/audit.html',
      user_data: {
        em: [sha256(email)],
        client_ip_address: ip || undefined,
        client_user_agent: req.headers['user-agent'] || undefined
      }
    }]
  };

  const res = await fetch(`https://graph.facebook.com/${API_VERSION}/${PIXEL_ID}/events?access_token=${encodeURIComponent(token)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Meta Conversions API xato: ${res.status} ${text}`);
  }
}

module.exports = { sendLeadEvent };
