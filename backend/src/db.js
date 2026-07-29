const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

pool.on('connect', () => console.log('📊 Connected to Supabase Postgres'));
pool.on('error', (err) => console.error('Database pool error:', err.message));

// "?" placeholderlarni Postgres'ning "$1,$2..." formatiga aylantiradi
const toPgSql = (sql) => {
  let i = 0;
  return sql.replace(/\?/g, () => `$${++i}`);
};

// INSERT so'rovlariga avtomatik "RETURNING id" qo'shadi — sqlite'ning
// this.lastID o'rniga, chaqiruvchi kod o'zgarishsiz qoladi.
const run = async (sql, params = []) => {
  let query = toPgSql(sql);
  if (/^\s*insert/i.test(query) && !/returning/i.test(query)) {
    query += ' RETURNING id';
  }
  const result = await pool.query(query, params);
  return { id: result.rows[0] ? result.rows[0].id : null, changes: result.rowCount };
};

const get = async (sql, params = []) => {
  const result = await pool.query(toPgSql(sql), params);
  return result.rows[0];
};

const all = async (sql, params = []) => {
  const result = await pool.query(toPgSql(sql), params);
  return result.rows || [];
};

// Jadval sxemasi — "desc" PostgreSQL'da band so'z bo'lgani uchun
// "description" nomi ishlatiladi (API javoblarida hamon "desc" sifatida chiqadi).
const init = async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS leads (
      id SERIAL PRIMARY KEY,
      email TEXT NOT NULL,
      score INTEGER NOT NULL,
      segment TEXT NOT NULL,
      q1 INTEGER, q2 INTEGER, q3 INTEGER,
      q4 INTEGER, q5 INTEGER, q6 INTEGER,
      q7 INTEGER, q8 INTEGER, q9 INTEGER,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW(),
      telegram_sent INTEGER DEFAULT 0,
      consultation_booked INTEGER DEFAULT 0
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS cases (
      id SERIAL PRIMARY KEY,
      tag TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      metric1_value TEXT,
      metric1_label TEXT,
      metric2_value TEXT,
      metric2_label TEXT,
      markets TEXT DEFAULT '[]',
      image TEXT,
      sort_order INTEGER DEFAULT 0,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS posts (
      id SERIAL PRIMARY KEY,
      tag TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      date_label TEXT,
      read_time TEXT,
      image TEXT,
      sort_order INTEGER DEFAULT 0,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS pricing (
      id SERIAL PRIMARY KEY,
      badge TEXT,
      featured INTEGER DEFAULT 0,
      name TEXT NOT NULL,
      description TEXT,
      amount TEXT NOT NULL,
      currency TEXT,
      period TEXT,
      features TEXT DEFAULT '[]',
      cta_label TEXT DEFAULT 'Batafsil',
      cta_type TEXT DEFAULT 'secondary',
      sort_order INTEGER DEFAULT 0,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS admin_users (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'menejer_oddiy',
      status TEXT NOT NULL DEFAULT 'pending',
      avatar TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);
  // Eski jadvallarga avatar ustunini qo'shish (agar hali yo'q bo'lsa)
  await pool.query(`ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS avatar TEXT`);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS site_settings (
      key TEXT PRIMARY KEY,
      value TEXT,
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS role_permissions (
      role TEXT PRIMARY KEY,
      tabs TEXT NOT NULL DEFAULT '["dashboard"]'
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS tasks (
      id SERIAL PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT,
      priority TEXT NOT NULL DEFAULT 'medium',
      status TEXT NOT NULL DEFAULT 'new',
      due_date DATE,
      due_time TEXT,
      reminder_minutes INTEGER,
      reminder_sent BOOLEAN DEFAULT false,
      repeat_rule TEXT DEFAULT 'none',
      assigned_to INTEGER,
      assigned_name TEXT,
      created_by INTEGER,
      created_name TEXT,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `);
  // Eski jadvalga yangi ustunlarni qo'shish (vaqt, eslatma, takrorlash, davomiylik)
  await pool.query(`ALTER TABLE tasks ADD COLUMN IF NOT EXISTS start_date DATE`);
  await pool.query(`ALTER TABLE tasks ADD COLUMN IF NOT EXISTS due_time TEXT`);
  await pool.query(`ALTER TABLE tasks ADD COLUMN IF NOT EXISTS reminder_minutes INTEGER`);
  await pool.query(`ALTER TABLE tasks ADD COLUMN IF NOT EXISTS reminder_sent BOOLEAN DEFAULT false`);
  await pool.query(`ALTER TABLE tasks ADD COLUMN IF NOT EXISTS repeat_rule TEXT DEFAULT 'none'`);

  // Standart ruxsatlar — mavjud bo'lsa o'zgartirmaydi
  await pool.query(`
    INSERT INTO role_permissions (role, tabs) VALUES
      ('seo',             '["dashboard","posts","tasks"]'),
      ('menejer_bosh',    '["dashboard","cases","posts","pricing","tasks"]'),
      ('menejer_oddiy',   '["dashboard","cases","tasks"]'),
      ('dizayner_bosh',   '["dashboard","cases","posts","tasks"]'),
      ('dizayner_oddiy',  '["cases","tasks"]')
    ON CONFLICT (role) DO NOTHING
  `);

  console.log('✅ Barcha jadvallar tayyor');
};

// Agar jadval bo'sh bo'lsa — saytdagi joriy statik kontent bilan urug'lantirish
const seed = async () => {
  const caseCount = await get('SELECT COUNT(*) as c FROM cases');
  if (Number(caseCount.c) === 0) {
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
        `INSERT INTO cases (tag,title,description,metric1_value,metric1_label,metric2_value,metric2_label,markets,sort_order) VALUES (?,?,?,?,?,?,?,?,?)`,
        [tag, title, desc, m1v, m1l, m2v, m2l, markets, i]
      );
    }
    console.log('🌱 Cases jadvali urug\'lantirildi (6 ta keys)');
  }

  const postCount = await get('SELECT COUNT(*) as c FROM posts');
  if (Number(postCount.c) === 0) {
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
        `INSERT INTO posts (tag,title,description,date_label,read_time,sort_order) VALUES (?,?,?,?,?,?)`,
        [tag, title, desc, date, read, i]
      );
    }
    console.log('🌱 Posts jadvali urug\'lantirildi (6 ta maqola)');
  }

  const pricingCount = await get('SELECT COUNT(*) as c FROM pricing');
  if (Number(pricingCount.c) === 0) {
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
        `INSERT INTO pricing (badge,featured,name,description,amount,currency,period,features,cta_label,cta_type,sort_order) VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
        [p.badge, p.featured, p.name, p.desc, p.amount, p.currency, p.period, JSON.stringify(p.features), p.cta_label, p.cta_type, i]
      );
    }
    console.log("🌱 Pricing jadvali urug'lantirildi (4 ta paket)");
  }
};

module.exports = {
  pool,
  run,
  get,
  all,
  init,
  seed
};
