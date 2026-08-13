import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { COLORS, FONTS, RADII } from '../../theme';

/**
 * Selectable filter chip for categories/sorts.
 * @param {string} label
 * @param {boolean} selected
 * @param {function} onPress
 */
const Chip = ({ label, selected = false, onPress, count }) => {
  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={onPress}
      style={[styles.chip, selected && styles.chipSelected]}
      accessibilityRole="button"
      accessibilityState={{ selected }}
    >
      <Text style={[styles.label, selected && styles.labelSelected]} numberOfLines={1}>
        {label}
      </Text>
      {count != null && (
        <Text style={[styles.count, selected && styles.countSelected]}>{count}</Text>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: COLORS.white,
    borderWidth: 1.5,
    borderColor: COLORS.p100,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: RADII.chip,
    marginRight: 8,
  },
  chipSelected: {
    backgroundColor: COLORS.p700,
    borderColor: COLORS.p700,
  },
  label: {
    fontFamily: FONTS.nunitoBold,
    fontSize: 13,
    color: COLORS.t2,
  },
  labelSelected: {
    color: COLORS.white,
  },
  count: {
    fontFamily: FONTS.nunito,
    fontSize: 11,
    color: COLORS.t3,
  },
  countSelected: {
    color: COLORS.p200,
  },
});

export default Chip;
