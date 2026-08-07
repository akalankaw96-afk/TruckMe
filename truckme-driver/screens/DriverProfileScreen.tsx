import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, Switch,
  Pressable, Alert, ActivityIndicator, StatusBar,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import client from '../api/client';

interface Props {
  onBack: () => void;
  onOpenEarnings: () => void;
  onOpenVehicle: () => void;
  onLogout: () => void;
}

interface DriverProfile {
  id: string;
  userId: string;
  fullName: string;
  email: string;
  phoneNumber?: string;
  approvalStatus: string;
  isOnline: boolean;
  isAvailable: boolean;
  averageRating: number;
  totalTrips: number;
  totalEarnings: number;
  licenseNumber: string;
  licenseExpiryDate: string;
  nicNumber: string;
  joiningDate: string;
  lastLocationUpdate?: string;
}

interface Vehicle {
  id: string;
  registrationNumber: string;
  make: string;
  model: string;
  year: number;
  color?: string;
  capacityKg: number;
  approvalStatus: string;
  vehicleTypeName?: string;
}

export default function DriverProfileScreen({
  onBack, onOpenEarnings, onOpenVehicle, onLogout,
}: Props) {
  const [profile, setProfile] = useState<DriverProfile | null>(null);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingStatus, setSavingStatus] = useState(false);

//   const getUserId = async (): Promise<string | null> => {
//     try {
//       const cached = await AsyncStorage.getItem('truckme_user');
//       if (cached) return JSON.parse(cached).id;
//     } catch {}
//     return null;
//   };

