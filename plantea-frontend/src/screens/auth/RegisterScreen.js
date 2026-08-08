import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, Animated } from 'react-native';
import Toast from 'react-native-toast-message';
import { useAuth } from '../../context/AuthContext';
import { COLORS, RADII, FONTS } from '../../theme';

export default function RegisterScreen({ navigation, route }) {
  const { register } = useAuth();
  const role = route.params?.role || 'buyer';
  
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [city, setCity] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [focusedField, setFocusedField] = useState(null);
  
  const buttonScale = useRef(new Animated.Value(1)).current;

  const cities = ['Lahore', 'Karachi', 'Islamabad', 'Faisalabad'];

  const getPasswordStrength = () => {
    if (!password) return null;
    if (password.length < 6) return { label: 'Weak', width: '33%', color: COLORS.red };
    if (password.length < 8) return { label: 'Medium', width: '66%', color: COLORS.yel };
    if (/\d/.test(password)) return { label: 'Strong', width: '100%', color: COLORS.p500 };
    return { label: 'Medium', width: '66%', color: COLORS.yel };
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!fullName.trim()) {
      newErrors.fullName = 'Full name is required';
    } else if (fullName.trim().length < 3) {
      newErrors.fullName = 'Name must be at least 3 characters';
    }
    
    if (!phone.trim()) {
      newErrors.phone = 'Phone number is required';
    } else if (!/^03[0-9]{9}$/.test(phone)) {
      newErrors.phone = 'Phone must be in format 03XXXXXXXXX';
    }
    
    if (!email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = 'Please enter a valid email';
    }
    
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
    
    if (!city) {
      newErrors.city = 'Please select a city';
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

  const handleRegister = async () => {
    if (!validateForm()) return;

    setIsLoading(true);
    try {
      await register({
        full_name: fullName.trim(),
        phone: phone.trim(),
        email: email.trim(),
        password,
        role,
        city,
      });
      Toast.show({
        type: 'success',
        text1: 'Welcome!',
        text2: 'Account created successfully',
      });
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Registration Failed',
        text2: error.message || 'Could not create account',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const passwordStrength = getPasswordStrength();

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>

        <View style={styles.header}>
          <Text style={styles.title}>Create Account</Text>
          <View style={styles.roleChip}>
            <Text style={styles.roleChipText}>Registering as {role.charAt(0).toUpperCase() + role.slice(1)}</Text>
          </View>
        </View>

        <View style={styles.form}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Full Name</Text>
            <View style={[
              styles.inputContainer,
              focusedField === 'fullName' && styles.inputContainerFocused,
              errors.fullName && styles.inputContainerError,
            ]}>
              <TextInput
                style={styles.input}
                placeholder="John Doe"
                placeholderTextColor={COLORS.t4}
                value={fullName}
                onChangeText={(text) => {
                  setFullName(text);
                  if (errors.fullName) setErrors({ ...errors, fullName: null });
                }}
                onFocus={() => setFocusedField('fullName')}
                onBlur={() => setFocusedField(null)}
                autoCapitalize="words"
              />
            </View>
            {errors.fullName && <Text style={styles.errorText}>{errors.fullName}</Text>}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Phone Number</Text>
            <View style={[
              styles.inputContainer,
              focusedField === 'phone' && styles.inputContainerFocused,
              errors.phone && styles.inputContainerError,
            ]}>
              <TextInput
                style={styles.input}
                placeholder="03001234567"
                placeholderTextColor={COLORS.t4}
                value={phone}
                onChangeText={(text) => {
                  setPhone(text);
                  if (errors.phone) setErrors({ ...errors, phone: null });
                }}
                onFocus={() => setFocusedField('phone')}
                onBlur={() => setFocusedField(null)}
                keyboardType="phone-pad"
                maxLength={11}
              />
            </View>
            {errors.phone && <Text style={styles.errorText}>{errors.phone}</Text>}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email</Text>
            <View style={[
              styles.inputContainer,
              focusedField === 'email' && styles.inputContainerFocused,
              errors.email && styles.inputContainerError,
            ]}>
              <TextInput
                style={styles.input}
                placeholder="your@email.com"
                placeholderTextColor={COLORS.t4}
                value={email}
                onChangeText={(text) => {
                  setEmail(text);
                  if (errors.email) setErrors({ ...errors, email: null });
                }}
                onFocus={() => setFocusedField('email')}
                onBlur={() => setFocusedField(null)}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
            {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Password</Text>
            <View style={[
              styles.inputContainer,
              focusedField === 'password' && styles.inputContainerFocused,
              errors.password && styles.inputContainerError,
            ]}>
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
                <Text style={styles.eyeIcon}>{showPassword ? '👁' : '👁'}</Text>
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
            <Text style={styles.label}>Confirm Password</Text>
            <View style={[
              styles.inputContainer,
              focusedField === 'confirmPassword' && styles.inputContainerFocused,
              errors.confirmPassword && styles.inputContainerError,
            ]}>
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
                <Text style={styles.eyeIcon}>{showConfirmPassword ? '👁' : '👁'}</Text>
              </TouchableOpacity>
            </View>
            {errors.confirmPassword && <Text style={styles.errorText}>{errors.confirmPassword}</Text>}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>City</Text>
            <View style={styles.cityChips}>
              {cities.map((cityName) => (
                <TouchableOpacity
                  key={cityName}
                  style={[
                    styles.cityChip,
                    city === cityName && styles.cityChipSelected,
                  ]}
                  onPress={() => {
                    setCity(cityName);
                    if (errors.city) setErrors({ ...errors, city: null });
                  }}
                >
                  <Text style={[
                    styles.cityChipText,
                    city === cityName && styles.cityChipTextSelected,
                  ]}>
                    {cityName}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            {errors.city && <Text style={styles.errorText}>{errors.city}</Text>}
          </View>

          <Animated.View style={{ transform: [{ scale: buttonScale }] }}>
            <TouchableOpacity
              style={[styles.registerButton, isLoading && styles.registerButtonDisabled]}
              onPress={handleRegister}
              onPressIn={handlePressIn}
              onPressOut={handlePressOut}
              disabled={isLoading}
              activeOpacity={1}
            >
              {isLoading ? (
                <ActivityIndicator color={COLORS.white} />
              ) : (
                <Text style={styles.registerButtonText}>Create Account</Text>
              )}
            </TouchableOpacity>
          </Animated.View>

          <View style={styles.loginContainer}>
            <Text style={styles.loginText}>Already have an account? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Login')}>
              <Text style={styles.loginLink}>Sign In →</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  scrollContent: {
    padding: 24,
    paddingTop: 60,
    paddingBottom: 40,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    marginBottom: 10,
  },
  backText: {
    fontSize: 24,
    color: COLORS.p700,
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontFamily: FONTS.soraExtraBold,
    fontSize: 26,
    color: COLORS.t1,
  },
  roleChip: {
    backgroundColor: COLORS.p700,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: RADII.chip,
    alignSelf: 'flex-start',
    marginTop: 10,
  },
  roleChipText: {
    fontFamily: FONTS.nunitoBold,
    fontSize: 12,
    color: COLORS.white,
  },
  form: {
    marginTop: 8,
  },
  inputGroup: {
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
  eyeIcon: {
    fontSize: 18,
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
  cityChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  cityChip: {
    backgroundColor: COLORS.white,
    borderWidth: 2,
    borderColor: COLORS.p100,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: RADII.chip,
  },
  cityChipSelected: {
    backgroundColor: COLORS.p700,
    borderColor: COLORS.p700,
  },
  cityChipText: {
    fontFamily: FONTS.nunitoBold,
    fontSize: 13,
    color: COLORS.t2,
  },
  cityChipTextSelected: {
    color: COLORS.white,
  },
  registerButton: {
    backgroundColor: COLORS.p700,
    borderRadius: RADII.btn,
    height: 54,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  registerButtonDisabled: {
    backgroundColor: COLORS.t4,
  },
  registerButtonText: {
    fontFamily: FONTS.soraBold,
    fontSize: 15,
    color: COLORS.white,
  },
  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 16,
  },
  loginText: {
    fontFamily: FONTS.nunito,
    color: COLORS.t3,
    fontSize: 13,
  },
  loginLink: {
    fontFamily: FONTS.nunitoBold,
    color: COLORS.p700,
    fontSize: 13,
  },
});
