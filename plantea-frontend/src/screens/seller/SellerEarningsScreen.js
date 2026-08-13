import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import Toast from 'react-native-toast-message';
import ApiService from '../../services/api';
import { COLORS, FONTS, RADII, SHADOWS } from '../../theme';
import Icon from '../../components/ui/Icon';

export default function SellerEarningsScreen({ navigation }) {
  const [orders, setOrders] = useState([]);
  const [stats, setStats] = useState({
    thisMonth: 0,
    commission: 0,
    net: 0,
  });
  const [weeklyData, setWeeklyData] = useState([]);

  useEffect(() => {
    loadEarnings();
  }, []);

  const loadEarnings = async () => {
    try {
      const response = await ApiService.getOrders();
      if (response.success) {
        const deliveredOrders = response.data.orders.filter(o => o.status === 'delivered');
        setOrders(deliveredOrders);
        calculateStats(deliveredOrders);
        calculateWeeklyData(deliveredOrders);
      }
    } catch (error) {
      console.error('Failed to load earnings:', error);
    }
  };

  const calculateStats = (deliveredOrders) => {
    const now = new Date();
    const thisMonthOrders = deliveredOrders.filter(o => {
      const orderDate = new Date(o.created_at);
      return orderDate.getMonth() === now.getMonth() && orderDate.getFullYear() === now.getFullYear();
    });

    const gross = thisMonthOrders.reduce((sum, o) => sum + (o.price_at_order || 0), 0);
    const commission = thisMonthOrders.reduce((sum, o) => sum + (o.commission_pkr || 0), 0);
    
    setStats({
      thisMonth: gross,
      commission,
      net: gross - commission,
    });
  };

  const calculateWeeklyData = (deliveredOrders) => {
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const data = days.map((day, index) => {
      const dayOrders = deliveredOrders.filter(o => {
        const orderDate = new Date(o.created_at);
        return orderDate.getDay() === (index + 1) % 7;
      });
      const earnings = dayOrders.reduce((sum, o) => sum + (o.price_at_order - (o.commission_pkr || 0)), 0);
      return { day, earnings };
    });
    setWeeklyData(data);
  };

  const maxEarnings = Math.max(...weeklyData.map(d => d.earnings), 1);

  const groupOrdersByMonth = () => {
    const grouped = {};
    orders.forEach(order => {
      const date = new Date(order.created_at);
      const monthKey = `${date.toLocaleString('default', { month: 'long' })} ${date.getFullYear()}`;
      if (!grouped[monthKey]) grouped[monthKey] = [];
      grouped[monthKey].push(order);
    });
    return grouped;
  };

  const groupedOrders = groupOrdersByMonth();

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
        <View style={styles.summaryRow}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryValue}>Rs. {stats.thisMonth}</Text>
            <Text style={styles.summaryLabel}>This Month Gross</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryValue}>Rs. {stats.commission}</Text>
            <Text style={styles.summaryLabel}>Commission Paid</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryValue}>Rs. {stats.net}</Text>
            <Text style={styles.summaryLabel}>Net Earnings</Text>
          </View>
        </View>

        <View style={styles.chartSection}>
          <Text style={styles.sectionTitle}>Last 7 Days</Text>
          <View style={styles.chart}>
            {weeklyData.map((item, index) => (
              <View key={index} style={styles.barContainer}>
                <View style={[styles.bar, { height: (item.earnings / maxEarnings) * 120 }]} />
                <Text style={styles.barLabel}>{item.day}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.ordersSection}>
          <Text style={styles.sectionTitle}>Order History</Text>
          {Object.entries(groupedOrders).map(([month, monthOrders]) => (
            <View key={month}>
              <Text style={styles.monthHeader}>{month}</Text>
              {monthOrders.map((order) => (
                <View key={order.order_id} style={styles.orderRow}>
                  <View style={styles.orderInfo}>
                    <Text style={styles.orderPlant}>{order.plant_name}</Text>
                    <Text style={styles.orderDate}>{new Date(order.created_at).toLocaleDateString()}</Text>
                  </View>
                  <View style={styles.orderAmounts}>
                    <Text style={styles.orderAmount}>Rs. {order.price_at_order}</Text>
                    <Text style={styles.orderCommission}>-Rs. {order.commission_pkr || 0}</Text>
                    <Text style={styles.orderNet}>Rs. {order.price_at_order - (order.commission_pkr || 0)}</Text>
                  </View>
                </View>
              ))}
            </View>
          ))}
        </View>

        <TouchableOpacity
          style={styles.withdrawButton}
          onPress={() => Toast.show({ type: 'info', text1: 'Feature coming soon' })}
        >
          <Text style={styles.withdrawButtonText}>Request Withdrawal</Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
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
  summaryRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderRadius: RADII.card,
    padding: 14,
    ...SHADOWS.card,
  },
  summaryValue: {
    fontFamily: FONTS.soraExtraBold,
    fontSize: 16,
    color: COLORS.p700,
  },
  summaryLabel: {
    fontFamily: FONTS.nunito,
    fontSize: 10,
    color: COLORS.t3,
    marginTop: 4,
  },
  chartSection: {
    backgroundColor: COLORS.white,
    borderRadius: RADII.card,
    padding: 16,
    marginBottom: 20,
    ...SHADOWS.card,
  },
  sectionTitle: {
    fontFamily: FONTS.soraBold,
    fontSize: 14,
    color: COLORS.t1,
    marginBottom: 12,
  },
  chart: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 140,
  },
  barContainer: {
    flex: 1,
    alignItems: 'center',
  },
  bar: {
    width: 32,
    backgroundColor: COLORS.p500,
    borderRadius: 6,
    minHeight: 10,
  },
  barLabel: {
    fontFamily: FONTS.nunito,
    fontSize: 10,
    color: COLORS.t3,
    marginTop: 6,
  },
  ordersSection: {
    marginBottom: 20,
  },
  monthHeader: {
    fontFamily: FONTS.soraBold,
    fontSize: 16,
    color: COLORS.t1,
    marginTop: 12,
    marginBottom: 8,
  },
  orderRow: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    ...SHADOWS.card,
  },
  orderInfo: {
    flex: 1,
  },
  orderPlant: {
    fontFamily: FONTS.nunitoBold,
    fontSize: 13,
    color: COLORS.t1,
  },
  orderDate: {
    fontFamily: FONTS.nunito,
    fontSize: 11,
    color: COLORS.t3,
    marginTop: 2,
  },
  orderAmounts: {
    alignItems: 'flex-end',
  },
  orderAmount: {
    fontFamily: FONTS.nunitoBold,
    fontSize: 13,
    color: COLORS.t1,
  },
  orderCommission: {
    fontFamily: FONTS.nunito,
    fontSize: 11,
    color: COLORS.red,
  },
  orderNet: {
    fontFamily: FONTS.soraBold,
    fontSize: 13,
    color: COLORS.p700,
  },
  withdrawButton: {
    borderWidth: 2,
    borderColor: COLORS.p700,
    borderRadius: RADII.btn,
    paddingVertical: 14,
    alignItems: 'center',
  },
  withdrawButtonText: {
    fontFamily: FONTS.soraBold,
    fontSize: 14,
    color: COLORS.p700,
  },
});
