let bot = null;

// Initialize bot if token is provided
if (process.env.TELEGRAM_BOT_TOKEN) {
  try {
    const TelegramBot = require('node-telegram-bot-api');
    bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN);
    console.log('✅ Telegram bot initialized');
  } catch (err) {
    console.log('⚠️ Telegram bot error:', err.message);
    bot = null;
  }
} else {
  console.log('⚠️ TELEGRAM_BOT_TOKEN not set. Telegram notifications will be skipped.');
}

/**
 * Send audit result to Telegram
 * @param {Object} result - Scoring result from scoring service
 * @param {String} email - User email
 */
const sendAuditResult = async (result, email) => {
  if (!bot) {
    console.log('⚠️ Telegram bot not initialized. Skipping notification for:', email);
    return;
  }

  try {
    const adminId = process.env.TELEGRAM_ADMIN_ID;
    if (!adminId) {
      console.log('⚠️ TELEGRAM_ADMIN_ID not set. Cannot send notification.');
      return;
    }

    const message = `
${result.icon} *AUDIT NATIJALARI*

🎯 *Segment:* ${result.segmentName}
📊 *Skor:* ${result.score}/24 ball
📧 *Email:* \`${email}\`

${result.description}

⏰ *Javob vaqti:* ${result.responseTime}

---
Vaqt: ${new Date().toLocaleString('uz-UZ')}
    `;

    await bot.sendMessage(adminId, message, { parse_mode: 'Markdown' });
    console.log(`📱 Telegram notification sent for ${email} (Segment ${result.segment})`);

  } catch (error) {
    console.error('❌ Telegram error:', error.message);
    // Don't throw - this shouldn't break the API response
  }
};

/**
 * Send consultation reminder to user (optional)
 * @param {String} chatId - User's Telegram chat ID (if they joined the bot)
 * @param {String} segmentName - Segment name
 */
const sendConsultationReminder = async (chatId, segmentName) => {
  if (!bot) return;

  try {
    const message = `
🔔 *Consultation Reminder*

You are in segment: *${segmentName}*

Click the button below to book your consultation:

[Book Now](https://calendar.google.com/calendar)
    `;

    await bot.sendMessage(chatId, message, {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [
            { text: '📅 Book Consultation', url: 'https://calendar.google.com/calendar' },
            { text: '❓ Questions', callback_data: 'help' }
          ]
        ]
      }
    });

  } catch (error) {
    console.error('❌ Telegram reminder error:', error.message);
  }
};

module.exports = {
  bot,
  sendAuditResult,
  sendConsultationReminder
};
