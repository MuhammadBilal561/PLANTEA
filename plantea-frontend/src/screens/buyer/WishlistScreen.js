import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image, RefreshControl, ActivityIndicator } from 'react-native';
import Toast from 'react-native-toast-message';
import ApiService from '../../services/api';
import { COLORS, FONTS, RADII, SHADOWS } from '../../theme';
import Icon from '../../components/ui/Icon';
import EmptyState from '../../components/ui/EmptyState';
import Badge from '../../components/ui/Badge';

export default function WishlistScreen({ navigation }) {
  const [wishlist, setWishlist] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadWishlist();
  }, []);

  const loadWishlist = async () => {
    try {
      const response = await ApiService.request('/wishlist');
      if (response.success) {
        setWishlist(response.data.wishlist || []);
      }
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to load wishlist',
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadWishlist();
  };

  const handleRemove = async (plantId) => {
    try {
      const response = await ApiService.request(`/wishlist/${plantId}`, { method: 'DELETE' });
      if (response.success) {
        setWishlist(wishlist.filter(item => item.plant_id !== plantId));
        Toast.show({
          type: 'success',
          text1: 'Removed',
          text2: 'Plant removed from wishlist',
        });
      }
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to remove plant',
      });
    }
  };

  const getPlaceholderColor = (index) => {
    const colors = [COLORS.p100, COLORS.p50, '#EAF4FF'];
    return colors[index % colors.length];
  };

  const renderWishlistItem = ({ item, index }) => {
    const bgColor = getPlaceholderColor(index);
    
    return (
      <View style={styles.wishlistCard}>
        <TouchableOpacity
          style={styles.cardContent}
          onPress={() => navigation.navigate('PlantDetail', { plantId: item.plant_id })}
          activeOpacity={0.7}
        >
          {item.image_url ? (
            <Image source={{ uri: item.image_url }} style={styles.plantImage} resizeMode="cover" />
          ) : (
            <View style={[styles.plantImagePlaceholder, { backgroundColor: bgColor }]}>
              <Text style={styles.plantImageText}>{item.name?.charAt(0).toUpperCase() || 'P'}</Text>
            </View>
          )}

          <View style={styles.plantInfo}>
            <Text style={styles.plantName} numberOfLines={1}>{item.name}</Text>
            <Text style={styles.plantSeller} numberOfLines={1}>{item.seller_name || 'Seller'}</Text>
            <Text style={styles.plantPrice}>Rs. {item.price_pkr}</Text>
            {item.stock_quantity > 0 ? (
              <Badge label="In Stock" tone="green" />
            ) : (
              <Badge label="Out of Stock" tone="red" />
            )}
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.removeButton}
          onPress={() => handleRemove(item.plant_id)}
        >
          <Icon name="heart" size={18} color={COLORS.red} />
        </TouchableOpacity>
      </View>
    );
  };

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
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Icon name="arrow-left" size={24} color={COLORS.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Wishlist</Text>
        <View style={{ width: 40 }} />
      </View>

      <FlatList
        data={wishlist}
        renderItem={renderWishlistItem}
        keyExtractor={(item) => item.plant_id}
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
          <EmptyState
            icon="heart"
            title="Your wishlist is empty"
            message="Save plants you love to buy later."
            actionLabel="Browse Plants"
            onAction={() => navigation.navigate('Home')}
          />
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  backButton: {
    width: 40,
  },
  headerTitle: {
    fontFamily: FONTS.soraExtraBold,
    fontSize: 20,
    color: COLORS.white,
  },
  listContent: {
    padding: 16,
  },
  wishlistCard: {
    backgroundColor: COLORS.white,
    borderRadius: RADII.card,
    marginBottom: 16,
    ...SHADOWS.card,
    overflow: 'hidden',
  },
  cardContent: {
    flexDirection: 'row',
    padding: 12,
  },
  plantImage: {
    width: 90,
    height: 90,
    borderRadius: 12,
  },
  plantImagePlaceholder: {
    width: 90,
    height: 90,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  plantImageText: {
    fontFamily: FONTS.soraExtraBold,
    fontSize: 28,
    color: COLORS.p700,
  },
  plantInfo: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'center',
  },
  plantName: {
    fontFamily: FONTS.soraBold,
    fontSize: 15,
    color: COLORS.t1,
  },
  plantSeller: {
    fontFamily: FONTS.nunito,
    fontSize: 12,
    color: COLORS.t3,
    marginTop: 2,
  },
  plantPrice: {
    fontFamily: FONTS.soraExtraBold,
    fontSize: 16,
    color: COLORS.p700,
    marginTop: 6,
  },
  removeButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.white,
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOWS.card,
  },
});
