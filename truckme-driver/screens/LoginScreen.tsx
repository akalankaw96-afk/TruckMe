import React, { useState } from 'react';
import {
  View, Text, TextInput, Pressable, ActivityIndicator, Alert,
  StyleSheet, KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import client, { saveAuth } from '../api/client';
import { API_BASE_URL } from '../constants/Config';
import { DriverUser } from '../types';

interface Props {
  onLogin: (user: DriverUser) => void;
}

export default function LoginScreen({ onLogin }: Props) {
  const [mode, setMode] = useState<'signin' | 'register'>('signin');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Driver Register fields
  const [fullName, setFullName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [vehicleType, setVehicleType] = useState('OneTon');
  const [vehiclePlate, setVehiclePlate] = useState('');

  const [loading, setLoading] = useState(false);

  const login = async () => {
    if (!email || !password) {
      Alert.alert('Required', 'Enter email and password');
      return;
    }
    setLoading(true);
    try {
      const res = await client.post('/api/auth/login', { email, password });
      const userObj = res.data?.user || (res.data?.token && res.data?.userId ? {
        id: res.data.userId,
        email: res.data.email,
        fullName: res.data.fullName,
        role: res.data.role
      } : null);

      if (res.data?.token && userObj) {
        await saveAuth(res.data.token, userObj);
        onLogin(userObj);
      } else {
        Alert.alert('Login failed', 'Invalid login credentials or server response');
      }
    } catch (e: any) {
      Alert.alert('Login failed', e?.response?.data?.message || e?.message || 'Network error');
    } finally {
      setLoading(false);
    }
  };

  const register = async () => {
    if (!fullName.trim() || !email.trim() || !password || !phoneNumber.trim()) {
      Alert.alert('Required', 'Please fill in all driver registration fields');
      return;
    }

    setLoading(true);
    try {
      const res = await client.post('/api/auth/register', {
        fullName: fullName.trim(),
        email: email.trim(),
        phoneNumber: phoneNumber.trim(),
        password,
        role: 'Driver'
      });

      const userObj = res.data?.user || (res.data?.token && res.data?.userId ? {
        id: res.data.userId,
        email: res.data.email,
        fullName: res.data.fullName,
        role: res.data.role
      } : null);

      if (res.data?.token && userObj) {
        await saveAuth(res.data.token, userObj);
        Alert.alert('Welcome Partner!', `Driver account created for ${userObj.fullName}`);
        onLogin(userObj);
      } else {
        Alert.alert('Success', 'Driver account created. Please sign in.');
        setMode('signin');
      }
    } catch (e: any) {
      Alert.alert('Registration failed', e?.response?.data?.message || e?.message || 'Unable to register driver');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.brand}>
          <Text style={styles.logo}>🚛</Text>
          <Text style={styles.title}>TruckMe Driver</Text>
          <Text style={styles.tagline}>Transport Partner App • Sri Lanka</Text>
        </View>

        {/* Tab Switcher */}
        <View style={styles.tabContainer}>
          <Pressable
            style={[styles.tabBtn, mode === 'signin' && styles.tabBtnActive]}
            onPress={() => setMode('signin')}>
            <Text style={[styles.tabText, mode === 'signin' && styles.tabTextActive]}>Driver Sign In</Text>
          </Pressable>
          <Pressable
            style={[styles.tabBtn, mode === 'register' && styles.tabBtnActive]}
            onPress={() => setMode('register')}>
            <Text style={[styles.tabText, mode === 'register' && styles.tabTextActive]}>Driver Sign Up</Text>
          </Pressable>
        </View>

        <View style={styles.card}>
          {mode === 'register' && (
            <>
              <Text style={styles.label}>Full Name *</Text>
              <TextInput
                style={styles.input}
                placeholder="Saman Kumara"
                placeholderTextColor="#8895A8"
                value={fullName}
                onChangeText={setFullName}
              />

              <Text style={styles.label}>Phone Number *</Text>
              <TextInput
                style={styles.input}
                placeholder="+94 77 987 6543"
                placeholderTextColor="#8895A8"
                value={phoneNumber}
                onChangeText={setPhoneNumber}
                keyboardType="phone-pad"
              />

              <Text style={styles.label}>Vehicle Plate Number (Optional)</Text>
              <TextInput
                style={styles.input}
                placeholder="WP-CAB-9988"
                placeholderTextColor="#8895A8"
                value={vehiclePlate}
                onChangeText={setVehiclePlate}
              />
            </>
          )}

          <Text style={styles.label}>Email Address *</Text>
          <TextInput
            style={styles.input}
            placeholder={mode === 'signin' ? "driver001@gmail.com" : "saman@truckme.lk"}
            placeholderTextColor="#8895A8"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />

          <Text style={styles.label}>Password *</Text>
          <TextInput
            style={styles.input}
            placeholder="••••••••"
            placeholderTextColor="#8895A8"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />

          {mode === 'signin' ? (
            <Pressable style={[styles.button, loading && { opacity: 0.6 }]} onPress={login} disabled={loading}>
              {loading ? <ActivityIndicator color="white" /> : <Text style={styles.buttonText}>Sign in as Driver</Text>}
            </Pressable>
          ) : (
            <Pressable style={[styles.button, loading && { opacity: 0.6 }]} onPress={register} disabled={loading}>
              {loading ? <ActivityIndicator color="white" /> : <Text style={styles.buttonText}>Register Driver Account</Text>}
            </Pressable>
          )}

          <Pressable
            style={{ marginTop: 16, alignItems: 'center' }}
            onPress={() => setMode(mode === 'signin' ? 'register' : 'signin')}>
            <Text style={{ fontSize: 13, color: ORANGE, fontWeight: '600' }}>
              {mode === 'signin' ? "New driver partner? Join TruckMe" : "Already registered? Sign in"}
            </Text>
          </Pressable>

          <Text style={styles.hint}>API: {API_BASE_URL}</Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const NAVY = '#1A2B4A';
const ORANGE = '#F5A623';
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: NAVY },
  scroll: { flexGrow: 1, padding: 24, justifyContent: 'center' },
  brand: { alignItems: 'center', marginBottom: 24 },
  logo: { fontSize: 56 },
  title: { fontSize: 32, fontWeight: '900', color: 'white', marginTop: 4 },
  tagline: { fontSize: 13, color: '#A8B6CC', marginTop: 4 },

  tabContainer: {
    flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12, padding: 4, marginBottom: 16,
  },
  tabBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 10 },
  tabBtnActive: { backgroundColor: ORANGE },
  tabText: { fontSize: 14, fontWeight: '600', color: '#A8B6CC' },
  tabTextActive: { color: 'white', fontWeight: '800' },

  card: { backgroundColor: 'white', borderRadius: 14, padding: 24 },
  label: { fontSize: 12, fontWeight: '600', color: '#5A6B85', marginTop: 12, marginBottom: 4 },
  input: {
    borderWidth: 1, borderColor: '#D8E0EA', borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 12, fontSize: 15, color: NAVY,
    backgroundColor: '#FAFBFD',
  },
  button: {
    height: 52, borderRadius: 10, backgroundColor: ORANGE,
    alignItems: 'center', justifyContent: 'center', marginTop: 24,
  },
  buttonText: { color: 'white', fontSize: 16, fontWeight: '700' },
  hint: { fontSize: 11, color: '#8895A8', textAlign: 'center', marginTop: 16 },
});
