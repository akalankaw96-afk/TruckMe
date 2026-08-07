import React, { useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, Pressable,
  TextInput, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import client from '../api/client';

interface Props {
  userId: string;
  bookingId: string;
  driverId?: string;
  vehicleId?: string;
  onBack: () => void;
  onRated: () => void;
}

export default function RatingScreen({
  userId, bookingId, driverId, vehicleId, onBack, onRated,
}: Props) {
  const [driverRating, setDriverRating] = useState(0);
  const [vehicleRating, setVehicleRating] = useState(0);
  const [serviceRating, setServiceRating] = useState(0);
  const [punctualityRating, setPunctualityRating] = useState(0);
  const [comment, setComment] = useState('');
  const [tags, setTags] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const Star = ({ filled, onPress, size = 36 }: { filled: boolean; onPress: () => void; size?: number }) => (
    <Pressable onPress={onPress} hitSlop={6}>
      <Text style={[styles.star, { fontSize: size }, filled && styles.starFilled]}>★</Text>
    </Pressable>
  );

  const Rating = ({
    label, value, onChange,
  }: { label: string; value: number; onChange: (n: number) => void }) => (
    <View style={styles.ratingRow}>
      <Text style={styles.ratingLabel}>{label}</Text>
      <View style={styles.starRow}>
        {[1, 2, 3, 4, 5].map(n => (
          <Star key={n} filled={n <= value} onPress={() => onChange(n)} />
        ))}
      </View>
    </View>
  );

  const allRated = driverRating > 0 && vehicleRating > 0 && serviceRating > 0 && punctualityRating > 0;

  const submit = async () => {
    if (!allRated) {
      Alert.alert('Required', 'Please rate all four categories');
      return;
    }
    setSubmitting(true);
    try {
      await client.post('/api/ratings', {
        bookingId,
        customerUserId: userId,
        driverRating,
        vehicleConditionRating: vehicleRating,
        serviceQualityRating: serviceRating,
        punctualityRating,
        comment,
        tags,
        isAnonymous: false,
      });
      Alert.alert('Thanks!', 'Your feedback helps improve TruckMe');
      onRated();
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.message || e?.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: '#F4F7FB' }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={{ padding: 20 }} keyboardShouldPersistTaps="handled">
        <Pressable onPress={onBack} style={{ marginBottom: 16 }}>
          <Text style={styles.linkText}>← Back</Text>
        </Pressable>

        <Text style={styles.title}>Rate your experience</Text>
        <Text style={styles.subtitle}>
          Help other customers by sharing your experience with this booking
        </Text>

        {/* Summary card */}
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Booking</Text>
          <Text style={styles.summaryValue}>#{bookingId.substring(0, 8)}</Text>
          <Text style={styles.summarySub}>Rate each category from 1 to 5 stars</Text>
        </View>

        {/* Star ratings */}
        <View style={styles.card}>
          <Rating label="🚚 Driver" value={driverRating} onChange={setDriverRating} />
          <View style={styles.divider} />
          <Rating label="🚛 Vehicle condition" value={vehicleRating} onChange={setVehicleRating} />
          <View style={styles.divider} />
          <Rating label="✨ Service quality" value={serviceRating} onChange={setServiceRating} />
          <View style={styles.divider} />
          <Rating label="⏰ Punctuality" value={punctualityRating} onChange={setPunctualityRating} />
        </View>

        {/* Comment */}
        <Text style={styles.label}>Comment (optional)</Text>
        <TextInput
          style={styles.input}
          value={comment}
          onChangeText={setComment}
          placeholder="How was your experience?"
          placeholderTextColor="#8895A8"
          multiline
        />

        {/* Tags */}
        <Text style={styles.label}>Tags (comma separated)</Text>
        <TextInput
          style={styles.input}
          value={tags}
          onChangeText={setTags}
          placeholder="polite, fast, careful"
          placeholderTextColor="#8895A8"
        />

        {/* Quick tag chips */}
        <View style={styles.tagRow}>
          {['polite', 'fast', 'careful', 'clean', 'professional', 'late'].map(t => (
            <Pressable
              key={t}
              style={[styles.tagChip, tags.includes(t) && styles.tagChipActive]}
              onPress={() => {
                const list = tags ? tags.split(',').map(s => s.trim()) : [];
                if (list.includes(t)) {
                  setTags(list.filter(x => x !== t).join(', '));
                } else {
                  setTags([...list, t].join(', '));
                }
              }}>
              <Text style={[styles.tagChipText, tags.includes(t) && styles.tagChipTextActive]}>{t}</Text>
            </Pressable>
          ))}
        </View>

        <Pressable
          style={[styles.submitBtn, (submitting || !allRated) && { opacity: 0.6 }]}
          onPress={submit}
          disabled={submitting || !allRated}>
          <Text style={styles.submitBtnText}>
            {submitting ? 'Submitting...' : 'Submit rating'}
          </Text>
        </Pressable>

        <View style={styles.summaryStats}>
          <Text style={styles.summaryStatsLabel}>Your ratings:</Text>
          <Text style={styles.summaryStatsValue}>
            Driver {driverRating}/5 · Vehicle {vehicleRating}/5 · Service {serviceRating}/5 · Punctuality {punctualityRating}/5
          </Text>
          {allRated && (
            <Text style={styles.summaryStatsAvg}>
              Average: {((driverRating + vehicleRating + serviceRating + punctualityRating) / 4).toFixed(2)} / 5
              {((driverRating + vehicleRating + serviceRating + punctualityRating) / 4) >= 4 && ' 🌟'}
            </Text>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const NAVY = '#1A2B4A';
const ORANGE = '#F5A623';

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F4F7FB' },
  title: { fontSize: 24, fontWeight: '700', color: NAVY },
  subtitle: { fontSize: 14, color: '#5A6B85', marginTop: 4, marginBottom: 20 },

  summaryCard: {
    backgroundColor: NAVY, padding: 20, borderRadius: 12, marginBottom: 16,
  },
  summaryLabel: { fontSize: 11, color: 'rgba(255,255,255,0.7)', letterSpacing: 1.5 },
  summaryValue: { fontSize: 20, fontWeight: '900', color: 'white', marginTop: 4 },
  summarySub: { fontSize: 12, color: 'rgba(255,255,255,0.7)', marginTop: 8 },

  card: { backgroundColor: 'white', padding: 20, borderRadius: 12, marginBottom: 16 },
  ratingRow: {
    paddingVertical: 8,
  },
  ratingLabel: { fontSize: 15, fontWeight: '600', color: NAVY, marginBottom: 8 },
  starRow: { flexDirection: 'row' },
  star: { color: '#D8E0EA', marginHorizontal: 2 },
  starFilled: { color: '#F5A623' },

  divider: { height: 1, backgroundColor: '#E8EDF3', marginVertical: 8 },

  label: { fontSize: 13, fontWeight: '600', color: '#5A6B85', marginTop: 16, marginBottom: 8 },
  input: {
    borderWidth: 1, borderColor: '#D8E0EA', borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 12, fontSize: 14, color: NAVY,
    backgroundColor: 'white', minHeight: 48,
  },

  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  tagChip: {
    paddingHorizontal: 12, paddingVertical: 6,
    backgroundColor: 'white', borderRadius: 999,
    borderWidth: 1, borderColor: '#D8E0EA',
  },
  tagChipActive: { backgroundColor: ORANGE, borderColor: ORANGE },
  tagChipText: { color: '#5A6B85', fontSize: 12, fontWeight: '600' },
  tagChipTextActive: { color: 'white' },

  submitBtn: {
    height: 52, borderRadius: 10, backgroundColor: ORANGE,
    alignItems: 'center', justifyContent: 'center', marginTop: 20,
  },
  submitBtnText: { color: 'white', fontSize: 16, fontWeight: '700' },

  linkText: { color: ORANGE, fontWeight: '600', fontSize: 14 },

  summaryStats: {
    backgroundColor: 'white', padding: 16, borderRadius: 12, marginTop: 16,
  },
  summaryStatsLabel: { fontSize: 12, color: '#5A6B85', marginBottom: 4 },
  summaryStatsValue: { fontSize: 13, color: NAVY, fontWeight: '600' },
  summaryStatsAvg: {
    fontSize: 18, color: ORANGE, fontWeight: '900', marginTop: 8, textAlign: 'center',
  },
});
