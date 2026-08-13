import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Platform, Modal, TextInput, Image } from 'react-native';
import { CommonActions } from '@react-navigation/native';
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import Toast from 'react-native-toast-message';
import { useAuth } from '../context/AuthContext';
import ApiService from '../services/api';
import { Icon, Badge, Button } from '../components/ui';
import { COLORS, FONTS, RADII, SHADOWS } from '../theme';

export default function ProfileScreen({ navigation }) {
  const { user, logout, updateUser } = useAuth();
  const [garden, setGarden] = useState([]);
  const [editModal, setEditModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ full_name: '', city: '', bio: '', address: '' });

  useFocusEffect(
    useCallback(() => {
      loadGarden();
    }, [])
  );

  const loadGarden = async () => {
    try {
      const res = await ApiService.getMyGarden();
      if (res.success) setGarden(res.data.garden || []);
    } catch (error) {}
  };

  const openEdit = () => {
    setForm({
      full_name: user?.full_name || '',
      city: user?.city || '',
      bio: user?.bio || '',
      address: user?.address || '',
    });
    setEditModal(true);
  };

  const saveProfile = async () => {
    setSaving(true);
    try {
      const res = await updateUser({
        full_name: form.full_name.trim(),
        city: form.city.trim(),
        bio: form.bio.trim(),
        address: form.address.trim(),
      });
      if (res.success) {
        setEditModal(false);
        Toast.show({ type: 'success', text1: 'Profile updated' });
      } else {
        Toast.show({ type: 'error', text1: 'Could not save', text2: res.message || 'Please check the details.' });
      }
    } catch (error) {
      Toast.show({ type: 'error', text1: 'Error', text2: error.message || 'Failed to save profile' });
    } finally {
      setSaving(false);
    }
  };

  const removeFromGarden = async (gardenId, plantName) => {
    try {
      await ApiService.removeFromGarden(gardenId);
      setGarden((prev) => prev.filter((g) => g.garden_id !== gardenId));
      Toast.show({ type: 'info', text1: `${plantName} removed from garden` });
    } catch (error) {
      Toast.show({ type: 'error', text1: 'Error', text2: error.message || 'Failed to remove' });
    }
  };

  const getInitials = () => {
    if (!user?.full_name) return 'U';
    const names = user.full_name.split(' ');
    if (names.length >= 2) return (names[0][0] + names[1][0]).toUpperCase();
    return names[0].charAt(0).toUpperCase();
  };

  const doLogout = async () => {
    try {
      await logout();
    } finally {
      navigation.dispatch(
        CommonActions.reset({
          index: 0,
          routes: [{ name: 'Auth', state: { index: 0, routes: [{ name: 'RoleSelection' }] } }],
        })
      );
    }
  };

  const handleLogout = () => {
    if (Platform.OS === 'web') {
      doLogout();
      return;
    }
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Logout', style: 'destructive', onPress: doLogout },
    ]);
  };

  const menuItems = [
    { label: 'My Orders', icon: 'package', screen: 'OrderTracking', roles: ['buyer'] },
    { label: 'Saved Plants', icon: 'heart', screen: 'Wishlist', roles: ['buyer'] },
    { label: 'Notifications', icon: 'bell', screen: 'Notifications', roles: ['buyer'] },
    { label: 'My Listings', icon: 'layers', screen: 'SellerDashboard', roles: ['seller'] },
    { label: 'My Deliveries', icon: 'navigation', screen: 'RiderDashboard', roles: ['rider'] },
    { label: 'Help & Support', icon: 'help-circle', action: 'help', roles: ['buyer', 'seller', 'rider'] },
  ];

  const filtered = menuItems.filter((item) => item.roles.includes(user?.role));

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#0B2E1A', '#276044']} style={styles.header}>
        <View style={styles.avatar}>
          {user?.avatar_url ? (
            <Image source={{ uri: user.avatar_url }} style={styles.avatarImage} />
          ) : (
            <Text style={styles.avatarText}>{getInitials()}</Text>
          )}
        </View>
        <View style={styles.nameRow}>
          <Text style={styles.name}>{user?.full_name || 'User'}</Text>
          {user?.is_verified ? <Badge label="Verified" tone="green" /> : null}
        </View>
        <Text style={styles.sub}>{user?.email || ''}</Text>
        {user?.city ? <Text style={styles.sub}>{user.city}</Text> : null}
        {user?.role === 'seller' && user?.is_verified ? (
          <Text style={styles.verifiedNote}>Verified seller — your listings are prioritized.</Text>
        ) : null}
        <TouchableOpacity style={styles.editBtn} onPress={openEdit} accessibilityLabel="Edit profile">
          <Icon name="edit-2" size={15} color={COLORS.white} />
          <Text style={styles.editBtnText}>Edit</Text>
        </TouchableOpacity>
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {garden.length > 0 ? (
          <View style={styles.gardenSection}>
            <View style={styles.gardenHeader}>
              <Text style={styles.gardenTitle}>My Garden</Text>
              <Text style={styles.gardenCount}>{garden.length} plants</Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.gardenRow}>
              {garden.map((item) => (
                <View key={item.garden_id} style={styles.gardenCard}>
                  {item.image_url ? (
                    <Image source={{ uri: item.image_url }} style={styles.gardenImage} resizeMode="cover" />
                  ) : (
                    <LinearGradient colors={['#D6F0E2', '#A8DDB5']} style={styles.gardenImage}>
                      <Text style={styles.gardenInitial}>{item.name?.charAt(0)?.toUpperCase() || 'P'}</Text>
                    </LinearGradient>
                  )}
                  <View style={styles.gardenInfo}>
                    <Text style={styles.gardenName} numberOfLines={1}>{item.name}</Text>
                    {item.nickname ? <Text style={styles.gardenNick}>"{item.nickname}"</Text> : null}
                    <Text style={styles.gardenReminder}>Water every {item.water_reminder_days || 7}d</Text>
                  </View>
                  <TouchableOpacity
                    style={styles.gardenRemove}
                    onPress={() => removeFromGarden(item.garden_id, item.name)}
                    accessibilityLabel="Remove from garden"
                  >
                    <Icon name="trash-2" size={14} color={COLORS.red} />
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>
          </View>
        ) : null}

        <View style={styles.menuWrap}>
          {filtered.map((item, index) => (
            <TouchableOpacity
              key={index}
              style={styles.menuItem}
              onPress={() => (item.action === 'help'
                ? Alert.alert('Help & Support', 'Email: support@plantea.pk\nPhone: +92 300 1234567')
                : navigation.navigate(item.screen))}
              activeOpacity={0.7}
            >
              <View style={styles.menuLeft}>
                <View style={styles.menuIconBg}>
                  <Icon name={item.icon} size={18} color={COLORS.p700} />
                </View>
                <Text style={styles.menuLabel}>{item.label}</Text>
              </View>
              <Icon name="chevron-right" size={18} color={COLORS.t4} />
            </TouchableOpacity>
          ))}

          <TouchableOpacity style={[styles.menuItem, styles.logoutItem]} onPress={handleLogout} activeOpacity={0.7}>
            <View style={styles.menuLeft}>
              <View style={[styles.menuIconBg, { backgroundColor: '#FBE3E1' }]}>
                <Icon name="log-out" size={18} color={COLORS.red} />
              </View>
              <Text style={[styles.menuLabel, styles.logoutText]}>Logout</Text>
            </View>
            <Icon name="chevron-right" size={18} color={COLORS.t4} />
          </TouchableOpacity>
        </View>

        <Text style={styles.version}>Plantea v1.0.0</Text>
      </ScrollView>

      <Modal visible={editModal} transparent animationType="slide" onRequestClose={() => setEditModal(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Profile</Text>
              <TouchableOpacity onPress={() => setEditModal(false)} accessibilityLabel="Close">
                <Icon name="x" size={20} color={COLORS.t3} />
              </TouchableOpacity>
            </View>
            <Field label="Full name" value={form.full_name} onChangeText={(v) => setForm({ ...form, full_name: v })} />
            <Field label="City" value={form.city} onChangeText={(v) => setForm({ ...form, city: v })} />
            <Field label="Bio" value={form.bio} onChangeText={(v) => setForm({ ...form, bio: v })} multiline />
            <Field label="Delivery address" value={form.address} onChangeText={(v) => setForm({ ...form, address: v })} multiline />
            <Button title="Save changes" loading={saving} onPress={saveProfile} style={{ marginTop: 8 }} />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const Field = ({ label, ...rest }) => (
  <View style={styles.fieldWrap}>
    <Text style={styles.fieldLabel}>{label}</Text>
    <TextInput
      style={styles.fieldInput}
      placeholderTextColor={COLORS.t4}
      {...rest}
    />
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  header: {
    padding: 20,
    paddingTop: 60,
    paddingBottom: 26,
    alignItems: 'center',
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  avatar: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: 'rgba(255,255,255,0.92)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: 'rgba(255, 255, 255, 0.25)',
    marginBottom: 10,
    overflow: 'hidden',
  },
  avatarImage: { width: 84, height: 84 },
  avatarText: { fontFamily: FONTS.soraExtraBold, fontSize: 28, color: COLORS.p700 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  name: { fontFamily: FONTS.soraExtraBold, fontSize: 20, color: COLORS.white },
  sub: { fontFamily: FONTS.nunito, fontSize: 13, color: COLORS.p300, marginTop: 2 },
  verifiedNote: {
    fontFamily: FONTS.nunitoBold, fontSize: 11, color: COLORS.p200, marginTop: 8,
  },
  editBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: RADII.btn,
    paddingHorizontal: 14, paddingVertical: 7, marginTop: 12,
  },
  editBtnText: { fontFamily: FONTS.nunitoBold, fontSize: 12, color: COLORS.white },
  content: { flex: 1 },
  gardenSection: { marginTop: 16 },
  gardenHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 18, marginBottom: 10,
  },
  gardenTitle: { fontFamily: FONTS.soraBold, fontSize: 16, color: COLORS.t1 },
  gardenCount: { fontFamily: FONTS.nunitoBold, fontSize: 12, color: COLORS.t3 },
  gardenRow: { paddingHorizontal: 18, gap: 12, paddingBottom: 8 },
  gardenCard: {
    width: 140, backgroundColor: COLORS.white, borderRadius: RADII.card,
    overflow: 'hidden', ...SHADOWS.card, position: 'relative',
  },
  gardenImage: { width: '100%', height: 90, alignItems: 'center', justifyContent: 'center' },
  gardenInitial: { fontFamily: FONTS.soraExtraBold, fontSize: 26, color: COLORS.p700 },
  gardenInfo: { padding: 10 },
  gardenName: { fontFamily: FONTS.nunitoBold, fontSize: 13, color: COLORS.t1 },
  gardenNick: { fontFamily: FONTS.nunito, fontSize: 11, color: COLORS.t3, marginTop: 1, fontStyle: 'italic' },
  gardenReminder: { fontFamily: FONTS.nunitoBold, fontSize: 10, color: COLORS.p600, marginTop: 4 },
  gardenRemove: {
    position: 'absolute', top: 6, right: 6,
    backgroundColor: COLORS.white, borderRadius: 12,
    padding: 5, ...SHADOWS.card,
  },
  menuWrap: { marginTop: 8 },
  menuItem: {
    backgroundColor: COLORS.white,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  menuLeft: { flexDirection: 'row', alignItems: 'center' },
  menuIconBg: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: COLORS.p50, alignItems: 'center', justifyContent: 'center', marginRight: 12,
  },
  menuLabel: { fontFamily: FONTS.nunitoBold, fontSize: 15, color: COLORS.t1 },
  logoutItem: { marginTop: 18 },
  logoutText: { color: COLORS.red },
  version: { fontFamily: FONTS.nunito, fontSize: 12, color: COLORS.t4, textAlign: 'center', marginTop: 24, marginBottom: 30 },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 24 },
  modalCard: { backgroundColor: COLORS.white, borderRadius: 20, padding: 20 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  modalTitle: { fontFamily: FONTS.soraBold, fontSize: 18, color: COLORS.t1 },
  fieldWrap: { marginBottom: 12 },
  fieldLabel: { fontFamily: FONTS.nunitoBold, fontSize: 12, color: COLORS.t2, marginBottom: 5 },
  fieldInput: {
    fontFamily: FONTS.nunito, fontSize: 14, color: COLORS.t1,
    borderWidth: 1.5, borderColor: COLORS.border, borderRadius: RADII.btn,
    padding: 12, minHeight: 44, textAlignVertical: 'top',
  },
});
