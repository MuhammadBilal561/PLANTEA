import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator, Animated } from 'react-native';
import Toast from 'react-native-toast-message';
import ApiService from '../../services/api';
import { COLORS, RADII, FONTS } from '../../theme';
import Icon from '../../components/ui/Icon';

export default function ResetPasswordScreen({ navigation, route }) {
  const resetToken = route.params?.reset_token || '';
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [focusedField, setFocusedField] = useState(null);
  
  const buttonScale = useRef(new Animated.Value(1)).current;

  const getPasswordStrength = () => {
    if (!password) return null;
    if (password.length < 6) return { label: 'Weak', width: '33%', color: COLORS.red };
    if (password.length < 8) return { label: 'Medium', width: '66%', color: COLORS.yel };
    if (/\d/.test(password)) return { label: 'Strong', width: '100%', color: COLORS.p500 };
    return { label: 'Medium', width: '66%', color: COLORS.yel };
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!password) {
      newErrors.password = 'Password is required';
    } else if (password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    }
    
    if (!confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (password !== confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handlePressIn = () => {
    Animated.spring(buttonScale, {
      toValue: 0.97,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(buttonScale, {
      toValue: 1,
      friction: 3,
      useNativeDriver: true,
    }).start();
  };

  const handleResetPassword = async () => {
    if (!validateForm()) return;

    setIsLoading(true);
    
    try {
      const response = await ApiService.request('/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({
          reset_token: resetToken,
          new_password: password,
        }),
      });

      if (response.success) {
        Toast.show({
          type: 'success',
          text1: 'Success!',
          text2: 'Password reset successfully',
        });
        navigation.navigate('Login');
      } else {
        Toast.show({
          type: 'error',
          text1: 'Reset Failed',
          text2: response.message || 'Could not reset password',
        });
      }
    } catch (err) {
      Toast.show({
        type: 'error',
        text1: 'Reset Failed',
        text2: err.message || 'Could not reset password',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const passwordStrength = getPasswordStrength();

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()} accessibilityLabel="Back">
        <Icon name="arrow-left" size={20} color={COLORS.t1} />
      </TouchableOpacity>

      <View style={styles.content}>
        <Text style={styles.title}>Reset Password</Text>
        <Text style={styles.subtitle}>
          Create a new password for your account
        </Text>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>New Password</Text>
          <View style={[
            styles.inputContainer,
            focusedField === 'password' && styles.inputContainerFocused,
            errors.password && styles.inputContainerError,
          ]}>
            <Icon name="lock" size={18} color={errors.password ? COLORS.red : COLORS.t3} style={styles.inputIcon} />
            <TextInput
              style={[styles.input, { flex: 1 }]}
              placeholder="Minimum 8 characters"
              placeholderTextColor={COLORS.t4}
              value={password}
              onChangeText={(text) => {
                setPassword(text);
                if (errors.password) setErrors({ ...errors, password: null });
              }}
              onFocus={() => setFocusedField('password')}
              onBlur={() => setFocusedField(null)}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
            />
            <TouchableOpacity
              onPress={() => setShowPassword(!showPassword)}
              style={styles.eyeButton}
            >
              <Icon name={showPassword ? 'eye-off' : 'eye'} size={20} color={COLORS.t3} />
            </TouchableOpacity>
          </View>
          {passwordStrength && (
            <View style={styles.strengthContainer}>
              <View style={styles.strengthBar}>
                <View style={[styles.strengthFill, { width: passwordStrength.width, backgroundColor: passwordStrength.color }]} />
              </View>
              <Text style={[styles.strengthText, { color: passwordStrength.color }]}>{passwordStrength.label}</Text>
            </View>
          )}
          {errors.password && <Text style={styles.errorText}>{errors.password}</Text>}
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Confirm New Password</Text>
          <View style={[
            styles.inputContainer,
            focusedField === 'confirmPassword' && styles.inputContainerFocused,
            errors.confirmPassword && styles.inputContainerError,
          ]}>
            <Icon name="lock" size={18} color={errors.confirmPassword ? COLORS.red : COLORS.t3} style={styles.inputIcon} />
            <TextInput
              style={[styles.input, { flex: 1 }]}
              placeholder="Re-enter password"
              placeholderTextColor={COLORS.t4}
              value={confirmPassword}
              onChangeText={(text) => {
                setConfirmPassword(text);
                if (errors.confirmPassword) setErrors({ ...errors, confirmPassword: null });
              }}
              onFocus={() => setFocusedField('confirmPassword')}
              onBlur={() => setFocusedField(null)}
              secureTextEntry={!showConfirmPassword}
              autoCapitalize="none"
            />
            <TouchableOpacity
              onPress={() => setShowConfirmPassword(!showConfirmPassword)}
              style={styles.eyeButton}
            >
              <Icon name={showConfirmPassword ? 'eye-off' : 'eye'} size={20} color={COLORS.t3} />
            </TouchableOpacity>
          </View>
          {errors.confirmPassword && <Text style={styles.errorText}>{errors.confirmPassword}</Text>}
        </View>

        <Animated.View style={{ transform: [{ scale: buttonScale }] }}>
          <TouchableOpacity
            style={[styles.resetButton, isLoading && styles.resetButtonDisabled]}
            onPress={handleResetPassword}
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
            disabled={isLoading}
            activeOpacity={1}
          >
            {isLoading ? (
              <ActivityIndicator color={COLORS.white} />
            ) : (
              <Text style={styles.resetButtonText}>Save New Password</Text>
            )}
          </TouchableOpacity>
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
    padding: 24,
    paddingTop: 60,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: COLORS.p50,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  content: {
    flex: 1,
  },
  title: {
    fontFamily: FONTS.soraExtraBold,
    fontSize: 24,
    color: COLORS.t1,
  },
  subtitle: {
    fontFamily: FONTS.nunito,
    fontSize: 14,
    color: COLORS.t3,
    marginTop: 8,
    lineHeight: 20,
  },
  inputGroup: {
    marginTop: 24,
    marginBottom: 16,
  },
  label: {
    fontFamily: FONTS.nunitoBold,
    fontSize: 12,
    color: COLORS.t1,
    marginBottom: 6,
  },
  inputContainer: {
    backgroundColor: COLORS.bg,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'transparent',
    flexDirection: 'row',
    alignItems: 'center',
  },
  inputIcon: {
    marginLeft: 14,
    marginRight: 4,
  },
  inputContainerFocused: {
    borderColor: COLORS.p400,
    backgroundColor: COLORS.p50,
  },
  inputContainerError: {
    borderColor: COLORS.red,
  },
  input: {
    padding: 14,
    fontSize: 14,
    fontFamily: FONTS.nunito,
    color: COLORS.t1,
  },
  eyeButton: {
    padding: 14,
  },
  errorText: {
    fontFamily: FONTS.nunito,
    fontSize: 12,
    color: COLORS.red,
    marginTop: 4,
  },
  strengthContainer: {
    marginTop: 6,
    flexDirection: 'row',
    alignItems: 'center',
  },
  strengthBar: {
    flex: 1,
    height: 4,
    backgroundColor: COLORS.bg,
    borderRadius: 2,
    overflow: 'hidden',
    marginRight: 8,
  },
  strengthFill: {
    height: '100%',
    borderRadius: 2,
  },
  strengthText: {
    fontFamily: FONTS.nunitoBold,
    fontSize: 11,
  },
  resetButton: {
    backgroundColor: COLORS.p700,
    borderRadius: RADII.btn,
    height: 54,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  resetButtonDisabled: {
    backgroundColor: COLORS.t4,
  },
  resetButtonText: {
    fontFamily: FONTS.soraBold,
    fontSize: 15,
    color: COLORS.white,
  },
});
