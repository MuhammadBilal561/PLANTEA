import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import Toast from 'react-native-toast-message';
import ApiService from '../../services/api';
import { COLORS, FONTS, RADII } from '../../theme';
import Icon from '../../components/ui/Icon';
import EmptyState from '../../components/ui/EmptyState';

export default function NotificationsScreen({ navigation }) {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadNotifications();
  }, []);

  const loadNotifications = async () => {
    try {
      const response = await ApiService.request('/notifications');
      if (response.success) {
        setNotifications(response.data.notifications || []);
      }
    } catch (error) {
      console.error('Failed to load notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      const response = await ApiService.request('/notifications/mark-all-read', {
        method: 'PUT',
      });
      if (response.success) {
        Toast.show({
          type: 'success',
          text1: 'All notifications marked as read',
        });
        loadNotifications();
      }
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to mark notifications as read',
      });
    }
  };

  const getNotificationIcon = (type) => {
    const icons = {
      order_placed: 'package',
      order_confirmed: 'check-circle',
      order_delivered: 'award',
      review_received: 'star',
      order_rider_assigned: 'truck',
      order_cancelled: 'x-circle',
      default: 'bell',
    };
    return icons[type] || icons.default;
  };

  const getTimeAgo = (timestamp) => {
    const now = new Date();
    const notifTime = new Date(timestamp);
    const diffMs = now - notifTime;
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min ago`;
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  };

  const renderNotification = ({ item }) => (
    <TouchableOpacity
      style={[
        styles.notificationCard,
        !item.is_read && styles.notificationUnread,
      ]}
      activeOpacity={0.7}
    >
      <View style={styles.notificationIcon}>
        <Icon name={getNotificationIcon(item.type)} size={20} color={COLORS.p700} />
      </View>
      <View style={styles.notificationContent}>
        <Text style={styles.notificationTitle}>{item.title}</Text>
        <Text style={styles.notificationMessage}>{item.message}</Text>
        <Text style={styles.notificationTime}>
          {getTimeAgo(item.created_at)}
        </Text>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.p700} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} accessibilityLabel="Back">
          <Icon name="arrow-left" size={20} color={COLORS.t1} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notifications</Text>
        <TouchableOpacity style={styles.markAllBtn} onPress={handleMarkAllRead} accessibilityLabel="Mark all as read">
          <Icon name="check" size={14} color={COLORS.p700} />
          <Text style={styles.markAllText}>Mark all read</Text>
        </TouchableOpacity>
      </View>

      {notifications.length > 0 ? (
        <FlatList
          data={notifications}
          renderItem={renderNotification}
          keyExtractor={(item) => item.notification_id || item.id}
          contentContainerStyle={styles.listContent}
        />
      ) : (
        <EmptyState
          icon="bell"
          title="No notifications yet"
          message="We'll notify you when something important happens."
        />
      )}
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
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: COLORS.p50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  markAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
  },
  markAllText: {
    fontFamily: FONTS.nunitoBold,
    fontSize: 13,
    color: COLORS.p700,
  },
  listContent: {
    padding: 16,
  },
  notificationCard: {
    backgroundColor: COLORS.white,
    borderRadius: RADII.card,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
  },
  notificationUnread: {
    backgroundColor: COLORS.p50,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.p700,
  },
  notificationIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.p50,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  notificationContent: {
    flex: 1,
  },
  notificationTitle: {
    fontFamily: FONTS.nunitoBold,
    fontSize: 14,
    color: COLORS.t1,
  },
  notificationMessage: {
    fontFamily: FONTS.nunito,
    fontSize: 12,
    color: COLORS.t3,
    marginTop: 4,
    lineHeight: 18,
  },
  notificationTime: {
    fontFamily: FONTS.nunito,
    fontSize: 11,
    color: COLORS.t4,
    marginTop: 6,
  },
});
