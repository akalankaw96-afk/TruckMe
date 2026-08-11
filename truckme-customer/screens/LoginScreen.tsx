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
  const [errorBanner, setErrorBanner] = useState<string | null>(null);

  // Forgot Password OTP state
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [resetStep, setResetStep] = useState<1 | 2>(1);
  const [resetEmail, setResetEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [newPassword, setNewPassword] = useState('');

  const parseErrorMessage = (e: any): string => {
    const data = e?.response?.data;
    if (!data) return e?.message || 'Network error';
    if (data.message && data.errors) {
      const fieldErrors = Object.values(data.errors).flat().join(' • ');
      return fieldErrors ? `${data.message}: ${fieldErrors}` : data.message;
    }
    return data.message || 'Validation error';
  };

  const handleRequestOtp = async () => {
    if (!resetEmail.trim()) {
      Alert.alert('Required', 'Please enter your account email address.');
      return;
    }
    setLoading(true);
    try {
      const res = await client.post('/api/auth/forgot-password', { email: resetEmail.trim() });
      Alert.alert('OTP Sent 📲', res.data?.message || 'Verification code sent to your email.');
      if (res.data?.otpCode) setOtpCode(res.data.otpCode);
      setResetStep(2);
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.message || 'Failed to request password reset');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!otpCode.trim() || !newPassword.trim()) {
      Alert.alert('Required', 'Enter the 6-digit OTP code and your new password.');
      return;
    }
    setLoading(true);
    try {
      const res = await client.post('/api/auth/reset-password', {
        email: resetEmail.trim(),
        otpCode: otpCode.trim(),
        newPassword: newPassword.trim(),
      });
      Alert.alert('Password Reset Success 🎉', res.data?.message || 'You can now sign in with your new password.');
      setShowForgotModal(false);
      setEmail(resetEmail.trim());
      setPassword(newPassword.trim());
    } catch (e: any) {
      Alert.alert('Reset Failed ⚠️', e?.response?.data?.message || 'Invalid verification code');
    } finally {
      setLoading(false);
    }
  };

  const handleSignIn = async () => {
    setErrorBanner(null);
    if (!email || !password) {
      setErrorBanner('Enter your email and password.');
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
        setErrorBanner('Invalid login response from server');
        Alert.alert('Failed', 'Invalid login response from server');
      }
    } catch (e: any) {
      const msg = parseErrorMessage(e);
      setErrorBanner(msg);
      Alert.alert('Login Failed ⚠️', msg);
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    setErrorBanner(null);
    if (!fullName.trim() || !email.trim() || !password || !phoneNumber.trim()) {
      setErrorBanner('Please fill in all registration fields.');
      Alert.alert('Required', 'Please fill in all registration fields');
      return;
    }
    if (password.length < 6) {
      setErrorBanner('Password must be at least 6 characters.');
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
      const msg = parseErrorMessage(e);
      setErrorBanner(msg);
      Alert.alert('Registration Error ⚠️', msg);
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
          {errorBanner && (
            <View style={styles.errorBox}>
              <Text style={styles.errorBoxText}>⚠️ {errorBanner}</Text>
            </View>
          )}
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

          {mode === 'signin' && (
            <Pressable
              style={{ marginTop: 8, alignSelf: 'flex-end' }}
              onPress={() => {
                setResetEmail(email);
                setResetStep(1);
                setShowForgotModal(true);
              }}>
              <Text style={{ fontSize: 12, color: ORANGE, fontWeight: '700' }}>Forgot password?</Text>
            </Pressable>
          )}

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

          {/* Forgot Password Modal */}
      {showForgotModal && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>🔑 Forgot Password</Text>
            <Text style={styles.modalSub}>
              {resetStep === 1
                ? 'Enter your account email address to receive a 6-digit verification code.'
                : `Enter the 6-digit OTP code sent to ${resetEmail} and your new password.`}
            </Text>

            {resetStep === 1 ? (
              <>
                <Text style={styles.label}>Email Address *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="kasun@gmail.com"
                  placeholderTextColor="#8895A8"
                  value={resetEmail}
                  onChangeText={setResetEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                />
                <Pressable style={styles.button} onPress={handleRequestOtp} disabled={loading}>
                  {loading ? <ActivityIndicator color="white" /> : <Text style={styles.buttonText}>Send Verification Code →</Text>}
                </Pressable>
              </>
            ) : (
              <>
                <Text style={styles.label}>6-Digit OTP Verification Code *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="849201"
                  placeholderTextColor="#8895A8"
                  value={otpCode}
                  onChangeText={setOtpCode}
                  keyboardType="number-pad"
                />

                <Text style={styles.label}>New Password *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="At least 6 characters"
                  placeholderTextColor="#8895A8"
                  value={newPassword}
                  onChangeText={setNewPassword}
                  secureTextEntry
                />

                <Pressable style={styles.button} onPress={handleResetPassword} disabled={loading}>
                  {loading ? <ActivityIndicator color="white" /> : <Text style={styles.buttonText}>Reset Password & Sign In ✓</Text>}
                </Pressable>
              </>
            )}

            <Pressable style={{ marginTop: 16, alignItems: 'center' }} onPress={() => setShowForgotModal(false)}>
              <Text style={{ fontSize: 13, color: '#8895A8', fontWeight: '700' }}>Cancel</Text>
            </Pressable>
          </View>
        </View>
      )}

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

  errorBox: { backgroundColor: '#FEE2E2', borderWidth: 1, borderColor: '#EF4444', borderRadius: 8, padding: 12, marginBottom: 12 },
  errorBoxText: { color: '#991B1B', fontSize: 13, fontWeight: '700', lineHeight: 18 },

  modalOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center', padding: 20, zIndex: 1000,
  },
  modalCard: { backgroundColor: 'white', borderRadius: 16, padding: 24, width: '100%', maxWidth: 400 },
  modalTitle: { fontSize: 18, fontWeight: '800', color: NAVY, marginBottom: 6 },
  modalSub: { fontSize: 12, color: '#5A6B85', marginBottom: 16, lineHeight: 18 },
});
