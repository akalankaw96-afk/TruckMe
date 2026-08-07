import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, Pressable,
  ActivityIndicator, RefreshControl, Alert, TextInput,
  KeyboardTypeOptions,
} from 'react-native';
import client from '../api/client';
import AsyncStorage from '@react-native-async-storage/async-storage';

const HARDCODED_USER_ID = 'YOUR_DRIVER_USER_ID'; // replace

interface Props {
  onBack: () => void;
}

interface FieldProps {
  label: string;
  value: string;
  onChange: (text: string) => void;
  placeholder?: string;
  keyboardType?: KeyboardTypeOptions;
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  keyboardType,
}: FieldProps) {
  return (
    <View style={{ marginBottom: 12 }}>
      <Text style={styles.fieldLabel}>{label}</Text>

      <TextInput
        style={styles.fieldInput}
        value={value}
        onChangeText={onChange}   // ✅ IMPORTANT
        placeholder={placeholder}
        placeholderTextColor="#8895A8"
        keyboardType={keyboardType}
      />
    </View>
  );
}

export default function DriverVehicleScreen({ onBack }: Props) {
  const [vehicle, setVehicle] = useState<any>(null);
  const [driver, setDriver] = useState<any>(null);
  const [vehicleTypes, setVehicleTypes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [formData, setFormData] = useState({
    registrationNumber: '',
    make: '',
    model: '',
    year: '',
    color: '',
    capacityKg: '',
    vehicleTypeId: '',
  });
  const [submitting, setSubmitting] = useState(false);

  const load = async () => {
    try {
      const cached = await AsyncStorage.getItem('truckme_driver_user');
      const uid = cached ? JSON.parse(cached).id : HARDCODED_USER_ID;

      // Get driver record (which has the driver.Id, not user.Id)
      const driverRes = await client.get(`/api/drivers/${uid}`);
      const drv = driverRes.data;
      setDriver(drv);

      // Get vehicle types
      const vtRes = await client.get('/api/vehicletypes');
      setVehicleTypes(vtRes.data || []);

      // Get vehicles for this driver
      const vRes = await client.get(`/api/vehicles/${drv.id}`);
      const list = vRes.data || [];
      setVehicle(list[0] || null);
    } catch (e: any) {
      console.error('[Vehicle] error:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const registerVehicle = async () => {
    if (!formData.registrationNumber || !formData.make || !formData.model) {
      Alert.alert('Required', 'Registration, make, and model are required');
      return;
    }
    if (!driver) {
      Alert.alert('Error', 'Driver profile not loaded');
      return;
    }
    setSubmitting(true);
    try {
      await client.post('/api/vehicles', {
        driverId: driver.id,
        vehicleTypeId: formData.vehicleTypeId || vehicleTypes[0]?.id,
        registrationNumber: formData.registrationNumber,
        make: formData.make,
        model: formData.model,
        year: parseInt(formData.year) || new Date().getFullYear(),
        color: formData.color,
        capacityKg: parseFloat(formData.capacityKg) || 1000,
      });
      Alert.alert('Vehicle registered', 'Awaiting admin approval');
      await load();
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.message || 'Failed');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <View style={styles.center}><ActivityIndicator color="#F5A623" size="large" /></View>;
  }

  if (vehicle) {
    return (
      <ScrollView style={{ flex: 1, backgroundColor: '#F4F7FB' }} contentContainerStyle={{ padding: 16 }}>
        <View style={styles.headerCard}>
          <Text style={styles.emoji}>🚚</Text>
          <Text style={styles.title}>{vehicle.make} {vehicle.model}</Text>
          <Text style={styles.regNo}>{vehicle.registrationNumber}</Text>
          <View style={[styles.statusBadge, {
            backgroundColor: vehicle.approvalStatus === 'Approved' ? '#27AE60' : '#F39C12'
          }]}>
            <Text style={styles.statusText}>
              {vehicle.approvalStatus === 'Approved' ? '✓ Approved' : '⏳ ' + vehicle.approvalStatus}
            </Text>
          </View>
        </View>

        <View style={styles.card}>
          <Row label="Year" value={String(vehicle.year)} />
          <Row label="Color" value={vehicle.color || '—'} />
          <Row label="Capacity" value={`${vehicle.capacityKg} kg`} />
          <Row label="Status" value={vehicle.status} />
          {vehicle.insurancePolicyNumber && <Row label="Insurance" value={vehicle.insurancePolicyNumber} />}
        </View>
      </ScrollView>
    );
  }

  // No vehicle — show registration form
  return (
    <ScrollView style={{ flex: 1, backgroundColor: '#F4F7FB' }} contentContainerStyle={{ padding: 16 }}>
      <Text style={styles.title}>Register your vehicle</Text>
      <Text style={styles.subtitle}>Tell us about the truck you drive</Text>

      <Field label="Registration number *" value={formData.registrationNumber} onChange={v => setFormData({ ...formData, registrationNumber: v })} placeholder="WP CAB-1234" />
      <Field label="Make *" value={formData.make} onChange={v => setFormData({ ...formData, make: v })} placeholder="Tata" />
      <Field label="Model *" value={formData.model} onChange={v => setFormData({ ...formData, model: v })} placeholder="Ace" />
      <Field label="Year" value={formData.year} onChange={v => setFormData({ ...formData, year: v })} placeholder="2022" keyboardType="number-pad" />
      <Field label="Color" value={formData.color} onChange={v => setFormData({ ...formData, color: v })} placeholder="White" />
      <Field label="Capacity (kg)" value={formData.capacityKg} onChange={v => setFormData({ ...formData, capacityKg: v })} placeholder="1000" keyboardType="decimal-pad" />

      <Pressable
        style={[styles.submitBtn, submitting && { opacity: 0.6 }]}
        onPress={registerVehicle}
        disabled={submitting}>
        {submitting
          ? <ActivityIndicator color="white" />
          : <Text style={styles.submitText}>Submit for approval</Text>}
      </Pressable>
    </ScrollView>
  );
}

function Row({ label, value }: any) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

const NAVY = '#1A2B4A';
const ORANGE = '#F5A623';
const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F4F7FB' },

  headerCard: {
    backgroundColor: NAVY, padding: 24, borderRadius: 12,
    alignItems: 'center', marginBottom: 16,
  },
  emoji: { fontSize: 56, marginBottom: 12 },
  title: { fontSize: 24, fontWeight: '900', color: 'white' },
  regNo: { fontSize: 14, color: 'rgba(255,255,255,0.7)', marginTop: 4 },
  statusBadge: { marginTop: 12, paddingHorizontal: 12, paddingVertical: 4, borderRadius: 999 },
  statusText: { color: 'white', fontSize: 11, fontWeight: '700' },

  card: { backgroundColor: 'white', padding: 16, borderRadius: 12, marginBottom: 12 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  infoLabel: { fontSize: 13, color: '#5A6B85' },
  infoValue: { fontSize: 13, color: NAVY, fontWeight: '600' },

  subtitle: { fontSize: 14, color: '#5A6B85', marginBottom: 16 },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: '#5A6B85', marginBottom: 6 },
  fieldInput: {
    borderWidth: 1, borderColor: '#D8E0EA', borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 12, fontSize: 15, color: NAVY,
    backgroundColor: 'white',
  },

  submitBtn: {
    height: 52, borderRadius: 10, backgroundColor: ORANGE,
    alignItems: 'center', justifyContent: 'center', marginTop: 16,
  },
  submitText: { color: 'white', fontSize: 16, fontWeight: '700' },
});
