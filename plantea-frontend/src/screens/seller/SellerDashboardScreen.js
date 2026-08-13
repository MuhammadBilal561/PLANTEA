import React, { useState, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, FlatList, ActivityIndicator, Image } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import Animated, { FadeInDown, FadeInUp, ZoomIn } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import Toast from 'react-native-toast-message';
import { useAuth } from '../../context/AuthContext';
import ApiService from '../../services/api';
import { Icon, Badge, Rating } from '../../components/ui';
import { COLORS, FONTS, RADII, SHADOWS } from '../../theme';

export default function SellerDashboardScreen() {
  const { user } = useAuth();
  const [orders, setOrders] = useState([]);
  const [listings, setListings] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const inFlightRef = useRef(false);
  const [selectedFilter, setSelectedFilter] = useState('All');
  const [stats, setStats] = useState({
    weeklyEarnings: 0,
    totalOrders: 0,
    activeListings: 0,
    rating: 0,
  });

  const filters = ['All', 'Pending', 'Confirmed', 'Picked Up', 'Delivered'];
  const pollInterval = useRef(null);

  useFocusEffect(
    useCallback(() => {
      loadData();

      // Real-time order sync (polling)
      pollInterval.current = setInterval(() => {
        loadData(false); // Silent reload
      }, 10000);

      return () => {
        if (pollInterval.current) clearInterval(pollInterval.current);
      };
    }, [])
  );

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  const loadData = async (showLoading = true) => {
  if (inFlightRef.current) return;
  inFlightRef.current = true;

  if (showLoading) setLoading(true);
    try {
      const [ordersRes, listingsRes, analyticsRes] = await Promise.all([
        ApiService.getOrders(),
        ApiService.getMyListings(),
        ApiService.getSellerAnalytics(),
      ]);

      if (!ordersRes.success || !listingsRes.success) {
        throw new Error('Failed to load dashboard data');
      }

      const orders = ordersRes.data.orders || [];
      const listings = listingsRes.data.plants || [];

      const normalizedOrders = orders.map((row) => ({
        ...row,
        order_id: row.order_id || row.id,
        created_at: row.created_at,
        buyer_name: row.buyer_name,
        buyer_phone: row.buyer_phone,
        plant_name: row.plant_name,
        plant_image: row.plant_image,
        price_at_order: row.price_at_order,
        total_amount: row.total_amount,
        delivery_fee_pkr: row.delivery_fee_pkr,
      }));

      const normalizedListings = listings.map((row) => ({
        ...row,
        plant_id: row.plant_id || row.id,
        image_url: ApiService.absoluteUrl(row.image_url),
      }));
  setOrders(normalizedOrders);
  setListings(normalizedListings);

  if (analyticsRes.success) {
    setAnalytics(analyticsRes.data);
    calculateStatsFromAnalytics(analyticsRes.data, normalizedListings.length);
  } else {
    calculateStats(normalizedOrders, normalizedListings.length);
  }
    } catch (error) {
      if (showLoading) {
        Toast.show({
          type: 'error',
          text1: 'Error',
          text2: 'Failed to load dashboard data',
        });
      }
    } finally {
  // Only hide the full-screen loader for the initial load.
  if (showLoading) setLoading(false);
  inFlightRef.current = false;
    }
  };

  const calculateStatsFromAnalytics = (analyticsData, listingsCountOverride) => {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const weeklyRevenue = (analyticsData.revenue_chart || [])
      .filter((d) => new Date(d.date) >= sevenDaysAgo)
      .reduce((sum, d) => sum + (Number(d.revenue) || 0), 0);

    const avgRating = analyticsData.top_plants?.length
      ? analyticsData.top_plants.reduce((sum, p) => sum + (Number(p.rating_avg) || 0), 0) / analyticsData.top_plants.length
      : 0;

    setStats({
      weeklyEarnings: weeklyRevenue || analyticsData.totals?.revenue || 0,
      totalOrders: analyticsData.totals?.total_orders || 0,
      activeListings:
        analyticsData.plant_summary?.active_listings != null
          ? analyticsData.plant_summary.active_listings
          : listingsCountOverride,
      rating: avgRating,
    });
  };

  const calculateStats = (allOrders, listingsCountOverride) => {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const weeklyEarnings = allOrders
      .filter(o => o.status === 'delivered' && new Date(o.created_at) >= sevenDaysAgo)
      .reduce((sum, o) => sum + (o.price_at_order - (o.commission_pkr || 0)), 0);

    setStats({
      weeklyEarnings,
      totalOrders: allOrders.length,
      activeListings:
        typeof listingsCountOverride === 'number' ? listingsCountOverride : listings.length,
      rating: 0,
    });
  };

  const getFilteredOrders = () => {
    if (selectedFilter === 'All') return orders;
    const statusMap = {
      'Pending': 'pending',
  'Confirmed': 'confirmed',
      'Picked Up': 'picked_up',
      'Delivered': 'delivered',
    };
    return orders.filter(o => o.status === statusMap[selectedFilter]);
  };

  const handleOrderAction = async (orderId, newStatus) => {
    try {
      const response = await ApiService.updateOrderStatus(orderId, newStatus);
      if (!response.success) throw new Error(response.message || 'Failed to update order');

      Toast.show({
        type: 'success',
        text1: 'Success',
        text2: `Order ${newStatus}`,
      });
      loadData();
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: error.message || 'Failed to update order',
      });
    }
  };

  const getStatusBadgeStyle = (status) => {
    const styles = {
      pending: { bg: COLORS.yel, text: 'Pending' },
      confirmed: { bg: '#3498DB', text: 'Confirmed' },
      picked_up: { bg: '#9B59B6', text: 'Picked Up' },
      in_transit: { bg: COLORS.org, text: 'In Transit' },
      delivered: { bg: COLORS.p700, text: 'Delivered' },
      cancelled: { bg: COLORS.red, text: 'Cancelled' },
    };
    return styles[status] || { bg: COLORS.t4, text: status };
  };

  const renderOrderCard = ({ item, index }) => {
    const badge = getStatusBadgeStyle(item.status);

    return (
      <Animated.View entering={FadeInUp.delay(index * 100).springify()} style={styles.orderCard}>
        <View style={styles.orderTop}>
          <View style={{ flex: 1 }}>
            <Text style={styles.orderPlantName}>{item.plant_name || 'Plant'}</Text>
            <Text style={styles.orderBuyerName}>Buyer: {item.buyer_name || 'Unknown'}</Text>
          </View>
          <Badge label={badge.text} tone={badgeTone(item.status)} />
        </View>
        <Text style={styles.orderAmount}>Rs. {item.price_at_order || item.total_amount}</Text>

        {item.status === 'pending' && (
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handleOrderAction(item.order_id, 'confirmed')}
          >
            <Text style={styles.actionButtonText}>Confirm Order</Text>
          </TouchableOpacity>
        )}
      </Animated.View>
    );
  };

  const badgeTone = (status) => ({
    pending: 'orange',
    confirmed: 'blue',
    picked_up: 'gold',
    in_transit: 'neutral',
    delivered: 'green',
    cancelled: 'red',
  }[status] || 'neutral');

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.p700} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Animated.View entering={FadeInDown.duration(600)}>
        <LinearGradient colors={[COLORS.p800, COLORS.p700]} style={styles.header}>
          <Text style={styles.greeting}>{getGreeting()}</Text>
          <Text style={styles.name}>{user?.full_name || 'Seller'}</Text>
        </LinearGradient>
      </Animated.View>

      <ScrollView style={styles.content}>
        <View style={styles.statsGrid}>
          <Animated.View entering={ZoomIn.delay(100)} style={styles.statCard}>
            <Text style={styles.statValue}>Rs. {stats.weeklyEarnings}</Text>
            <Text style={styles.statLabel}>Revenue</Text>
          </Animated.View>
          <Animated.View entering={ZoomIn.delay(200)} style={styles.statCard}>
            <Text style={styles.statValue}>{stats.totalOrders}</Text>
            <Text style={styles.statLabel}>Total Orders</Text>
          </Animated.View>
          <Animated.View entering={ZoomIn.delay(300)} style={styles.statCard}>
            <Text style={styles.statValue}>{stats.activeListings}</Text>
            <Text style={styles.statLabel}>Active Listings</Text>
          </Animated.View>
          <Animated.View entering={ZoomIn.delay(400)} style={styles.statCard}>
            <Text style={styles.statValue}>{stats.rating ? stats.rating.toFixed(1) : '—'}</Text>
            <Text style={styles.statLabel}>Avg Rating</Text>
          </Animated.View>
        </View>

        {analytics?.top_plants?.length > 0 && (
          <View style={styles.topPlantsSection}>
            <Text style={styles.sectionTitle}>Top Plants</Text>
            {analytics.top_plants.map((plant, i) => (
              <View key={plant.id} style={styles.topPlantRow}>
                <Text style={styles.rank}>#{i + 1}</Text>
                {plant.image_url ? (
                  <Image source={{ uri: ApiService.absoluteUrl(plant.image_url) }} style={styles.topPlantImage} resizeMode="cover" />
                ) : (
                  <LinearGradient colors={['#D6F0E2', '#A8DDB5']} style={styles.topPlantImage}>
                    <Text style={styles.topPlantInitial}>{plant.name?.charAt(0)?.toUpperCase() || 'P'}</Text>
                  </LinearGradient>
                )}
                <View style={{ flex: 1 }}>
                  <Text style={styles.topPlantName} numberOfLines={1}>{plant.name}</Text>
                  <Rating rating={plant.rating_avg} size={10} showValue={false} count={plant.review_count} />
                </View>
                <View style={styles.topPlantStats}>
                  <Text style={styles.topPlantSold}>{plant.sold_count || 0} sold</Text>
                  <Text style={styles.topPlantViews}>{plant.views_count || 0} views</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filtersScroll}
          contentContainerStyle={styles.filtersContent}
        >
          {filters.map((filter) => (
            <TouchableOpacity
              key={filter}
              style={[
                styles.filterChip,
                selectedFilter === filter && styles.filterChipSelected,
              ]}
              onPress={() => setSelectedFilter(filter)}
            >
              <Text style={[
                styles.filterChipText,
                selectedFilter === filter && styles.filterChipTextSelected,
              ]}>
                {filter}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <FlatList
          data={getFilteredOrders()}
          renderItem={renderOrderCard}
          keyExtractor={(item) => item.order_id}
          scrollEnabled={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No orders yet</Text>
            </View>
          }
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.bg,
  },
  header: {
    padding: 20,
    paddingTop: 60,
    paddingBottom: 22,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  greeting: {
    fontFamily: FONTS.nunito,
    color: COLORS.p300,
    fontSize: 12,
    fontWeight: '600',
  },
  name: {
    fontFamily: FONTS.soraExtraBold,
    fontSize: 22,
    color: COLORS.white,
    marginTop: 2,
  },
  content: {
    flex: 1,
    padding: 18,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 18,
  },
  statCard: {
    width: '48%',
    backgroundColor: COLORS.white,
    borderRadius: RADII.card,
    padding: 16,
    ...SHADOWS.card,
  },
  statValue: {
    fontFamily: FONTS.soraExtraBold,
    fontSize: 20,
    color: COLORS.p700,
  },
  statLabel: {
    fontFamily: FONTS.nunito,
    fontSize: 12,
    color: COLORS.t3,
    marginTop: 4,
  },
  filtersScroll: {
    marginBottom: 16,
  },
  filtersContent: {
    gap: 8,
  },
  topPlantsSection: {
    backgroundColor: COLORS.white,
    borderRadius: RADII.card,
    padding: 16,
    marginBottom: 16,
    ...SHADOWS.card,
  },
  sectionTitle: {
    fontFamily: FONTS.soraBold,
    fontSize: 15,
    color: COLORS.t1,
    marginBottom: 12,
  },
  topPlantRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  rank: {
    fontFamily: FONTS.soraBold,
    fontSize: 13,
    color: COLORS.t3,
    width: 26,
  },
  topPlantImage: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topPlantInitial: {
    fontFamily: FONTS.soraExtraBold,
    fontSize: 16,
    color: COLORS.p700,
  },
  topPlantName: {
    fontFamily: FONTS.nunitoBold,
    fontSize: 13,
    color: COLORS.t1,
  },
  topPlantStats: {
    alignItems: 'flex-end',
  },
  topPlantSold: {
    fontFamily: FONTS.nunitoBold,
    fontSize: 11,
    color: COLORS.p700,
  },
  topPlantViews: {
    fontFamily: FONTS.nunito,
    fontSize: 10,
    color: COLORS.t3,
    marginTop: 2,
  },
  filterChip: {
    backgroundColor: COLORS.white,
    borderWidth: 2,
    borderColor: COLORS.p100,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: RADII.chip,
    marginRight: 8,
  },
  filterChipSelected: {
    backgroundColor: COLORS.p700,
    borderColor: COLORS.p700,
  },
  filterChipText: {
    fontFamily: FONTS.nunitoBold,
    fontSize: 13,
    color: COLORS.t2,
  },
  filterChipTextSelected: {
    color: COLORS.white,
  },
  orderCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    ...SHADOWS.card,
  },
  orderPlantName: {
    fontFamily: FONTS.soraBold,
    fontSize: 14,
    color: COLORS.t1,
  },
  orderBuyerName: {
    fontFamily: FONTS.nunito,
    fontSize: 12,
    color: COLORS.t3,
    marginTop: 4,
  },
  orderAmount: {
    fontFamily: FONTS.soraExtraBold,
    fontSize: 16,
    color: COLORS.p700,
    marginTop: 6,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: RADII.chip,
    marginTop: 8,
  },
  statusBadgeText: {
    fontFamily: FONTS.nunitoBold,
    fontSize: 11,
    color: COLORS.white,
  },
  actionButton: {
    backgroundColor: COLORS.p700,
    borderRadius: RADII.btn,
    paddingVertical: 10,
    alignItems: 'center',
    marginTop: 10,
  },
  actionButtonText: {
    fontFamily: FONTS.soraBold,
    fontSize: 13,
    color: COLORS.white,
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontFamily: FONTS.nunito,
    fontSize: 14,
    color: COLORS.t3,
  },
});
