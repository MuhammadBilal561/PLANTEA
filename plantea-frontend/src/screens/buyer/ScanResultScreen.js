import React from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Image
} from 'react-native';

export default function ScanResultScreen({ navigation, route }) {
  const { scanResult, imageUri } = route.params || {};

  if (!scanResult) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>No scan result available</Text>
        <TouchableOpacity 
          style={styles.button}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.buttonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const getHealthColor = (score) => {
    if (score >= 80) return '#27ae60';
    if (score >= 60) return '#f39c12';
    return '#e74c3c';
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Scan Result</Text>
      </View>

      {imageUri && (
        <View style={styles.imageContainer}>
          <Image source={{ uri: imageUri }} style={styles.plantImage} />
        </View>
      )}

      <View style={styles.resultCard}>
        <View style={styles.resultHeader}>
          <Text style={styles.plantName}>{scanResult.identified_name || 'Unknown Plant'}</Text>
          {scanResult.confidence_pct && (
            <View style={styles.confidenceBadge}>
              <Text style={styles.confidenceText}>{scanResult.confidence_pct}% match</Text>
            </View>
          )}
        </View>

        {scanResult.scientific_name && (
          <Text style={styles.scientificName}>{scanResult.scientific_name}</Text>
        )}

        {scanResult.health_score && (
          <View style={styles.healthContainer}>
            <Text style={styles.healthLabel}>Health Score</Text>
            <View style={styles.healthBar}>
              <View 
                style={[
                  styles.healthFill, 
                  { 
                    width: `${scanResult.health_score}%`,
                    backgroundColor: getHealthColor(scanResult.health_score)
                  }
                ]} 
              />
            </View>
            <Text style={[styles.healthScore, { color: getHealthColor(scanResult.health_score) }]}>
              {scanResult.health_score}/100
            </Text>
          </View>
        )}

        {scanResult.is_toxic && (
          <View style={styles.warningCard}>
            <Text style={styles.warningIcon}>⚠️</Text>
            <Text style={styles.warningText}>This plant may be toxic to pets or humans</Text>
          </View>
        )}
      </View>

      {scanResult.care_info && (
        <View style={styles.careCard}>
          <Text style={styles.careTitle}>🌱 Care Instructions</Text>
          <Text style={styles.careText}>{scanResult.care_info}</Text>
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
          Our AI uses advanced plant recognition technology to identify species and assess health. 
          Results are most accurate with clear, well-lit photos of leaves and flowers.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    padding: 20,
    paddingTop: 60,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  backText: {
    fontSize: 16,
    color: '#27ae60',
    marginBottom: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  imageContainer: {
    alignItems: 'center',
    padding: 20,
  },
  plantImage: {
    width: 200,
    height: 200,
    borderRadius: 16,
  },
  resultCard: {
    backgroundColor: '#fff',
    margin: 20,
    padding: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  resultHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  plantName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2c3e50',
    flex: 1,
  },
  confidenceBadge: {
    backgroundColor: '#27ae60',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  confidenceText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  scientificName: {
    fontSize: 14,
    fontStyle: 'italic',
    color: '#666',
    marginBottom: 15,
  },
  healthContainer: {
    marginTop: 15,
  },
  healthLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 8,
  },
  healthBar: {
    height: 8,
    backgroundColor: '#f0f0f0',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  healthFill: {
    height: '100%',
    borderRadius: 4,
  },
  healthScore: {
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  warningCard: {
    backgroundColor: '#fff3cd',
    borderLeftWidth: 4,
    borderLeftColor: '#ffc107',
    padding: 15,
    marginTop: 15,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  warningIcon: {
    fontSize: 20,
    marginRight: 10,
  },
  warningText: {
    flex: 1,
    fontSize: 14,
    color: '#856404',
    fontWeight: '600',
  },
  careCard: {
    backgroundColor: '#fff',
    margin: 20,
    padding: 20,
    borderRadius: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#27ae60',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  careTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 10,
  },
  careText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  actionsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 15,
  },
  primaryButton: {
    flex: 1,
    backgroundColor: '#27ae60',
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  secondaryButton: {
    flex: 1,
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#27ae60',
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#27ae60',
    fontSize: 16,
    fontWeight: 'bold',
  },
  infoCard: {
    backgroundColor: '#f8f9fa',
    margin: 20,
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 12,
    color: '#666',
    lineHeight: 18,
  },
  errorText: {
    fontSize: 16,
    color: '#e74c3c',
    textAlign: 'center',
    marginTop: 100,
  },
  button: {
    backgroundColor: '#27ae60',
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 12,
    alignItems: 'center',
    margin: 20,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});