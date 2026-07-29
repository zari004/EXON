# EXON Backend API

Node.js + Express + Supabase (Postgres) backend for EXON marketplace audit and lead scoring system.

## Setup

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Configure environment**
   - Copy `.env.example` to `.env`
   - Set `DATABASE_URL` (Supabase Dashboard → Project Settings → Database → Connection string → URI)
   - Set `ADMIN_PASSWORD` (used to log into `docs/admin.html`)
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

### Admin panel (`docs/admin.html`)
Password-gated content management for the public site:
- `POST /api/admin/login` — exchange `ADMIN_PASSWORD` for a bearer token (12h TTL, in-memory)
- `GET/POST/PUT/DELETE /api/cases` — Keyslar (case studies); GET is public, mutations require the token
- `GET/POST/PUT/DELETE /api/posts` — Blog articles; same auth pattern
- `GET/POST/PUT/DELETE /api/pricing` — Pricing plans; same auth pattern
- `GET /api/admin/stats` — audit leads dashboard (total, by segment, recent submissions)

Images are uploaded as resized base64 JPEG (client-side canvas resize, ~640px max
dimension) and stored directly in the `image` column — no separate file storage,
so it survives redeploys without needing a persistent volume.

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

Supabase Postgres stores four tables: `leads` (audit submissions), `cases`
(Keyslar), `posts` (Blog), `pricing` (Narxlar plans). Connected via the `pg`
package using `DATABASE_URL`. Tables and seed data are created automatically
on server start (`db.init()` + `db.seed()`), idempotent — safe to restart.

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
│   ├── db.js              # Database setup (leads, cases, posts, pricing)
│   ├── routes/
│   │   ├── audit.js       # Audit endpoints
│   │   ├── admin.js       # Login + dashboard stats
│   │   ├── cases.js       # Keyslar CRUD
│   │   ├── posts.js       # Blog CRUD
│   │   └── pricing.js     # Narxlar CRUD
│   └── services/
│       ├── scoring.js     # 24-point scoring logic
│       ├── telegram.js    # Telegram bot integration
│       └── auth.js        # Admin token issue/verify
├── .env                   # Configuration (secrets)
└── package.json
```

## Deployment

**Render.com** (recommended — free tier, no card required):
1. New Web Service → connect GitHub repo `zari004/EXON`
2. Root Directory: `backend`
3. Build Command: `npm install`, Start Command: `npm start`
4. Add environment variables: `DATABASE_URL`, `ADMIN_PASSWORD`, `FRONTEND_URL`,
   `GMAIL_USER`, `GMAIL_APP_PASSWORD`, `NODE_ENV=production`

For password-reset emails, enable 2-Step Verification on the sender Google
account and create a 16-character App Password at
https://myaccount.google.com/apppasswords. Set the Gmail address as
`GMAIL_USER` and the App Password as `GMAIL_APP_PASSWORD`; do not use the
account's normal password.

Database lives on **Supabase** (separate free Postgres), so Render's lack of a
persistent disk on the free tier doesn't matter — no data is stored on the
Render instance itself.

## Next Steps

1. ✅ Set up Telegram bot token
2. ✅ Update frontend to call `/api/audit`
3. ✅ Test end-to-end (form → API → notification)
4. ✅ Add email notifications (SendGrid)
5. ✅ Create admin dashboard for lead management
