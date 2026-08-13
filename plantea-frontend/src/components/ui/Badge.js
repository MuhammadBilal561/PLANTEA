import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS, FONTS, RADII } from '../../theme';

const TONE_COLORS = {
  green:  { bg: COLORS.p100, text: COLORS.p700 },
  orange: { bg: '#FDEAD9', text: COLORS.org },
  red:    { bg: '#FBE3E1', text: COLORS.red },
  blue:   { bg: '#DEEAFF', text: COLORS.info },
  gold:   { bg: '#FDF0D3', text: '#A57110' },
  neutral:{ bg: '#ECF1ED', text: COLORS.t2 },
};

/**
 * Small pill badge — used for "AI Verified", "Organic", "Free Delivery", etc.
 * @param {string} tone green|orange|red|blue|gold|neutral
 */
const Badge = ({ label, tone = 'green', icon: IconComp, style }) => {
  const t = TONE_COLORS[tone] || TONE_COLORS.neutral;
  return (
    <View style={[styles.badge, { backgroundColor: t.bg }, style]}>
      {IconComp}
      <Text style={[styles.text, { color: t.text }]} numberOfLines={1}>{label}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: RADII.chip,
    alignSelf: 'flex-start',
  },
  text: {
    fontFamily: FONTS.nunitoBold,
    fontSize: 10,
  },
});

export default Badge;
