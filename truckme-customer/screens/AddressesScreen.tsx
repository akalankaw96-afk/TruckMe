import React, { useEffect, useState } from 'react';
import {
  View, Text, FlatList, StyleSheet, Pressable,
  ActivityIndicator, RefreshControl, TextInput, ScrollView, Modal, Platform,
} from 'react-native';
import client from '../api/client';
import { Address } from '../types';
import { GOOGLE_MAPS_API_KEY, POSITIONSTACK_API_KEY } from '../constants/Config';

interface Props {
  userId: string;
}

const CITY_COORDINATES: Record<string, { lat: number; lng: number }> = {
  colombo: { lat: 6.9271, lng: 79.8612 },
  kandy: { lat: 7.2906, lng: 80.6337 },
  galle: { lat: 6.0535, lng: 80.2210 },
  negombo: { lat: 7.2083, lng: 79.8358 },
  jaffna: { lat: 9.6615, lng: 80.0255 },
  kurunegala: { lat: 7.4863, lng: 80.3623 },
  ratnapura: { lat: 6.6828, lng: 80.3992 },
  anuradhapura: { lat: 8.3114, lng: 80.4037 },
  badulla: { lat: 6.9934, lng: 81.0550 },
  matara: { lat: 5.9549, lng: 80.5550 },
  trincomalee: { lat: 8.5874, lng: 81.2152 },
  batticaloa: { lat: 7.7310, lng: 81.6747 },
  gampaha: { lat: 7.0840, lng: 79.9925 },
  kalutara: { lat: 6.5854, lng: 79.9607 },
  kegalle: { lat: 7.2513, lng: 80.3464 },
  nuwaraeliya: { lat: 6.9497, lng: 80.7891 },
  hambantota: { lat: 6.1241, lng: 81.1185 },
  polonnaruwa: { lat: 7.9403, lng: 81.0188 },
  puttalam: { lat: 8.0362, lng: 79.8283 },
  monaragala: { lat: 6.8727, lng: 81.3507 },
  vavuniya: { lat: 8.7514, lng: 80.4971 },
  mannar: { lat: 8.9810, lng: 79.9042 },
  mullaitivu: { lat: 9.2671, lng: 80.8142 },
  kilinochchi: { lat: 9.3803, lng: 80.3992 },
  ampara: { lat: 7.2912, lng: 81.6724 },
};

