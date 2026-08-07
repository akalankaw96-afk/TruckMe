import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet,
  ActivityIndicator, RefreshControl, Pressable, Alert,
} from 'react-native';
import client from '../api/client';
import AsyncStorage from '@react-native-async-storage/async-storage';

const HARDCODED_USER_ID = 'YOUR_DRIVER_USER_ID'; // replace

interface Props {
  onBack: () => void;
}

export default function EarningsScreen({ onBack }: Props) {
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    try {
      const cached = await AsyncStorage.getItem('truckme_user');
      const uid = cached ? JSON.parse(cached).id : HARDCODED_USER_ID;

      // Get driver's bookings
      const res = await client.get(`/api/bookings/driver/${uid}`);
      const list = res.data || [];
      setBookings(list);
    } catch (e: any) {
      console.error('[Earnings] error:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { load(); }, []);

  const today = new Date();
  const isToday = (d: string) => new Date(d).toDateString() === today.toDateString();
  const isThisWeek = (d: string) => {
    const date = new Date(d);
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    return date >= weekAgo;
  };
  const isThisMonth = (d: string) => {
    const date = new Date(d);
    return date.getMonth() === today.getMonth() && date.getFullYear() === today.getFullYear();
  };

  const completed = bookings.filter(b => b.status === 'Delivered');
  const totalEarnings = completed.reduce((s, b) => s + (b.driverEarnings || 0), 0);
  const todayEarnings = completed.filter(b => b.completedAt && isToday(b.completedAt))
    .reduce((s, b) => s + (b.driverEarnings || 0), 0);
  const weekEarnings = completed.filter(b => b.completedAt && isThisWeek(b.completedAt))
    .reduce((s, b) => s + (b.driverEarnings || 0), 0);
  const monthEarnings = completed.filter(b => b.completedAt && isThisMonth(b.completedAt))
    .reduce((s, b) => s + (b.driverEarnings || 0), 0);

  if (loading) {
    return <View style={styles.center}><ActivityIndicator color="#F5A623" size="large" /></View>;
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: '#F4F7FB' }}
      contentContainerStyle={{ padding: 16 }}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor="#F5A623" />
      }>
      <View style={styles.headerCard}>
        <Text style={styles.totalLabel}>TOTAL EARNINGS</Text>
        <Text style={styles.totalValue}>LKR {Math.round(totalEarnings).toLocaleString()}</Text>
        <Text style={styles.totalSub}>{completed.length} completed trips</Text>
      </View>

      <View style={styles.statsRow}>
        <StatCard label="Today" value={todayEarnings} accent />
        <StatCard label="This week" value={weekEarnings} />
        <StatCard label="This month" value={monthEarnings} />
      </View>

      <Text style={styles.sectionTitle}>Recent payouts</Text>

      {completed.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyEmoji}>💰</Text>
          <Text style={styles.emptyTitle}>No earnings yet</Text>
          <Text style={styles.emptyText}>Complete jobs to see payouts here</Text>
        </View>
      ) : (
        completed.slice(0, 20).map(b => (
          <View key={b.id} style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={styles.bookingNo}>{b.bookingNumber}</Text>
              <Text style={styles.date}>
                {b.completedAt ? new Date(b.completedAt).toLocaleDateString() : '—'}
              </Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={styles.amount}>+ LKR {Math.round(b.driverEarnings || 0).toLocaleString()}</Text>
              <Text style={styles.fare}>Total: LKR {Math.round(b.totalFare || 0).toLocaleString()}</Text>
            </View>
          </View>
        ))
      )}

      <Pressable style={styles.withdrawBtn} onPress={() => Alert.alert('Coming soon', 'Withdrawal flow not yet implemented')}>
        <Text style={styles.withdrawText}>Request withdrawal</Text>
      </Pressable>
    </ScrollView>
  );
}

function StatCard({ label, value, accent }: any) {
  return (
    <View style={[styles.statCard, accent && styles.statCardAccent]}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={[styles.statValue, accent && { color: '#F5A623' }]}>LKR {Math.round(value).toLocaleString()}</Text>
    </View>
  );
}

const NAVY = '#1A2B4A';
const ORANGE = '#F5A623';
const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F4F7FB' },

  headerCard: { backgroundColor: NAVY, padding: 32, borderRadius: 12, alignItems: 'center', marginBottom: 16 },
  totalLabel: { fontSize: 11, color: 'rgba(255,255,255,0.7)', letterSpacing: 1.5 },
  totalValue: { fontSize: 36, fontWeight: '900', color: 'white', marginTop: 8 },
  totalSub: { fontSize: 13, color: 'rgba(255,255,255,0.7)', marginTop: 4 },

  statsRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  statCard: { flex: 1, backgroundColor: 'white', padding: 14, borderRadius: 12, alignItems: 'center' },
  statCardAccent: { borderWidth: 2, borderColor: ORANGE },
  statLabel: { fontSize: 11, color: '#5A6B85', fontWeight: '700', letterSpacing: 1 },
  statValue: { fontSize: 16, fontWeight: '900', color: NAVY, marginTop: 4 },

  sectionTitle: { fontSize: 14, fontWeight: '700', color: '#5A6B85', marginBottom: 8, marginTop: 8 },

  row: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'white', padding: 14, borderRadius: 12, marginBottom: 8,
  },
  bookingNo: { fontSize: 14, fontWeight: '700', color: NAVY },
  date: { fontSize: 12, color: '#5A6B85', marginTop: 2 },
  amount: { fontSize: 15, fontWeight: '900', color: '#27AE60' },
  fare: { fontSize: 11, color: '#8895A8', marginTop: 2 },

  empty: { alignItems: 'center', padding: 40 },
  emptyEmoji: { fontSize: 64 },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: NAVY, marginTop: 12 },
  emptyText: { fontSize: 13, color: '#5A6B85', marginTop: 4 },

  withdrawBtn: {
    marginTop: 16, padding: 16, borderRadius: 12,
    backgroundColor: ORANGE, alignItems: 'center',
  },
  withdrawText: { color: 'white', fontWeight: '700', fontSize: 15 },
});
