import React from 'react';
import { View, TextInput, StyleSheet, Text } from 'react-native';
import Icon from './Icon';
import { COLORS, FONTS, RADII } from '../../theme';

/**
 * Consistent text input with icon + label + error.
 */
const Input = ({
  label,
  icon,
  error,
  style,
  containerStyle,
  ...rest
}) => {
  return (
    <View style={[styles.wrapper, containerStyle]}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View style={[styles.field, error && styles.fieldError]}>
        {icon ? <Icon name={icon} size={18} color={COLORS.t3} style={styles.icon} /> : null}
        <TextInput
          style={styles.input}
          placeholderTextColor={COLORS.t4}
          accessibilityLabel={label}
          {...rest}
        />
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
