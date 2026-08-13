import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, ActivityIndicator, TextInput, Modal } from 'react-native';
import Animated, { FadeInDown, FadeInUp, ZoomIn } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import Toast from 'react-native-toast-message';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../../context/AuthContext';
import ApiService from '../../services/api';
import { Icon, Badge, Rating, Price, Button, EmptyState, SectionHeader } from '../../components/ui';
import PlantCard from '../../components/PlantCard';
import { COLORS, FONTS, RADII, SHADOWS } from '../../theme';

export default function PlantDetailScreen({ navigation, route }) {
  const { plantId } = route.params;
  const { user } = useAuth();
  const [plant, setPlant] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [inGarden, setInGarden] = useState(false);
  const [gardenItemId, setGardenItemId] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [reviewModal, setReviewModal] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);

  const loadPlant = async () => {
    try {
      const response = await ApiService.getPlantById(plantId);
      setPlant(response.success && response.data?.plant ? response.data.plant : null);
    } catch (error) {
      setPlant(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPlant();
    checkWishlist();
    checkGarden();
  }, [plantId]);

  const checkWishlist = async () => {
    try {
      const response = await ApiService.getWishlist();
      if (response.success && response.data?.wishlist) {
        setIsWishlisted(response.data.wishlist.some((item) => item.plant_id === plantId));
      }
    } catch (error) {}
  };

  const checkGarden = async () => {
    try {
      const response = await ApiService.getMyGarden();
      if (response.success && response.data?.garden) {
        const match = response.data.garden.find((item) => item.plant_id === plantId);
        setInGarden(!!match);
        setGardenItemId(match?.garden_id || null);
      }
    } catch (error) {}
  };

  const toggleWishlist = async () => {
    try {
      if (isWishlisted) {
        await ApiService.removeFromWishlist(plantId);
        setIsWishlisted(false);
        Toast.show({ type: 'info', text1: 'Removed from wishlist' });
      } else {
        await ApiService.addToWishlist(plantId);
        setIsWishlisted(true);
        Toast.show({ type: 'success', text1: 'Added to wishlist' });
      }
    } catch (error) {
      Toast.show({ type: 'error', text1: 'Error', text2: error.message || 'Failed to update wishlist' });
    }
  };

  const toggleGarden = async () => {
    try {
      if (inGarden && gardenItemId) {
        await ApiService.removeFromGarden(gardenItemId);
        setInGarden(false);
        setGardenItemId(null);
        Toast.show({ type: 'info', text1: 'Removed from My Garden' });
      } else {
        const res = await ApiService.addToGarden(plantId);
        if (res.success && res.data?.item?.id) {
          setGardenItemId(res.data.item.id);
        }
        setInGarden(true);
        Toast.show({ type: 'success', text1: 'Saved to My Garden' });
      }
    } catch (error) {
      Toast.show({ type: 'error', text1: 'Error', text2: error.message || 'Please log in' });
    }
  };

  const handleAddToCart = async () => {
    try {
      const stored = await AsyncStorage.getItem('plantea_cart');
      const cart = stored ? JSON.parse(stored) : [];
      const existingIndex = cart.findIndex((item) => item.plant?.plant_id === plantId || item.plant?.id === plantId);
      if (existingIndex >= 0) {
        cart[existingIndex].quantity += quantity;
      } else {
        cart.push({ plant, quantity });
      }
      await AsyncStorage.setItem('plantea_cart', JSON.stringify(cart));
      Toast.show({ type: 'success', text1: 'Added to cart', text2: `${quantity} ${plant.name} added` });
    } catch (error) {
      Toast.show({ type: 'error', text1: 'Error', text2: 'Failed to add to cart' });
    }
  };

  const handleOrderNow = () => {
    navigation.navigate('Checkout', { plant, quantity });
  };

  const submitReview = async () => {
    if (!reviewComment.trim()) {
      Toast.show({ type: 'error', text1: 'Add a comment', text2: 'Please write a short review.' });
      return;
    }
    setSubmittingReview(true);
    try {
      const ordersRes = await ApiService.getOrders();
      const orders = ordersRes.success ? (ordersRes.data.orders || []) : [];
      const delivered = orders.find((o) => o.plant_id === plantId && o.status === 'delivered');
      if (!delivered) {
        Toast.show({ type: 'error', text1: 'Verification required', text2: 'Reviews are for delivered purchases only.' });
        setSubmittingReview(false);
        return;
      }
      const res = await ApiService.createReview({
        order_id: delivered.order_id || delivered.id,
        rating: reviewRating,
        comment: reviewComment.trim(),
      });
      if (res.success) {
        Toast.show({ type: 'success', text1: 'Review submitted', text2: 'Thanks for helping the community!' });
        setReviewModal(false);
        setReviewComment('');
        setReviewRating(5);
        loadPlant();
      } else {
        Toast.show({ type: 'error', text1: 'Could not review', text2: res.message || 'You can only review a plant you ordered.' });
      }
    } catch (error) {
      Toast.show({ type: 'error', text1: 'Error', text2: error.message || 'Failed to submit review' });
    } finally {
      setSubmittingReview(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.p700} />
      </View>
    );
  }

  if (!plant) {
    return (
      <View style={styles.center}>
        <EmptyState icon="alert-circle" title="Plant not found" message="It may have been removed by the seller." onRetry={() => { setLoading(true); loadPlant(); }} />
      </View>
    );
  }

  const getHealthColor = (score) => {
    if (score >= 80) return COLORS.p500;
    if (score >= 50) return COLORS.yel;
    return COLORS.red;
  };

  const outOfStock = !(plant.stock_quantity > 0);

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <Animated.View entering={FadeInDown.duration(600)} style={styles.imageContainer}>
          {plant.image_url ? (
            <Image source={{ uri: plant.image_url }} style={styles.heroImage} resizeMode="cover" />
          ) : (
            <LinearGradient colors={['#D6F0E2', '#A8DDB5']} style={styles.heroPlaceholder}>
              <Text style={styles.heroPlaceholderText}>{plant.name?.charAt(0).toUpperCase() || 'P'}</Text>
            </LinearGradient>
          )}

          <View style={styles.topBadges}>
            {plant.ai_verified ? <Badge label="AI Verified" tone="green" /> : null}
            {plant.is_organic ? <Badge label="Organic" tone="gold" /> : null}
          </View>
        </Animated.View>

        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()} accessibilityLabel="Back">
          <Icon name="arrow-left" size={20} color={COLORS.t1} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.wishlistButton} onPress={toggleWishlist} accessibilityLabel="Wishlist">
          <Icon name={isWishlisted ? 'heart' : 'heart-outline'} size={20} color={isWishlisted ? COLORS.red : COLORS.t2} />
        </TouchableOpacity>

        <Animated.View entering={FadeInUp.delay(200)} style={styles.content}>
          <View style={styles.titleRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.plantName}>{plant.name}</Text>
              {plant.scientific_name && <Text style={styles.scientificName}>{plant.scientific_name}</Text>}
            </View>
            <TouchableOpacity
              style={[styles.gardenBtn, inGarden && styles.gardenBtnActive]}
              onPress={toggleGarden}
              accessibilityLabel="Save to garden"
            >
              <Icon name={inGarden ? 'check' : 'plus'} size={18} color={inGarden ? COLORS.white : COLORS.p700} />
              <Text style={[styles.gardenBtnText, inGarden && styles.gardenBtnTextActive]}>Garden</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.priceRow}>
            <Price price={plant.price_pkr} originalPrice={plant.original_price_pkr} size={22} />
          </View>

          {plant.rating_count > 0 && (
            <View style={styles.ratingRow}>
              <Rating rating={plant.rating_avg} size={14} count={plant.rating_count} />
            </View>
          )}

          <View style={styles.chipsRow}>
            {plant.category ? <ChipView text={plant.category} /> : null}
            {plant.city ? <ChipView text={plant.city} /> : null}
            <ChipView
              text={outOfStock ? 'Out of stock' : `${plant.stock_quantity} in stock`}
              danger={outOfStock}
            />
          </View>

          {plant.health_score && (
            <View style={styles.healthSection}>
              <Text style={styles.sectionLabel}>Health Score</Text>
              <View style={styles.healthBar}>
                <View style={[styles.healthFill, { width: `${plant.health_score}%`, backgroundColor: getHealthColor(plant.health_score) }]} />
              </View>
              <Text style={[styles.healthScore, { color: getHealthColor(plant.health_score) }]}>{plant.health_score}%</Text>
            </View>
          )}

          {plant.description ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>About</Text>
              <Text style={styles.description}>{plant.description}</Text>
            </View>
          ) : null}

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Care Tips</Text>
            <View style={styles.careGrid}>
              <CareCard icon="droplet" label="Water" value={plant.water_needs || 'Moderate'} />
              <CareCard icon="sun" label="Light" value={plant.light_needs || 'Bright'} />
              <CareCard icon="thermometer" label="Temp" value={plant.temperature || '20-25°C'} />
              <CareCard icon="layers" label="Soil" value={plant.soil_type || 'Well-drained'} />
            </View>
          </View>

          {plant.seller_name ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Seller</Text>
              <TouchableOpacity style={styles.sellerCard} activeOpacity={0.8} onPress={() => navigation.navigate('SellerProfile', { sellerId: plant.seller?.id })}>
                <View style={{ flex: 1 }}>
                  <View style={styles.sellerNameRow}>
                    <Text style={styles.sellerName}>{plant.seller_name}</Text>
                    {plant.seller?.is_verified ? <Badge label="Verified Seller" tone="green" /> : null}
                  </View>
                  {plant.seller_city && <Text style={styles.sellerCity}>{plant.seller_city}</Text>}
                </View>
                <Icon name="chevron-right" size={18} color={COLORS.t3} />
              </TouchableOpacity>
            </View>
          ) : null}

          <View style={styles.section}>
            <View style={styles.reviewsHeader}>
              <Text style={styles.sectionTitle}>Reviews</Text>
              {plant.rating_count > 0 && <Text style={styles.reviewsCount}>{plant.rating_count} reviews</Text>}
            </View>
            {plant.reviews && plant.reviews.length > 0 ? (
              plant.reviews.map((review, index) => (
                <View key={review.id || index} style={styles.reviewCard}>
                  <View style={styles.reviewHeader}>
                    <Rating rating={review.rating} size={11} showValue={false} />
                    <Text style={styles.reviewDate}>{formatDate(review.created_at)}</Text>
                  </View>
                  <View style={styles.reviewNameRow}>
                    <Text style={styles.reviewName}>{review.reviewer_name}</Text>
                    {review.is_verified_purchase ? <Badge label="Verified purchase" tone="blue" /> : null}
                  </View>
                  <Text style={styles.reviewComment}>{review.comment}</Text>
                  {review.seller_reply ? (
                    <View style={styles.sellerReply}>
                      <Text style={styles.sellerReplyLabel}>Seller reply</Text>
                      <Text style={styles.sellerReplyText}>{review.seller_reply}</Text>
                    </View>
                  ) : null}
                </View>
              ))
            ) : (
              <Text style={styles.noReviews}>No reviews yet — be the first!</Text>
            )}

            {user && user.role === 'buyer' && !outOfStock && (
              <Button
                title="Write a review"
                variant="outline"
                icon={<Icon name="edit-3" size={15} color={COLORS.p700} />}
                style={{ marginTop: 12 }}
                onPress={() => setReviewModal(true)}
              />
            )}
          </View>

          {plant.related && plant.related.length > 0 ? (
            <View style={styles.section}>
              <SectionHeader title="You may also like" />
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.relatedRow}>
                {plant.related.map((p, i) => (
                  <View key={p.id} style={styles.relatedItem}>
                    <PlantCard plant={{ ...p, plant_id: p.id }} index={i} onPress={() => { setLoading(true); navigation.setParams({ plantId: p.id }); }} />
                  </View>
                ))}
              </ScrollView>
            </View>
          ) : null}

          <View style={{ height: 120 }} />
        </Animated.View>
      </ScrollView>

      <Animated.View entering={FadeInUp.delay(400)} style={styles.bottomBar}>
        <View style={styles.quantitySelector}>
          <TouchableOpacity style={styles.quantityButton} onPress={() => setQuantity(Math.max(1, quantity - 1))} accessibilityLabel="Decrease">
            <Icon name="minus" size={16} color={COLORS.p700} />
          </TouchableOpacity>
          <Text style={styles.quantityText}>{quantity}</Text>
          <TouchableOpacity
            style={styles.quantityButton}
            onPress={() => setQuantity(Math.min(plant.stock_quantity, quantity + 1))}
            disabled={quantity >= plant.stock_quantity}
            accessibilityLabel="Increase"
          >
            <Icon name="plus" size={16} color={COLORS.p700} />
          </TouchableOpacity>
        </View>

        <View style={styles.actionButtons}>
          <Button title="Add to Cart" variant="outline" style={styles.flexBtn} disabled={outOfStock} onPress={handleAddToCart} />
          <Button title="Order Now" style={styles.flexBtn} disabled={outOfStock} onPress={handleOrderNow} />
        </View>
      </Animated.View>

      <ReviewModal
        visible={reviewModal}
        rating={reviewRating}
        comment={reviewComment}
        setRating={setReviewRating}
        setComment={setReviewComment}
        submitting={submittingReview}
        onSubmit={submitReview}
        onClose={() => setReviewModal(false)}
      />
    </View>
  );
}

