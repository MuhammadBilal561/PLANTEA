import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator, Animated } from 'react-native';
import Toast from 'react-native-toast-message';
import ApiService from '../../services/api';
import { COLORS, RADII, FONTS } from '../../theme';
import Icon from '../../components/ui/Icon';

export default function ForgotPasswordScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [emailFocused, setEmailFocused] = useState(false);
  
  const buttonScale = useRef(new Animated.Value(1)).current;

  const validateEmail = () => {
    if (!email.trim()) {
      setError('Email is required');
      return false;
    }
    if (!/\S+@\S+\.\S+/.test(email)) {
      setError('Please enter a valid email');
      return false;
    }
    return true;
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

  const handleSendCode = async () => {
    if (!validateEmail()) return;

    setIsLoading(true);
    setError('');
    
    try {
      const response = await ApiService.request('/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email: email.trim() }),
      });

      if (response.success) {
        Toast.show({
          type: 'success',
          text1: 'Code sent!',
          text2: 'Check your email',
        });
        navigation.navigate('OtpVerify', { email: email.trim() });
      } else {
        setError(response.message || 'Failed to send code');
      }
    } catch (err) {
      setError(err.message || 'Failed to send code');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
        <Icon name="arrow-left" size={24} color={COLORS.t1} />
      </TouchableOpacity>

      <View style={styles.content}>
        <View style={styles.illustration}>
          <Icon name="lock" size={34} color={COLORS.p700} />
        </View>

        <Text style={styles.title}>Forgot Password?</Text>
        <Text style={styles.subtitle}>
          Enter your email and we'll send you a 6-digit reset code
        </Text>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Email</Text>
          <View style={[
            styles.inputContainer,
            emailFocused && styles.inputContainerFocused,
            error && styles.inputContainerError,
          ]}>
            <TextInput
              style={styles.input}
              placeholder="your@email.com"
              placeholderTextColor={COLORS.t4}
              value={email}
              onChangeText={(text) => {
                setEmail(text);
                if (error) setError('');
              }}
              onFocus={() => setEmailFocused(true)}
              onBlur={() => setEmailFocused(false)}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>
          {error && <Text style={styles.errorText}>{error}</Text>}
        </View>

        <Animated.View style={{ transform: [{ scale: buttonScale }] }}>
          <TouchableOpacity
            style={[styles.sendButton, isLoading && styles.sendButtonDisabled]}
            onPress={handleSendCode}
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
            disabled={isLoading}
            activeOpacity={1}
          >
            {isLoading ? (
              <ActivityIndicator color={COLORS.white} />
            ) : (
              <Text style={styles.sendButtonText}>Send Reset Code</Text>
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
    width: 40,
    height: 40,
    justifyContent: 'center',
    marginBottom: 20,
  },
  content: {
    flex: 1,
  },
  illustration: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: COLORS.p50,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    marginBottom: 24,
  },
  title: {
    fontFamily: FONTS.soraExtraBold,
    fontSize: 26,
    color: COLORS.t1,
    textAlign: 'center',
  },
  subtitle: {
    fontFamily: FONTS.nunito,
    fontSize: 14,
    color: COLORS.t3,
    marginTop: 8,
    lineHeight: 20,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  inputGroup: {
    marginTop: 32,
    marginBottom: 20,
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
  errorText: {
    fontFamily: FONTS.nunito,
    fontSize: 12,
    color: COLORS.red,
    marginTop: 4,
  },
  sendButton: {
    backgroundColor: COLORS.p700,
    borderRadius: RADII.btn,
    height: 54,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: COLORS.t4,
  },
  sendButtonText: {
    fontFamily: FONTS.soraBold,
    fontSize: 15,
    color: COLORS.white,
  },
});
