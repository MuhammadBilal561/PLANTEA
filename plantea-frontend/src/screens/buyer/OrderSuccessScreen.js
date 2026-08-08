import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { COLORS, FONTS, RADII } from '../../theme';

export default function OrderSuccessScreen({ navigation, route }) {
  const order = route.params?.order;
  const plant = route.params?.plant;
  const orderId = order?.id ? `#PLT-${order.id.slice(0, 8).toUpperCase()}` : '#PLT-??????';
  const plantName = plant?.name || order?.plant?.name || 'Your Plant';

  return (
    <View style={styles.container}>
      <View style={styles.checkCircle}>
        <Text style={styles.checkIcon}>✓</Text>
      </View>

      <Text style={styles.title}>Order Placed! 🎉</Text>
      <Text style={styles.subtitle}>
        {plantName} is confirmed.{'\n'}A rider will be assigned shortly.
      </Text>

      <View style={styles.orderIdBox}>
        <Text style={styles.orderIdLabel}>Order ID</Text>
        <Text style={styles.orderIdText}>{orderId}</Text>
      </View>

      <View style={styles.infoRow}>
        <Text style={styles.deliveryLabel}>Estimated Delivery</Text>
        <Text style={styles.deliveryTime}>35 – 60 min</Text>
      </View>

      <TouchableOpacity
        style={styles.trackBtn}
        onPress={() => navigation.navigate('OrderTracking')}
      >
        <Text style={styles.trackBtnText}>📍 Track My Order</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.continueBtn}
        onPress={() => navigation.navigate('BuyerTabs')}
      >
        <Text style={styles.continueBtnText}>Continue Shopping 🌿</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  checkCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: COLORS.p700,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 28,
    shadowColor: COLORS.p700,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 10,
  },
  checkIcon: { fontSize: 48, color: COLORS.white },
  title: {
    fontFamily: FONTS.soraExtraBold,
    fontSize: 26,
    color: COLORS.t1,
    marginBottom: 10,
  },
  subtitle: {
    fontFamily: FONTS.nunito,
    fontSize: 14,
    color: COLORS.t3,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 28,
  },
  orderIdBox: {
    backgroundColor: COLORS.white,
    borderRadius: RADII.card,
    paddingHorizontal: 24,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 20,
    width: '100%',
    borderWidth: 1.5,
    borderColor: COLORS.p200,
  },
  orderIdLabel: {
    fontFamily: FONTS.nunito,
    fontSize: 11,
    color: COLORS.t4,
    marginBottom: 4,
  },
  orderIdText: {
    fontFamily: FONTS.soraBold,
    color: COLORS.p700,
    fontSize: 16,
    letterSpacing: 1,
  },
  infoRow: {
    alignItems: 'center',
    marginBottom: 36,
  },
  deliveryLabel: {
    fontFamily: FONTS.nunito,
    fontSize: 12,
    color: COLORS.t3,
    marginBottom: 4,
  },
  deliveryTime: {
    fontFamily: FONTS.soraExtraBold,
    fontSize: 24,
    color: COLORS.p700,
  },
  trackBtn: {
    backgroundColor: COLORS.p700,
    width: '100%',
    padding: 16,
    borderRadius: RADII.btn,
    alignItems: 'center',
    marginBottom: 12,
  },
  trackBtnText: {
    fontFamily: FONTS.soraBold,
    color: COLORS.white,
    fontSize: 15,
  },
  continueBtn: {
    width: '100%',
    padding: 16,
    borderRadius: RADII.btn,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.p200,
  },
  continueBtnText: {
    fontFamily: FONTS.soraBold,
    color: COLORS.p700,
    fontSize: 15,
  },
});