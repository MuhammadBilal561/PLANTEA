import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, FONTS } from '../theme';
import Icon from '../components/ui/Icon';

const { width, height } = Dimensions.get('window');

export default function SplashScreen({ navigation }) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const loaderAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // 1. Entrance animation
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 10,
        friction: 5,
        useNativeDriver: true,
      })
    ]).start();

    // 2. Continuous pulse for the logo
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.05,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        })
      ])
    ).start();

    // 3. Loader Progress
    Animated.timing(loaderAnim, {
      toValue: 1,
      duration: 2500,
      useNativeDriver: false,
    }).start();

    // 4. Navigate out
    const timer = setTimeout(() => {
      navigation.replace('RoleSelection');
    }, 2800);

    return () => clearTimeout(timer);
  }, []);

  return (
    <View style={styles.container}>
      <LinearGradient 
        colors={['#0F2027', '#203A43', '#2C5364']} 
        style={StyleSheet.absoluteFillObject}
      />
      
      <Animated.View style={[styles.glow, { transform: [{ scale: pulseAnim }], opacity: fadeAnim }]} />
      
      <Animated.View
        style={[
          styles.contentContainer,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          },
        ]}
      >
        <View style={styles.logoBadge}>
          <Icon name="feather" size={40} color={COLORS.p700} />
        </View>
        <Text style={styles.appName}>Plantea</Text>
        <View style={styles.badgeContainer}>
          <Text style={styles.tagline}>M A D E  F O R  P A K I S T A N</Text>
        </View>
      </Animated.View>

      <Animated.View style={[styles.bottomContainer, { opacity: fadeAnim }]}>
        <View style={styles.aiBadge}>
          <Icon name="cpu" size={12} color={COLORS.white} />
          <Text style={styles.aiBadgeText}>Powered by AI</Text>
        </View>
        <View style={styles.loaderTrack}>
          <Animated.View
            style={[
              styles.loaderFill,
              {
                width: loaderAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: ['0%', '100%']
                }),
              },
            ]}
          />
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  glow: {
    position: 'absolute',
    width: width * 1.5,
    height: width * 1.5,
    borderRadius: width,
    backgroundColor: 'rgba(58, 140, 98, 0.15)',
    top: -width * 0.4,
  },
  contentContainer: {
    alignItems: 'center',
    marginTop: -50,
  },
  logoBadge: {
    width: 100,
    height: 100,
    backgroundColor: COLORS.p600,
    borderRadius: 35,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: COLORS.p900,
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.5,
    shadowRadius: 30,
    elevation: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  appName: {
    fontFamily: FONTS.soraExtraBold,
    fontSize: 48,    color: '#F8FAFC',
    letterSpacing: -1.5,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 4 },
    textShadowRadius: 10,
  },
  badgeContainer: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    marginTop: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  tagline: {
    color: '#94A3B8',
    fontSize: 10,
    letterSpacing: 4,
    fontWeight: '700',
  },
  bottomContainer: {
    position: 'absolute',
    bottom: 60,
    alignItems: 'center',
    width: '100%',
  },
  aiBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(58, 140, 98, 0.2)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 24,
  },
  aiBadgeText: {
    color: COLORS.p200,
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  loaderTrack: {
    width: 200,
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 50,
    overflow: 'hidden',
  },
  loaderFill: {
    height: '100%',
    backgroundColor: COLORS.p400,
    borderRadius: 50,
  },
});
