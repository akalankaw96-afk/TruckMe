import React, { useEffect, useState } from 'react';
import {
  View, Text, FlatList, StyleSheet, Pressable,
  ActivityIndicator, RefreshControl, StatusBar,
} from 'react-native';
import client, { clearAuth } from '../api/client';
import { AuthUser } from '../types';

interface Props {
  user: AuthUser;
  onLogout: () => void;
  onOpenAddresses: () => void;
  onOpenBookings: () => void;
  onSelectTruck: (vt: any) => void;
}

interface VehicleType {
  id: string;
  name: string;
  code: string;
  category: string;
  basePrice: number;
  pricePerKm: number;
  description?: string;
  minCapacityKg?: number;
  maxCapacityKg?: number;
}



export default function HomeScreen({ route, user, onLogout, onOpenAddresses, onOpenBookings, onSelectTruck }: Props) {
  const [trucks, setTrucks] = useState<VehicleType[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  const load = async () => {
    try {
      const res = await client.get('/api/vehicletypes');
      setTrucks(res.data || []);
    } catch (e) {
      console.warn('Failed to load trucks', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { load(); }, []);

  useEffect(() => {
    const msg = route?.params?.toastMessage;
    if (msg) {
      setSuccessToast(msg);
      const timer = setTimeout(() => setSuccessToast(null), 6000);
      return () => clearTimeout(timer);
    }
  }, [route?.params?.toastMessage]);

  const signOut = async () => {
    try {
      await clearAuth();
    } catch (e) {
      console.warn('Sign out error:', e);
    } finally {
      onLogout();
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

      {successToast && (
        <View style={{ backgroundColor: '#27AE60', padding: 14, marginHorizontal: 16, marginTop: 12, borderRadius: 10, borderWidth: 1, borderColor: '#1E6327' }}>
          <Text style={{ color: 'white', fontWeight: '800', fontSize: 14, textAlign: 'center' }}>
            {successToast}
          </Text>
        </View>
      )}

      <FlatList
        data={trucks}
        keyExtractor={(t) => t.id}
        contentContainerStyle={{ padding: 16 }}
        ListHeaderComponent={
          <View>
            <View style={styles.headerBar}>
              <View>
                <Text style={styles.greeting}>Hello,</Text>
                <Text style={styles.userName}>{user.fullName} 👋</Text>
              </View>
              <Pressable onPress={signOut} hitSlop={10}>
                <Text style={styles.logout}>Sign out</Text>
              </Pressable>
            </View>

            <View style={styles.hero}>
              <Text style={styles.heroTitle}>Where to today?</Text>
              <Text style={styles.heroSub}>Book a truck in just a few taps</Text>
            </View>

            <View style={styles.actionsRow}>
              <Pressable style={styles.actionCard} onPress={onOpenBookings}>
                <Text style={styles.actionEmoji}>📦</Text>
                <Text style={styles.actionLabel}>My Bookings</Text>
              </Pressable>
              <Pressable style={styles.actionCard} onPress={onOpenAddresses}>
                <Text style={styles.actionEmoji}>📍</Text>
                <Text style={styles.actionLabel}>Addresses</Text>
              </Pressable>
            </View>

            <Text style={styles.sectionTitle}>Available trucks ({trucks.length})</Text>
          </View>
        }
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor="#F5A623" />
        }
        renderItem={({ item }) => (
          <Pressable style={styles.truckCard} onPress={() => onSelectTruck(item)}>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{item.code}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.truckName}>{item.name}</Text>
              <Text style={styles.truckDesc}>{item.description}</Text>
              <Text style={styles.truckPrice}>
                From LKR {item.basePrice.toLocaleString()} + LKR {item.pricePerKm}/km
              </Text>
            </View>
            <Text style={styles.chev}>›</Text>
          </Pressable>
        )}
        ListEmptyComponent={<Text style={styles.empty}>No trucks available</Text>}
      />
    </View>
  );
}

const NAVY = '#1A2B4A';
const ORANGE = '#F5A623';
const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F4F7FB' },
  headerBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, backgroundColor: NAVY, marginHorizontal: -16 },
  greeting: { fontSize: 13, color: '#A8B6CC' },
  userName: { fontSize: 22, fontWeight: '700', color: 'white', marginTop: 2 },
  logout: { fontSize: 13, color: ORANGE, fontWeight: '700' },
  hero: { backgroundColor: NAVY, marginTop: 16, padding: 24, borderRadius: 14 },
  heroTitle: { fontSize: 22, fontWeight: '700', color: 'white' },
  heroSub: { fontSize: 13, color: '#A8B6CC', marginTop: 4 },
  actionsRow: { flexDirection: 'row', gap: 12, marginTop: 16 },
  actionCard: { flex: 1, backgroundColor: 'white', padding: 16, borderRadius: 12, alignItems: 'center' },
  actionEmoji: { fontSize: 28 },
  actionLabel: { fontSize: 13, color: NAVY, fontWeight: '600', marginTop: 6 },
  sectionTitle: { fontSize: 14, fontWeight: '600', color: '#5A6B85', marginTop: 24, marginBottom: 8 },
  truckCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', padding: 16, borderRadius: 12, marginBottom: 10 },
  badge: { width: 50, height: 50, borderRadius: 10, backgroundColor: '#3B8FD6', alignItems: 'center', justifyContent: 'center', marginRight: 14 },
  badgeText: { color: 'white', fontWeight: '900', fontSize: 13 },
  truckName: { fontSize: 16, fontWeight: '600', color: NAVY },
  truckDesc: { fontSize: 12, color: '#5A6B85', marginTop: 4 },
  truckPrice: { fontSize: 13, color: ORANGE, fontWeight: '700', marginTop: 6 },
  chev: { fontSize: 24, color: '#8895A8' },
  empty: { textAlign: 'center', color: '#5A6B85', marginTop: 40 },
});
