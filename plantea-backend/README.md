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

The backend is **100% self-contained and free**: it uses SQLite (via better-sqlite3) stored in a local file, so there is **no Supabase account, no cloud database, and no external service** required to run it. It can also serve the production web build of the frontend on the same origin.

**Health Check:** `http://localhost:3000/health`

---

## Architecture

```
React Native / Web App (Frontend)
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
               │ SQLite file
               ▼
┌──────────────────────────────┐
│  SQLite (better-sqlite3)     │  ← Data Layer (free, self-contained)
│  7 Tables | 3NF Normalized   │
└──────────────────────────────┘
               │ HTTP (optional)
               ▼
┌──────────────────────────────┐
│  PlantNet API (optional)     │  ← AI Plant Identification
└──────────────────────────────┘
```

---

## Tech Stack

| Layer | Technology | Cost |
|-------|-----------|------|
| Mobile/Web Frontend | React Native (Expo) | Free |
| Backend API | Node.js + Express | Free |
| Database | SQLite (better-sqlite3) | Free |
| Image Uploads | Self-hosted (`/uploads/*`) | Free |
| AI Scanner | Built-in analyzer (+ optional PlantNet) | Free |
| **Total** | | **Rs. 0 / month** |

---

## Prerequisites

- Node.js v18 or higher
- npm v9 or higher
- Nothing else — no external accounts required

---

## Local Setup Instructions

### 1. Install dependencies
```bash
cd plantea-backend
npm install
```

### 2. Configure environment variables
```bash
cp .env.example .env
```
The defaults are fine for local development. Optional values (leave blank to use built-in fallbacks):
```
PORT=3000
JWT_SECRET=any_long_random_string_here
PLANTNET_API_KEY=            # optional: real AI identification
SMTP_HOST=                   # optional: real reset emails
SMTP_USER=                   # optional: real reset emails
SMTP_PASS=                   # optional: real reset emails
DEFAULT_DELIVERY_FEE=0       # free delivery platform
COMMISSION_PERCENT=0         # 100% free marketplace
NODE_ENV=development
```

### 3. Start the server
```bash
npm run dev
```

The SQLite database (`data/plantea.db`) and demo seed data are created automatically on first start.

### 4. Verify it works
Open browser:
```
http://localhost:3000/health
```
Should return `"status": "OK"`

### Demo Accounts (all password `Test1234`)
| Role   | Email             |
|--------|-------------------|
| Buyer  | shehroz@test.com  |
| Seller | zainab@test.com   |
| Rider  | bilal@test.com    |

---

## Serving the Frontend (single origin)

Build the Expo web bundle once, then the backend serves the app + API together:

```bash
cd ../plantea-frontend
npx expo export --platform web

cd ../plantea-backend
node server.js
```

Open `http://localhost:3000` — the app loads and talks to `/api/*` on the same origin (no CORS, no proxy). To rebuild after frontend changes, re-run the `expo export` step and restart the server.

---

## API Endpoints

### Authentication
| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| POST | `/api/auth/register` | Public | Register new user |
| POST | `/api/auth/login` | Public | Login, get JWT token |
| GET | `/api/auth/me` | Protected | Get JWT payload |
| GET | `/api/users/profile` | Protected | Get full profile |
| PATCH | `/api/users/profile` | Protected | Update profile |
| POST | `/api/auth/forgot-password` | Public | Send reset OTP |
| POST | `/api/auth/verify-otp` | Public | Verify OTP, get reset token |
| POST | `/api/auth/reset-password` | Public | Set new password |

### Plants
| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| GET | `/api/plants` | Public | Browse marketplace (filters: search, category, city, seller) |
| GET | `/api/plants/:id` | Public | View plant detail |
| GET | `/api/plants/my/listings` | Protected | My listings |
| POST | `/api/plants` | Seller | Create listing |
| PATCH | `/api/plants/:id` | Seller | Update listing |
| DELETE | `/api/plants/:id` | Seller | Remove listing |

