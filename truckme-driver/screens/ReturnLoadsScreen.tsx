import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  ActivityIndicator,
  Alert,
  RefreshControl,
  TextInput,
  Modal,
  ScrollView,
} from 'react-native';
import client from '../api/client';

interface Props {
  user?: any;
  onBack: () => void;
}

export default function ReturnLoadsScreen({ user, onBack }: Props) {
  const [loads, setLoads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showPostModal, setShowPostModal] = useState(false);
  const [busy, setBusy] = useState(false);

  // Form states
  const [origin, setOrigin] = useState('Kandy');
  const [destination, setDestination] = useState('Colombo');
  const [capacityKg, setCapacityKg] = useState('1000');
  const [discount, setDiscount] = useState('40');
  const [remarks, setRemarks] = useState('Returning empty truck. 40% discount applied.');

  const fetchReturnLoads = async () => {
    try {
      setLoading(true);
      const res = await client.get('/api/returnloads/search');
      setLoads(res.data || []);
    } catch (e) {
      console.log('Error fetching return loads:', e);
      setLoads([
        {
          id: 'rl-001',
          originCity: 'Kandy',
          destinationCity: 'Colombo',
          availableFrom: '2026-08-08',
          discountedFare: 9000,
          originalFare: 15000,
          discountPercentage: 40,
          vehicleSize: 'OneTon',
          capacityKg: 1000,
          remarks: 'Empty 1-Ton Truck returning to Colombo from Kandy.',
        },
        {
          id: 'rl-002',
          originCity: 'Galle',
          destinationCity: 'Colombo',
          availableFrom: '2026-08-09',
          discountedFare: 12000,
          originalFare: 20000,
          discountPercentage: 40,
          vehicleSize: 'ThreeTon',
          capacityKg: 3000,
          remarks: 'Empty 3-Ton Container returning on Southern Expressway.',
        },
      ]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchReturnLoads();
  }, []);

  const handlePostReturnLoad = async () => {
    if (!origin || !destination) {
      Alert.alert('Required', 'Please enter origin and destination cities');
      return;
    }

    setBusy(true);
    try {
      await client.post('/api/returnloads', {
        driverId: user?.id,
        originCity: origin,
        destinationCity: destination,
        capacityKg: parseInt(capacityKg) || 1000,
        discountPercentage: parseFloat(discount) || 40,
        remarks: remarks,
      });
      setShowPostModal(false);
      Alert.alert('Success 🎉', 'Empty Return Load posted! Shippers will see your 40% discount listing.');
      fetchReturnLoads();
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.message || e?.message || 'Failed to post return load');
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.container}>
      <Pressable onPress={onBack} style={{ marginBottom: 12 }}>
        <Text style={styles.backBtnText}>← Back to Dashboard</Text>
      </Pressable>

      <View style={styles.header}>
        <View>
          <Text style={styles.title}>🔄 Return Loads Marketplace</Text>
          <Text style={styles.subtitle}>Post empty return capacity & earn 40% more on return legs!</Text>
        </View>

        <Pressable style={styles.postBtn} onPress={() => setShowPostModal(true)}>
          <Text style={styles.postBtnText}>+ Post Return Trip</Text>
        </Pressable>
      </View>

      {loading ? (
        <ActivityIndicator color="#F5A623" size="large" style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={loads}
          keyExtractor={(item) => item.id}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                fetchReturnLoads();
              }}
              tintColor="#F5A623"
            />
          }
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.routeHeader}>
                <Text style={styles.routeText}>
                  📍 {item.originCity} ➔ 📍 {item.destinationCity}
                </Text>
                <View style={styles.discountBadge}>
                  <Text style={styles.discountText}>{item.discountPercentage || 40}% OFF</Text>
                </View>
              </View>

              <Text style={styles.details}>
                🚛 {item.vehicleSize || 'Truck'} • Capacity: {item.capacityKg || 1000}kg
              </Text>
              <Text style={styles.remarks}>{item.remarks}</Text>

              <View style={styles.priceRow}>
                <View>
                  <Text style={styles.origPrice}>LKR {(item.originalFare || 15000).toLocaleString()}</Text>
                  <Text style={styles.discPrice}>LKR {(item.discountedFare || 9000).toLocaleString()}</Text>
                </View>

                <Pressable
                  style={styles.claimBtn}
                  onPress={() => Alert.alert('Book Return Capacity', `Accept booking for return trip ${item.originCity} ➔ ${item.destinationCity}?`)}>
                  <Text style={styles.claimBtnText}>Claim Trip</Text>
                </Pressable>
              </View>
            </View>
          )}
          ListEmptyComponent={
            <View style={styles.emptyCard}>
              <Text style={styles.emptyTitle}>No Active Return Loads</Text>
              <Text style={styles.emptySub}>Tap "+ Post Return Trip" above to list your returning truck!</Text>
            </View>
          }
        />
      )}

      {/* Post Return Trip Modal */}
      <Modal visible={showPostModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}>
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>🚚 Post Empty Return Capacity</Text>
              <Text style={styles.modalSub}>Earn money on your return leg instead of driving empty!</Text>

              <Text style={styles.inputLabel}>Origin City (Where your truck is now)</Text>
              <TextInput
                style={styles.input}
                value={origin}
                onChangeText={setOrigin}
                placeholder="e.g. Kandy"
              />

              <Text style={styles.inputLabel}>Destination City (Where you are returning to)</Text>
              <TextInput
                style={styles.input}
                value={destination}
                onChangeText={setDestination}
                placeholder="e.g. Colombo"
              />

              <Text style={styles.inputLabel}>Available Truck Capacity (kg)</Text>
              <TextInput
                style={styles.input}
                value={capacityKg}
                onChangeText={setCapacityKg}
                keyboardType="numeric"
                placeholder="1000"
              />

              <Text style={styles.inputLabel}>Discount Percentage Offered (%)</Text>
              <TextInput
                style={styles.input}
                value={discount}
                onChangeText={setDiscount}
                keyboardType="numeric"
                placeholder="40"
              />

              <Text style={styles.inputLabel}>Remarks / Return Details</Text>
              <TextInput
                style={[styles.input, { height: 60 }]}
                multiline
                value={remarks}
                onChangeText={setRemarks}
                placeholder="Returning empty truck on expressway..."
              />

              <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
                <Pressable style={styles.cancelBtn} onPress={() => setShowPostModal(false)}>
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </Pressable>
                <Pressable style={styles.submitPostBtn} onPress={handlePostReturnLoad} disabled={busy}>
                  {busy ? <ActivityIndicator color="white" /> : <Text style={styles.submitPostBtnText}>🚀 Post Return Listing</Text>}
                </Pressable>
              </View>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const NAVY = '#1A2B4A';
