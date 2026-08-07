import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, Pressable,
  ActivityIndicator, RefreshControl, StatusBar, Modal, Platform, Linking, Alert,
} from 'react-native';
import client from '../api/client';
import { AuthUser } from '../types';
import { API_BASE_URL } from '../constants/Config';

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
  batteryLevel?: number | null;
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
  const [cancelling, setCancelling] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const load = async () => {
    try {
      const bRes = await client.get(`/api/bookings/${bookingId}`);
      setBooking(bRes.data);
    } catch (e: any) {
      showToast(e?.response?.data?.message || 'Failed to load booking details', 'error');
      setLoading(false);
      setRefreshing(false);
      return;
    }

    try {
      const tRes = await client.get(`/api/tracking/booking/${bookingId}`);
      setTracking(tRes.data || []);
    } catch (tErr) {
      setTracking([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    load();
    const interval = setInterval(() => {
      load();
    }, 4000);
    return () => clearInterval(interval);
  }, [bookingId]);

  const doCancel = async () => {
    setShowConfirmModal(false);
    setCancelling(true);
    try {
      await client.post(`/api/bookings/${bookingId}/cancel`, {
        reason: 'Customer requested cancellation',
        cancellationReason: 'Customer requested cancellation',
      });
      showToast('Booking cancelled successfully', 'success');
      setTimeout(() => {
        onBack();
      }, 1200);
    } catch (e: any) {
      const msg = e?.response?.data?.message || e?.message || 'Failed to cancel booking';
      showToast(msg, 'error');
    } finally {
      setCancelling(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#F5A623" size="large" />
      </View>
    );
  }

  if (!booking) {
    return (
      <View style={styles.center}>
        <Text style={styles.emptyTitle}>Booking not found</Text>
      </View>
    );
  }

  const status = booking.status || 'Pending';
  const paymentStatus = booking.paymentStatus || 'Pending';
  const totalFare = booking.totalFare ?? 0;

  const isActive = status !== 'Delivered' && status !== 'Cancelled' && status !== 'Completed';
  const isPaid = paymentStatus === 'Completed';
  const latest = tracking[tracking.length - 1];

  const driverLat = latest?.latitude || booking.pickupLatitude || 6.9271;
  const driverLng = latest?.longitude || booking.pickupLongitude || 79.8612;
  const destLat = booking.pickupLatitude || 6.9221;
  const destLng = booking.pickupLongitude || 79.8712;

  return (
    <View style={{ flex: 1, backgroundColor: '#F4F7FB' }}>
      <StatusBar barStyle="light-content" backgroundColor="#1A2B4A" />

      {/* Floating Toast Message Banner */}
      {toast && (
        <View style={[styles.toastContainer, toast.type === 'error' ? styles.toastError : styles.toastSuccess]}>
          <Text style={styles.toastText}>
            {toast.type === 'error' ? '⚠️ ' : '✓ '}
            {toast.message}
          </Text>
        </View>
      )}

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); load(); }}
            tintColor="#F5A623"
          />
        }>

        {/* Header card */}
        <View style={styles.headerCard}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View>
              <Text style={styles.bookingNumber}>{booking.bookingNumber}</Text>
              <View style={[styles.statusBadge, { backgroundColor: statusColor(status), alignSelf: 'flex-start', marginTop: 8 }]}>
                <Text style={styles.statusBadgeText}>{status}</Text>
              </View>
            </View>
            {isActive && (
              <Pressable
                style={[styles.headerCancelBtn, cancelling && { opacity: 0.6 }]}
                onPress={() => setShowConfirmModal(true)}
                disabled={cancelling}>
                {cancelling ? (
                  <ActivityIndicator color="#E74C3C" size="small" />
                ) : (
                  <Text style={styles.headerCancelBtnText}>Cancel</Text>
                )}
              </Pressable>
            )}
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
            {booking?.scheduledPickupAt
              ? new Date(booking.scheduledPickupAt).toLocaleString()
              : 'Pending'}
          </Text>
          {booking?.completedAt && (
            <Text style={styles.subValue}>
              Completed: {new Date(booking.completedAt).toLocaleString()}
            </Text>
          )}
        </View>

        {/* Verified Proof of Delivery (PoD) Card */}
        {(status === 'Delivered' || booking?.completedAt) && (
          <View style={podCardStyles.podCard}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <Text style={podCardStyles.title}>✅ Verified Proof of Delivery (PoD)</Text>
              <View style={podCardStyles.badge}>
                <Text style={podCardStyles.badgeText}>DELIVERED</Text>
              </View>
            </View>

            <Text style={podCardStyles.sub}>
              Delivered: {booking.completedAt ? new Date(booking.completedAt).toLocaleString() : 'Just now'}
            </Text>
            <Text style={podCardStyles.recipient}>
              Recipient: {booking.pickupContactName || 'Verified Recipient'}
            </Text>

            <View style={podCardStyles.signatureBox}>
              <Text style={podCardStyles.sigLabel}>✍️ Verified Digital Signature</Text>
              <Text style={podCardStyles.sigSub}>[Electronic Touchscreen Signature Confirmed]</Text>
            </View>
          </View>
        )}

        {/* Driver Live Tracking Card */}
        {isActive && (
          <View style={styles.card}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <Text style={styles.cardLabel}>🚚 Live Driver GPS Position</Text>
              <View style={{ backgroundColor: '#27AE60', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 }}>
                <Text style={{ color: 'white', fontSize: 10, fontWeight: 'bold' }}>LIVE BROADCAST</Text>
              </View>
            </View>

            {latest?.driverName && (
              <Text style={styles.value}>Driver: {latest.driverName} ({latest.vehiclePlate || 'Truck'})</Text>
            )}

            <Text style={styles.subValue}>
              Driver status: <Text style={{ fontWeight: 'bold', color: '#F5A623' }}>{status}</Text>
            </Text>

            {/* Google Directions Route Map to Pickup / Dropoff */}
            <View style={{ height: 220, borderRadius: 10, overflow: 'hidden', marginVertical: 10, borderWidth: 1, borderColor: '#D8E0EA' }}>
              {Platform.OS === 'web' ? (
                // @ts-ignore
                <iframe
                  title="Driver Live Location & Route Map"
                  width="100%"
                  height="100%"
                  frameBorder="0"
                  src={`https://maps.google.com/maps?saddr=${driverLat},${driverLng}&daddr=${destLat},${destLng}&output=embed`}
                  style={{ border: 'none', width: '100%', height: '100%' }}
                />
              ) : (
                <View style={{ flex: 1, backgroundColor: '#1A2B4A', justifyContent: 'center', alignItems: 'center', padding: 12 }}>
                  <Text style={{ fontSize: 32, marginBottom: 4 }}>🚚 ➔ 📍</Text>
                  <Text style={{ color: '#F5A623', fontWeight: 'bold' }}>Driver En-Route Position</Text>
                  <Text style={{ color: '#FFFFFF', fontSize: 12, marginTop: 4, textAlign: 'center' }}>
                    Driver: ({driverLat.toFixed(4)}, {driverLng.toFixed(4)}) → Target: ({destLat.toFixed(4)}, {destLng.toFixed(4)})
                  </Text>
                </View>
              )}
            </View>

            <Text style={styles.subValue}>
              Coordinates: Lat {driverLat.toFixed(5)}, Lng {driverLng.toFixed(5)}
            </Text>
            <Text style={{ fontSize: 11, color: '#8895A8', marginTop: 4 }}>
              🔄 Live updating every 4 seconds
            </Text>
          </View>
        )}

        {/* Fare */}
        <View style={styles.card}>
          <Text style={styles.cardLabel}>💰 Fare</Text>
          <Row label="Base" value={booking?.baseFare ?? 0} />
          <Row label="Distance" value={booking?.distanceFare ?? 0} />
          {booking?.helpersFare > 0 && <Row label="Helpers" value={booking.helpersFare ?? 0} />}
          {booking?.expressFare > 0 && <Row label="Express" value={booking.expressFare ?? 0} />}
          <Row label="Service fee" value={booking?.serviceFee ?? 0} />
          <View style={styles.divider} />
          <Row label="Total" value={totalFare} bold accent />

          {isActive && (
            <Pressable
              style={[styles.cancelBtn, cancelling && { opacity: 0.6 }]}
              onPress={() => setShowConfirmModal(true)}
              disabled={cancelling}>
              {cancelling ? (
                <ActivityIndicator color="#E74C3C" />
              ) : (
                <Text style={styles.cancelBtnText}>Cancel booking</Text>
              )}
            </Pressable>
          )}

          {status === 'Delivered' && onRate && !isPaid && (
            <Pressable style={styles.rateBtn} onPress={() => onRate(bookingId)}>
              <Text style={styles.rateBtnText}>⭐ Rate this trip</Text>
            </Pressable>
          )}

          {isPaid && (
            <Pressable
              style={styles.invoiceBtn}
              onPress={() => {
                const invoiceUrl = `${API_BASE_URL}/api/payments/${bookingId}/invoice/download`;
                Linking.openURL(invoiceUrl).catch(() => {
                  Alert.alert('Download Invoice', `Open invoice at: ${invoiceUrl}`);
                });
              }}>
              <Text style={styles.invoiceBtnText}>📄 Download & View PDF Invoice</Text>
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
          <Text style={styles.value}>{booking?.cargoType || '—'}</Text>
          {booking?.cargoDescription && (
            <Text style={styles.subValue}>{booking.cargoDescription}</Text>
          )}
          {booking?.cargoWeightKg != null && (
            <Text style={styles.subValue}>Weight: {booking.cargoWeightKg} kg</Text>
          )}
          {booking?.numberOfHelpers > 0 && (
            <Text style={styles.subValue}>Helpers: {booking.numberOfHelpers}</Text>
          )}
        </View>
      </ScrollView>

      {/* ===== Custom Cancel Confirmation Modal Overlay ===== */}
      <Modal
        visible={showConfirmModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowConfirmModal(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.confirmModalCard}>
            <Text style={styles.confirmModalIcon}>🚫</Text>
            <Text style={styles.confirmModalTitle}>Cancel Booking?</Text>
            <Text style={styles.confirmModalSubtitle}>
              Are you sure you want to cancel this booking? This action cannot be undone.
            </Text>

            <View style={styles.modalBtnRow}>
              <Pressable
                style={styles.modalSecondaryBtn}
                onPress={() => setShowConfirmModal(false)}>
                <Text style={styles.modalSecondaryBtnText}>Keep Booking</Text>
              </Pressable>
              <Pressable
                style={styles.modalDestructiveBtn}
                onPress={doCancel}>
                <Text style={styles.modalDestructiveBtnText}>Yes, Cancel</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
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
  toastText: { color: 'white', fontWeight: '800', fontSize: 14, textAlign: 'center' },

  headerCard: {
    backgroundColor: NAVY, padding: 20, borderRadius: 12, marginBottom: 12,
  },
  bookingNumber: { fontSize: 20, fontWeight: '900', color: 'white' },
  statusBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999 },
  statusBadgeText: { color: 'white', fontSize: 12, fontWeight: '700' },
  headerCancelBtn: {
    backgroundColor: '#FFEAEA',
    borderWidth: 1,
    borderColor: '#E74C3C',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  headerCancelBtnText: { color: '#E74C3C', fontSize: 13, fontWeight: '700' },
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

  invoiceBtn: {
    marginTop: 12, paddingVertical: 12, paddingHorizontal: 16, borderRadius: 8,
    backgroundColor: NAVY, alignItems: 'center',
  },
  invoiceBtnText: { color: ORANGE, fontWeight: '800', fontSize: 14 },

  payBtn: {
    marginTop: 12, paddingVertical: 14, borderRadius: 8,
    backgroundColor: GREEN, alignItems: 'center',
  },
  payBtnText: { color: 'white', fontWeight: '700', fontSize: 15 },

  emptyTitle: { fontSize: 16, color: '#5A6B85', marginTop: 16 },

  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  confirmModalCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
  },
  confirmModalIcon: { fontSize: 44, marginBottom: 8 },
  confirmModalTitle: { fontSize: 20, fontWeight: '800', color: NAVY, marginBottom: 8 },
  confirmModalSubtitle: { fontSize: 14, color: '#5A6B85', textAlign: 'center', marginBottom: 24, lineHeight: 20 },
  modalBtnRow: { flexDirection: 'row', gap: 12, width: '100%' },
  modalSecondaryBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#D8E0EA',
    alignItems: 'center',
  },
  modalSecondaryBtnText: { color: NAVY, fontWeight: '700', fontSize: 14 },
  modalDestructiveBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#D32F2F',
    alignItems: 'center',
  },
  modalDestructiveBtnText: { color: 'white', fontWeight: '800', fontSize: 14 },
});

const podCardStyles = StyleSheet.create({
  podCard: { backgroundColor: '#E8F8F0', borderWidth: 1.5, borderColor: '#27AE60', borderRadius: 12, padding: 16, marginBottom: 12 },
  title: { fontSize: 15, fontWeight: '800', color: '#1A2B4A' },
  badge: { backgroundColor: '#27AE60', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  badgeText: { color: 'white', fontSize: 10, fontWeight: '800' },
  sub: { fontSize: 12, color: '#5A6B85', marginTop: 2 },
  recipient: { fontSize: 13, fontWeight: '700', color: '#1A2B4A', marginTop: 6 },
  signatureBox: { backgroundColor: 'white', borderWidth: 1, borderColor: '#27AE60', borderRadius: 8, padding: 12, marginTop: 10, alignItems: 'center' },
  sigLabel: { fontSize: 12, fontWeight: '800', color: '#27AE60' },
  sigSub: { fontSize: 10, color: '#5A6B85', marginTop: 2 },
});
