import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Animated } from 'react-native';
import { COLORS, RADII, SHADOWS, FONTS } from '../theme';

export default function RoleSelectionScreen({ navigation }) {
  const [selectedRole, setSelectedRole] = useState(null);
  const card1Anim = useRef(new Animated.Value(40)).current;
  const card2Anim = useRef(new Animated.Value(40)).current;
  const card3Anim = useRef(new Animated.Value(40)).current;
  const card1Opacity = useRef(new Animated.Value(0)).current;
  const card2Opacity = useRef(new Animated.Value(0)).current;
  const card3Opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(card1Anim, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.timing(card1Opacity, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start();

    setTimeout(() => {
      Animated.parallel([
        Animated.timing(card2Anim, {
          toValue: 0,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.timing(card2Opacity, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
      ]).start();
    }, 100);

    setTimeout(() => {
      Animated.parallel([
        Animated.timing(card3Anim, {
          toValue: 0,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.timing(card3Opacity, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
      ]).start();
    }, 200);
  }, []);

  const roles = [
    {
      id: 'buyer',
      title: 'Buyer',
      description: 'Browse and buy plants',
      emoji: '🛒',
      bgColor: '#EAF4FF',
      anim: card1Anim,
      opacity: card1Opacity,
    },
    {
      id: 'seller',
      title: 'Seller',
      description: 'Sell your plants online',
      emoji: '🌱',
      bgColor: COLORS.p100,
      anim: card2Anim,
      opacity: card2Opacity,
    },
    {
      id: 'rider',
      title: 'Rider',
      description: 'Deliver orders and earn',
      emoji: '🛵',
      bgColor: '#FFF0E6',
      anim: card3Anim,
      opacity: card3Opacity,
    },
  ];

  const handleContinue = () => {
    if (selectedRole) {
      navigation.navigate('Register', { role: selectedRole });
    }
  };

  const getRoleLabel = () => {
    if (!selectedRole) return 'Select a Role';
    const role = roles.find(r => r.id === selectedRole);
    return `Continue as ${role.title}`;
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.title}>Choose Your Role</Text>
          <Text style={styles.subtitle}>Join Pakistan's smartest plant platform</Text>
        </View>

        <View style={styles.rolesContainer}>
          {roles.map((role) => (
            <Animated.View
              key={role.id}
              style={{
                transform: [{ translateY: role.anim }],
                opacity: role.opacity,
              }}
            >
              <TouchableOpacity
                style={[
                  styles.roleCard,
                  selectedRole === role.id && styles.roleCardSelected,
                ]}
                onPress={() => setSelectedRole(role.id)}
                activeOpacity={0.7}
              >
                <View style={[styles.roleIcon, { backgroundColor: role.bgColor }]}>
                  <Text style={styles.roleEmoji}>{role.emoji}</Text>
                </View>
                <View style={styles.roleText}>
                  <Text style={styles.roleTitle}>{role.title}</Text>
                  <Text style={styles.roleDescription}>{role.description}</Text>
                </View>
                <View style={[
                  styles.radio,
                  selectedRole === role.id && styles.radioSelected,
                ]}>
                  {selectedRole === role.id && <View style={styles.radioDot} />}
                </View>
              </TouchableOpacity>
            </Animated.View>
          ))}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.continueButton, !selectedRole && styles.continueButtonDisabled]}
          onPress={handleContinue}
          disabled={!selectedRole}
          activeOpacity={0.8}
        >
          <Text style={styles.continueButtonText}>{getRoleLabel()}</Text>
        </TouchableOpacity>

        <View style={styles.signInContainer}>
          <Text style={styles.signInText}>Already have an account? </Text>
          <TouchableOpacity onPress={() => navigation.navigate('Login')}>
            <Text style={styles.signInLink}>Sign In →</Text>
          </TouchableOpacity>
        </View>
      </View>
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
    paddingTop: 64,
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontFamily: FONTS.soraExtraBold,
    fontSize: 26,
    color: COLORS.t1,
    lineHeight: 32,
  },
  subtitle: {
    fontFamily: FONTS.nunito,
    fontSize: 14,
    color: COLORS.t3,
    marginTop: 6,
  },
  rolesContainer: {
    gap: 14,
  },
  roleCard: {
    backgroundColor: COLORS.white,
    borderRadius: RADII.card,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.p100,
    ...SHADOWS.card,
    marginBottom: 14,
  },
  roleCardSelected: {
    borderColor: COLORS.p500,
    backgroundColor: COLORS.p50,
  },
  roleIcon: {
    width: 54,
    height: 54,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  roleEmoji: {
    fontSize: 26,
  },
  roleText: {
    flex: 1,
    marginLeft: 14,
  },
  roleTitle: {
    fontFamily: FONTS.soraBold,
    fontSize: 16,
    color: COLORS.t1,
  },
  roleDescription: {
    fontFamily: FONTS.nunito,
    fontSize: 12,
    color: COLORS.t3,
    marginTop: 2,
  },
  radio: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: COLORS.p100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioSelected: {
    borderColor: COLORS.p500,
  },
  radioDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: COLORS.p500,
  },
  footer: {
    padding: 24,
    paddingBottom: 36,
  },
  continueButton: {
    backgroundColor: COLORS.p700,
    borderRadius: RADII.btn,
    height: 54,
    alignItems: 'center',
    justifyContent: 'center',
  },
  continueButtonDisabled: {
    backgroundColor: COLORS.t4,
  },
  continueButtonText: {
    fontFamily: FONTS.soraBold,
    fontSize: 15,
    color: COLORS.white,
  },
  signInContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 16,
  },
  signInText: {
    fontFamily: FONTS.nunito,
    color: COLORS.t3,
    fontSize: 13,
  },
  signInLink: {
    fontFamily: FONTS.nunitoBold,
    color: COLORS.p700,
    fontSize: 13,
  },
});
