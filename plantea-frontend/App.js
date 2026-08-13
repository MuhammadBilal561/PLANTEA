import React from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useFonts, Sora_400Regular, Sora_700Bold, Sora_800ExtraBold } from '@expo-google-fonts/sora';
import { Nunito_400Regular, Nunito_700Bold, Nunito_800ExtraBold } from '@expo-google-fonts/nunito';
import Toast from 'react-native-toast-message';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { COLORS } from './src/theme';
import { Icon } from './src/components/ui';
import ErrorBoundary from './ErrorBoundary';

import SplashScreen from './src/screens/SplashScreen';
import RoleSelectionScreen from './src/screens/RoleSelectionScreen';
import LoginScreen from './src/screens/auth/LoginScreen';
import RegisterScreen from './src/screens/auth/RegisterScreen';
import ForgotPasswordScreen from './src/screens/auth/ForgotPasswordScreen';
import OtpVerifyScreen from './src/screens/auth/OtpVerifyScreen';
import ResetPasswordScreen from './src/screens/auth/ResetPasswordScreen';

import HomeScreen from './src/screens/buyer/HomeScreen';
import SearchScreen from './src/screens/buyer/SearchScreen';
import AiScannerScreen from './src/screens/buyer/AiScannerScreen';
import OrderTrackingScreen from './src/screens/buyer/OrderTrackingScreen';
import PlantDetailScreen from './src/screens/buyer/PlantDetailScreen';
import CartScreen from './src/screens/buyer/CartScreen';
import NotificationsScreen from './src/screens/buyer/NotificationsScreen';
import WishlistScreen from './src/screens/buyer/WishlistScreen';
import OrderSummaryScreen from './src/screens/buyer/OrderSummaryScreen';
import OrderSuccessScreen from './src/screens/buyer/OrderSuccessScreen';
import ScanResultScreen from './src/screens/buyer/ScanResultScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import SellerProfileScreen from './src/screens/buyer/SellerProfileScreen';

import SellerDashboardScreen from './src/screens/seller/SellerDashboardScreen';
import AddPlantListingScreen from './src/screens/seller/AddPlantListingScreen';
import SellerEarningsScreen from './src/screens/seller/SellerEarningsScreen';

import RiderDashboardScreen from './src/screens/rider/RiderDashboardScreen';
import RiderEarningsScreen from './src/screens/rider/RiderEarningsScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const AuthStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="Splash" component={SplashScreen} />
    <Stack.Screen name="RoleSelection" component={RoleSelectionScreen} />
    <Stack.Screen name="Login" component={LoginScreen} />
    <Stack.Screen name="Register" component={RegisterScreen} />
    <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
    <Stack.Screen name="OtpVerify" component={OtpVerifyScreen} />
    <Stack.Screen name="ResetPassword" component={ResetPasswordScreen} />
  </Stack.Navigator>
);

const BuyerStack = createNativeStackNavigator();

const BuyerStackNavigator = () => (
  <BuyerStack.Navigator screenOptions={{ headerShown: false }}>
    <BuyerStack.Screen name="BuyerTabs" component={BuyerTabs} />
    <BuyerStack.Screen name="PlantDetail" component={PlantDetailScreen} />
    <BuyerStack.Screen name="OrderSummary" component={OrderSummaryScreen} />
    <BuyerStack.Screen name="Checkout" component={OrderSummaryScreen} />
    <BuyerStack.Screen name="OrderSuccess" component={OrderSuccessScreen} />
    <BuyerStack.Screen name="ScanResult" component={ScanResultScreen} />
    <BuyerStack.Screen name="Cart" component={CartScreen} />
    <BuyerStack.Screen name="Notifications" component={NotificationsScreen} />
    <BuyerStack.Screen name="Wishlist" component={WishlistScreen} />
    <BuyerStack.Screen name="SellerProfile" component={SellerProfileScreen} />
  </BuyerStack.Navigator>
);

const BuyerTabs = () => (
  <Tab.Navigator
    screenOptions={{
      headerShown: false,
      tabBarActiveTintColor: COLORS.p700,
      tabBarInactiveTintColor: COLORS.t4,
      tabBarStyle: {
        backgroundColor: COLORS.white,
        borderTopColor: '#EAEFEB',
        borderTopWidth: 1,
        height: 80,
        paddingTop: 10,
        paddingBottom: 10,
      },
      tabBarLabelStyle: {
        fontSize: 10,
        fontWeight: '700',
        marginTop: 3,
      },
    }}
  >
    <Tab.Screen
      name="Home"
      component={HomeScreen}
      options={{
        tabBarLabel: 'Home',
        tabBarIcon: ({ color }) => <Icon name="home" size={22} color={color} />,
      }}
    />
    <Tab.Screen
      name="Search"
      component={SearchScreen}
      options={{
        tabBarLabel: 'Search',
        tabBarIcon: ({ color }) => <Icon name="search" size={22} color={color} />,
      }}
    />
    <Tab.Screen
      name="AiScanner"
      component={AiScannerScreen}
      options={{
        tabBarLabel: 'Scanner',
        tabBarIcon: ({ color }) => <Icon name="camera" size={22} color={color} />,
      }}
    />
    <Tab.Screen
      name="OrderTracking"
      component={OrderTrackingScreen}
      options={{
        tabBarLabel: 'Orders',
        tabBarIcon: ({ color }) => <Icon name="package" size={22} color={color} />,
      }}
    />
    <Tab.Screen
      name="Profile"
      component={ProfileScreen}
      options={{
        tabBarLabel: 'Profile',
        tabBarIcon: ({ color }) => <Icon name="user" size={22} color={color} />,
      }}
    />
  </Tab.Navigator>
);

