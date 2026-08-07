import React, { useState } from 'react';
import {
  View, Text, TextInput, Pressable, ActivityIndicator,
  StyleSheet, KeyboardAvoidingView, Platform, ScrollView, Alert,
} from 'react-native';
import client, { saveAuth } from '../api/client';
import { API_BASE_URL } from '../constants/Config';
import { AuthUser } from '../types';

interface Props {
  onLogin: (u: AuthUser) => void;
}

export default function LoginScreen({ onLogin }: Props) {
  const [mode, setMode] = useState<'signin' | 'register'>('signin');

  // Sign In fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Register extra fields
  const [fullName, setFullName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [accountType, setAccountType] = useState<'individual' | 'business'>('individual');
  const [companyName, setCompanyName] = useState('');

  const [loading, setLoading] = useState(false);

  const handleSignIn = async () => {
    if (!email || !password) {
      Alert.alert('Required', 'Enter your email and password');
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
        Alert.alert('Failed', 'Invalid login response from server');
      }
    } catch (e: any) {
      Alert.alert('Login failed', e?.response?.data?.message || e?.message || 'Network error');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    if (!fullName.trim() || !email.trim() || !password || !phoneNumber.trim()) {
      Alert.alert('Required', 'Please fill in all registration fields');
      return;
    }
    if (password.length < 6) {
      Alert.alert('Password too short', 'Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    try {
      const res = await client.post('/api/auth/register', {
        fullName: fullName.trim(),
        email: email.trim(),
        phoneNumber: phoneNumber.trim(),
        password,
        role: 'Customer',
        companyName: accountType === 'business' ? companyName : undefined
      });

      const userObj = res.data?.user || (res.data?.token && res.data?.userId ? {
        id: res.data.userId,
        email: res.data.email,
        fullName: res.data.fullName,
        role: res.data.role
      } : null);

      if (res.data?.token && userObj) {
        await saveAuth(res.data.token, userObj);
        Alert.alert('Welcome to TruckMe!', `Account created successfully for ${userObj.fullName}`);
        onLogin(userObj);
      } else {
        Alert.alert('Account Created', 'Registration successful! Please sign in.');
        setMode('signin');
      }
    } catch (e: any) {
      Alert.alert('Registration failed', e?.response?.data?.message || e?.message || 'Unable to register account');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Text style={styles.brand}>🚚 TruckMe</Text>
        <Text style={styles.tagline}>Book the Right Truck, Anytime in Sri Lanka</Text>

        {/* Mode Switcher Tabs */}
        <View style={styles.tabContainer}>
          <Pressable
            style={[styles.tabBtn, mode === 'signin' && styles.tabBtnActive]}
            onPress={() => setMode('signin')}>
            <Text style={[styles.tabText, mode === 'signin' && styles.tabTextActive]}>Sign In</Text>
          </Pressable>
          <Pressable
            style={[styles.tabBtn, mode === 'register' && styles.tabBtnActive]}
            onPress={() => setMode('register')}>
            <Text style={[styles.tabText, mode === 'register' && styles.tabTextActive]}>Create Account</Text>
          </Pressable>
        </View>

        <View style={styles.card}>
          {mode === 'register' && (
            <>
              {/* Account Type Selector */}
              <Text style={styles.label}>Account Type</Text>
              <View style={styles.chipRow}>
                <Pressable
                  style={[styles.chip, accountType === 'individual' && styles.chipActive]}
                  onPress={() => setAccountType('individual')}>
                  <Text style={[styles.chipText, accountType === 'individual' && styles.chipTextActive]}>
                    👤 Individual Customer
                  </Text>
                </Pressable>
                <Pressable
                  style={[styles.chip, accountType === 'business' && styles.chipActive]}
                  onPress={() => setAccountType('business')}>
                  <Text style={[styles.chipText, accountType === 'business' && styles.chipTextActive]}>
                    🏢 Business / FMCG
                  </Text>
                </Pressable>
              </View>

              {accountType === 'business' && (
                <>
                  <Text style={styles.label}>Company / Business Name</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Lanka FMCG Distributors Ltd"
                    placeholderTextColor="#8895A8"
                    value={companyName}
                    onChangeText={setCompanyName}
                  />
                </>
              )}

              <Text style={styles.label}>Full Name *</Text>
              <TextInput
                style={styles.input}
                placeholder="Kasun Perera"
                placeholderTextColor="#8895A8"
                value={fullName}
                onChangeText={setFullName}
              />

              <Text style={styles.label}>Phone Number *</Text>
              <TextInput
                style={styles.input}
                placeholder="+94 77 123 4567"
                placeholderTextColor="#8895A8"
                value={phoneNumber}
                onChangeText={setPhoneNumber}
                keyboardType="phone-pad"
              />
            </>
          )}

          <Text style={styles.label}>Email Address *</Text>
          <TextInput
            style={styles.input}
            placeholder={mode === 'signin' ? "cus001@gmail.com" : "kasun@gmail.com"}
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
            <Pressable style={[styles.button, loading && { opacity: 0.6 }]} onPress={handleSignIn} disabled={loading}>
              {loading ? <ActivityIndicator color="white" /> : <Text style={styles.buttonText}>Sign in</Text>}
            </Pressable>
          ) : (
            <Pressable style={[styles.button, loading && { opacity: 0.6 }]} onPress={handleRegister} disabled={loading}>
              {loading ? <ActivityIndicator color="white" /> : <Text style={styles.buttonText}>Create Customer Account</Text>}
            </Pressable>
          )}

          <Pressable
            style={{ marginTop: 16, alignItems: 'center' }}
            onPress={() => setMode(mode === 'signin' ? 'register' : 'signin')}>
            <Text style={{ fontSize: 13, color: ORANGE, fontWeight: '600' }}>
              {mode === 'signin' ? "Don't have an account? Sign up here" : "Already have an account? Sign in"}
            </Text>
          </Pressable>

          <Text style={styles.hint}>Connected to {API_BASE_URL}</Text>
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
  brand: { fontSize: 40, fontWeight: '900', color: 'white', textAlign: 'center' },
  tagline: { fontSize: 13, color: '#A8B6CC', textAlign: 'center', marginTop: 8, marginBottom: 24 },

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
    paddingHorizontal: 12, paddingVertical: 12, fontSize: 15, color: '#1A2B4A', backgroundColor: '#FAFBFD',
  },

  chipRow: { flexDirection: 'row', gap: 8, marginTop: 4, marginBottom: 4 },
  chip: {
    flex: 1, paddingVertical: 10, borderRadius: 8,
    borderWidth: 1.5, borderColor: '#D8E0EA',
    alignItems: 'center', backgroundColor: '#FAFBFD',
  },
  chipActive: { backgroundColor: NAVY, borderColor: NAVY },
  chipText: { fontSize: 11, color: '#5A6B85', fontWeight: '600' },
  chipTextActive: { color: 'white', fontWeight: '700' },

  button: { height: 52, borderRadius: 10, backgroundColor: ORANGE, alignItems: 'center', justifyContent: 'center', marginTop: 24 },
  buttonText: { color: 'white', fontSize: 16, fontWeight: '700' },
  hint: { fontSize: 11, color: '#8895A8', textAlign: 'center', marginTop: 16 },
});
