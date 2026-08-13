import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TextInput, FlatList, TouchableOpacity, Pressable } from 'react-native';
import ApiService from '../../services/api';
import { Icon, Chip, EmptyState } from '../../components/ui';
import PlantCard from '../../components/PlantCard';
import { COLORS, FONTS, RADII, SHADOWS } from '../../theme';

const SORTS = [
  { key: 'popular', label: 'Popular' },
  { key: 'newest', label: 'Newest' },
  { key: 'price_asc', label: 'Price: Low-High' },
  { key: 'price_desc', label: 'Price: High-Low' },
  { key: 'rating', label: 'Top Rated' },
];

export default function SearchScreen({ navigation, route }) {
  const initialCategory = route.params?.category || 'All';
  const initialSort = route.params?.sort || 'popular';

  const [searchQuery, setSearchQuery] = useState('');
  const [plants, setPlants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState(['All', 'Indoor', 'Outdoor', 'Rare', 'Flowering', 'Medicinal', 'Succulent']);
  const [selectedCategory, setSelectedCategory] = useState(initialCategory);
  const [sort, setSort] = useState(initialSort);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [priceRange, setPriceRange] = useState('All');
  const searchTimeout = useRef(null);

  const priceRanges = [
    { label: 'All', min: null, max: null },
    { label: 'Under 500', min: null, max: 500 },
    { label: '500 - 1000', min: 500, max: 1000 },
    { label: '1000 - 2000', min: 1000, max: 2000 },
    { label: 'Above 2000', min: 2000, max: null },
  ];

  useEffect(() => {
    ApiService.getCategories().then((res) => {
      if (res.success && res.data.categories) {
        setCategories(['All', ...res.data.categories.map((c) => c.category)]);
      }
    }).catch(() => {});
  }, []);

  useEffect(() => {
    setPage(1);
    searchPlants(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCategory, sort, priceRange]);

  const buildFilters = () => {
    const range = priceRanges.find((r) => r.label === priceRange) || priceRanges[0];
    const filters = { sort };
    if (selectedCategory !== 'All') filters.category = selectedCategory;
    if (searchQuery.trim()) filters.search = searchQuery.trim();
    if (range.min !== null) filters.minPrice = range.min;
    if (range.max !== null) filters.maxPrice = range.max;
    return filters;
  };

  const searchPlants = async (reset = false) => {
    if (loading && !reset) return;
    setLoading(true);
    try {
      const filters = buildFilters();
      filters.page = reset ? 1 : page;
      const response = await ApiService.getPlants(filters);
      if (response.success) {
        const results = response.data.plants || [];
        setPlants(reset ? results : (prev) => [...prev, ...results]);
        setHasMore(results.length === response.data.page_size);
        if (reset) setPage(1);
      }
    } catch (error) {
      if (reset) setPlants([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchChange = (text) => {
    setSearchQuery(text);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => {
      setPage(1);
      searchPlants(true);
    }, 450);
  };

  const loadMore = () => {
    if (!hasMore || loading) return;
    setPage((p) => p + 1);
    searchPlants(false);
  };

  const activePriceRange = priceRanges.find((r) => r.label === priceRange);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} accessibilityLabel="Back">
          <Icon name="arrow-left" size={20} color={COLORS.white} />
        </TouchableOpacity>
        <View style={styles.searchBar}>
          <Icon name="search" size={18} color={COLORS.t3} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search plants..."
            placeholderTextColor={COLORS.t4}
            value={searchQuery}
            onChangeText={handleSearchChange}
            autoFocus={!route.params?.category}
            returnKeyType="search"
            onSubmitEditing={() => { setPage(1); searchPlants(true); }}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => { setSearchQuery(''); setPage(1); searchPlants(true); }} accessibilityLabel="Clear">
              <Icon name="x" size={16} color={COLORS.t4} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <View style={styles.filtersSection}>
        <Text style={styles.filterLabel}>Category</Text>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={categories}
          keyExtractor={(item) => item}
          renderItem={({ item }) => (
            <Chip label={item} selected={selectedCategory === item} onPress={() => setSelectedCategory(item)} />
          )}
          contentContainerStyle={styles.filtersList}
        />

        <View style={styles.row}>
          <Text style={styles.filterLabel}>Price</Text>
          <Text style={styles.activeRange}>{activePriceRange.label}</Text>
        </View>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={priceRanges}
          keyExtractor={(item) => item.label}
          renderItem={({ item }) => (
            <Chip label={item.label} selected={priceRange === item.label} onPress={() => setPriceRange(item.label)} />
          )}
          contentContainerStyle={styles.filtersList}
        />

        <Text style={[styles.filterLabel, { marginTop: 12 }]}>Sort</Text>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={SORTS}
          keyExtractor={(item) => item.key}
          renderItem={({ item }) => (
            <Chip label={item.label} selected={sort === item.key} onPress={() => setSort(item.key)} />
          )}
          contentContainerStyle={styles.filtersList}
        />
      </View>

      {loading && plants.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicatorCompat />
        </View>
      ) : (
        <FlatList
          data={plants}
          renderItem={({ item, index }) => (
            <PlantCard
              plant={item}
              index={index}
              onPress={() => navigation.navigate('PlantDetail', { plantId: item.plant_id })}
            />
          )}
          keyExtractor={(item) => item.plant_id}
          numColumns={2}
          contentContainerStyle={styles.plantsGrid}
          columnWrapperStyle={styles.plantsRow}
          onEndReached={loadMore}
          onEndReachedThreshold={0.5}
          ListFooterComponent={hasMore ? <FooterSpinner /> : null}
          ListEmptyComponent={
            loading ? null : (
              <EmptyState
                icon="search"
                title="No plants found"
                message="Try adjusting your filters or search terms."
              />
            )
          }
        />
      )}
    </View>
  );
}

const ActivityIndicatorCompat = () => (
  <Text style={styles.loadingText}>Loading...</Text>
);

const FooterSpinner = () => (
  <View style={styles.footer}>
    <Text style={styles.footerText}>Loading more...</Text>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  header: {
    backgroundColor: COLORS.p800,
    paddingTop: 56,
    paddingHorizontal: 20,
    paddingBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.white,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  searchInput: { flex: 1, fontFamily: FONTS.nunito, fontSize: 14, color: COLORS.t1, padding: 0 },
  filtersSection: {
    backgroundColor: COLORS.white,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 12 },
  filterLabel: {
    fontFamily: FONTS.nunitoBold,
    fontSize: 12,
    color: COLORS.t2,
    marginBottom: 8,
  },
  activeRange: { fontFamily: FONTS.nunitoBold, fontSize: 12, color: COLORS.p700, marginBottom: 8 },
  filtersList: { gap: 8, paddingRight: 12 },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingText: { fontFamily: FONTS.nunito, color: COLORS.t3 },
  plantsGrid: { padding: 16, paddingBottom: 40 },
  plantsRow: { justifyContent: 'space-between', gap: 12 },
  footer: { alignItems: 'center', paddingVertical: 16 },
  footerText: { fontFamily: FONTS.nunito, fontSize: 12, color: COLORS.t3 },
});
