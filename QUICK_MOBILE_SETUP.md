# 📱 Quick Mobile Setup

## 🚀 3 Steps to Connect Your Phone

### Step 1: Setup
```bash
npm run setup
```

### Step 2: Start Servers
```bash
npm run dev
```

### Step 3: Connect Phone
1. Install **Expo Go** app
2. Same **WiFi** as PC
3. **Scan QR code** in terminal

---

## 🔧 Troubleshooting

### Can't Connect?
```bash
# Re-run setup (IP might have changed)
npm run setup
npm run dev
```

### Firewall Blocking?
- Windows: Allow Node.js through firewall
- Settings → Security → Firewall → Allow an app

### Still Not Working?
- Check phone and PC on **same WiFi**
- Try manual URL: `exp://YOUR_IP:8081`
- Check backend: `http://YOUR_IP:3000/health`

---

## 📋 Quick Commands

```bash
npm run setup       # Configure network
npm run dev         # Start both servers
npm run backend     # Backend only
npm run frontend    # Frontend only
npm run install:all # Install dependencies
```

---

## 📱 Connection Methods

### Method 1: QR Code (Easiest)
- Run `npm run dev`
- Open Expo Go
- Scan QR code

### Method 2: Manual URL
- Run `npm run setup` (see IP)
- Open Expo Go
- Enter URL manually: `exp://YOUR_IP:8081`

---

## ✅ Checklist

- [ ] Phone on same WiFi as PC
- [ ] Expo Go installed
- [ ] Ran `npm run setup`
- [ ] Ran `npm run dev`
- [ ] Backend shows: `Network: http://YOUR_IP:3000`
- [ ] Scanned QR code or entered URL

---

**That's it! Your phone should now connect to Plantea! 🎉**
