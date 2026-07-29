// Resend.com HTTPS API orqali email yuboradi.
// SMTP portlari (465/587) ko'p bulutli hostinglarda (shu jumladan Render)
// tarmoq darajasida to'silgan/beqaror bo'lishi mumkin — HTTPS (443) esa
// har doim ochiq bo'ladi, shuning uchun email yuborish uchun API ishlatiladi.

const RESEND_API_KEY = (process.env.RESEND_API_KEY || '').trim();
// Domen tasdiqlanmagan bo'lsa, Resend'ning standart "onboarding@resend.dev"
// manzilidan yuboriladi — bu holatda faqat Resend hisobi ro'yxatdan o'tgan
// emailga yuborish mumkin. To'liq ishlashi uchun domenni Resend'da
// tasdiqlab, RESEND_FROM'ni shu domendagi manzilga o'zgartiring.
const RESEND_FROM = (process.env.RESEND_FROM || 'onboarding@resend.dev').trim();

if (RESEND_API_KEY) {
  console.log('✅ Resend mailer initialized');
} else {
  console.log('⚠️ RESEND_API_KEY sozlanmagan. Email yuborish o\'tkazib yuboriladi.');
}

const isConfigured = () => Boolean(RESEND_API_KEY);

async function sendEmail(toEmail, subject, html) {
  if (!RESEND_API_KEY) {
    const error = new Error('Email xizmati sozlanmagan');
    error.code = 'EMAIL_NOT_CONFIGURED';
    throw error;
  }
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ from: `EXON Admin <${RESEND_FROM}>`, to: [toEmail], subject, html })
  });
  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(`Resend xatosi (${res.status}): ${errText}`);
  }
  return res.json();
}

// Parolni tiklash tasdiqlash kodini yuboradi
const sendResetCode = (toEmail, code) => sendEmail(
  toEmail,
  'EXON Admin — Parolni tiklash kodi',
  `
    <div style="font-family:sans-serif;max-width:420px;margin:0 auto">
      <h2 style="color:#0BD16C">EXON Admin</h2>
      <p>Parolingizni tiklash uchun quyidagi kodni kiriting:</p>
      <div style="font-size:32px;font-weight:700;letter-spacing:6px;background:#f2f5f3;padding:16px 20px;border-radius:10px;text-align:center;margin:16px 0">${code}</div>
      <p style="color:#888;font-size:13px">Bu kod 10 daqiqa davomida amal qiladi. Agar siz bu so'rovni yubormagan bo'lsangiz, xabarni e'tiborsiz qoldiring.</p>
    </div>
  `
);

// Vazifa eslatmasini yuboradi
const sendTaskReminder = (toEmail, taskTitle, dueLabel) => sendEmail(
  toEmail,
  `EXON Admin — Eslatma: "${taskTitle}"`,
  `
    <div style="font-family:sans-serif;max-width:420px;margin:0 auto">
      <h2 style="color:#0BD16C">EXON Admin</h2>
      <p>Sizga tayinlangan vazifa muddati yaqinlashmoqda:</p>
      <div style="background:#f2f5f3;padding:16px 20px;border-radius:10px;margin:16px 0">
        <div style="font-weight:700;font-size:16px;margin-bottom:6px">${taskTitle}</div>
        <div style="color:#666;font-size:13px">${dueLabel}</div>
      </div>
    </div>
  `
);

module.exports = { isConfigured, sendResetCode, sendTaskReminder };
