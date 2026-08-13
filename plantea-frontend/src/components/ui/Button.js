import React from 'react';
import { Pressable, StyleSheet, View, Text, ActivityIndicator } from 'react-native';
import { COLORS, FONTS, RADII, SHADOWS } from '../../theme';

const BUTTON_VARIANTS = {
  primary: { bg: COLORS.p700, text: COLORS.white },
  accent:  { bg: COLORS.org, text: COLORS.white },
  outline: { bg: 'transparent', text: COLORS.p700, border: COLORS.p200 },
  ghost:   { bg: COLORS.p50, text: COLORS.p700 },
  danger:  { bg: COLORS.red, text: COLORS.white },
};

const SIZES = {
  sm: { py: 8, px: 14, fs: 13, radius: RADII.btn },
  md: { py: 12, px: 18, fs: 15, radius: RADII.btn },
  lg: { py: 15, px: 22, fs: 16, radius: RADII.btn },
};

/**
 * Reusable Button.
 * @param {string} variant primary|accent|outline|ghost|danger
 * @param {string} size sm|md|lg
 * @param {boolean} loading shows a spinner and disables taps
 */
const Button = ({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  style,
  icon,
  ...rest
}) => {
  const v = BUTTON_VARIANTS[variant] || BUTTON_VARIANTS.primary;
  const s = SIZES[size] || SIZES.md;

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.base,
        {
          backgroundColor: v.bg,
          paddingVertical: s.py,
          paddingHorizontal: s.px,
          borderRadius: s.radius,
          borderWidth: v.border ? 1.5 : 0,
          borderColor: v.border,
          opacity: disabled ? 0.5 : pressed ? 0.85 : 1,
        },
        style,
      ]}
      accessibilityRole="button"
      accessibilityLabel={title}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator color={v.text} size="small" />
      ) : (
        <View style={styles.content}>
          {icon}
          {title ? (
            <Text style={[styles.text, { color: v.text, fontSize: s.fs }]}>{title}</Text>
          ) : null}
        </View>
      )}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    ...SHADOWS.card,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  text: {
    fontFamily: FONTS.soraBold,
  },
});

export default Button;