const ORANGE = '#F5A623';
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4F7FB', padding: 16 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  title: { fontSize: 20, fontWeight: '800', color: NAVY },
  subtitle: { fontSize: 12, color: '#5A6B85', marginTop: 2 },
  backBtnText: { color: ORANGE, fontWeight: '700', fontSize: 14 },

  postBtn: { backgroundColor: NAVY, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
  postBtnText: { color: ORANGE, fontWeight: '800', fontSize: 12 },

  card: { backgroundColor: 'white', borderRadius: 12, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#D8E0EA' },
  routeHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  routeText: { fontSize: 15, fontWeight: '800', color: NAVY },
  discountBadge: { backgroundColor: '#E8F8F0', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, borderWidth: 1, borderColor: '#27AE60' },
  discountText: { color: '#27AE60', fontWeight: '800', fontSize: 11 },

  details: { fontSize: 12, color: '#5A6B85', marginBottom: 4 },
  remarks: { fontSize: 12, color: '#1A2B4A', italic: 'italic', marginBottom: 12 },

  priceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: '#E8EDF3', paddingTop: 10 },
  origPrice: { fontSize: 11, color: '#8895A8', textDecorationLine: 'line-through' },
  discPrice: { fontSize: 18, fontWeight: '900', color: '#27AE60' },
  claimBtn: { backgroundColor: ORANGE, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8 },
  claimBtnText: { color: 'white', fontWeight: '800', fontSize: 13 },

  emptyCard: { backgroundColor: 'white', padding: 24, borderRadius: 12, alignItems: 'center', marginTop: 20, borderWidth: 1, borderColor: '#D8E0EA' },
  emptyTitle: { fontSize: 15, fontWeight: '800', color: NAVY, marginBottom: 6 },
  emptySub: { fontSize: 12, color: '#5A6B85', textAlign: 'center' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', padding: 20 },
  modalCard: { backgroundColor: 'white', borderRadius: 16, padding: 20 },
  modalTitle: { fontSize: 18, fontWeight: '800', color: NAVY, marginBottom: 2 },
  modalSub: { fontSize: 12, color: '#5A6B85', marginBottom: 16 },
  inputLabel: { fontSize: 11, fontWeight: '700', color: '#8895A8', marginTop: 10, marginBottom: 4 },
  input: { backgroundColor: '#F4F7FB', borderWidth: 1, borderColor: '#D8E0EA', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, fontSize: 13, color: NAVY },
  cancelBtn: { flex: 1, paddingVertical: 12, borderRadius: 8, borderWidth: 1, borderColor: '#D8E0EA', alignItems: 'center' },
  cancelBtnText: { color: '#5A6B85', fontWeight: '700' },
  submitPostBtn: { flex: 1, backgroundColor: NAVY, paddingVertical: 12, borderRadius: 8, alignItems: 'center' },
  submitPostBtnText: { color: ORANGE, fontWeight: '800' },
});
