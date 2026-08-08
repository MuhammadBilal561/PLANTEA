import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator, Animated } from 'react-native';
import Toast from 'react-native-toast-message';
import ApiService from '../../services/api';
import { COLORS, RADII, FONTS } from '../../theme';

export default function OtpVerifyScreen({ navigation, route }) {
  const email = route.params?.email || '';
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [isLoading, setIsLoading] = useState(false);
  const [countdown, setCountdown] = useState(60);
  const [canResend, setCanResend] = useState(false);
  
  const inputRefs = useRef([]);
  const buttonScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          setCanResend(true);
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const handleOtpChange = (value, index) => {
    if (!/^\d*$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (e, index) => {
    if (e.nativeEvent.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
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

  const handleVerify = async () => {
    const otpCode = otp.join('');
    if (otpCode.length !== 6) {
      Toast.show({
        type: 'error',
        text1: 'Invalid OTP',
        text2: 'Please enter all 6 digits',
      });
      return;
    }

    setIsLoading(true);
    
    try {
      const response = await ApiService.request('/auth/verify-otp', {
        method: 'POST',
        body: JSON.stringify({ email, otp: otpCode }),
      });

      if (response.success && response.data?.reset_token) {
        Toast.show({
          type: 'success',
          text1: 'Verified!',
          text2: 'OTP verified successfully',
        });
        navigation.navigate('ResetPassword', { reset_token: response.data.reset_token });
      } else {
        Toast.show({
          type: 'error',
          text1: 'Verification Failed',
          text2: response.message || 'Invalid OTP',
        });
      }
    } catch (err) {
      Toast.show({
        type: 'error',
        text1: 'Verification Failed',
        text2: err.message || 'Invalid OTP',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    if (!canResend) return;

    try {
      const response = await ApiService.request('/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email }),
      });

      if (response.success) {
        Toast.show({
          type: 'success',
          text1: 'Code Resent',
          text2: 'Check your email',
        });
        setCountdown(60);
        setCanResend(false);
        setOtp(['', '', '', '', '', '']);
        inputRefs.current[0]?.focus();

        const timer = setInterval(() => {
          setCountdown((prev) => {
            if (prev <= 1) {
              setCanResend(true);
              clearInterval(timer);
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
      }
    } catch (err) {
      Toast.show({
        type: 'error',
        text1: 'Failed to Resend',
        text2: err.message,
      });
    }
  };

  const truncateEmail = (email) => {
    const [name, domain] = email.split('@');
    if (name.length <= 3) return email;
    return `${name.substring(0, 3)}***@${domain}`;
  };

  const isComplete = otp.every(digit => digit !== '');

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
        <Text style={styles.backText}>←</Text>
      </TouchableOpacity>

      <View style={styles.content}>
        <Text style={styles.title}>Enter OTP</Text>
        <Text style={styles.subtitle}>
          We sent a 6-digit code to {truncateEmail(email)}
        </Text>

        <View style={styles.otpContainer}>
          {otp.map((digit, index) => (
            <TextInput
              key={index}
              ref={(ref) => (inputRefs.current[index] = ref)}
              style={[
                styles.otpInput,
                digit && styles.otpInputFilled,
              ]}
              value={digit}
              onChangeText={(value) => handleOtpChange(value, index)}
              onKeyPress={(e) => handleKeyPress(e, index)}
              keyboardType="number-pad"
              maxLength={1}
              selectTextOnFocus
            />
          ))}
        </View>

        <Animated.View style={{ transform: [{ scale: buttonScale }] }}>
          <TouchableOpacity
            style={[styles.verifyButton, (!isComplete || isLoading) && styles.verifyButtonDisabled]}
            onPress={handleVerify}
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
            disabled={!isComplete || isLoading}
            activeOpacity={1}
          >
            {isLoading ? (
              <ActivityIndicator color={COLORS.white} />
            ) : (
              <Text style={styles.verifyButtonText}>Verify Code</Text>
            )}
          </TouchableOpacity>
        </Animated.View>

        <View style={styles.resendContainer}>
          <Text style={styles.resendText}>Didn't receive code? </Text>
          {canResend ? (
            <TouchableOpacity onPress={handleResend}>
              <Text style={styles.resendLink}>Resend Code</Text>
            </TouchableOpacity>
          ) : (
            <Text style={styles.resendCountdown}>Resend in {countdown}s</Text>
          )}
        </View>
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
  backText: {
    fontSize: 24,
    color: COLORS.p700,
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
  otpContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 32,
    marginBottom: 24,
  },
  otpInput: {
    width: 48,
    height: 56,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: COLORS.p100,
    backgroundColor: COLORS.white,
    textAlign: 'center',
    fontSize: 22,
    fontFamily: FONTS.soraBold,
    color: COLORS.t1,
  },
  otpInputFilled: {
    borderColor: COLORS.p400,
    backgroundColor: COLORS.p50,
  },
  verifyButton: {
    backgroundColor: COLORS.p700,
    borderRadius: RADII.btn,
    height: 54,
    alignItems: 'center',
    justifyContent: 'center',
  },
  verifyButtonDisabled: {
    backgroundColor: COLORS.t4,
  },
  verifyButtonText: {
    fontFamily: FONTS.soraBold,
    fontSize: 15,
    color: COLORS.white,
  },
  resendContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 20,
  },
  resendText: {
    fontFamily: FONTS.nunito,
    fontSize: 13,
    color: COLORS.t3,
  },
  resendLink: {
    fontFamily: FONTS.nunitoBold,
    fontSize: 13,
    color: COLORS.p700,
  },
  resendCountdown: {
    fontFamily: FONTS.nunito,
    fontSize: 13,
    color: COLORS.t4,
  },
});