const SellerTabs = () => (
  <Tab.Navigator
    screenOptions={{
      headerShown: false,
      tabBarActiveTintColor: COLORS.p700,
      tabBarInactiveTintColor: COLORS.t4,
      tabBarStyle: {
        backgroundColor: COLORS.white,
        borderTopColor: '#EAEFEB',
        borderTopWidth: 1,
        height: 80,
        paddingTop: 10,
        paddingBottom: 10,
      },
      tabBarLabelStyle: {
        fontSize: 10,
        fontWeight: '700',
        marginTop: 3,
      },
    }}
  >
    <Tab.Screen
      name="SellerDashboard"
      component={SellerDashboardScreen}
      options={{
        tabBarLabel: 'Dashboard',
        tabBarIcon: ({ color }) => <Icon name="home" size={22} color={color} />,
      }}
    />
    <Tab.Screen
      name="AddPlantListing"
      component={AddPlantListingScreen}
      options={{
        tabBarLabel: 'Add Plant',
        tabBarIcon: ({ color }) => <Icon name="plus-circle" size={22} color={color} />,
      }}
    />
    <Tab.Screen
      name="SellerEarnings"
      component={SellerEarningsScreen}
      options={{
        tabBarLabel: 'Earnings',
        tabBarIcon: ({ color }) => <Icon name="trending-up" size={22} color={color} />,
      }}
    />
    <Tab.Screen
      name="Profile"
      component={ProfileScreen}
      options={{
        tabBarLabel: 'Profile',
        tabBarIcon: ({ color }) => <Icon name="user" size={22} color={color} />,
      }}
    />
  </Tab.Navigator>
);

const SellerStack = createNativeStackNavigator();

const SellerStackNavigator = () => (
  <SellerStack.Navigator screenOptions={{ headerShown: false }}>
    <SellerStack.Screen name="SellerTabs" component={SellerTabs} />
    <SellerStack.Screen name="AiScanner" component={AiScannerScreen} />
    <SellerStack.Screen name="ScanResult" component={ScanResultScreen} />
  </SellerStack.Navigator>
);

const RiderTabs = () => (
  <Tab.Navigator
    screenOptions={{
      headerShown: false,
      tabBarActiveTintColor: COLORS.org,
      tabBarInactiveTintColor: COLORS.t4,
      tabBarStyle: {
        backgroundColor: COLORS.white,
        borderTopColor: '#EAEFEB',
        borderTopWidth: 1,
        height: 80,
        paddingTop: 10,
        paddingBottom: 10,
      },
      tabBarLabelStyle: {
        fontSize: 10,
        fontWeight: '700',
        marginTop: 3,
      },
    }}
  >
    <Tab.Screen
      name="RiderDashboard"
      component={RiderDashboardScreen}
      options={{
        tabBarLabel: 'Dashboard',
        tabBarIcon: ({ color }) => <Icon name="home" size={22} color={color} />,
      }}
    />
    <Tab.Screen
      name="RiderEarnings"
      component={RiderEarningsScreen}
      options={{
        tabBarLabel: 'Earnings',
        tabBarIcon: ({ color }) => <Icon name="trending-up" size={22} color={color} />,
      }}
    />
    <Tab.Screen
      name="Profile"
      component={ProfileScreen}
      options={{
        tabBarLabel: 'Profile',
        tabBarIcon: ({ color }) => <Icon name="user" size={22} color={color} />,
      }}
    />
  </Tab.Navigator>
);

const RootNavigator = () => {
  const { isLoading, isAuthenticated, user: effectiveUser } = useAuth();

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.p500} />
      </View>
    );
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {!isAuthenticated ? (
        <Stack.Screen name="Auth" component={AuthStack} />
  ) : effectiveUser?.role === 'buyer' ? (
        <Stack.Screen name="BuyerApp" component={BuyerStackNavigator} />
  ) : effectiveUser?.role === 'seller' ? (
        <Stack.Screen name="SellerApp" component={SellerStackNavigator} />
  ) : effectiveUser?.role === 'rider' ? (
        <Stack.Screen name="RiderApp" component={RiderTabs} />
      ) : (
        <Stack.Screen name="Auth" component={AuthStack} />
      )}
    </Stack.Navigator>
  );
};

// Force rebuild - v2
export default function App() {
  const [fontsLoaded] = useFonts({
    Sora_400Regular,
    Sora_700Bold,
    Sora_800ExtraBold,
    Nunito_400Regular,
    Nunito_700Bold,
    Nunito_800ExtraBold,
  });

  if (!fontsLoaded) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.p500} />
      </View>
    );
  }

  return (
    <ErrorBoundary>
      <AuthProvider>
        <NavigationContainer>
          <RootNavigator />
        </NavigationContainer>
        <Toast />
      </AuthProvider>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: COLORS.p800,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