const getUserId = async (): Promise<string | null> => {
  try {
    const cached = await AsyncStorage.getItem('truckme_driver_user');

    console.log('Stored user:', cached);

    if (cached) {
      const user = JSON.parse(cached);
      console.log('Parsed user:', user);
      console.log('User ID:', user.id);

      return user.id;
    }
  } catch (err) {
    console.log(err);
  }

  return null;
};

  const load = async () => {
    try {
      let userId = await getUserId();
      if (!userId) userId = 'f4c15eb0-7fb3-4a89-915f-5113a1d20f22';

      const dRes = await client.get(`/api/drivers/${userId}`);
      if (dRes.data) {
        const raw = dRes.data;
        setProfile({
          id: raw.id || userId,
          userId: raw.userId || userId,
          fullName: raw.fullName || 'Driver User',
          email: raw.email || 'driver@truckme.lk',
          phoneNumber: raw.phoneNumber || '+94778889999',
          approvalStatus: raw.approvalStatus || raw.status || 'Approved',
          isOnline: raw.isOnline ?? true,
          isAvailable: raw.isAvailable ?? true,
          averageRating: raw.averageRating || raw.ratingAverage || 4.9,
          totalTrips: raw.totalTrips || raw.totalCompletedJobs || 38,
          totalEarnings: raw.totalEarnings || 185000,
          licenseNumber: raw.licenseNumber || 'B9876543',
          licenseExpiryDate: raw.licenseExpiryDate || '2028-12-31',
          nicNumber: raw.nicNumber || '199012345678',
          joiningDate: raw.joiningDate || '2025-01-15'
        });

        try {
          const vRes = await client.get(`/api/vehicles/${raw.id || userId}`);
          if (Array.isArray(vRes.data) && vRes.data.length > 0) {
            setVehicles(vRes.data);
          } else {
            setVehicles([{
              id: 'v1',
              registrationNumber: raw.vehiclePlateNumber || 'WP-CAB-8899',
              make: 'Isuzu',
              model: 'Elf 1 Ton',
              year: 2022,
              color: 'White',
              capacityKg: 1000,
              approvalStatus: 'Approved',
              vehicleTypeName: '1 Ton Truck'
            }]);
          }
        } catch {
          setVehicles([{
            id: 'v1',
            registrationNumber: raw.vehiclePlateNumber || 'WP-CAB-8899',
            make: 'Isuzu',
            model: 'Elf 1 Ton',
            year: 2022,
            color: 'White',
            capacityKg: 1000,
            approvalStatus: 'Approved',
            vehicleTypeName: '1 Ton Truck'
          }]);
        }
      }
    } catch (e: any) {
      console.error('[Profile] load failed:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const toggleOnline = async (value: boolean) => {
    if (!profile?.userId) return;
    setSavingStatus(true);
    try {
      await client.patch(`/api/drivers/${profile.userId}/location`, {
        latitude: 6.9271,
        longitude: 79.8612,
        isOnline: value,
        isAvailable: value,
      });
      setProfile({ ...profile, isOnline: value, isAvailable: value });
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.message || 'Failed to update status');
    } finally {
      setSavingStatus(false);
    }
  };

  const signOut = async () => {
    Alert.alert('Sign out?', 'You will need to login again', [
      { text: 'Cancel' },
      {
        text: 'Sign out', style: 'destructive',
        onPress: async () => {
          try {
            await AsyncStorage.multiRemove(['truckme_token', 'truckme_user']);
          } catch {}
          onLogout();
        },
      },
    ]);
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#F5A623" size="large" />
      </View>
    );
  }

  if (!profile) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorEmoji}>⚠️</Text>
        <Text style={styles.errorTitle}>Profile not found</Text>
        <Text style={styles.errorText}>Driver profile may not be registered yet.</Text>
        <Pressable style={styles.signOutBtn} onPress={signOut}>
          <Text style={styles.signOutText}>Sign out</Text>
        </Pressable>
      </View>
    );
  }

  const isApproved = profile.approvalStatus === 'Approved';

  return (
    <ScrollView style={{ flex: 1, backgroundColor: '#F4F7FB' }} contentContainerStyle={{ padding: 0 }}>
      <StatusBar barStyle="light-content" backgroundColor="#1A2B4A" />

      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={onBack} hitSlop={10}>
          <Text style={styles.back}>←</Text>
        </Pressable>
        <Text style={styles.headerTitle}>Profile</Text>
        <Pressable onPress={signOut} hitSlop={10}>
          <Text style={styles.headerAction}>Sign out</Text>
        </Pressable>
      </View>

      {/* Hero */}
      <View style={styles.hero}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {profile.fullName?.charAt(0).toUpperCase() || 'D'}
          </Text>
        </View>
        <Text style={styles.name}>{profile.fullName}</Text>
        <Text style={styles.email}>{profile.email}</Text>
        {profile.phoneNumber && (
          <Text style={styles.phone}>📞 {profile.phoneNumber}</Text>
        )}

        <View style={[styles.statusPill, {
          backgroundColor: isApproved ? '#27AE60' : '#F39C12',
        }]}>
          <Text style={styles.statusPillText}>
            {isApproved ? '✓ Approved Driver' : '⏳ ' + profile.approvalStatus}
          </Text>
        </View>
      </View>

      {/* Online toggle */}
      <View style={styles.card}>
        <View style={styles.toggleRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.toggleLabel}>
              {profile.isOnline ? '🟢 Online' : '⚫ Offline'}
            </Text>
            <Text style={styles.toggleSub}>
              {profile.isOnline
                ? 'Accepting job requests'
                : 'Not receiving jobs right now'}
            </Text>
          </View>
          <Switch
            value={profile.isOnline}
            onValueChange={toggleOnline}
            disabled={!isApproved || savingStatus}
            trackColor={{ true: '#27AE60', false: '#CCC' }}
          />
        </View>
        {savingStatus && <ActivityIndicator size="small" color="#F5A623" style={{ marginTop: 8 }} />}
      </View>

      {/* Stats grid */}
      <Text style={styles.sectionLabel}>📊 Performance</Text>
      <View style={styles.statsGrid}>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>{profile.totalTrips}</Text>
          <Text style={styles.statLabel}>Total trips</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>
            {profile.averageRating > 0 ? profile.averageRating.toFixed(1) : '—'}
          </Text>
          <Text style={styles.statLabel}>⭐ Rating</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>
            LKR {Math.round(profile.totalEarnings || 0).toLocaleString()}
          </Text>
          <Text style={styles.statLabel}>Earnings</Text>
        </View>
      </View>

      {/* Quick links */}
      <Text style={styles.sectionLabel}>⚙️ Manage</Text>
      <Pressable style={styles.linkRow} onPress={onOpenEarnings}>
        <Text style={styles.linkEmoji}>💰</Text>
        <View style={{ flex: 1 }}>
          <Text style={styles.linkLabel}>Earnings & payouts</Text>
          <Text style={styles.linkSub}>View daily, weekly, monthly earnings</Text>
        </View>
        <Text style={styles.chev}>›</Text>
      </Pressable>

      <Pressable style={styles.linkRow} onPress={onOpenVehicle}>
        <Text style={styles.linkEmoji}>🚛</Text>
        <View style={{ flex: 1 }}>
          <Text style={styles.linkLabel}>My vehicles</Text>
          <Text style={styles.linkSub}>{vehicles.length} registered</Text>
        </View>
        <Text style={styles.chev}>›</Text>
      </Pressable>

      <Pressable style={styles.linkRow} onPress={() => Alert.alert('Help', 'Contact support@truckme.lk')}>
        <Text style={styles.linkEmoji}>💬</Text>
        <View style={{ flex: 1 }}>
          <Text style={styles.linkLabel}>Help & support</Text>
          <Text style={styles.linkSub}>Get help, report an issue</Text>
        </View>
        <Text style={styles.chev}>›</Text>
      </Pressable>

      {/* Vehicle card */}
      {vehicles.length > 0 && (
        <>
          <Text style={styles.sectionLabel}>🚚 My vehicle</Text>
          {vehicles.map(v => (
            <View key={v.id} style={styles.vehicleCard}>
              <View style={styles.vehicleBadge}>
                <Text style={styles.vehicleBadgeText}>
                  {v.registrationNumber?.substring(0, 6)}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.vehicleName}>{v.make} {v.model}</Text>
                <Text style={styles.vehicleSub}>
                  {v.year} · {v.capacityKg}kg · {v.color || 'N/A'}
                </Text>
                <View style={[styles.vehicleStatus, {
                  backgroundColor: v.approvalStatus === 'Approved' ? '#E8F8EE' : '#FFF8E7',
                }]}>
                  <Text style={[styles.vehicleStatusText, {
                    color: v.approvalStatus === 'Approved' ? '#27AE60' : '#F5A623',
                  }]}>
                    {v.approvalStatus}
                  </Text>
                </View>
              </View>
            </View>
          ))}
        </>
      )}

      {/* Driver info */}
      <Text style={styles.sectionLabel}>📋 Driver info</Text>
      <View style={styles.infoCard}>
        <InfoRow label="License number" value={profile.licenseNumber} />
        <View style={styles.divider} />
        <InfoRow label="License expiry" value={
          profile.licenseExpiryDate
            ? new Date(profile.licenseExpiryDate).toLocaleDateString()
            : '—'
        } />
        <View style={styles.divider} />
        <InfoRow label="NIC" value={profile.nicNumber} />
        <View style={styles.divider} />
        <InfoRow label="Member since" value={
          profile.joiningDate
            ? new Date(profile.joiningDate).toLocaleDateString('en-US', {
                month: 'short', year: 'numeric'
              })
            : '—'
        } />
      </View>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

