import React, { useEffect, useState } from 'react';
import {
  View, Text, FlatList, StyleSheet, Pressable,
  ActivityIndicator, RefreshControl, Alert, Switch, StatusBar, ScrollView,
} from 'react-native';
import client from '../api/client';
import { DriverUser, DriverProfile } from '../types';
import { startDriverLocationWatcher, getCurrentDeviceLocation, LocationCoords } from '../services/locationService';

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
  const [currentCoords, setCurrentCoords] = useState<LocationCoords>({ latitude: 6.9271, longitude: 79.8612 });
  const [isSimulatingDrive, setIsSimulatingDrive] = useState(false);

  const load = async (radius = selectedRadius, coords = currentCoords) => {
    try {
      const latParam = coords ? `&lat=${coords.latitude}&lng=${coords.longitude}` : '';
      const radiusParam = radius > 0 
        ? `?maxDistanceKm=${radius}${latParam}` 
        : (coords ? `?lat=${coords.latitude}&lng=${coords.longitude}` : '');

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

  // Initial load
  useEffect(() => {
    getCurrentDeviceLocation().then((coords) => {
      setCurrentCoords(coords);
      load(selectedRadius, coords);
    });
  }, [selectedRadius]);

  // LIVE GPS TRACKING EFFECT:
  // Automatically runs location watcher every 10 seconds while Online
  useEffect(() => {
    let stopWatcher: (() => void) | null = null;

    if (isOnline) {
      console.log('[GPS Watcher] Starting live GPS tracking for driver:', user.id);
      stopWatcher = startDriverLocationWatcher(
        user.id,
        (coords) => {
          setCurrentCoords(coords);
          // Periodically update available jobs distance matching based on new live coordinates
          load(selectedRadius, coords);
        },
        isSimulatingDrive,
        10000 // Push GPS location every 10 seconds
      );
    } else {
      console.log('[GPS Watcher] Driver is offline. GPS tracking paused.');
    }

    return () => {
      if (stopWatcher) stopWatcher();
    };
  }, [isOnline, isSimulatingDrive, user.id]);

  const isApproved = profile?.isApproved ?? (profile?.approvalStatus === 'Approved' || profile?.status === 'Approved');

  const toggleOnline = async (val: boolean) => {
    if (!isApproved) {
      Alert.alert(
        '⏳ Pending Admin Approval',
        'Your driver partner account & vehicle details are pending admin verification. You can toggle Online and accept jobs once approved by Admin.'
      );
      return;
    }
    setIsOnline(val);
    try {
      const coords = await getCurrentDeviceLocation();
      setCurrentCoords(coords);
      await Promise.all([
        client.post(`/api/drivers/${user.id}/status`, { isOnline: val }).catch(() => {}),
        client.patch(`/api/drivers/${user.id}/location`, {
          latitude: coords.latitude,
          longitude: coords.longitude,
          isOnline: val,
          isAvailable: val,
        }).catch(() => {}),
      ]);
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

            {!isApproved && (
              <View style={{ backgroundColor: '#FFF9E6', padding: 16, borderRadius: 12, borderWidth: 1.5, borderColor: '#F5A623', marginBottom: 16 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <Text style={{ fontSize: 28 }}>⏳</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: '#1A2B4A', fontWeight: '800', fontSize: 15 }}>
                      Account Pending Admin Verification
                    </Text>
                    <Text style={{ color: '#5A6B85', fontSize: 12, marginTop: 4, lineHeight: 18 }}>
                      Your driver partner registration & vehicle details have been submitted. Admin approval is required before you can go online and accept job requests.
                    </Text>
                  </View>
                </View>
                <Pressable
                  style={{ backgroundColor: '#1A2B4A', paddingVertical: 10, borderRadius: 8, marginTop: 12, alignItems: 'center' }}
                  onPress={() => load()}>
                  <Text style={{ color: '#F5A623', fontWeight: '800', fontSize: 13 }}>🔄 Check Approval Status</Text>
                </Pressable>
              </View>
            )}

            {/* Online Status & Live GPS Card */}
            <View style={styles.onlineCard}>
              <View style={{ flex: 1, paddingRight: 10 }}>
                <Text style={styles.onlineLabel}>Status</Text>
                <Text style={styles.onlineStatus}>
                  {isOnline ? '🟢 Online & Receiving Jobs' : (!isApproved ? '⏳ Pending Approval' : '⚫ Offline')}
                </Text>
                {isOnline && (
                  <View style={styles.gpsBadge}>
                    <Text style={styles.gpsBadgeText}>
                      📡 Live GPS: {currentCoords.latitude.toFixed(4)}° N, {currentCoords.longitude.toFixed(4)}° E
                    </Text>
                  </View>
                )}
              </View>
              <Switch
                value={isOnline}
                onValueChange={toggleOnline}
                disabled={!isApproved}
                trackColor={{ true: '#27AE60', false: '#D8E0EA' }}
              />
            </View>

            {/* Simulated Vehicle Driving Toggle for Testing/Demonstration */}
            {isOnline && (
              <View style={styles.simCard}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.simTitle}>🚗 Simulate Driving (Moving Vehicle)</Text>
                  <Text style={styles.simDesc}>
                    Simulate real-time driving movement along Colombo streets to test live location dispatch.
                  </Text>
                </View>
                <Switch
                  value={isSimulatingDrive}
                  onValueChange={setIsSimulatingDrive}
                  trackColor={{ true: '#3B82F6', false: '#D8E0EA' }}
                />
              </View>
            )}

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
        renderItem={({ item }) => (
          <Pressable
            style={[styles.jobCard, activeJob && styles.disabledJobCard]}
            onPress={() => onSelectJob(item.id)}>
            <View style={styles.jobHeader}>
              <View style={styles.jobBadge}>
                <Text style={styles.jobBadgeText}>{item.cargoType || 'Cargo Freight'}</Text>
              </View>
              <Text style={styles.distanceBadge}>📍 {item.distanceBadge || `${item.distanceFromDriverKm} km away`}</Text>
            </View>
            <Text style={styles.jobFare}>LKR {Number(item.driverPayout || item.totalFare * 0.85).toLocaleString()}</Text>
            <Text style={styles.jobAddress} numberOfLines={1}>📍 Pickup: {item.pickupAddress}</Text>
            <View style={styles.jobFooter}>
              <Text style={styles.jobMeta}>📦 {item.cargoWeightKg || 250} kg</Text>
              <Text style={styles.jobMeta}>⏱️ Est. {item.estimatedDurationMinutes || 45} mins</Text>
              <Text style={styles.jobAction}>View Details →</Text>
            </View>
          </Pressable>
        )}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyTitle}>No Jobs Available</Text>
            <Text style={styles.emptySubtitle}>
              {!isOnline
                ? 'Turn Online to receive real-time job requests nearby'
                : 'There are no pending jobs matching your current distance radius. Driving around will discover new requests!'}
            </Text>
          </View>
        }
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => load(selectedRadius)} colors={['#F5A623']} />
        }
      />
    </View>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <View style={styles.statBox}>
      <Text style={styles.statVal}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F4F6F9' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: 16, backgroundColor: '#1A2B4A', padding: 16, borderRadius: 12,
  },
  greeting: { color: 'white', fontSize: 18, fontWeight: 'bold' },
  role: { color: '#F5A623', fontSize: 12, marginTop: 2, fontWeight: '600' },
  headerButtons: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  profileBtn: { backgroundColor: 'rgba(255,255,255,0.15)', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  profileBtnText: { color: 'white', fontWeight: 'bold', fontSize: 12 },
  logout: { color: '#FF6B6B', marginLeft: 6, fontWeight: 'bold', fontSize: 12 },
  activeJobBanner: {
    backgroundColor: '#1A2B4A', borderRadius: 12, padding: 16, marginBottom: 16,
    borderWidth: 2, borderColor: '#F5A623',
  },
  activeJobTitle: { color: '#F5A623', fontWeight: 'bold', fontSize: 14 },
  activeBadge: { backgroundColor: '#10B981', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  activeBadgeText: { color: 'white', fontWeight: 'bold', fontSize: 10 },
  activeJobNumber: { color: 'white', fontWeight: '800', fontSize: 16, marginTop: 4 },
  activeJobAddress: { color: '#94A3B8', fontSize: 12, marginTop: 2 },
  activeJobArrow: { color: '#F5A623', fontWeight: 'bold', fontSize: 13 },
  onlineCard: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: 'white', padding: 16, borderRadius: 12, marginBottom: 12,
    borderWidth: 1, borderColor: '#E2E8F0',
  },
  onlineLabel: { color: '#64748B', fontSize: 11, fontWeight: 'bold', textTransform: 'uppercase' },
  onlineStatus: { color: '#1E293B', fontSize: 15, fontWeight: 'bold', marginTop: 2 },
  gpsBadge: { backgroundColor: '#EFF6FF', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, marginTop: 6, alignSelf: 'flex-start' },
  gpsBadgeText: { color: '#2563EB', fontSize: 11, fontWeight: '700' },
  simCard: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: '#F0F9FF', padding: 12, borderRadius: 10, marginBottom: 16,
    borderWidth: 1, borderColor: '#BAE6FD',
  },
  simTitle: { color: '#0369A1', fontSize: 13, fontWeight: 'bold' },
  simDesc: { color: '#0284C7', fontSize: 11, marginTop: 2, lineHeight: 15 },
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  statBox: {
    flex: 1, backgroundColor: 'white', padding: 12, borderRadius: 10, alignItems: 'center',
    borderWidth: 1, borderColor: '#E2E8F0',
  },
  statVal: { fontSize: 16, fontWeight: 'bold', color: '#1A2B4A' },
  statLabel: { fontSize: 11, color: '#64748B', marginTop: 2 },
  sectionTitle: { fontSize: 14, fontWeight: 'bold', color: '#1A2B4A', marginBottom: 8 },
  subSectionTitle: { fontSize: 13, fontWeight: 'bold', color: '#64748B', marginBottom: 10 },
  radiusChip: { backgroundColor: 'white', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: '#CBD5E1' },
  radiusChipActive: { backgroundColor: '#1A2B4A', borderColor: '#1A2B4A' },
  radiusChipText: { color: '#475569', fontSize: 12, fontWeight: '600' },
  radiusChipTextActive: { color: '#F5A623', fontWeight: 'bold' },
  activeWarningCard: { backgroundColor: '#FEF3C7', padding: 10, borderRadius: 8, marginBottom: 12 },
  activeWarningText: { color: '#92400E', fontSize: 12, fontWeight: '600' },
  jobCard: { backgroundColor: 'white', padding: 16, borderRadius: 12, marginBottom: 12, borderWidth: 1, borderColor: '#E2E8F0' },
  disabledJobCard: { opacity: 0.6 },
  jobHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  jobBadge: { backgroundColor: '#F1F5F9', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  jobBadgeText: { color: '#334155', fontSize: 11, fontWeight: 'bold' },
  distanceBadge: { color: '#2563EB', fontSize: 12, fontWeight: 'bold' },
  jobFare: { fontSize: 20, fontWeight: 'bold', color: '#10B981', marginBottom: 6 },
  jobAddress: { fontSize: 13, color: '#334155', marginBottom: 10, fontWeight: '500' },
  jobFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 10, borderTopWidth: 1, borderTopColor: '#F1F5F9' },
  jobMeta: { fontSize: 12, color: '#64748B' },
  jobAction: { fontSize: 12, color: '#F5A623', fontWeight: 'bold' },
  emptyContainer: { padding: 30, alignItems: 'center' },
  emptyTitle: { fontSize: 16, fontWeight: 'bold', color: '#64748B' },
  emptySubtitle: { fontSize: 12, color: '#94A3B8', textAlign: 'center', marginTop: 6, lineHeight: 18 },
});
