import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, Animated } from 'react-native';
import { Platform } from 'react-native';
import Toast from 'react-native-toast-message';
import { useAuth } from '../../context/AuthContext';
import { COLORS, RADII, FONTS } from '../../theme';
import Icon from '../../components/ui/Icon';

// Google auth is optional and often breaks local testing if not configured.
// Keep it disabled on web (and safe in native) until client IDs are set.
let WebBrowser;
let Google;
if (Platform.OS !== 'web') {
  try {
    WebBrowser = require('expo-web-browser');
    Google = require('expo-auth-session/providers/google');
    WebBrowser.maybeCompleteAuthSession();
  } catch (e) {
    // ignore if modules aren't available
  }
}

export default function LoginScreen({ navigation }) {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  
  // Google Auth Setup (disabled on web / when modules missing)
  const googleAuthEnabled = !!Google?.useAuthRequest;
  const googleAuthHookResult = googleAuthEnabled
    ? Google.useAuthRequest({
        webClientId: 'YOUR_WEB_CLIENT_ID.apps.googleusercontent.com',
      })
    : [null, null, async () => {}];

  const [request, response, promptAsync] = googleAuthHookResult;

  React.useEffect(() => {
    if (!googleAuthEnabled) return;
    if (response?.type === 'success') {
      const { authentication } = response;
      handleGoogleLoginSuccess(authentication?.accessToken);
    }
  }, [response, googleAuthEnabled]);

  const handleGoogleLoginSuccess = async (token) => {
    setIsLoading(true);
    try {
      // Google sign-in is not wired to the backend yet. Users can
      // register/login with email + password or one of the demo accounts.
      throw new Error('Google sign-in is not available. Please log in with email and password.');
    } catch (err) {
      Toast.show({ type: 'error', text1: 'Error', text2: err.message || 'Google login failed' });
    } finally {
      setIsLoading(false);
    }
  };
  
  const buttonScale = useRef(new Animated.Value(1)).current;

  const validateForm = () => {
    const newErrors = {};
    
    if (!email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = 'Please enter a valid email';
    }
    
    if (!password) {
      newErrors.password = 'Password is required';
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

  const handleLogin = async () => {
    if (!validateForm()) return;

    setIsLoading(true);
    try {
      await login({ email: email.trim(), password });
      Toast.show({
        type: 'success',
        text1: 'Welcome back!',
        text2: 'Login successful',
      });
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Login Failed',
        text2: error.message || 'Invalid credentials',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()} accessibilityLabel="Back">
          <Icon name="arrow-left" size={20} color={COLORS.t1} />
        </TouchableOpacity>

        <View style={styles.logoContainer}>
          <View style={styles.logo}>
            <Icon name="feather" size={36} color={COLORS.p700} />
          </View>
        </View>

        <View style={styles.header}>
          <Text style={styles.title}>Welcome Back</Text>
          <Text style={styles.subtitle}>Sign in to your Plantea account</Text>
        </View>

        <View style={styles.form}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email</Text>
              <View style={[
                styles.inputContainer,
                emailFocused && styles.inputContainerFocused,
                errors.email && styles.inputContainerError,
              ]}>
                <Icon name="mail" size={18} color={errors.email ? COLORS.red : COLORS.t3} style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  placeholder="your@email.com"
                  placeholderTextColor={COLORS.t4}
                  value={email}
                  onChangeText={(text) => {
                    setEmail(text);
                    if (errors.email) setErrors({ ...errors, email: null });
                  }}
                  onFocus={() => setEmailFocused(true)}
                  onBlur={() => setEmailFocused(false)}
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
                passwordFocused && styles.inputContainerFocused,
                errors.password && styles.inputContainerError,
              ]}>
                <Icon name="lock" size={18} color={errors.password ? COLORS.red : COLORS.t3} style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  placeholder="Enter your password"
                  placeholderTextColor={COLORS.t4}
                  value={password}
                  onChangeText={(text) => {
                    setPassword(text);
                    if (errors.password) setErrors({ ...errors, password: null });
                  }}
                  onFocus={() => setPasswordFocused(true)}
                  onBlur={() => setPasswordFocused(false)}
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
            {errors.password && <Text style={styles.errorText}>{errors.password}</Text>}
          </View>

          <TouchableOpacity
            onPress={() => navigation.navigate('ForgotPassword')}
            style={styles.forgotButton}
          >
            <Text style={styles.forgotText}>Forgot Password?</Text>
          </TouchableOpacity>

          <Animated.View style={{ transform: [{ scale: buttonScale }] }}>
            <TouchableOpacity
              style={[styles.loginButton, isLoading && styles.loginButtonDisabled]}
              onPress={handleLogin}
              onPressIn={handlePressIn}
              onPressOut={handlePressOut}
              disabled={isLoading}
              activeOpacity={1}
            >
              {isLoading ? (
                <ActivityIndicator color={COLORS.white} />
              ) : (
                <Text style={styles.loginButtonText}>Sign In</Text>
              )}
            </TouchableOpacity>
          </Animated.View>

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or</Text>
            <View style={styles.dividerLine} />
          </View>

          <TouchableOpacity
            style={styles.googleButton}
            onPress={() => {
              promptAsync();
            }}
            disabled={!googleAuthEnabled || !request || isLoading}
            activeOpacity={0.7}
          >
            <Icon name="globe" size={18} color={COLORS.t1} />
            <Text style={styles.googleButtonText}>Continue with Google</Text>
          </TouchableOpacity>

          <View style={styles.registerContainer}>
            <Text style={styles.registerText}>Don't have an account? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Register', { role: 'buyer' })}>
              <Text style={styles.registerLink}>Register</Text>
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
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: COLORS.p50,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  logoContainer: {
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  logo: {
    width: 56,
    height: 56,
    backgroundColor: COLORS.p700,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontFamily: FONTS.soraExtraBold,
    fontSize: 26,
    color: COLORS.t1,
  },
  subtitle: {
    fontFamily: FONTS.nunito,
    fontSize: 14,
    color: COLORS.t3,
    marginTop: 4,
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
  forgotButton: {
    alignSelf: 'flex-end',
    marginBottom: 20,
  },
  forgotText: {
    fontFamily: FONTS.nunitoBold,
    color: COLORS.p700,
    fontSize: 12,
  },
  loginButton: {
    backgroundColor: COLORS.p700,
    borderRadius: RADII.btn,
    height: 54,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loginButtonDisabled: {
    backgroundColor: COLORS.t4,
  },
  loginButtonText: {
    fontFamily: FONTS.soraBold,
    fontSize: 15,
    color: COLORS.white,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: COLORS.p100,
  },
  dividerText: {
    fontFamily: FONTS.nunito,
    color: COLORS.t4,
    fontSize: 12,
    marginHorizontal: 10,
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.white,
    borderWidth: 2,
    borderColor: '#E5EBE8',
    borderRadius: 12,
    padding: 14,
    marginBottom: 20,
  },
  googleButtonText: {
    fontFamily: FONTS.soraBold,
    fontSize: 14,
    color: COLORS.t1,
  },
  registerContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  registerText: {
    fontFamily: FONTS.nunito,
    color: COLORS.t3,
    fontSize: 13,
  },
  registerLink: {
    fontFamily: FONTS.nunitoBold,
    color: COLORS.p700,
    fontSize: 13,
  },
});
