import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS, FONTS, RADII } from '../../theme';

const STAR_COLORS = ['#F5B731', '#F5B731', '#F5B731', '#E8A020', '#C8911E'];

/**
 * Star rating display.
 * @param {number} rating 0-5
 * @param {number} size
 * @param {boolean} showValue renders "4.5" next to stars
 * @param {number} count optional review count badge
 */
const Rating = ({ rating = 0, size = 14, showValue = true, count, color = COLORS.star }) => {
  if (rating == null || isNaN(rating)) rating = 0;
  const stars = [];
  const rounded = Math.round(rating);

  for (let i = 1; i <= 5; i++) {
    const filled = i <= rounded;
    stars.push(
      <Text key={i} style={{ fontSize: size, color: filled ? color : COLORS.t4, marginRight: 1 }}>
        ★
      </Text>
    );
  }

  return (
    <View style={styles.row}>
      {stars}
      {showValue && rating > 0 && (
        <Text style={[styles.value, { fontSize: size - 2 }]}>{Number(rating).toFixed(1)}</Text>
      )}
      {count != null && count > 0 && (
        <Text style={[styles.count, { fontSize: size - 3 }]}>({count})</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  value: {
    fontFamily: FONTS.nunitoBold,
    color: COLORS.t2,
    marginLeft: 4,
  },
  count: {
    fontFamily: FONTS.nunito,
    color: COLORS.t3,
    marginLeft: 3,
  },
});

export default Rating;
