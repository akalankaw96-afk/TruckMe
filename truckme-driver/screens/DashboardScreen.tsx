import React, { useEffect, useState } from 'react';
import {
  View, Text, FlatList, StyleSheet, Pressable,
  ActivityIndicator, RefreshControl, Alert, Switch, StatusBar, ScrollView,
} from 'react-native';
import client from '../api/client';
import { DriverUser, DriverProfile } from '../types';

interface Props {
  user: DriverUser;
  onLogout: () => void;
  onSelectJob: (jobId: string) => void;
  onOpenProfile?: () => void;
  onOpenSubscriptions?: () => void;
  onOpenEarnings?: () => void;
  onOpenJob?: (jobId: string) => void;
}

const RADIUS_OPTIONS = [
  { value: 5, label: 'Within 5 km' },
  { value: 10, label: 'Within 10 km' },
  { value: 25, label: 'Within 25 km' },
  { value: 50, label: 'Within 50 km' },
  { value: 0, label: 'All Jobs' },
];

export default function DashboardScreen({ user, onLogout, onSelectJob, onOpenProfile, onOpenSubscriptions, onOpenEarnings }: Props) {
  const [profile, setProfile] = useState<DriverProfile | null>(null);
  const [jobs, setJobs] = useState<any[]>([]);
  const [activeJob, setActiveJob] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isOnline, setIsOnline] = useState(false);
  const [selectedRadius, setSelectedRadius] = useState<number>(25);

  const load = async (radius = selectedRadius) => {
    try {
      const radiusParam = radius > 0 ? `?maxDistanceKm=${radius}` : '';
      const [pRes, jRes, aRes] = await Promise.all([
        client.get(`/api/drivers/${user.id}`).catch(() => ({ data: null })),
        client.get(`/api/drivers/${user.id}/available-jobs${radiusParam}`).catch(() => ({ data: [] })),
        client.get(`/api/drivers/${user.id}/active-job`).catch(() => ({ data: null })),
      ]);
      setProfile(pRes.data);
      setJobs(Array.isArray(jRes.data) ? jRes.data : []);
      setActiveJob(aRes.data?.id ? aRes.data : null);
      if (pRes.data?.isOnline != null) setIsOnline(pRes.data.isOnline);
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.message || 'Failed to load dashboard');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { load(selectedRadius); }, [selectedRadius]);

  const toggleOnline = async (val: boolean) => {
    setIsOnline(val);
    try {
      await client.patch(`/api/drivers/${user.id}/location`, {
        latitude: 6.9271,
        longitude: 79.8612,
        isOnline: val,
        isAvailable: val,
      });
    } catch (e: any) {
      Alert.alert('Error', 'Failed to update online status');
      setIsOnline(!val);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#F5A623" size="large" />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="#1A2B4A" />

      <FlatList
        data={jobs}
        keyExtractor={(j) => j.id}
        contentContainerStyle={{ padding: 16 }}
        ListHeaderComponent={
          <View>
            <View style={styles.header}>
              <View>
                <Text style={styles.greeting}>Hi {user.fullName} 👋</Text>
                <Text style={styles.role}>Driver Partner</Text>
              </View>
              <View style={styles.headerButtons}>
                <Pressable style={[styles.profileBtn, { backgroundColor: '#10B981' }]} onPress={onOpenEarnings}>
                  <Text style={[styles.profileBtnText, { color: 'white' }]}>💳 Wallet</Text>
                </Pressable>

                <Pressable style={styles.profileBtn} onPress={onOpenProfile}>
                  <Text style={styles.profileBtnText}>👤 Profile</Text>
                </Pressable>

                <Pressable style={[styles.profileBtn, { backgroundColor: '#F5A623' }]} onPress={onOpenSubscriptions}>
                  <Text style={[styles.profileBtnText, { color: '#1A2B4A' }]}>👑 0% Pass</Text>
                </Pressable>

                <Pressable onPress={onLogout}>
                  <Text style={styles.logout}>Sign out</Text>
                </Pressable>
              </View>
            </View>

            {/* Active Job in Progress Banner */}
            {activeJob && (
              <Pressable
                style={styles.activeJobBanner}
                onPress={() => onSelectJob(activeJob.id)}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <View style={{ flex: 1, paddingRight: 10 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text style={styles.activeJobTitle}>🚚 Active Job in Progress</Text>
                      <View style={styles.activeBadge}>
                        <Text style={styles.activeBadgeText}>{activeJob.status}</Text>
                      </View>
                    </View>
                    <Text style={styles.activeJobNumber}>{activeJob.bookingNumber}</Text>
                    <Text style={styles.activeJobAddress} numberOfLines={1}>📍 {activeJob.pickupAddress || 'Pickup location'}</Text>
                  </View>
                  <Text style={styles.activeJobArrow}>View Route →</Text>
                </View>
              </Pressable>
            )}

            <View style={styles.onlineCard}>
              <View>
                <Text style={styles.onlineLabel}>Status</Text>
                <Text style={styles.onlineStatus}>
                  {isOnline ? '🟢 Online & Receiving Jobs' : '⚫ Offline'}
                </Text>
              </View>
              <Switch
                value={isOnline}
                onValueChange={toggleOnline}
                trackColor={{ true: '#27AE60', false: '#D8E0EA' }}
              />
            </View>

            {profile && (
              <View style={styles.statsRow}>
                <Stat label="Trips" value={profile.totalTrips || profile.totalCompletedJobs || 0} />
                <Stat label="Rating" value={`${(profile.averageRating || profile.ratingAverage || 4.9).toFixed(1)}⭐`} />
                <Stat label="Earnings" value={`LKR ${Math.round(profile.totalEarnings || 0).toLocaleString()}`} />
              </View>
            )}

            {/* Distance Filter Selector */}
            <Text style={styles.sectionTitle}>Filter Available Jobs by Distance Radius</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {RADIUS_OPTIONS.map(opt => (
                  <Pressable
                    key={opt.value}
                    style={[styles.radiusChip, selectedRadius === opt.value && styles.radiusChipActive]}
                    onPress={() => setSelectedRadius(opt.value)}>
                    <Text style={[styles.radiusChipText, selectedRadius === opt.value && styles.radiusChipTextActive]}>
                      📍 {opt.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </ScrollView>

            <Text style={styles.subSectionTitle}>
              Available jobs {selectedRadius > 0 ? `within ${selectedRadius} km` : 'all'} ({jobs.length})
            </Text>
            {activeJob && (
              <View style={styles.activeWarningCard}>
                <Text style={styles.activeWarningText}>
                  ℹ️ Complete your active trip (#{activeJob.bookingNumber}) before accepting a new job.
                </Text>
              </View>
            )}
          </View>
        }
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(selectedRadius); }} tintColor="#F5A623" />
        }
        renderItem={({ item }) => (
          <Pressable
            style={[styles.jobCard, activeJob && { opacity: 0.7 }]}
            onPress={() => {
              if (activeJob) {
                Alert.alert(
                  'Active Trip in Progress 🚚',
                  `You are currently executing trip ${activeJob.bookingNumber}. Please complete your active delivery before accepting another job.`,
                  [
                    { text: 'View Active Route', onPress: () => onSelectJob(activeJob.id) },
                    { text: 'OK', style: 'cancel' }
                  ]
                );
              } else {
                onSelectJob(item.id);
              }
            }}>
            <View style={styles.jobHeader}>
              <Text style={styles.bookingNumber}>{item.bookingNumber || 'Job Request'}</Text>
              <View style={styles.distanceBadgeBox}>
                <Text style={styles.distanceBadgeText}>📍 {item.distanceBadge || `${item.distanceFromDriverKm || 3.4} km away`}</Text>
              </View>
            </View>

            <Text style={styles.pickupAddr}>📍 Pickup: {item.pickupAddress}</Text>
            <Text style={styles.cargoInfo}>
              📦 {item.cargoType || 'Cargo'} • {item.cargoWeightKg || 500}kg • {item.totalDistanceKm || 12}km trip
            </Text>

            <View style={styles.payoutRow}>
              <Text style={styles.payoutLabel}>DRIVER PAYOUT</Text>
              <Text style={styles.payoutAmount}>
                LKR {Math.round(item.driverPayout || item.totalFare * 0.9 || 7200).toLocaleString()}
              </Text>
            </View>
          </Pressable>
        )}
        ListEmptyComponent={
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>No Jobs Within {selectedRadius > 0 ? `${selectedRadius} km` : 'Selected Area'}</Text>
            <Text style={styles.emptySub}>Try increasing your distance radius filter above to see more transport requests!</Text>
          </View>
        }
      />
    </View>
  );
}

function Stat({ label, value }: { label: string; value: any }) {
  return (
    <View style={styles.statBox}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const NAVY = '#1A2B4A';
const ORANGE = '#F5A623';
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F4F7FB' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F4F7FB' },

  header: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 16, marginTop: 8,
  },
  greeting: { fontSize: 22, fontWeight: '800', color: NAVY },
  role: { fontSize: 12, color: '#5A6B85', marginTop: 2, fontWeight: '600' },
  headerButtons: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  profileBtn: {
    backgroundColor: '#EBF5FF', paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 8, borderWidth: 1, borderColor: '#BEE3F8',
  },
  profileBtnText: { color: '#2B6CB0', fontWeight: '700', fontSize: 13 },
  logout: { color: ORANGE, fontWeight: '700', fontSize: 13 },

  activeJobBanner: {
    backgroundColor: '#10B981', padding: 16, borderRadius: 12, marginBottom: 16,
  },
  activeJobTitle: { fontSize: 13, fontWeight: '800', color: 'white' },
  activeBadge: { backgroundColor: 'rgba(255,255,255,0.3)', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  activeBadgeText: { color: 'white', fontWeight: '800', fontSize: 10 },
  activeJobNumber: { fontSize: 16, fontWeight: '900', color: 'white', marginTop: 4 },
  activeJobAddress: { fontSize: 12, color: 'rgba(255,255,255,0.9)', marginTop: 2 },
  activeJobArrow: { color: 'white', fontWeight: '800', fontSize: 13 },

  onlineCard: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: 'white', padding: 16, borderRadius: 12, marginBottom: 16,
    borderWidth: 1, borderColor: '#D8E0EA',
  },
  onlineLabel: { fontSize: 11, color: '#8895A8', fontWeight: '700', letterSpacing: 0.8 },
  onlineStatus: { fontSize: 15, fontWeight: '700', color: NAVY, marginTop: 2 },

  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  statBox: {
    flex: 1, backgroundColor: NAVY, padding: 12, borderRadius: 10, alignItems: 'center',
  },
  statValue: { fontSize: 16, fontWeight: '800', color: ORANGE },
  statLabel: { fontSize: 11, color: 'rgba(255,255,255,0.7)', marginTop: 2 },

  sectionTitle: { fontSize: 15, fontWeight: '700', color: NAVY, marginBottom: 10 },
  subSectionTitle: { fontSize: 13, fontWeight: '600', color: '#5A6B85', marginBottom: 12 },

  radiusChip: {
    paddingHorizontal: 14, paddingVertical: 8,
    backgroundColor: 'white', borderRadius: 20,
    borderWidth: 1.5, borderColor: '#D8E0EA',
  },
  radiusChipActive: { backgroundColor: NAVY, borderColor: NAVY },
  radiusChipText: { fontSize: 12, color: '#5A6B85', fontWeight: '700' },
  radiusChipTextActive: { color: 'white' },

  jobCard: {
    backgroundColor: 'white', borderRadius: 12, padding: 16,
    marginBottom: 12, borderWidth: 1, borderColor: '#D8E0EA',
  },
  jobHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  bookingNumber: { fontSize: 15, fontWeight: '800', color: NAVY },
  distanceBadgeBox: { backgroundColor: '#FFF8E7', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, borderWidth: 1, borderColor: ORANGE },
  distanceBadgeText: { fontSize: 11, fontWeight: '800', color: ORANGE },

  pickupAddr: { fontSize: 13, color: NAVY, fontWeight: '600', marginBottom: 4 },
  cargoInfo: { fontSize: 12, color: '#5A6B85', marginBottom: 12 },

  payoutRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    borderTopWidth: 1, borderTopColor: '#E8EDF3', paddingTop: 10,
  },
  payoutLabel: { fontSize: 10, fontWeight: '800', color: '#8895A8', letterSpacing: 0.8 },
  payoutAmount: { fontSize: 18, fontWeight: '900', color: '#27AE60' },

  emptyCard: {
    backgroundColor: 'white', padding: 24, borderRadius: 12,
    alignItems: 'center', marginTop: 10, borderWidth: 1, borderColor: '#D8E0EA',
  },
  emptyTitle: { fontSize: 15, fontWeight: '700', color: NAVY, marginBottom: 6 },
  emptySub: { fontSize: 12, color: '#8895A8', textAlign: 'center' },

  activeWarningCard: { backgroundColor: '#FFF8E7', borderWidth: 1, borderColor: ORANGE, borderRadius: 8, padding: 10, marginBottom: 12 },
  activeWarningText: { fontSize: 12, color: NAVY, fontWeight: '700', textAlign: 'center' },
});
