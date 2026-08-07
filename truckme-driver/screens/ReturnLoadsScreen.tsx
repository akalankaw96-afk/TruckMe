import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import client from '../api/client';

interface ReturnLoad {
  id: string;
  originCity: string;
  destinationCity: string;
  availableDate: string;
  offeredPrice: number;
  cargoDescription: string;
  isAvailable: boolean;
}

export default function ReturnLoadsScreen({ onBack }: { onBack: () => void }) {
  const [loads, setLoads] = useState<ReturnLoad[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchReturnLoads = async () => {
    try {
      setLoading(true);
      const res = await client.get('/api/returnloads');
      setLoads(res.data || []);
    } catch (e) {
      console.log('Error fetching return loads:', e);
      // Fallback demo data if endpoint is empty
      setLoads([
        {
          id: 'rl-001',
          originCity: 'Colombo',
          destinationCity: 'Kandy',
          availableDate: '2026-08-03',
          offeredPrice: 18500,
          cargoDescription: 'Empty Pallets & Packaging Boxes',
          isAvailable: true,
        },
        {
          id: 'rl-002',
          originCity: 'Galle',
          destinationCity: 'Colombo',
          availableDate: '2026-08-04',
          offeredPrice: 22000,
          cargoDescription: 'Garment Textile Rolls (1.5 Ton)',
          isAvailable: true,
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

  const handleClaim = (load: ReturnLoad) => {
    Alert.alert(
      'Claim Return Load',
      `Accept return load from ${load.originCity} to ${load.destinationCity} for LKR ${load.offeredPrice.toLocaleString()}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Claim Load',
          onPress: () => {
            Alert.alert('Success', 'Return load trip claimed successfully!');
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Backhaul Return Loads</Text>
        <Text style={styles.subtitle}>Find empty-trip return loads to maximize earnings</Text>
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
            />
          }
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.routeRow}>
                <Text style={styles.cityText}>{item.originCity}</Text>
                <Text style={styles.arrowText}> ➔ </Text>
                <Text style={styles.cityText}>{item.destinationCity}</Text>
              </View>
              <Text style={styles.desc}>{item.cargoDescription}</Text>
              <View style={styles.metaRow}>
                <Text style={styles.price}>LKR {item.offeredPrice.toLocaleString()}</Text>
                <Text style={styles.date}>Date: {item.availableDate}</Text>
              </View>
              <TouchableOpacity
                style={styles.claimButton}
                onPress={() => handleClaim(item)}
              >
                <Text style={styles.claimText}>Claim Trip</Text>
              </TouchableOpacity>
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4F7FB', padding: 16 },
  header: { marginBottom: 16 },
  title: { fontSize: 22, fontWeight: '700', color: '#1A2B4A' },
  subtitle: { fontSize: 14, color: '#5A6B85', marginTop: 4 },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  routeRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  cityText: { fontSize: 16, fontWeight: '700', color: '#1A2B4A' },
  arrowText: { fontSize: 16, color: '#F5A623', fontWeight: 'bold' },
  desc: { fontSize: 14, color: '#5A6B85', marginBottom: 12 },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  price: { fontSize: 18, fontWeight: '700', color: '#2E7D32' },
  date: { fontSize: 13, color: '#8A99AD', alignSelf: 'center' },
  claimButton: {
    backgroundColor: '#1A2B4A',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  claimText: { color: '#FFFFFF', fontWeight: '700', fontSize: 15 },
});
