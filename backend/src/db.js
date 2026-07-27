const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const dbPath = path.join(__dirname, '../data/exon.db');

// Ensure data directory exists
const dataDir = path.dirname(dbPath);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) console.error('Database connection error:', err);
  else console.log('📊 Connected to SQLite database');
});

// Run query with promise
const run = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function(err) {
      if (err) reject(err);
      else resolve({ id: this.lastID, changes: this.changes });
    });
  });
};

// Get single row
const get = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
};

// Get all rows
const all = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows || []);
    });
  });
};

// Initialize database schema
const init = async () => {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      // Leads table
      db.run(`
        CREATE TABLE IF NOT EXISTS leads (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          email TEXT NOT NULL,
          score INTEGER NOT NULL,
          segment TEXT NOT NULL,
          q1 INTEGER,
          q2 INTEGER,
          q3 INTEGER,
          q4 INTEGER,
          q5 INTEGER,
          q6 INTEGER,
          q7 INTEGER,
          q8 INTEGER,
          q9 INTEGER,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          telegram_sent BOOLEAN DEFAULT 0,
          consultation_booked BOOLEAN DEFAULT 0
        )
      `);

      // Keyslar (case studies)
      db.run(`
        CREATE TABLE IF NOT EXISTS cases (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          tag TEXT NOT NULL,
          title TEXT NOT NULL,
          desc TEXT NOT NULL,
          metric1_value TEXT,
          metric1_label TEXT,
          metric2_value TEXT,
          metric2_label TEXT,
          markets TEXT DEFAULT '[]',
          image TEXT,
          sort_order INTEGER DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Blog maqolalari
      db.run(`
        CREATE TABLE IF NOT EXISTS posts (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          tag TEXT NOT NULL,
          title TEXT NOT NULL,
          desc TEXT NOT NULL,
          date_label TEXT,
          read_time TEXT,
          image TEXT,
          sort_order INTEGER DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Narxlar paketlari
      db.run(`
        CREATE TABLE IF NOT EXISTS pricing (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          badge TEXT,
          featured INTEGER DEFAULT 0,
          name TEXT NOT NULL,
          desc TEXT,
          amount TEXT NOT NULL,
          currency TEXT,
          period TEXT,
          features TEXT DEFAULT '[]',
          cta_label TEXT DEFAULT 'Batafsil',
          cta_type TEXT DEFAULT 'secondary',
          sort_order INTEGER DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `, (err) => {
        if (err) reject(err);
        else {
          console.log('✅ Barcha jadvallar tayyor');
          resolve();
        }
      });
    });
  });
};

