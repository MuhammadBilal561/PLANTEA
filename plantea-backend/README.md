# 🌿 Plantea — Backend API

**Pakistan's Smart Plant Marketplace**
University of Engineering & Technology Lahore | IDEAL Labs
CS 3rd Semester | Dr. Syed Khaldoon Khurshid

**Team Members:**
| Roll No | Name |
|---------|------|
| 2025(S)-CS-26 | M Bilal |
| 2025(S)-CS-02 | M Saddique |
| 2025(S)-CS-48 | M Usman |
| 2025(S)-CS-22 | M Muzammil |
| 2025(S)-CS-54 | Zain Ali |

---

## Overview

Plantea is a three-sided mobile marketplace connecting **Buyers**, **Sellers**, and **Riders** in Pakistan's plant ecosystem. This repository contains the **Node.js REST API backend** that powers the React Native mobile application.

**Live Backend URL:** `https://your-railway-url.up.railway.app`
**Health Check:** `https://your-railway-url.up.railway.app/health`

---

## Architecture

```
React Native App (Frontend)
        │  HTTPS Requests
        ▼
┌──────────────────────────────┐
│    Node.js + Express         │  ← Business Logic Layer (this repo)
│  ┌────────┐ ┌─────────────┐ │
│  │  Auth  │ │   Plants    │ │
│  ├────────┤ ├─────────────┤ │
│  │ Orders │ │   Scanner   │ │
│  └────────┘ └─────────────┘ │
└──────────────┬───────────────┘
               │ Supabase Client
               ▼
┌──────────────────────────────┐
│  Supabase (PostgreSQL)       │  ← Data Layer (Free Tier)
│  6 Tables | 3NF Normalized   │
└──────────────────────────────┘
               │ HTTP
               ▼
┌──────────────────────────────┐
│  PlantNet API                │  ← AI Plant Identification
│  500 free scans/day          │
└──────────────────────────────┘
```

---

## Tech Stack

| Layer | Technology | Cost |
|-------|-----------|------|
| Mobile Frontend | React Native | Free |
| Backend API | Node.js + Express | Free |
| Database | Supabase (PostgreSQL) | Free |
| Backend Hosting | Railway.com | Free |
| AI Scanner | PlantNet API | Free (500/day) |
| **Total** | | **Rs. 0 / month** |

---

## Prerequisites

- Node.js v18 or higher
- npm v9 or higher
- Supabase account (free tier) — supabase.com
- PlantNet API key — my.plantnet.org (free)
- Railway account — railway.app (free)

---

## Local Setup Instructions

### 1. Clone the repository
```bash
git clone https://github.com/zaini789/Plantea-app.git
cd Plantea-app
```

### 2. Install dependencies
```bash
npm install
```

### 3. Configure environment variables
```bash
cp .env.example .env
```
Open `.env` and fill in:
```
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_SERVICE_KEY=your-service-role-key-here
JWT_SECRET=any_long_random_string_here
PLANTNET_API_KEY=your-plantnet-key-here
COMMISSION_FREE_TIER=10
COMMISSION_PAID_TIER=5
DEFAULT_DELIVERY_FEE=150
NODE_ENV=development
```

### 4. Set up the database
1. Go to Supabase dashboard
2. Open SQL Editor → New Query
3. Copy everything from `database/schema.sql`
4. Paste and click Run → should say "Success"
5. Then run this extra line separately:
```sql
ALTER TABLE users ADD COLUMN password_hash TEXT NOT NULL DEFAULT '';
```

### 5. Start the server
```bash
npm run dev
```

### 6. Verify it works
Open browser:
```
http://localhost:3000/health
```
Should return `"status": "OK"` ✅

---

## Railway Deployment (Live Hosting)

### 1. Push latest code to main
```bash
git checkout main
git merge dev
git push origin main
git checkout dev
```

### 2. Deploy on Railway
1. Go to railway.app → Login with GitHub
2. Click New Project → Deploy from GitHub repo
3. Select `zaini789/Plantea-app` → select `main` branch
4. Click Deploy Now → wait 2-3 minutes

### 3. Add environment variables
Railway → your project → Variables tab → Raw Editor:
```
SUPABASE_URL=your_value
SUPABASE_SERVICE_KEY=your_value
JWT_SECRET=your_value
PLANTNET_API_KEY=your_value
COMMISSION_FREE_TIER=10
COMMISSION_PAID_TIER=5
DEFAULT_DELIVERY_FEE=150
NODE_ENV=production
```
Click Update Variables → Railway redeploys automatically.

### 4. Generate your live URL
Railway → Settings → Domains → Generate Domain

### 5. Verify live deployment
```
https://your-railway-url.up.railway.app/health
```

---

## API Endpoints

### Authentication
| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| POST | `/api/auth/register` | Public | Register new user |
| POST | `/api/auth/login` | Public | Login, get JWT token |
| GET | `/api/auth/me` | 🔒 Any | Get my profile |

