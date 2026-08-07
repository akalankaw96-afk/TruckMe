import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, Pressable,
  ActivityIndicator, RefreshControl, Alert, StatusBar,
} from 'react-native';
import client from '../api/client';
import { AuthUser } from '../types';

interface Props {
  user: AuthUser;
  bookingId: string;
  onBack: () => void;
  onRate?: (bookingId: string) => void;
  onPay?: (bookingId: string, amount: number) => void;
}

interface TrackingPoint {
  latitude: number;
  longitude: number;
  speedKph?: number | null;
  headingDegrees?: number | null;
  capturedAt: string;
  status?: string | null;
}

export default function BookingDetailScreen({
  user, bookingId, onBack, onRate, onPay,
}: Props) {
  const [booking, setBooking] = useState<any>(null);
  const [tracking, setTracking] = useState<TrackingPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    console.log('[BookingDetail] loading bookingId:', bookingId);
    try {
      const [bRes, tRes] = await Promise.all([
        client.get(`/api/bookings/${bookingId}`),
        client.get(`/api/tracking/booking/${bookingId}`),
      ]);
      console.log('[BookingDetail] booking:', bRes.data);
      setBooking(bRes.data);
      setTracking(Array.isArray(tRes.data) ? tRes.data : []);
      setError(null);
    } catch (e: any) {
      console.error('[BookingDetail] error:', e?.response?.status, e?.response?.data || e?.message);
      setError(e?.response?.data?.message || e?.message || 'Failed to load');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { load(); }, [bookingId]);

  const cancelBooking = () => {
    Alert.alert('Cancel booking?', 'Are you sure you want to cancel?', [
      { text: 'No' },
      {
        text: 'Yes, cancel', style: 'destructive',
        onPress: async () => {
          try {
            await client.post(`/api/bookings/${bookingId}/cancel`, {
              reason: 'Customer changed mind',
            });
            Alert.alert('Cancelled', 'Your booking has been cancelled');
            onBack();
          } catch (e: any) {
            Alert.alert('Error', e?.response?.data?.message || 'Failed to cancel');
          }
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

  if (error || !booking) {
    return (
      <View style={styles.center}>
        <Text style={styles.emptyEmoji}>⚠️</Text>
        <Text style={styles.emptyTitle}>
          {error ? 'Could not load booking' : 'Booking not found'}
        </Text>
        <Text style={styles.emptyText}>{error || 'Please try again'}</Text>
        <Pressable style={styles.retryBtn} onPress={load}>
          <Text style={styles.retryText}>Retry</Text>
        </Pressable>
        <Pressable onPress={onBack} style={{ marginTop: 16 }}>
          <Text style={styles.linkText}>← Back to bookings</Text>
        </Pressable>
      </View>
    );
  }

  // Safe field extraction with defaults
  const status = booking.status || 'Pending';
  const paymentStatus = booking.paymentStatus || 'Pending';
  const totalFare = Number(booking.totalFare) || 0;
  const baseFare = Number(booking.baseFare) || 0;
  const distanceFare = Number(booking.distanceFare) || 0;
  const helpersFare = Number(booking.helpersFare) || 0;
  const expressFare = Number(booking.expressFare) || 0;
  const serviceFee = Number(booking.serviceFee) || 0;
  const cargoWeightKg = booking.cargoWeightKg != null ? Number(booking.cargoWeightKg) : null;
  const numberOfHelpers = Number(booking.numberOfHelpers) || 0;

  const isActive = status !== 'Delivered' && status !== 'Cancelled';
  const isPaid = paymentStatus === 'Completed';
  const latest = tracking[tracking.length - 1];

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: '#F4F7FB' }}
      contentContainerStyle={{ padding: 16 }}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => { setRefreshing(true); load(); }}
          tintColor="#F5A623"
        />
      }>
      <StatusBar barStyle="light-content" backgroundColor="#1A2B4A" />

      {/* Header card */}
      <View style={styles.headerCard}>
        <Text style={styles.bookingNumber}>{booking.bookingNumber || 'N/A'}</Text>
        <View style={[styles.statusBadge, { backgroundColor: statusColor(status), alignSelf: 'flex-start', marginTop: 8 }]}>
          <Text style={styles.statusBadgeText}>{status}</Text>
        </View>
        {isPaid && (
          <View style={styles.paidPill}>
            <Text style={styles.paidPillText}>✓ Paid</Text>
          </View>
        )}
      </View>

      {/* Schedule */}
      <View style={styles.card}>
        <Text style={styles.cardLabel}>📅 Schedule</Text>
        <Text style={styles.value}>
          {booking.scheduledPickupAt
            ? new Date(booking.scheduledPickupAt).toLocaleString()
            : 'Pending'}
        </Text>
        {booking.completedAt && (
          <Text style={styles.subValue}>
            Completed: {new Date(booking.completedAt).toLocaleString()}
          </Text>
        )}
      </View>

      {/* Live tracking */}
      {isActive && (
        <View style={styles.card}>
          <Text style={styles.cardLabel}>📍 Live tracking</Text>
          {latest ? (
            <View>
              <Text style={styles.value}>
                Lat: {Number(latest.latitude || 0).toFixed(5)}, Lng: {Number(latest.longitude || 0).toFixed(5)}
              </Text>
              {latest.speedKph != null && (
                <Text style={styles.subValue}>Speed: {latest.speedKph} km/h</Text>
              )}
              <Text style={styles.subValue}>
                Last update: {new Date(latest.capturedAt).toLocaleTimeString()}
              </Text>
            </View>
          ) : (
            <Text style={styles.subValue}>Waiting for driver location...</Text>
          )}
          <Text style={styles.hint}>
            {tracking.length} tracking points recorded
          </Text>
        </View>
      )}

      {/* Fare */}
      <View style={styles.card}>
        <Text style={styles.cardLabel}>💰 Fare</Text>
        <Row label="Base" value={baseFare} />
        <Row label="Distance" value={distanceFare} />
        {helpersFare > 0 && <Row label="Helpers" value={helpersFare} />}
        {expressFare > 0 && <Row label="Express" value={expressFare} />}
        <Row label="Service fee" value={serviceFee} />
        <View style={styles.divider} />
        <Row label="Total" value={totalFare} bold accent />

        {isActive && status !== 'Unknown' && (
          <Pressable style={styles.cancelBtn} onPress={cancelBooking}>
            <Text style={styles.cancelBtnText}>Cancel booking</Text>
          </Pressable>
        )}

        {status === 'Delivered' && onRate && !isPaid && (
          <Pressable style={styles.rateBtn} onPress={() => onRate(bookingId)}>
            <Text style={styles.rateBtnText}>⭐ Rate this trip</Text>
          </Pressable>
        )}

        {status === 'Delivered' && !isPaid && onPay && (
          <Pressable style={styles.payBtn} onPress={() => onPay(bookingId, totalFare)}>
            <Text style={styles.payBtnText}>
              💰 Pay now · LKR {Math.round(totalFare).toLocaleString()}
            </Text>
          </Pressable>
        )}
      </View>

      {/* Cargo */}
      <View style={styles.card}>
        <Text style={styles.cardLabel}>📦 Cargo</Text>
        <Text style={styles.value}>{booking.cargoType || '—'}</Text>
        {booking.cargoDescription && (
          <Text style={styles.subValue}>{booking.cargoDescription}</Text>
        )}
        {cargoWeightKg != null && (
          <Text style={styles.subValue}>Weight: {cargoWeightKg} kg</Text>
        )}
        {numberOfHelpers > 0 && (
          <Text style={styles.subValue}>Helpers: {numberOfHelpers}</Text>
        )}
      </View>
    </ScrollView>
  );
}

