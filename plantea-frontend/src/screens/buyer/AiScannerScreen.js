import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { LinearGradient } from 'expo-linear-gradient';
import Toast from 'react-native-toast-message';
import { COLORS, FONTS } from '../../theme';

export default function AiScannerScreen({ navigation, route }) {
  const [permission, requestPermission] = useCameraPermissions();
  const scanLineAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(scanLineAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(scanLineAnim, {
          toValue: 0,
          duration: 2000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  if (!permission) {
    return <View />;
  }

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <Text style={styles.scTip}>We need your permission to show the camera</Text>
        <TouchableOpacity style={styles.permBtn} onPress={requestPermission}>
          <Text style={styles.permBtnText}>Grant Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const handleScan = () => {
    // Mocking the scan result
    Toast.show({
      type: 'success',
      text1: 'Scanning...',
      text2: 'Analyzing plant features',
    });
    
    // Simulate API delay then show success
    setTimeout(() => {
      Toast.show({
        type: 'success',
        text1: 'Plant Identified!',
        text2: 'Monstera Deliciosa',
      });
      
      const returnTo = route?.params?.returnTo;
      if (returnTo) {
        navigation.navigate(returnTo, {
          aiScanned: true,
          aiScore: 0.85,
          plantName: 'Monstera',
          scientificName: 'Monstera deliciosa'
        });
      } else {
        navigation.goBack();
      }
    }, 2000);
  };

  const translateY = scanLineAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-150, 150] // Moves the scan line up and down inside the box
  });

  return (
    <View style={styles.container}>
      <View style={styles.scHdr}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={{color: '#fff', fontSize: 24}}>←</Text>
        </TouchableOpacity>
        <Text style={styles.scHdrT}>Plant Scanner</Text>
        <View style={{width: 24}} />
      </View>

      <View style={styles.camContainer}>
        <CameraView style={styles.camera} facing="back">
          <View style={styles.overlay}>
            <View style={[styles.corner, styles.tl]} />
            <View style={[styles.corner, styles.tr]} />
            <View style={[styles.corner, styles.bl]} />
            <View style={[styles.corner, styles.br]} />
            
            <Animated.View style={[styles.scanLineWrapper, { transform: [{ translateY }] }]}>
              <LinearGradient 
                colors={['transparent', COLORS.p400, 'transparent']} 
                start={{x: 0, y: 0}} end={{x: 1, y: 0}} 
                style={styles.scLine} 
              />
            </Animated.View>
          </View>
        </CameraView>
      </View>

      <Text style={styles.scTip}>Position the plant within the frame to identify it</Text>

      <View style={styles.scBot}>
        <View style={styles.scOpts}>
          <TouchableOpacity style={styles.scOpt}>
            <Text style={styles.optIcon}>🖼️</Text>
            <Text style={styles.optText}>Gallery</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.shutterContainer} onPress={handleScan} activeOpacity={0.8}>
            <View style={styles.shutter}>
              <Text style={styles.shutterIcon}>📷</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={styles.scOpt}>
            <Text style={styles.optIcon}>💡</Text>
            <Text style={styles.optText}>Flash</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0F0B',
    flexDirection: 'column',
  },
  scHdr: {
    paddingTop: 62,
    paddingHorizontal: 20,
    paddingBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  scHdrT: {
    fontFamily: FONTS.soraBold,
    fontSize: 18,
    color: '#fff',
  },
  camContainer: {
    flex: 1,
    backgroundColor: '#111D14',
    marginHorizontal: 16,
    borderRadius: 24,
    overflow: 'hidden',
  },
  camera: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 50,
    height: 50,
    borderColor: COLORS.p400,
  },
  tl: {
    top: '20%',
    left: '15%',
    borderTopWidth: 3,
    borderLeftWidth: 3,
  },
  tr: {
    top: '20%',
    right: '15%',
    borderTopWidth: 3,
    borderRightWidth: 3,
  },
  bl: {
    bottom: '20%',
    left: '15%',
    borderBottomWidth: 3,
    borderLeftWidth: 3,
  },
  br: {
    bottom: '20%',
    right: '15%',
    borderBottomWidth: 3,
    borderRightWidth: 3,
  },
  scanLineWrapper: {
    position: 'absolute',
    width: '70%',
    height: 2,
  },
  scLine: {
    width: '100%',
    height: '100%',
  },
  scTip: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 12,
    textAlign: 'center',
    paddingVertical: 14,
    paddingHorizontal: 40,
    fontFamily: FONTS.nunito,
  },
  scBot: {
    paddingHorizontal: 24,
    paddingBottom: 36,
    alignItems: 'center',
  },
  shutterContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(82,168,125,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  shutter: {
    width: 68,
    height: 68,
    backgroundColor: COLORS.p400,
    borderRadius: 34,
    justifyContent: 'center',
    alignItems: 'center',
  },
  shutterIcon: {
    fontSize: 28,
  },
  scOpts: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: 20,
  },
  scOpt: {
    alignItems: 'center',
    gap: 4,
  },
  optIcon: {
    fontSize: 22,
  },
  optText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 11,
    fontFamily: FONTS.nunitoBold,
  },
  permBtn: {
    backgroundColor: COLORS.p700,
    padding: 14,
    borderRadius: 12,
    marginTop: 20,
  },
  permBtnText: {
    color: '#fff',
    fontFamily: FONTS.soraBold,
  }
});
