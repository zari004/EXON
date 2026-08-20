const express = require('express');
const router = express.Router();
const db = require('../db');
const scoring = require('../services/scoring');
const telegram = require('../services/telegram');
const metaConversions = require('../services/metaConversions');

/**
 * POST /api/audit
 *
 * Request body:
 * {
 *   email: "user@example.com",
 *   q1: 3, q2: 2, q3: 1,
 *   q4: 3, q5: 2, q6: 1,
 *   q7: 3, q8: 2, q9: 1
 * }
 *
 * Response:
 * {
 *   success: true,
 *   score: 18,
 *   segment: "A",
 *   segmentName: "A — Tezkor O'sish",
 *   message: "..."
 * }
 */
router.post('/', async (req, res) => {
  try {
    const { email, q1, q2, q3, q4, q5, q6, q7, q8, q9, metaEventId } = req.body;

    // Validate email
    if (!email || !email.includes('@')) {
      return res.status(400).json({
        success: false,
        error: 'Valid email address required'
      });
    }

    // Prepare answers object
    const answers = { q1, q2, q3, q4, q5, q6, q7, q8, q9 };

    // Calculate score
    const score = scoring.calculateScore(answers);
    const result = scoring.formatAuditResult(score, email);

    // Save to database
    await db.run(
      `INSERT INTO leads (email, score, segment, q1, q2, q3, q4, q5, q6, q7, q8, q9)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [email, score, result.segment, q1, q2, q3, q4, q5, q6, q7, q8, q9]
    );

    // Send Telegram notification (async, don't wait)
    telegram.sendAuditResult(result, email).catch(err => {
      console.error('⚠️ Telegram notification failed:', err.message);
    });

    // Meta Conversions API — "Lead" hodisasi (async, javobni kutmaydi)
    metaConversions.sendLeadEvent({ email, eventId: metaEventId, req }).catch(err => {
      console.error('⚠️ Meta Conversions API xato:', err.message);
    });

    // Return result to client
    res.json({
      success: true,
      score: result.score,
      segment: result.segment,
      segmentName: result.segmentName,
      description: result.description,
      responseTime: result.responseTime,
      icon: result.icon,
      message: 'Audit saved. Report will be sent to your email within 3 business days.'
    });

    console.log(`✅ Audit saved: ${email} → Segment ${result.segment} (${score} ball)`);

  } catch (error) {
    console.error('❌ Audit error:', error.message);
    res.status(400).json({
      success: false,
      error: error.message || 'Failed to process audit'
    });
  }
});

/**
 * GET /api/audit/results/:email
 * Retrieve audit results by email (optional, for follow-up)
 */
router.get('/results/:email', async (req, res) => {
  try {
    const email = req.params.email;

    if (!email || !email.includes('@')) {
      return res.status(400).json({
        success: false,
        error: 'Valid email address required'
      });
    }

    const lead = await db.get(
      'SELECT * FROM leads WHERE email = ? ORDER BY created_at DESC LIMIT 1',
      [email]
    );

    if (!lead) {
      return res.status(404).json({
        success: false,
        error: 'No audit found for this email'
      });
    }

    res.json({
      success: true,
      email: lead.email,
      score: lead.score,
      segment: lead.segment,
      createdAt: lead.created_at
    });

  } catch (error) {
    console.error('❌ Fetch error:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch audit results'
    });
  }
});

/**
 * GET /api/audit/stats
 * Get aggregate statistics (admin only)
 */
router.get('/stats', async (req, res) => {
  try {
    const total = await db.get('SELECT COUNT(*) as count FROM leads');
    const bySegment = await db.all(
      'SELECT segment, COUNT(*) as count FROM leads GROUP BY segment'
    );
    const avgScore = await db.get('SELECT AVG(score) as avg FROM leads');

    res.json({
      success: true,
      total: total.count,
      averageScore: Math.round(avgScore.avg),
      bySegment: bySegment.reduce((acc, row) => {
        acc[row.segment] = row.count;
        return acc;
      }, {})
    });

  } catch (error) {
    console.error('❌ Stats error:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch statistics'
    });
  }
});

module.exports = router;
