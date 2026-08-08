# 🚀 Plantea Deployment Guide

Complete guide to deploy Plantea to production.

## Prerequisites

- Supabase account (free tier)
- PlantNet API account (free tier)
- Railway account (free tier)
- Expo account (free tier)

## Backend Deployment (Railway)

### 1. Database Setup (Supabase)

1. Create new project at [supabase.com](https://supabase.com)
2. Go to SQL Editor → New Query
3. Copy and paste `plantea-backend/database/schema.sql`
4. Click "Run" to create all tables
5. Go to Settings → API to get your keys

### 2. Get PlantNet API Key

1. Register at [my-api.plantnet.org](https://my-api.plantnet.org)
2. Create new API key (500 free requests/day)
3. Copy the API key

### 3. Deploy to Railway

1. Push code to GitHub
2. Connect Railway to your GitHub repo
3. Deploy from `main` branch
4. Add environment variables in Railway dashboard:

```env
NODE_ENV=production
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-key
JWT_SECRET=your-super-secure-random-string
PLANTNET_API_KEY=your-plantnet-key
COMMISSION_FREE_TIER=10.00
COMMISSION_PAID_TIER=5.00
DEFAULT_DELIVERY_FEE=150.00
```

5. Railway will auto-deploy and provide a URL

### 4. Verify Deployment

Visit: `https://your-app.railway.app/health`

Should return:
```json
{
  "status": "OK",
  "timestamp": "2026-04-01T12:00:00.000Z",
  "uptime": 123.45,
  "environment": "production"
}
```

## Frontend Deployment (Expo)

### 1. Update API URL

Edit `plantea-frontend/.env`:
```env
EXPO_PUBLIC_API_BASE_URL=https://your-app.railway.app/api
```

### 2. Build and Publish

```bash
cd plantea-frontend
npm install
expo login
expo publish
```

### 3. Build Native Apps

```bash
# Android APK
expo build:android

# iOS IPA (requires Apple Developer account)
expo build:ios
```

## Testing Checklist

### Backend API Tests
- [ ] Health check: `GET /health`
- [ ] User registration: `POST /api/auth/register`
- [ ] User login: `POST /api/auth/login`
- [ ] Browse plants: `GET /api/plants`
- [ ] Plant scanner: `POST /api/scanner/identify`

### Frontend App Tests
- [ ] App loads without crashes
- [ ] User can register/login
- [ ] Plants list loads from API
- [ ] Camera scanner works
- [ ] Order flow completes

## Production Monitoring

### Railway Dashboard
- Monitor CPU/Memory usage
- Check deployment logs
- Set up alerts for downtime

### Supabase Dashboard
- Monitor database performance
- Check API usage limits
- Review query performance

### PlantNet API
- Monitor daily usage (500 limit)
- Check identification accuracy
- Plan upgrade if needed

## Scaling Considerations

### Free Tier Limits
- Railway: 500 hours/month
- Supabase: 500MB database, 2GB bandwidth
- PlantNet: 500 requests/day

### Upgrade Path
- Railway Pro: $5/month (unlimited hours)
- Supabase Pro: $25/month (8GB database)
- PlantNet Premium: €9/month (10,000 requests/day)

## Security Checklist

- [ ] Strong JWT secret (32+ characters)
- [ ] Environment variables secured
- [ ] HTTPS enforced in production
- [ ] Rate limiting enabled
- [ ] Input validation implemented
- [ ] SQL injection prevention
- [ ] Password hashing with bcrypt

## Troubleshooting

### Common Issues

**Backend won't start:**
- Check environment variables
- Verify Supabase connection
- Check Railway logs

**Frontend can't connect:**
- Verify API URL in .env
- Check CORS settings
- Test API endpoints manually

**Scanner not working:**
- Verify PlantNet API key
- Check image format (base64)
- Monitor API usage limits

**Database errors:**
- Check Supabase connection
- Verify table schema
- Review query syntax

## Support

For deployment issues:
1. Check Railway/Supabase status pages
2. Review application logs
3. Test API endpoints with Postman
4. Contact team for assistance

---

**Made with 🌱 in Pakistan**