const express = require('express');
const router = express.Router();
const db = require('../db');
const telegram = require('../services/telegram');
const metaConversions = require('../services/metaConversions');

/**
 * POST /api/contact
 * Bosh sahifadagi lid formasi — ism, biznes turi, telefon raqam
 */
router.post('/', async (req, res) => {
  try {
    const { name, businessType, phone, metaEventId } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, error: 'Ism majburiy' });
    }
    if (!businessType || !businessType.trim()) {
      return res.status(400).json({ success: false, error: "Biznes turi majburiy" });
    }
    if (['olib sotar', 'distribyutor'].includes(businessType.trim().toLowerCase())) {
      return res.status(422).json({
        success: false,
        error: 'Afsuski, hozircha olib sotuvchilar va distribyutorlar bilan ishlay olmaymiz.'
      });
    }
    if (!phone || phone.replace(/[^0-9]/g, '').length < 9) {
      return res.status(400).json({ success: false, error: "To'g'ri telefon raqam kiriting" });
    }

    const savedLead = await db.get(
      `INSERT INTO contact_leads (name, business_type, phone)
       VALUES (?, ?, ?)
       RETURNING id, name, business_type, phone, created_at`,
      [name.trim(), businessType.trim(), phone.trim()]
    );

    telegram.sendContactLead({ name: name.trim(), businessType: businessType.trim(), phone: phone.trim() }).catch(err => {
      console.error('⚠️ Telegram notification failed:', err.message);
    });

    metaConversions.sendLeadEvent({ phone: phone.trim(), eventId: metaEventId, req }).catch(err => {
      console.error('⚠️ Meta Conversions API xato:', err.message);
    });

    res.json({ success: true, lead: savedLead });
    console.log(`✅ Contact lead saved: ${name.trim()} (${phone.trim()})`);

  } catch (error) {
    console.error('❌ Contact lead error:', error.message);
    res.status(500).json({ success: false, error: 'Failed to save lead' });
  }
});

module.exports = router;
