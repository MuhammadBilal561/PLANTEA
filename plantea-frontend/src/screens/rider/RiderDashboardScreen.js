import React, { useState, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, FlatList, ActivityIndicator, Dimensions } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import Animated, { FadeInDown, FadeInUp, ZoomIn } from 'react-native-reanimated';
import MapView, { Marker } from '../../components/NativeMap';
import { LinearGradient } from 'expo-linear-gradient';
import Toast from 'react-native-toast-message';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabaseClient';
import { COLORS, FONTS, RADII, SHADOWS } from '../../theme';

const { width } = Dimensions.get('window');

export default function RiderDashboardScreen() {
  const { user } = useAuth();
  const [availableOrders, setAvailableOrders] = useState([]);
  const [myDeliveries, setMyDeliveries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    today: 0,
    thisWeek: 0,
  });
  const [viewMode, setViewMode] = useState('map'); // 'list' or 'map'
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

  const loadData = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      const {
        data: { user: authUser },
        error: authError,
      } = await supabase.auth.getUser();
      if (authError) throw authError;
      if (!authUser) throw new Error('Not logged in');

      const [availableQ, myQ] = await Promise.all([
        supabase
          .from('orders')
          .select(
            `
            id, status, delivery_fee_pkr, placed_at, created_at,
            delivery_address_snapshot,
            seller:profiles!seller_id (id, full_name, city),
            items:order_items (
              id, plant_name_snapshot,
              plant:plants!plant_id (id, name, city)
            )
          `
          )
          .eq('status', 'seller_confirmed')
          .is('rider_id', null)
          .order('placed_at', { ascending: false }),

        supabase
          .from('orders')
          .select(
            `
            id, status, delivery_fee_pkr, placed_at, created_at,
            delivery_address_snapshot,
            buyer:profiles!buyer_id (id, full_name, phone),
            items:order_items (
              id, plant_name_snapshot,
              plant:plants!plant_id (id, name, city)
            )
          `
          )
          .eq('rider_id', authUser.id)
          .order('placed_at', { ascending: false }),
      ]);

      if (availableQ.error) throw availableQ.error;
      if (myQ.error) throw myQ.error;

      const normalize = (row) => ({
        ...row,
        order_id: row.id,
        created_at: row.placed_at || row.created_at,
        plant_name: row.items?.[0]?.plant_name_snapshot || row.items?.[0]?.plant?.name,
        seller_city: row.seller?.city,
        buyer_name: row.buyer?.full_name,
        buyer_phone: row.buyer?.phone,
        delivery_address: row.delivery_address_snapshot?.address_line1 || row.delivery_address_snapshot?.address_line2 || row.delivery_address_snapshot?.city,
      });

      const available = (availableQ.data || []).map(normalize);
      const mineAll = (myQ.data || []).map(normalize);
      const mineActive = mineAll.filter((o) => o.status !== 'delivered' && o.status !== 'cancelled');

      setAvailableOrders(available);
      setMyDeliveries(mineActive);
      calculateEarnings(mineAll);
    } catch (error) {
      if (showLoading) {
        Toast.show({
          type: 'error',
          text1: 'Error',
          text2: 'Failed to load deliveries',
        });
      }
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  const calculateEarnings = (allOrders) => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(now);
    weekStart.setDate(weekStart.getDate() - 7);

  const myDelivered = allOrders.filter(o => o.status === 'delivered');
    
    const todayEarnings = myDelivered
      .filter(o => new Date(o.created_at) >= todayStart)
      .reduce((sum, o) => sum + ((o.delivery_fee_pkr || 150) * 0.8), 0);
    
    const weekEarnings = myDelivered
      .filter(o => new Date(o.created_at) >= weekStart)
      .reduce((sum, o) => sum + ((o.delivery_fee_pkr || 150) * 0.8), 0);

    setStats({ today: todayEarnings, thisWeek: weekEarnings });
  };

  const handleAcceptOrder = async (orderId) => {
    try {
      const {
        data: { user: authUser },
        error: authError,
      } = await supabase.auth.getUser();
      if (authError) throw authError;
      if (!authUser) throw new Error('Not logged in');

      const { error } = await supabase
        .from('orders')
        .update({ rider_id: authUser.id, status: 'assigned_rider' })
        .eq('id', orderId);
      if (error) throw error;

      Toast.show({
        type: 'success',
        text1: 'Order Accepted',
        text2: 'Delivery assigned to you',
      });
      loadData();
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: error.message || 'Failed to accept order',
      });
    }
  };

  const handleUpdateStatus = async (orderId, newStatus) => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({ status: newStatus, delivered_at: newStatus === 'delivered' ? new Date().toISOString() : null })
        .eq('id', orderId);
      if (error) throw error;

      Toast.show({
        type: 'success',
        text1: 'Status Updated',
        text2: `Order marked as ${newStatus}`,
      });
      loadData();
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: error.message || 'Failed to update status',
      });
    }
  };

  const getStatusBadgeStyle = (status) => {
    const styles = {
  seller_confirmed: { bg: '#3498DB', text: 'Confirmed' },
  assigned_rider: { bg: COLORS.org, text: 'Assigned' },
      picked_up: { bg: '#9B59B6', text: 'Picked Up' },
      in_transit: { bg: COLORS.org, text: 'In Transit' },
    };
    return styles[status] || { bg: COLORS.t4, text: status };
  };

  const renderAvailableOrder = ({ item, index }) => {
    const estimatedEarnings = ((item.delivery_fee_pkr || 150) * 0.8).toFixed(0);
    
    return (
      <Animated.View entering={FadeInUp.delay(index * 100).springify()} style={styles.orderCard}>
        <Text style={styles.orderPlantName}>{item.plant_name || 'Plant'}</Text>
        <Text style={styles.orderDetail}>Pickup: {item.seller_city || 'City'}</Text>
        <Text style={styles.orderDetail} numberOfLines={1}>
          Delivery: {item.delivery_address?.substring(0, 40) || 'Address'}...
        </Text>
        <Text style={styles.orderEarnings}>Earn: Rs. {estimatedEarnings}</Text>
        
        <TouchableOpacity
          style={styles.acceptButton}
          onPress={() => handleAcceptOrder(item.order_id)}
        >
          <Text style={styles.acceptButtonText}>Accept</Text>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  const renderMyDelivery = ({ item, index }) => {
    const badge = getStatusBadgeStyle(item.status);
    
    return (
      <Animated.View entering={FadeInUp.delay(index * 100).springify()} style={styles.orderCard}>
        <Text style={styles.orderPlantName}>{item.plant_name || 'Plant'}</Text>
        <Text style={styles.orderDetail}>Buyer: {item.buyer_name || 'Unknown'}</Text>
        <Text style={styles.orderDetail} numberOfLines={2}>
          {item.delivery_address || 'No address'}
        </Text>
        
        <View style={[styles.statusBadge, { backgroundColor: badge.bg }]}>
          <Text style={styles.statusBadgeText}>{badge.text}</Text>
        </View>

  {item.status === 'assigned_rider' && (
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handleUpdateStatus(item.order_id, 'picked_up')}
          >
            <Text style={styles.actionButtonText}>Mark Picked Up</Text>
          </TouchableOpacity>
        )}

        {item.status === 'picked_up' && (
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handleUpdateStatus(item.order_id, 'in_transit')}
          >
            <Text style={styles.actionButtonText}>Mark In Transit</Text>
          </TouchableOpacity>
        )}

        {item.status === 'in_transit' && (
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handleUpdateStatus(item.order_id, 'delivered')}
          >
            <Text style={styles.actionButtonText}>Mark Delivered</Text>
          </TouchableOpacity>
        )}
      </Animated.View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.org} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Animated.View entering={FadeInDown.duration(600)}>
        <LinearGradient colors={[COLORS.p800, COLORS.p700]} style={styles.header}>
          <Text style={styles.greeting}>Rider Dashboard</Text>
          <Text style={styles.name}>{user?.full_name || 'Rider'}</Text>
        </LinearGradient>
      </Animated.View>

      <ScrollView style={styles.content}>
        <View style={styles.statsRow}>
          <Animated.View entering={ZoomIn.delay(100)} style={styles.statCard}>
            <Text style={styles.statValue}>Rs. {stats.today}</Text>
            <Text style={styles.statLabel}>Earnings Today</Text>
          </Animated.View>
          <Animated.View entering={ZoomIn.delay(200)} style={styles.statCard}>
            <Text style={styles.statValue}>Rs. {stats.thisWeek}</Text>
            <Text style={styles.statLabel}>This Week</Text>
          </Animated.View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Available Deliveries</Text>
            <View style={styles.toggleContainer}>
              <TouchableOpacity onPress={() => setViewMode('list')} style={[styles.toggleBtn, viewMode === 'list' && styles.toggleActive]}>
                <Text style={[styles.toggleText, viewMode === 'list' && styles.toggleTextActive]}>List</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setViewMode('map')} style={[styles.toggleBtn, viewMode === 'map' && styles.toggleActive]}>
                <Text style={[styles.toggleText, viewMode === 'map' && styles.toggleTextActive]}>Map</Text>
              </TouchableOpacity>
            </View>
          </View>
          
          {availableOrders.length > 0 ? (
            viewMode === 'map' ? (
              <View style={styles.mapContainer}>
                <MapView
                  style={styles.map}
                  initialRegion={{
                    latitude: 31.4811,
                    longitude: 74.303,
                    latitudeDelta: 0.08,
                    longitudeDelta: 0.08,
                  }}
                >
                  {availableOrders.map((order, index) => (
                    <Marker
                      key={order.order_id}
                      coordinate={{
                        latitude: 31.4811 + (Math.random() - 0.5) * 0.05,
                        longitude: 74.303 + (Math.random() - 0.5) * 0.05
                      }}
                      title={`Order #${order.order_id?.slice(0,6)}`}
                      description={`Rs. ${((order.delivery_fee_pkr || 150) * 0.8).toFixed(0)} - Tap to accept`}
                      onCalloutPress={() => handleAcceptOrder(order.order_id)}
                    >
                      <View style={styles.markerBadge}>
                        <Text style={styles.markerText}>Rs.{((order.delivery_fee_pkr || 150) * 0.8).toFixed(0)}</Text>
                      </View>
                    </Marker>
                  ))}
                </MapView>
              </View>
            ) : (
              <FlatList
                data={availableOrders}
                renderItem={renderAvailableOrder}
                keyExtractor={(item) => item.order_id}
                scrollEnabled={false}
              />
            )
          ) : (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No available deliveries</Text>
            </View>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>My Active Deliveries</Text>
          {myDeliveries.length > 0 ? (
            <FlatList
              data={myDeliveries}
              renderItem={renderMyDelivery}
              keyExtractor={(item) => item.order_id}
              scrollEnabled={false}
            />
          ) : (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No active deliveries</Text>
            </View>
          )}
        </View>
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
    color: 'rgba(255, 255, 255, 0.75)',
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
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderRadius: RADII.card,
    padding: 16,
    ...SHADOWS.card,
  },
  statValue: {
    fontFamily: FONTS.soraExtraBold,
    fontSize: 18,
    color: COLORS.org,
  },
  statLabel: {
    fontFamily: FONTS.nunito,
    fontSize: 12,
    color: COLORS.t3,
    marginTop: 4,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontFamily: FONTS.soraBold,
    fontSize: 16,
    color: COLORS.t1,
    marginBottom: 12,
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
  orderDetail: {
    fontFamily: FONTS.nunito,
    fontSize: 12,
    color: COLORS.t3,
    marginTop: 4,
  },
  orderEarnings: {
    fontFamily: FONTS.soraExtraBold,
    fontSize: 15,
    color: COLORS.org,
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
  acceptButton: {
    backgroundColor: COLORS.org,
    borderRadius: RADII.btn,
    paddingVertical: 10,
    alignItems: 'center',
    marginTop: 10,
  },
  acceptButtonText: {
    fontFamily: FONTS.soraBold,
    fontSize: 13,
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
    padding: 20,
    alignItems: 'center',
  },
  emptyText: {
    fontFamily: FONTS.nunito,
    fontSize: 14,
    color: COLORS.t3,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  toggleContainer: {
    flexDirection: 'row',
    backgroundColor: COLORS.p50,
    borderRadius: 8,
    padding: 4,
  },
  toggleBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  toggleActive: {
    backgroundColor: COLORS.white,
    ...SHADOWS.card,
  },
  toggleText: {
    fontFamily: FONTS.nunitoBold,
    fontSize: 12,
    color: COLORS.t3,
  },
  toggleTextActive: {
    color: COLORS.p700,
  },
  mapContainer: {
    height: 300,
    borderRadius: RADII.card,
    overflow: 'hidden',
    ...SHADOWS.card,
  },
  map: {
    width: '100%',
    height: '100%',
  },
  markerBadge: {
    backgroundColor: COLORS.org,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: COLORS.white,
  },
  markerText: {
    color: COLORS.white,
    fontFamily: FONTS.soraBold,
    fontSize: 10,
  },
});
