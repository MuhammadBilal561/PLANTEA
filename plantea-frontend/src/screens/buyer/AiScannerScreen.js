import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, ActivityIndicator, Platform } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import Toast from 'react-native-toast-message';
import ApiService from '../../services/api';
import { COLORS, FONTS } from '../../theme';
import Icon from '../../components/ui/Icon';

export default function AiScannerScreen({ navigation, route }) {
  const [permission, requestPermission] = useCameraPermissions();
  const [capturing, setCapturing] = useState(false);
  const [flashOn, setFlashOn] = useState(false);
  const cameraRef = useRef(null);
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

  const runScan = async (base64, imageUri) => {
    setCapturing(true);
    try {
      const response = await ApiService.identifyPlant(base64);
      if (!response.success) {
        throw new Error(response.message || 'Identification failed');
      }

      const scanResult = response.data;
      const returnTo = route?.params?.returnTo;

      // When returning to a form (e.g. Add Plant Listing), pass back the details.
      if (returnTo) {
        navigation.navigate(returnTo, {
          aiScanned: true,
          aiScore: (scanResult.confidence || 0) / 100,
          plantName: scanResult.identifiedName,
          scientificName: scanResult.scientificName,
        });
        return;
      }

      navigation.navigate('ScanResult', { scanResult, imageUri });
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Scan Failed',
        text2: error.message || 'Could not identify the plant',
      });
    } finally {
      setCapturing(false);
    }
  };

  const handleCapture = async () => {
    if (capturing) return;
    try {
      if (cameraRef.current) {
        const photo = await cameraRef.current.takePictureAsync({
          base64: true,
          quality: 0.7,
        });
        await runScan(photo.base64, photo.uri);
      }
    } catch (error) {
      console.error('Capture failed:', error);
      Toast.show({
        type: 'error',
        text1: 'Camera Error',
        text2: 'Could not capture photo. Try the gallery instead.',
      });
    }
  };

  const handleGallery = async () => {
    if (capturing) return;
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.7,
        base64: true,
      });
      if (!result.canceled) {
        const asset = result.assets[0];
        await runScan(asset.base64, asset.uri);
      }
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Gallery Error',
        text2: 'Could not open the gallery',
      });
    }
  };

  if (!permission) {
    return <View />;
  }

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <View style={styles.permissionBox}>
          <View style={styles.permissionIconCircle}>
            <Icon name="camera" size={32} color={COLORS.p400} />
          </View>
          <Text style={styles.scTip}>We need camera access to scan your plant.</Text>
          <TouchableOpacity style={styles.permBtn} onPress={requestPermission}>
            <Text style={styles.permBtnText}>Grant Permission</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.galleryBtn} onPress={handleGallery}>
            <Text style={styles.galleryBtnText}>Use photo from gallery instead</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const translateY = scanLineAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-150, 150],
  });

  return (
    <View style={styles.container}>
      <View style={styles.scHdr}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-left" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.scHdrT}>Plant Scanner</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.camContainer}>
        <CameraView style={styles.camera} facing="back" ref={cameraRef} enableTorch={flashOn}>
          <View style={styles.overlay}>
            <View style={[styles.corner, styles.tl]} />
            <View style={[styles.corner, styles.tr]} />
            <View style={[styles.corner, styles.bl]} />
            <View style={[styles.corner, styles.br]} />

            <Animated.View style={[styles.scanLineWrapper, { transform: [{ translateY }] }]}>
              <LinearGradient
                colors={['transparent', COLORS.p400, 'transparent']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.scLine}
              />
            </Animated.View>

            {capturing && (
              <View style={styles.capturingOverlay}>
                <ActivityIndicator size="large" color={COLORS.p400} />
                <Text style={styles.capturingText}>Analyzing plant…</Text>
              </View>
            )}
          </View>
        </CameraView>
      </View>

      <Text style={styles.scTip}>Position the plant within the frame to identify it</Text>

      <View style={styles.scBot}>
        <View style={styles.scOpts}>
          <TouchableOpacity style={styles.scOpt} onPress={handleGallery} disabled={capturing}>
            <Icon name="image" size={24} color="rgba(255,255,255,0.7)" />
            <Text style={styles.optText}>Gallery</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.shutterContainer} onPress={handleCapture} activeOpacity={0.8} disabled={capturing}>
            <View style={[styles.shutter, capturing && styles.shutterDisabled]}>
              <Icon name="camera" size={28} color="#fff" />
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={styles.scOpt} onPress={() => setFlashOn(v => !v)} disabled={capturing}>
            <Icon name={flashOn ? 'zap' : 'zap-off'} size={24} color="rgba(255,255,255,0.7)" />
            <Text style={styles.optText}>{flashOn ? 'On' : 'Flash'}</Text>
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
    justifyContent: 'center',
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
  tl: { top: '20%', left: '15%', borderTopWidth: 3, borderLeftWidth: 3 },
  tr: { top: '20%', right: '15%', borderTopWidth: 3, borderRightWidth: 3 },
  bl: { bottom: '20%', left: '15%', borderBottomWidth: 3, borderLeftWidth: 3 },
  br: { bottom: '20%', right: '15%', borderBottomWidth: 3, borderRightWidth: 3 },
  scanLineWrapper: {
    position: 'absolute',
    width: '70%',
    height: 2,
  },
  scLine: {
    width: '100%',
    height: '100%',
  },
  capturingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  capturingText: {
    color: '#fff',
    fontFamily: FONTS.nunitoBold,
    fontSize: 14,
    marginTop: 12,
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
  shutterDisabled: {
    backgroundColor: COLORS.t4,
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
  optText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 11,
    fontFamily: FONTS.nunitoBold,
  },
  permissionBox: {
    alignItems: 'center',
    padding: 40,
  },
  permissionIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(82,168,125,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  permBtn: {
    backgroundColor: COLORS.p700,
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 20,
  },
  permBtnText: {
    color: '#fff',
    fontFamily: FONTS.soraBold,
  },
  galleryBtn: {
    marginTop: 16,
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  galleryBtnText: {
    color: COLORS.p400,
    fontFamily: FONTS.nunitoBold,
    fontSize: 13,
  },
});
