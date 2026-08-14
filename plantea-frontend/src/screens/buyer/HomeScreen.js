import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, Image, RefreshControl, Pressable,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown, FadeInUp, ZoomIn, Layout } from 'react-native-reanimated';
import { useAuth } from '../../context/AuthContext';
import ApiService from '../../services/api';
import { Icon, Chip, SectionHeader, Rating, EmptyState } from '../../components/ui';
import PlantCard from '../../components/PlantCard';
import { COLORS, FONTS, RADII, SHADOWS } from '../../theme';

export default function HomeScreen({ navigation }) {
  const { user } = useAuth();
  const [featured, setFeatured] = useState([]);
  const [trending, setTrending] = useState([]);
  const [plants, setPlants] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [apiError, setApiError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const searchTimeout = useRef(null);

  const loadAll = useCallback(async () => {
    try {
      setApiError(null);
      const filters = {};
      if (selectedCategory !== 'All') filters.category = selectedCategory;
      if (searchQuery.trim()) filters.search = searchQuery.trim();

      const [featuredRes, trendingRes, listRes, catRes] = await Promise.all([
        ApiService.getFeaturedPlants(6),
        ApiService.getTrendingPlants(8),
        ApiService.getPlants(filters),
        ApiService.getCategories(),
      ]);

      if (featuredRes.success) setFeatured(featuredRes.data.plants || []);
      if (trendingRes.success) setTrending(trendingRes.data.plants || []);
      if (listRes.success) setPlants(listRes.data.plants || []);
      if (catRes.success && catRes.data.categories) {
        setCategories(['All', ...catRes.data.categories.map(c => c.category)]);
      }
      if (!listRes.success) setApiError('Failed to load plants.');
    } catch (error) {
      setApiError(error.message || 'Failed to load plants.');
      setPlants([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedCategory, searchQuery]);

  useFocusEffect(
    useCallback(() => {
      loadAll();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedCategory])
  );

  const handleSearch = (text) => {
    setSearchQuery(text);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => loadAll(), 450);
  };

  const onRefresh = () => { setRefreshing(true); loadAll(); };

  const goDetail = (plantId) => navigation.navigate('PlantDetail', { plantId });

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#0B2E1A', '#276044']} style={styles.header}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.greeting}>{getGreeting()}</Text>
            <Text style={styles.name}>{user?.full_name?.split(' ')[0] || 'Plant Lover'}</Text>
          </View>
          <TouchableOpacity
            style={styles.notifBtn}
            onPress={() => navigation.navigate('Notifications')}
            accessibilityLabel="Notifications"
          >
            <Icon name="bell" size={20} color={COLORS.white} />
          </TouchableOpacity>
        </View>

        <Pressable style={styles.searchBar} onPress={() => navigation.navigate('Search')}>
          <Icon name="search" size={18} color={COLORS.t3} />
          <Text style={styles.searchPlaceholder}>Search plants, gardens, care tips...</Text>
        </Pressable>

        {/* Trust strip */}
        <View style={styles.trustRow}>
          <View style={styles.trustItem}>
            <Icon name="shield" size={14} color={COLORS.p300} />
            <Text style={styles.trustText}>AI-verified</Text>
          </View>
          <View style={styles.trustDivider} />
          <View style={styles.trustItem}>
            <Icon name="truck" size={14} color={COLORS.p300} />
            <Text style={styles.trustText}>Nationwide</Text>
          </View>
          <View style={styles.trustDivider} />
          <View style={styles.trustItem}>
            <Icon name="credit-card" size={14} color={COLORS.p300} />
            <Text style={styles.trustText}>0% commission</Text>
          </View>
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.p700} colors={[COLORS.p700]} />
        }
      >
        <View style={styles.categoriesWrap}>
          <ScrollView
            horizontal showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoriesContent}
          >
            {categories.map(cat => (
              <Chip
                key={cat}
                label={cat}
                selected={selectedCategory === cat}
                onPress={() => setSelectedCategory(cat)}
              />
            ))}
          </ScrollView>
        </View>

        {loading ? (
          <View style={styles.grid}>
            {[1, 2, 3, 4].map(i => (
              <View key={i} style={styles.skeletonCard}>
                <View style={styles.skeletonImage} />
                <View style={styles.skeletonLine} />
                <View style={[styles.skeletonLine, { width: '50%' }]} />
              </View>
            ))}
          </View>
        ) : apiError ? (
          <EmptyState
            icon="wifi-off"
            isError
            title="Something went wrong"
            message={apiError}
            onRetry={() => { setLoading(true); loadAll(); }}
          />
        ) : (
          <View style={styles.sections}>
            {trending.length > 0 && (
              <Animated.View entering={FadeInUp.duration(400)} style={styles.section}>
                <SectionHeader
                  title="Trending now"
                  icon="trending-up"
                  onSeeAll={() => navigation.navigate('Search', { sort: 'popular' })}
                />
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.hScroll}>
                  {trending.map((plant, i) => (
                    <TouchableOpacity
                      key={plant.plant_id}
                      style={styles.trendCard}
                      onPress={() => goDetail(plant.plant_id)}
                      activeOpacity={0.75}
                    >
                      {plant.image_url ? (
                        <Image source={{ uri: plant.image_url }} style={styles.trendImage} resizeMode="cover" />
                      ) : (
                        <LinearGradient colors={['#EDF8F3', '#D6F0E2']} style={styles.trendImage}>
                          <Text style={styles.trendPlaceholderText}>{plant.name?.charAt(0) || 'P'}</Text>
                        </LinearGradient>
                      )}
                      <View style={styles.trendInfo}>
                        <Text style={styles.trendName} numberOfLines={1}>{plant.name}</Text>
                        <Rating rating={plant.rating_avg} size={10} showValue={false} count={plant.rating_count} />
                        <Text style={styles.trendPrice}>Rs. {plant.price_pkr}</Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </Animated.View>
            )}

            {featured.length > 0 && (
              <Animated.View entering={FadeInDown.duration(400)} style={styles.section}>
                <SectionHeader title="Featured picks" icon="star" />
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.hScroll}>
                  {featured.map((plant, i) => (
                    <TouchableOpacity
                      key={plant.plant_id}
                      style={styles.featuredCard}
                      onPress={() => goDetail(plant.plant_id)}
                      activeOpacity={0.75}
                    >
                      {plant.image_url ? (
                        <Image source={{ uri: plant.image_url }} style={styles.featuredImage} resizeMode="cover" />
                      ) : (
                        <LinearGradient colors={['#E8F5E9', '#C8E6C9']} style={styles.featuredImage}>
                          <Text style={styles.trendPlaceholderText}>{plant.name?.charAt(0) || 'P'}</Text>
                        </LinearGradient>
                      )}
                      <View style={styles.featuredInfo}>
                        <Text style={styles.trendName} numberOfLines={1}>{plant.name}</Text>
                        <Text style={styles.trendPrice}>Rs. {plant.price_pkr}</Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </Animated.View>
            )}

            <Animated.View layout={Layout.springify()} style={styles.section}>
              <SectionHeader
                title={selectedCategory === 'All' ? 'All plants' : selectedCategory}
                onSeeAll={() => navigation.navigate('Search', { category: selectedCategory === 'All' ? undefined : selectedCategory })}
              />
              {plants.length === 0 ? (
                <EmptyState icon="search" title="No plants found" message="No plants match your search yet." />
              ) : (
                <View style={styles.grid}>
                  {plants.map((plant, i) => (
                    <Animated.View key={plant.plant_id} entering={ZoomIn.delay(i * 40).springify()} layout={Layout.springify()} style={styles.gridItem}>
                      <PlantCard plant={plant} index={i} onPress={() => goDetail(plant.plant_id)} />
                    </Animated.View>
                  ))}
                </View>
              )}
            </Animated.View>
          </View>
        )}
      </ScrollView>

      <TouchableOpacity style={styles.scanFab} activeOpacity={0.85} onPress={() => navigation.navigate('AiScanner')} accessibilityLabel="AI Plant Scanner">
        <Icon name="camera" size={24} color={COLORS.white} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  header: {
    paddingTop: 56,
    paddingHorizontal: 20,
    paddingBottom: 18,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  greeting: { fontFamily: FONTS.nunito, color: COLORS.p300, fontSize: 12, fontWeight: '600' },
  name: { fontFamily: FONTS.soraExtraBold, fontSize: 24, color: COLORS.white, marginTop: 2 },
  notifBtn: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center', justifyContent: 'center',
  },
  searchBar: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: COLORS.white, borderRadius: RADII.btn,
    paddingHorizontal: 14, paddingVertical: 13, marginTop: 16,
  },
  searchPlaceholder: { fontFamily: FONTS.nunito, fontSize: 14, color: COLORS.t3, flex: 1 },
  trustRow: {
    flexDirection: 'row', alignItems: 'center', marginTop: 16, gap: 12,
  },
  trustItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  trustText: { fontFamily: FONTS.nunitoBold, fontSize: 11, color: COLORS.white },
  trustDivider: { width: 1, height: 14, backgroundColor: 'rgba(255,255,255,0.25)' },
  content: { flex: 1 },
  categoriesWrap: { marginTop: 16, marginBottom: 4 },
  categoriesContent: { paddingHorizontal: 18 },
  sections: { paddingBottom: 40 },
  section: { marginTop: 20, paddingHorizontal: 18 },
  hScroll: { gap: 12, paddingRight: 18 },
  trendCard: {
    width: 148, backgroundColor: COLORS.white, borderRadius: RADII.card,
    overflow: 'hidden', ...SHADOWS.card,
  },
  trendImage: { width: '100%', height: 104, alignItems: 'center', justifyContent: 'center' },
  trendPlaceholderText: { fontFamily: FONTS.soraExtraBold, fontSize: 30, color: COLORS.p600 },
  trendInfo: { padding: 10 },
  trendName: { fontFamily: FONTS.nunitoBold, fontSize: 13, color: COLORS.t1 },
  trendPrice: { fontFamily: FONTS.soraBold, fontSize: 15, color: COLORS.p700, marginTop: 4 },
  featuredCard: {
    width: 150, backgroundColor: COLORS.white, borderRadius: RADII.card,
    overflow: 'hidden', ...SHADOWS.card,
  },
  featuredImage: { width: '100%', height: 104, alignItems: 'center', justifyContent: 'center' },
  featuredInfo: { padding: 10 },
  grid: {
    flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 12,
  },
  gridItem: { width: '47%' },
  skeletonCard: {
    width: '47%', backgroundColor: COLORS.white, borderRadius: RADII.card,
    paddingBottom: 10, marginBottom: 12, overflow: 'hidden',
  },
  skeletonImage: { width: '100%', height: 110, backgroundColor: COLORS.p100 },
  skeletonLine: { height: 12, backgroundColor: COLORS.p100, borderRadius: 6, marginHorizontal: 10, marginTop: 8 },
  scanFab: {
    position: 'absolute', bottom: 20, right: 20,
    width: 56, height: 56, borderRadius: 18,
    backgroundColor: COLORS.org,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: COLORS.org, shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4, shadowRadius: 20, elevation: 8,
  },
});
