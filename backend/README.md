# EXON Backend API

Node.js + Express + SQLite backend for EXON marketplace audit and lead scoring system.

## Setup

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Configure environment**
   - Copy `.env.example` to `.env`
   - Set `TELEGRAM_BOT_TOKEN` (get from @BotFather on Telegram)
   - Set `TELEGRAM_ADMIN_ID` (your Telegram user ID)

3. **Start server**
   ```bash
   npm start
   # Server runs on http://localhost:3000
   ```

## API Endpoints

### POST `/api/audit`
Submit audit form and get scoring result.

**Request:**
```json
{
  "email": "user@example.com",
  "q1": 3, "q2": 2, "q3": 1,
  "q4": 3, "q5": 2, "q6": 1,
  "q7": 3, "q8": 2, "q9": 1
}
```

**Response:**
```json
{
  "success": true,
  "score": 18,
  "segment": "A",
  "segmentName": "A — Tezkor O'sish",
  "description": "Siz o'sishga tayyorsiz...",
  "responseTime": "15 дақиқа"
}
```

### GET `/api/audit/results/:email`
Retrieve previous audit by email.

### GET `/api/audit/stats`
Get aggregate statistics (total leads, by segment, average score).

## Scoring System

**24 Points Total**
- Step 1 (Audit): Q1, Q2, Q3 = 9 points max
- Step 2 (Packaging): Q4, Q5, Q6 = 9 points max
- Step 3 (Analytics): Q7, Q8, Q9 = 6 points max

**Segments**
| Segment | Score | Response | Action |
|---------|-------|----------|--------|
| A | 12-24 | 15 min | Quick growth strategy |
| B | 7-11 | 4 hours | Development plan |
| C | 0-6 | Call | Foundation package |

## Database

SQLite database stores:
- Lead email and score
- Individual question answers (q1-q9)
- Timestamp and segment assignment
- Telegram notification status
- Consultation booking status

Located at: `./data/exon.db`

## Telegram Integration

Audit results are automatically sent to your Telegram admin chat:
- Segment and score
- Recommended action
- Follow-up timeframe

Requires:
1. Telegram Bot Token from @BotFather
2. Your Telegram user ID (Chat ID)

## Frontend Integration

Update `exon-site/audit.html` to POST to this API:

```javascript
const response = await fetch('http://localhost:3000/api/audit', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: form.email.value,
    q1: parseInt(form.q1.value),
    // ... etc
  })
});
const result = await response.json();
```

## Directory Structure

```
backend/
├── src/
│   ├── index.js           # Main server
│   ├── db.js              # Database setup
│   ├── routes/
│   │   └── audit.js       # Audit endpoints
│   └── services/
│       ├── scoring.js     # 24-point scoring logic
│       └── telegram.js    # Telegram bot integration
├── data/
│   └── exon.db            # SQLite database
├── .env                   # Configuration (secrets)
└── package.json
```

## Deployment

### Heroku
```bash
git push heroku main
```

### Railway.app
Connect GitHub repo and deploy

### AWS / DigitalOcean
Use any Node.js hosting with environment variables set.

## Next Steps

1. ✅ Set up Telegram bot token
2. ✅ Update frontend to call `/api/audit`
3. ✅ Test end-to-end (form → API → notification)
4. ✅ Add email notifications (SendGrid)
5. ✅ Create admin dashboard for lead management