function Row({ label, value, bold, accent }: any) {
  return (
    <View style={styles.row}>
      <Text style={[styles.rowLabel, bold && { fontWeight: '700' }]}>{label}</Text>
      <Text style={[styles.rowValue, bold && { fontWeight: '700', fontSize: 16 }, accent && { color: '#F5A623' }]}>
        LKR {Math.round(value).toLocaleString()}
      </Text>
    </View>
  );
}

function statusColor(s: string) {
  switch (s) {
    case 'Pending': return '#F39C12';
    case 'Assigned': return '#3B8FD6';
    case 'EnRoute': return '#F5A623';
    case 'Arrived':
    case 'Loading': return '#F5A623';
    case 'Delivered': return '#27AE60';
    case 'Cancelled': return '#95A5A6';
    case 'Failed': return '#E74C3C';
    default: return '#5A6B85';
  }
}

const NAVY = '#1A2B4A';
const ORANGE = '#F5A623';
const GREEN = '#27AE60';
const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F4F7FB' },

  headerCard: {
    backgroundColor: NAVY, padding: 20, borderRadius: 12, marginBottom: 12,
  },
  bookingNumber: { fontSize: 20, fontWeight: '900', color: 'white' },
  statusBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999 },
  statusBadgeText: { color: 'white', fontSize: 12, fontWeight: '700' },
  paidPill: {
    position: 'absolute', top: 20, right: 20,
    backgroundColor: GREEN, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999,
  },
  paidPillText: { color: 'white', fontSize: 11, fontWeight: '700' },

  card: { backgroundColor: 'white', padding: 16, borderRadius: 12, marginBottom: 12 },
  cardLabel: { fontSize: 13, fontWeight: '700', color: '#5A6B85', marginBottom: 8, letterSpacing: 0.5 },
  value: { fontSize: 15, color: NAVY, fontWeight: '600' },
  subValue: { fontSize: 13, color: '#5A6B85', marginTop: 4 },
  hint: { fontSize: 11, color: '#8895A8', marginTop: 12, fontStyle: 'italic' },

  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  rowLabel: { fontSize: 13, color: '#5A6B85' },
  rowValue: { fontSize: 13, color: NAVY, fontWeight: '600' },
  divider: { height: 1, backgroundColor: '#E8EDF3', marginVertical: 8 },

  cancelBtn: {
    marginTop: 16, paddingVertical: 12, borderRadius: 8,
    borderWidth: 1, borderColor: '#E74C3C', alignItems: 'center',
  },
  cancelBtnText: { color: '#E74C3C', fontWeight: '700', fontSize: 14 },

  rateBtn: {
    marginTop: 12, paddingVertical: 12, borderRadius: 8,
    backgroundColor: ORANGE, alignItems: 'center',
  },
  rateBtnText: { color: 'white', fontWeight: '700', fontSize: 14 },

  payBtn: {
    marginTop: 12, paddingVertical: 14, borderRadius: 8,
    backgroundColor: GREEN, alignItems: 'center',
  },
  payBtnText: { color: 'white', fontWeight: '700', fontSize: 15 },

  emptyEmoji: { fontSize: 56 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: NAVY, marginTop: 16 },
  emptyText: { fontSize: 13, color: '#5A6B85', marginTop: 8, textAlign: 'center' },
  retryBtn: { marginTop: 20, paddingHorizontal: 20, paddingVertical: 10, backgroundColor: ORANGE, borderRadius: 8 },
  retryText: { color: 'white', fontWeight: '700' },

  linkText: { color: ORANGE, fontWeight: '600', fontSize: 14 },
});
