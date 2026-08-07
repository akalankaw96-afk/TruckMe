import React, { useEffect, useState } from 'react';
import {
  View, Text, FlatList, StyleSheet, Pressable,
  ActivityIndicator, RefreshControl, Alert, StatusBar,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import client from '../api/client';

const HARDCODED_USER_ID = 'f4c15eb0-7fb3-4a89-915f-5113a1d20f22';

export default function MyBookingsScreen({ navigation }: any) {
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getUserId = async (): Promise<string> => {
    try {
      const cached = await AsyncStorage.getItem('truckme_user');
      if (cached) {
        const user = JSON.parse(cached);
        if (user?.id) return user.id;
      }
    } catch (e) {}
    try {
      // @ts-ignore
      const stored = typeof window !== 'undefined' ? window.localStorage?.getItem('truckme_user') : null;
      if (stored) {
        const user = JSON.parse(stored);
        if (user?.id) return user.id;
      }
    } catch (e) {}
    return HARDCODED_USER_ID;
  };

  const load = async () => {
    try {
      const userId = await getUserId();
      console.log('[MyBookings] userId:', userId);

      const res = await client.get(`/api/bookings/customer/${userId}`);
      console.log('[MyBookings] status:', res.status, 'length:', res.data?.length);

      const data = Array.isArray(res.data) ? res.data : [];
      setBookings(data);
      setError(null);
    } catch (e: any) {
      console.error('[MyBookings] ERROR:', e?.response?.status, e?.response?.data || e?.message);
      setError(e?.response?.data?.message || e?.message || 'Failed to load');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { load(); }, []);

  const statusColor = (s: string) => {
    if (s === 'Pending') return '#F39C12';
    if (s === 'Assigned') return '#3B8FD6';
    if (s === 'Delivered') return '#27AE60';
    if (s === 'Cancelled') return '#95A5A6';
    return '#5A6B85';
  };

  const statusIcon = (s: string) => {
    const map: any = {
      'Pending': '⏳', 'Assigned': '🚛', 'EnRoute': '🛣️',
      'Arrived': '📍', 'Loading': '📦', 'Delivered': '✅',
      'Cancelled': '❌', 'Failed': '⚠️',
    };
    return map[s] || '📋';
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

      <FlatList
        data={bookings}
        keyExtractor={(b) => b.id}
        contentContainerStyle={{ padding: 16 }}
        ListHeaderComponent={
          <View style={{ marginBottom: 12 }}>
            <Text style={styles.count}>{bookings.length} bookings</Text>
            {error && <Text style={styles.errorText}>Error: {error}</Text>}
          </View>
        }
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); load(); }}
            tintColor="#F5A623"
          />
        }
        renderItem={({ item }) => (
          <Pressable
            style={styles.card}
            onPress={() => navigation.navigate('BookingDetail', { bookingId: item.id })}>
            <View style={styles.row}>
              <Text style={styles.number}>{item.bookingNumber}</Text>
              <View style={[styles.statusBadge, { backgroundColor: statusColor(item.status) }]}>
                <Text style={styles.statusBadgeText}>{statusIcon(item.status)} {item.status}</Text>
              </View>
            </View>
            <Text style={styles.dateLabel}>
              📅 {item.scheduledPickupAt
                ? new Date(item.scheduledPickupAt).toLocaleString('en-US', {
                    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', year: 'numeric'
                  })
                : '—'}
            </Text>
            <View style={styles.fareRow}>
              <Text style={styles.fareLabel}>Total fare</Text>
              <Text style={styles.fareValue}>
                LKR {Math.round(item.totalFare || 0).toLocaleString()}
              </Text>
            </View>
            <Text style={styles.chev}>Tap to view details ›</Text>
          </Pressable>
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyEmoji}>📦</Text>
            <Text style={styles.emptyTitle}>
              {error ? 'Could not load bookings' : 'No bookings yet'}
            </Text>
            <Text style={styles.emptyText}>
              {error || 'Book your first truck from the Home screen'}
            </Text>
            <Pressable style={styles.retryBtn} onPress={load}>
              <Text style={styles.retryText}>Retry</Text>
            </Pressable>
          </View>
        }
      />
    </View>
  );
}

const NAVY = '#1A2B4A';
const ORANGE = '#F5A623';
const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F4F7FB' },
  count: { fontSize: 14, color: '#5A6B85', fontWeight: '600' },
  errorText: { fontSize: 12, color: '#E74C3C', marginTop: 4 },
  card: { backgroundColor: 'white', padding: 16, borderRadius: 12, marginBottom: 10, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 3, shadowOffset: { width: 0, height: 1 }, elevation: 1 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  number: { fontSize: 14, fontWeight: '700', color: NAVY },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  statusBadgeText: { color: 'white', fontSize: 11, fontWeight: '700' },
  dateLabel: { fontSize: 13, color: '#5A6B85', marginBottom: 10 },
  fareRow: { flexDirection: 'row', justifyContent: 'space-between', paddingTop: 10, borderTopWidth: 1, borderTopColor: '#F4F7FB' },
  fareLabel: { fontSize: 13, color: '#5A6B85' },
  fareValue: { fontSize: 15, fontWeight: '700', color: NAVY },
  chev: { fontSize: 12, color: ORANGE, marginTop: 8, textAlign: 'right', fontWeight: '600' },
  empty: { alignItems: 'center', padding: 60 },
  emptyEmoji: { fontSize: 64 },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: NAVY, marginTop: 12 },
  emptyText: { fontSize: 13, color: '#5A6B85', marginTop: 4, textAlign: 'center' },
  retryBtn: { marginTop: 20, paddingHorizontal: 20, paddingVertical: 10, backgroundColor: ORANGE, borderRadius: 8 },
  retryText: { color: 'white', fontWeight: '700' },
});
