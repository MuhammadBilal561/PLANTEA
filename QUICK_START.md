# Plantea Mobile App - Quick Start Guide

## ✅ Project Status
All screens have been successfully rebuilt and are production-ready:
- ✅ 7 Authentication screens (Splash, Role Selection, Login, Register, Forgot Password, OTP, Reset Password)
- ✅ 5 Buyer screens (Home, Plant Detail, Cart, Notifications, Profile)
- ✅ 3 Seller screens (Dashboard, Add Plant Listing, Earnings)
- ✅ 2 Rider screens (Dashboard, Earnings)
- ✅ All dependencies installed
- ✅ Theme system configured
- ✅ Auth context configured
- ✅ API service configured

## 🚀 How to Run

### 1. Start the Backend Server
```bash
cd plantea-backend
npm install
node server.js
```
The backend will run on `http://localhost:3000`

### 2. Start the Frontend App
Open a new terminal:
```bash
cd plantea-frontend
npm install
npx expo start
```

### 3. Run on Device/Simulator
- Press `a` for Android emulator
- Press `i` for iOS simulator
- Scan QR code with Expo Go app on your physical device

## 📱 Test the App

### Test User Accounts
You can register new accounts or use the populate script to create test data:
```bash
cd plantea-backend
node populate-sample-data.js
```

### Test Flow
1. **Splash Screen** → Auto-navigates to Role Selection
2. **Role Selection** → Choose Buyer, Seller, or Rider
3. **Login/Register** → Create account or login
4. **Buyer Flow**:
   - Browse plants on Home screen
   - Search and filter plants
   - View plant details
   - Add to cart
   - View notifications
5. **Seller Flow**:
   - View dashboard with orders
   - Add new plant listings
   - View earnings
6. **Rider Flow**:
   - View available deliveries
   - Accept deliveries
   - Update delivery status
   - View earnings

## 🎨 Design System

### Colors
- Primary Green: `#276044` (p700)
- Orange: `#F07D3A` (org)
- Background: `#F5F7F5` (bg)
- Text: `#111B15` (t1), `#3D5448` (t2), `#7A9487` (t3)

### Fonts
- **Sora**: Headings, buttons, prices
- **Nunito**: Body text, descriptions

### Components
All screens use consistent:
- Border radius: 20px for cards, 14px for buttons
- Shadows: Subtle elevation for cards
- Animations: Smooth transitions and loading states
- Toast notifications: For user feedback

## 🔧 Configuration

### Frontend (.env)
```
EXPO_PUBLIC_API_BASE_URL=http://localhost:3000/api
EXPO_PUBLIC_API_TIMEOUT=10000
```

### Backend (.env)
```
PORT=3000
NODE_ENV=development
SUPABASE_URL=your-supabase-url
SUPABASE_SERVICE_KEY=your-service-key
JWT_SECRET=your-jwt-secret
PLANTNET_API_KEY=your-plantnet-key
```

## 📦 Key Features Implemented

### Authentication
- Email/password login and registration
- Role-based access (Buyer, Seller, Rider)
- JWT token management
- Password reset with OTP
- Persistent login with AsyncStorage

### Buyer Features
- Browse plants with search and filters
- View detailed plant information
- Add plants to cart (AsyncStorage)
- View order notifications
- Profile management

### Seller Features
- Dashboard with order management
- Add plant listings with image upload
- Earnings tracking with charts
- Order status updates

### Rider Features
- View available deliveries
- Accept and manage deliveries
- Update delivery status
- Earnings tracking

## 🐛 Troubleshooting

### Backend won't start
- Check if port 3000 is available
- Verify .env file has all required variables
- Run `npm install` in plantea-backend

### Frontend won't start
- Clear Expo cache: `npx expo start -c`
- Delete node_modules and reinstall: `rm -rf node_modules && npm install`
- Check if backend is running

### API connection issues
- Verify EXPO_PUBLIC_API_BASE_URL in .env
- For physical device, use your computer's IP instead of localhost
- Check firewall settings

### Font loading issues
- Fonts are loaded automatically on app start
- If fonts don't load, check internet connection (fonts download on first use)

## 📚 Documentation
- `SCREENS_COMPLETE.md` - Detailed documentation of all screens
- `AUTH_SCREENS_COMPLETE.md` - Authentication flow documentation
- `SETUP_COMPLETE.md` - Initial setup documentation

## 🎯 Next Steps
The app is production-ready! You can now:
1. Test all features thoroughly
2. Deploy backend to Railway/Heroku
3. Build APK/IPA for distribution
4. Add more features as needed

## 💡 Tips
- Use Expo Go app for quick testing on physical devices
- Use React Native Debugger for debugging
- Check console logs for API responses
- Use Toast notifications to see user feedback
