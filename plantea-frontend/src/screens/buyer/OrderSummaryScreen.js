import { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, TextInput } from 'react-native';
import ApiService from '../../services/api';
import { COLORS, FONTS, RADII, SHADOWS } from '../../theme';

export default function OrderSummaryScreen({ navigation, route }) {
  const plant = route.params?.plant || { name: 'Peace Lily', emoji: '🌿', price: 450 };
  const quantity = route.params?.quantity || 1;
  const [payment, setPayment] = useState('COD');
  const [jazzCashNumber, setJazzCashNumber] = useState('');
  const [loading, setLoading] = useState(false);
  
  const delivery = 150; // From backend DEFAULT_DELIVERY_FEE
  const subtotal = (plant.price || plant.price_pkr) * quantity;
  const total = subtotal + delivery;

  const handlePlaceOrder = async () => {
    if (payment === 'JazzCash' && !jazzCashNumber) {
      Alert.alert('Required', 'Please enter your JazzCash Mobile Number');
      return;
    }

    try {
      setLoading(true);
      
      const orderData = {
        plant_id: plant.id,
        quantity: quantity,
        delivery_address: "House 42, Street 7, DHA Phase 5, Lahore, Punjab 54000", // TODO: Get from user profile
        payment_method: payment,
        payment_details: payment === 'JazzCash' ? { phone: jazzCashNumber } : null,
        notes: null
      };
      
      // Simulate JazzCash API processing delay
      if (payment === 'JazzCash') {
        await new Promise(resolve => setTimeout(resolve, 1500));
      }

      const response = await ApiService.placeOrder(orderData);
      
      if (response.success) {
        navigation.navigate('OrderSuccess', { 
          order: response.data,
          plant: plant 
        });
      }
    } catch (error) {
      Alert.alert('Order Failed', error.message || 'Could not place order. Please try again.');
      console.error('Place order error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Order Summary</Text>
      </View>

      {/* Order Item */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🧾 Your Order</Text>
        <View style={styles.orderItem}>
          <Text style={styles.orderEmoji}>{plant.emoji || '🌿'}</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.orderName}>{plant.name}</Text>
            <Text style={styles.orderSeller}>
              {plant.seller_name || 'Verified Seller'} · {plant.ai_verified ? 'AI Verified ✅' : 'Verified Listing'}
            </Text>
            <Text style={styles.orderPrice}>Rs. {plant.price || plant.price_pkr} × {quantity}</Text>
          </View>
        </View>
      </View>

      {/* Price Breakdown */}
      <View style={styles.section}>
        {[
          { label: 'Subtotal', value: subtotal },
          { label: 'Delivery', value: delivery },
        ].map(item => (
          <View key={item.label} style={styles.priceRow}>
            <Text style={styles.priceLabel}>{item.label}</Text>
            <Text style={styles.priceValue}>Rs. {item.value}</Text>
          </View>
        ))}
        <View style={[styles.priceRow, styles.totalRow]}>
          <Text style={styles.totalLabel}>Total</Text>
          <Text style={styles.totalValue}>Rs. {total}</Text>
        </View>
      </View>

      {/* Delivery Address */}
      <View style={styles.section}>
        <View style={styles.rowBetween}>
          <Text style={styles.sectionTitle}>📍 Delivery Address</Text>
          <TouchableOpacity><Text style={styles.changeText}>Change</Text></TouchableOpacity>
        </View>
        <Text style={styles.addressText}>
          House 42, Street 7, DHA Phase 5{'\n'}Lahore, Punjab 54000
        </Text>
      </View>

      {/* Payment */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>💳 Payment</Text>
        {[
          { id: 'COD', label: 'Cash on Delivery' },
          { id: 'JazzCash', label: 'JazzCash' },
        ].map(option => (
          <TouchableOpacity
            key={option.id}
            style={styles.paymentOption}
            onPress={() => setPayment(option.id)}
            activeOpacity={0.7}
          >
            <View style={[styles.radio, payment === option.id && styles.radioActive]}>
              {payment === option.id && <View style={styles.radioDot} />}
            </View>
            <Text style={styles.paymentLabel}>{option.label}</Text>
          </TouchableOpacity>
        ))}

        {payment === 'JazzCash' && (
          <View style={styles.jazzCashInputContainer}>
            <Text style={styles.jazzCashLabel}>JazzCash Mobile Number</Text>
            <TextInput
              style={styles.jazzCashInput}
              placeholder="03xx xxxxxxx"
              keyboardType="phone-pad"
              value={jazzCashNumber}
              onChangeText={setJazzCashNumber}
              placeholderTextColor={COLORS.t4}
            />
          </View>
        )}
      </View>

      {/* Place Order */}
      <TouchableOpacity
        style={[styles.placeOrderBtn, loading && styles.placeOrderBtnDisabled]}
        onPress={handlePlaceOrder}
        disabled={loading}
      >
        <Text style={styles.placeOrderText}>
          {loading ? 'Placing Order...' : `Place Order · Rs. ${total} →`}
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  header: {
    flexDirection: 'row', alignItems: 'center',
    padding: 24, paddingTop: 60,
    backgroundColor: COLORS.white, gap: 16,
    borderBottomWidth: 1, borderBottomColor: COLORS.p100,
  },
  backText: { fontSize: 22, color: COLORS.t1 },
  headerTitle: { fontFamily: FONTS.soraExtraBold, fontSize: 20, color: COLORS.t1 },
  section: { backgroundColor: COLORS.white, margin: 12, borderRadius: 16, padding: 16, ...SHADOWS.card },
  sectionTitle: { fontFamily: FONTS.soraBold, fontSize: 14, color: COLORS.t1, marginBottom: 12 },
  orderItem: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  orderEmoji: { fontSize: 40, backgroundColor: COLORS.p100, borderRadius: 12, padding: 8 },
  orderName: { fontFamily: FONTS.nunitoBold, fontSize: 15, color: COLORS.t1 },
  orderSeller: { fontFamily: FONTS.nunito, fontSize: 12, color: COLORS.t3, marginTop: 2 },
  orderPrice: { fontFamily: FONTS.soraBold, fontSize: 13, color: COLORS.p700, marginTop: 4 },
  priceRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  priceLabel: { fontFamily: FONTS.nunito, color: COLORS.t2, fontSize: 14 },
  priceValue: { fontFamily: FONTS.nunitoBold, color: COLORS.t1, fontSize: 14 },
  totalRow: { borderTopWidth: 1, borderTopColor: COLORS.p100, paddingTop: 12, marginTop: 4 },
  totalLabel: { fontFamily: FONTS.soraBold, fontSize: 15, color: COLORS.t1 },
  totalValue: { fontFamily: FONTS.soraExtraBold, fontSize: 16, color: COLORS.p700 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  changeText: { fontFamily: FONTS.nunitoBold, color: COLORS.p700, fontSize: 13 },
  addressText: { fontFamily: FONTS.nunito, color: COLORS.t2, fontSize: 14, lineHeight: 22 },
  paymentOption: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: COLORS.p400, justifyContent: 'center', alignItems: 'center' },
  radioActive: { borderColor: COLORS.p700 },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: COLORS.p700 },
  paymentLabel: { fontFamily: FONTS.nunitoBold, fontSize: 14, color: COLORS.t1 },
  jazzCashInputContainer: {
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.p50,
  },
  jazzCashLabel: { fontFamily: FONTS.nunitoBold, fontSize: 12, color: COLORS.t2, marginBottom: 8 },
  jazzCashInput: {
    backgroundColor: COLORS.bg,
    borderRadius: 12,
    padding: 14,
    fontFamily: FONTS.nunito,
    fontSize: 14,
    color: COLORS.t1,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  placeOrderBtn: {
    backgroundColor: COLORS.p700, margin: 16,
    padding: 18, borderRadius: RADII.btn,
    alignItems: 'center', marginBottom: 40,
  },
  placeOrderBtnDisabled: {
    backgroundColor: COLORS.t4,
  },
  placeOrderText: { fontFamily: FONTS.soraBold, color: COLORS.white, fontSize: 16 },
});