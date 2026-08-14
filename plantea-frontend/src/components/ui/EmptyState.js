import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Icon from './Icon';
import { COLORS, FONTS, RADII } from '../../theme';

/**
 * Empty-state / error-state placeholder with optional retry.
 * @param {string} icon Feather icon name
 * @param {string} title
 * @param {string} message
 * @param {boolean} isError changes accent color + label
 * @param {function} onRetry
 * @param {string} actionLabel custom label for the CTA button
 * @param {function} onAction custom action handler (falls back to onRetry)
 * @param {string} actionIcon Feather icon name for the CTA button
 */
const EmptyState = ({ icon = 'feather', title, message, isError = false, onRetry, actionLabel, onAction, actionIcon = 'refresh-cw' }) => {
  const accent = isError ? COLORS.red : COLORS.p400;
  const handleAction = onAction || onRetry;
  return (
    <View style={styles.container}>
      <View style={[styles.iconCircle, { backgroundColor: isError ? '#FBE3E1' : COLORS.p50 }]}>
        <Icon name={icon} size={30} color={accent} />
      </View>
      <Text style={styles.title}>{title || (isError ? 'Something went wrong' : 'Nothing here yet')}</Text>
      {message ? <Text style={styles.message}>{message}</Text> : null}
      {handleAction ? (
        <TouchableOpacity style={styles.retry} onPress={handleAction} activeOpacity={0.7}>
          <Icon name={actionIcon} size={15} color={COLORS.white} />
          <Text style={styles.retryText}>{actionLabel || 'Retry'}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 28,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  title: {
    fontFamily: FONTS.soraBold,
    fontSize: 16,
    color: COLORS.t1,
    textAlign: 'center',
  },
  message: {
    fontFamily: FONTS.nunito,
    fontSize: 13,
    color: COLORS.t3,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 19,
  },
  retry: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 16,
    backgroundColor: COLORS.p700,
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: RADII.btn,
  },
  retryText: {
    fontFamily: FONTS.nunitoBold,
    color: COLORS.white,
    fontSize: 13,
  },
});

export default EmptyState;
