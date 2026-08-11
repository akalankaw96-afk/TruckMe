import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, Pressable,
  ActivityIndicator, Alert, StatusBar, RefreshControl,
} from 'react-native';
import client from '../api/client';
import { DriverUser } from '../types';

interface Props {
  user: DriverUser;
  onBack: () => void;
}

const NAVY = '#1A2B4A';
const ORANGE = '#F5A623';
const GREEN = '#27AE60';

export default function SubscriptionScreen({ user, onBack }: Props) {
  const [plans, setPlans] = useState<any[]>([]);
  const [activeSub, setActiveSub] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);

  const loadData = async () => {
    try {
      const [pRes, aRes] = await Promise.all([
        client.get('/api/subscriptions/plans').catch(() => ({ data: [] })),
        client.get(`/api/subscriptions/active/${user.id}`).catch(() => ({ data: null })),
      ]);
      setPlans(pRes.data || []);
      setActiveSub(aRes.data?.hasActiveSubscription ? aRes.data : null);
    } catch (e: any) {
      Alert.alert('Error', 'Failed to load subscription plans');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const buyPlan = async (planId: string, planName: string, price: number) => {
    Alert.alert(
      `Activate ${planName}?`,
      `Price: LKR ${price.toLocaleString()}\nBenefits: 0% Platform Commission on ALL trips!`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm & Activate ⚡',
          onPress: async () => {
            setPurchasing(true);
            try {
              const res = await client.post('/api/subscriptions/purchase', {
                driverId: user.id,
                planId: planId,
              });
              Alert.alert('Subscription Active! 👑', res.data?.message || 'You now enjoy 0% platform commission!');
              await loadData();
            } catch (e: any) {
              Alert.alert('Error', e?.response?.data?.message || 'Failed to activate pass');
            } finally {
              setPurchasing(false);
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={ORANGE} size="large" />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={NAVY} />

      {/* Top Header */}
      <View style={styles.header}>
        <Pressable style={styles.backBtn} onPress={onBack}>
          <Text style={styles.backBtnText}>← Back</Text>
        </Pressable>
        <Text style={styles.headerTitle}>Driver Passes & 0% Commission</Text>
      </View>

      <ScrollView contentContainerStyle={styles.container}>
        
        {/* Active Subscription Banner */}
        {activeSub ? (
          <View style={styles.activeCard}>
            <View style={styles.activeBadgeBox}>
              <Text style={styles.activeBadgeText}>{activeSub.badge}</Text>
            </View>
            <Text style={styles.activeTitle}>{activeSub.planName}</Text>
            <Text style={styles.activeSub}>Status: {activeSub.statusText}</Text>
            <Text style={styles.activeHighlight}>
              🎉 You are keeping 100% of all trip earnings with 0% platform commission!
            </Text>
          </View>
        ) : (
          <View style={styles.bannerCard}>
            <Text style={styles.bannerEmoji}>💎</Text>
            <Text style={styles.bannerTitle}>Earn 100% of Every Trip</Text>
            <Text style={styles.bannerSub}>
              Activate a 0% Commission Pass to eliminate platform fees and keep all fare payouts directly in your pocket.
            </Text>
          </View>
        )}

        <Text style={styles.sectionTitle}>Select a 0% Commission Driver Pass</Text>

        {/* Subscription Plan Tiers */}
        {plans.map((p) => (
          <View key={p.id} style={styles.planCard}>
            <View style={styles.planHeader}>
              <div>
                <Text style={styles.planName}>{p.name}</Text>
                <Text style={styles.planBadge}>{p.badge}</Text>
              </div>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={styles.planPrice}>LKR {p.price?.toLocaleString()}</Text>
                <Text style={styles.planDuration}>/ {p.durationDays} Day(s)</Text>
              </View>
            </View>

            <Text style={styles.planDesc}>{p.description}</Text>

            <Pressable
              style={[styles.buyBtn, activeSub?.planId === p.id && styles.buyBtnDisabled]}
              disabled={purchasing || activeSub?.planId === p.id}
              onPress={() => buyPlan(p.id, p.name, p.price)}>
              <Text style={styles.buyBtnText}>
                {activeSub?.planId === p.id ? '✓ Current Active Pass' : `Activate ${p.name} →`}
              </Text>
            </Pressable>
          </View>
        ))}

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F4F7FA' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: NAVY },
  header: {
    backgroundColor: NAVY, padding: 16, paddingTop: 48,
    flexDirection: 'row', alignItems: 'center', gap: 12,
  },
  backBtn: { paddingHorizontal: 12, paddingVertical: 6, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 8 },
  backBtnText: { color: 'white', fontWeight: '800', fontSize: 13 },
  headerTitle: { fontSize: 16, fontWeight: '800', color: 'white' },
  container: { padding: 16, paddingBottom: 40 },

  bannerCard: {
    backgroundColor: NAVY, borderRadius: 16, padding: 20,
    alignItems: 'center', marginBottom: 20, textAlign: 'center',
  },
  bannerEmoji: { fontSize: 40, marginBottom: 8 },
  bannerTitle: { fontSize: 20, fontWeight: '800', color: ORANGE, marginBottom: 4 },
  bannerSub: { fontSize: 12, color: 'rgba(255,255,255,0.8)', textAlign: 'center', lineHeight: 18 },

  activeCard: {
    backgroundColor: '#0F382C', borderRadius: 16, padding: 20,
    borderWidth: 2, borderColor: GREEN, marginBottom: 20,
  },
  activeBadgeBox: { backgroundColor: GREEN, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, alignSelf: 'flex-start', marginBottom: 8 },
  activeBadgeText: { color: 'white', fontWeight: '900', fontSize: 11 },
  activeTitle: { fontSize: 20, fontWeight: '900', color: 'white', marginBottom: 2 },
  activeSub: { fontSize: 13, color: '#A3E635', fontWeight: '700', marginBottom: 8 },
  activeHighlight: { fontSize: 12, color: 'white', opacity: 0.9 },

  sectionTitle: { fontSize: 15, fontWeight: '800', color: NAVY, marginBottom: 12 },

  planCard: {
    backgroundColor: 'white', borderRadius: 16, padding: 18,
    marginBottom: 14, borderWidth: 1, borderColor: '#D8E0EA',
  },
  planHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  planName: { fontSize: 16, fontWeight: '800', color: NAVY },
  planBadge: { fontSize: 10, fontWeight: '900', color: ORANGE, marginTop: 2 },
  planPrice: { fontSize: 18, fontWeight: '900', color: GREEN },
  planDuration: { fontSize: 11, color: '#8895A8' },
  planDesc: { fontSize: 12, color: '#5A6B85', marginBottom: 14, lineHeight: 18 },

  buyBtn: { backgroundColor: ORANGE, paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
  buyBtnDisabled: { backgroundColor: '#A0AEC0' },
  buyBtnText: { color: NAVY, fontWeight: '900', fontSize: 14 },
});
