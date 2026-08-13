import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import ApiService from '../../services/api';
import { COLORS, FONTS, RADII, SHADOWS } from '../../theme';
import Icon from '../../components/ui/Icon';

export default function RiderEarningsScreen({ navigation }) {
  const { user } = useAuth();
  const [deliveries, setDeliveries] = useState([]);
  const [stats, setStats] = useState({
    today: 0,
    thisWeek: 0,
    thisMonth: 0,
    total: 0,
  });

  useEffect(() => {
    loadEarnings();
  }, []);

  const loadEarnings = async () => {
    try {
      const response = await ApiService.getOrders();
      if (!response.success) throw new Error('Failed to load earnings');

      const delivered = (response.data.orders || []).filter(o => o.status === 'delivered');
      const normalized = delivered.map((row) => ({
        ...row,
        order_id: row.order_id || row.id,
        buyer_name: row.buyer_name,
        created_at: row.created_at,
        delivery_fee_pkr: row.delivery_fee_pkr,
        plant_name: row.plant_name,
      }));

      setDeliveries(normalized);
      calculateStats(normalized);
    } catch (error) {
      console.error('Failed to load earnings:', error);
    }
  };

  const calculateStats = (deliveredOrders) => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(now);
    weekStart.setDate(weekStart.getDate() - 7);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const getEarnings = (order) => (order.delivery_fee_pkr || 150) * 0.8;

    const today = deliveredOrders
      .filter(o => new Date(o.created_at) >= todayStart)
      .reduce((sum, o) => sum + getEarnings(o), 0);

    const thisWeek = deliveredOrders
      .filter(o => new Date(o.created_at) >= weekStart)
      .reduce((sum, o) => sum + getEarnings(o), 0);

    const thisMonth = deliveredOrders
      .filter(o => new Date(o.created_at) >= monthStart)
      .reduce((sum, o) => sum + getEarnings(o), 0);

    const total = deliveredOrders.reduce((sum, o) => sum + getEarnings(o), 0);

    setStats({ today, thisWeek, thisMonth, total });
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-left" size={24} color={COLORS.p700} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Earnings</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.summaryGrid}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryValue}>Rs. {stats.today}</Text>
            <Text style={styles.summaryLabel}>Today</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryValue}>Rs. {stats.thisWeek}</Text>
            <Text style={styles.summaryLabel}>This Week</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryValue}>Rs. {stats.thisMonth}</Text>
            <Text style={styles.summaryLabel}>This Month</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryValue}>Rs. {stats.total}</Text>
            <Text style={styles.summaryLabel}>Total</Text>
          </View>
        </View>

        <View style={styles.deliveriesSection}>
          <Text style={styles.sectionTitle}>Delivery History</Text>
          {deliveries.map((delivery) => (
            <View key={delivery.order_id} style={styles.deliveryCard}>
              <View style={styles.deliveryInfo}>
                <Text style={styles.deliveryPlant}>{delivery.plant_name}</Text>
                <Text style={styles.deliveryBuyer}>To: {delivery.buyer_name}</Text>
                <Text style={styles.deliveryDate}>
                  {new Date(delivery.created_at).toLocaleDateString()}
                </Text>
              </View>
              <Text style={styles.deliveryEarning}>
                Rs. {((delivery.delivery_fee_pkr || 150) * 0.8).toFixed(0)}
              </Text>
            </View>
          ))}
          {deliveries.length === 0 && (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No deliveries yet</Text>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    paddingTop: 60,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.p100,
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
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 20,
  },
  summaryCard: {
    width: '48%',
    backgroundColor: COLORS.white,
    borderRadius: RADII.card,
    padding: 16,
    ...SHADOWS.card,
  },
  summaryValue: {
    fontFamily: FONTS.soraExtraBold,
    fontSize: 18,
    color: COLORS.org,
  },
  summaryLabel: {
    fontFamily: FONTS.nunito,
    fontSize: 12,
    color: COLORS.t3,
    marginTop: 4,
  },
  deliveriesSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontFamily: FONTS.soraBold,
    fontSize: 16,
    color: COLORS.t1,
    marginBottom: 12,
  },
  deliveryCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    ...SHADOWS.card,
  },
  deliveryInfo: {
    flex: 1,
  },
  deliveryPlant: {
    fontFamily: FONTS.nunitoBold,
    fontSize: 14,
    color: COLORS.t1,
  },
  deliveryBuyer: {
    fontFamily: FONTS.nunito,
    fontSize: 12,
    color: COLORS.t3,
    marginTop: 2,
  },
  deliveryDate: {
    fontFamily: FONTS.nunito,
    fontSize: 11,
    color: COLORS.t4,
    marginTop: 2,
  },
  deliveryEarning: {
    fontFamily: FONTS.soraExtraBold,
    fontSize: 16,
    color: COLORS.org,
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
