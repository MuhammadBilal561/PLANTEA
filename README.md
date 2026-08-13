# 🌿 Plantea - Pakistan's Smart Plant Marketplace

A full-stack mobile application connecting plant buyers, sellers, and delivery riders with AI-powered plant identification.

## 🏗️ Architecture

- **Frontend**: React Native (Expo) - Cross-platform mobile app
- **Backend**: Node.js + Express - REST API with modular architecture
- **Database**: SQLite (better-sqlite3) - Self-contained, free, zero external accounts
- **AI Integration**: Built-in pixel-based plant analyzer + optional PlantNet API key
- **Authentication**: JWT tokens with bcrypt password hashing
- **Uploads**: Self-hosted image storage served from the backend

**100% free to run** - no Supabase, no cloud database, no credit card, no paid tiers. The production web build is served by the backend on a single origin.

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and npm

### Backend Setup
```bash
cd plantea-backend
npm install
cp .env.example .env
npm run dev
```

### Frontend Setup
```bash
cd plantea-frontend
npm install
cp .env.example .env
```

### Run Everything (single origin)
```bash
# 1. Build the web bundle (once)
cd plantea-frontend
npx expo export --platform web

# 2. Start the backend (serves API + the web app on one port)
cd plantea-backend
node server.js
# Open http://localhost:3000
```

For physical devices on the same WiFi, run `node plantea-frontend/scripts/setup-local.js` to point the app at your PC's IP, then start Expo with `npx expo start`.

### Demo Accounts (all password `Test1234`)
| Role   | Email             |
|--------|-------------------|
| Buyer  | shehroz@test.com  |
| Seller | zainab@test.com   |
| Rider  | bilal@test.com    |
| Admin  | admin@plantea.com |

## 📱 Features

### For Buyers
- Browse plants with AI verification badges
- Smart search (full-text, prefix-matched) with category, price and sort filters
- AI plant scanner with health scoring
- Seller profile pages (public, verified, ratings)
- Coupon codes at checkout (percentage/amount, min-order rules)
- My Garden — save plants with nicknames and water reminders
- Order tracking with real-time updates
- Free payment options (COD, EasyPaisa)

### For Sellers
- Easy plant listing with AI verification
- Dashboard with real revenue analytics, top plants and weekly chart
- Order management system
- 100% commission-free selling

### For Riders
- Available orders with route optimization
- Earnings tracking
- Real-time delivery updates

## 🛠️ Tech Stack

**Frontend**
- React Native + Expo
- React Navigation
- AsyncStorage for JWT tokens
- Expo Camera & Image Picker

**Backend**
- Express.js with modular architecture
- JWT authentication with bcrypt
- Input validation with express-validator
- Rate limiting and security headers
- Comprehensive error handling

**Database**
- SQLite via better-sqlite3 (no external service)
- 3NF normalized schema
- Transactional order lifecycle
- Self-hosted image uploads

**External APIs (optional)**
- PlantNet API for plant identification (works without it via built-in analyzer)
- SMTP for password-reset emails (falls back to logged demo codes)

## 📊 Database Schema

Main tables with proper relationships:
- `users` - All roles (buyer/seller/rider)
- `plants` - Plant listings with AI verification
- `orders` - Order lifecycle management
- `reviews` - Buyer feedback system (verified purchases, seller replies)
- `scan_logs` - AI scanner audit trail
- `wishlists` - Buyer saved plants
- `notifications` - In-app alerts

Plus supporting tables for coupons, my-garden, plant FTS search, and analytics.

## 🔐 Security Features

- Password hashing with bcrypt (12 salt rounds)
- JWT token authentication
- Role-based access control
- Input validation and sanitization
- Rate limiting (300 requests/15min)
- Security headers with Helmet.js
- SQL injection prevention

## 🧪 Testing

Backend API tests run with Jest + Supertest against a temp SQLite database:

```bash
cd plantea-backend
npx jest
```

46 tests across 5 suites cover auth, plants (incl. FTS search), orders (state machine,
stock/refund), reviews (delivered-order gating, replies, IDOR), and capabilities
(coupons, garden, analytics, admin, public profiles).

## 🚀 Deployment

The whole product deploys as one Node.js process:

```bash
# Build frontend, then deploy plantea-backend with the dist/ folder included
cd plantea-frontend && npx expo export --platform web
cd ../plantea-backend && node server.js
```

The backend auto-detects `plantea-frontend/dist` and serves it with an SPA fallback, so `/` opens the app and `/api/*` serves the REST API on the same origin.

Run Plantea on your phone for free (same-WiFi, Expo tunnel, or free host +
tunnel): see [SETUP_GUIDE.md](SETUP_GUIDE.md).

The 12 seeded demo plants ship with self-hosted photos served from
`/uploads/` (Wikimedia Commons images, bundled in `plantea-backend/uploads/`).

## 📈 Quality Metrics

- Response time: < 2 seconds (tracked via `X-Response-Time`)
- Error rate: < 1% (monitored)
- AI Scanner: < 5 seconds (10s timeout)
- Uptime: 99% target

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the ISC License.

## 👥 Team

CS 3rd Semester Team - UET Lahore, IDEAL Labs  
Supervised by Dr. Syed Khaldoon Khurshid

---

**Made with 🌱 in Pakistan**