const ChipView = ({ text, danger = false }) => (
  <View style={[styles.chip, danger && { backgroundColor: '#FFE5E5' }]}>
    <Text style={[styles.chipText, danger && { color: COLORS.red }]}>{text}</Text>
  </View>
);

const CareCard = ({ icon, label, value }) => (
  <View style={styles.careCard}>
    <Icon name={icon} size={22} color={COLORS.p600} />
    <Text style={styles.careLabel}>{label}</Text>
    <Text style={styles.careValue}>{value}</Text>
  </View>
);

const ReviewModal = ({ visible, rating, comment, setRating, setComment, submitting, onSubmit, onClose }) => (
  <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
    <View style={styles.modalBackdrop}>
      <View style={styles.modalCard}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Rate this plant</Text>
          <TouchableOpacity onPress={onClose} accessibilityLabel="Close">
            <Icon name="x" size={20} color={COLORS.t3} />
          </TouchableOpacity>
        </View>
        <View style={styles.starPicker}>
          {[1, 2, 3, 4, 5].map((n) => (
            <TouchableOpacity key={n} onPress={() => setRating(n)}>
              <Icon name={n <= rating ? 'star' : 'star-outline'} size={32} color={n <= rating ? COLORS.yel : COLORS.t4} />
            </TouchableOpacity>
          ))}
        </View>
        <TextInput
          style={styles.reviewInput}
          placeholder="Share your experience..."
          placeholderTextColor={COLORS.t4}
          multiline
          value={comment}
          onChangeText={setComment}
        />
        <Button title="Submit Review" loading={submitting} onPress={onSubmit} style={{ marginTop: 8 }} />
      </View>
    </View>
  </Modal>
);

