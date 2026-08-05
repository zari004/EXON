// Supabase Storage — rasmlarni bazaning o'zida (base64, matn sifatida) emas,
// alohida fayl saqlash joyida (bepul tarifda 1 GB, database'ning 500 MB'idan
// butunlay alohida kvota) saqlash uchun. Shu bilan baza deyarli bo'shab
// qoladi, rasmlar uchun esa 2 baravar ko'proq joy bo'ladi.
const SUPABASE_URL = (process.env.SUPABASE_URL || '').replace(/\/$/, '');
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BUCKET = 'exon-media';

let bucketReady = null; // bir marta tekshirilib, keyingi chaqiruvlarda qayta so'ralmaydi

const isConfigured = () => Boolean(SUPABASE_URL && SERVICE_KEY);

function authHeaders(extra) {
  return Object.assign({ apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` }, extra || {});
}

async function ensureBucket() {
  if (bucketReady) return bucketReady;
  bucketReady = (async () => {
    const check = await fetch(`${SUPABASE_URL}/storage/v1/bucket/${BUCKET}`, { headers: authHeaders() });
    if (check.ok) return true;
    const create = await fetch(`${SUPABASE_URL}/storage/v1/bucket`, {
      method: 'POST',
      headers: authHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ id: BUCKET, name: BUCKET, public: true })
    });
    if (!create.ok && create.status !== 409) {
      const text = await create.text().catch(() => '');
      throw new Error(`Storage bucket yaratib bo'lmadi: ${create.status} ${text}`);
    }
    return true;
  })();
  return bucketReady;
}

// data:image/jpeg;base64,... ko'rinishidagi qatorni Storage'ga yuklaydi.
// Agar kirish qiymati base64 bo'lmasa (masalan allaqachon URL yoki bo'sh),
// o'zgarishsiz qaytariladi — shuning uchun chaqiruvchi kod har doim shu
// funksiyadan o'tkazishi mumkin, faqat kerak bo'lganda amal qiladi.
async function uploadIfBase64(value, folder) {
  if (!value || typeof value !== 'string') return value;
  const match = /^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/.exec(value);
  if (!match) return value; // allaqachon URL yoki boshqa format
  if (!isConfigured()) {
    throw new Error("Rasm saqlash sozlanmagan (SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY yo'q)");
  }
  await ensureBucket();
  const mime = match[1];
  const ext = (mime.split('/')[1] || 'jpg').replace('jpeg', 'jpg').replace(/[^a-z0-9]/gi, '');
  const buffer = Buffer.from(match[2], 'base64');
  const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 9)}.${ext}`;
  const res = await fetch(`${SUPABASE_URL}/storage/v1/object/${BUCKET}/${path}`, {
    method: 'POST',
    headers: authHeaders({ 'Content-Type': mime, 'x-upsert': 'true' }),
    body: buffer
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Storage'ga yuklashda xato: ${res.status} ${text}`);
  }
  return `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${path}`;
}

// Bitta papkadagi (masalan "attendance") barcha fayllar hajmini (bayt) yig'adi
async function folderSizeBytes(folder) {
  if (!isConfigured()) return 0;
  let total = 0;
  let offset = 0;
  const limit = 1000;
  for (;;) {
    const res = await fetch(`${SUPABASE_URL}/storage/v1/object/list/${BUCKET}`, {
      method: 'POST',
      headers: authHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ prefix: `${folder}/`, limit, offset, sortBy: { column: 'name', order: 'asc' } })
    });
    if (!res.ok) return total; // bucket hali yo'q yoki papka bo'sh — 0 qaytariladi
    const items = await res.json();
    if (!Array.isArray(items) || items.length === 0) break;
    for (const item of items) {
      if (item && item.metadata && typeof item.metadata.size === 'number') total += item.metadata.size;
    }
    if (items.length < limit) break;
    offset += limit;
  }
  return total;
}

const FOLDERS = ['avatars', 'cases', 'posts', 'stores', 'attendance'];

async function totalUsageBytes() {
  if (!isConfigured()) return 0;
  const sizes = await Promise.all(FOLDERS.map(folderSizeBytes));
  return sizes.reduce((a, b) => a + b, 0);
}

module.exports = { isConfigured, uploadIfBase64, totalUsageBytes, FOLDERS, BUCKET };
