const nodemailer = require('nodemailer');

let transporter = null;

if (process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD) {
  transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD
    }
  });
  console.log('✅ Gmail mailer initialized');
} else {
  console.log('⚠️ GMAIL_USER / GMAIL_APP_PASSWORD sozlanmagan. Email yuborish o\'tkazib yuboriladi.');
}

// Parolni tiklash tasdiqlash kodini yuboradi
const sendResetCode = async (toEmail, code) => {
  if (!transporter) {
    console.log(`⚠️ Mailer sozlanmagan. ${toEmail} uchun kod: ${code} (faqat konsolda)`);
    return;
  }
  await transporter.sendMail({
    from: `"EXON Admin" <${process.env.GMAIL_USER}>`,
    to: toEmail,
    subject: 'EXON Admin — Parolni tiklash kodi',
    html: `
      <div style="font-family:sans-serif;max-width:420px;margin:0 auto">
        <h2 style="color:#0BD16C">EXON Admin</h2>
        <p>Parolingizni tiklash uchun quyidagi kodni kiriting:</p>
        <div style="font-size:32px;font-weight:700;letter-spacing:6px;background:#f2f5f3;padding:16px 20px;border-radius:10px;text-align:center;margin:16px 0">${code}</div>
        <p style="color:#888;font-size:13px">Bu kod 10 daqiqa davomida amal qiladi. Agar siz bu so'rovni yubormagan bo'lsangiz, xabarni e'tiborsiz qoldiring.</p>
      </div>
    `
  });
};

module.exports = { sendResetCode };
