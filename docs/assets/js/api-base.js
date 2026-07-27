// Barcha sahifalar shu global orqali backend manzilini topadi.
window.EXON_API_BASE = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
  ? 'http://localhost:3000'
  : 'https://exon-backend-zgtl.onrender.com';
