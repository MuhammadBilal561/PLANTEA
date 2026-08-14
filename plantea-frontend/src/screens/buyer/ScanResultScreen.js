import React from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Image
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, FONTS, RADII, SHADOWS } from '../../theme';
import Icon from '../../components/ui/Icon';

export default function ScanResultScreen({ navigation, route }) {
  const { scanResult, imageUri } = route.params || {};

  if (!scanResult) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>No scan result available</Text>
        <TouchableOpacity style={styles.primaryButton} onPress={() => navigation.goBack()}>
          <Text style={styles.primaryButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const getHealthColor = (score) => {
    if (score >= 80) return COLORS.p500;
    if (score >= 60) return COLORS.yel;
    return COLORS.red;
  };

  const confidence = scanResult.confidence ?? 0;
  const healthScore = scanResult.healthScore ?? 0;
  const care = scanResult.care || {};

  const careRows = [
    { icon: 'droplet', label: 'Watering', value: care.watering },
    { icon: 'sun', label: 'Sunlight', value: care.sunlight },
    { icon: 'layers', label: 'Soil', value: care.soil },
    { icon: 'thermometer', label: 'Temperature', value: care.temperature },
    { icon: 'wind', label: 'Humidity', value: care.humidity },
  ].filter(r => r.value);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backRow} onPress={() => navigation.goBack()}>
          <Icon name="arrow-left" size={16} color={COLORS.p700} />
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Scan Result</Text>
      </View>

      {imageUri && (
        <View style={styles.imageContainer}>
          <Image source={{ uri: imageUri }} style={styles.plantImage} />
          <View style={styles.aiBadge}>
            <Icon name="award" size={12} color={COLORS.white} />
            <Text style={styles.aiBadgeText}>AI Analyzed</Text>
          </View>
        </View>
      )}

      <View style={styles.resultCard}>
        <View style={styles.resultHeader}>
          <Text style={styles.plantName}>{scanResult.identifiedName || 'Unknown Plant'}</Text>
          <View style={styles.confidenceBadge}>
            <Text style={styles.confidenceText}>{Math.round(confidence)}% match</Text>
          </View>
        </View>

        {scanResult.scientificName && (
          <Text style={styles.scientificName}>{scanResult.scientificName}</Text>
        )}

        <View style={styles.healthContainer}>
          <View style={styles.healthHeader}>
            <Text style={styles.healthLabel}>Health Score</Text>
            <Text style={[styles.healthScore, { color: getHealthColor(healthScore) }]}>
              {healthScore}/100
            </Text>
          </View>
          <View style={styles.healthBar}>
            <View
              style={[
                styles.healthFill,
                { width: `${healthScore}%`, backgroundColor: getHealthColor(healthScore) },
              ]}
            />
          </View>
          {scanResult.diseaseDetected && (
            <View style={styles.diseaseCard}>
              <View style={styles.diseaseTitleRow}>
                <Icon name="alert-triangle" size={14} color="#9A3412" />
                <Text style={styles.diseaseTitle}>{scanResult.diseaseDetected}</Text>
              </View>
              {scanResult.treatmentSuggestion && (
                <Text style={styles.diseaseText}>{scanResult.treatmentSuggestion}</Text>
              )}
            </View>
          )}
        </View>

        {scanResult.isToxic && (
          <View style={styles.warningCard}>
            <Icon name="alert-octagon" size={20} color="#856404" />
            <Text style={styles.warningText}>
              {scanResult.toxicityNote || 'This plant may be toxic to pets or humans'}
            </Text>
          </View>
        )}
      </View>

      {careRows.length > 0 && (
        <View style={styles.careCard}>
          <View style={styles.careTitleRow}>
            <Icon name="feather" size={16} color={COLORS.p700} />
            <Text style={styles.careTitle}>Care Instructions</Text>
          </View>
          {careRows.map((row, index) => (
            <View key={index} style={styles.careRow}>
              <Icon name={row.icon} size={18} color={COLORS.p700} />
              <View style={styles.careRowText}>
                <Text style={styles.careLabel}>{row.label}</Text>
                <Text style={styles.careValue}>{row.value}</Text>
              </View>
            </View>
          ))}
          {care.tips && (
            <View style={styles.careTipRow}>
              <Icon name="zap" size={14} color={COLORS.p700} />
              <Text style={styles.careTipText}>{care.tips}</Text>
            </View>
          )}
        </View>
      )}

      {scanResult.funFact && (
        <View style={styles.funFactCard}>
          <View style={styles.funFactRow}>
            <Icon name="feather" size={14} color={COLORS.p700} />
            <Text style={styles.funFactText}>{scanResult.funFact}</Text>
          </View>
        </View>
      )}

      <View style={styles.actionsContainer}>
        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={() => navigation.navigate('AiScanner')}
        >
          <Text style={styles.secondaryButtonText}>Scan Another</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.primaryButton}
          onPress={() => navigation.navigate('Home')}
        >
          <Text style={styles.primaryButtonText}>Browse Plants</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.infoCard}>
        <Text style={styles.infoTitle}>About AI Identification</Text>
        <Text style={styles.infoText}>
          The scanner analyzes leaf color and texture to estimate plant health, then matches
          the plant against a local knowledge base. Results are most accurate with clear,
          well-lit photos of leaves and flowers.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  content: {
    paddingBottom: 40,
  },
  header: {
    padding: 20,
    paddingTop: 60,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.p100,
  },
  backRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  backText: {
    fontSize: 16,
    color: COLORS.p700,
    fontFamily: FONTS.nunitoBold,
  },
  title: {
    fontFamily: FONTS.soraExtraBold,
    fontSize: 24,
    color: COLORS.t1,
  },
  imageContainer: {
    alignItems: 'center',
    padding: 20,
    position: 'relative',
  },
  plantImage: {
    width: 220,
    height: 220,
    borderRadius: 20,
    ...SHADOWS.card,
  },
  aiBadge: {
    position: 'absolute',
    bottom: 30,
    backgroundColor: COLORS.p700,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 50,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  aiBadgeText: {
    color: COLORS.white,
    fontFamily: FONTS.nunitoBold,
    fontSize: 11,
  },
  resultCard: {
    backgroundColor: COLORS.white,
    marginHorizontal: 20,
    padding: 20,
    borderRadius: RADII.card,
    ...SHADOWS.card,
  },
  resultHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  plantName: {
    fontFamily: FONTS.soraExtraBold,
    fontSize: 20,
    color: COLORS.t1,
    flex: 1,
    marginRight: 8,
  },
  confidenceBadge: {
    backgroundColor: COLORS.p700,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  confidenceText: {
    color: '#fff',
    fontSize: 12,
    fontFamily: FONTS.nunitoBold,
  },
  scientificName: {
    fontSize: 14,
    fontStyle: 'italic',
    color: COLORS.t3,
    marginBottom: 15,
    fontFamily: FONTS.nunito,
  },
  healthContainer: {
    marginTop: 10,
  },
  healthHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  healthLabel: {
    fontSize: 14,
    fontFamily: FONTS.nunitoBold,
    color: COLORS.t1,
  },
  healthBar: {
    height: 8,
    backgroundColor: COLORS.p50,
    borderRadius: 4,
    overflow: 'hidden',
  },
  healthFill: {
    height: '100%',
    borderRadius: 4,
  },
  healthScore: {
    fontSize: 16,
    fontFamily: FONTS.soraBold,
  },
  diseaseCard: {
    backgroundColor: '#FFF7ED',
    borderLeftWidth: 4,
    borderLeftColor: COLORS.org,
    padding: 12,
    marginTop: 12,
    borderRadius: 8,
  },
  diseaseTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  diseaseTitle: {
    fontFamily: FONTS.soraBold,
    fontSize: 13,
    color: '#9A3412',
  },
  diseaseText: {
    fontFamily: FONTS.nunito,
    fontSize: 12,
    color: '#7C2D12',
    lineHeight: 18,
  },
  warningCard: {
    backgroundColor: '#FFF7ED',
    borderLeftWidth: 4,
    borderLeftColor: '#ffc107',
    padding: 15,
    marginTop: 15,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  warningText: {
    flex: 1,
    fontSize: 14,
    color: '#856404',
    fontFamily: FONTS.nunitoBold,
  },
  careCard: {
    backgroundColor: COLORS.white,
    marginHorizontal: 20,
    marginTop: 16,
    padding: 20,
    borderRadius: RADII.card,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.p700,
    ...SHADOWS.card,
  },
  careTitle: {
    fontFamily: FONTS.soraBold,
    fontSize: 16,
    color: COLORS.t1,
    marginBottom: 12,
  },
  careTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  careRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 10,
  },
  careRowText: {
    flex: 1,
  },
  careLabel: {
    fontFamily: FONTS.nunitoBold,
    fontSize: 12,
    color: COLORS.t3,
  },
  careValue: {
    fontFamily: FONTS.nunito,
    fontSize: 13,
    color: COLORS.t1,
    lineHeight: 18,
  },
  careTipRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    marginTop: 6,
  },
  careTipText: {
    flex: 1,
    fontFamily: FONTS.nunito,
    fontSize: 12,
    color: COLORS.p700,
    lineHeight: 18,
  },
  funFactCard: {
    marginHorizontal: 20,
    marginTop: 16,
    padding: 16,
    backgroundColor: COLORS.p50,
    borderRadius: RADII.card,
  },
  funFactRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
  },
  funFactText: {
    flex: 1,
    fontFamily: FONTS.nunito,
    fontSize: 13,
    color: COLORS.t2,
    lineHeight: 19,
  },
  actionsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginTop: 20,
    gap: 12,
  },
  primaryButton: {
    flex: 1,
    backgroundColor: COLORS.p700,
    paddingVertical: 15,
    borderRadius: RADII.btn,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 15,
    fontFamily: FONTS.soraBold,
  },
  secondaryButton: {
    flex: 1,
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: COLORS.p700,
    paddingVertical: 15,
    borderRadius: RADII.btn,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: COLORS.p700,
    fontSize: 15,
    fontFamily: FONTS.soraBold,
  },
  infoCard: {
    backgroundColor: COLORS.white,
    marginHorizontal: 20,
    marginTop: 16,
    padding: 20,
    borderRadius: RADII.card,
    borderWidth: 1,
    borderColor: COLORS.p100,
  },
  infoTitle: {
    fontFamily: FONTS.soraBold,
    fontSize: 14,
    color: COLORS.t1,
    marginBottom: 8,
  },
  infoText: {
    fontFamily: FONTS.nunito,
    fontSize: 12,
    color: COLORS.t3,
    lineHeight: 18,
  },
  errorText: {
    fontSize: 16,
    color: COLORS.red,
    textAlign: 'center',
    marginTop: 100,
  },
});
