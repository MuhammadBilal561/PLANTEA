import React from 'react';
import { Text } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { COLORS } from '../../theme';

/**
 * Thin wrapper around Feather icons so screens use a single import
 * and consistent sizes/colors instead of emoji glyphs.
 * @param {string} name Feather icon name, e.g. "feather", "camera", "search"
 * @param {number} size
 * @param {string} color
 */
const Icon = ({ name, size = 20, color = COLORS.t2, ...rest }) => {
  return <Feather name={name} size={size} color={color} {...rest} />;
};

export default Icon;
