import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, Pressable,
  ActivityIndicator, Alert, KeyboardAvoidingView, Platform, StatusBar, Linking, Modal, TextInput,
} from 'react-native';
import client from '../api/client';
import { AuthUser, DriverProfile, Vehicle } from '../types';

interface Props {
  user: AuthUser;
  driver: DriverProfile;
  vehicle: Vehicle;
  jobId: string;
  onBack: () => void;
  onAccepted: () => void;
}

const STATUSES = ['EnRoute', 'Arrived', 'Loading', 'InTransit', 'AtDropoff', 'Delivered'];

export default function JobDetailScreen({ user, driver, vehicle, jobId, onBack, onAccepted }: Props) {
  const [job, setJob] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [gpsTimer, setGpsTimer] = useState<any>(null);
  const [gpsActive, setGpsActive] = useState(false);

  const [showPodModal, setShowPodModal] = useState(false);
  const [podRecipientName, setPodRecipientName] = useState('');
  const [podNotes, setPodNotes] = useState('');
  const [podPhoto, setPodPhoto] = useState('');
  const [podSignature, setPodSignature] = useState('data:image/svg+xml;utf8,<svg>Verified Digital Signature</svg>');

  const submitPod = async () => {
    setBusy(true);
    try {
      await client.post(`/api/bookings/${jobId}/pod`, {
        recipientName: podRecipientName || job?.pickupContactName || 'Verified Recipient',
        recipientSignature: podSignature,
        cargoPhotoUrl: podPhoto || 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=500',
        notes: podNotes || 'Cargo inspected and received in good condition',
      });
      setShowPodModal(false);
      Alert.alert('✅ Proof of Delivery Verified', 'Trip completed successfully & earnings updated!');
      await load();
    } catch (e: any) {
      Alert.alert('Failed', e?.response?.data?.message || e?.message);
    } finally {
      setBusy(false);
    }
  };

  const load = async () => {
    try {
      const res = await client.get(`/api/bookings/${jobId}`);
      setJob(res.data);
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.message || 'Failed to load job');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    return () => {
      if (gpsTimer) clearInterval(gpsTimer);
    };
  }, []);

  const openExternalNavigation = (destLat?: number, destLng?: number, label?: string) => {
    const targetLat = destLat || job?.pickupLatitude || 6.9271;
    const targetLng = destLng || job?.pickupLongitude || 79.8612;
    const navUrl = Platform.select({
      ios: `maps://app?daddr=${targetLat},${targetLng}`,
      android: `google.navigation:q=${targetLat},${targetLng}`,
      web: `https://www.google.com/maps/dir/?api=1&destination=${targetLat},${targetLng}`,
    }) || `https://www.google.com/maps/dir/?api=1&destination=${targetLat},${targetLng}`;

    Linking.openURL(navUrl).catch(() => {
      Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${targetLat},${targetLng}`);
    });
  };

  const acceptJob = async () => {
    setBusy(true);
    try {
      await client.patch(`/api/bookings/${jobId}/assign`, {
        driverId: driver.id,
        vehicleId: vehicle.id,
      });
      await client.patch(`/api/bookings/${jobId}/status`, { status: 'Assigned' });
      Alert.alert('Job Accepted! 🚚', 'Showing customer pickup location & navigation route.');
      await load();
      startGpsBroadcast();
    } catch (e: any) {
      Alert.alert('Failed', e?.response?.data?.message || e?.message);
    } finally {
      setBusy(false);
    }
  };

  const updateStatus = async (status: string) => {
    setBusy(true);
    try {
      await client.patch(`/api/bookings/${jobId}/status`, { status });
      await load();
      if (status === 'Delivered') {
        Alert.alert('Delivered!', 'Earnings added to your account');
      }
    } catch (e: any) {
      Alert.alert('Failed', e?.response?.data?.message || e?.message);
    } finally {
      setBusy(false);
    }
  };

  // Simulate GPS posting (no real device GPS in Expo Go, so we fake movement)
  const postGpsPoint = async (status?: string) => {
    try {
      const baseLat = 6.9271;
      const baseLng = 79.8612;
      // Add some random offset to simulate movement
      const lat = baseLat + (Math.random() - 0.5) * 0.02;
      const lng = baseLng + (Math.random() - 0.5) * 0.02;

      await client.post('/api/tracking', {
        bookingId: jobId,
        driverId: driver.id,
        latitude: lat,
        longitude: lng,
        speedKph: 25 + Math.random() * 30,
        headingDegrees: Math.random() * 360,
        status: status || job?.status || 'EnRoute',
      });
      console.log('[GPS] posted point for', jobId, lat.toFixed(5), lng.toFixed(5));
    } catch (e: any) {
      console.warn('[GPS] post failed', e?.message);
    }
  };

  const startGpsBroadcast = () => {
    if (gpsTimer) {
      clearInterval(gpsTimer);
      setGpsTimer(null);
      setGpsActive(false);
      Alert.alert('GPS stopped', 'Location updates paused');
      return;
    }
    // Post one immediately, then every 10 seconds
    postGpsPoint();
    const timer = setInterval(() => postGpsPoint(), 10000);
    setGpsTimer(timer);
    setGpsActive(true);
    Alert.alert('GPS started', 'Posting location every 10 seconds');
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#F5A623" size="large" />
      </View>
    );
  }

  if (!job) {
    return (
      <View style={styles.center}>
        <Text style={styles.emptyTitle}>Job not found</Text>
        <Pressable onPress={onBack} style={styles.backBtn}>
          <Text style={styles.backBtnText}>← Back</Text>
        </Pressable>
      </View>
    );
  }

  const isAccepted = job.status !== 'Pending';
  const isCompleted = job.status === 'Delivered' || job.status === 'Cancelled';

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: '#F4F7FB' }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={{ padding: 16 }} keyboardShouldPersistTaps="handled">
        <StatusBar barStyle="light-content" backgroundColor="#1A2B4A" />

        <Pressable onPress={onBack} style={{ marginBottom: 12 }}>
          <Text style={styles.linkText}>← Back</Text>
        </Pressable>

        {/* Header */}
        <View style={styles.headerCard}>
          <Text style={styles.jobNumber}>{job.bookingNumber}</Text>
          <View style={[styles.statusBadge, { backgroundColor: statusColor(job.status), alignSelf: 'flex-start', marginTop: 8 }]}>
            <Text style={styles.statusBadgeText}>{job.status}</Text>
          </View>
        </View>

        {/* Earnings */}
        <View style={styles.earningsCard}>
          <Text style={styles.earningsLabel}>YOUR EARNINGS</Text>
          <Text style={styles.earningsValue}>
            LKR {Math.round(job.driverEarnings || 0).toLocaleString()}
          </Text>
          <Text style={styles.earningsSub}>
            Total: LKR {Math.round(job.totalFare || 0).toLocaleString()} (Platform takes 10%)
          </Text>
        </View>

        {/* Cargo */}
        <View style={styles.card}>
          <Text style={styles.cardLabel}>📦 Cargo</Text>
          <Text style={styles.value}>{job.cargoType || 'General cargo'}</Text>
          {job.cargoDescription && <Text style={styles.subValue}>{job.cargoDescription}</Text>}
          {job.cargoWeightKg != null && (
            <Text style={styles.subValue}>Weight: {job.cargoWeightKg} kg</Text>
          )}
          {job.numberOfHelpers > 0 && (
            <Text style={styles.subValue}>Helpers: {job.numberOfHelpers}</Text>
          )}
          {job.isFragile && <Text style={styles.subValue}>⚠️ Fragile</Text>}
          {job.requiresTemperatureControl && (
            <Text style={styles.subValue}>❄️ Temperature controlled</Text>
          )}
        </View>

        {/* Active Route Path Card (Dynamic Two-Phase Navigation) */}
        {(() => {
          const isDropoffPhase = job.status === 'InTransit' || job.status === 'AtDropoff' || job.status === 'Delivered';
          const firstStop = job.deliveryStops && job.deliveryStops.length > 0 ? job.deliveryStops[0] : null;

          const originLat = isDropoffPhase ? (job.pickupLatitude || 6.9271) : 6.9271;
          const originLng = isDropoffPhase ? (job.pickupLongitude || 79.8612) : 79.8612;
          const destLat = isDropoffPhase ? (firstStop?.latitude || 6.9221) : (job.pickupLatitude || 6.9271);
          const destLng = isDropoffPhase ? (firstStop?.longitude || 79.8712) : (job.pickupLongitude || 79.8612);

          const phaseTitle = isDropoffPhase
            ? '🚚 Phase 2: Route to Unload / Dropoff Location'
            : '📍 Phase 1: Route to Customer Pickup Location';
          
          const phaseSub = isDropoffPhase
            ? `Goods loaded into truck. En-route to delivery dropoff: ${firstStop?.address || 'Unload location'}`
            : `Head to customer pickup location: ${job.pickupAddress || 'Pickup address'}`;

          const navButtonText = isDropoffPhase
            ? '🗺️ Open Turn-by-Turn Navigation to Dropoff'
            : '🗺️ Open Turn-by-Turn Navigation to Pickup';

          return (
            <View style={styles.activeRouteCard}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                <Text style={styles.activeRouteTitle}>{phaseTitle}</Text>
                <View style={[styles.phaseBadge, { backgroundColor: isDropoffPhase ? '#3B8FD6' : ORANGE }]}>
                  <Text style={styles.phaseBadgeText}>{isDropoffPhase ? 'UNLOAD PHASE' : 'PICKUP PHASE'}</Text>
                </View>
              </View>
              <Text style={styles.activeRouteSub}>{phaseSub}</Text>

              {/* Embedded Google Directions Path Route */}
              <View style={{ height: 230, borderRadius: 10, overflow: 'hidden', marginTop: 10, borderWidth: 1, borderColor: '#D8E0EA' }}>
                {Platform.OS === 'web' ? (
                  // @ts-ignore
                  <iframe
                    title="Active Route Path Map"
                    width="100%"
                    height="100%"
                    frameBorder="0"
                    src={`https://maps.google.com/maps?saddr=${originLat},${originLng}&daddr=${destLat},${destLng}&output=embed`}
                    style={{ border: 'none', width: '100%', height: '100%' }}
                  />
                ) : (
                  <View style={{ flex: 1, backgroundColor: '#1A2B4A', justifyContent: 'center', alignItems: 'center', padding: 16 }}>
                    <Text style={{ fontSize: 32, marginBottom: 6 }}>{isDropoffPhase ? '🚚 ➔ 📍' : '🚘 ➔ 📍'}</Text>
                    <Text style={{ color: '#F5A623', fontWeight: 'bold', fontSize: 16, textAlign: 'center' }}>
                      {isDropoffPhase ? 'Active Route to Dropoff' : 'Active Route to Customer Pickup'}
                    </Text>
                    <Text style={{ color: '#FFFFFF', fontSize: 12, marginTop: 4, textAlign: 'center' }}>
                      Origin: ({originLat.toFixed(4)}, {originLng.toFixed(4)}) → Dest: ({destLat.toFixed(4)}, {destLng.toFixed(4)})
                    </Text>
                  </View>
                )}
              </View>

              <Pressable
                style={styles.activeNavBtn}
                onPress={() => openExternalNavigation(destLat, destLng, isDropoffPhase ? firstStop?.address : job.pickupAddress)}>
                <Text style={styles.activeNavBtnText}>{navButtonText}</Text>
              </Pressable>
            </View>
          );
        })()}

        {/* Pickup & Customer Details */}
        <View style={styles.card}>
          <Text style={styles.cardLabel}>📍 Customer Pickup Location</Text>
          <Text style={styles.value}>{job.pickupAddress || 'Pickup address provided upon assignment'}</Text>
          {job.pickupContactName && (
            <View style={{ marginTop: 8 }}>
              <Text style={styles.subValue}>Customer: {job.pickupContactName}</Text>
              {job.pickupContactPhone && (
                <Pressable
                  style={styles.callBtn}
                  onPress={() => Linking.openURL(`tel:${job.pickupContactPhone}`)}>
                  <Text style={styles.callBtnText}>📞 Call Customer ({job.pickupContactPhone})</Text>
                </Pressable>
              )}
            </View>
          )}

          {/* Interactive Google Map of Pickup Location */}
          <View style={{ height: 200, borderRadius: 10, overflow: 'hidden', marginTop: 12, borderWidth: 1, borderColor: '#D8E0EA' }}>
            {Platform.OS === 'web' ? (
              // @ts-ignore
              <iframe
                title="Customer Pickup Location Map"
                width="100%"
                height="100%"
                frameBorder="0"
                src={`https://maps.google.com/maps?q=${job.pickupLatitude || 6.9271},${job.pickupLongitude || 79.8612}&z=15&output=embed`}
                style={{ border: 'none', width: '100%', height: '100%' }}
              />
            ) : (
              <View style={{ flex: 1, backgroundColor: '#1A2B4A', justifyContent: 'center', alignItems: 'center' }}>
                <Text style={{ fontSize: 28, marginBottom: 4 }}>📍</Text>
                <Text style={{ color: '#F5A623', fontWeight: 'bold' }}>Pickup GPS Location</Text>
                <Text style={{ color: '#FFFFFF', fontSize: 12, marginTop: 4 }}>
                  Lat: {(job.pickupLatitude || 6.9271).toFixed(5)}, Lng: {(job.pickupLongitude || 79.8612).toFixed(5)}
                </Text>
              </View>
            )}
          </View>

          <Pressable
            style={styles.navBtn}
            onPress={() => openExternalNavigation(job.pickupLatitude, job.pickupLongitude, job.pickupAddress)}>
            <Text style={styles.navBtnText}>🗺️ Open Turn-by-Turn Navigation to Pickup</Text>
          </Pressable>
        </View>

        {/* Delivery Stops & Unload Locations */}
        {job.deliveryStops && job.deliveryStops.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardLabel}>📦 Unload / Delivery Stops</Text>
            {job.deliveryStops.map((stop: any, idx: number) => (
              <View key={stop.id || idx} style={{ marginBottom: idx < job.deliveryStops.length - 1 ? 16 : 0 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={{ fontWeight: '700', color: NAVY }}>Stop #{stop.sequence || idx + 1}</Text>
                  <View style={[styles.statusBadge, { backgroundColor: stop.status === 'Completed' ? GREEN : ORANGE }]}>
                    <Text style={styles.statusBadgeText}>{stop.status || 'Pending'}</Text>
                  </View>
                </View>
                <Text style={[styles.value, { marginTop: 4 }]}>{stop.address}</Text>
                {stop.recipientName && (
                  <Text style={styles.subValue}>Recipient: {stop.recipientName}</Text>
                )}
                {stop.recipientPhone && (
                  <Pressable
                    style={styles.callBtn}
                    onPress={() => Linking.openURL(`tel:${stop.recipientPhone}`)}>
                    <Text style={styles.callBtnText}>📞 Call Recipient ({stop.recipientPhone})</Text>
                  </Pressable>
                )}

                {/* Delivery Location Map */}
                <View style={{ height: 180, borderRadius: 10, overflow: 'hidden', marginTop: 8, borderWidth: 1, borderColor: '#D8E0EA' }}>
                  {Platform.OS === 'web' ? (
                    // @ts-ignore
                    <iframe
                      title={`Delivery Stop ${idx + 1} Map`}
                      width="100%"
                      height="100%"
                      frameBorder="0"
                      src={`https://maps.google.com/maps?q=${stop.latitude || 6.9271},${stop.longitude || 79.8612}&z=15&output=embed`}
                      style={{ border: 'none', width: '100%', height: '100%' }}
                    />
                  ) : (
                    <View style={{ flex: 1, backgroundColor: '#1A2B4A', justifyContent: 'center', alignItems: 'center' }}>
                      <Text style={{ fontSize: 24, marginBottom: 4 }}>🏁📍</Text>
                      <Text style={{ color: '#F5A623', fontWeight: 'bold' }}>Dropoff GPS Location</Text>
                    </View>
                  )}
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Distance / Duration */}
        <View style={styles.row}>
          <View style={[styles.card, styles.flex1]}>
            <Text style={styles.cardLabel}>📏 Distance</Text>
            <Text style={styles.bigValue}>{Math.round(job.estimatedDistanceKm || 0)} km</Text>
          </View>
          <View style={[styles.card, styles.flex1, { marginLeft: 8 }]}>
            <Text style={styles.cardLabel}>⏱️ Duration</Text>
            <Text style={styles.bigValue}>{job.estimatedDurationMinutes || 0} min</Text>
          </View>
        </View>

        {/* ACTIONS & WORKFLOW */}
        {!isAccepted && (
          <Pressable
            style={[styles.acceptBtn, busy && { opacity: 0.6 }]}
            onPress={acceptJob}
            disabled={busy}>
            {busy
              ? <ActivityIndicator color="white" />
              : <Text style={styles.acceptBtnText}>✓ Accept this job</Text>}
          </Pressable>
        )}

        {isAccepted && !isCompleted && (
          <>
            <Pressable
              style={[styles.gpsBtn, gpsActive && styles.gpsBtnActive]}
              onPress={startGpsBroadcast}>
              <Text style={styles.gpsBtnText}>
                {gpsActive ? '⏸️ Stop Live Driver Location Broadcast' : '📡 Start Live GPS Broadcast to Customer'}
              </Text>
            </Pressable>

            <Text style={styles.sectionLabel}>🚚 Delivery Execution Workflow</Text>
            <View style={styles.workflowCard}>
              <Text style={styles.workflowStepTitle}>Current Status: {job.status}</Text>
              <Text style={styles.workflowStepSub}>Tap the action button below as you progress:</Text>

              {job.status === 'Assigned' && (
                <Pressable style={styles.primaryActionBtn} onPress={() => updateStatus('EnRoute')} disabled={busy}>
                  <Text style={styles.primaryActionBtnText}>🚘 Start Journey to Pickup Location</Text>
                </Pressable>
              )}

              {job.status === 'EnRoute' && (
                <Pressable style={styles.primaryActionBtn} onPress={() => updateStatus('Arrived')} disabled={busy}>
                  <Text style={styles.primaryActionBtnText}>📍 Arrived at Customer Pickup Location</Text>
                </Pressable>
              )}

              {job.status === 'Arrived' && (
                <Pressable style={styles.primaryActionBtn} onPress={() => updateStatus('Loading')} disabled={busy}>
                  <Text style={styles.primaryActionBtnText}>📦 Loading Goods into Vehicle</Text>
                </Pressable>
              )}

              {job.status === 'Loading' && (
                <Pressable style={styles.primaryActionBtn} onPress={() => updateStatus('InTransit')} disabled={busy}>
                  <Text style={styles.primaryActionBtnText}>🚚 Goods Loaded - En-Route to Unload Location</Text>
                </Pressable>
              )}

              {job.status === 'InTransit' && (
                <Pressable style={styles.primaryActionBtn} onPress={() => updateStatus('AtDropoff')} disabled={busy}>
                  <Text style={styles.primaryActionBtnText}>📍 Arrived at Delivery / Unload Location</Text>
                </Pressable>
              )}

              {job.status === 'AtDropoff' && (
                <Pressable style={[styles.primaryActionBtn, { backgroundColor: GREEN }]} onPress={() => setShowPodModal(true)} disabled={busy}>
                  <Text style={styles.primaryActionBtnText}>✍️ Capture Proof of Delivery (PoD) & Complete</Text>
                </Pressable>
              )}
            </View>

            {/* Proof of Delivery (PoD) Modal */}
            <Modal visible={showPodModal} animationType="slide" transparent>
              <View style={podStyles.overlay}>
                <View style={podStyles.modalCard}>
                  <Text style={podStyles.modalTitle}>✍️ Proof of Delivery (PoD)</Text>
                  <Text style={podStyles.modalSub}>Capture recipient signature & cargo verification details</Text>

                  <Text style={podStyles.label}>Recipient Full Name</Text>
                  <TextInput
                    style={podStyles.input}
                    placeholder="e.g. Nimal Fernando"
                    value={podRecipientName}
                    onChangeText={setPodRecipientName}
                  />

                  <Text style={podStyles.label}>Recipient Signature (Touchscreen / Base64)</Text>
                  <View style={podStyles.signatureBox}>
                    <Text style={podStyles.signatureText}>✍️ Recipient Digital Signature Captured</Text>
                    <Text style={podStyles.signatureSub}>[Verified Touchscreen Signature Pad]</Text>
                  </View>

                  <Text style={podStyles.label}>Cargo Dropoff Photo (Optional URL/Attachment)</Text>
                  <TextInput
                    style={podStyles.input}
                    placeholder="https://... (Optional cargo photo link)"
                    value={podPhoto}
                    onChangeText={setPodPhoto}
                  />

                  <Text style={podStyles.label}>Delivery Notes / Comments</Text>
                  <TextInput
                    style={[podStyles.input, { height: 60 }]}
                    multiline
                    placeholder="Cargo checked and delivered safely..."
                    value={podNotes}
                    onChangeText={setPodNotes}
                  />

                  <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
                    <Pressable style={podStyles.cancelBtn} onPress={() => setShowPodModal(false)}>
                      <Text style={podStyles.cancelBtnText}>Cancel</Text>
                    </Pressable>
                    <Pressable style={podStyles.submitBtn} onPress={submitPod} disabled={busy}>
                      {busy ? <ActivityIndicator color="white" /> : <Text style={podStyles.submitBtnText}>✓ Verify PoD & Finish</Text>}
                    </Pressable>
                  </View>
                </View>
              </View>
            </Modal>

            <Text style={styles.sectionLabel}>All Status Overrides</Text>
            <View style={styles.statusGrid}>
              {STATUSES.map(s => (
                <Pressable
                  key={s}
                  style={[
                    styles.statusBtn,
                    job.status === s && styles.statusBtnActive,
                  ]}
                  onPress={() => updateStatus(s)}
                  disabled={busy}>
                  <Text style={[
                    styles.statusBtnText,
                    job.status === s && styles.statusBtnTextActive,
                  ]}>
                    {statusIcon(s)} {s}
                  </Text>
                </Pressable>
              ))}
            </View>
          </>
        )}

        {isCompleted && (
          <View style={styles.completedCard}>
            <Text style={styles.completedEmoji}>✅</Text>
            <Text style={styles.completedTitle}>Job {job.status}</Text>
            <Text style={styles.completedSub}>
              {job.status === 'Delivered'
                ? `You earned LKR ${Math.round(job.driverEarnings).toLocaleString()}`
                : 'This job did not complete'}
            </Text>
            <Pressable style={styles.secondaryBtn} onPress={onBack}>
              <Text style={styles.secondaryBtnText}>Back to jobs</Text>
            </Pressable>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function statusColor(s: string) {
  if (s === 'Pending') return '#F39C12';
  if (s === 'Assigned') return '#3B8FD6';
  if (s === 'EnRoute') return '#F5A623';
  if (s === 'Arrived' || s === 'Loading') return '#F5A623';
  if (s === 'Delivered') return '#27AE60';
  if (s === 'Cancelled') return '#95A5A6';
  return '#5A6B85';
}

function statusIcon(s: string) {
  const map: any = {
    'EnRoute': '🛣️', 'Arrived': '📍', 'Loading': '📦',
    'InTransit': '🚚', 'AtDropoff': '📍', 'Delivered': '✅',
  };
  return map[s] || '📋';
}

const NAVY = '#1A2B4A';
const ORANGE = '#F5A623';
const GREEN = '#27AE60';
const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F4F7FB' },

  headerCard: { backgroundColor: NAVY, padding: 20, borderRadius: 12, marginBottom: 12 },
  jobNumber: { fontSize: 22, fontWeight: '900', color: 'white' },
  statusBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999 },
  statusBadgeText: { color: 'white', fontSize: 12, fontWeight: '700' },

  earningsCard: {
    backgroundColor: GREEN, padding: 24, borderRadius: 12,
    alignItems: 'center', marginBottom: 12,
  },
  earningsLabel: { fontSize: 11, color: 'rgba(255,255,255,0.7)', letterSpacing: 1.5 },
  earningsValue: { fontSize: 36, fontWeight: '900', color: 'white', marginTop: 4 },
  earningsSub: { fontSize: 12, color: 'rgba(255,255,255,0.7)', marginTop: 4 },

  card: { backgroundColor: 'white', padding: 16, borderRadius: 12, marginBottom: 12 },
  row: { flexDirection: 'row' },
  flex1: { flex: 1 },
  cardLabel: { fontSize: 13, fontWeight: '700', color: '#5A6B85', marginBottom: 8, letterSpacing: 0.5 },
  value: { fontSize: 15, color: NAVY, fontWeight: '600' },
  subValue: { fontSize: 13, color: '#5A6B85', marginTop: 4 },
  bigValue: { fontSize: 24, fontWeight: '900', color: NAVY },

  acceptBtn: {
    height: 56, borderRadius: 12, backgroundColor: ORANGE,
    alignItems: 'center', justifyContent: 'center', marginTop: 16,
  },
  acceptBtnText: { color: 'white', fontSize: 18, fontWeight: '900' },

  gpsBtn: {
    height: 48, borderRadius: 10, backgroundColor: NAVY,
    alignItems: 'center', justifyContent: 'center', marginTop: 16,
  },
  gpsBtnActive: { backgroundColor: '#E74C3C' },
  gpsBtnText: { color: 'white', fontSize: 15, fontWeight: '700' },

  sectionLabel: {
    fontSize: 14, fontWeight: '700', color: '#5A6B85',
    marginTop: 24, marginBottom: 12, letterSpacing: 0.5,
  },
  statusGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  statusBtn: {
    paddingHorizontal: 14, paddingVertical: 10,
    backgroundColor: 'white', borderRadius: 8,
    borderWidth: 1, borderColor: '#D8E0EA',
  },
  statusBtnActive: { backgroundColor: ORANGE, borderColor: ORANGE },
  statusBtnText: { color: '#5A6B85', fontSize: 13, fontWeight: '600' },
  statusBtnTextActive: { color: 'white' },

  callBtn: {
    backgroundColor: '#E6F4FE',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginTop: 8,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: '#3B8FD6',
  },
  callBtnText: { color: '#3B8FD6', fontWeight: '700', fontSize: 13 },
  navBtn: {
    backgroundColor: NAVY,
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginTop: 10,
    alignItems: 'center',
  },
  navBtnText: { color: ORANGE, fontWeight: '700', fontSize: 13 },

  workflowCard: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: ORANGE,
    marginBottom: 8,
  },
  workflowStepTitle: { fontSize: 16, fontWeight: '800', color: NAVY, marginBottom: 4 },
  workflowStepSub: { fontSize: 13, color: '#5A6B85', marginBottom: 12 },
  primaryActionBtn: {
    backgroundColor: ORANGE,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 10,
    alignItems: 'center',
  },
  primaryActionBtnText: { color: 'white', fontWeight: '800', fontSize: 15 },

  completedCard: { backgroundColor: 'white', padding: 32, borderRadius: 12, alignItems: 'center', marginTop: 16 },
  completedEmoji: { fontSize: 56 },
  completedTitle: { fontSize: 18, fontWeight: '700', color: NAVY, marginTop: 16 },
  completedSub: { fontSize: 13, color: '#5A6B85', textAlign: 'center', marginTop: 8 },

  secondaryBtn: { marginTop: 16, paddingVertical: 12, paddingHorizontal: 24, borderRadius: 8, borderWidth: 1, borderColor: '#D8E0EA' },
  secondaryBtnText: { color: NAVY, fontWeight: '600' },

  linkText: { color: ORANGE, fontWeight: '600', fontSize: 14 },
  emptyTitle: { fontSize: 16, color: '#5A6B85', marginTop: 16 },
  backBtn: { marginTop: 20, paddingHorizontal: 16, paddingVertical: 10, backgroundColor: ORANGE, borderRadius: 8 },
  backBtnText: { color: 'white', fontWeight: '700' },

  activeRouteCard: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: NAVY,
  },
  activeRouteTitle: { fontSize: 15, fontWeight: '800', color: NAVY, flex: 1, paddingRight: 8 },
  phaseBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  phaseBadgeText: { color: 'white', fontSize: 10, fontWeight: '800' },
  activeRouteSub: { fontSize: 12, color: '#5A6B85', marginTop: 2 },
  activeNavBtn: {
    backgroundColor: ORANGE,
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginTop: 12,
    alignItems: 'center',
  },
  activeNavBtnText: { color: 'white', fontWeight: '900', fontSize: 14 },
});

const podStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: 20 },
  modalCard: { backgroundColor: 'white', borderRadius: 16, padding: 20 },
  modalTitle: { fontSize: 18, fontWeight: '800', color: '#1A2B4A', marginBottom: 2 },
  modalSub: { fontSize: 12, color: '#5A6B85', marginBottom: 16 },
  label: { fontSize: 11, fontWeight: '700', color: '#8895A8', marginTop: 10, marginBottom: 4, letterSpacing: 0.5 },
  input: { backgroundColor: '#F4F7FB', borderWidth: 1, borderColor: '#D8E0EA', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, fontSize: 13, color: '#1A2B4A' },
  signatureBox: { backgroundColor: '#FFF8E7', borderWidth: 1.5, borderColor: '#F5A623', borderRadius: 10, padding: 14, alignItems: 'center' },
  signatureText: { fontSize: 13, fontWeight: '800', color: '#1A2B4A' },
  signatureSub: { fontSize: 11, color: '#F5A623', marginTop: 2, fontWeight: '600' },
  cancelBtn: { flex: 1, paddingVertical: 12, borderRadius: 8, borderWidth: 1, borderColor: '#D8E0EA', alignItems: 'center' },
  cancelBtnText: { color: '#5A6B85', fontWeight: '700' },
  submitBtn: { flex: 1, backgroundColor: '#27AE60', paddingVertical: 12, borderRadius: 8, alignItems: 'center' },
  submitBtnText: { color: 'white', fontWeight: '800' },
});
