import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Image, ActivityIndicator } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import Toast from 'react-native-toast-message';
import ApiService from '../../services/api';
import { COLORS, FONTS, RADII } from '../../theme';
import Icon from '../../components/ui/Icon';

const guessContentType = (uri) => {
  const ext = (uri || '').match(/\.([a-zA-Z0-9]+)(\?|#|$)/)?.[1]?.toLowerCase();
  if (ext === 'png') return 'image/png';
  if (ext === 'webp') return 'image/webp';
  return 'image/jpeg';
};

const uploadImage = async ({ imageAsset }) => {
  if (!imageAsset?.base64) return null;
  const contentType = guessContentType(imageAsset.uri);
  const response = await ApiService.uploadImage(imageAsset.base64, contentType);
  if (response.success && response.data?.url) {
    return ApiService.absoluteUrl(response.data.url);
  }
  return null;
};

export default function AddPlantListingScreen({ navigation, route }) {
  const [image, setImage] = useState(null);
  const [name, setName] = useState('');
  const [scientificName, setScientificName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [category, setCategory] = useState('');
  const [city, setCity] = useState('');
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [isAiVerified, setIsAiVerified] = useState(false);
  const [aiScore, setAiScore] = useState(null);

  useEffect(() => {
    if (route.params?.aiScanned && route.params?.aiScore) {
      if (route.params.aiScore >= 0.70) {
        setIsAiVerified(true);
        setAiScore(route.params.aiScore);
        if (route.params.plantName) setName(route.params.plantName);
        if (route.params.scientificName) setScientificName(route.params.scientificName);
      }
    }
  }, [route.params]);

  const categories = ['Indoor', 'Outdoor', 'Rare', 'Flowering', 'Medicinal', 'Succulent'];
  const cities = ['Lahore', 'Karachi', 'Islamabad', 'Faisalabad'];

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
      base64: true,
    });

    if (!result.canceled) {
      setImage(result.assets[0]);
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!name.trim()) newErrors.name = true;
    if (!description.trim()) newErrors.description = true;
    if (!price || isNaN(price) || parseFloat(price) <= 0) newErrors.price = true;
    if (!quantity || isNaN(quantity) || parseInt(quantity) <= 0) newErrors.quantity = true;
    if (!category) newErrors.category = true;
    if (!city) newErrors.city = true;
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      Toast.show({
        type: 'error',
        text1: 'Validation Error',
        text2: 'Please fill all required fields',
      });
      return;
    }

    setLoading(true);
    try {
      const imageUrl = image ? await uploadImage({ imageAsset: image }) : null;

      const insertPayload = {
        name: name.trim(),
        scientific_name: scientificName.trim() || null,
        description: description.trim(),
        price_pkr: parseFloat(price),
        stock_quantity: parseInt(quantity, 10),
        category,
        city,
        image_url: imageUrl,
        ai_verified: isAiVerified,
        health_score: isAiVerified && aiScore ? Math.round(aiScore * 100) : null,
      };

      const response = await ApiService.createPlant(insertPayload);
      if (!response.success) throw new Error(response.message || 'Failed to list plant');

      Toast.show({
        type: 'success',
        text1: 'Success',
        text2: 'Plant listed successfully',
      });
      navigation.goBack();
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: error.message || 'Failed to list plant',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Icon name="arrow-left" size={18} color={COLORS.t1} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Add Plant Listing</Text>
        <TouchableOpacity style={styles.closeButton} onPress={() => navigation.goBack()}>
          <Icon name="x" size={18} color={COLORS.t3} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} keyboardShouldPersistTaps="handled">
        <TouchableOpacity style={styles.imagePicker} onPress={pickImage}>
          {image ? (
            <Image source={{ uri: image.uri }} style={styles.imagePreview} />
          ) : (
            <View style={styles.imagePickerEmpty}>
              <Icon name="camera" size={36} color={COLORS.p400} />
              <Text style={styles.imagePickerText}>Tap to add photo</Text>
            </View>
          )}
        </TouchableOpacity>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Plant Name *</Text>
          <TextInput
            style={[styles.input, errors.name && styles.inputError]}
            placeholder="e.g., Monstera Deliciosa"
            placeholderTextColor={COLORS.t4}
            value={name}
            onChangeText={(text) => {
              setName(text);
              if (errors.name) setErrors({ ...errors, name: false });
            }}
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Scientific Name</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g., Monstera deliciosa"
            placeholderTextColor={COLORS.t4}
            value={scientificName}
            onChangeText={setScientificName}
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Description *</Text>
          <TextInput
            style={[styles.inputMultiline, errors.description && styles.inputError]}
            placeholder="Describe your plant..."
            placeholderTextColor={COLORS.t4}
            value={description}
            onChangeText={(text) => {
              setDescription(text);
              if (errors.description) setErrors({ ...errors, description: false });
            }}
            multiline
            numberOfLines={4}
          />
        </View>

        <View style={styles.formRow}>
          <View style={[styles.formGroup, { flex: 1, marginRight: 8 }]}>
            <Text style={styles.label}>Price (PKR) *</Text>
            <TextInput
              style={[styles.input, errors.price && styles.inputError]}
              placeholder="0"
              placeholderTextColor={COLORS.t4}
              value={price}
              onChangeText={(text) => {
                setPrice(text);
                if (errors.price) setErrors({ ...errors, price: false });
              }}
              keyboardType="numeric"
            />
          </View>

          <View style={[styles.formGroup, { flex: 1, marginLeft: 8 }]}>
            <Text style={styles.label}>Quantity *</Text>
            <TextInput
              style={[styles.input, errors.quantity && styles.inputError]}
              placeholder="1"
              placeholderTextColor={COLORS.t4}
              value={quantity}
              onChangeText={(text) => {
                setQuantity(text);
                if (errors.quantity) setErrors({ ...errors, quantity: false });
              }}
              keyboardType="numeric"
            />
          </View>
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Category *</Text>
          <View style={styles.chipsContainer}>
            {categories.map((cat) => (
              <TouchableOpacity
                key={cat}
                style={[
                  styles.chip,
                  category === cat && styles.chipSelected,
                  errors.category && !category && styles.chipError,
                ]}
                onPress={() => {
                  setCategory(cat);
                  if (errors.category) setErrors({ ...errors, category: false });
                }}
              >
                <Text style={[
                  styles.chipText,
                  category === cat && styles.chipTextSelected,
                ]}>
                  {cat}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>City *</Text>
          <View style={styles.chipsContainer}>
            {cities.map((c) => (
              <TouchableOpacity
                key={c}
                style={[
                  styles.chip,
                  city === c && styles.chipSelected,
                  errors.city && !city && styles.chipError,
                ]}
                onPress={() => {
                  setCity(c);
                  if (errors.city) setErrors({ ...errors, city: false });
                }}
              >
                <Text style={[
                  styles.chipText,
                  city === c && styles.chipTextSelected,
                ]}>
                  {c}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

{isAiVerified && (
            <View style={styles.aiBadgeActive}>
              <Icon name="check-circle" size={14} color={COLORS.p700} />
              <Text style={styles.aiBadgeActiveText}>AI Verified ({(aiScore * 100).toFixed(0)}% Match)</Text>
            </View>
          )}
          <TouchableOpacity
          style={styles.aiButton}
          onPress={() => navigation.navigate('AiScanner', { returnTo: 'AddPlantListing' })}
        >
          <Icon name="search" size={16} color={COLORS.p700} />
          <Text style={styles.aiButtonText}>Use AI Scanner to identify plant</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.submitButton, loading && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={COLORS.white} />
          ) : (
            <>
              <Icon name="plus" size={18} color={COLORS.white} />
              <Text style={styles.submitButtonText}>List Plant</Text>
            </>
          )}
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    paddingTop: 60,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.p100,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: COLORS.p50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: COLORS.p50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontFamily: FONTS.soraExtraBold,
    fontSize: 22,
    color: COLORS.t1,
  },
  content: {
    flex: 1,
    padding: 18,
  },
  imagePicker: {
    width: '100%',
    height: 180,
    borderRadius: RADII.card,
    backgroundColor: COLORS.p50,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: COLORS.p300,
    overflow: 'hidden',
    marginBottom: 20,
  },
  imagePickerEmpty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imagePickerText: {
    fontFamily: FONTS.nunito,
    fontSize: 14,
    color: COLORS.t3,
  },
  imagePreview: {
    width: '100%',
    height: '100%',
  },
  formGroup: {
    marginBottom: 16,
  },
  formRow: {
    flexDirection: 'row',
  },
  label: {
    fontFamily: FONTS.nunitoBold,
    fontSize: 12,
    color: COLORS.t1,
    marginBottom: 6,
  },
  input: {
    backgroundColor: COLORS.bg,
    borderRadius: 12,
    padding: 14,
    fontSize: 14,
    fontFamily: FONTS.nunito,
    color: COLORS.t1,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  inputMultiline: {
    backgroundColor: COLORS.bg,
    borderRadius: 12,
    padding: 14,
    fontSize: 14,
    fontFamily: FONTS.nunito,
    color: COLORS.t1,
    borderWidth: 2,
    borderColor: 'transparent',
    height: 100,
    textAlignVertical: 'top',
  },
  inputError: {
    borderColor: COLORS.red,
  },
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    backgroundColor: COLORS.white,
    borderWidth: 2,
    borderColor: COLORS.p100,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: RADII.chip,
  },
  chipSelected: {
    backgroundColor: COLORS.p700,
    borderColor: COLORS.p700,
  },
  chipError: {
    borderColor: COLORS.red,
  },
  chipText: {
    fontFamily: FONTS.nunitoBold,
    fontSize: 12,
    color: COLORS.t2,
  },
  chipTextSelected: {
    color: COLORS.white,
  },
  aiButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 2,
    borderColor: COLORS.p700,
    borderRadius: RADII.btn,
    paddingVertical: 14,
    marginTop: 8,
    marginBottom: 20,
  },
  aiButtonText: {
    fontFamily: FONTS.soraBold,
    fontSize: 14,
    color: COLORS.p700,
  },
  aiBadgeActive: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(58, 140, 98, 0.1)',
    borderWidth: 1,
    borderColor: COLORS.p700,
    borderRadius: RADII.btn,
    paddingVertical: 12,
    marginBottom: 10,
  },
  aiBadgeActiveText: {
    fontFamily: FONTS.soraBold,
    fontSize: 14,
    color: COLORS.p700,
  },
  submitButton: {
    backgroundColor: COLORS.p700,
    borderRadius: RADII.btn,
    height: 54,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  submitButtonDisabled: {
    backgroundColor: COLORS.t4,
  },
  submitButtonText: {
    fontFamily: FONTS.soraBold,
    fontSize: 15,
    color: COLORS.white,
  },
});
