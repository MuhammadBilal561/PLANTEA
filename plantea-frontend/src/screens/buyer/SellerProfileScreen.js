import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, FlatList } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import ApiService from '../../services/api';
import { Icon, Badge, Rating, EmptyState } from '../../components/ui';
import PlantCard from '../../components/PlantCard';
import { COLORS, FONTS, RADII, SHADOWS } from '../../theme';

export default function SellerProfileScreen({ navigation, route }) {
  const { sellerId } = route.params;
  const [profile, setProfile] = useState(null);
  const [reviews, setReviews] = useState(null);
  const [plants, setPlants] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAll();
  }, [sellerId]);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [profileRes, reviewsRes, plantsRes] = await Promise.all([
        ApiService.getPublicProfile(sellerId),
        ApiService.getSellerReviews(sellerId),
        ApiService.getPlants({ seller: sellerId, sort: 'popular' }),
      ]);
      if (profileRes.success) setProfile(profileRes.data.user);
      if (reviewsRes.success && reviewsRes.data) setReviews(reviewsRes.data);
      if (plantsRes.success) setPlants(plantsRes.data.plants || []);
    } catch (error) {
    } finally {
      setLoading(false);
    }
  };

  const initial = profile?.full_name?.charAt(0)?.toUpperCase() || 'S';

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#0B2E1A', '#276044']} style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} accessibilityLabel="Back">
          <Icon name="arrow-left" size={20} color={COLORS.white} />
        </TouchableOpacity>

        <View style={styles.avatar}>
          {profile?.avatar_url ? (
            <ImageCompat uri={profile.avatar_url} />
          ) : (
            <Text style={styles.avatarText}>{initial}</Text>
          )}
        </View>

        <View style={styles.sellerInfo}>
          <View style={styles.nameRow}>
            <Text style={styles.sellerName}>{profile?.full_name || 'Seller'}</Text>
            {profile?.is_verified ? <Badge label="Verified Seller" tone="green" /> : null}
          </View>
          {profile?.city ? <Text style={styles.sellerCity}>{profile.city}</Text> : null}
          {profile?.bio ? <Text style={styles.sellerBio} numberOfLines={2}>{profile.bio}</Text> : null}
        </View>

        {reviews && reviews.rating_count > 0 ? (
          <View style={styles.ratingPill}>
            <Rating rating={reviews.rating_avg} size={12} count={reviews.rating_count} />
          </View>
        ) : null}
      </LinearGradient>

      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.statsRow}>
          <StatBox label="Listings" value={String(plants.length)} />
          <StatBox label="Reviews" value={String(reviews?.rating_count || 0)} />
          <StatBox
            label="Rating"
            value={reviews?.rating_avg ? reviews.rating_avg.toFixed(1) : '—'}
          />
        </View>

        {plants.length > 0 ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Plants by {profile?.full_name?.split(' ')[0] || 'this seller'}</Text>
            <View style={styles.grid}>
              {plants.map((plant, i) => (
                <View key={plant.plant_id} style={styles.gridItem}>
                  <PlantCard plant={plant} index={i} onPress={() => navigation.navigate('PlantDetail', { plantId: plant.plant_id })} />
                </View>
              ))}
            </View>
          </View>
        ) : null}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Seller reviews</Text>
          {!reviews || reviews.reviews.length === 0 ? (
            <EmptyState icon="message-circle" title="No reviews yet" message="This seller hasn't been reviewed yet." />
          ) : (
            reviews.reviews.map((review, index) => (
              <View key={review.id || index} style={styles.reviewCard}>
                <View style={styles.reviewHeader}>
                  <Rating rating={review.rating} size={11} showValue={false} />
                  <Text style={styles.reviewDate}>{formatDate(review.created_at)}</Text>
                </View>
                <View style={styles.reviewNameRow}>
                  <Text style={styles.reviewName}>{review.buyer_name}</Text>
                  {review.is_verified_purchase ? <Badge label="Verified purchase" tone="blue" /> : null}
                </View>
                <Text style={styles.reviewComment}>{review.comment}</Text>
                <Text style={styles.reviewPlant}>{review.plant_name}</Text>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const ImageCompat = ({ uri }) => (
  <View style={styles.avatarImage}>
    <Icon name="user" size={28} color={COLORS.p700} />
  </View>
);

const StatBox = ({ label, value }) => (
  <View style={styles.statBox}>
    <Text style={styles.statValue}>{value}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </View>
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
  container: { flex: 1, backgroundColor: COLORS.bg },
  header: {
    paddingTop: 56,
    paddingHorizontal: 20,
    paddingBottom: 22,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 14,
  },
  avatar: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: 'rgba(255,255,255,0.92)',
    alignItems: 'center', justifyContent: 'center',
    alignSelf: 'center',
  },
  avatarText: { fontFamily: FONTS.soraExtraBold, fontSize: 30, color: COLORS.p700 },
  avatarImage: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center' },
  sellerInfo: { alignItems: 'center', marginTop: 12 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sellerName: { fontFamily: FONTS.soraExtraBold, fontSize: 20, color: COLORS.white },
  sellerCity: { fontFamily: FONTS.nunito, fontSize: 13, color: COLORS.p300, marginTop: 3 },
  sellerBio: { fontFamily: FONTS.nunito, fontSize: 12, color: COLORS.p300, textAlign: 'center', marginTop: 8, paddingHorizontal: 30 },
  ratingPill: {
    alignSelf: 'center', marginTop: 10,
    backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: RADII.chip,
    paddingHorizontal: 12, paddingVertical: 5,
  },
  statsRow: {
    flexDirection: 'row', marginHorizontal: 18, marginTop: -18,
    backgroundColor: COLORS.white, borderRadius: RADII.card,
    ...SHADOWS.card, paddingVertical: 14, marginBottom: 8,
  },
  statBox: { flex: 1, alignItems: 'center' },
  statValue: { fontFamily: FONTS.soraBold, fontSize: 18, color: COLORS.t1 },
  statLabel: { fontFamily: FONTS.nunito, fontSize: 11, color: COLORS.t3, marginTop: 2 },
  section: { padding: 18 },
  sectionTitle: { fontFamily: FONTS.soraBold, fontSize: 16, color: COLORS.t1, marginBottom: 12 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 12 },
  gridItem: { width: '47%' },
  reviewCard: { backgroundColor: COLORS.white, borderRadius: RADII.card, padding: 12, marginBottom: 10, borderWidth: 1, borderColor: COLORS.border },
  reviewHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  reviewNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  reviewName: { fontFamily: FONTS.nunitoBold, fontSize: 13, color: COLORS.t1 },
  reviewDate: { fontFamily: FONTS.nunito, fontSize: 11, color: COLORS.t4 },
  reviewComment: { fontFamily: FONTS.nunito, fontSize: 13, color: COLORS.t2, lineHeight: 18 },
  reviewPlant: { fontFamily: FONTS.nunitoBold, fontSize: 11, color: COLORS.p600, marginTop: 6 },
});