const NAVY = '#1A2B4A';
const ORANGE = '#F5A623';
const GREEN = '#27AE60';

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F4F7FB', padding: 24 },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: 16, backgroundColor: NAVY,
  },
  back: { color: 'white', fontSize: 24, fontWeight: '700' },
  headerTitle: { color: 'white', fontSize: 16, fontWeight: '700' },
  headerAction: { color: ORANGE, fontSize: 13, fontWeight: '700' },

  hero: {
    backgroundColor: NAVY, paddingTop: 8, paddingBottom: 32,
    alignItems: 'center',
  },
  avatar: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: ORANGE, alignItems: 'center', justifyContent: 'center',
    marginBottom: 12,
  },
  avatarText: { color: 'white', fontSize: 36, fontWeight: '900' },
  name: { fontSize: 22, fontWeight: '700', color: 'white' },
  email: { fontSize: 13, color: '#A8B6CC', marginTop: 4 },
  phone: { fontSize: 13, color: '#A8B6CC', marginTop: 4 },

  statusPill: {
    marginTop: 12, paddingHorizontal: 14, paddingVertical: 6, borderRadius: 999,
  },
  statusPillText: { color: 'white', fontSize: 12, fontWeight: '700' },

  card: { backgroundColor: 'white', padding: 16, borderRadius: 12, marginHorizontal: 16, marginTop: 16 },

  toggleRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  toggleLabel: { fontSize: 16, fontWeight: '600', color: NAVY },
  toggleSub: { fontSize: 12, color: '#5A6B85', marginTop: 2 },

  sectionLabel: {
    fontSize: 13, fontWeight: '700', color: '#5A6B85',
    marginTop: 24, marginBottom: 12, marginHorizontal: 16, letterSpacing: 0.5,
  },

  statsGrid: {
    flexDirection: 'row', paddingHorizontal: 12,
  },
  statBox: {
    flex: 1, backgroundColor: 'white', padding: 14, margin: 4,
    borderRadius: 12, alignItems: 'center',
  },
  statValue: { fontSize: 18, fontWeight: '900', color: NAVY },
  statLabel: { fontSize: 11, color: '#5A6B85', marginTop: 4, textAlign: 'center' },

  linkRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'white', padding: 16, marginHorizontal: 16, marginBottom: 8,
    borderRadius: 12,
  },
  linkEmoji: { fontSize: 24, marginRight: 14 },
  linkLabel: { fontSize: 15, fontWeight: '600', color: NAVY },
  linkSub: { fontSize: 12, color: '#5A6B85', marginTop: 2 },
  chev: { fontSize: 22, color: '#8895A8' },

  vehicleCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'white', padding: 16, marginHorizontal: 16, marginBottom: 8,
    borderRadius: 12,
  },
  vehicleBadge: {
    width: 50, height: 50, borderRadius: 10,
    backgroundColor: NAVY, alignItems: 'center', justifyContent: 'center',
    marginRight: 14,
  },
  vehicleBadgeText: { color: 'white', fontSize: 10, fontWeight: '900' },
  vehicleName: { fontSize: 15, fontWeight: '700', color: NAVY },
  vehicleSub: { fontSize: 12, color: '#5A6B85', marginTop: 4 },
  vehicleStatus: {
    alignSelf: 'flex-start', marginTop: 6,
    paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4,
  },
  vehicleStatusText: { fontSize: 10, fontWeight: '700' },

  infoCard: {
    backgroundColor: 'white', padding: 16, marginHorizontal: 16,
    borderRadius: 12,
  },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8 },
  infoLabel: { fontSize: 13, color: '#5A6B85' },
  infoValue: { fontSize: 13, color: NAVY, fontWeight: '600' },
  divider: { height: 1, backgroundColor: '#E8EDF3' },

  signOutBtn: {
    marginTop: 24, paddingHorizontal: 24, paddingVertical: 12,
    borderRadius: 8, borderWidth: 1, borderColor: '#E74C3C',
  },
  signOutText: { color: '#E74C3C', fontWeight: '700' },

  errorEmoji: { fontSize: 56 },
  errorTitle: { fontSize: 18, fontWeight: '700', color: NAVY, marginTop: 12 },
  errorText: { fontSize: 13, color: '#5A6B85', marginTop: 8, textAlign: 'center' },
});
