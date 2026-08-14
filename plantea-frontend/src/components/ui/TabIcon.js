import React from 'react';
import { View, StyleSheet } from 'react-native';
import Icon from './Icon';
import { COLORS } from '../../theme';

/**
 * Bottom-tab icon wrapped in a pill that highlights when focused.
 * @param {string} name Feather icon name
 * @param {string} color active/inactive tint supplied by the tab navigator
 * @param {boolean} focused
 * @param {string} activeBg pill background color when focused
 */
const TabIcon = ({ name, color, focused = false, activeBg = COLORS.p100 }) => (
  <View style={[styles.wrap, focused && { backgroundColor: activeBg }]}>
    <Icon name={name} size={21} color={color} />
  </View>
);

const styles = StyleSheet.create({
  wrap: {
    width: 46,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default TabIcon;
