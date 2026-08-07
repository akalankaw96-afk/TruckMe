import React, { useEffect, useState } from 'react';
import {
  View, Text, FlatList, StyleSheet, Pressable,
  ActivityIndicator, RefreshControl, StatusBar, Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import client from '../api/client';

const HARDCODED_DRIVER_ID = '00000000-0000-0000-0000-000000000000';

export default function DriverJobsScreen() {
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [driver, setDriver] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [acceptingId, setAcceptingId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const getDriverId = async (): Promise<string> => {
    try {
      const cached = await AsyncStorage.getItem('truckme_user');
      if (cached) {
        const user = JSON.parse(cached);
        if (user?.id) return user.id;
      }
    } catch (e) {}
    return HARDCODED_DRIVER_ID;
  };

  const load = async () => {
    try {
      const driverUserId = await getDriverId();

      // 1. Get driver profile
      let driverData: any = null;
      try {
        const driverRes = await client.get(`/api/drivers/${driverUserId}`);
        driverData = driverRes.data;
        setDriver(driverData);
      } catch (err) {
        // Fallback demo driver state if profile not found
        setDriver({
          id: driverUserId,
          isOnline: true,
          isAvailable: true,
          averageRating: 4.9,
          totalTrips: 18,
          totalEarnings: 84500,
        });
      }

      // 2. Get pending bookings
      const jobsRes = await client.get(`/api/bookings/pending`);
      const list = Array.isArray(jobsRes.data) ? jobsRes.data : [];
      setJobs(list);
      setError(null);
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.message || 'Failed to load available jobs');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    load();
    // Auto-refresh pending jobs every 4 seconds for real-time job offer discovery
    const interval = setInterval(() => {
      load();
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  const acceptJob = async (bookingId: string) => {
    const driverIdToUse = driver?.id || HARDCODED_DRIVER_ID;
    setAcceptingId(bookingId);

    try {
      // 1. Accept job via driver API endpoint
      await client.post(`/api/drivers/${driverIdToUse}/accept-job/${bookingId}`);
      showToast('🚚 Job Accepted! Starting delivery assignment...', 'success');
      await load();
    } catch (e: any) {
      // 2. Fallback assignment endpoint
      try {
        await client.patch(`/api/bookings/${bookingId}/assign`, {
          driverId: driverIdToUse,
        });
        showToast('🚚 Job Accepted! Added to active trips.', 'success');
        await load();
      } catch (err: any) {
        showToast(err?.response?.data?.message || err?.message || 'Failed to accept job', 'error');
      }
    } finally {
      setAcceptingId(null);
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
    <View style={{ flex: 1, backgroundColor: '#F4F7FB' }}>
      <StatusBar barStyle="light-content" backgroundColor="#1A2B4A" />

      {/* Floating Toast Notification Banner */}
      {toast && (
        <View style={[
          styles.toastContainer,
          toast.type === 'error' ? styles.toastError : toast.type === 'info' ? styles.toastInfo : styles.toastSuccess
        ]}>
          <Text style={styles.toastText}>
            {toast.type === 'error' ? '⚠️ ' : toast.type === 'info' ? '🔔 ' : '✓ '}
            {toast.message}
          </Text>
        </View>
      )}

      {/* Driver status bar */}
      {driver && (
        <View style={styles.statusBar}>
          <View style={styles.statusRow}>
            <View style={[styles.statusDot, { backgroundColor: driver.isOnline ? GREEN : '#95A5A6' }]} />
            <Text style={styles.statusText}>
              {driver.isOnline ? 'Online 🟢' : 'Offline 🔴'} · {driver.isAvailable ? 'Available for Jobs' : 'On Active Delivery'}
            </Text>
          </View>
          <View style={styles.statsRow}>
            <Stat label="Rating" value={driver.averageRating?.toFixed(1) || '4.9'} icon="⭐" />
            <Stat label="Trips" value={driver.totalCompletedJobs || driver.totalTrips || 18} icon="🚚" />
            <Stat label="Earned" value={`LKR ${Math.round(driver.totalEarnings || 84500).toLocaleString()}`} icon="💰" />
          </View>
        </View>
      )}

      <FlatList
        data={jobs}
        keyExtractor={(b) => b.id}
        contentContainerStyle={{ padding: 16 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); load(); }}
            tintColor="#F5A623"
          />
        }
        ListHeaderComponent={
          <View style={{ marginBottom: 12 }}>
            <Text style={styles.sectionTitle}>📦 Live Available Jobs ({jobs.length})</Text>
            {error && <Text style={styles.errorText}>{error}</Text>}
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.row}>
              <Text style={styles.bookingNumber}>{item.bookingNumber || `BK-${item.id.substring(0, 8).toUpperCase()}`}</Text>
              <View style={styles.farePill}>
                <Text style={styles.farePillText}>
                  LKR {Math.round(item.totalFare || item.driverPayout || 15000).toLocaleString()}
                </Text>
              </View>
            </View>

            <Text style={styles.pickupAddrText}>📍 Pickup: {item.pickupAddress}</Text>

            <Text style={styles.timeLabel}>
              🕐 {item.scheduledPickupAt ? new Date(item.scheduledPickupAt).toLocaleString('en-US', {
                month: 'short', day: 'numeric',
                hour: '2-digit', minute: '2-digit',
              }) : 'Immediate Pickup'}
            </Text>

            <View style={styles.detailsRow}>
              <Detail icon="📍" label="Distance" value={`${item.totalDistanceKm || item.estimatedDistanceKm || 12} km`} />
              <Detail icon="⏱️" label="Duration" value={`${item.estimatedDurationMinutes || 35} min`} />
              <Detail icon="⚖️" label="Weight" value={item.cargoWeightKg ? `${item.cargoWeightKg} kg` : 'General'} />
            </View>

            {item.cargoDescription && (
              <Text style={styles.cargoText} numberOfLines={1}>
                📦 {item.cargoDescription}
              </Text>
            )}

            <View style={styles.earningsRow}>
              <Text style={styles.earningsLabel}>Driver Earnings:</Text>
              <Text style={styles.earningsValue}>
                LKR {Math.round(item.driverPayout || item.totalFare * 0.85 || 12750).toLocaleString()}
              </Text>
            </View>

            <Pressable
              style={[styles.acceptBtn, acceptingId === item.id && { opacity: 0.6 }]}
              onPress={() => acceptJob(item.id)}
              disabled={acceptingId === item.id}>
              {acceptingId === item.id ? (
                <ActivityIndicator color="white" size="small" />
              ) : (
                <Text style={styles.acceptBtnText}>Accept Job →</Text>
              )}
            </Pressable>
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyEmoji}>📭</Text>
            <Text style={styles.emptyTitle}>No available jobs right now</Text>
            <Text style={styles.emptyText}>
              {error || 'Scanning for new customer bookings automatically every 4 seconds...'}
            </Text>
          </View>
        }
      />
    </View>
  );
}

function Stat({ label, value, icon }: any) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statIcon}>{icon}</Text>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function Detail({ icon, label, value }: any) {
  return (
    <View style={styles.detail}>
      <Text style={styles.detailIcon}>{icon}</Text>
      <Text style={styles.detailValue}>{value}</Text>
      <Text style={styles.detailLabel}>{label}</Text>
    </View>
  );
}

const NAVY = '#1A2B4A';
const ORANGE = '#F5A623';
const GREEN = '#27AE60';
const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F4F7FB' },

  toastContainer: {
    position: 'absolute',
    top: 16,
    left: 16,
    right: 16,
    zIndex: 99999,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    elevation: 100,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toastSuccess: { backgroundColor: '#2E7D32' },
  toastError: { backgroundColor: '#D32F2F' },
  toastInfo: { backgroundColor: NAVY },
  toastText: { color: 'white', fontWeight: '800', fontSize: 14, textAlign: 'center' },

  statusBar: { backgroundColor: NAVY, padding: 16 },
  statusRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  statusDot: { width: 10, height: 10, borderRadius: 5, marginRight: 8 },
  statusText: { color: 'white', fontSize: 14, fontWeight: '600' },
  statsRow: { flexDirection: 'row', justifyContent: 'space-around' },
  stat: { alignItems: 'center' },
  statIcon: { fontSize: 18 },
  statValue: { color: 'white', fontSize: 16, fontWeight: '900', marginTop: 2 },
  statLabel: { color: '#A8B6CC', fontSize: 11, marginTop: 2 },

  sectionTitle: { fontSize: 14, fontWeight: '700', color: '#5A6B85', marginBottom: 4 },
  errorText: { fontSize: 12, color: '#E74C3C', marginTop: 4 },

  card: {
    backgroundColor: 'white', padding: 16, borderRadius: 12, marginBottom: 12,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 }, elevation: 1,
  },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  bookingNumber: { fontSize: 14, fontWeight: '700', color: NAVY },
  farePill: { backgroundColor: '#FFF8E7', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  farePillText: { color: ORANGE, fontWeight: '900', fontSize: 13 },
  pickupAddrText: { fontSize: 13, color: NAVY, fontWeight: '600', marginBottom: 6 },

  timeLabel: { fontSize: 13, color: '#5A6B85', marginBottom: 10 },

  detailsRow: {
    flexDirection: 'row', justifyContent: 'space-around',
    paddingVertical: 12, borderTopWidth: 1, borderTopColor: '#F4F7FB',
    borderBottomWidth: 1, borderBottomColor: '#F4F7FB', marginBottom: 10,
  },
  detail: { alignItems: 'center', flex: 1 },
  detailIcon: { fontSize: 16, marginBottom: 4 },
  detailValue: { fontSize: 13, fontWeight: '700', color: NAVY },
  detailLabel: { fontSize: 11, color: '#5A6B85', marginTop: 2 },

  cargoText: { fontSize: 12, color: '#5A6B85', marginBottom: 8, fontStyle: 'italic' },

  earningsRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingTop: 8, marginBottom: 12,
  },
  earningsLabel: { fontSize: 13, color: '#5A6B85', fontWeight: '600' },
  earningsValue: { fontSize: 18, color: GREEN, fontWeight: '900' },

  acceptBtn: {
    backgroundColor: ORANGE, paddingVertical: 12, borderRadius: 8, alignItems: 'center',
  },
  acceptBtnText: { color: 'white', fontWeight: '700', fontSize: 14 },

  empty: { alignItems: 'center', padding: 60 },
  emptyEmoji: { fontSize: 64 },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: NAVY, marginTop: 12 },
  emptyText: { fontSize: 13, color: '#5A6B85', marginTop: 4, textAlign: 'center' },
});
