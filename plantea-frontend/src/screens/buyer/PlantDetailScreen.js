import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, ActivityIndicator } from 'react-native';
import Animated, { FadeInDown, FadeInUp, ZoomIn } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import Toast from 'react-native-toast-message';
import AsyncStorage from '@react-native-async-storage/async-storage';
import MarketplaceService from '../../services/marketplace';
import { COLORS, FONTS, RADII, SHADOWS } from '../../theme';

export default function PlantDetailScreen({ navigation, route }) {
  const { plantId } = route.params;
  const [plant, setPlant] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [wishlist, setWishlist] = useState([]);

  useEffect(() => {
    loadPlant();
    loadWishlist();
  }, []);

  const loadPlant = async () => {
    try {
      const response = await MarketplaceService.getPlants({});
      const found = response?.data?.plants?.find((p) => String(p.plant_id) === String(plantId));
      if (!found) {
        setPlant(null);
        return;
      }
      setPlant(found);
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to load plant details',
      });
    } finally {
      setLoading(false);
    }
  };

  const loadWishlist = async () => {
    try {
      const stored = await AsyncStorage.getItem('plantea_wishlist');
      const list = stored ? JSON.parse(stored) : [];
      setWishlist(list);
      setIsWishlisted(list.some(item => item.plant_id === plantId));
    } catch (error) {
      console.error('Failed to load wishlist:', error);
    }
  };

  const toggleWishlist = async () => {
    try {
      if (isWishlisted) {
        const newList = wishlist.filter(item => item.plant_id !== plantId);
        await AsyncStorage.setItem('plantea_wishlist', JSON.stringify(newList));
        setWishlist(newList);
        setIsWishlisted(false);
        Toast.show({
          type: 'info',
          text1: 'Removed from wishlist',
        });
      } else {
        const newList = [...wishlist, plant];
        await AsyncStorage.setItem('plantea_wishlist', JSON.stringify(newList));
        setWishlist(newList);
        setIsWishlisted(true);
        Toast.show({
          type: 'success',
          text1: 'Added to wishlist',
        });
      }
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to update wishlist',
      });
    }
  };

  const handleAddToCart = async () => {
    try {
      const stored = await AsyncStorage.getItem('plantea_cart');
      const cart = stored ? JSON.parse(stored) : [];
      
      const existingIndex = cart.findIndex(item => item.plant.plant_id === plantId);
      if (existingIndex >= 0) {
        cart[existingIndex].quantity += quantity;
      } else {
        cart.push({ plant, quantity });
      }
      
      await AsyncStorage.setItem('plantea_cart', JSON.stringify(cart));
      Toast.show({
        type: 'success',
        text1: 'Added to cart',
        text2: `${quantity} ${plant.name} added`,
      });
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to add to cart',
      });
    }
  };

  const handleOrderNow = () => {
    navigation.navigate('Checkout', { plant, quantity });
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.p700} />
      </View>
    );
  }

  if (!plant) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.errorText}>Plant not found</Text>
      </View>
    );
  }

  const getHealthColor = (score) => {
    if (score >= 80) return COLORS.p500;
    if (score >= 50) return COLORS.yel;
    return COLORS.red;
  };

  return (
    <View style={styles.container}>
      <ScrollView>
        <Animated.View entering={FadeInDown.duration(600)} style={styles.imageContainer}>
          {plant.image_url ? (
            <Image source={{ uri: plant.image_url }} style={styles.heroImage} resizeMode="cover" />
          ) : (
            <LinearGradient colors={['#D6F0E2', '#A8DDB5']} style={styles.heroPlaceholder}>
              <Text style={styles.heroPlaceholderText}>
                {plant.name?.charAt(0).toUpperCase() || '🌿'}
              </Text>
            </LinearGradient>
          )}

          {plant.ai_verified && (
            <View style={styles.dAi}>
              <Text style={styles.dAiText}>✨ AI Verified</Text>
            </View>
          )}
        </Animated.View>

        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.wishlistButton} onPress={toggleWishlist}>
          <Text style={styles.wishlistIcon}>{isWishlisted ? '♥' : '♡'}</Text>
        </TouchableOpacity>

        <Animated.View entering={FadeInUp.delay(200)} style={styles.content}>
          <Text style={styles.plantName}>{plant.name}</Text>
          {plant.scientific_name && (
            <Text style={styles.scientificName}>{plant.scientific_name}</Text>
          )}
          <Text style={styles.price}>Rs. {plant.price_pkr}</Text>

          <View style={styles.chipsRow}>
            {plant.category && (
              <Animated.View entering={ZoomIn.delay(300)} style={styles.chip}>
                <Text style={styles.chipText}>{plant.category}</Text>
              </Animated.View>
            )}
            {plant.city && (
              <Animated.View entering={ZoomIn.delay(400)} style={styles.chip}>
                <Text style={styles.chipText}>{plant.city}</Text>
              </Animated.View>
            )}
            <Animated.View entering={ZoomIn.delay(500)} style={[styles.chip, { backgroundColor: plant.stock_quantity > 0 ? COLORS.p100 : '#FFE5E5' }]}>
              <Text style={[styles.chipText, { color: plant.stock_quantity > 0 ? COLORS.p700 : COLORS.red }]}>
                {plant.stock_quantity > 0 ? `${plant.stock_quantity} in stock` : 'Out of stock'}
              </Text>
            </Animated.View>
          </View>

          {plant.health_score && (
            <View style={styles.healthSection}>
              <Text style={styles.sectionLabel}>Health Score</Text>
              <View style={styles.healthBar}>
                <View style={[styles.healthFill, { width: `${plant.health_score}%`, backgroundColor: getHealthColor(plant.health_score) }]} />
              </View>
              <Text style={[styles.healthScore, { color: getHealthColor(plant.health_score) }]}>
                {plant.health_score}%
              </Text>
            </View>
          )}

          {plant.description && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>About</Text>
              <Text style={styles.description}>{plant.description}</Text>
            </View>
          )}

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Care Tips</Text>
            <View style={styles.careGrid}>
              <View style={styles.careCard}>
                <Text style={styles.careIcon}>💧</Text>
                <Text style={styles.careLabel}>Water</Text>
                <Text style={styles.careValue}>{plant.water_needs || 'Moderate'}</Text>
              </View>
              <View style={styles.careCard}>
                <Text style={styles.careIcon}>☀️</Text>
                <Text style={styles.careLabel}>Light</Text>
                <Text style={styles.careValue}>{plant.light_needs || 'Bright'}</Text>
              </View>
              <View style={styles.careCard}>
                <Text style={styles.careIcon}>🌡️</Text>
                <Text style={styles.careLabel}>Temperature</Text>
                <Text style={styles.careValue}>{plant.temperature || '20-25°C'}</Text>
              </View>
              <View style={styles.careCard}>
                <Text style={styles.careIcon}>🪴</Text>
                <Text style={styles.careLabel}>Soil</Text>
                <Text style={styles.careValue}>{plant.soil_type || 'Well-drained'}</Text>
              </View>
            </View>
          </View>

          {plant.seller_name && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Seller</Text>
              <View style={styles.sellerCard}>
                <View>
                  <Text style={styles.sellerName}>{plant.seller_name}</Text>
                  {plant.seller_city && (
                    <Text style={styles.sellerCity}>{plant.seller_city}</Text>
                  )}
                </View>
                <TouchableOpacity style={styles.contactButton}>
                  <Text style={styles.contactButtonText}>Contact Seller</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {plant.reviews && plant.reviews.length > 0 ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Reviews</Text>
              {plant.reviews.map((review, index) => (
                <View key={index} style={styles.reviewCard}>
                  <View style={styles.reviewHeader}>
                    <Text style={styles.reviewStars}>
                      {'★'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)}
                    </Text>
                    <Text style={styles.reviewDate}>{review.date}</Text>
                  </View>
                  <Text style={styles.reviewName}>{review.reviewer_name}</Text>
                  <Text style={styles.reviewComment}>{review.comment}</Text>
                </View>
              ))}
            </View>
          ) : (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Reviews</Text>
              <Text style={styles.noReviews}>No reviews yet</Text>
            </View>
          )}

          <View style={{ height: 120 }} />
        </Animated.View>
      </ScrollView>

      <Animated.View entering={FadeInUp.delay(400)} style={styles.bottomBar}>
        <View style={styles.quantitySelector}>
          <TouchableOpacity
            style={styles.quantityButton}
            onPress={() => setQuantity(Math.max(1, quantity - 1))}
          >
            <Text style={styles.quantityButtonText}>−</Text>
          </TouchableOpacity>
          <Text style={styles.quantityText}>{quantity}</Text>
          <TouchableOpacity
            style={styles.quantityButton}
            onPress={() => setQuantity(Math.min(plant.stock_quantity, quantity + 1))}
            disabled={quantity >= plant.stock_quantity}
          >
            <Text style={styles.quantityButtonText}>+</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={styles.addToCartButton}
            onPress={handleAddToCart}
            disabled={plant.stock_quantity === 0}
          >
            <Text style={styles.addToCartText}>Add to Cart</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.orderNowButton, plant.stock_quantity === 0 && styles.buttonDisabled]}
            onPress={handleOrderNow}
            disabled={plant.stock_quantity === 0}
          >
            <Text style={styles.orderNowText}>Order Now</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.white,
  },
  errorText: {
    fontFamily: FONTS.nunito,
    fontSize: 16,
    color: COLORS.t3,
  },
  imageContainer: {
    width: '100%',
    height: 320,
    position: 'relative',
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  heroPlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroPlaceholderText: {
    fontFamily: FONTS.soraExtraBold,
    fontSize: 80,
    color: COLORS.p700,
  },
  backButton: {
    position: 'absolute',
    top: 52,
    left: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.white,
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOWS.card,
  },
  backText: {
    fontSize: 20,
    color: COLORS.t1,
  },
  wishlistButton: {
    position: 'absolute',
    top: 52,
    right: 16,
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.88)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  wishlistIcon: {
    fontSize: 20,
    color: COLORS.red,
  },
  dAi: {
    position: 'absolute',
    bottom: 14,
    left: 14,
    backgroundColor: COLORS.p700,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 50,
    flexDirection: 'row',
    alignItems: 'center',
  },
  dAiText: {
    color: COLORS.white,
    fontFamily: FONTS.nunitoBold,
    fontSize: 11,
  },
  content: {
    padding: 18,
  },
  plantName: {
    fontFamily: FONTS.soraExtraBold,
    fontSize: 24,
    color: COLORS.t1,
  },
  scientificName: {
    fontFamily: FONTS.nunito,
    fontSize: 14,
    fontStyle: 'italic',
    color: COLORS.t3,
    marginTop: 4,
  },
  price: {
    fontFamily: FONTS.soraExtraBold,
    fontSize: 22,
    color: COLORS.p700,
    marginTop: 8,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  chip: {
    backgroundColor: COLORS.p100,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: RADII.chip,
  },
  chipText: {
    fontFamily: FONTS.nunitoBold,
    fontSize: 12,
    color: COLORS.p700,
  },
  healthSection: {
    marginTop: 16,
  },
  sectionLabel: {
    fontFamily: FONTS.nunitoBold,
    fontSize: 12,
    color: COLORS.t2,
    marginBottom: 6,
  },
  healthBar: {
    height: 8,
    backgroundColor: COLORS.bg,
    borderRadius: 4,
    overflow: 'hidden',
  },
  healthFill: {
    height: '100%',
    borderRadius: 4,
  },
  healthScore: {
    fontFamily: FONTS.soraBold,
    fontSize: 14,
    marginTop: 4,
  },
  section: {
    marginTop: 20,
  },
  sectionTitle: {
    fontFamily: FONTS.soraBold,
    fontSize: 16,
    color: COLORS.t1,
    marginBottom: 12,
  },
  description: {
    fontFamily: FONTS.nunito,
    fontSize: 14,
    color: COLORS.t2,
    lineHeight: 22,
  },
  careGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  careCard: {
    width: '48%',
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.p100,
  },
  careIcon: {
    fontSize: 24,
    marginBottom: 6,
  },
  careLabel: {
    fontFamily: FONTS.nunito,
    fontSize: 12,
    color: COLORS.t3,
  },
  careValue: {
    fontFamily: FONTS.nunitoBold,
    fontSize: 13,
    color: COLORS.t2,
    marginTop: 2,
  },
  sellerCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.p100,
  },
  sellerName: {
    fontFamily: FONTS.nunitoBold,
    fontSize: 14,
    color: COLORS.t1,
  },
  sellerCity: {
    fontFamily: FONTS.nunito,
    fontSize: 12,
    color: COLORS.t3,
    marginTop: 2,
  },
  contactButton: {
    borderWidth: 2,
    borderColor: COLORS.p700,
    borderRadius: RADII.btn,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  contactButtonText: {
    fontFamily: FONTS.nunitoBold,
    fontSize: 12,
    color: COLORS.p700,
  },
  reviewCard: {
    backgroundColor: COLORS.bg,
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  reviewStars: {
    fontSize: 14,
    color: COLORS.yel,
  },
  reviewDate: {
    fontFamily: FONTS.nunito,
    fontSize: 11,
    color: COLORS.t4,
  },
  reviewName: {
    fontFamily: FONTS.nunitoBold,
    fontSize: 13,
    color: COLORS.t1,
    marginBottom: 4,
  },
  reviewComment: {
    fontFamily: FONTS.nunito,
    fontSize: 13,
    color: COLORS.t2,
    lineHeight: 18,
  },
  noReviews: {
    fontFamily: FONTS.nunito,
    fontSize: 14,
    color: COLORS.t3,
    textAlign: 'center',
    paddingVertical: 20,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: COLORS.white,
    borderTopWidth: 1,
    borderTopColor: COLORS.p100,
    height: 90,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  quantitySelector: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.p100,
    borderRadius: RADII.btn,
    paddingHorizontal: 8,
  },
  quantityButton: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quantityButtonText: {
    fontFamily: FONTS.soraBold,
    fontSize: 18,
    color: COLORS.p700,
  },
  quantityText: {
    fontFamily: FONTS.soraBold,
    fontSize: 16,
    color: COLORS.t1,
    marginHorizontal: 12,
  },
  actionButtons: {
    flex: 1,
    flexDirection: 'row',
    gap: 8,
  },
  addToCartButton: {
    flex: 1,
    borderWidth: 2,
    borderColor: COLORS.p700,
    borderRadius: RADII.btn,
    paddingVertical: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addToCartText: {
    fontFamily: FONTS.soraBold,
    fontSize: 13,
    color: COLORS.p700,
  },
  orderNowButton: {
    flex: 1,
    backgroundColor: COLORS.p700,
    borderRadius: RADII.btn,
    paddingVertical: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  orderNowText: {
    fontFamily: FONTS.soraBold,
    fontSize: 13,
    color: COLORS.white,
  },
  buttonDisabled: {
    backgroundColor: COLORS.t4,
  },
});