### Orders
| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| POST | `/api/orders` | Buyer | Place order |
| GET | `/api/orders` | Protected | My orders (role-filtered) |
| PATCH | `/api/orders/:id/status` | Seller/Rider | Update status |
| PATCH | `/api/orders/:id/assign-rider` | Rider | Accept delivery |

**Order status flow:**
```
pending → confirmed (seller)
confirmed → picked_up (rider)
picked_up → in_transit (rider)
in_transit → delivered (rider)
pending or confirmed → cancelled (buyer or seller)
```

### Wishlist / Notifications / Payments
| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| GET/POST/DELETE | `/api/wishlist` | Buyer | Saved plants |
| GET | `/api/notifications` | Protected | My notifications |
| PATCH | `/api/notifications/read-all` | Protected | Mark all read |
| GET | `/api/payments/methods` | Public | Available methods (COD, EasyPaisa) |

### AI Scanner
| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| POST | `/api/scanner/identify` | Protected | Identify plant from image |

### Uploads
| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| POST | `/api/uploads` | Protected | Upload image (base64) → `/uploads/<file>` |
| GET | `/uploads/*` | Public | Serve uploaded images |

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
  "image_base64": "base64_string_here"
}
```

**Image Upload:**
```json
{
  "image_base64": "base64_string_here"
}
```

---

## Database Schema (7 Tables)

| Table | Purpose |
|-------|---------|
| `users` | All buyers, sellers, riders |
| `plants` | Plant listings with AI health score |
| `orders` | Order lifecycle (commission always 0) |
| `reviews` | Buyer feedback |
| `scan_logs` | AI scanner audit trail |
| `wishlists` | Buyer saved plants |
| `notifications` | In-app alerts |

Source of truth: `src/config/db.js` (creates the SQLite schema + seed data automatically).

---

## Quality Metrics

| Metric | Target | Where Measured |
|--------|--------|----------------|
| Response Time | < 2s | `X-Response-Time` header on every response |
| Error Rate | < 1% | `/health` endpoint → `total_errors_this_session` |
| AI Scanner Speed | < 5s | 10s timeout in scanner.service.js |
| Uptime | 99% | uptime_seconds on `/health` |

---

## Folder Structure

```
plantea-backend/
├── server.js                         ← App entry point (API + optional static frontend)
├── .env.example                      ← Environment variable template
├── .gitignore                        ← Excludes node_modules, .env, uploads, data
├── package.json
├── data/
│   └── plantea.db                    ← SQLite database (auto-created)
├── uploads/                          ← Self-hosted plant images (auto-created)
└── src/
    ├── config/
    │   └── db.js                     ← SQLite schema + seeds (source of truth)
    ├── middleware/
    │   ├── auth.middleware.js        ← JWT verify + role guard
    │   ├── error.middleware.js       ← Global error handler + error count metric
    │   └── responseTime.middleware.js ← Response time metric header
    ├── utils/
    │   ├── ApiResponse.js            ← Standardized response format
    │   └── logger.js                 ← Structured logging (INFO/WARN/ERROR)
    └── modules/
        ├── auth/                     ← Register, login, OTP reset, JWT
        ├── users/                    ← Profile management
        ├── plants/                   ← Listing CRUD
        ├── orders/                   ← Order lifecycle + rider assignment
        ├── scanner/                  ← Built-in plant analyzer + optional PlantNet
        ├── wishlist/                 ← Buyer saved plants
        ├── notifications/            ← In-app alerts
        ├── payment/                  ← Payment methods
        └── uploads/                  ← Self-hosted image uploads
```

---

## Git Workflow

```
main        ← stable
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
| Register failing | 500 Internal Server Error | Rewrote auth to SQLite with `password_hash` column |
| Plants search broken | `ILIKE` not supported | Switched to `LOWER(...) LIKE LOWER(?)` |
| Plants list empty | Supabase `.eq(0)` filter | Removed stock filter, list returns in-stock plants |
| Scanner returned fake results | Hardcoded "Monstera Deliciosa" | Rebuilt with real pixel analysis + local knowledge base |
| Image uploads broke | Supabase Storage removed | Self-hosted base64 uploads to `/uploads/*` |
