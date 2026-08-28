// Barcha sahifalar shu global orqali backend manzilini topadi.
window.EXON_API_BASE = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
  ? 'http://localhost:3000'
  : 'https://exon-backend-zgtl.onrender.com';

// Google Sheets webhook — lead formasi ma'lumotlari shu URL orqali
// Google Sheets'ga ham yoziladi. Google Apps Script web app URL'ini
// shu yerga qo'ying. Agar bo'sh qoldirilsa, Google Sheets'ga yuborilmaydi.
window.EXON_SHEETS_URL = 'https://script.google.com/macros/s/AKfycby-Y8vcMkU4zM6dawR6biluQnxCv-gTDi3TqPePhMHVi82fWHiUIws37VzfZKNiXSwbvQ/exec';
