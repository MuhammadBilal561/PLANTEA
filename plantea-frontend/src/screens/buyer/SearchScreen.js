import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TextInput, FlatList, TouchableOpacity, Image, ActivityIndicator } from 'react-native';
import ApiService from '../../services/api';
import { COLORS, FONTS, RADII, SHADOWS } from '../../theme';

export default function SearchScreen({ navigation }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [plants, setPlants] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [priceRange, setPriceRange] = useState('All');
  const searchTimeout = useRef(null);

  const categories = ['All', 'Indoor', 'Outdoor', 'Rare', 'Flowering', 'Medicinal', 'Succulent'];
  const priceRanges = ['All', 'Under 500', '500-1000', '1000-2000', 'Above 2000'];

  useEffect(() => {
    searchPlants();
  }, [selectedCategory, priceRange]);

  const searchPlants = async () => {
    setLoading(true);
    try {
      const filters = {};
      if (selectedCategory !== 'All') filters.category = selectedCategory;
      if (searchQuery.trim()) filters.search = searchQuery.trim();

      const response = await ApiService.getPlants(filters);
      if (response.success) {
        let results = response.data.plants || [];
        
        // Apply price filter
        if (priceRange !== 'All') {
          if (priceRange === 'Under 500') {
            results = results.filter(p => p.price_pkr < 500);
          } else if (priceRange === '500-1000') {
            results = results.filter(p => p.price_pkr >= 500 && p.price_pkr <= 1000);
          } else if (priceRange === '1000-2000') {
            results = results.filter(p => p.price_pkr > 1000 && p.price_pkr <= 2000);
          } else if (priceRange === 'Above 2000') {
            results = results.filter(p => p.price_pkr > 2000);
          }
        }

        setPlants(results.filter(p => p.is_available));
      }
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchChange = (text) => {
    setSearchQuery(text);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => {
      searchPlants();
    }, 500);
  };

  const getPlaceholderColor = (index) => {
    const colors = [COLORS.p100, COLORS.p50, '#EAF4FF'];
    return colors[index % colors.length];
  };

  const renderPlantCard = ({ item, index }) => {
    const bgColor = getPlaceholderColor(index);
    
    return (
      <TouchableOpacity
        style={styles.plantCard}
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
        
        {item.ai_verified && (
          <View style={styles.aiBadge}>
            <Text style={styles.aiBadgeText}>AI ✓</Text>
          </View>
        )}

        <View style={styles.plantInfo}>
          <Text style={styles.plantName} numberOfLines={1}>{item.name}</Text>
          <Text style={styles.plantSeller} numberOfLines={1}>{item.seller_name || 'Seller'}</Text>
          <View style={styles.plantFooter}>
            <Text style={styles.plantPrice}>Rs. {item.price_pkr}</Text>
            {item.category && (
              <View style={styles.categoryChip}>
                <Text style={styles.categoryChipText}>{item.category}</Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.searchBar}>
          <Text style={styles.searchIcon}>⌕</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Search plants..."
            placeholderTextColor={COLORS.t4}
            value={searchQuery}
            onChangeText={handleSearchChange}
            autoFocus
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => {
              setSearchQuery('');
              searchPlants();
            }}>
              <Text style={styles.clearIcon}>✕</Text>
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
            <TouchableOpacity
              style={[styles.filterChip, selectedCategory === item && styles.filterChipActive]}
              onPress={() => setSelectedCategory(item)}
            >
              <Text style={[styles.filterChipText, selectedCategory === item && styles.filterChipTextActive]}>
                {item}
              </Text>
            </TouchableOpacity>
          )}
          contentContainerStyle={styles.filtersList}
        />

        <Text style={[styles.filterLabel, { marginTop: 12 }]}>Price Range</Text>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={priceRanges}
          keyExtractor={(item) => item}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.filterChip, priceRange === item && styles.filterChipActive]}
              onPress={() => setPriceRange(item)}
            >
              <Text style={[styles.filterChipText, priceRange === item && styles.filterChipTextActive]}>
                {item}
              </Text>
            </TouchableOpacity>
          )}
          contentContainerStyle={styles.filtersList}
        />
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.p700} />
        </View>
      ) : (
        <FlatList
          data={plants}
          renderItem={renderPlantCard}
          keyExtractor={(item) => item.plant_id}
          numColumns={2}
          contentContainerStyle={styles.plantsGrid}
          columnWrapperStyle={styles.plantsRow}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyEmoji}>🔍</Text>
              <Text style={styles.emptyText}>No plants found</Text>
              <Text style={styles.emptySubtext}>Try adjusting your filters</Text>
            </View>
          }
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
  header: {
    backgroundColor: COLORS.p800,
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  searchBar: {
    backgroundColor: COLORS.white,
    borderRadius: 14,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
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
  clearIcon: {
    fontSize: 16,
    color: COLORS.t4,
    padding: 4,
  },
  filtersSection: {
    backgroundColor: COLORS.white,
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.p100,
  },
  filterLabel: {
    fontFamily: FONTS.nunitoBold,
    fontSize: 12,
    color: COLORS.t2,
    marginBottom: 8,
  },
  filtersList: {
    gap: 8,
  },
  filterChip: {
    backgroundColor: COLORS.bg,
    borderWidth: 2,
    borderColor: COLORS.p100,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: RADII.chip,
    marginRight: 8,
  },
  filterChipActive: {
    backgroundColor: COLORS.p700,
    borderColor: COLORS.p700,
  },
  filterChipText: {
    fontFamily: FONTS.nunitoBold,
    fontSize: 12,
    color: COLORS.t2,
  },
  filterChipTextActive: {
    color: COLORS.white,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  plantsGrid: {
    padding: 16,
  },
  plantsRow: {
    justifyContent: 'space-between',
  },
  plantCard: {
    width: '48%',
    borderRadius: RADII.card,
    backgroundColor: COLORS.white,
    ...SHADOWS.card,
    overflow: 'hidden',
    marginBottom: 16,
  },
  plantImage: {
    width: '100%',
    height: 120,
  },
  plantImagePlaceholder: {
    width: '100%',
    height: 120,
    justifyContent: 'center',
    alignItems: 'center',
  },
  plantImageText: {
    fontFamily: FONTS.soraExtraBold,
    fontSize: 32,
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
    marginTop: 2,
  },
  plantFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
  },
  plantPrice: {
    fontFamily: FONTS.soraBold,
    fontSize: 14,
    color: COLORS.p700,
  },
  categoryChip: {
    backgroundColor: COLORS.p100,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  categoryChipText: {
    fontFamily: FONTS.nunitoBold,
    fontSize: 9,
    color: COLORS.p700,
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
});