const formatDate = (iso) => {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch {
    return '';
  }
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.white },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.white },
  imageContainer: { width: '100%', height: 320, position: 'relative' },
  heroImage: { width: '100%', height: '100%' },
  heroPlaceholder: { width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center' },
  heroPlaceholderText: { fontFamily: FONTS.soraExtraBold, fontSize: 80, color: COLORS.p700 },
  topBadges: { position: 'absolute', bottom: 14, left: 14, flexDirection: 'row', gap: 6 },
  backButton: {
    position: 'absolute', top: 52, left: 16, width: 40, height: 40, borderRadius: 20,
    backgroundColor: COLORS.white, justifyContent: 'center', alignItems: 'center', ...SHADOWS.card,
  },
  wishlistButton: {
    position: 'absolute', top: 52, right: 16, width: 40, height: 40, borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.92)', justifyContent: 'center', alignItems: 'center', ...SHADOWS.card,
  },
  content: { padding: 18 },
  titleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  plantName: { fontFamily: FONTS.soraExtraBold, fontSize: 24, color: COLORS.t1, flexShrink: 1 },
  scientificName: { fontFamily: FONTS.nunito, fontSize: 13, fontStyle: 'italic', color: COLORS.t3, marginTop: 2 },
  gardenBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    borderWidth: 2, borderColor: COLORS.p700, borderRadius: RADII.btn,
    paddingHorizontal: 12, paddingVertical: 7,
  },
  gardenBtnActive: { backgroundColor: COLORS.p700 },
  gardenBtnText: { fontFamily: FONTS.nunitoBold, fontSize: 12, color: COLORS.p700 },
  gardenBtnTextActive: { color: COLORS.white },
  priceRow: { marginTop: 10 },
  ratingRow: { marginTop: 6 },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 14 },
  chip: { backgroundColor: COLORS.p100, paddingHorizontal: 12, paddingVertical: 6, borderRadius: RADII.chip },
  chipText: { fontFamily: FONTS.nunitoBold, fontSize: 12, color: COLORS.p700 },
  healthSection: { marginTop: 18 },
  sectionLabel: { fontFamily: FONTS.nunitoBold, fontSize: 12, color: COLORS.t2, marginBottom: 6 },
  healthBar: { height: 8, backgroundColor: COLORS.bg, borderRadius: 4, overflow: 'hidden' },
  healthFill: { height: '100%', borderRadius: 4 },
  healthScore: { fontFamily: FONTS.soraBold, fontSize: 14, marginTop: 4 },
  section: { marginTop: 20 },
  sectionTitle: { fontFamily: FONTS.soraBold, fontSize: 16, color: COLORS.t1, marginBottom: 12 },
  description: { fontFamily: FONTS.nunito, fontSize: 14, color: COLORS.t2, lineHeight: 22 },
  careGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  careCard: {
    width: '48%', backgroundColor: COLORS.white, borderRadius: 16, padding: 14, alignItems: 'center',
    borderWidth: 1, borderColor: COLORS.p100, gap: 4,
  },
  careLabel: { fontFamily: FONTS.nunito, fontSize: 11, color: COLORS.t3, marginTop: 2 },
  careValue: { fontFamily: FONTS.nunitoBold, fontSize: 13, color: COLORS.t2 },
  sellerCard: {
    backgroundColor: COLORS.white, borderRadius: 16, padding: 14,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    borderWidth: 1, borderColor: COLORS.p100,
  },
  sellerNameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sellerName: { fontFamily: FONTS.nunitoBold, fontSize: 14, color: COLORS.t1 },
  sellerCity: { fontFamily: FONTS.nunito, fontSize: 12, color: COLORS.t3, marginTop: 2 },
  reviewsHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  reviewsCount: { fontFamily: FONTS.nunitoBold, fontSize: 12, color: COLORS.t3 },
  reviewCard: { backgroundColor: COLORS.bg, borderRadius: 12, padding: 12, marginBottom: 10 },
  reviewHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  reviewNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  reviewName: { fontFamily: FONTS.nunitoBold, fontSize: 13, color: COLORS.t1 },
  reviewDate: { fontFamily: FONTS.nunito, fontSize: 11, color: COLORS.t4 },
  reviewComment: { fontFamily: FONTS.nunito, fontSize: 13, color: COLORS.t2, lineHeight: 18 },
  sellerReply: {
    backgroundColor: COLORS.p50, borderRadius: 8, padding: 8, marginTop: 8, borderLeftWidth: 3, borderLeftColor: COLORS.p400,
  },
  sellerReplyLabel: { fontFamily: FONTS.nunitoBold, fontSize: 11, color: COLORS.p600, marginBottom: 2 },
  sellerReplyText: { fontFamily: FONTS.nunito, fontSize: 12, color: COLORS.t2 },
  noReviews: { fontFamily: FONTS.nunito, fontSize: 14, color: COLORS.t3, textAlign: 'center', paddingVertical: 20 },
  relatedRow: { gap: 12, paddingRight: 12 },
  relatedItem: { width: 150 },
  bottomBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: COLORS.white, borderTopWidth: 1, borderTopColor: COLORS.border,
    padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12,
  },
  quantitySelector: {
    flexDirection: 'row', alignItems: 'center', borderWidth: 2, borderColor: COLORS.p100,
    borderRadius: RADII.btn, paddingHorizontal: 8,
  },
  quantityButton: { width: 32, height: 32, justifyContent: 'center', alignItems: 'center' },
  quantityText: { fontFamily: FONTS.soraBold, fontSize: 16, color: COLORS.t1, marginHorizontal: 12 },
  actionButtons: { flex: 1, flexDirection: 'row', gap: 8 },
  flexBtn: { flex: 1 },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 24 },
  modalCard: { backgroundColor: COLORS.white, borderRadius: 20, padding: 20 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  modalTitle: { fontFamily: FONTS.soraBold, fontSize: 18, color: COLORS.t1 },
  starPicker: { flexDirection: 'row', gap: 8, justifyContent: 'center', marginVertical: 16 },
  reviewInput: {
    fontFamily: FONTS.nunito, fontSize: 14, color: COLORS.t1,
    borderWidth: 1.5, borderColor: COLORS.border, borderRadius: RADII.btn,
    padding: 12, minHeight: 90, textAlignVertical: 'top',
  },
});
