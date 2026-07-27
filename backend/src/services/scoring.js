/**
 * EXON 24-Ball Scoring System
 *
 * Step 1 (Audit): Q1, Q2, Q3 — 9 ball
 * Step 2 (Packaging): Q4, Q5, Q6 — 9 ball
 * Step 3 (Analytics): Q7, Q8, Q9 — 6 ball
 * TOTAL: 24 ball
 *
 * Segments:
 * A: 12-24 ball → Quick Growth (15 min response)
 * B: 7-11 ball → Developing (4 hour response)
 * C: 0-6 ball → Foundation (Call + nurture)
 */

const calculateScore = (answers) => {
  let total = 0;
  let errors = [];

  // Validate all answers exist
  const requiredQuestions = ['q1', 'q2', 'q3', 'q4', 'q5', 'q6', 'q7', 'q8', 'q9'];
  for (const q of requiredQuestions) {
    if (answers[q] === undefined || answers[q] === null) {
      errors.push(`Missing answer for ${q}`);
    } else {
      const value = parseInt(answers[q], 10);
      if (isNaN(value) || value < 0 || value > 3) {
        errors.push(`Invalid value for ${q}: must be 0-3`);
      } else {
        total += value;
      }
    }
  }

  if (errors.length > 0) {
    throw new Error('Scoring validation failed: ' + errors.join(', '));
  }

  return total;
};

const getSegment = (score) => {
  if (score >= 12 && score <= 24) {
    return {
      code: 'A',
      name: 'A — Tezkor O\'sish',
      description: 'Siz o\'sishga tayyorsiz. 15 daqiqada konsultatsiya, javob 1 kunda. Hoziroq yozgan hisobotni bering, keyin marketing plan qilamiz.',
      responseTime: '15 дақиқа',
      icon: '🚀',
      color: '#4CF79C' // green-hi
    };
  } else if (score >= 7 && score <= 11) {
    return {
      code: 'B',
      name: 'B — Rivojlanish Seziladi',
      description: 'Do\'koningiz rivojlanmoqda, ammo samaradorlik yo\'q. Audit hisoboti 3 kunda, keyin maktab qilamiz. 4 soat ichida aloqaga chiqamiz.',
      responseTime: '4 soat',
      icon: '📈',
      color: '#0BD16C' // green
    };
  } else {
    return {
      code: 'C',
      name: 'C — Asosdan Tuzing',
      description: 'Boshdan-ocha xizmat kerak. Audit + SEO + reklama — kompleks paket. Aloqa orqali (Telegram) tushuntirish qilamiz, audioni yuboring.',
      responseTime: 'Telefon qo\'ng\'iroq',
      icon: '🔧',
      color: '#98A29D' // gray
    };
  }
};

const formatAuditResult = (score, email) => {
  const segment = getSegment(score);

  return {
    score: score,
    email: email,
    segment: segment.code,
    segmentName: segment.name,
    description: segment.description,
    responseTime: segment.responseTime,
    icon: segment.icon,
    message: `
✅ AUDIT NATIJALARI

${segment.icon} Segment: ${segment.name}
🎯 Skor: ${score}/24 ball

${segment.description}

📧 Email: ${email}
⏰ Hisobot: 3 ish kunida yuboriladi
    `
  };
};

module.exports = {
  calculateScore,
  getSegment,
  formatAuditResult
};
