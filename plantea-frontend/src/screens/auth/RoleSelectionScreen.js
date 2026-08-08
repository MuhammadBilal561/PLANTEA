import { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

const roles = [
  { id: 'buyer', title: 'Buyer', desc: 'Browse & buy verified plants', icon: '🛒' },
  { id: 'seller', title: 'Seller', desc: 'List & sell your plants', icon: '🌱' },
  { id: 'rider', title: 'Rider', desc: 'Deliver & earn flexibly', icon: '🛵' },
];

export default function RoleSelectionScreen({ navigation }) {
  const [selected, setSelected] = useState('buyer');

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Welcome to{'\n'}Plantea 🌱</Text>
      <Text style={styles.subtitle}>Pick your role to continue</Text>

      {roles.map((role) => (
        <TouchableOpacity
          key={role.id}
          style={[styles.card, selected === role.id && styles.cardSelected]}
          onPress={() => setSelected(role.id)}
        >
          <Text style={styles.icon}>{role.icon}</Text>
          <View style={styles.cardText}>
            <Text style={styles.cardTitle}>{role.title}</Text>
            <Text style={styles.cardDesc}>{role.desc}</Text>
          </View>
          {selected === role.id && <Text style={styles.check}>✅</Text>}
        </TouchableOpacity>
      ))}

      <TouchableOpacity
        style={styles.continueBtn}
        onPress={() => {
          navigation.navigate('Login', { role: selected });
        }}
      >
        <Text style={styles.continueBtnText}>
          Continue as {roles.find(r => r.id === selected)?.title} →
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() => {
          navigation.navigate('Login', { role: selected });
        }}
      >
        <Text style={styles.loginText}>Already have account? Login</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    padding: 24,
    paddingTop: 60,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1B4332',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#888',
    marginBottom: 32,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#E0E0E0',
    marginBottom: 12,
    backgroundColor: '#FAFAFA',
  },
  cardSelected: {
    borderColor: '#1B4332',
    backgroundColor: '#F0FFF4',
  },
  icon: { fontSize: 28, marginRight: 14 },
  cardText: { flex: 1 },
  cardTitle: { fontSize: 16, fontWeight: 'bold', color: '#1B4332' },
  cardDesc: { fontSize: 12, color: '#888', marginTop: 2 },
  check: { fontSize: 20 },
  continueBtn: {
    backgroundColor: '#1B4332',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 12,
  },
  continueBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: 'bold' },
  loginText: { textAlign: 'center', color: '#1B4332', fontSize: 14 },
});