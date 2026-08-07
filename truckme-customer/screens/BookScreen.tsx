import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, Pressable,
  ActivityIndicator, TextInput, Switch, Alert, KeyboardAvoidingView, Platform, Modal,
} from 'react-native';
import client from '../api/client';
import { AuthUser, Address, VehicleType } from '../types';
import { GOOGLE_MAPS_API_KEY, POSITIONSTACK_API_KEY } from '../constants/Config';

interface Props {
  user: AuthUser;
  vehicle: VehicleType;
  onBack: () => void;
  onBooked: (bookingId: string, number: string) => void;
}

export interface DeliveryStopInput {
  id: string;
  address: string;
  recipientName: string;
  recipientPhone: string;
  notes?: string;
}

// Sri Lankan city coordinates map for auto distance calculation
const CITY_COORDINATES: Record<string, { lat: number; lng: number }> = {
  colombo: { lat: 6.9271, lng: 79.8612 },
  kandy: { lat: 7.2906, lng: 80.6337 },
  galle: { lat: 6.0535, lng: 80.2210 },
  negombo: { lat: 7.2083, lng: 79.8358 },
  gampaha: { lat: 7.0840, lng: 79.9925 },
  kurunegala: { lat: 7.4863, lng: 80.3647 },
  malabe: { lat: 6.9040, lng: 79.9600 },
  maharagama: { lat: 6.8480, lng: 79.9265 },
  ratnapura: { lat: 6.6828, lng: 80.3992 },
  anuradhapura: { lat: 8.3114, lng: 80.4037 },
  jaffna: { lat: 9.6615, lng: 80.0255 },
  trincomalee: { lat: 8.5874, lng: 81.2152 },
  matara: { lat: 5.9549, lng: 80.5550 },
  bambalapitiya: { lat: 6.8920, lng: 79.8550 },
  kiribathgoda: { lat: 7.0011, lng: 79.9220 },
  kadawatha: { lat: 7.0017, lng: 79.9530 },
};

function resolveCoordinates(addrText: string, defaultLat = 6.9271, defaultLng = 79.8612) {
  if (!addrText) return { lat: defaultLat, lng: defaultLng };
  const lower = addrText.toLowerCase();
  for (const [key, coords] of Object.entries(CITY_COORDINATES)) {
    if (lower.includes(key)) {
      return coords;
    }
  }
  return { lat: defaultLat, lng: defaultLng };
}

// Format helpers
function pad2(n: number): string { return n.toString().padStart(2, '0'); }

function formatDateOnly(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function formatTimeOnly(d: Date): string {
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

function formatDateTime(d: Date): string {
  return `${formatDateOnly(d)} ${formatTimeOnly(d)}`;
}

function parseDateTime(s: string): Date | null {
  if (!s) return null;
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{1,2}):(\d{2})$/);
  if (m) return new Date(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], 0);
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

const TIME_SLOTS = [
  { value: '08:00', label: '8:00 AM' },
  { value: '09:00', label: '9:00 AM' },
  { value: '10:00', label: '10:00 AM' },
  { value: '11:00', label: '11:00 AM' },
  { value: '12:00', label: '12:00 PM' },
  { value: '13:00', label: '1:00 PM' },
  { value: '14:00', label: '2:00 PM' },
  { value: '15:00', label: '3:00 PM' },
  { value: '16:00', label: '4:00 PM' },
  { value: '17:00', label: '5:00 PM' },
  { value: '18:00', label: '6:00 PM' },
  { value: '19:00', label: '7:00 PM' },
  { value: '20:00', label: '8:00 PM' }
];

