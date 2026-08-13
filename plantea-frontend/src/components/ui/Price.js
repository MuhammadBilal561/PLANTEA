import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS, FONTS, RADII } from '../../theme';

/**
 * Price display with optional original price (strikethrough) for discounts.
 * @param {number} price current price in PKR
 * @param {number|null} originalPrice pre-discount price (renders strikethrough)
 * @param {number|null} discountPct percent badge
 */
const Price = ({ price, originalPrice, discountPct, size = 15 }) => {
  const fmt = (n) => `Rs. ${Number(n || 0).toLocaleString('en-PK')}`;

  return (
    <View style={styles.row}>
      <Text style={[styles.price, { fontSize: size }]}>{fmt(price)}</Text>
      {originalPrice && Number(originalPrice) > Number(price) && (
        <Text style={[styles.original, { fontSize: size - 3 }]}>{fmt(originalPrice)}</Text>
      )}
      {discountPct > 0 && (
        <View style={styles.pill}>
          <Text style={styles.pillText}>-{Math.round(discountPct)}%</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'baseline', flexWrap: 'wrap' },
  price: {
    fontFamily: FONTS.soraBold,
    color: COLORS.p700,
  },
  original: {
    fontFamily: FONTS.nunito,
    color: COLORS.t4,
    textDecorationLine: 'line-through',
    marginLeft: 6,
  },
  pill: {
    backgroundColor: COLORS.red,
    borderRadius: RADII.xs,
    paddingHorizontal: 5,
    paddingVertical: 1,
    marginLeft: 6,
  },
  pillText: {
    fontFamily: FONTS.nunitoBold,
    fontSize: 9,
    color: COLORS.white,
  },
});

export default Price;
