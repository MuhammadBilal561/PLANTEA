import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { COLORS, FONTS, RADII } from '../../theme';
import Icon from '../../components/ui/Icon';

export default function OrderSuccessScreen({ navigation, route }) {
  const order = route.params?.order;
  const plant = route.params?.plant;
  const orders = route.params?.orders || (order ? [order] : []);
  const orderId = order?.id ? `#PLT-${order.id.slice(0, 8).toUpperCase()}` : '#PLT-??????';
  const plantName = plant?.name || order?.plant?.name || 'Your Plant';

  // Clear the cart after a successful multi-item checkout.
  useEffect(() => {
    if (orders.length > 0) {
      AsyncStorage.removeItem('plantea_cart').catch(() => {});
    }
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.checkCircle}>
        <Icon name="check" size={48} color={COLORS.white} />
      </View>

      <Text style={styles.title}>Order Placed!</Text>
      <Text style={styles.subtitle}>
        {orders.length > 1 ? `${orders.length} orders confirmed.` : `${plantName} is confirmed.`}
        {'\n'}A rider will be assigned shortly.
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
        <Icon name="map-pin" size={16} color={COLORS.white} />
        <Text style={styles.trackBtnText}>Track My Order</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.continueBtn}
        onPress={() => navigation.navigate('BuyerTabs')}
      >
        <Icon name="feather" size={16} color={COLORS.p700} />
        <Text style={styles.continueBtnText}>Continue Shopping</Text>
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
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
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
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 2,
    borderColor: COLORS.p200,
  },
  continueBtnText: {
    fontFamily: FONTS.soraBold,
    color: COLORS.p700,
    fontSize: 15,
  },
});