// Bir martalik migratsiya: bazada (base64, matn sifatida) saqlangan barcha
// eski rasmlarni Supabase Storage'ga ko'chirib, bazadagi ustunni yangi URL
// bilan almashtiradi. Bu skript avtomatik ishga tushmaydi — faqat qo'lda,
// bir marta ishga tushiriladi:
//
//   node backend/scripts/migrate-images-to-storage.js
//
// Render'da ishga tushirish uchun: Render dashboard -> backend servis ->
// Shell -> shu buyruqni yozing (u yerda DATABASE_URL va boshqa env'lar
// allaqachon mavjud).
require('dotenv').config();
process.env.TZ = 'UTC';
const db = require('../src/db');
const storage = require('../src/services/storage');

const TARGETS = [
  { table: 'admin_users', column: 'avatar', idColumn: 'id', folder: 'avatars' },
  { table: 'cases', column: 'image', idColumn: 'id', folder: 'cases' },
  { table: 'posts', column: 'image', idColumn: 'id', folder: 'posts' },
  { table: 'stores', column: 'logo', idColumn: 'id', folder: 'stores' },
  { table: 'attendance_records', column: 'check_in_photo', idColumn: 'id', folder: 'attendance' },
  { table: 'attendance_records', column: 'check_out_photo', idColumn: 'id', folder: 'attendance' }
];

async function migrateColumn({ table, column, idColumn, folder }) {
  const rows = await db.all(
    `SELECT ${idColumn} AS id, ${column} AS val FROM ${table} WHERE ${column} LIKE 'data:image/%'`
  );
  console.log(`\n== ${table}.${column} — ${rows.length} ta eski rasm topildi ==`);
  let ok = 0, fail = 0;
  for (const row of rows) {
    try {
      const url = await storage.uploadIfBase64(row.val, folder);
      await db.run(`UPDATE ${table} SET ${column} = ? WHERE ${idColumn} = ?`, [url, row.id]);
      ok++;
      process.stdout.write('.');
    } catch (err) {
      fail++;
      console.error(`\n  xato (id=${row.id}): ${err.message}`);
    }
  }
  console.log(`\n   -> muvaffaqiyatli: ${ok}, xato: ${fail}`);
  return { ok, fail };
}

(async () => {
  if (!storage.isConfigured()) {
    console.error("XATO: SUPABASE_URL va/yoki SUPABASE_SERVICE_ROLE_KEY o'rnatilmagan. Render Environment'ga qo'shib, qayta urinib ko'ring.");
    process.exit(1);
  }
  console.log("Migratsiya boshlandi...");
  let totalOk = 0, totalFail = 0;
  for (const target of TARGETS) {
    const { ok, fail } = await migrateColumn(target);
    totalOk += ok;
    totalFail += fail;
  }
  console.log(`\nTayyor. Jami ko'chirildi: ${totalOk}, xatolik: ${totalFail}`);
  process.exit(totalFail > 0 ? 1 : 0);
})();
