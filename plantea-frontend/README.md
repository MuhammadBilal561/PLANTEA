# 🌿 Plantea Frontend

React Native mobile app for Pakistan's Smart Plant Marketplace.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Configure environment:
```bash
# Edit .env file
EXPO_PUBLIC_API_BASE_URL=http://localhost:3000/api
```

3. Start development:
```bash
expo start
```

## Features

### For Buyers
- Browse plants with AI verification
- Smart search and filters
- AI plant scanner
- Order tracking
- Secure payments

### For Sellers
- Easy plant listing
- AI verification integration
- Earnings dashboard
- Order management

### For Riders
- Available orders
- Route optimization
- Earnings tracking

## Tech Stack

- React Native + Expo
- React Navigation
- AsyncStorage
- Expo Camera
- Expo Image Picker
- Expo Location

## Screens

### Auth Flow
- SplashScreen
- RoleSelectionScreen  
- LoginScreen

### Buyer Screens
- HomeScreen
- PlantDetailScreen
- AiScannerScreen
- ScanResultScreen
- OrderSummaryScreen
- OrderSuccessScreen
- OrderTrackingScreen
- ProfileScreen

### Seller Screens
- SellerDashboardScreen
- AddPlantListingScreen
- SellerEarningsScreen

### Rider Screens
- RiderDashboardScreen
- RiderEarningsScreen

## API Integration

All screens are connected to the backend API through the `services/api.js` service layer with:
- JWT token management
- Automatic token injection
- Error handling
- Request timeouts

## Build for Production

```bash
# Web (served by the backend on the same origin — see plantea-backend/README.md)
npx expo export --platform web

# Android
expo build:android

# iOS
expo build:ios
```