export default function AddressesScreen({ userId }: Props) {
  const [list, setList] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);

  const [label, setLabel] = useState('Home');
  const [line1, setLine1] = useState('');
  const [city, setCity] = useState('Colombo');
  const [district, setDistrict] = useState('Colombo');
  const [lat, setLat] = useState(6.9271);
  const [lng, setLng] = useState(79.8612);
  const [isDefault, setIsDefault] = useState(false);

  // Map Location Picker Modal State
  const [mapPickerVisible, setMapPickerVisible] = useState(false);
  const [mapSearchQuery, setMapSearchQuery] = useState('');
  const [mapSelectedLat, setMapSelectedLat] = useState(6.9271);
  const [mapSelectedLng, setMapSelectedLng] = useState(79.8612);
  const [mapAddressText, setMapAddressText] = useState('');
  const [geocodingLoading, setGeocodingLoading] = useState(false);

  // Custom Delete Modal & Toast Notification State
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const load = async () => {
    try {
      const res = await client.get(`/api/addresses?userId=${userId}`);
      setList(res.data || []);
    } catch (e: any) {
      showToast(e?.response?.data?.message || 'Failed to load addresses', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { load(); }, []);

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
          showToast('Could not retrieve current GPS location', 'error');
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    } else {
      showToast('Geolocation is not supported on this device', 'error');
    }
  };

  const resolveCoordinates = (query: string) => {
    if (!query) return { lat: 6.9271, lng: 79.8612 };
    const lower = query.toLowerCase();
    for (const [key, coords] of Object.entries(CITY_COORDINATES)) {
      if (lower.includes(key)) return coords;
    }
    return { lat: 6.9271, lng: 79.8612 };
  };

  const openMapPicker = async () => {
    const query = line1 ? `${line1}, ${city}` : (city || 'Colombo');
    setMapSearchQuery(query);
    const coords = resolveCoordinates(query);
    setMapSelectedLat(coords.lat);
    setMapSelectedLng(coords.lng);
    setMapAddressText(line1 ? `${line1}, ${city}` : `${city || 'Colombo'}, Sri Lanka`);
    setMapPickerVisible(true);

    if (query && query !== 'Colombo') {
      searchMapLocation(query);
    }
  };

  const searchMapLocation = async (queryStr: string) => {
    if (!queryStr.trim()) return;
    setGeocodingLoading(true);

    // 1st Priority: Backend Geocoding Endpoint
    try {
      const res = await client.get(`/api/routes/geocode?address=${encodeURIComponent(queryStr)}`);
      if (res.data?.latitude && res.data?.longitude) {
        setMapSelectedLat(res.data.latitude);
        setMapSelectedLng(res.data.longitude);
        setMapAddressText(res.data.formattedAddress || queryStr);
        setGeocodingLoading(false);
        return;
      }
    } catch (e) { }

    // 2nd Priority: Direct Nominatim Fetch with User-Agent Header
    try {
      const osmRes = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(queryStr)}`,
        { headers: { 'User-Agent': 'TruckMe-CustomerApp/1.0' } }
      );
      const osmData = await osmRes.json();
      if (osmData && osmData[0]) {
        const osmLat = parseFloat(osmData[0].lat);
        const osmLng = parseFloat(osmData[0].lon);
        if (!isNaN(osmLat) && !isNaN(osmLng)) {
          setMapSelectedLat(osmLat);
          setMapSelectedLng(osmLng);
          setMapAddressText(osmData[0].display_name || queryStr);
          setGeocodingLoading(false);
          return;
        }
      }
    } catch (err) { }

    // 3rd Priority: Local City Coordinate Map Fallback
    const coords = resolveCoordinates(queryStr);
    setMapSelectedLat(coords.lat);
    setMapSelectedLng(coords.lng);
    setMapAddressText(`${queryStr}, Sri Lanka`);
    setGeocodingLoading(false);
  };

  const reverseGeocodeMap = async (targetLat: number, targetLng: number) => {
    setGeocodingLoading(true);
    // 1st Priority: Backend Reverse Geocoding API
    try {
      const res = await client.get(`/api/routes/reverse-geocode?lat=${targetLat}&lng=${targetLng}`);
      if (res.data?.formattedAddress) {
        setMapAddressText(res.data.formattedAddress);
        setGeocodingLoading(false);
        return;
      }
    } catch (e) { }

    // 2nd Priority: Direct Nominatim Fetch with User-Agent
    try {
      const osmRes = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${targetLat}&lon=${targetLng}`,
        { headers: { 'User-Agent': 'TruckMe-CustomerApp/1.0' } }
      );
      const osmData = await osmRes.json();
      if (osmData && osmData.display_name) {
        setMapAddressText(osmData.display_name);
        setGeocodingLoading(false);
        return;
      }
    } catch (e) { }

    setMapAddressText(`${targetLat.toFixed(4)}, ${targetLng.toFixed(4)}`);
    setGeocodingLoading(false);
  };

  const confirmMapSelection = () => {
    setLat(mapSelectedLat);
    setLng(mapSelectedLng);
    if (mapAddressText) {
      setLine1(mapAddressText);
      const parts = mapAddressText.split(',');
      if (parts.length > 1) {
        const extractedCity = parts[parts.length - 2].trim();
        if (extractedCity) {
          setCity(extractedCity);
          setDistrict(extractedCity);
        }
      }
    }
    setMapPickerVisible(false);
  };

  const save = async () => {
    if (!line1.trim()) {
      showToast('Address line is required', 'error');
      return;
    }
    setSaving(true);
    try {
      await client.post('/api/addresses', {
        userId, label, addressLine1: line1, city, district,
        province: district, latitude: lat, longitude: lng, isDefault,
      });
      setShowForm(false);
      setLine1('');
      showToast('Address saved successfully!', 'success');
      await load();
    } catch (e: any) {
      showToast(e?.response?.data?.message || e?.message || 'Failed to save address', 'error');
    } finally {
      setSaving(false);
    }
  };

  const deleteAddressDirectly = async (id: string) => {
    try {
      await client.delete(`/api/addresses/${id}?userId=${userId}`);
      showToast('Address deleted successfully!', 'success');
      await load();
    } catch (e: any) {
      showToast(e?.response?.data?.message || e?.message || 'Failed to delete address', 'error');
    }
  };

  if (loading) {
    return <View style={styles.center}><ActivityIndicator color="#F5A623" size="large" /></View>;
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#F4F7FB' }}>
      {/* Floating Toast Notification Banner */}
      {toast && (
        <View style={[styles.toastContainer, toast.type === 'error' ? styles.toastError : styles.toastSuccess]}>
          <Text style={styles.toastText}>
            {toast.type === 'error' ? '⚠️ ' : '✓ '}
            {toast.message}
          </Text>
        </View>
      )}

      {showForm ? (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20 }}>
          <Text style={styles.title}>New address</Text>

          <Pressable style={styles.mapTriggerBtn} onPress={openMapPicker}>
            <Text style={styles.mapTriggerText}>🗺️ Select & Pin Address on Map</Text>
          </Pressable>

          <Text style={styles.label}>Label</Text>
          <TextInput style={styles.input} value={label} onChangeText={setLabel} placeholderTextColor="#8895A8" />

          <Text style={styles.label}>Address line *</Text>
          <TextInput style={styles.input} value={line1} onChangeText={setLine1} placeholder="e.g. 42 Galle Road" placeholderTextColor="#8895A8" />

          <Text style={styles.label}>City</Text>
          <TextInput style={styles.input} value={city} onChangeText={setCity} placeholderTextColor="#8895A8" />

          <Text style={styles.label}>District</Text>
          <TextInput style={styles.input} value={district} onChangeText={setDistrict} placeholderTextColor="#8895A8" />

          <View style={styles.coordsBadge}>
            <Text style={styles.coordsBadgeText}>📍 Selected Pin: Lat {lat.toFixed(5)}, Lng {lng.toFixed(5)}</Text>
          </View>

          <Pressable style={styles.toggleRow} onPress={() => setIsDefault(!isDefault)}>
            <Text style={styles.toggleLabel}>Set as default</Text>
            <View style={[styles.checkbox, isDefault && styles.checkboxOn]}>
              {isDefault && <Text style={styles.checkmark}>✓</Text>}
            </View>
          </Pressable>

          <Pressable style={[styles.button, saving && { opacity: 0.6 }]} onPress={save} disabled={saving}>
            {saving ? <ActivityIndicator color="white" /> : <Text style={styles.buttonText}>Save address</Text>}
          </Pressable>

          <Pressable onPress={() => setShowForm(false)} style={{ marginTop: 12 }}>
            <Text style={styles.linkText}>Cancel</Text>
          </Pressable>
        </ScrollView>
      ) : (
        <View style={{ flex: 1 }}>
          <View style={styles.toolbar}>
            <Text style={styles.count}>{list.length} saved</Text>
            <Pressable onPress={() => setShowForm(true)}>
              <Text style={styles.addBtn}>+ Add new</Text>
            </Pressable>
          </View>
          <FlatList
            data={list}
            keyExtractor={(a) => a.id}
            contentContainerStyle={{ padding: 16 }}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor="#F5A623" />}
            renderItem={({ item }) => (
              <View style={styles.card}>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Text style={styles.cardLabel}>{item.label}</Text>
                    {item.isDefault && (
                      <View style={styles.defaultBadge}><Text style={styles.defaultBadgeText}>DEFAULT</Text></View>
                    )}
                  </View>
                  <Text style={styles.cardLine}>{item.addressLine1}</Text>
                  <Text style={styles.cardCity}>{item.city}, {item.district}</Text>
                  <Text style={styles.cardCoords}>📍 Lat {item.latitude?.toFixed(4) || '6.9271'}, Lng {item.longitude?.toFixed(4) || '79.8612'}</Text>
                </View>
                <Pressable onPress={() => deleteAddressDirectly(item.id)} hitSlop={12}>
                  <Text style={styles.delBtn}>🗑️</Text>
                </Pressable>
              </View>
            )}
            ListEmptyComponent={
              <View style={styles.empty}>
                <Text style={styles.emptyEmoji}>📍</Text>
                <Text style={styles.emptyTitle}>No addresses yet</Text>
                <Text style={styles.emptyText}>Tap + Add new to create one</Text>
              </View>
            }
          />
        </View>
      )}

      {/* ===== Map Location Picker Modal ===== */}
      <Modal
        visible={mapPickerVisible}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setMapPickerVisible(false)}>
        <View style={styles.mapModalContainer}>
          <View style={styles.mapModalHeader}>
            <Text style={styles.mapModalTitle}>📍 Pick Address on Map</Text>
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
                  placeholder="Search place, street or city..."
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

            {/* City Preset Chips */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
              <View style={{ flexDirection: 'row', gap: 6 }}>
                {Object.entries(CITY_COORDINATES).map(([cityName, coords]) => (
                  <Pressable
                    key={cityName}
                    style={styles.cityChip}
                    onPress={() => {
                      setMapSelectedLat(coords.lat);
                      setMapSelectedLng(coords.lng);
                      setMapAddressText(`${cityName.charAt(0).toUpperCase() + cityName.slice(1)}, Sri Lanka`);
                    }}>
                    <Text style={styles.cityChipText}>📍 {cityName.toUpperCase()}</Text>
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

              {/* Selected Location Details */}
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
              <Text style={styles.confirmMapBtnText}>✓ Save Location & Apply to Form</Text>
            </Pressable>
          </ScrollView>
        </View>
      </Modal>

    </View>
  );
}

const NAVY = '#1A2B4A';
const ORANGE = '#F5A623';
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

  title: { fontSize: 24, fontWeight: '700', color: NAVY, marginBottom: 16 },
  label: { fontSize: 13, fontWeight: '600', color: '#5A6B85', marginTop: 12, marginBottom: 6 },
  input: { borderWidth: 1, borderColor: '#D8E0EA', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 12, fontSize: 15, color: NAVY, backgroundColor: 'white' },
  toggleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 16, marginTop: 16 },
  toggleLabel: { fontSize: 15, color: NAVY },
  checkbox: { width: 26, height: 26, borderRadius: 6, borderWidth: 2, borderColor: '#D8E0EA', alignItems: 'center', justifyContent: 'center' },
  checkboxOn: { backgroundColor: ORANGE, borderColor: ORANGE },
  checkmark: { color: 'white', fontSize: 14, fontWeight: '900' },
  button: { height: 52, borderRadius: 10, backgroundColor: ORANGE, alignItems: 'center', justifyContent: 'center', marginTop: 24 },
  buttonText: { color: 'white', fontSize: 16, fontWeight: '700' },
  linkText: { color: ORANGE, textAlign: 'center', fontWeight: '600', fontSize: 14 },
  toolbar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16 },
  count: { fontSize: 14, color: '#5A6B85' },
  addBtn: { color: ORANGE, fontWeight: '700', fontSize: 15 },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', padding: 16, borderRadius: 12, marginBottom: 10 },
  cardLabel: { fontSize: 16, fontWeight: '600', color: NAVY },
  defaultBadge: { backgroundColor: ORANGE, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4, marginLeft: 8 },
  defaultBadgeText: { color: 'white', fontSize: 10, fontWeight: '700' },
  cardLine: { fontSize: 14, color: NAVY, marginTop: 6 },
  cardCity: { fontSize: 12, color: '#5A6B85', marginTop: 2 },
  cardCoords: { fontSize: 11, color: '#8895A8', marginTop: 4 },
  delBtn: { fontSize: 20, padding: 8 },
  empty: { alignItems: 'center', padding: 40 },
  emptyEmoji: { fontSize: 64 },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: NAVY, marginTop: 12 },
  emptyText: { fontSize: 13, color: '#5A6B85', marginTop: 4, textAlign: 'center' },
  mapTriggerBtn: {
    backgroundColor: NAVY,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 12,
  },
  mapTriggerText: { color: 'white', fontWeight: '700', fontSize: 14 },
  coordsBadge: {
    backgroundColor: '#E6F4FE',
    padding: 10,
    borderRadius: 8,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#90CDF4',
  },
  coordsBadgeText: { color: NAVY, fontSize: 12, fontWeight: '700' },
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
  cityChip: {
    backgroundColor: '#E6F4FE',
    borderRadius: 16,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: NAVY,
  },
  cityChipText: { color: NAVY, fontWeight: '700', fontSize: 12 },
  mapVisualCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  mapGridOverlay: {
    backgroundColor: NAVY,
    borderRadius: 10,
    padding: 16,
    alignItems: 'center',
    marginBottom: 16,
  },
  mapPinIcon: { fontSize: 32, marginBottom: 4 },
  mapVisualTitle: { color: ORANGE, fontWeight: '700', fontSize: 16 },
  mapVisualCoords: { color: 'white', fontSize: 13, marginTop: 2, marginBottom: 12 },
  panControlsContainer: { alignItems: 'center', gap: 6 },
  panBtn: {
    backgroundColor: '#2A3C5E',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  panBtnText: { color: 'white', fontSize: 12, fontWeight: '700' },
  currentLocationBtn: {
    backgroundColor: '#1A2B4A',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  currentLocationBtnText: { color: '#F5A623', fontWeight: '700', fontSize: 14 },
  selectedLocationCard: {
    backgroundColor: '#F8FAFC',
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 12,
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
  confirmMapBtn: {
    backgroundColor: '#2E7D32',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 30,
  },
  confirmMapBtnText: { color: 'white', fontSize: 16, fontWeight: '800' },

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
