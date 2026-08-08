import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Platform } from 'react-native';
import { CommonActions } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { COLORS, FONTS, RADII, SHADOWS } from '../theme';

export default function ProfileScreen({ navigation }) {
  const { user, logout } = useAuth();

  const getInitials = () => {
    if (!user?.full_name) return 'U';
    const names = user.full_name.split(' ');
    if (names.length >= 2) {
      return names[0].charAt(0).toUpperCase() + names[1].charAt(0).toUpperCase();
    }
    return names[0].charAt(0).toUpperCase();
  };

  const doLogout = async () => {
    try {
      await logout();
    } finally {
      // Reset to Auth stack and show Login so it visibly changes for web testing.
      navigation.dispatch(
        CommonActions.reset({
          index: 0,
          routes: [
            {
              name: 'Auth',
              state: {
                index: 0,
                routes: [{ name: 'RoleSelection' }],
              },
            },
          ],
        })
      );
    }
  };

  const handleLogout = () => {
    // RN-web Alert is frequently blocked/inconsistent. For web MVP testing, logout immediately.
    if (Platform.OS === 'web') {
      doLogout();
      return;
    }

    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Logout', style: 'destructive', onPress: doLogout },
    ]);
  };

  const menuItems = [
    { label: 'My Orders', icon: '📦', screen: 'OrderTracking', roles: ['buyer'] },
    { label: 'Saved Plants', icon: '♡', screen: 'Wishlist', roles: ['buyer'] },
    { label: 'Notifications', icon: '🔔', screen: 'Notifications', roles: ['buyer'] },
    { label: 'My Listings', icon: '🌱', screen: 'SellerDashboard', roles: ['seller'] },
    { label: 'My Deliveries', icon: '🏍️', screen: 'RiderDashboard', roles: ['rider'] },
    { label: 'Help & Support', icon: '❓', action: 'help', roles: ['buyer', 'seller', 'rider'] },
  ];

  const getFilteredMenuItems = () => {
    return menuItems.filter(item => item.roles.includes(user?.role));
  };

  const handleMenuPress = (item) => {
    if (item.action === 'help') {
      Alert.alert('Help & Support', 'For support, contact us at:\n\nEmail: support@plantea.pk\nPhone: +92 300 1234567');
    } else if (item.screen) {
      navigation.navigate(item.screen);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{getInitials()}</Text>
        </View>
        <Text style={styles.name}>{user?.full_name || 'User'}</Text>
        <Text style={styles.email}>{user?.email || ''}</Text>
        {user?.phone && <Text style={styles.phone}>{user.phone}</Text>}
        {user?.city && (
          <View style={styles.cityChip}>
            <Text style={styles.cityChipText}>{user.city}</Text>
          </View>
        )}
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.divider} />

        {getFilteredMenuItems().map((item, index) => (
          <TouchableOpacity
            key={index}
            style={styles.menuItem}
            onPress={() => handleMenuPress(item)}
            activeOpacity={0.7}
          >
            <View style={styles.menuLeft}>
              <Text style={styles.menuIcon}>{item.icon}</Text>
              <Text style={styles.menuLabel}>{item.label}</Text>
            </View>
            <Text style={styles.menuChevron}>›</Text>
          </TouchableOpacity>
        ))}

        <TouchableOpacity
          style={[styles.menuItem, styles.logoutItem]}
          onPress={handleLogout}
          activeOpacity={0.7}
        >
          <View style={styles.menuLeft}>
            <Text style={styles.menuIcon}>🚪</Text>
            <Text style={[styles.menuLabel, styles.logoutText]}>Logout</Text>
          </View>
          <Text style={styles.menuChevron}>›</Text>
        </TouchableOpacity>

        <Text style={styles.version}>v1.0.0</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  header: {
    backgroundColor: COLORS.p800,
    padding: 20,
    paddingTop: 60,
    paddingBottom: 28,
    alignItems: 'center',
  },
  avatar: {
    width: 80,
    height: 80,
    backgroundColor: COLORS.p700,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: 'rgba(255, 255, 255, 0.18)',
    marginBottom: 12,
  },
  avatarText: {
    fontFamily: FONTS.soraExtraBold,
    fontSize: 28,
    color: COLORS.white,
  },
  name: {
    fontFamily: FONTS.soraExtraBold,
    fontSize: 20,
    color: COLORS.white,
  },
  email: {
    fontFamily: FONTS.nunito,
    fontSize: 14,
    color: COLORS.p300,
    marginTop: 4,
  },
  phone: {
    fontFamily: FONTS.nunito,
    fontSize: 14,
    color: COLORS.p300,
    marginTop: 2,
  },
  cityChip: {
    backgroundColor: COLORS.p700,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: RADII.chip,
    marginTop: 10,
  },
  cityChipText: {
    fontFamily: FONTS.nunitoBold,
    fontSize: 12,
    color: COLORS.white,
  },
  content: {
    flex: 1,
  },
  divider: {
    height: 8,
    backgroundColor: COLORS.bg,
  },
  menuItem: {
    backgroundColor: COLORS.white,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.p100,
  },
  menuLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  menuLabel: {
    fontFamily: FONTS.nunitoBold,
    fontSize: 15,
    color: COLORS.t1,
  },
  menuChevron: {
    fontSize: 24,
    color: COLORS.t4,
  },
  logoutItem: {
    marginTop: 20,
  },
  logoutText: {
    color: COLORS.red,
  },
  version: {
    fontFamily: FONTS.nunito,
    fontSize: 12,
    color: COLORS.t4,
    textAlign: 'center',
    marginTop: 32,
    marginBottom: 20,
  },
});
