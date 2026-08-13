import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, TextInput } from 'react-native';
import ApiService from '../../services/api';
import { Icon } from '../../components/ui';
import { COLORS, FONTS, RADII, SHADOWS } from '../../theme';

const METHOD_LABELS = {
  COD: 'Cash on Delivery',
  JazzCash: 'JazzCash',
  EasyPaisa: 'EasyPaisa',
};

export default function OrderSummaryScreen({ navigation, route }) {
  const plant = route.params?.plant || { name: 'Peace Lily', price: 450 };
  const quantity = route.params?.quantity || 1;
  const cartItems = route.params?.cartItems || null;

  // Support both single-plant ("Order Now") and multi-item (cart) checkout.
  const lineItems = cartItems && cartItems.length
    ? cartItems.map(item => ({ plant: item.plant, quantity: item.quantity }))
    : [{ plant, quantity }];

  const [paymentMethods, setPaymentMethods] = useState([{ id: 'COD', label: 'Cash on Delivery' }]);
  const [payment, setPayment] = useState('COD');
  const [paymentNumber, setPaymentNumber] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState(
    plant.seller_city === 'Lahore'
      ? 'House 42, Street 7, DHA Phase 5, Lahore, Punjab 54000'
      : `House 42, Street 7, ${plant.seller_city || 'Lahore'}, Punjab 54000`
  );
  const [loading, setLoading] = useState(false);
  const [couponCode, setCouponCode] = useState('');
  const [couponApplied, setCouponApplied] = useState(null);
  const [couponError, setCouponError] = useState('');
  const [applyingCoupon, setApplyingCoupon] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const response = await ApiService.getPaymentMethods();
        if (response.success && response.data?.methods?.length) {
          setPaymentMethods(response.data.methods.map(m => ({
            id: m.id,
            label: METHOD_LABELS[m.id] || m.name || m.id,
          })));
        }
      } catch (error) {
        console.warn('Payment methods unavailable:', error.message);
      }
    })();
  }, []);

  // Free platform: delivery fee is Rs. 0 and sellers keep 100%.
  const delivery = 0;
  const subtotal = lineItems.reduce(
    (sum, item) => sum + (item.plant.price || item.plant.price_pkr || 0) * item.quantity,
    0
  );
  const discount = couponApplied?.discount_pkr || 0;
  const total = Math.max(0, subtotal + delivery - discount);

  const applyCoupon = async () => {
    if (!couponCode.trim()) return;
    setApplyingCoupon(true);
    setCouponError('');
    try {
      const res = await ApiService.previewCoupon(couponCode.trim(), subtotal);
      if (res.success) {
        setCouponApplied(res.data);
        setCouponError('');
      } else {
        setCouponApplied(null);
        setCouponError(res.message || 'Invalid coupon code.');
      }
    } catch (error) {
      setCouponApplied(null);
      setCouponError(error.message || 'Could not apply coupon.');
    } finally {
      setApplyingCoupon(false);
    }
  };

  const removeCoupon = () => {
    setCouponApplied(null);
    setCouponCode('');
    setCouponError('');
  };

  const handlePlaceOrder = async () => {
    if (payment !== 'COD' && !paymentNumber) {
      Alert.alert('Required', 'Please enter your mobile number for payment');
      return;
    }
    if (!deliveryAddress.trim()) {
      Alert.alert('Required', 'Please enter a delivery address');
      return;
    }

    try {
      setLoading(true);

      const placedOrders = [];
      for (const item of lineItems) {
        const orderData = {
          plant_id: item.plant.id,
          quantity: item.quantity,
          delivery_address: deliveryAddress.trim(),
          payment_method: payment,
          payment_details: payment !== 'COD' ? { phone: paymentNumber } : null,
          coupon_code: couponApplied?.code || couponCode.trim() || null,
          notes: null,
        };

        const response = await ApiService.placeOrder(orderData);
        if (!response.success) {
          throw new Error(response.message || 'Could not place order');
        }
        placedOrders.push(response.data);
      }

      navigation.navigate('OrderSuccess', {
        orders: placedOrders,
        order: placedOrders[0],
        plant,
      });
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
        <TouchableOpacity onPress={() => navigation.goBack()} accessibilityLabel="Back">
          <Icon name="arrow-left" size={22} color={COLORS.t1} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Order Summary</Text>
      </View>

      {/* Order Item */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Your Order</Text>
        {lineItems.map((item, index) => (
          <View key={index} style={[styles.orderItem, index > 0 && styles.orderItemSpacing]}>
            <View style={styles.orderEmoji}>
              <Icon name="leaf" size={22} color={COLORS.p700} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.orderName}>{item.plant.name}</Text>
              <Text style={styles.orderSeller}>
                {item.plant.seller_name || 'Verified Seller'}
                {item.plant.ai_verified ? ' · AI Verified' : ''}
              </Text>
              <Text style={styles.orderPrice}>Rs. {item.plant.price || item.plant.price_pkr} × {item.quantity}</Text>
            </View>
          </View>
        ))}
      </View>

      {/* Coupon */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Promo Code</Text>
        {couponApplied ? (
          <View style={styles.couponApplied}>
            <View style={{ flex: 1 }}>
              <Text style={styles.couponAppliedCode}>{couponApplied.code} applied</Text>
              <Text style={styles.couponAppliedText}>
                You saved Rs. {couponApplied.discount_pkr}
                {couponApplied.message ? ` — ${couponApplied.message}` : ''}
              </Text>
            </View>
            <TouchableOpacity onPress={removeCoupon} accessibilityLabel="Remove coupon">
              <Icon name="x-circle" size={20} color={COLORS.red} />
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <View style={styles.couponRow}>
              <TextInput
                style={styles.couponInput}
                placeholder="Enter code (e.g. WELCOME10)"
                placeholderTextColor={COLORS.t4}
                value={couponCode}
                onChangeText={(t) => { setCouponCode(t.toUpperCase()); setCouponError(''); }}
                autoCapitalize="characters"
              />
              <TouchableOpacity
                style={[styles.couponBtn, applyingCoupon && { opacity: 0.6 }]}
                onPress={applyCoupon}
                disabled={applyingCoupon}
              >
                <Text style={styles.couponBtnText}>{applyingCoupon ? '...' : 'Apply'}</Text>
              </TouchableOpacity>
            </View>
            {couponError ? <Text style={styles.couponError}>{couponError}</Text> : null}
          </>
        )}
      </View>

      {/* Price Breakdown */}
      <View style={styles.section}>
        <View style={styles.priceRow}>
          <Text style={styles.priceLabel}>Subtotal</Text>
          <Text style={styles.priceValue}>Rs. {subtotal}</Text>
        </View>
        <View style={styles.priceRow}>
          <Text style={styles.priceLabel}>Delivery</Text>
          <Text style={styles.priceValue}>Free</Text>
        </View>
        {discount > 0 && (
          <View style={styles.priceRow}>
            <Text style={[styles.priceLabel, { color: COLORS.red }]}>Discount</Text>
            <Text style={[styles.priceValue, { color: COLORS.red }]}>- Rs. {discount}</Text>
          </View>
        )}
        <View style={[styles.priceRow, styles.totalRow]}>
          <Text style={styles.totalLabel}>Total</Text>
          <Text style={styles.totalValue}>Rs. {total}</Text>
        </View>
      </View>

      {/* Delivery Address */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Delivery Address</Text>
        <TextInput
          style={styles.addressInput}
          placeholder="Enter full delivery address"
          placeholderTextColor={COLORS.t4}
          value={deliveryAddress}
          onChangeText={setDeliveryAddress}
          multiline
          numberOfLines={3}
        />
      </View>

      {/* Payment */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Payment</Text>
        {paymentMethods.map(option => (
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

        {payment !== 'COD' && (
          <View style={styles.jazzCashInputContainer}>
            <Text style={styles.jazzCashLabel}>Mobile Number</Text>
            <TextInput
              style={styles.jazzCashInput}
              placeholder="03xx xxxxxxx"
              keyboardType="phone-pad"
              value={paymentNumber}
              onChangeText={setPaymentNumber}
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
          {loading ? 'Placing Order...' : `Place Order · Rs. ${total}`}
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
  orderItemSpacing: { marginTop: 14 },
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
  addressInput: {
    backgroundColor: COLORS.bg,
    borderRadius: 12,
    padding: 14,
    fontFamily: FONTS.nunito,
    fontSize: 14,
    color: COLORS.t1,
    borderWidth: 2,
    borderColor: 'transparent',
    minHeight: 80,
    textAlignVertical: 'top',
  },
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