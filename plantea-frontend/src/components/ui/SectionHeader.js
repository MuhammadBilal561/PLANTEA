import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Icon from './Icon';
import { COLORS, FONTS, RADII } from '../../theme';

/**
 * Section title row with optional "See all" action.
 */
const SectionHeader = ({ title, onSeeAll, seeAllLabel = 'See all' }) => {
  return (
    <View style={styles.row}>
      <Text style={styles.title}>{title}</Text>
      {onSeeAll ? (
        <TouchableOpacity style={styles.seeAll} onPress={onSeeAll} activeOpacity={0.7}>
          <Text style={styles.seeAllText}>{seeAllLabel}</Text>
          <Icon name="chevron-right" size={14} color={COLORS.p600} />
        </TouchableOpacity>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  title: {
    fontFamily: FONTS.soraBold,
    fontSize: 16,
    color: COLORS.t1,
  },
  seeAll: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  seeAllText: {
    fontFamily: FONTS.nunitoBold,
    fontSize: 12,
    color: COLORS.p600,
  },
});

export default SectionHeader;
