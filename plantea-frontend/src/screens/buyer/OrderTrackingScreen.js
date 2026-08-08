import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, ActivityIndicator, Dimensions } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import MapView, { Marker, Polyline } from '../../components/NativeMap';
import Toast from 'react-native-toast-message';
import { useAuth } from '../../context/AuthContext';
import MarketplaceService from '../../services/marketplace';
import { COLORS, FONTS, RADII, SHADOWS } from '../../theme';

const { width } = Dimensions.get('window');

export default function OrderTrackingScreen({ navigation }) {
  const { user } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState('All');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [apiError, setApiError] = useState(null);

  const filters = ['All', 'Pending', 'In Progress', 'Delivered'];

  useFocusEffect(
    useCallback(() => {
      loadOrders();
    }, [])
  );

  const loadOrders = async () => {
    try {
  setApiError(null);
  const response = await MarketplaceService.getMyOrders({ userId: user?.id });
      if (response.success) {
        // API already returns only this buyer's orders (filtered on the backend by role)
        const myOrders = (response.data.orders || [])
          .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        setOrders(myOrders);
      } else {
        setApiError('Failed to load orders.');
      }
    } catch (error) {
      setApiError(error.message || 'Failed to load orders.');
      setOrders([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadOrders();
  };

  const getFilteredOrders = () => {
    if (filter === 'All') return orders;
    if (filter === 'Pending') return orders.filter(o => o.status === 'pending');
    if (filter === 'In Progress') return orders.filter(o => ['confirmed', 'picked_up', 'in_transit'].includes(o.status));
    if (filter === 'Delivered') return orders.filter(o => o.status === 'delivered');
    return orders;
  };

  const getStatusInfo = (status) => {
    const statusMap = {
      pending: { color: COLORS.yel, text: 'Pending', progress: 20 },
      confirmed: { color: '#3498DB', text: 'Confirmed', progress: 40 },
      picked_up: { color: '#9B59B6', text: 'Picked Up', progress: 60 },
      in_transit: { color: COLORS.org, text: 'In Transit', progress: 80 },
      delivered: { color: COLORS.p700, text: 'Delivered', progress: 100 },
      cancelled: { color: COLORS.red, text: 'Cancelled', progress: 0 },
    };
    return statusMap[status] || { color: COLORS.t4, text: status, progress: 0 };
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const renderOrderCard = ({ item }) => {
    const statusInfo = getStatusInfo(item.status);
    
    return (
      <TouchableOpacity 
        style={styles.orderCard}
        activeOpacity={0.7}
      >
        <View style={styles.orderHeader}>
          <View>
            <Text style={styles.orderPlantName}>{item.plant_name || 'Plant'}</Text>
            <Text style={styles.orderDate}>{formatDate(item.created_at)}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusInfo.color }]}>
            <Text style={styles.statusText}>{statusInfo.text}</Text>
          </View>
        </View>

        <View style={styles.progressBarContainer}>
          <View style={styles.progressBarBg}>
            <View style={[styles.progressBarFill, { width: `${statusInfo.progress}%`, backgroundColor: statusInfo.color }]} />
          </View>
          <Text style={styles.progressText}>{statusInfo.progress}%</Text>
        </View>

        <View style={styles.orderDetails}>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Seller:</Text>
            <Text style={styles.detailValue}>{item.seller_name || 'Unknown'}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Amount:</Text>
            <Text style={styles.detailValue}>Rs. {item.total_amount || item.price_at_order}</Text>
          </View>
          {item.rider_name && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Rider:</Text>
              <Text style={styles.detailValue}>{item.rider_name}</Text>
            </View>
          )}
        </View>

        {item.delivery_address && (
          <View style={styles.addressContainer}>
            <Text style={styles.addressLabel}>📍 Delivery Address:</Text>
            <Text style={styles.addressText} numberOfLines={2}>{item.delivery_address}</Text>
          </View>
        )}

        {item.status === 'delivered' && (
          <View style={styles.deliveredBanner}>
            <Text style={styles.deliveredText}>✓ Delivered Successfully</Text>
          </View>
        )}
        
        {['confirmed', 'picked_up', 'in_transit'].includes(item.status) && (
          <TouchableOpacity 
            style={styles.trackBtn} 
            onPress={() => setSelectedOrder(item)}
          >
            <Text style={styles.trackBtnText}>Track Order 📍</Text>
          </TouchableOpacity>
        )}
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.p700} />
      </View>
    );
  }

  if (apiError) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={{ color: COLORS.t2, fontWeight: '800', marginBottom: 6 }}>Can’t load orders</Text>
        <Text style={{ color: COLORS.t3, textAlign: 'center', marginBottom: 12 }}>{apiError}</Text>
        <TouchableOpacity
          style={{ backgroundColor: COLORS.p700, paddingVertical: 10, paddingHorizontal: 14, borderRadius: 12 }}
          onPress={() => {
            setLoading(true);
            loadOrders();
          }}
        >
          <Text style={{ color: COLORS.white, fontWeight: '800' }}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (selectedOrder) {
    const isTransit = selectedOrder.status === 'in_transit' || selectedOrder.status === 'picked_up';
    return (
      <View style={styles.container}>
        <View style={styles.mapContainer}>
          <MapView
            style={styles.map}
            initialRegion={{
              latitude: 31.4811, // Mock Lahore location
              longitude: 74.303,
              latitudeDelta: 0.05,
              longitudeDelta: 0.05,
            }}
          >
            {/* Rider Marker */}
            <Marker coordinate={{ latitude: 31.485, longitude: 74.305 }}>
              <Text style={{ fontSize: 32 }}>🛵</Text>
            </Marker>
            {/* Destination Marker */}
            <Marker coordinate={{ latitude: 31.475, longitude: 74.298 }}>
              <Text style={{ fontSize: 32 }}>📍</Text>
            </Marker>
            <Polyline 
              coordinates={[
                { latitude: 31.485, longitude: 74.305 },
                { latitude: 31.475, longitude: 74.298 }
              ]}
              strokeColor={COLORS.p400}
              strokeWidth={4}
            />
          </MapView>

          <TouchableOpacity style={styles.mapBackBtn} onPress={() => setSelectedOrder(null)}>
            <Text style={styles.mapBackText}>←</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.trkBody}>
          <View style={styles.trkStatus}>
            <View style={styles.trkIc}><Text style={{ color: '#fff', fontSize: 22 }}>📦</Text></View>
            <View>
              <Text style={styles.trkStitle}>Order #{selectedOrder.order_id?.slice(0,6) || '10293'}</Text>
              <Text style={styles.trkSsub}>Estimated Delivery: 15 mins</Text>
            </View>
          </View>

          <View style={styles.trkSteps}>
            <View style={styles.step}>
              <View style={[styles.stepD, styles.now]}>
                <Text style={{color:'#fff', fontSize: 10}}>✓</Text>
              </View>
              <View>
                <Text style={styles.stepT}>Rider is on the way</Text>
                <Text style={styles.stepTm}>10:45 AM</Text>
              </View>
            </View>
            <View style={styles.step}>
              <View style={[styles.stepD, !isTransit && styles.pnd]}>
                <Text style={{color:'#fff', fontSize: 10}}>{isTransit ? '✓' : ''}</Text>
              </View>
              <View>
                <Text style={styles.stepT}>Order Picked Up</Text>
                <Text style={styles.stepTm}>10:30 AM</Text>
              </View>
            </View>
            <View style={styles.step}>
              <View style={styles.stepD}>
                <Text style={{color:'#fff', fontSize: 10}}>✓</Text>
              </View>
              <View>
                <Text style={styles.stepT}>Order Confirmed</Text>
                <Text style={styles.stepTm}>10:15 AM</Text>
              </View>
            </View>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Orders</Text>
        <Text style={styles.headerSubtitle}>{orders.length} total orders</Text>
      </View>

      <View style={styles.filtersContainer}>
        {filters.map((f) => (
          <TouchableOpacity
            key={f}
            style={[styles.filterChip, filter === f && styles.filterChipActive]}
            onPress={() => setFilter(f)}
          >
            <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>{f}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={getFilteredOrders()}
        renderItem={renderOrderCard}
        keyExtractor={(item) => item.order_id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={COLORS.p700}
            colors={[COLORS.p700]}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyEmoji}>📦</Text>
            <Text style={styles.emptyText}>No orders yet</Text>
            <Text style={styles.emptySubtext}>Start shopping to see your orders here</Text>
          </View>
        }
      />
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
    backgroundColor: COLORS.p800,
    padding: 20,
    paddingTop: 60,
    paddingBottom: 20,
  },
  headerTitle: {
    fontFamily: FONTS.soraExtraBold,
    fontSize: 24,
    color: COLORS.white,
  },
  headerSubtitle: {
    fontFamily: FONTS.nunito,
    fontSize: 13,
    color: COLORS.p300,
    marginTop: 4,
  },
  filtersContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: RADII.chip,
    backgroundColor: COLORS.white,
    borderWidth: 2,
    borderColor: COLORS.p100,
  },
  filterChipActive: {
    backgroundColor: COLORS.p700,
    borderColor: COLORS.p700,
  },
  filterText: {
    fontFamily: FONTS.nunitoBold,
    fontSize: 12,
    color: COLORS.t2,
  },
  filterTextActive: {
    color: COLORS.white,
  },
  listContent: {
    padding: 16,
  },
  orderCard: {
    backgroundColor: COLORS.white,
    borderRadius: RADII.card,
    padding: 16,
    marginBottom: 16,
    ...SHADOWS.card,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  orderPlantName: {
    fontFamily: FONTS.soraBold,
    fontSize: 16,
    color: COLORS.t1,
  },
  orderDate: {
    fontFamily: FONTS.nunito,
    fontSize: 12,
    color: COLORS.t3,
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: RADII.chip,
  },
  statusText: {
    fontFamily: FONTS.nunitoBold,
    fontSize: 11,
    color: COLORS.white,
  },
  progressBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  progressBarBg: {
    flex: 1,
    height: 6,
    backgroundColor: COLORS.p100,
    borderRadius: 3,
    overflow: 'hidden',
    marginRight: 8,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  progressText: {
    fontFamily: FONTS.nunitoBold,
    fontSize: 11,
    color: COLORS.t3,
    width: 35,
  },
  orderDetails: {
    gap: 6,
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  detailLabel: {
    fontFamily: FONTS.nunito,
    fontSize: 13,
    color: COLORS.t3,
  },
  detailValue: {
    fontFamily: FONTS.nunitoBold,
    fontSize: 13,
    color: COLORS.t1,
  },
  addressContainer: {
    backgroundColor: COLORS.p50,
    padding: 10,
    borderRadius: 8,
    marginTop: 4,
  },
  addressLabel: {
    fontFamily: FONTS.nunitoBold,
    fontSize: 11,
    color: COLORS.t2,
    marginBottom: 4,
  },
  addressText: {
    fontFamily: FONTS.nunito,
    fontSize: 12,
    color: COLORS.t2,
    lineHeight: 18,
  },
  deliveredBanner: {
    backgroundColor: COLORS.p700,
    padding: 10,
    borderRadius: 8,
    marginTop: 12,
    alignItems: 'center',
  },
  deliveredText: {
    fontFamily: FONTS.soraBold,
    fontSize: 13,
    color: COLORS.white,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingTop: 60,
  },
  emptyEmoji: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyText: {
    fontFamily: FONTS.soraBold,
    fontSize: 18,
    color: COLORS.t1,
    marginBottom: 8,
  },
  emptySubtext: {
    fontFamily: FONTS.nunito,
    fontSize: 14,
    color: COLORS.t3,
  },
  trackBtn: {
    backgroundColor: COLORS.p50,
    padding: 12,
    borderRadius: RADII.btn,
    marginTop: 12,
    alignItems: 'center',
  },
  trackBtnText: {
    fontFamily: FONTS.soraBold,
    color: COLORS.p700,
    fontSize: 13,
  },
  mapContainer: {
    height: 330,
    position: 'relative',
    overflow: 'hidden',
  },
  map: {
    width: '100%',
    height: '100%',
  },
  mapBackBtn: {
    position: 'absolute',
    top: 52,
    left: 20,
    width: 40,
    height: 40,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOWS.card,
  },
  mapBackText: {
    fontSize: 20,
    color: COLORS.t1,
  },
  trkBody: {
    flex: 1,
    padding: 20,
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    marginTop: -20,
  },
  trkStatus: {
    backgroundColor: COLORS.p50,
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 24,
  },
  trkIc: {
    width: 46,
    height: 46,
    backgroundColor: COLORS.p700,
    borderRadius: 23,
    justifyContent: 'center',
    alignItems: 'center',
  },
  trkStitle: {
    fontFamily: FONTS.soraBold,
    fontSize: 15,
    color: COLORS.t1,
  },
  trkSsub: {
    fontFamily: FONTS.nunito,
    fontSize: 12,
    color: COLORS.t3,
    marginTop: 2,
  },
  trkSteps: {
    flexDirection: 'column',
    gap: 20,
    marginLeft: 8,
  },
  step: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 16,
  },
  stepD: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: COLORS.p500,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
  },
  pnd: {
    backgroundColor: COLORS.bg,
    borderWidth: 2,
    borderColor: COLORS.p100,
  },
  now: {
    backgroundColor: COLORS.org,
  },
  stepT: {
    fontFamily: FONTS.soraBold,
    fontSize: 14,
    color: COLORS.t1,
  },
  stepTm: {
    fontFamily: FONTS.nunito,
    fontSize: 12,
    color: COLORS.t3,
    marginTop: 2,
  },
});
