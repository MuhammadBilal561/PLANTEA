# 🌿 Plantea - Pakistan's Smart Plant Marketplace

A full-stack mobile application connecting plant buyers, sellers, and delivery riders with AI-powered plant identification.

## 🏗️ Architecture

- **Frontend**: React Native (Expo) - Cross-platform mobile app
- **Backend**: Node.js + Express - REST API with modular architecture  
- **Database**: Supabase (PostgreSQL) - Cloud database with real-time features
- **AI Integration**: PlantNet API - Plant identification and health scoring
- **Authentication**: JWT tokens with bcrypt password hashing

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and npm
- Expo CLI (`npm install -g @expo/cli`)
- Supabase account
- PlantNet API key

### Backend Setup
```bash
cd plantea-backend
npm install
cp .env.example .env
# Configure your .env file with Supabase and PlantNet credentials
npm run dev
```

### Frontend Setup  
```bash
cd plantea-frontend
npm install
expo start
```

### Database Setup
1. Create a new Supabase project
2. Run the SQL schema from `plantea-backend/database/schema.sql`
3. Update `.env` with your Supabase URL and keys

## 📱 Features

### For Buyers
- Browse plants with AI verification badges
- Smart search and category filters
- AI plant scanner with health scoring
- Order tracking with real-time updates
- Secure payment options (COD, JazzCash, EasyPaisa)

### For Sellers  
- Easy plant listing with AI verification
- Dashboard with earnings analytics
- Order management system
- Commission-based pricing (10% free, 5% paid tier)

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
- PostgreSQL via Supabase
- 3NF normalized schema
- Row Level Security (RLS)
- Real-time subscriptions

**External APIs**
- PlantNet API for plant identification
- Supabase Auth for user management

## 📊 Database Schema

6 main tables with proper relationships:
- `users` - All roles (buyer/seller/rider)
- `plants` - Plant listings with AI verification
- `orders` - Order lifecycle management
- `subscriptions` - Seller plan management
- `reviews` - Buyer feedback system
- `scan_logs` - AI scanner audit trail

## 🔐 Security Features

- Password hashing with bcrypt (12 salt rounds)
- JWT token authentication
- Role-based access control
- Input validation and sanitization
- Rate limiting (100 requests/15min)
- Security headers with Helmet.js
- SQL injection prevention

## 🚀 Deployment

### Backend (Railway)
```bash
# Connect to Railway
railway login
railway init
railway add
railway deploy
```

### Frontend (Expo)
```bash
# Build for production
expo build:android
expo build:ios
```

## 📈 Quality Metrics

- Response time: < 2 seconds (tracked)
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