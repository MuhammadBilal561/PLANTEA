import React, { useState } from 'react';
import { View, TextInput, StyleSheet, Text } from 'react-native';
import Icon from './Icon';
import { COLORS, FONTS, RADII } from '../../theme';

/**
 * Consistent text input with leading icon + label + error + optional trailing element.
 * @param {string} icon Feather icon name shown on the left
 * @param {ReactElement} trailing pre-built element (e.g. eye toggle button) shown on the right
 */
const Input = ({
  label,
  icon,
  trailing,
  error,
  style,
  containerStyle,
  onFocus,
  onBlur,
  ...rest
}) => {
  const [focused, setFocused] = useState(false);

  return (
    <View style={[styles.wrapper, containerStyle]}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View style={[styles.field, focused && styles.fieldFocused, error && styles.fieldError]}>
        {icon ? <Icon name={icon} size={18} color={error ? COLORS.red : COLORS.t3} style={styles.icon} /> : null}
        <TextInput
          style={styles.input}
          placeholderTextColor={COLORS.t4}
          accessibilityLabel={label}
          onFocus={(e) => { setFocused(true); onFocus && onFocus(e); }}
          onBlur={(e) => { setFocused(false); onBlur && onBlur(e); }}
          {...rest}
        />
        {trailing}
      </View>
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: { marginBottom: 14 },
  label: {
    fontFamily: FONTS.nunitoBold,
    fontSize: 12,
    color: COLORS.t2,
    marginBottom: 6,
    marginLeft: 2,
  },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: RADII.btn,
    paddingHorizontal: 14,
  },
  fieldFocused: {
    borderColor: COLORS.p400,
    backgroundColor: COLORS.p50,
  },
  fieldError: {
    borderColor: COLORS.red,
  },
  icon: { marginRight: 10 },
  input: {
    flex: 1,
    fontFamily: FONTS.nunito,
    fontSize: 14,
    color: COLORS.t1,
    paddingVertical: 13,
  },
  errorText: {
    fontFamily: FONTS.nunito,
    fontSize: 11,
    color: COLORS.red,
    marginTop: 4,
    marginLeft: 2,
  },
});

export default Input;
