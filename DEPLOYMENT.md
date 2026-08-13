# 🚀 Plantea Deployment Guide

Complete guide to deploy Plantea to production.

## Prerequisites

- Node.js 18+ host (any VPS, Railway, Render, Heroku, Docker)
- No external database or accounts required — the app is fully self-contained

## Backend Deployment

### 1. Deploy the app as one Node.js process

Plantea's backend serves **both the API and the built web frontend** on a single port, so a deployment is just one process:

```bash
# 1. Build the web frontend (do this on a build machine)
cd plantea-frontend
npm install
npx expo export --platform web   # outputs to plantea-frontend/dist

# 2. Deploy the whole repo to your host
cd ..
git add plantea-frontend/dist
git commit -m "build: bundle web frontend"
git push
```

### 2. Set environment variables on the host

```env
NODE_ENV=production
PORT=3000
JWT_SECRET=your-super-secure-random-string
PLANTNET_API_KEY=your-plantnet-key   # optional
SMTP_HOST=                           # optional, for real reset emails
SMTP_USER=                           # optional
SMTP_PASS=                           # optional
```

### 3. Start the server

```bash
cd plantea-backend
npm install
node server.js
```

On first start the SQLite database (`data/plantea.db`) and demo seeds are created automatically.

### 4. Verify Deployment

Visit: `https://your-host/health`

Should return:
```json
{
  "success": true,
  "data": {
    "status": "OK",
    "service": "Plantea Backend API",
    "database": "SQLite (self-contained, free)",
    "uptime_seconds": 123,
    "environment": "production"
  }
}
```

The app itself is available at the root: `https://your-host/` — it talks to `/api/*` on the same origin, so no CORS configuration is needed.

## Frontend Deployment (Native)

### 1. Update API URL for a remote backend

Edit `plantea-frontend/.env`:
```env
EXPO_PUBLIC_API_BASE_URL=https://your-host/api
```

### 2. Build Native Apps

```bash
cd plantea-frontend
npm install

# Android APK
npx expo run:android      # or: expo build:android

# iOS IPA (requires Apple Developer account)
npx expo run:ios          # or: expo build:ios
```

## Testing Checklist

### Backend API Tests
- [ ] Health check: `GET /health`
- [ ] User registration: `POST /api/auth/register`
- [ ] User login: `POST /api/auth/login`
- [ ] Browse plants: `GET /api/plants`
- [ ] Plant scanner: `POST /api/scanner/identify`
- [ ] Image upload: `POST /api/uploads`

### Frontend App Tests
- [ ] App loads without crashes
- [ ] User can register/login
- [ ] Plants list loads from API
- [ ] Camera scanner works
- [ ] Order flow completes

## Production Monitoring

- **Server logs**: structured INFO/WARN/ERROR logging (see `src/utils/logger.js`)
- **Error rate**: surfaced live on `/health` as `total_errors_this_session`
- **Response time**: every response includes an `X-Response-Time` header
- **Database**: SQLite file — back it up by copying `data/plantea.db`

## Scaling Considerations

- **Storage**: SQLite is perfect for single-node deployments. If you outgrow it, swap `src/config/db.js` for PostgreSQL.
- **Images**: uploaded images are stored in `uploads/` — back up or use an S3-compatible bucket for large deployments.
- **AI**: the built-in analyzer needs no quota. Add a PlantNet API key for higher accuracy (free 500/day).

## Security Checklist

- [ ] Strong JWT secret (32+ characters)
- [ ] Environment variables secured
- [ ] HTTPS enforced in production
- [ ] Rate limiting enabled (300 req/15min by default)
- [ ] Input validation implemented
- [ ] SQL injection prevention (parameterized queries)
- [ ] Password hashing with bcrypt (12 rounds)

## Troubleshooting

### Common Issues

**Backend won't start:**
- Check environment variables
- Verify port 3000 is free
- Check server logs

**Frontend can't connect:**
- If you used a separate backend host, verify `EXPO_PUBLIC_API_BASE_URL`
- For the single-origin deployment, make sure `plantea-frontend/dist` exists (run `expo export --platform web`)

**Scanner not working:**
- Works out of the box via the built-in analyzer
- For better accuracy add `PLANTNET_API_KEY`
- Check image format (base64 PNG/JPEG)

**Database errors:**
- Delete `data/plantea.db` to reset to fresh demo seeds (the app recreates it on start)

## Support

For deployment issues:
1. Review application logs
2. Test API endpoints with Postman
3. Contact team for assistance

---

**Made with 🌱 in Pakistan**
