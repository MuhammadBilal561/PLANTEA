import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Toast from 'react-native-toast-message';
import { COLORS, FONTS, RADII, SHADOWS } from '../../theme';

export default function CartScreen({ navigation }) {
  const [cartItems, setCartItems] = useState([]);

  useEffect(() => {
    loadCart();
    const unsubscribe = navigation.addListener('focus', loadCart);
    return unsubscribe;
  }, [navigation]);

  const loadCart = async () => {
    try {
      const stored = await AsyncStorage.getItem('plantea_cart');
      setCartItems(stored ? JSON.parse(stored) : []);
    } catch (error) {
      console.error('Failed to load cart:', error);
    }
  };

  const updateQuantity = async (plantId, newQuantity) => {
    const updated = cartItems.map(item =>
      item.plant.plant_id === plantId ? { ...item, quantity: newQuantity } : item
    );
    setCartItems(updated);
    await AsyncStorage.setItem('plantea_cart', JSON.stringify(updated));
  };

  const removeItem = async (plantId) => {
    const updated = cartItems.filter(item => item.plant.plant_id !== plantId);
    setCartItems(updated);
    await AsyncStorage.setItem('plantea_cart', JSON.stringify(updated));
    Toast.show({ type: 'info', text1: 'Removed from cart' });
  };

  const getSubtotal = () => {
    return cartItems.reduce((sum, item) => sum + (item.plant.price_pkr * item.quantity), 0);
  };

  const deliveryFee = 150;
  const total = getSubtotal() + deliveryFee;

  if (cartItems.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.backText}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>My Cart</Text>
        </View>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>🛒</Text>
          <Text style={styles.emptyTitle}>Your cart is empty</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Home')}>
            <Text style={styles.emptyLink}>Browse plants →</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Cart</Text>
      </View>

      <ScrollView style={styles.content}>
        {cartItems.map((item) => (
          <View key={item.plant.plant_id} style={styles.cartItem}>
            {item.plant.image_url ? (
              <Image source={{ uri: item.plant.image_url }} style={styles.itemImage} />
            ) : (
              <View style={styles.itemImagePlaceholder}>
                <Text style={styles.itemImageText}>{item.plant.name?.charAt(0)}</Text>
              </View>
            )}
            <View style={styles.itemInfo}>
              <Text style={styles.itemName} numberOfLines={1}>{item.plant.name}</Text>
              <Text style={styles.itemPrice}>Rs. {item.plant.price_pkr}</Text>
              <View style={styles.quantityRow}>
                <TouchableOpacity
                  style={styles.qtyButton}
                  onPress={() => updateQuantity(item.plant.plant_id, Math.max(1, item.quantity - 1))}
                >
                  <Text style={styles.qtyButtonText}>−</Text>
                </TouchableOpacity>
                <Text style={styles.qtyText}>{item.quantity}</Text>
                <TouchableOpacity
                  style={styles.qtyButton}
                  onPress={() => updateQuantity(item.plant.plant_id, item.quantity + 1)}
                >
                  <Text style={styles.qtyButtonText}>+</Text>
                </TouchableOpacity>
              </View>
            </View>
            <TouchableOpacity
              style={styles.deleteButton}
              onPress={() => removeItem(item.plant.plant_id)}
            >
              <Text style={styles.deleteIcon}>🗑</Text>
            </TouchableOpacity>
          </View>
        ))}
        <View style={{ height: 200 }} />
      </ScrollView>

      <View style={styles.bottomSummary}>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Subtotal:</Text>
          <Text style={styles.summaryValue}>Rs. {getSubtotal()}</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Delivery Fee:</Text>
          <Text style={styles.summaryValue}>Rs. {deliveryFee}</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.summaryRow}>
          <Text style={styles.totalLabel}>Total:</Text>
          <Text style={styles.totalValue}>Rs. {total}</Text>
        </View>
        <TouchableOpacity
          style={styles.checkoutButton}
          onPress={() => navigation.navigate('Checkout', { cartItems })}
        >
          <Text style={styles.checkoutButtonText}>Proceed to Checkout</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    paddingTop: 60,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.p100,
  },
  backText: {
    fontSize: 24,
    color: COLORS.p700,
    marginRight: 16,
  },
  headerTitle: {
    fontFamily: FONTS.soraExtraBold,
    fontSize: 22,
    color: COLORS.t1,
  },
  content: {
    flex: 1,
    padding: 18,
  },
  cartItem: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    borderRadius: RADII.card,
    padding: 12,
    marginBottom: 12,
    ...SHADOWS.card,
  },
  itemImage: {
    width: 64,
    height: 64,
    borderRadius: 12,
  },
  itemImagePlaceholder: {
    width: 64,
    height: 64,
    borderRadius: 12,
    backgroundColor: COLORS.p100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemImageText: {
    fontFamily: FONTS.soraExtraBold,
    fontSize: 24,
    color: COLORS.p700,
  },
  itemInfo: {
    flex: 1,
    marginLeft: 12,
  },
  itemName: {
    fontFamily: FONTS.nunitoBold,
    fontSize: 14,
    color: COLORS.t1,
  },
  itemPrice: {
    fontFamily: FONTS.soraBold,
    fontSize: 15,
    color: COLORS.p700,
    marginTop: 4,
  },
  quantityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  qtyButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.p100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  qtyButtonText: {
    fontFamily: FONTS.soraBold,
    fontSize: 16,
    color: COLORS.p700,
  },
  qtyText: {
    fontFamily: FONTS.soraBold,
    fontSize: 14,
    color: COLORS.t1,
    marginHorizontal: 12,
  },
  deleteButton: {
    padding: 8,
  },
  deleteIcon: {
    fontSize: 20,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyIcon: {
    fontSize: 80,
    marginBottom: 16,
  },
  emptyTitle: {
    fontFamily: FONTS.soraExtraBold,
    fontSize: 18,
    color: COLORS.t1,
    marginBottom: 12,
  },
  emptyLink: {
    fontFamily: FONTS.nunitoBold,
    fontSize: 14,
    color: COLORS.p700,
  },
  bottomSummary: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: COLORS.white,
    borderTopWidth: 1,
    borderTopColor: COLORS.p100,
    padding: 18,
    paddingBottom: 28,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  summaryLabel: {
    fontFamily: FONTS.nunito,
    fontSize: 14,
    color: COLORS.t2,
  },
  summaryValue: {
    fontFamily: FONTS.nunitoBold,
    fontSize: 14,
    color: COLORS.t1,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.p100,
    marginVertical: 8,
  },
  totalLabel: {
    fontFamily: FONTS.soraExtraBold,
    fontSize: 18,
    color: COLORS.t1,
  },
  totalValue: {
    fontFamily: FONTS.soraExtraBold,
    fontSize: 18,
    color: COLORS.p700,
  },
  checkoutButton: {
    backgroundColor: COLORS.p700,
    borderRadius: RADII.btn,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 12,
  },
  checkoutButtonText: {
    fontFamily: FONTS.soraBold,
    fontSize: 15,
    color: COLORS.white,
  },
});
