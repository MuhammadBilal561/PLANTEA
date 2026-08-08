import React, { useState, useRef, useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Image, RefreshControl, Animated } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import AnimatedView, { FadeInDown, FadeInUp, ZoomIn, Layout } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../../context/AuthContext';
import MarketplaceService from '../../services/marketplace';
import { COLORS, FONTS, RADII, SHADOWS } from '../../theme';

export default function HomeScreen({ navigation }) {
  const { user } = useAuth();
  const [plants, setPlants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [apiError, setApiError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const searchTimeout = useRef(null);
  const isLoadingRef = useRef(false);

  const categories = ['All', 'Indoor', 'Outdoor', 'Rare', 'Flowering', 'Medicinal'];

  useFocusEffect(
    useCallback(() => {
  loadPlants();
    }, [selectedCategory])
  );

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  const loadPlants = async () => {
    if (isLoadingRef.current) return;
    isLoadingRef.current = true;
    try {
      setApiError(null);
      const filters = {};
      if (selectedCategory !== 'All') {
        filters.category = selectedCategory;
      }
      if (searchQuery) {
        filters.search = searchQuery;
      }
      
      console.log('Loading plants with filters:', filters);
  const response = await MarketplaceService.getPlants(filters);
      console.log('Plants response:', response);
      
      if (response.success) {
        const plants = response.data.plants || [];
        console.log('Plants loaded:', plants.length);
        setPlants(plants);
      } else {
        console.error('Response not successful:', response);
        setApiError('Failed to load plants.');
      }
    } catch (error) {
      console.error('Failed to load plants:', error);
      console.error('Error details:', error.message);
      setApiError(error.message || 'Failed to load plants.');
      setPlants([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
      isLoadingRef.current = false;
    }
  };

  const handleSearch = (text) => {
    setSearchQuery(text);
    if (searchTimeout.current) {
      clearTimeout(searchTimeout.current);
    }
    searchTimeout.current = setTimeout(() => {
      loadPlants();
    }, 400);
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadPlants();
  };

  const visiblePlants = plants;

  const featuredPlants = visiblePlants.filter(p => p.is_available).slice(0, 5);
  const allPlants = visiblePlants.filter(p => p.is_available);

  const getPlaceholderColor = (index) => {
    const colors = [COLORS.p100, COLORS.p50, '#EAF4FF'];
    return colors[index % colors.length];
  };

  return (
    <View style={styles.container}>
  <AnimatedView.View entering={FadeInDown.duration(600)}>
        <View style={styles.header}>
          <Text style={styles.greeting}>{getGreeting()}</Text>
          <Text style={styles.name}>{user?.full_name || 'Plant Lover'}</Text>
          
          <View style={styles.searchBar}>
            <Text style={styles.searchIcon}>⌕</Text>
            <TextInput
              style={styles.searchInput}
              placeholder="Search plants..."
              placeholderTextColor={COLORS.t4}
              value={searchQuery}
              onChangeText={handleSearch}
            />
          </View>
        </View>
  </AnimatedView.View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={COLORS.p700}
            colors={[COLORS.p700]}
          />
        }
      >
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.categoriesScroll}
          contentContainerStyle={styles.categoriesContent}
        >
          {categories.map((cat) => (
            <TouchableOpacity
              key={cat}
              style={[
                styles.categoryChip,
                selectedCategory === cat && styles.categoryChipSelected,
              ]}
              onPress={() => setSelectedCategory(cat)}
            >
              <Text style={[
                styles.categoryChipText,
                selectedCategory === cat && styles.categoryChipTextSelected,
              ]}>
                {cat}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {loading ? (
          <SkeletonLoader />
        ) : apiError ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>Can’t load plants</Text>
            <Text style={styles.emptyText}>{apiError}</Text>
            <TouchableOpacity style={styles.retryBtn} onPress={() => { setLoading(true); loadPlants(); }}>
              <Text style={styles.retryBtnText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {featuredPlants.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Featured</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.featuredScroll}
                >
                  {featuredPlants.map((plant, index) => (
                    <FeaturedCard
                      key={plant.plant_id}
                      plant={plant}
                      index={index}
                      onPress={() => navigation.navigate('PlantDetail', { plantId: plant.plant_id })}
                    />
                  ))}
                </ScrollView>
              </View>
            )}

            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>All Plants</Text>
                {selectedCategory !== 'All' && (
                  <Text style={styles.filterCount}>({allPlants.length})</Text>
                )}
              </View>
              <View style={styles.plantsGrid}>
                {allPlants.map((plant, index) => (
                  <PlantCard
                    key={plant.plant_id}
                    plant={plant}
                    index={index}
                    onPress={() => navigation.navigate('PlantDetail', { plantId: plant.plant_id })}
                  />
                ))}
              </View>
            </View>
          </>
        )}
      </ScrollView>

      {/* AI Scanner FAB */}
      <TouchableOpacity 
        style={styles.scanFab} 
        activeOpacity={0.8}
        onPress={() => navigation.navigate('AiScanner')}
      >
        <Text style={styles.scanFabIcon}>📷</Text>
      </TouchableOpacity>
    </View>
  );
}

const FeaturedCard = ({ plant, index, onPress }) => {
  const gradientColors = [
    ['#E8F5E9', '#C8E6C9'],
    ['#F3F0FF', '#DDD6FE'],
    ['#E0F2FE', '#BAE6FD'],
    ['#FFF7ED', '#FED7AA']
  ];
  const bgColors = gradientColors[index % gradientColors.length];

  return (
    <AnimatedView.View entering={FadeInUp.delay(index * 150).springify()}>
      <TouchableOpacity style={styles.featuredCard} onPress={onPress} activeOpacity={0.7}>
        {plant.image_url ? (
          <Image
            source={{ uri: plant.image_url }}
            style={styles.featuredImage}
            resizeMode="cover"
          />
        ) : (
          <LinearGradient colors={bgColors} style={styles.featuredImagePlaceholder}>
            <Text style={styles.featuredImageText}>
              {plant.name?.charAt(0).toUpperCase() || '🌿'}
            </Text>
          </LinearGradient>
        )}
        <View style={styles.featuredInfo}>
          <Text style={styles.featuredName} numberOfLines={1}>{plant.name}</Text>
          <View style={styles.plantBot}>
            <Text style={styles.featuredPrice}>Rs. {plant.price_pkr}</Text>
            <View style={styles.addIc}>
              <Text style={styles.addIcText}>+</Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
  </AnimatedView.View>
  );
};

// ...existing code...

const PlantCard = ({ plant, index, onPress }) => {
  const gradientColors = [
    ['#E8F5E9', '#C8E6C9'],
    ['#F3F0FF', '#DDD6FE'],
    ['#E0F2FE', '#BAE6FD'],
    ['#FFF7ED', '#FED7AA']
  ];
  const bgColors = gradientColors[index % gradientColors.length];

  return (
    <AnimatedView.View entering={ZoomIn.delay(index * 100).springify()} layout={Layout.springify()} style={styles.plantCardContainer}>
      <TouchableOpacity style={styles.plantCard} onPress={onPress} activeOpacity={0.7}>
        {plant.image_url ? (
          <Image
            source={{ uri: plant.image_url }}
            style={styles.plantImage}
            resizeMode="cover"
          />
        ) : (
          <LinearGradient colors={bgColors} style={styles.plantImagePlaceholder}>
            <Text style={styles.plantImageText}>
              {plant.name?.charAt(0).toUpperCase() || '🌿'}
            </Text>
          </LinearGradient>
        )}
        {plant.ai_verified && (
          <View style={styles.aiBadge}>
            <Text style={styles.aiBadgeText}>AI ✓</Text>
          </View>
        )}
        <View style={styles.plantInfo}>
          <Text style={styles.plantName} numberOfLines={1}>{plant.name}</Text>
          <Text style={styles.plantSeller} numberOfLines={1}>{plant.seller_name || 'Seller'}</Text>
          <View style={styles.plantBot}>
            <Text style={styles.plantPrice}>Rs. {plant.price_pkr}</Text>
            <View style={styles.addIc}>
              <Text style={styles.addIcText}>+</Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
  </AnimatedView.View>
  );
};

const SkeletonLoader = () => {
  const shimmerAnim = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(shimmerAnim, {
          toValue: 0.4,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  return (
    <View style={styles.plantsGrid}>
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <Animated.View key={i} style={[styles.skeletonCard, { opacity: shimmerAnim }]}>
          <View style={styles.skeletonImage} />
          <View style={styles.skeletonInfo}>
            <View style={styles.skeletonLine} />
            <View style={[styles.skeletonLine, { width: '60%' }]} />
            <View style={[styles.skeletonLine, { width: '40%' }]} />
          </View>
        </Animated.View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  emptyState: {
    marginTop: 40,
    marginHorizontal: 20,
    padding: 16,
    borderRadius: 16,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: '#EAEFEB',
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.t1,
    marginBottom: 6,
  },
  emptyText: {
    fontSize: 13,
    color: COLORS.t3,
    lineHeight: 18,
  },
  retryBtn: {
    marginTop: 12,
    alignSelf: 'flex-start',
    backgroundColor: COLORS.p700,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
  },
  retryBtnText: {
    color: COLORS.white,
    fontWeight: '800',
  },
  header: {
    backgroundColor: COLORS.p800,
    paddingTop: 52,
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
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
  searchBar: {
    backgroundColor: COLORS.white,
    borderRadius: 14,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 14,
  },
  searchIcon: {
    fontSize: 18,
    color: COLORS.t4,
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontFamily: FONTS.nunito,
    fontSize: 14,
    color: COLORS.t1,
  },
  content: {
    flex: 1,
  },
  categoriesScroll: {
    marginTop: 18,
  },
  categoriesContent: {
    paddingHorizontal: 18,
    gap: 8,
  },
  categoryChip: {
    backgroundColor: COLORS.white,
    borderWidth: 2,
    borderColor: COLORS.p100,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: RADII.chip,
    marginRight: 8,
  },
  categoryChipSelected: {
    backgroundColor: COLORS.p700,
    borderColor: COLORS.p700,
  },
  categoryChipText: {
    fontFamily: FONTS.nunitoBold,
    fontSize: 13,
    color: COLORS.t2,
  },
  categoryChipTextSelected: {
    color: COLORS.white,
  },
  section: {
    marginTop: 18,
    paddingHorizontal: 18,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontFamily: FONTS.soraBold,
    fontSize: 16,
    color: COLORS.t1,
  },
  filterCount: {
    fontFamily: FONTS.nunito,
    fontSize: 14,
    color: COLORS.t3,
    marginLeft: 6,
  },
  featuredScroll: {
    gap: 12,
  },
  featuredCard: {
    width: 160,
    height: 200,
    borderRadius: RADII.card,
    backgroundColor: COLORS.white,
    ...SHADOWS.card,
    marginRight: 12,
    overflow: 'hidden',
  },
  featuredImage: {
    width: '100%',
    height: 110,
  },
  featuredImagePlaceholder: {
    width: '100%',
    height: 110,
    justifyContent: 'center',
    alignItems: 'center',
  },
  featuredImageText: {
    fontFamily: FONTS.soraExtraBold,
    fontSize: 32,
    color: COLORS.p700,
  },
  featuredInfo: {
    padding: 10,
  },
  featuredName: {
    fontFamily: FONTS.nunitoBold,
    fontSize: 13,
    color: COLORS.t1,
  },
  featuredPrice: {
    fontFamily: FONTS.soraBold,
    fontSize: 15,
    color: COLORS.p700,
    marginTop: 4,
  },
  plantsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
  },
  plantCardContainer: {
    width: '47%',
    marginBottom: 12,
  },
  plantCard: {
    width: '100%',
    borderRadius: RADII.card,
    backgroundColor: COLORS.white,
    ...SHADOWS.card,
    overflow: 'hidden',
  },
  plantImage: {
    width: '100%',
    height: 108,
  },
  plantImagePlaceholder: {
    width: '100%',
    height: 108,
    justifyContent: 'center',
    alignItems: 'center',
  },
  plantImageText: {
    fontFamily: FONTS.soraExtraBold,
    fontSize: 28,
    color: COLORS.p700,
  },
  aiBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: COLORS.p500,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: RADII.chip,
  },
  aiBadgeText: {
    fontFamily: FONTS.nunitoBold,
    fontSize: 9,
    color: COLORS.white,
  },
  plantInfo: {
    padding: 10,
  },
  plantName: {
    fontFamily: FONTS.nunitoBold,
    fontSize: 13,
    color: COLORS.t1,
  },
  plantSeller: {
    fontFamily: FONTS.nunito,
    fontSize: 11,
    color: COLORS.t3,
    marginTop: 1,
  },
  plantPrice: {
    fontFamily: FONTS.soraBold,
    fontSize: 15,
    color: COLORS.p700,
    marginTop: 4,
  },
  skeletonCard: {
    width: '47%',
    borderRadius: RADII.card,
    backgroundColor: COLORS.white,
    overflow: 'hidden',
    marginBottom: 12,
  },
  skeletonImage: {
    width: '100%',
    height: 108,
    backgroundColor: COLORS.p100,
  },
  skeletonInfo: {
    padding: 10,
  },
  skeletonLine: {
    height: 12,
    backgroundColor: COLORS.p100,
    borderRadius: 6,
    marginBottom: 6,
  },
  plantBot: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  addIc: {
    width: 28,
    height: 28,
    backgroundColor: COLORS.p700,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addIcText: {
    color: COLORS.white,
    fontSize: 18,
    fontFamily: FONTS.soraExtraBold,
  },
  scanFab: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    width: 56,
    height: 56,
    backgroundColor: COLORS.org,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: COLORS.org,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 8,
  },
  scanFabIcon: {
    fontSize: 26,
  },
});