### Plants
| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| GET | `/api/plants` | Public | Browse marketplace |
| GET | `/api/plants/:id` | Public | View plant detail |
| GET | `/api/plants/my/listings` | 🔒 Seller | My listings |
| POST | `/api/plants` | 🔒 Seller | Create listing |
| PATCH | `/api/plants/:id` | 🔒 Seller | Update listing |
| DELETE | `/api/plants/:id` | 🔒 Seller | Remove listing |

### Orders
| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| POST | `/api/orders` | 🔒 Buyer | Place order |
| GET | `/api/orders` | 🔒 Any | My orders |
| PATCH | `/api/orders/:id/status` | 🔒 Seller/Rider | Update status |
| PATCH | `/api/orders/:id/assign-rider` | 🔒 Rider | Accept delivery |

**Order status flow:**
```
pending → confirmed (seller)
confirmed → picked_up (rider)
picked_up → in_transit (rider)
in_transit → delivered (rider)
pending or confirmed → cancelled (buyer or seller)
```

### AI Scanner
| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| POST | `/api/scanner/identify` | 🔒 Any | Identify plant from image |

### Health Check
| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| GET | `/health` | Public | Server status + quality metrics |

---

## How to Use JWT Token

After login, copy the token and add to every protected request header:
```
Key:   Authorization
Value: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6...
```

---

## Request Body Examples

**Register:**
```json
{
  "full_name": "Shehroz Ahmed",
  "email": "shehroz@test.com",
  "phone": "03001234567",
  "password": "Test1234",
  "role": "buyer",
  "city": "Lahore"
}
```

**Create Plant (seller only):**
```json
{
  "name": "Peace Lily",
  "scientific_name": "Spathiphyllum wallisii",
  "description": "Low maintenance indoor plant.",
  "price_pkr": 850,
  "stock_quantity": 5,
  "category": "Indoor",
  "city": "Lahore"
}
```

**Place Order (buyer only):**
```json
{
  "plant_id": "uuid-here",
  "quantity": 1,
  "delivery_address": "House 5, Gulberg III, Lahore",
  "payment_method": "COD"
}
```

**AI Scanner:**
```json
{
  "image_base64": "base64_string_here",
  "plant_id": "optional_uuid"
}
```
To get base64: go to base64.guru/converter/encode/image → upload plant photo → copy result.

---

## Database Schema (6 Tables)

| Table | Purpose |
|-------|---------|
| `users` | All buyers, sellers, riders |
| `plants` | Plant listings |
| `orders` | Order lifecycle + commission |
| `subscriptions` | Seller plans (free/starter) |
| `reviews` | Buyer reviews |
| `scan_logs` | AI scanner history |

Full schema: `database/schema.sql`

---

## Quality Metrics

| Metric | Target | Where Measured |
|--------|--------|----------------|
| Response Time | < 2s | `X-Response-Time` header on every response |
| Error Rate | < 1% | `/health` endpoint → `total_errors_this_session` |
| AI Scanner Speed | < 5s | 10s timeout in scanner.service.js |
| Uptime | 99% | Railway + Supabase dashboard |

---

## Folder Structure

```
Plantea-app/
├── server.js                         ← App entry point
├── Procfile                          ← Railway deployment config
├── .env.example                      ← Environment variable template
├── .gitignore                        ← Excludes node_modules + .env
├── package.json
├── database/
│   └── schema.sql                    ← All 6 tables + seed data
└── src/
    ├── config/
    │   └── supabase.js               ← Shared DB client (singleton)
    ├── middleware/
    │   ├── auth.middleware.js        ← JWT verify + role guard
    │   ├── error.middleware.js       ← Global error handler + error count metric
    │   └── responseTime.middleware.js ← Response time metric header
    ├── utils/
    │   ├── ApiResponse.js            ← Standardized response format
    │   └── logger.js                 ← Structured logging (INFO/WARN/ERROR)
    └── modules/
        ├── auth/                     ← Register, login, JWT
        ├── plants/                   ← Listing CRUD
        ├── orders/                   ← Order lifecycle + commission
        └── scanner/                  ← PlantNet AI integration
```

---

## Git Workflow

```
main        ← stable, deployed to Railway
  └── dev   ← team integration branch
        ├── bilal
        ├── saddique
        ├── usman
        ├── muzammil
        └── zain
```

**Rules:**
- Never push directly to main
- Push to your name branch first
- Merge: your-branch → dev → main

---

## Bugs Fixed During Development

| Bug | Error | Fix |
|-----|-------|-----|
| Register failing | 500 Internal Server Error | Added `password_hash` column to users table in Supabase |
| Plants list empty | Returns 0 results | Fixed stock filter `.eq(0)` → `.gt(0)` in plants.service.js |
| Scanner rejected | 403 Forbidden | Added required `organs: leaf` field to PlantNet request |
| Scanner rejected | 401 Unauthorized | Removed duplicate API key from URL, kept only in params |