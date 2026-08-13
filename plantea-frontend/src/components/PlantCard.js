import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Icon from './ui/Icon';
import Badge from './ui/Badge';
import Rating from './ui/Rating';
import Price from './ui/Price';
import { COLORS, FONTS, RADII, SHADOWS, GRADIENT_CYCLE } from '../theme';

/**
 * Plant marketplace card — used on Home, Search, Wishlist.
 * @param {object} plant normalized plant (plant_id, name, price_pkr, image_url...)
 * @param {number} index used to cycle placeholder gradients
 * @param {function} onPress
 */
const PlantCard = ({ plant, index = 0, onPress }) => {
  const grad = GRADIENT_CYCLE[index % GRADIENT_CYCLE.length];
  const discount = plant.discount_pct > 0 || (plant.original_price_pkr && plant.original_price_pkr > plant.price_pkr);

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.75}>
      {plant.image_url ? (
        <Image source={{ uri: plant.image_url }} style={styles.image} resizeMode="cover" />
      ) : (
        <LinearGradient colors={grad} style={styles.placeholder}>
          <Text style={styles.placeholderText}>{plant.name?.charAt(0)?.toUpperCase() || 'P'}</Text>
        </LinearGradient>
      )}

      <View style={styles.badges}>
        {plant.ai_verified ? <Badge label="AI Checked" tone="green" /> : null}
        {discount ? <Badge label={`-${Math.round(plant.discount_pct || ((plant.original_price_pkr - plant.price_pkr) / plant.original_price_pkr) * 100)}%`} tone="red" /> : null}
      </View>

      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>{plant.name}</Text>
        <View style={styles.meta}>
          <Rating rating={plant.rating_avg} size={11} showValue={false} count={plant.rating_count} />
        </View>
        <View style={styles.bottomRow}>
          <Price price={plant.price_pkr} originalPrice={plant.original_price_pkr} size={15} />
          <View style={styles.addBtn}>
            <Icon name="plus" size={16} color={COLORS.white} />
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.white,
    borderRadius: RADII.card,
    overflow: 'hidden',
    ...SHADOWS.card,
  },
  image: { width: '100%', height: 110 },
  placeholder: {
    width: '100%',
    height: 110,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderText: {
    fontFamily: FONTS.soraExtraBold,
    fontSize: 28,
    color: COLORS.p700,
  },
  badges: {
    position: 'absolute',
    top: 8,
    left: 8,
    right: 8,
    flexDirection: 'row',
    gap: 6,
  },
  info: { padding: 10 },
  name: {
    fontFamily: FONTS.nunitoBold,
    fontSize: 13,
    color: COLORS.t1,
  },
  meta: { marginTop: 3, minHeight: 14 },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  addBtn: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: COLORS.p700,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default PlantCard;
