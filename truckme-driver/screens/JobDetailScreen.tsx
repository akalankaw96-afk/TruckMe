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
  onAccepted?: () => void;
}

const STATUSES = ['Assigned', 'EnRoute', 'Arrived', 'Loading', 'InTransit', 'AtDropoff', 'Delivered', 'Cancelled'];

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
      await client.post(`/api/bookings/${jobId}/assign`, {
        driverId: driver.id,
        vehicleId: vehicle.id,
      });
      await load();
      onAccepted?.();
      Alert.alert('Accepted!', 'Job assigned to you. Proceed to customer pickup location.');
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

  const postGpsPoint = async (status?: string) => {
    try {
      const baseLat = 6.9271;
      const baseLng = 79.8612;
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
    } catch (e: any) {}
  };

  const startGpsBroadcast = () => {
    if (gpsTimer) {
      clearInterval(gpsTimer);
      setGpsTimer(null);
      setGpsActive(false);
      Alert.alert('GPS stopped', 'Location updates paused');
      return;
    }
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

  // Phase Resolver (1..5)
  const getPhaseNumber = (status: string) => {
    switch (status) {
      case 'Assigned':
      case 'Accepted':
        return 1; // Phase 1: Heading to Pickup
      case 'EnRoute':
      case 'Arrived':
      case 'Loading':
        return 2; // Phase 2: Loading Cargo
      case 'InTransit':
        return 3; // Phase 3: En-Route to Delivery Unload Site
      case 'AtDropoff':
        return 4; // Phase 4: Unloading & Proof of Delivery (PoD)
      case 'Delivered':
      case 'Completed':
        return 5; // Phase 5: Completed
      default:
        return 1;
    }
  };

  const phase = getPhaseNumber(job.status);
  const firstStop = job.deliveryStops && job.deliveryStops.length > 0 ? job.deliveryStops[0] : null;

  // Determine active Map coordinates based on Phase Level
  const isDropoffMap = phase >= 3;
  const mapOriginLat = isDropoffMap ? (job.pickupLatitude || 6.9271) : 6.9271;
  const mapOriginLng = isDropoffMap ? (job.pickupLongitude || 79.8612) : 79.8612;
  const mapDestLat = isDropoffMap ? (firstStop?.latitude || 6.9221) : (job.pickupLatitude || 6.9271);
  const mapDestLng = isDropoffMap ? (firstStop?.longitude || 79.8712) : (job.pickupLongitude || 79.8612);

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: '#F4F7FB' }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={{ padding: 16 }} keyboardShouldPersistTaps="handled">
        <StatusBar barStyle="light-content" backgroundColor="#1A2B4A" />

        <Pressable onPress={onBack} style={{ marginBottom: 12 }}>
          <Text style={styles.linkText}>← Back to Dashboard</Text>
        </Pressable>

        {/* Status Stepper Header */}
        <View style={styles.stepperContainer}>
          {['1. Pickup', '2. Load', '3. Transit', '4. Dropoff', '5. Done'].map((stepLabel, idx) => {
            const stepNum = idx + 1;
            const active = phase === stepNum;
            const completed = phase > stepNum;
            return (
              <View key={stepLabel} style={styles.stepItem}>
                <View style={[styles.stepCircle, active && styles.stepCircleActive, completed && styles.stepCircleDone]}>
                  <Text style={[styles.stepNumText, (active || completed) && { color: 'white' }]}>
                    {completed ? '✓' : stepNum}
                  </Text>
                </View>
                <Text style={[styles.stepLabelText, active && styles.stepLabelActive]}>{stepLabel}</Text>
              </View>
            );
          })}
        </View>

        {/* Phase Header Card */}
        <View style={styles.phaseHeaderCard}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={styles.phaseTitle}>
              {phase === 1 && '🚘 Phase 1: Heading to Customer Pickup'}
              {phase === 2 && '📦 Phase 2: Loading Cargo at Pickup'}
              {phase === 3 && '🛣️ Phase 3: En-Route to Delivery Site'}
              {phase === 4 && '📍 Phase 4: Delivery Unloading & PoD'}
              {phase === 5 && '✅ Phase 5: Delivery Completed'}
            </Text>
            <View style={[styles.phaseBadge, { backgroundColor: phase === 5 ? GREEN : ORANGE }]}>
              <Text style={styles.phaseBadgeText}>{job.status}</Text>
            </View>
          </View>

          <Text style={styles.jobNumberSub}>Booking #{job.bookingNumber}</Text>
        </View>

        {/* Phase Map View */}
        <View style={styles.card}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <Text style={styles.cardLabel}>
              {isDropoffMap ? '🗺️ Delivery Site Map (Unload Location)' : '🗺️ Pickup Location Map'}
            </Text>
            <Pressable
              style={styles.navChip}
              onPress={() => openExternalNavigation(mapDestLat, mapDestLng, isDropoffMap ? firstStop?.address : job.pickupAddress)}>
              <Text style={styles.navChipText}>🗺️ Open Maps</Text>
            </Pressable>
          </View>

          <Text style={styles.value}>
            {isDropoffMap ? (firstStop?.address || 'Delivery Address') : (job.pickupAddress || 'Pickup Address')}
          </Text>

          <View style={styles.mapBox}>
            {Platform.OS === 'web' ? (
              // @ts-ignore
              <iframe
                title="Phase Map"
                width="100%"
                height="100%"
                frameBorder="0"
                src={`https://maps.google.com/maps?q=${mapDestLat},${mapDestLng}&z=15&output=embed`}
                style={{ border: 'none', width: '100%', height: '100%' }}
              />
            ) : (
              <View style={styles.mapNativeFallback}>
                <Text style={{ fontSize: 32, marginBottom: 4 }}>{isDropoffMap ? '📦 ➔ 📍' : '🚘 ➔ 📍'}</Text>
                <Text style={{ color: ORANGE, fontWeight: 'bold' }}>
                  {isDropoffMap ? 'Delivery Stop Coordinates' : 'Customer Pickup Coordinates'}
                </Text>
                <Text style={{ color: 'white', fontSize: 12, marginTop: 2 }}>
                  Lat: {mapDestLat.toFixed(5)}, Lng: {mapDestLng.toFixed(5)}
                </Text>
              </View>
            )}
          </View>

          <Pressable
            style={styles.activeNavBtn}
            onPress={() => openExternalNavigation(mapDestLat, mapDestLng, isDropoffMap ? firstStop?.address : job.pickupAddress)}>
            <Text style={styles.activeNavBtnText}>
              {isDropoffMap ? '🗺️ Turn-by-Turn Navigation to Delivery' : '🗺️ Turn-by-Turn Navigation to Pickup'}
            </Text>
          </Pressable>
        </View>

        {/* Earnings Card */}
        <View style={styles.earningsCard}>
          <Text style={styles.earningsLabel}>NET DRIVER PAYOUT</Text>
          <Text style={styles.earningsValue}>
            LKR {Math.round(job.driverEarnings || 0).toLocaleString()}
          </Text>
          <Text style={styles.earningsSub}>
            Total Fare: LKR {Math.round(job.totalFare || 0).toLocaleString()} • Distance: {Math.round(job.estimatedDistanceKm || 12)} km
          </Text>
        </View>

        {/* Phase-Specific Workflow Details & Action Buttons */}
        {!isAccepted ? (
          <Pressable style={styles.acceptBtn} onPress={acceptJob} disabled={busy}>
            {busy ? <ActivityIndicator color="white" /> : <Text style={styles.acceptBtnText}>✓ Accept Job Request</Text>}
          </Pressable>
        ) : (
          <View style={styles.workflowSection}>
            {/* Live GPS Broadcast Button */}
            {!isCompleted && (
              <Pressable style={[styles.gpsBtn, gpsActive && styles.gpsBtnActive]} onPress={startGpsBroadcast}>
                <Text style={styles.gpsBtnText}>
                  {gpsActive ? '⏸️ Stop GPS Broadcast' : '📡 Start Live GPS Broadcast to Customer'}
                </Text>
              </Pressable>
            )}

            {/* PHASE 1 ACTION */}
            {phase === 1 && (
              <View style={styles.phaseCard}>
                <Text style={styles.phaseCardTitle}>🚘 Phase 1: En-Route to Customer Pickup</Text>
                <Text style={styles.phaseCardSub}>Customer Contact: {job.pickupContactName || 'Customer'} ({job.pickupContactPhone || 'N/A'})</Text>
                <Pressable style={styles.primaryActionBtn} onPress={() => updateStatus('EnRoute')} disabled={busy}>
                  <Text style={styles.primaryActionBtnText}>🚘 Start Journey to Pickup Location</Text>
                </Pressable>
              </View>
            )}

            {/* PHASE 2 ACTION */}
            {phase === 2 && (
              <View style={styles.phaseCard}>
                <Text style={styles.phaseCardTitle}>📦 Phase 2: Loading Cargo at Pickup</Text>
                <Text style={styles.phaseCardSub}>Cargo Specs: {job.cargoType} • Weight: {job.cargoWeightKg || 500}kg • Helpers: {job.numberOfHelpers || 0}</Text>
                {job.status === 'EnRoute' && (
                  <Pressable style={styles.primaryActionBtn} onPress={() => updateStatus('Arrived')} disabled={busy}>
                    <Text style={styles.primaryActionBtnText}>📍 Arrived at Customer Pickup Location</Text>
                  </Pressable>
                )}
                {job.status === 'Arrived' && (
                  <Pressable style={styles.primaryActionBtn} onPress={() => updateStatus('Loading')} disabled={busy}>
                    <Text style={styles.primaryActionBtnText}>📦 Loading Goods into Truck</Text>
                  </Pressable>
                )}
                {job.status === 'Loading' && (
                  <Pressable style={styles.primaryActionBtn} onPress={() => updateStatus('InTransit')} disabled={busy}>
                    <Text style={styles.primaryActionBtnText}>🚚 Goods Loaded - Start Journey to Unload Site</Text>
                  </Pressable>
                )}
              </View>
            )}

            {/* PHASE 3 ACTION */}
            {phase === 3 && (
              <View style={styles.phaseCard}>
                <Text style={styles.phaseCardTitle}>🛣️ Phase 3: En-Route to Unload Location</Text>
                <Text style={styles.phaseCardSub}>Unload Address: {firstStop?.address || 'Delivery location'}</Text>
                <Pressable style={styles.primaryActionBtn} onPress={() => updateStatus('AtDropoff')} disabled={busy}>
                  <Text style={styles.primaryActionBtnText}>📍 Arrived at Delivery / Unload Location</Text>
                </Pressable>
              </View>
            )}

            {/* PHASE 4 ACTION */}
            {phase === 4 && (
              <View style={styles.phaseCard}>
                <Text style={styles.phaseCardTitle}>✍️ Phase 4: Delivery Unloading & PoD Verification</Text>
                <Text style={styles.phaseCardSub}>Recipient: {firstStop?.recipientName || job.pickupContactName || 'Recipient'}</Text>
                <Pressable style={[styles.primaryActionBtn, { backgroundColor: GREEN }]} onPress={() => setShowPodModal(true)} disabled={busy}>
                  <Text style={styles.primaryActionBtnText}>✍️ Capture Proof of Delivery (PoD) & Complete</Text>
                </Pressable>
              </View>
            )}

            {/* PHASE 5 COMPLETED SUMMARY */}
            {phase === 5 && (
              <View style={styles.completedCard}>
                <Text style={{ fontSize: 32, textAlign: 'center', marginBottom: 6 }}>🎉</Text>
                <Text style={styles.completedTitle}>Trip Completed Successfully!</Text>
                <Text style={styles.completedSub}>Net Payout of LKR {Math.round(job.driverEarnings || 0).toLocaleString()} credited to your wallet.</Text>
                
                <View style={styles.podProofBox}>
                  <Text style={styles.podProofTitle}>✅ Proof of Delivery Verified</Text>
                  <Text style={styles.podProofSub}>Electronic Recipient Signature & Timestamp Recorded</Text>
                </View>

                <Pressable style={styles.backBtn} onPress={onBack}>
                  <Text style={styles.backBtnText}>← Return to Jobs Dashboard</Text>
                </Pressable>
              </View>
            )}
          </View>
        )}

        {/* Proof of Delivery (PoD) Modal */}
        <Modal visible={showPodModal} animationType="slide" transparent>
          <View style={podStyles.overlay}>
            <View style={podStyles.modalCard}>
              <Text style={podStyles.modalTitle}>✍️ Proof of Delivery (PoD)</Text>
              <Text style={podStyles.modalSub}>Capture recipient signature & cargo dropoff photo</Text>

              <Text style={podStyles.label}>Recipient Full Name</Text>
              <TextInput
                style={podStyles.input}
                placeholder="e.g. Nimal Fernando"
                value={podRecipientName}
                onChangeText={setPodRecipientName}
              />

              <Text style={podStyles.label}>Recipient Signature (Touchscreen Pad)</Text>
              <View style={podStyles.signatureBox}>
                <Text style={podStyles.signatureText}>✍️ Recipient Digital Signature Captured</Text>
                <Text style={podStyles.signatureSub}>[Verified Touchscreen Signature Pad]</Text>
              </View>

              <Text style={podStyles.label}>Cargo Dropoff Photo URL (Optional)</Text>
              <TextInput
                style={podStyles.input}
                placeholder="https://... (Optional cargo photo)"
                value={podPhoto}
                onChangeText={setPodPhoto}
              />

              <Text style={podStyles.label}>Delivery Notes / Comments</Text>
              <TextInput
                style={[podStyles.input, { height: 50 }]}
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
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const NAVY = '#1A2B4A';
const ORANGE = '#F5A623';
const GREEN = '#27AE60';

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F4F7FB' },
  emptyTitle: { fontSize: 18, color: NAVY, fontWeight: '800' },
  backBtn: { marginTop: 12, backgroundColor: NAVY, paddingVertical: 10, paddingHorizontal: 16, borderRadius: 8, alignItems: 'center' },
  backBtnText: { color: ORANGE, fontWeight: '800' },
  linkText: { color: ORANGE, fontWeight: '800', fontSize: 14 },

  stepperContainer: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: 'white', padding: 12, borderRadius: 12, marginBottom: 12, borderWidth: 1, borderColor: '#D8E0EA' },
  stepItem: { alignItems: 'center', flex: 1 },
  stepCircle: { width: 22, height: 22, borderRadius: 11, backgroundColor: '#E8EDF3', justifyContent: 'center', alignItems: 'center', marginBottom: 2 },
  stepCircleActive: { backgroundColor: ORANGE },
  stepCircleDone: { backgroundColor: GREEN },
  stepNumText: { fontSize: 10, fontWeight: '800', color: '#5A6B85' },
  stepLabelText: { fontSize: 9, color: '#8895A8', fontWeight: '600' },
  stepLabelActive: { color: NAVY, fontWeight: '800' },

  phaseHeaderCard: { backgroundColor: NAVY, padding: 14, borderRadius: 12, marginBottom: 12 },
  phaseTitle: { fontSize: 14, fontWeight: '800', color: 'white', flex: 1 },
  phaseBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  phaseBadgeText: { color: 'white', fontSize: 10, fontWeight: '800' },
  jobNumberSub: { fontSize: 11, color: ORANGE, marginTop: 4, fontWeight: '700' },

  card: { backgroundColor: 'white', borderRadius: 12, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: '#D8E0EA' },
  cardLabel: { fontSize: 12, fontWeight: '800', color: NAVY },
  value: { fontSize: 13, color: '#1A2B4A', marginTop: 2, marginBottom: 8, fontWeight: '600' },
  navChip: { backgroundColor: ORANGE, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  navChipText: { color: 'white', fontSize: 10, fontWeight: '800' },

  mapBox: { height: 200, borderRadius: 10, overflow: 'hidden', borderWidth: 1, borderColor: '#D8E0EA', marginBottom: 10 },
  mapNativeFallback: { flex: 1, backgroundColor: NAVY, justifyContent: 'center', alignItems: 'center', padding: 12 },
  activeNavBtn: { backgroundColor: ORANGE, borderRadius: 8, paddingVertical: 10, alignItems: 'center' },
  activeNavBtnText: { color: 'white', fontWeight: '900', fontSize: 13 },

  earningsCard: { backgroundColor: '#FFF8E7', borderWidth: 1.5, borderColor: ORANGE, borderRadius: 12, padding: 14, marginBottom: 12, alignItems: 'center' },
  earningsLabel: { fontSize: 10, fontWeight: '800', color: '#8895A8', letterSpacing: 0.5 },
  earningsValue: { fontSize: 24, fontWeight: '900', color: NAVY, marginTop: 2 },
  earningsSub: { fontSize: 11, color: '#5A6B85', marginTop: 2 },

  acceptBtn: { backgroundColor: GREEN, paddingVertical: 14, borderRadius: 10, alignItems: 'center' },
  acceptBtnText: { color: 'white', fontWeight: '900', fontSize: 16 },

  workflowSection: { marginTop: 4 },
  gpsBtn: { backgroundColor: NAVY, borderRadius: 8, paddingVertical: 10, alignItems: 'center', marginBottom: 12 },
  gpsBtnActive: { backgroundColor: GREEN },
  gpsBtnText: { color: 'white', fontWeight: '800', fontSize: 12 },

  phaseCard: { backgroundColor: 'white', borderRadius: 12, padding: 14, borderWidth: 1.5, borderColor: NAVY },
  phaseCardTitle: { fontSize: 14, fontWeight: '800', color: NAVY, marginBottom: 4 },
  phaseCardSub: { fontSize: 12, color: '#5A6B85', marginBottom: 12 },
  primaryActionBtn: { backgroundColor: ORANGE, paddingVertical: 12, borderRadius: 8, alignItems: 'center' },
  primaryActionBtnText: { color: 'white', fontWeight: '900', fontSize: 14 },

  completedCard: { backgroundColor: 'white', borderRadius: 12, padding: 18, alignItems: 'center', borderWidth: 1.5, borderColor: GREEN },
  completedTitle: { fontSize: 18, fontWeight: '800', color: NAVY, marginTop: 4 },
  completedSub: { fontSize: 12, color: '#5A6B85', textAlign: 'center', marginTop: 4, marginBottom: 12 },
  podProofBox: { backgroundColor: '#E8F8F0', borderWidth: 1, borderColor: GREEN, borderRadius: 8, padding: 10, width: '100%', alignItems: 'center', marginBottom: 12 },
  podProofTitle: { fontSize: 12, fontWeight: '800', color: GREEN },
  podProofSub: { fontSize: 10, color: '#5A6B85', marginTop: 2 },
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