// Agar jadval bo'sh bo'lsa — saytdagi joriy statik kontent bilan urug'lantirish
const seed = async () => {
  const caseCount = await get('SELECT COUNT(*) as c FROM cases');
  if (caseCount.c === 0) {
    const cases = [
      ['📱 Elektronika', 'Smartfon Aksessuarlari', "Chop etilgan aksessuarlar uchun Uzum'da kartochka optimallashtirish va reklama kampaniyasi.", '+340%', 'Trafik', '+218%', 'Buyurtma', '["uzum"]'],
      ['🏠 Uy Buyumlari', 'Oshxona Janglari', "Vileda, Grohe uchun Wildberries'da brend pozitsiyasi tuzatish va reklama ROI +45%.", '+156%', 'Pozitsiya', '3:1', 'ROI', '["wb"]'],
      ['👶 Bolalar', 'Bolalar Paltolari', "Fanlar paltochasi — 3 ta tilsiz kartochka dan boshlab, professional reklama bilan +420% buyurtma.", '+420%', 'Buyurtma', '2.8x', 'Konversiya', '["uzum","wb"]'],
      ['💄 Kosmetika', 'Organikal Kremlar', "Yosh brend — Yandex Market'da 0 dan 50+ reklama qilingan mahsulot, 8 oyda +$180k oborot.", '$180k', 'Oborot', '8.2%', 'ROAS', '["yandex"]'],
      ['🌿 Brend', 'Mahsulot Brendining Scalelash', "O'z brendi — 3 ta marketpleys, 12 ta SKU, unifikatsiya va pozitsiya tuzatish, aylik +$45k.", '+$45k', 'Oylik', '18%', "Hajm O'shishi", '["uzum","wb","yandex"]'],
      ["🚀 Startup", "Boshdan Boshla — Oy'da $35k", "Yangi do'kon — kartochka, reklama, boshqaruv hammasiga. 6 oyda istiqomiy o'sish va 3 ta tilga.", '$35k', '6-Oy Oborot', '39%', 'Mom Foyda', '["uzum","yandex"]']
    ];
    for (let i = 0; i < cases.length; i++) {
      const [tag, title, desc, m1v, m1l, m2v, m2l, markets] = cases[i];
      await run(
        `INSERT INTO cases (tag,title,desc,metric1_value,metric1_label,metric2_value,metric2_label,markets,sort_order) VALUES (?,?,?,?,?,?,?,?,?)`,
        [tag, title, desc, m1v, m1l, m2v, m2l, markets, i]
      );
    }
    console.log('🌱 Cases jadvali urug\'lantirildi (6 ta keys)');
  }

  const postCount = await get('SELECT COUNT(*) as c FROM posts');
  if (postCount.c === 0) {
    const posts = [
      ['SEO', "Uzum'da Kalit So'zlar — 2025 Qo'llanmasi", "Qidiruvda rost chiqish uchun kalit so'zlarni qanday tanlash, aylantirish va test qilish?", '25 iyul', '5 min'],
      ['REKLAMA', "Wildberries'da Reklama — Budjet Taqsimoti", 'CPA, CPC, ROAS — hamma metrika nima va qanday o\'lchash kerak?', '22 iyul', '8 min'],
      ['KARTOCHKA', "Rasmni Optimallashtirish — Konversiya +40%", 'Professional foto usullari, RGB ranglar, tasvir nisbati — hammasi bir yerda.', '18 iyul', '6 min'],
      ['BIZNES', "3 Marketpleys vs 1 — Qaysi Tanlash?", 'Siz yangi boshlovchi ekanligiz yoki masshtabichgan — har segment uchun roka.', '15 iyul', '7 min'],
      ['ANALITIKA', 'Yandex Market — Analitika Panel Naqib', 'Qaysi raqamlar asosiy va qaysi ularni kuzatish mumkin — har satrda tavsifi.', '12 iyul', '9 min'],
      ['MARKETING', 'Brend Pozisiyasini Qanday Tuzatish?', "Qo'lini va reklama strategiyasini xelsa uyg'unlashtirish — kompleks usul.", '10 iyul', '6 min']
    ];
    for (let i = 0; i < posts.length; i++) {
      const [tag, title, desc, date, read] = posts[i];
      await run(
        `INSERT INTO posts (tag,title,desc,date_label,read_time,sort_order) VALUES (?,?,?,?,?,?)`,
        [tag, title, desc, date, read, i]
      );
    }
    console.log('🌱 Posts jadvali urug\'lantirildi (6 ta maqola)');
  }

  const pricingCount = await get('SELECT COUNT(*) as c FROM pricing');
  if (pricingCount.c === 0) {
    const plans = [
      {
        badge: 'YANGI BOSHLOVCHILAR', featured: 0, name: 'Audit & Rejasi',
        desc: "Bepul audit + tafsil yo'l xaritasi", amount: 'Bepul', currency: '', period: 'Faqat taqdim qilish',
        features: ["12 nuqtali do'kon tahlili", 'Raqamli hisobot PDF', '30 daqiqa konsultatsiya', 'Yana xizmatlarga 10% chegirma'],
        cta_label: 'Bepul Olish', cta_type: 'primary'
      },
      {
        badge: "SOTIB TURGAN SELLER'LAR", featured: 1, name: 'Upakovka Pro',
        desc: 'Kartochka, foto, matn, SEO — hammasini qilmiz', amount: '2,500', currency: '$', period: 'Har 5 ta SKU uchun',
        features: ['Professional foto 360° (10+ bur)', 'Infografika (2 dizayn varyanti)', 'SEO matn (UZ + RU)', '3 marketpleys uchun optimallashtirish', '2 hafta ichida tayyor'],
        cta_label: 'Konsultatsiya', cta_type: 'primary'
      },
      {
        badge: 'BREND & DISTRIBYUTOR', featured: 0, name: 'Reklama + Boshqaruv',
        desc: 'Kunlik kampaniya boshqaruvi, optimizatsiya', amount: '3,000', currency: '$/oy', period: 'Reklama hajmi 30k+ dan',
        features: ["Kalit so'z tahlili va tanlash", 'Kunlik kampaniya optimizatsiyasi', 'AB-testlar va variantlar', 'Haftalik hisobotlar', 'Aniq ROAS + ROI tracking'],
        cta_label: 'Batafsil', cta_type: 'secondary'
      },
      {
        badge: 'ISHLAB CHIQARUVCHI', featured: 0, name: 'Full Scaling',
        desc: 'Kartochka + Reklama + Analitika + Qayta urinish', amount: '6,500', currency: '$/oy', period: 'Dedikatsiya xizmat',
        features: ['Kartochka fotografi va matn', "3 ta til (UZ, RU, EN)", 'Reklama + 24/7 boshqaruv', 'Dedikatsiya akkaunt menedzheri', 'Kunlik KPI tracking', "6 oylik garantiya +2x ROI"],
        cta_label: 'Batafsil', cta_type: 'primary'
      }
    ];
    for (let i = 0; i < plans.length; i++) {
      const p = plans[i];
      await run(
        `INSERT INTO pricing (badge,featured,name,desc,amount,currency,period,features,cta_label,cta_type,sort_order) VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
        [p.badge, p.featured, p.name, p.desc, p.amount, p.currency, p.period, JSON.stringify(p.features), p.cta_label, p.cta_type, i]
      );
    }
    console.log("🌱 Pricing jadvali urug'lantirildi (4 ta paket)");
  }
};

module.exports = {
  db,
  run,
  get,
  all,
  init,
  seed
};
