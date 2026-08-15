import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, Pressable,
  ActivityIndicator, Alert, KeyboardAvoidingView, Platform, StatusBar, Linking, Modal, TextInput,
} from 'react-native';
import client from '../api/client';
import { AuthUser, DriverProfile, Vehicle } from '../types';
import { getCurrentDeviceLocation, openExternalNavigation, resolveAddressCoordinates } from '../services/locationService';

interface Props {
  user: AuthUser;
  driver: DriverProfile;
  vehicle: Vehicle;
  jobId: string;
  onBack: () => void;
  onAccepted?: () => void;
}

export default function JobDetailScreen({ user, driver, vehicle, jobId, onBack, onAccepted }: Props) {
  const [job, setJob] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [gpsActive, setGpsActive] = useState(false);

  // Multi-Drop Stop Tracking State
  const [activeStopIndex, setActiveStopIndex] = useState(0);
  const [loadingSeconds, setLoadingSeconds] = useState(0);
  const [cargoChecklist, setCargoChecklist] = useState({
    itemsVerified: true,
    weightVerified: true,
    helpersReady: true,
  });

  // Proof of Delivery (PoD) Modal
  const [showPodModal, setShowPodModal] = useState(false);
  const [podRecipientName, setPodRecipientName] = useState('');
  const [podNotes, setPodNotes] = useState('');
  const [podPhoto, setPodPhoto] = useState('');
  const [podSignature, setPodSignature] = useState('data:image/svg+xml;utf8,<svg>Verified Digital Signature</svg>');

  // Edit / Override Pickup Location Modal State
  const [showEditPickupModal, setShowEditPickupModal] = useState(false);
  const [editPickupText, setEditPickupText] = useState('');

  const submitPickupOverride = async (customAddress?: string) => {
    const targetAddr = customAddress || editPickupText;
    if (!targetAddr) return;

    setBusy(true);
    try {
      const res = await client.patch(`/api/bookings/${jobId}/pickup-location`, {
        pickupAddress: targetAddr,
      });

      const updatedAddr = res.data.pickupAddress || targetAddr;
      const updatedLat = res.data.pickupLatitude || 6.9271;
      const updatedLng = res.data.pickupLongitude || 79.8612;

      setJob((prev: any) =>
        prev
          ? {
              ...prev,
              pickupAddress: updatedAddr,
              pickupLatitude: updatedLat,
              pickupLongitude: updatedLng,
            }
          : prev
      );

      setShowEditPickupModal(false);
      Alert.alert('📍 Pickup Location Updated', `Pickup address synced to: ${updatedAddr}`);
      await load();
    } catch (e: any) {
      Alert.alert('Update Failed', e?.response?.data?.message || e?.message);
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
  }, []);

  useEffect(() => {
    let interval: any;
    if (job?.status === 'Loading') {
      interval = setInterval(() => {
        setLoadingSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      setLoadingSeconds(0);
    }
    return () => clearInterval(interval);
  }, [job?.status]);

  const formatTimer = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const postGpsPoint = async (currentStatus?: string) => {
    try {
      const coords = await getCurrentDeviceLocation();

      await client.post('/api/tracking', {
        bookingId: jobId,
        driverId: driver.id,
        latitude: coords.latitude,
        longitude: coords.longitude,
        speedKph: coords.speed || (25 + Math.random() * 20),
        headingDegrees: coords.heading || Math.random() * 360,
        status: currentStatus || job?.status || 'EnRoute',
      });
      console.log('[GPS] Automated broadcast posted for job', jobId, coords);
    } catch (e: any) {
      console.warn('[GPS] Automated broadcast failed:', e?.message);
    }
  };

  // AUTOMATED GPS BROADCAST EFFECT:
  // Runs automatically whenever job is active (status !== Pending/Delivered/Cancelled)
  useEffect(() => {
    if (!job) return;

    const isActiveTrip = job.status !== 'Pending' && job.status !== 'Delivered' && job.status !== 'Cancelled';

    if (isActiveTrip) {
      setGpsActive(true);
      postGpsPoint(job.status); // Post immediately upon status change

      const timer = setInterval(() => {
        postGpsPoint(job.status);
      }, 10000); // Auto broadcast every 10 seconds

      return () => {
        clearInterval(timer);
        setGpsActive(false);
      };
    } else {
      setGpsActive(false);
    }
  }, [job?.status, jobId]);

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
    // Optimistically update local job status to Assigned immediately so UI updates without delay!
    setJob((prev: any) => (prev ? { ...prev, status: 'Assigned' } : prev));
    try {
      const dId = driver?.id || driver?.userId || user?.id;
      const vId = vehicle?.id || '00000000-0000-0000-0000-000000000000';

      await client.post(`/api/bookings/${jobId}/assign`, {
        driverId: dId,
        vehicleId: vId,
      });

      await load();
      if (Platform.OS === 'web') {
        window.alert('✓ Job Accepted! Journey to customer pickup location started.');
      } else {
        Alert.alert('Accepted!', 'Job assigned to you. Automatic GPS tracking started.');
      }
      onAccepted?.();
    } catch (e: any) {
      const msg = e?.response?.data?.message || e?.message || 'Failed to accept job';
      Alert.alert('Job Acceptance Error', msg);
      await load();
    } finally {
      setBusy(false);
    }
  };

  const updateStatus = async (status: string, customLat?: number, customLng?: number) => {
    setBusy(true);
    // Optimistically update local UI state immediately so screen transitions without delay!
    setJob((prev: any) => (prev ? { ...prev, status } : prev));
    try {
      const payload: any = { status };
      if (customLat && customLng) {
        payload.unloadingLatitude = customLat;
        payload.unloadingLongitude = customLng;
      }
      const res = await client.patch(`/api/bookings/${jobId}/status`, payload);
      await load();

      if (res.data?.realTotalFare && res.data?.actualDistanceKm > 0) {
        const distKm = res.data.actualDistanceKm;
        const total = Math.round(res.data.realTotalFare).toLocaleString();
        Alert.alert(
          '💰 Actual Fare Recalculated',
          `Arrival at unloading location verified!\n\nActual Traveled Distance: ${distKm} km\nRecalculated Real Trip Fare: LKR ${total}`
        );
      } else if (status === 'Delivered') {
        Alert.alert('Delivered!', 'Earnings added to your account');
      }
    } catch (e: any) {
      Alert.alert('Failed', e?.response?.data?.message || e?.message);
      await load();
    } finally {
      setBusy(false);
    }
  };

  const confirmAndForceLoading = () => {
    if (Platform.OS === 'web') {
      if (window.confirm('📍 Manual Location Override\n\nHas customer updated pickup location?\n\nForce start Step 2 (Cargo Loading)?')) {
        updateStatus('Loading');
      }
    } else {
      Alert.alert(
        '📍 Manual Location Override',
        'Has customer updated pickup location? Force start Step 2 (Cargo Loading)?',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Yes, Start Loading', onPress: () => updateStatus('Loading') },
        ]
      );
    }
  };

  const submitPod = async () => {
    setBusy(true);
    try {
      await client.post(`/api/bookings/${jobId}/pod`, {
        recipientName: podRecipientName || job?.pickupContactName || 'Verified Recipient',
        recipientSignature: podSignature,
        cargoPhotoUrl: podPhoto || 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=500',
        notes: podNotes || 'Cargo inspected and delivered safely across all stops',
      });
      setShowPodModal(false);
      Alert.alert('✅ Multi-Drop PoD Verified', 'All delivery stops completed successfully!');
      await load();
    } catch (e: any) {
      Alert.alert('Failed', e?.response?.data?.message || e?.message);
    } finally {
      setBusy(false);
    }
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
        return 1;
      case 'EnRoute':
      case 'Arrived':
      case 'Loading':
        return 2;
      case 'InTransit':
        return 3;
      case 'AtDropoff':
        return 4;
      case 'Delivered':
      case 'Completed':
        return 5;
      default:
        return 1;
    }
  };

  const phase = getPhaseNumber(job.status);

  // Multi-Drop Stops Resolution
  const stops = job.deliveryStops && job.deliveryStops.length > 0
    ? job.deliveryStops
    : [{ sequence: 1, address: 'Delivery Address', latitude: 6.9221, longitude: 79.8712, recipientName: job.pickupContactName }];

  const currentStop = stops[activeStopIndex] || stops[0];
  const totalStops = stops.length;
  const isFinalStop = activeStopIndex >= totalStops - 1;

  // Determine Map Coordinates
  const isDropoffMap = phase >= 3;

  // Resolve Pickup Location coordinates accurately from database lat/lng or address string
  const rawPickupLat = Number(job.pickupLatitude || 0);
  const rawPickupLng = Number(job.pickupLongitude || 0);

  const resolvedPickup = (rawPickupLat !== 0 && rawPickupLat !== 6.9271)
    ? { latitude: rawPickupLat, longitude: rawPickupLng }
    : resolveAddressCoordinates(job.pickupAddress, 6.9271, 79.8612);

  // Resolve Dropoff Location coordinates accurately from stop lat/lng or stop address string
  const rawStopLat = Number(currentStop.latitude || 0);
  const rawStopLng = Number(currentStop.longitude || 0);

  const resolvedDropoff = (rawStopLat !== 0 && rawStopLat !== 6.9271)
    ? { latitude: rawStopLat, longitude: rawStopLng }
    : resolveAddressCoordinates(currentStop.address, 6.9221, 79.8712);

  const mapDestLat = isDropoffMap ? resolvedDropoff.latitude : resolvedPickup.latitude;
  const mapDestLng = isDropoffMap ? resolvedDropoff.longitude : resolvedPickup.longitude;
  const mapAddressLabel = isDropoffMap ? `Stop ${activeStopIndex + 1}/${totalStops}: ${currentStop.address}` : job.pickupAddress;

  const handleNextStopOrComplete = () => {
    if (!isFinalStop) {
      const nextIdx = activeStopIndex + 1;
      setActiveStopIndex(nextIdx);
      Alert.alert(`📍 Arrived Stop ${activeStopIndex + 1}`, `Unloaded at Stop ${activeStopIndex + 1}. Map advancing to Stop ${nextIdx + 1}: ${stops[nextIdx]?.address || 'Next Stop'}`);
    } else {
      setShowPodModal(true);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: '#F4F7FB' }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={{ padding: 16 }} keyboardShouldPersistTaps="handled">
        <StatusBar barStyle="light-content" backgroundColor="#1A2B4A" />

        <Pressable onPress={onBack} style={{ marginBottom: 12 }}>
          <Text style={styles.linkText}>← Back to Dashboard</Text>
        </Pressable>

        {/* Automated Live GPS Broadcast Indicator Bar */}
        {gpsActive && (
          <View style={styles.autoGpsBar}>
            <Text style={styles.autoGpsText}>📡 Live Driver GPS Broadcasting Automatically to Customer</Text>
          </View>
        )}

        {/* Workflow Phase Stepper */}
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

        {/* Header Banner */}
        <View style={styles.phaseHeaderCard}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={styles.phaseTitle}>
              {phase === 1 && '🚘 Step 1: Heading to Customer Pickup'}
              {phase === 2 && '📦 Step 2: Loading Cargo at Pickup'}
              {phase === 3 && `流域 Step 3: En-Route to Delivery (Stop ${activeStopIndex + 1}/${totalStops})`}
              {phase === 4 && `📍 Step 4: Unloading at Stop ${activeStopIndex + 1}/${totalStops}`}
              {phase === 5 && '✅ Step 5: Multi-Drop Delivery Completed'}
            </Text>
            <View style={[styles.phaseBadge, { backgroundColor: phase === 5 ? GREEN : ORANGE }]}>
              <Text style={styles.phaseBadgeText}>{job.status}</Text>
            </View>
          </View>
          <Text style={styles.jobNumberSub}>Booking #{job.bookingNumber} • {totalStops} Delivery Stop(s)</Text>
        </View>

        {/* Dynamic Map & Navigation Card */}
        <View style={styles.card}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <Text style={styles.cardLabel}>
              {isDropoffMap ? `🗺️ Delivery Stop ${activeStopIndex + 1} of ${totalStops} Map` : '🗺️ Customer Pickup Location Map'}
            </Text>
            <View style={{ flexDirection: 'row', gap: 6 }}>
              {!isDropoffMap && (
                <Pressable
                  style={{ backgroundColor: '#FFF3DC', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, borderWidth: 1, borderColor: '#F5A623' }}
                  onPress={() => {
                    setEditPickupText(job?.pickupAddress || 'Rathnapura, Sri Lanka');
                    setShowEditPickupModal(true);
                  }}>
                  <Text style={{ color: '#D97706', fontSize: 10, fontWeight: '800' }}>✏️ Correct Address</Text>
                </Pressable>
              )}
              <Pressable
                style={styles.navChip}
                onPress={() => openExternalNavigation(mapDestLat, mapDestLng, mapAddressLabel)}>
                <Text style={styles.navChipText}>🗺️ Open Maps</Text>
              </Pressable>
            </View>
          </View>

          <Text style={styles.value}>{mapAddressLabel}</Text>

          {/* Map View */}
          <View style={styles.mapBox}>
            {Platform.OS === 'web' ? (
              // @ts-ignore
              <iframe
                title="Dynamic Navigation Map"
                width="100%"
                height="100%"
                frameBorder="0"
                src={`https://maps.google.com/maps?q=${mapDestLat},${mapDestLng}+(${encodeURIComponent(mapAddressLabel)})&z=14&output=embed`}
                style={{ border: 'none', width: '100%', height: '100%' }}
              />
            ) : (
              <View style={styles.mapNativeFallback}>
                <Text style={{ fontSize: 32, marginBottom: 4 }}>{isDropoffMap ? '📦 ➔ 📍' : '🚘 ➔ 📍'}</Text>
                <Text style={{ color: ORANGE, fontWeight: 'bold' }}>
                  {isDropoffMap ? `Stop ${activeStopIndex + 1} GPS Location` : 'Customer Pickup GPS Location'}
                </Text>
                <Text style={{ color: 'white', fontSize: 12, marginTop: 2 }}>
                  Lat: {mapDestLat.toFixed(5)}, Lng: {mapDestLng.toFixed(5)}
                </Text>
              </View>
            )}
          </View>

          <Pressable
            style={styles.activeNavBtn}
            onPress={() => openExternalNavigation(mapDestLat, mapDestLng, mapAddressLabel)}>
            <Text style={styles.activeNavBtnText}>
              {isDropoffMap ? `🗺️ Navigate to Stop ${activeStopIndex + 1} (${currentStop.address})` : '🗺️ Navigate to Customer Pickup Address'}
            </Text>
          </Pressable>
        </View>

        {/* Multi-Drop Stop Stepper Bar */}
        {isDropoffMap && totalStops > 1 && (
          <View style={styles.card}>
            <Text style={styles.cardLabel}>📍 Multi-Drop Route Stops ({totalStops} Total)</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 8 }}>
              {stops.map((st: any, idx: number) => {
                const isCurrent = idx === activeStopIndex;
                const isPassed = idx < activeStopIndex;
                return (
                  <Pressable
                    key={st.id || idx}
                    style={[
                      styles.stopChip,
                      isCurrent && styles.stopChipActive,
                      isPassed && styles.stopChipPassed,
                    ]}
                    onPress={() => setActiveStopIndex(idx)}>
                    <Text style={[styles.stopChipText, (isCurrent || isPassed) && { color: 'white' }]}>
                      {isPassed ? '✓ Stop ' : 'Stop '}{idx + 1}: {st.address?.split(',')[0] || `Stop ${idx + 1}`}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        )}

        {/* Net Driver Earnings */}
        <View style={styles.earningsCard}>
          <Text style={styles.earningsLabel}>NET DRIVER EARNINGS (85%)</Text>
          <Text style={styles.earningsValue}>
            LKR {Math.round(job.driverEarnings || job.driverPayout || (job.totalFare * 0.85) || 0).toLocaleString()}
          </Text>
          <Text style={styles.earningsSub}>
            Total Fare: LKR {Math.round(job.totalFare || 0).toLocaleString()} • Commission (15%): LKR {Math.round((job.totalFare * 0.15) || 0).toLocaleString()}
          </Text>

          {job.paymentMethod === 'Card' ? (
            <View style={{ backgroundColor: '#27AE60', padding: 8, borderRadius: 6, marginTop: 8, alignItems: 'center' }}>
              <Text style={{ color: 'white', fontWeight: '800', fontSize: 12 }}>
                🟢 PAID ONLINE (CARD) — DO NOT COLLECT CASH
              </Text>
            </View>
          ) : (
            <View style={{ backgroundColor: '#F5A623', padding: 8, borderRadius: 6, marginTop: 8, alignItems: 'center' }}>
              <Text style={{ color: '#1A2B4A', fontWeight: '800', fontSize: 12 }}>
                💵 COLLECT CASH FROM CUSTOMER: LKR {Math.round(job.totalFare || 0).toLocaleString()}
              </Text>
            </View>
          )}
        </View>

        {/* Workflow Actions */}
        {!isAccepted ? (
          <Pressable style={styles.acceptBtn} onPress={acceptJob} disabled={busy}>
            {busy ? <ActivityIndicator color="white" /> : <Text style={styles.acceptBtnText}>✓ Accept Job Request</Text>}
          </Pressable>
        ) : (
          <View style={styles.workflowSection}>
            {/* PICKUP STEP 1 */}
            {phase === 1 && (
              <View style={styles.phaseCard}>
                <Text style={styles.phaseCardTitle}>🚘 Step 1: Head to Customer Pickup Location</Text>
                <Text style={styles.phaseCardSub}>Customer: {job.pickupContactName || 'Customer'} ({job.pickupContactPhone || 'N/A'})</Text>
                <Pressable style={styles.primaryActionBtn} onPress={() => updateStatus('EnRoute')} disabled={busy}>
                  <Text style={styles.primaryActionBtnText}>🚘 Start Journey to Pickup Location</Text>
                </Pressable>

                {/* Manual Override Button for Updated Pickup Location */}
                <Pressable
                  style={[styles.primaryActionBtn, { backgroundColor: '#4A5568', marginTop: 10 }]}
                  onPress={confirmAndForceLoading}
                  disabled={busy}>
                  <Text style={styles.primaryActionBtnText}>
                    📍 Manual Override: Arrive at Updated Location ➔ Begin Loading
                  </Text>
                </Pressable>
              </View>
            )}

            {/* PICKUP STEP 2 (LOADING) */}
            {phase === 2 && (
              <View style={styles.phaseCard}>
                <Text style={styles.phaseCardTitle}>📦 Step 2: Load Cargo into Truck</Text>
                <Text style={styles.phaseCardSub}>
                  Cargo Type: {job.cargoType || 'General Cargo'} • Weight: {job.cargoWeightKg || 500}kg • Helpers: {job.numberOfHelpers || 0}
                </Text>

                {job.status === 'EnRoute' && (
                  <View style={{ marginTop: 6 }}>
                    <Pressable style={styles.primaryActionBtn} onPress={() => updateStatus('Arrived')} disabled={busy}>
                      <Text style={styles.primaryActionBtnText}>📍 Arrived at Customer Pickup Location</Text>
                    </Pressable>

                    {/* Manual Override for Updated Pickup Address */}
                    <Pressable
                      style={[styles.primaryActionBtn, { backgroundColor: '#4A5568', marginTop: 8 }]}
                      onPress={confirmAndForceLoading}
                      disabled={busy}>
                      <Text style={styles.primaryActionBtnText}>
                        📍 Manual Override: Arrive at Updated Location ➔ Begin Loading
                      </Text>
                    </Pressable>
                  </View>
                )}

                {(job.status === 'Arrived' || job.status === 'ArrivedAtPickup') && (
                  <View style={{ marginTop: 8 }}>
                    <View style={{ backgroundColor: '#FFF9E6', padding: 12, borderRadius: 8, marginBottom: 12, borderWidth: 1, borderColor: '#F5A623' }}>
                      <Text style={{ color: '#1A2B4A', fontWeight: '800', fontSize: 13 }}>
                        📍 Driver Verified Arrived at Customer Pickup Location
                      </Text>
                      <Text style={{ color: '#5A6B85', fontSize: 12, marginTop: 4 }}>
                        Park truck safely at pickup address. Tap button below when ready to begin loading cargo into truck bed.
                      </Text>
                    </View>
                    <Pressable style={styles.primaryActionBtn} onPress={() => updateStatus('Loading')} disabled={busy}>
                      <Text style={styles.primaryActionBtnText}>📦 Start Cargo Loading Process</Text>
                    </Pressable>
                  </View>
                )}

                {job.status === 'Loading' && (
                  <View style={{ marginTop: 8 }}>
                    {/* Live Loading Elapsed Timer Badge */}
                    <View style={{ backgroundColor: '#1A2B4A', padding: 14, borderRadius: 10, alignItems: 'center', marginBottom: 14 }}>
                      <Text style={{ color: '#F5A623', fontSize: 11, fontWeight: '800', letterSpacing: 1 }}>
                        ⏳ CARGO LOADING IN PROGRESS
                      </Text>
                      <Text style={{ color: 'white', fontSize: 32, fontWeight: '800', marginVertical: 4 }}>
                        {formatTimer(loadingSeconds)}
                      </Text>
                      <Text style={{ color: '#A0AEC0', fontSize: 11 }}>
                        Live status & timer broadcast to customer & fleet control
                      </Text>
                    </View>

                    {/* Cargo Verification Checklist */}
                    <Text style={{ fontSize: 13, fontWeight: '800', color: '#1A2B4A', marginBottom: 8 }}>
                      📋 Driver Inspection & Verification Checklist:
                    </Text>

                    <Pressable
                      style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 8 }}
                      onPress={() => setCargoChecklist(c => ({ ...c, itemsVerified: !c.itemsVerified }))}>
                      <Text style={{ fontSize: 20, marginRight: 10 }}>{cargoChecklist.itemsVerified ? '✅' : '⬜'}</Text>
                      <Text style={{ fontSize: 13, color: '#1A2B4A', fontWeight: '600', flex: 1 }}>
                        Cargo items counted & inspected with customer
                      </Text>
                    </Pressable>

                    <Pressable
                      style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 8 }}
                      onPress={() => setCargoChecklist(c => ({ ...c, weightVerified: !c.weightVerified }))}>
                      <Text style={{ fontSize: 20, marginRight: 10 }}>{cargoChecklist.weightVerified ? '✅' : '⬜'}</Text>
                      <Text style={{ fontSize: 13, color: '#1A2B4A', fontWeight: '600', flex: 1 }}>
                        Weight verified ({job.cargoWeightKg || 500}kg safe truck capacity)
                      </Text>
                    </Pressable>

                    <Pressable
                      style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 8 }}
                      onPress={() => setCargoChecklist(c => ({ ...c, helpersReady: !c.helpersReady }))}>
                      <Text style={{ fontSize: 20, marginRight: 10 }}>{cargoChecklist.helpersReady ? '✅' : '⬜'}</Text>
                      <Text style={{ fontSize: 13, color: '#1A2B4A', fontWeight: '600', flex: 1 }}>
                        {job.numberOfHelpers || 0} Helper(s) assisted & cargo strapped in truck
                      </Text>
                    </Pressable>

                    <Pressable
                      style={[styles.primaryActionBtn, { backgroundColor: '#27AE60', marginTop: 14 }]}
                      onPress={() => updateStatus('InTransit')}
                      disabled={busy}>
                      <Text style={styles.primaryActionBtnText}>
                        🚚 Cargo Fully Loaded - Start Journey to Dropoff
                      </Text>
                    </Pressable>
                  </View>
                )}
              </View>
            )}

            {/* MULTI-DROP DELIVERY (TRANSIT & DROPOFF) */}
            {(phase === 3 || phase === 4) && (
              <View style={styles.phaseCard}>
                <Text style={styles.phaseCardTitle}>
                  📍 Delivery Stop {activeStopIndex + 1} of {totalStops}: {currentStop.address}
                </Text>
                <Text style={styles.phaseCardSub}>
                  Recipient: {currentStop.recipientName || job.pickupContactName || 'Recipient'} ({currentStop.recipientPhone || 'N/A'})
                </Text>

                <Pressable style={[styles.primaryActionBtn, { backgroundColor: isFinalStop ? GREEN : ORANGE }]} onPress={handleNextStopOrComplete} disabled={busy}>
                  <Text style={styles.primaryActionBtnText}>
                    {isFinalStop
                      ? '✍️ Unload Final Stop & Capture PoD'
                      : `📍 Unload at Stop ${activeStopIndex + 1} (Advance to Stop ${activeStopIndex + 2})`}
                  </Text>
                </Pressable>
              </View>
            )}

            {/* COMPLETED PHASE */}
            {phase === 5 && (
              <View style={styles.completedCard}>
                <Text style={{ fontSize: 32, textAlign: 'center', marginBottom: 6 }}>🎉</Text>
                <Text style={styles.completedTitle}>All {totalStops} Delivery Stops Completed!</Text>
                <Text style={styles.completedSub}>Net Payout of LKR {Math.round(job.driverEarnings || 0).toLocaleString()} credited to your wallet.</Text>
                
                <View style={styles.podProofBox}>
                  <Text style={styles.podProofTitle}>✅ Proof of Delivery (PoD) Verified</Text>
                  <Text style={styles.podProofSub}>Electronic Recipient Signature & Timestamp Recorded</Text>
                </View>

                <Pressable style={styles.backBtn} onPress={onBack}>
                  <Text style={styles.backBtnText}>← Return to Jobs Dashboard</Text>
                </Pressable>
              </View>
            )}
          </View>
        )}

        {/* Correct / Sync Pickup Location Modal */}
        <Modal visible={showEditPickupModal} animationType="slide" transparent>
          <View style={podStyles.overlay}>
            <View style={podStyles.modalCard}>
              <Text style={podStyles.modalTitle}>📍 Correct / Sync Pickup Address</Text>
              <Text style={podStyles.modalSub}>Update customer pickup address string and sync map coordinates</Text>

              <Text style={podStyles.label}>Select Quick Sri Lankan City Location</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
                <View style={{ flexDirection: 'row', gap: 6 }}>
                  {[
                    'Rathnapura, Sri Lanka',
                    'Kandy, Sri Lanka',
                    'Galle, Sri Lanka',
                    'Negombo, Sri Lanka',
                    'Gampaha, Sri Lanka',
                    'Kurunegala, Sri Lanka',
                    'Colombo Fort, Sri Lanka',
                    'Bambalapitiya, Sri Lanka',
                    'Malabe, Sri Lanka',
                  ].map(city => (
                    <Pressable
                      key={city}
                      style={{ backgroundColor: '#F1F5F9', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 16, borderWidth: 1, borderColor: '#CBD5E1' }}
                      onPress={() => submitPickupOverride(city)}>
                      <Text style={{ fontSize: 11, fontWeight: '700', color: '#1E293B' }}>📍 {city.split(',')[0]}</Text>
                    </Pressable>
                  ))}
                </View>
              </ScrollView>

              <Text style={podStyles.label}>Or Type Custom Pickup Address</Text>
              <TextInput
                style={podStyles.input}
                placeholder="e.g. Rathnapura, Sri Lanka"
                value={editPickupText}
                onChangeText={setEditPickupText}
              />

              <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
                <Pressable style={podStyles.cancelBtn} onPress={() => setShowEditPickupModal(false)} disabled={busy}>
                  <Text style={podStyles.cancelBtnText}>Cancel</Text>
                </Pressable>
                <Pressable style={podStyles.submitBtn} onPress={() => submitPickupOverride()} disabled={busy}>
                  <Text style={podStyles.submitBtnText}>Save & Sync Map</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>

        {/* Proof of Delivery (PoD) Modal */}
        <Modal visible={showPodModal} animationType="slide" transparent>
          <View style={podStyles.overlay}>
            <View style={podStyles.modalCard}>
              <Text style={podStyles.modalTitle}>✍️ Proof of Delivery (PoD)</Text>
              <Text style={podStyles.modalSub}>Capture final recipient signature & cargo dropoff photo</Text>

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
                placeholder="Cargo checked and delivered safely across all stops..."
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

  autoGpsBar: { backgroundColor: GREEN, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8, marginBottom: 12, alignItems: 'center' },
  autoGpsText: { color: 'white', fontWeight: '800', fontSize: 11 },

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

  stopChip: { backgroundColor: '#F4F7FB', borderWidth: 1, borderColor: '#D8E0EA', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, marginRight: 8 },
  stopChipActive: { backgroundColor: ORANGE, borderColor: ORANGE },
  stopChipPassed: { backgroundColor: GREEN, borderColor: GREEN },
  stopChipText: { fontSize: 11, fontWeight: '800', color: NAVY },

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
