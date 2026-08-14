import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Icon from './Icon';
import { COLORS, FONTS } from '../../theme';

/**
 * Star rating display built from Feather vector stars.
 * @param {number} rating 0-5
 * @param {number} size
 * @param {boolean} showValue renders "4.5" next to stars
 * @param {number} count optional review count badge
 */
const Rating = ({ rating = 0, size = 14, showValue = true, count, color = COLORS.star, emptyColor = COLORS.t4 }) => {
  if (rating == null || isNaN(rating)) rating = 0;
  const stars = [];
  const rounded = Math.round(rating);

  for (let i = 1; i <= 5; i++) {
    const filled = i <= rounded;
    stars.push(
      <Icon
        key={i}
        name="star"
        size={size}
        color={filled ? color : emptyColor}
        style={styles.star}
      />
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
  star: { marginRight: 2 },
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