export default function BookScreen({ user, vehicle, onBack, onBooked }: Props) {
  const defaultPickup = (() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    d.setHours(10, 0, 0, 0);
    return d;
  })();

  const [scheduledDate, setScheduledDate] = useState<Date>(defaultPickup);
  const [dateString, setDateString] = useState<string>(formatDateOnly(defaultPickup));
  const [timeString, setTimeString] = useState<string>(formatTimeOnly(defaultPickup));
  const [textInput, setTextInput] = useState<string>(formatDateTime(defaultPickup));

  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedAddress, setSelectedAddress] = useState<Address | null>(null);
  const [useCustomPickup, setUseCustomPickup] = useState(false);
  const [customPickupAddress, setCustomPickupAddress] = useState('');

  // Multi-stop delivery locations
  const [deliveryStops, setDeliveryStops] = useState<DeliveryStopInput[]>([
    { id: '1', address: '', recipientName: user.fullName || '', recipientPhone: '' }
  ]);

  const [cargoDesc, setCargoDesc] = useState('');
  const [weight, setWeight] = useState('');
  const [helpers, setHelpers] = useState(0);
  const [express, setExpress] = useState(false);

  const [distanceKm, setDistanceKm] = useState('12');
  const [durationMin, setDurationMin] = useState('35');
  const [calculatingRoute, setCalculatingRoute] = useState(false);
  const [routeInfo, setRouteInfo] = useState<any>(null);

  const [estimate, setEstimate] = useState<any>(null);
  const [loadingEstimate, setLoadingEstimate] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [stage, setStage] = useState<'form' | 'estimate'>('form');

  // Map Location Picker Modal State
  const [mapPickerVisible, setMapPickerVisible] = useState(false);
  const [mapPickerTarget, setMapPickerTarget] = useState<'pickup' | string>('pickup');
  const [mapSearchQuery, setMapSearchQuery] = useState('');
  const [mapSelectedLat, setMapSelectedLat] = useState(6.9271);
  const [mapSelectedLng, setMapSelectedLng] = useState(79.8612);
  const [mapAddressText, setMapAddressText] = useState('');
  const [geocodingLoading, setGeocodingLoading] = useState(false);

  const getCurrentUserLocation = () => {
    if (typeof navigator !== 'undefined' && navigator.geolocation) {
      setGeocodingLoading(true);
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setMapSelectedLat(latitude);
          setMapSelectedLng(longitude);
          reverseGeocodeMap(latitude, longitude);
        },
        (error) => {
          console.warn('Geolocation error:', error);
          setGeocodingLoading(false);
          Alert.alert('Location Error', 'Could not retrieve current GPS location. Please check location permissions.');
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    } else {
      Alert.alert('Not Supported', 'Geolocation is not supported on this device.');
    }
  };

  const openMapPicker = (target: 'pickup' | string, currentAddr = '') => {
    setMapPickerTarget(target);
    setMapSearchQuery(currentAddr);
    const coords = resolveCoordinates(currentAddr);
    setMapSelectedLat(coords.lat);
    setMapSelectedLng(coords.lng);
    setMapAddressText(currentAddr || 'Colombo, Sri Lanka');
    setMapPickerVisible(true);

    if (currentAddr && currentAddr.trim()) {
      searchMapLocation(currentAddr);
    }
  };

  const searchMapLocation = async (queryStr: string) => {
    if (!queryStr.trim()) return;
    setGeocodingLoading(true);
    
    // 1st Priority: Backend Geocoding API (Google Maps + Fallback)
    try {
      const res = await client.get(`/api/routes/geocode?address=${encodeURIComponent(queryStr)}`);
      if (res.data?.latitude && res.data?.longitude) {
        setMapSelectedLat(res.data.latitude);
        setMapSelectedLng(res.data.longitude);
        setMapAddressText(res.data.formattedAddress || queryStr);
        setGeocodingLoading(false);
        return;
      }
    } catch (e) {}

    // 2nd Priority: OpenStreetMap Nominatim Free API
    try {
      const osmRes = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(queryStr)}`,
        { headers: { 'User-Agent': 'TruckMe-CustomerApp/1.0' } }
      );
      const osmData = await osmRes.json();
      if (osmData && osmData[0]) {
        const lat = parseFloat(osmData[0].lat);
        const lng = parseFloat(osmData[0].lon);
        if (!isNaN(lat) && !isNaN(lng)) {
          setMapSelectedLat(lat);
          setMapSelectedLng(lng);
          setMapAddressText(osmData[0].display_name || queryStr);
          setGeocodingLoading(false);
          return;
        }
      }
    } catch (err) {
      console.log('OSM search error:', err);
    }

    // 3rd Priority: Local Sri Lankan city coordinate map fallback
    const coords = resolveCoordinates(queryStr);
    setMapSelectedLat(coords.lat);
    setMapSelectedLng(coords.lng);
    setMapAddressText(`${queryStr.charAt(0).toUpperCase() + queryStr.slice(1)}, Sri Lanka`);
    setGeocodingLoading(false);
  };

  const reverseGeocodeMap = async (lat: number, lng: number) => {
    setGeocodingLoading(true);
    // 1st Priority: Backend Reverse Geocoding API (Google Maps + Fallback)
    try {
      const res = await client.get(`/api/routes/reverse-geocode?lat=${lat}&lng=${lng}`);
      if (res.data?.formattedAddress) {
        setMapAddressText(res.data.formattedAddress);
        setGeocodingLoading(false);
        return;
      }
    } catch (e) {}

    // 2nd Priority: OpenStreetMap Nominatim
    try {
      const osmRes = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`,
        { headers: { 'User-Agent': 'TruckMe-CustomerApp/1.0' } }
      );
      const osmData = await osmRes.json();
      if (osmData && osmData.display_name) {
        setMapAddressText(osmData.display_name);
        setGeocodingLoading(false);
        return;
      }
    } catch (e) {}

    setMapAddressText(`${lat.toFixed(4)}, ${lng.toFixed(4)}`);
    setGeocodingLoading(false);
  };

  const selectCityOnMap = (cityName: string, coords: { lat: number; lng: number }) => {
    setMapSelectedLat(coords.lat);
    setMapSelectedLng(coords.lng);
    setMapAddressText(`${cityName.charAt(0).toUpperCase() + cityName.slice(1)}, Sri Lanka`);
  };

  const confirmMapSelection = () => {
    const finalAddress = mapAddressText || `${mapSelectedLat.toFixed(4)}, ${mapSelectedLng.toFixed(4)}`;
    if (mapPickerTarget === 'pickup') {
      setUseCustomPickup(true);
      setCustomPickupAddress(finalAddress);
    } else {
      updateDeliveryStop(mapPickerTarget, 'address', finalAddress);
    }
    setMapPickerVisible(false);
  };

  useEffect(() => {
    (async () => {
      try {
        const res = await client.get(`/api/addresses?userId=${user.id}`);
        const list: Address[] = res.data || [];
        setAddresses(list);
        const def = list.find(a => a.isDefault) || list[0];
        if (def) setSelectedAddress(def);
      } catch (e) { console.warn('addresses load failed', e); }
    })();
  }, []);

  // Calculate distance & estimated duration using backend map optimization engine
  const calculateMapRoute = async () => {
    const pickupAddrStr = useCustomPickup ? customPickupAddress : (selectedAddress?.addressLine1 || '');
    if (!pickupAddrStr) {
      Alert.alert('Pickup address required', 'Please select or enter a pickup address first.');
      return;
    }
    const emptyStop = deliveryStops.find(s => !s.address.trim());
    if (emptyStop) {
      Alert.alert('Delivery address required', 'Please enter delivery address for all stops.');
      return;
    }

    setCalculatingRoute(true);
    try {
      const originCoords = useCustomPickup
        ? resolveCoordinates(customPickupAddress)
        : { lat: selectedAddress?.latitude || 6.9271, lng: selectedAddress?.longitude || 79.8612 };

      const stopsDto = deliveryStops.map((stop, idx) => {
        const coords = resolveCoordinates(stop.address, originCoords.lat + (idx + 1) * 0.05, originCoords.lng + (idx + 1) * 0.05);
        return {
          id: stop.id,
          address: stop.address,
          latitude: coords.lat,
          longitude: coords.lng,
          recipientName: stop.recipientName,
          recipientPhone: stop.recipientPhone,
          sequence: idx + 1
        };
      });

      const res = await client.post('/api/routes/optimize', {
        originLatitude: originCoords.lat,
        originLongitude: originCoords.lng,
        originAddress: pickupAddrStr,
        stops: stopsDto
      });

      if (res.data) {
        const totalDist = res.data.totalDistanceKm || 12;
        const totalDur = res.data.totalDurationMinutes || 35;
        setDistanceKm(totalDist.toString());
        setDurationMin(totalDur.toString());
        setRouteInfo(res.data);
      }
    } catch (e: any) {
      console.warn('Map route calculation fallback:', e?.message);
      // Fallback calculation algorithm
      const originCoords = useCustomPickup
        ? resolveCoordinates(customPickupAddress)
        : { lat: selectedAddress?.latitude || 6.9271, lng: selectedAddress?.longitude || 79.8612 };

      let totalKm = 0;
      let lastLat = originCoords.lat;
      let lastLng = originCoords.lng;

      deliveryStops.forEach((stop, idx) => {
        const c = resolveCoordinates(stop.address, lastLat + 0.04, lastLng + 0.04);
        const dist = Math.sqrt(Math.pow(c.lat - lastLat, 2) + Math.pow(c.lng - lastLng, 2)) * 111 * 1.25;
        totalKm += Math.max(5, dist);
        lastLat = c.lat;
        lastLng = c.lng;
      });

      const calcKm = Math.round(totalKm * 10) / 10;
      const calcDur = Math.ceil((calcKm / 35) * 60) + (deliveryStops.length * 10);
      setDistanceKm(calcKm.toString());
      setDurationMin(calcDur.toString());
      setRouteInfo({
        totalDistanceKm: calcKm,
        totalDurationMinutes: calcDur,
        estimatedFuelSavingsLkr: Math.round(calcKm * 25)
      });
    } finally {
      setCalculatingRoute(false);
    }
  };

  const updatePickedDate = (newDateStr: string) => {
    setDateString(newDateStr);
    const combined = `${newDateStr} ${timeString}`;
    const d = parseDateTime(combined);
    if (d) {
      setScheduledDate(d);
      setTextInput(formatDateTime(d));
    }
  };

  const updatePickedTime = (newTimeStr: string) => {
    setTimeString(newTimeStr);
    const combined = `${dateString} ${newTimeStr}`;
    const d = parseDateTime(combined);
    if (d) {
      setScheduledDate(d);
      setTextInput(formatDateTime(d));
    }
  };

  const onTextChange = (text: string) => {
    setTextInput(text);
    const d = parseDateTime(text);
    if (d) {
      setScheduledDate(d);
      setDateString(formatDateOnly(d));
      setTimeString(formatTimeOnly(d));
    }
  };

  const adjustDate = (days: number) => {
    const d = new Date(scheduledDate);
    d.setDate(d.getDate() + days);
    setScheduledDate(d);
    setDateString(formatDateOnly(d));
    setTimeString(formatTimeOnly(d));
    setTextInput(formatDateTime(d));
  };

  const setPreset = (when: string) => {
    const d = new Date();
    if (when === 'now') {
      d.setMinutes(d.getMinutes() + 30);
    } else if (when === 'tonight') {
      d.setHours(20, 0, 0, 0);
    } else if (when === 'tomorrow_morning') {
      d.setDate(d.getDate() + 1);
      d.setHours(9, 0, 0, 0);
    } else if (when === 'tomorrow_evening') {
      d.setDate(d.getDate() + 1);
      d.setHours(18, 0, 0, 0);
    }
    setScheduledDate(d);
    setDateString(formatDateOnly(d));
    setTimeString(formatTimeOnly(d));
    setTextInput(formatDateTime(d));
  };

  const addDeliveryStop = () => {
    setDeliveryStops(prev => [
      ...prev,
      { id: Date.now().toString(), address: '', recipientName: '', recipientPhone: '' }
    ]);
  };

  const removeDeliveryStop = (id: string) => {
    if (deliveryStops.length <= 1) {
      Alert.alert('Required', 'At least one delivery location is required.');
      return;
    }
    setDeliveryStops(prev => prev.filter(s => s.id !== id));
  };

  const updateDeliveryStop = (id: string, field: keyof DeliveryStopInput, value: string) => {
    setDeliveryStops(prev => prev.map(s => s.id === id ? { ...s, [field]: value } : s));
  };

  const getEstimate = async () => {
    if (!useCustomPickup && !selectedAddress) {
      Alert.alert('Pickup required', 'Select a pickup address or enter a custom one.');
      return;
    }
    if (useCustomPickup && !customPickupAddress.trim()) {
      Alert.alert('Pickup required', 'Enter your custom pickup address.');
      return;
    }

    const invalidStop = deliveryStops.find(s => !s.address.trim());
    if (invalidStop) {
      Alert.alert('Delivery address required', 'Please enter address for all delivery locations.');
      return;
    }

    if (!weight) {
      Alert.alert('Weight required', 'Enter cargo weight');
      return;
    }

    const pickup = parseDateTime(textInput);
    if (!pickup || pickup < new Date()) {
      Alert.alert('Invalid time', 'Pickup time must be in the future');
      return;
    }

    setLoadingEstimate(true);

    // Automatically calculate map route distance & duration
    let calcDistKm = 12;
    let calcDurMin = 35;
    const pickupAddrStr = useCustomPickup ? customPickupAddress : (selectedAddress?.addressLine1 || '');

    try {
      const originCoords = useCustomPickup
        ? resolveCoordinates(customPickupAddress)
        : { lat: selectedAddress?.latitude || 6.9271, lng: selectedAddress?.longitude || 79.8612 };

      const stopsDto = deliveryStops.map((stop, idx) => {
        const coords = resolveCoordinates(stop.address, originCoords.lat + (idx + 1) * 0.05, originCoords.lng + (idx + 1) * 0.05);
        return {
          id: stop.id,
          address: stop.address,
          latitude: coords.lat,
          longitude: coords.lng,
          recipientName: stop.recipientName,
          recipientPhone: stop.recipientPhone,
          sequence: idx + 1
        };
      });

      const routeRes = await client.post('/api/routes/optimize', {
        originLatitude: originCoords.lat,
        originLongitude: originCoords.lng,
        originAddress: pickupAddrStr,
        stops: stopsDto
      });

      if (routeRes.data) {
        calcDistKm = routeRes.data.totalDistanceKm || 12;
        calcDurMin = routeRes.data.totalDurationMinutes || 35;
        setRouteInfo(routeRes.data);
      }
    } catch (e: any) {
      console.warn('Map route calculation fallback:', e?.message);
      const originCoords = useCustomPickup
        ? resolveCoordinates(customPickupAddress)
        : { lat: selectedAddress?.latitude || 6.9271, lng: selectedAddress?.longitude || 79.8612 };

      let totalKm = 0;
      let lastLat = originCoords.lat;
      let lastLng = originCoords.lng;

      deliveryStops.forEach((stop) => {
        const c = resolveCoordinates(stop.address, lastLat + 0.04, lastLng + 0.04);
        const dist = Math.sqrt(Math.pow(c.lat - lastLat, 2) + Math.pow(c.lng - lastLng, 2)) * 111 * 1.25;
        totalKm += Math.max(5, dist);
        lastLat = c.lat;
        lastLng = c.lng;
      });

      calcDistKm = Math.round(totalKm * 10) / 10;
      calcDurMin = Math.ceil((calcDistKm / 35) * 60) + (deliveryStops.length * 10);
      setRouteInfo({
        totalDistanceKm: calcDistKm,
        totalDurationMinutes: calcDurMin,
        estimatedFuelSavingsLkr: Math.round(calcDistKm * 25)
      });
    }

    setDistanceKm(calcDistKm.toString());
    setDurationMin(calcDurMin.toString());

    try {
      const res = await client.post('/api/bookings/estimate', {
        vehicleTypeId: vehicle.id,
        distanceKm: calcDistKm,
        durationMinutes: calcDurMin,
        numberOfHelpers: helpers,
        deliveryStopCount: deliveryStops.length,
        deliveryStops: deliveryStops.map(s => ({
          address: s.address,
          recipientName: s.recipientName,
          recipientPhone: s.recipientPhone,
          notes: s.notes
        })),
        isExpress: express,
        requiresTemperatureControl: vehicle.category?.toLowerCase().includes('temp'),
        discount: 0,
      });
      setEstimate(res.data);
      setStage('estimate');
    } catch (e: any) {
      Alert.alert('Estimate failed', e?.response?.data?.message || e?.message);
    } finally {
      setLoadingEstimate(false);
    }
  };

  const confirmBooking = async () => {
    setSubmitting(true);
    try {
      const pickup = parseDateTime(textInput) || new Date();
      const res = await client.post('/api/bookings', {
        customerUserId: user.id,
        vehicleTypeId: vehicle.id,
        pickupAddressId: selectedAddress?.id || '00000000-0000-0000-0000-000000000000',
        customPickupAddress: useCustomPickup ? customPickupAddress : selectedAddress?.addressLine1,
        scheduledPickupAt: pickup.toISOString(),
        cargoType: 'General',
        cargoDescription: cargoDesc || `${weight}kg shipment`,
        cargoWeightKg: parseFloat(weight),
        numberOfHelpers: helpers,
        isExpress: express,
        estimatedDistanceKm: parseFloat(distanceKm) || 12,
        estimatedDurationMinutes: parseInt(durationMin, 10) || 35,
        discount: 0,
        deliveryStops: deliveryStops.map(s => ({
          address: s.address,
          recipientName: s.recipientName,
          recipientPhone: s.recipientPhone,
          notes: s.notes
        }))
      });
      Alert.alert('Booked!', `Booking ${res.data.booking.bookingNumber} confirmed`);
      onBooked(res.data.booking.id, res.data.booking.bookingNumber);
    } catch (e: any) {
      Alert.alert('Booking failed', e?.response?.data?.message || e?.message);
    } finally {
      setSubmitting(false);
    }
  };

  // ============ ESTIMATE VIEW ============
  if (stage === 'estimate' && estimate) {
    return (
      <KeyboardAvoidingView
        style={{ flex: 1, backgroundColor: '#F4F7FB' }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={{ padding: 20 }}>
          <Text style={styles.title}>Fare estimate</Text>

          <View style={styles.totalCard}>
            <Text style={styles.totalLabel}>ESTIMATED TOTAL</Text>
            <Text style={styles.totalValue}>LKR {Math.round(estimate.total).toLocaleString()}</Text>
            <Text style={styles.totalCurrency}>{estimate.currency}</Text>
            <Text style={styles.pickupSummary}>
              📅 Scheduled: {textInput} ({useCustomPickup ? customPickupAddress : selectedAddress?.label})
            </Text>
            <Text style={styles.stopsSummary}>
              📍 Delivery Locations: {deliveryStops.length} {deliveryStops.length > 1 ? '(Multi-Drop Route)' : 'stop'} • {distanceKm} km ({durationMin} mins)
            </Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardLabel}>Fare breakdown</Text>
            <Row label="Base fare" value={estimate.baseFare} />
            <Row label={`Distance fare (${distanceKm} km)`} value={estimate.distanceFare} />
            {estimate.stopFare > 0 && <Row label={`Multi-drop stops (${deliveryStops.length - 1} extra)`} value={estimate.stopFare} />}
            {estimate.helpersFare > 0 && <Row label="Helpers" value={estimate.helpersFare} />}
            {estimate.expressFare > 0 && <Row label="Express delivery" value={estimate.expressFare} />}
            {estimate.temperatureFare > 0 && <Row label="Refrigeration" value={estimate.temperatureFare} />}
            <Row label="Service fee" value={estimate.serviceFee} />
            <View style={styles.divider} />
            <Row label="Total" value={estimate.total} bold accent />
          </View>

          <View style={styles.card}>
            <Text style={styles.cardLabel}>Route summary ({deliveryStops.length} drop stops)</Text>
            {deliveryStops.map((stop, idx) => (
              <View key={stop.id} style={{ marginBottom: idx < deliveryStops.length - 1 ? 12 : 0 }}>
                <Text style={styles.stopHeading}>Drop #{idx + 1}: {stop.address}</Text>
                {stop.recipientName ? <Text style={styles.stopSub}>Recipient: {stop.recipientName} ({stop.recipientPhone})</Text> : null}
              </View>
            ))}
          </View>

          <Pressable
            style={[styles.confirmBtn, submitting && { opacity: 0.6 }]}
            onPress={confirmBooking}
            disabled={submitting}>
            {submitting
              ? <ActivityIndicator color="white" />
              : <Text style={styles.confirmBtnText}>Confirm booking</Text>}
          </Pressable>

          <Pressable onPress={() => setStage('form')} style={styles.linkBtn}>
            <Text style={styles.linkText}>Back to details</Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  // ============ FORM VIEW ============
  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: '#F4F7FB' }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={{ padding: 20 }} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Book this truck</Text>

        <View style={styles.truckSummary}>
          <View style={styles.truckBadge}>
            <Text style={styles.truckBadgeText}>{vehicle.code}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.truckName}>{vehicle.name}</Text>
            <Text style={styles.truckDesc}>{vehicle.description}</Text>
            <Text style={styles.truckPrice}>
              LKR {vehicle.basePrice.toLocaleString()} + LKR {vehicle.pricePerKm}/km
            </Text>
          </View>
        </View>

        {/* ===== Scheduled Pickup Date & Time Picker ===== */}
        <Text style={styles.sectionHeader}>1. Scheduled Pickup Date & Time</Text>

        <View style={styles.pickerRow}>
          <View style={[styles.pickerBox, { flex: 1, marginRight: 8 }]}>
            <Text style={styles.pickerBoxLabel}>📅 PICKUP DATE</Text>
            {Platform.OS === 'web' ? (
              // @ts-ignore
              <input
                type="date"
                value={dateString}
                onChange={(e: any) => updatePickedDate(e.target.value)}
                style={{
                  border: 'none',
                  outline: 'none',
                  backgroundColor: 'transparent',
                  fontSize: '15px',
                  fontWeight: '600',
                  color: NAVY,
                  marginTop: '4px',
                  cursor: 'pointer',
                  width: '100%'
                }}
              />
            ) : (
              <TextInput
                style={styles.pickerBoxInput}
                value={dateString}
                onChangeText={updatePickedDate}
                placeholder="YYYY-MM-DD"
                placeholderTextColor="#8895A8"
              />
            )}
          </View>

          <View style={[styles.pickerBox, { flex: 1 }]}>
            <Text style={styles.pickerBoxLabel}>⏰ PICKUP TIME</Text>
            {Platform.OS === 'web' ? (
              // @ts-ignore
              <input
                type="time"
                value={timeString}
                onChange={(e: any) => updatePickedTime(e.target.value)}
                style={{
                  border: 'none',
                  outline: 'none',
                  backgroundColor: 'transparent',
                  fontSize: '15px',
                  fontWeight: '600',
                  color: NAVY,
                  marginTop: '4px',
                  cursor: 'pointer',
                  width: '100%'
                }}
              />
            ) : (
              <TextInput
                style={styles.pickerBoxInput}
                value={timeString}
                onChangeText={updatePickedTime}
                placeholder="HH:MM"
                placeholderTextColor="#8895A8"
              />
            )}
          </View>
        </View>

        {/* Time Slot Fast Selector Grid */}
        <Text style={styles.smallLabel}>Select Time Slot:</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
          <View style={{ flexDirection: 'row', gap: 6 }}>
            {TIME_SLOTS.map(slot => (
              <Pressable
                key={slot.value}
                style={[styles.slotChip, timeString === slot.value && styles.slotChipActive]}
                onPress={() => updatePickedTime(slot.value)}>
                <Text style={[styles.slotChipText, timeString === slot.value && styles.slotChipTextActive]}>
                  {slot.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </ScrollView>

        {/* Quick Date Presets */}
        <Text style={styles.smallLabel}>Quick date presets:</Text>
        <View style={styles.presetRow}>
          <Pressable style={styles.presetBtn} onPress={() => setPreset('now')}>
            <Text style={styles.presetBtnText}>In 30 min</Text>
          </Pressable>
          <Pressable style={styles.presetBtn} onPress={() => setPreset('tonight')}>
            <Text style={styles.presetBtnText}>Tonight 8pm</Text>
          </Pressable>
          <Pressable style={styles.presetBtn} onPress={() => setPreset('tomorrow_morning')}>
            <Text style={styles.presetBtnText}>Tomorrow 9am</Text>
          </Pressable>
          <Pressable style={styles.presetBtn} onPress={() => setPreset('tomorrow_evening')}>
            <Text style={styles.presetBtnText}>Tomorrow 6pm</Text>
          </Pressable>
        </View>

        <View style={styles.presetRow}>
          <Pressable style={styles.smallBtn} onPress={() => adjustDate(-1)}>
            <Text style={styles.smallBtnText}>−1 day</Text>
          </Pressable>
          <Pressable style={styles.smallBtn} onPress={() => adjustDate(1)}>
            <Text style={styles.smallBtnText}>+1 day</Text>
          </Pressable>
          <Pressable style={styles.smallBtn} onPress={() => adjustDate(7)}>
            <Text style={styles.smallBtnText}>+1 week</Text>
          </Pressable>
        </View>

        {/* ===== Pickup Address Selection ===== */}
        <Text style={styles.sectionHeader}>2. Pickup Location</Text>

        {addresses.map((a) => (
          <Pressable
            key={a.id}
            style={[styles.addrRow, !useCustomPickup && selectedAddress?.id === a.id && styles.addrRowActive]}
            onPress={() => { setUseCustomPickup(false); setSelectedAddress(a); }}>
            <View style={[styles.radio, !useCustomPickup && selectedAddress?.id === a.id && styles.radioActive]} />
            <View style={{ flex: 1 }}>
              <Text style={styles.addrLabel}>{a.label}{a.isDefault ? ' ⭐' : ''}</Text>
              <Text style={styles.addrLine}>{a.addressLine1}</Text>
              <Text style={styles.addrCity}>{a.city}, {a.district}</Text>
            </View>
          </Pressable>
        ))}

        <Pressable
          style={[styles.addrRow, useCustomPickup && styles.addrRowActive]}
          onPress={() => setUseCustomPickup(true)}>
          <View style={[styles.radio, useCustomPickup && styles.radioActive]} />
          <View style={{ flex: 1 }}>
            <Text style={styles.addrLabel}>Enter Custom Pickup Address</Text>
            <Text style={styles.addrCity}>Specify a location not in saved addresses</Text>
          </View>
        </Pressable>

        {useCustomPickup && (
          <View style={styles.customAddrBox}>
            <TextInput
              style={styles.input}
              value={customPickupAddress}
              onChangeText={setCustomPickupAddress}
              placeholder="e.g. 120 Kandy Road, Kiribathgoda"
              placeholderTextColor="#8895A8"
            />
            <Pressable
              style={styles.mapPickTriggerBtn}
              onPress={() => openMapPicker('pickup', customPickupAddress)}>
              <Text style={styles.mapPickTriggerText}>🗺️ Select Pickup Location on Map</Text>
            </Pressable>
          </View>
        )}

        {!useCustomPickup && (
          <Pressable
            style={styles.mapPickTriggerBtnOutline}
            onPress={() => openMapPicker('pickup', selectedAddress?.addressLine1 || '')}>
            <Text style={styles.mapPickTriggerTextOutline}>🗺️ Or Select Pickup Location from Map</Text>
          </Pressable>
        )}

        {/* ===== Delivery Locations (One or Multiple Drop Stops) ===== */}
        <Text style={styles.sectionHeader}>3. Delivery Locations ({deliveryStops.length} {deliveryStops.length === 1 ? 'stop' : 'stops'})</Text>
        
        {deliveryStops.map((stop, index) => (
          <View key={stop.id} style={styles.stopCard}>
            <View style={styles.stopHeader}>
              <Text style={styles.stopTitle}>📍 Delivery Location #{index + 1}</Text>
              {deliveryStops.length > 1 && (
                <Pressable onPress={() => removeDeliveryStop(stop.id)} hitSlop={8}>
                  <Text style={styles.removeStopBtn}>🗑️ Remove</Text>
                </Pressable>
              )}
            </View>

            <Text style={styles.inputLabel}>Delivery Address *</Text>
            <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
              <TextInput
                style={[styles.input, { flex: 1 }]}
                value={stop.address}
                onChangeText={(text) => updateDeliveryStop(stop.id, 'address', text)}
                placeholder="e.g. 50 Main Street, Kandy"
                placeholderTextColor="#8895A8"
              />
              <Pressable
                style={styles.mapSmallBtn}
                onPress={() => openMapPicker(stop.id, stop.address)}>
                <Text style={styles.mapSmallBtnText}>🗺️ Map</Text>
              </Pressable>
            </View>

            <Text style={styles.inputLabel}>Recipient Name</Text>
            <TextInput
              style={styles.input}
              value={stop.recipientName}
              onChangeText={(text) => updateDeliveryStop(stop.id, 'recipientName', text)}
              placeholder="Saman Retail Store"
              placeholderTextColor="#8895A8"
            />

            <Text style={styles.inputLabel}>Recipient Contact Phone</Text>
            <TextInput
              style={styles.input}
              value={stop.recipientPhone}
              onChangeText={(text) => updateDeliveryStop(stop.id, 'recipientPhone', text)}
              keyboardType="phone-pad"
              placeholder="+94 77 123 4567"
              placeholderTextColor="#8895A8"
            />

            <Text style={styles.inputLabel}>Delivery Notes (Optional)</Text>
            <TextInput
              style={styles.input}
              value={stop.notes}
              onChangeText={(text) => updateDeliveryStop(stop.id, 'notes', text)}
              placeholder="Gate 2 rear bay, handle with care"
              placeholderTextColor="#8895A8"
            />
          </View>
        ))}

        <Pressable style={styles.addStopBtn} onPress={addDeliveryStop}>
          <Text style={styles.addStopBtnText}>+ Add Another Delivery Location (Multi-Drop)</Text>
        </Pressable>

        {/* ===== Cargo & Extras ===== */}
        <Text style={styles.sectionHeader}>4. Cargo & Options</Text>

        <Text style={styles.inputLabel}>Cargo weight (kg) *</Text>
        <TextInput
          style={styles.input}
          value={weight}
          onChangeText={setWeight}
          keyboardType="decimal-pad"
          placeholder="500"
          placeholderTextColor="#8895A8"
        />

        <Text style={styles.inputLabel}>Cargo description (optional)</Text>
        <TextInput
          style={styles.input}
          value={cargoDesc}
          onChangeText={setCargoDesc}
          placeholder="Furniture, FMCG cartons, etc."
          placeholderTextColor="#8895A8"
        />

        <Text style={styles.inputLabel}>Helpers needed</Text>
        <View style={styles.chipRow}>
          {[0, 1, 2].map(n => (
            <Pressable
              key={n}
              style={[styles.chip, helpers === n && styles.chipActive]}
              onPress={() => setHelpers(n)}>
              <Text style={[styles.chipText, helpers === n && styles.chipTextActive]}>
                {n === 0 ? 'No helper' : `${n} helper${n > 1 ? 's' : ''}`}
              </Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.toggleRow}>
          <Text style={styles.toggleLabel}>Express priority delivery (+30%)</Text>
          <Switch value={express} onValueChange={setExpress} trackColor={{ true: '#F5A623' }} />
        </View>

        <Pressable
          style={[styles.confirmBtn, loadingEstimate && { opacity: 0.6 }]}
          onPress={getEstimate}
          disabled={loadingEstimate}>
          {loadingEstimate
            ? <ActivityIndicator color="white" />
            : <Text style={styles.confirmBtnText}>Get estimate & review</Text>}
        </Pressable>

        <Pressable onPress={onBack} style={styles.linkBtn}>
          <Text style={styles.linkText}>Back</Text>
        </Pressable>
      </ScrollView>

      {/* ===== Map Location Picker Modal ===== */}
      <Modal
        visible={mapPickerVisible}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setMapPickerVisible(false)}>
        <View style={styles.mapModalContainer}>
          <View style={styles.mapModalHeader}>
            <Text style={styles.mapModalTitle}>
              {mapPickerTarget === 'pickup' ? '📍 Select Pickup Location' : '📍 Select Delivery Stop'}
            </Text>
            <Pressable onPress={() => setMapPickerVisible(false)} hitSlop={10}>
              <Text style={styles.mapModalClose}>✕ Close</Text>
            </Pressable>
          </View>

          <ScrollView style={{ flex: 1, padding: 16 }}>
            <View style={{ marginBottom: 12 }}>
              <Pressable
                style={styles.currentLocationBtn}
                onPress={getCurrentUserLocation}
                disabled={geocodingLoading}>
                {geocodingLoading ? (
                  <ActivityIndicator color="#F5A623" size="small" />
                ) : (
                  <Text style={styles.currentLocationBtnText}>🎯 Use My Current GPS Location</Text>
                )}
              </Pressable>

              <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
                <TextInput
                  style={[styles.input, { flex: 1, marginBottom: 0 }]}
                  value={mapSearchQuery}
                  onChangeText={setMapSearchQuery}
                  placeholder="Type city or landmark e.g. Kandy Clock Tower"
                  placeholderTextColor="#8895A8"
                />
                <Pressable
                  style={styles.searchMapBtn}
                  onPress={() => searchMapLocation(mapSearchQuery)}>
                  {geocodingLoading ? (
                    <ActivityIndicator color="white" size="small" />
                  ) : (
                    <Text style={styles.searchMapBtnText}>🔍 Search</Text>
                  )}
                </Pressable>
              </View>
            </View>

            {/* Sri Lanka Major Cities Preset Chips */}
            <Text style={styles.smallLabel}>Quick city pin selector:</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
              <View style={{ flexDirection: 'row', gap: 6 }}>
                {Object.entries(CITY_COORDINATES).map(([city, coords]) => (
                  <Pressable
                    key={city}
                    style={styles.cityPresetChip}
                    onPress={() => selectCityOnMap(city, coords)}>
                    <Text style={styles.cityPresetChipText}>📍 {city.toUpperCase()}</Text>
                  </Pressable>
                ))}
              </View>
            </ScrollView>

            {/* Live Google Maps Tile Viewer */}
            <View style={styles.mapVisualCard}>
              <View style={{ height: 280, borderRadius: 12, overflow: 'hidden', marginBottom: 12, borderWidth: 1, borderColor: '#D8E0EA' }}>
                {Platform.OS === 'web' ? (
                  // @ts-ignore
                  <iframe
                    title="Google Maps Location View"
                    width="100%"
                    height="100%"
                    frameBorder="0"
                    src={`https://maps.google.com/maps?q=${mapSelectedLat},${mapSelectedLng}&z=15&output=embed`}
                    style={{ border: 'none', width: '100%', height: '100%' }}
                  />
                ) : (
                  <View style={{ flex: 1, backgroundColor: '#1A2B4A', justifyContent: 'center', alignItems: 'center' }}>
                    <Text style={{ fontSize: 32, marginBottom: 4 }}>📍</Text>
                    <Text style={{ color: '#F5A623', fontWeight: 'bold' }}>Map Location Active</Text>
                    <Text style={{ color: '#FFFFFF', fontSize: 12, marginTop: 4 }}>Lat: {mapSelectedLat.toFixed(5)}, Lng: {mapSelectedLng.toFixed(5)}</Text>
                  </View>
                )}
              </View>

              {/* Selected Location Summary Card */}
              <View style={styles.selectedLocationCard}>
                <Text style={styles.selectedLocationTitle}>📍 Selected Location</Text>
                <TextInput
                  style={styles.locationAddressInput}
                  value={mapAddressText}
                  onChangeText={setMapAddressText}
                  placeholder="Address details"
                  placeholderTextColor="#8895A8"
                  multiline
                />
                <View style={styles.coordsBadge}>
                  <Text style={styles.coordsBadgeText}>
                    GPS: {mapSelectedLat.toFixed(5)}, {mapSelectedLng.toFixed(5)}
                  </Text>
                </View>
              </View>
            </View>

            <Pressable style={styles.confirmMapBtn} onPress={confirmMapSelection}>
              <Text style={styles.confirmMapBtnText}>✓ Use Selected Location</Text>
            </Pressable>
          </ScrollView>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

function Row({ label, value, bold, accent }: any) {
  return (
    <View style={styles.row}>
      <Text style={[styles.rowLabel, bold && { fontWeight: '700' }]}>{label}</Text>
      <Text style={[styles.rowValue, bold && { fontWeight: '700', fontSize: 16 }, accent && { color: '#F5A623', fontWeight: '900' }]}>
        LKR {Math.round(value).toLocaleString()}
      </Text>
    </View>
  );
}

const NAVY = '#1A2B4A';
const ORANGE = '#F5A623';
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F4F7FB' },
  title: { fontSize: 24, fontWeight: '700', color: NAVY, marginBottom: 16 },

  truckSummary: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: NAVY, padding: 16, borderRadius: 12, marginBottom: 20,
  },
  truckBadge: {
    width: 56, height: 56, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center', justifyContent: 'center', marginRight: 14,
  },
  truckBadgeText: { color: 'white', fontWeight: '900', fontSize: 13 },
  truckName: { fontSize: 18, fontWeight: '700', color: 'white' },
  truckDesc: { fontSize: 12, color: '#A8B6CC', marginTop: 4 },
  truckPrice: { fontSize: 13, color: ORANGE, fontWeight: '700', marginTop: 6 },

  sectionHeader: { fontSize: 16, fontWeight: '700', color: NAVY, marginTop: 24, marginBottom: 12 },
  inputLabel: { fontSize: 12, fontWeight: '600', color: '#5A6B85', marginTop: 10, marginBottom: 4 },
  smallLabel: { fontSize: 12, color: '#5A6B85', marginTop: 8, marginBottom: 6 },
  hint: { fontSize: 12, color: '#8895A8', marginTop: 4, marginBottom: 8 },

  pickerRow: { flexDirection: 'row', marginBottom: 12 },
  pickerBox: {
    backgroundColor: 'white', padding: 12, borderRadius: 10,
    borderWidth: 1.5, borderColor: ORANGE, justifyContent: 'center',
  },
  pickerBoxLabel: { fontSize: 10, fontWeight: '800', color: ORANGE, letterSpacing: 0.8 },
  pickerBoxInput: { fontSize: 15, fontWeight: '700', color: NAVY, marginTop: 4, padding: 0 },

  slotChip: {
    paddingHorizontal: 12, paddingVertical: 8,
    backgroundColor: 'white', borderRadius: 8,
    borderWidth: 1, borderColor: '#D8E0EA',
  },
  slotChipActive: { backgroundColor: NAVY, borderColor: NAVY },
  slotChipText: { fontSize: 12, color: '#5A6B85', fontWeight: '600' },
  slotChipTextActive: { color: 'white' },

  presetRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  presetBtn: {
    paddingHorizontal: 12, paddingVertical: 8,
    backgroundColor: '#FFF8E7', borderRadius: 8,
    borderWidth: 1, borderColor: ORANGE,
  },
  presetBtnText: { color: ORANGE, fontWeight: '600', fontSize: 12 },
  smallBtn: {
    paddingHorizontal: 12, paddingVertical: 6,
    backgroundColor: '#F4F7FB', borderRadius: 6,
    borderWidth: 1, borderColor: '#D8E0EA',
  },
  smallBtnText: { color: '#5A6B85', fontWeight: '600', fontSize: 12 },

  addrRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'white', padding: 12, borderRadius: 10,
    marginBottom: 8, borderWidth: 1, borderColor: '#D8E0EA',
  },
  addrRowActive: { borderColor: ORANGE, backgroundColor: '#FFF8E7' },
  radio: {
    width: 18, height: 18, borderRadius: 9,
    borderWidth: 2, borderColor: '#D8E0EA', marginRight: 12,
  },
  radioActive: { borderColor: ORANGE, backgroundColor: ORANGE },
  addrLabel: { fontSize: 14, fontWeight: '600', color: NAVY },
  addrLine: { fontSize: 12, color: '#5A6B85', marginTop: 2 },
  addrCity: { fontSize: 11, color: '#8895A8', marginTop: 2 },
  customAddrBox: { marginBottom: 12, marginTop: 4 },

  stopCard: {
    backgroundColor: 'white', padding: 16, borderRadius: 12,
    marginBottom: 12, borderWidth: 1, borderColor: '#D8E0EA',
  },
  stopHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  stopTitle: { fontSize: 14, fontWeight: '700', color: NAVY },
  removeStopBtn: { fontSize: 12, color: '#E74C3C', fontWeight: '600' },
  addStopBtn: {
    backgroundColor: '#FFF8E7', paddingVertical: 12, borderRadius: 10,
    borderWidth: 1.5, borderColor: ORANGE, borderStyle: 'dashed',
    alignItems: 'center', marginBottom: 16,
  },
  addStopBtnText: { color: ORANGE, fontWeight: '700', fontSize: 13 },

  mapCalcBtn: {
    backgroundColor: NAVY, paddingVertical: 14, borderRadius: 10,
    alignItems: 'center', marginBottom: 16,
  },
  mapCalcBtnText: { color: 'white', fontWeight: '700', fontSize: 14 },

  routeBadgeCard: {
    backgroundColor: '#EBF5FF', padding: 14, borderRadius: 10,
    borderWidth: 1, borderColor: '#90CDF4', marginBottom: 16,
  },
  routeBadgeTitle: { fontSize: 13, fontWeight: '700', color: NAVY },
  routeBadgeDetail: { fontSize: 13, color: '#2B6CB0', marginTop: 4 },
  routeBadgeSavings: { fontSize: 11, color: '#276749', fontWeight: '700', marginTop: 6 },

  input: {
    borderWidth: 1, borderColor: '#D8E0EA', borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: NAVY,
    backgroundColor: 'white', marginBottom: 4,
  },

  chipRow: { flexDirection: 'row', marginBottom: 8, gap: 8, marginTop: 4 },
  chip: {
    flex: 1, paddingVertical: 10, borderRadius: 8,
    borderWidth: 1.5, borderColor: '#D8E0EA',
    alignItems: 'center', backgroundColor: 'white',
  },
  chipActive: { backgroundColor: NAVY, borderColor: NAVY },
  chipText: { fontSize: 13, color: '#5A6B85', fontWeight: '600' },
  chipTextActive: { color: 'white' },

  toggleRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginVertical: 16, paddingVertical: 8,
  },
  toggleLabel: { fontSize: 14, color: NAVY, fontWeight: '500' },

  totalCard: {
    backgroundColor: NAVY, padding: 24, borderRadius: 14,
    alignItems: 'center', marginBottom: 16,
  },
  totalLabel: { fontSize: 11, color: 'rgba(255,255,255,0.7)', letterSpacing: 1.5 },
  totalValue: { fontSize: 38, fontWeight: '900', color: 'white', marginTop: 6 },
  totalCurrency: { fontSize: 13, color: ORANGE, marginTop: 2 },
  pickupSummary: { fontSize: 12, color: 'rgba(255,255,255,0.8)', marginTop: 10, textAlign: 'center' },
  stopsSummary: { fontSize: 12, color: ORANGE, marginTop: 4, textAlign: 'center', fontWeight: '600' },

  card: { backgroundColor: 'white', padding: 16, borderRadius: 12, marginBottom: 16 },
  cardLabel: { fontSize: 14, fontWeight: '600', color: '#5A6B85', marginBottom: 8 },
  stopHeading: { fontSize: 13, fontWeight: '700', color: NAVY },
  stopSub: { fontSize: 12, color: '#5A6B85', marginTop: 2 },

  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  rowLabel: { fontSize: 14, color: '#5A6B85' },
  rowValue: { fontSize: 14, color: NAVY, fontWeight: '600' },
  divider: { height: 1, backgroundColor: '#E8EDF3', marginVertical: 8 },

  confirmBtn: {
    height: 52, borderRadius: 10, backgroundColor: ORANGE,
    alignItems: 'center', justifyContent: 'center', marginTop: 16,
  },
  confirmBtnText: { color: 'white', fontSize: 16, fontWeight: '700' },

  linkBtn: { marginTop: 12, marginBottom: 30, alignItems: 'center' },
  linkText: { color: ORANGE, fontWeight: '600', fontSize: 14 },

  mapPickTriggerBtn: {
    backgroundColor: NAVY,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginTop: 8,
    alignItems: 'center',
  },
  mapPickTriggerText: { color: 'white', fontWeight: '700', fontSize: 13 },
  mapPickTriggerBtnOutline: {
    borderWidth: 1.5,
    borderColor: NAVY,
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 12,
    alignItems: 'center',
    backgroundColor: 'white',
  },
  mapPickTriggerTextOutline: { color: NAVY, fontWeight: '700', fontSize: 14 },
  mapSmallBtn: {
    backgroundColor: ORANGE,
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  mapSmallBtnText: { color: NAVY, fontWeight: '700', fontSize: 13 },
  mapModalContainer: { flex: 1, backgroundColor: '#F4F7FB' },
  mapModalHeader: {
    backgroundColor: NAVY,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  mapModalTitle: { color: 'white', fontSize: 18, fontWeight: '700' },
  mapModalClose: { color: ORANGE, fontSize: 15, fontWeight: '700' },
  searchMapBtn: {
    backgroundColor: NAVY,
    borderRadius: 8,
    paddingHorizontal: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchMapBtnText: { color: 'white', fontWeight: '700' },
  cityPresetChip: {
    backgroundColor: '#E6F4FE',
    borderRadius: 16,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: NAVY,
  },
  cityPresetChipText: { color: NAVY, fontWeight: '700', fontSize: 12 },
  mapVisualCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 3,
  },
  currentLocationBtn: {
    backgroundColor: NAVY,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  currentLocationBtnText: { color: ORANGE, fontWeight: '700', fontSize: 14 },
  selectedLocationCard: {
    backgroundColor: '#F8FAFC',
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 8,
  },
  selectedLocationTitle: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  locationAddressInput: {
    color: '#1E293B',
    fontSize: 14,
    fontWeight: '600',
    minHeight: 40,
    padding: 0,
    marginBottom: 8,
  },
  coordsBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#E2E8F0',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  coordsBadgeText: { color: '#475569', fontSize: 11, fontWeight: '700' },
  reverseGeocodeBox: { marginTop: 4 },
  reverseGeocodeLabel: { fontSize: 13, fontWeight: '700', color: NAVY, marginBottom: 4 },
  confirmMapBtn: {
    backgroundColor: '#2E7D32',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 30,
  },
  confirmMapBtnText: { color: 'white', fontSize: 16, fontWeight: '800' },
});
