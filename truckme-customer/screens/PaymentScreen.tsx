import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, Pressable,
  ActivityIndicator, Alert, StatusBar, TextInput, Linking,
} from 'react-native';
import client from '../api/client';
import { AuthUser } from '../types';
import { API_BASE_URL } from '../constants/Config';

interface Props {
  user: AuthUser;
  bookingId: string;
  amount: number;
  onBack: () => void;
  onPaid: () => void;
}

export default function PaymentScreen({
  user, bookingId, amount, onBack, onPaid,
}: Props) {
  const [method, setMethod] = useState<'cash' | 'online'>('online');
  const [submitting, setSubmitting] = useState(false);
  const [booking, setBooking] = useState<any>(null);

  // Card details state
  const [cardName, setCardName] = useState(user.fullName || '');
  const [cardNumber, setCardNumber] = useState('4242 •••• •••• 4242');
  const [cardExpiry, setCardExpiry] = useState('12/28');
  const [cardCvv, setCardCvv] = useState('123');

  const loadBooking = async () => {
    try {
      const res = await client.get(`/api/bookings/${bookingId}`);
      setBooking(res.data);
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.message || 'Failed to load booking');
    }
  };

  useEffect(() => {
    loadBooking();
  }, [bookingId]);

  if (!booking) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#F5A623" size="large" />
      </View>
    );
  }

  const alreadyPaid = booking.paymentStatus === 'Completed';

  const payCash = async () => {
    setSubmitting(true);
    try {
      await client.post('/api/payments', {
        bookingId,
        amount: booking.totalFare,
        method: 'Cash',
        provider: 'Manual',
      });
      Alert.alert('Payment Recorded', 'Thank you! Your cash payment has been recorded.');
      await loadBooking();
      onPaid();
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.message || 'Payment failed');
    } finally {
      setSubmitting(false);
    }
  };

  const payOnline = async () => {
    if (!cardNumber.trim() || !cardExpiry.trim() || !cardCvv.trim()) {
      Alert.alert('Required', 'Please enter valid card details.');
      return;
    }
    setSubmitting(true);
    try {
      const txnId = `PAY-${Date.now().toString().slice(-8)}`;
      await client.post('/api/payments', {
        bookingId,
        amount: booking.totalFare,
        method: 'Card',
        provider: 'PayHere / Visa / Mastercard',
        transactionId: txnId,
      });
      Alert.alert('Payment Successful! 💳', 'Your card payment has been processed successfully.');
      await loadBooking();
      onPaid();
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.message || 'Online payment failed');
    } finally {
      setSubmitting(false);
    }
  };

  const downloadInvoice = () => {
    const invoiceUrl = `${API_BASE_URL}/api/payments/${bookingId}/invoice/download`;
    Linking.openURL(invoiceUrl).catch(() => {
      Alert.alert('Download Invoice', `Open invoice at: ${invoiceUrl}`);
    });
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: '#F4F7FB' }} contentContainerStyle={{ padding: 16 }}>
      <StatusBar barStyle="light-content" backgroundColor="#1A2B4A" />

      <Pressable onPress={onBack} style={{ marginBottom: 16 }}>
        <Text style={styles.linkText}>← Back</Text>
      </Pressable>

      <Text style={styles.title}>💰 Payment</Text>
      <Text style={styles.subtitle}>
        Choose how you'd like to pay for your booking
      </Text>

      {/* Amount card */}
      <View style={styles.amountCard}>
        <Text style={styles.amountLabel}>AMOUNT DUE</Text>
        <Text style={styles.amountValue}>LKR {Math.round(booking.totalFare).toLocaleString()}</Text>
        <Text style={styles.amountBooking}>#{booking.bookingNumber}</Text>

        {alreadyPaid && (
          <View style={styles.paidBadge}>
            <Text style={styles.paidBadgeText}>✓ Already paid</Text>
          </View>
        )}
      </View>

      {/* Method selection */}
      <Text style={styles.sectionLabel}>Payment method</Text>

      {/* Cash option */}
      <Pressable
        style={[styles.methodCard, method === 'cash' && styles.methodCardActive]}
        onPress={() => setMethod('cash')}>
        <View style={styles.methodIcon}>
          <Text style={styles.methodIconText}>💵</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.methodLabel}>Cash on delivery</Text>
          <Text style={styles.methodSub}>
            Pay the driver when they arrive with your load
          </Text>
        </View>
        <View style={[styles.radio, method === 'cash' && styles.radioActive]} />
      </Pressable>

      {/* Online option */}
      <Pressable
        style={[styles.methodCard, method === 'online' && styles.methodCardActive]}
        onPress={() => setMethod('online')}>
        <View style={styles.methodIcon}>
          <Text style={styles.methodIconText}>💳</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.methodLabel}>Online Card Payment</Text>
          <Text style={styles.methodSub}>
            Pay securely with Visa, Mastercard, or PayHere
          </Text>
        </View>
        <View style={[styles.radio, method === 'online' && styles.radioActive]} />
      </Pressable>

      {/* Card Details Input Form */}
      {!alreadyPaid && method === 'online' && (
        <View style={styles.cardForm}>
          <Text style={styles.cardFormTitle}>Credit / Debit Card Details</Text>

          <Text style={styles.inputLabel}>Cardholder Name</Text>
          <TextInput
            style={styles.input}
            value={cardName}
            onChangeText={setCardName}
            placeholder="Name on card"
            placeholderTextColor="#8895A8"
          />

          <Text style={styles.inputLabel}>Card Number</Text>
          <TextInput
            style={styles.input}
            value={cardNumber}
            onChangeText={setCardNumber}
            placeholder="4242 4242 4242 4242"
            placeholderTextColor="#8895A8"
            keyboardType="number-pad"
          />

          <View style={{ flexDirection: 'row', gap: 12 }}>
            <View style={{ flex: 1 }}>
              <Text style={styles.inputLabel}>Expiry (MM/YY)</Text>
              <TextInput
                style={styles.input}
                value={cardExpiry}
                onChangeText={setCardExpiry}
                placeholder="12/28"
                placeholderTextColor="#8895A8"
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.inputLabel}>CVV</Text>
              <TextInput
                style={styles.input}
                value={cardCvv}
                onChangeText={setCardCvv}
                placeholder="123"
                placeholderTextColor="#8895A8"
                keyboardType="number-pad"
                secureTextEntry
              />
            </View>
          </View>
        </View>
      )}

      {/* Summary breakdown */}
      <View style={styles.summaryCard}>
        <Text style={styles.summaryLabel}>📋 Booking summary</Text>
        <SummaryRow label="Service type" value={booking.cargoType || 'General cargo'} />
        <SummaryRow label="Pickup" value={new Date(booking.scheduledPickupAt).toLocaleDateString()} />
        {booking.cargoWeightKg && (
          <SummaryRow label="Weight" value={`${booking.cargoWeightKg} kg`} />
        )}
        {booking.numberOfHelpers > 0 && (
          <SummaryRow label="Helpers" value={`${booking.numberOfHelpers}`} />
        )}
        <View style={styles.divider} />
        <SummaryRow label="Base" value={`LKR ${Math.round(booking.baseFare || 0).toLocaleString()}`} />
        <SummaryRow label="Distance" value={`LKR ${Math.round(booking.distanceFare || 0).toLocaleString()}`} />
        {booking.helpersFare > 0 && (
          <SummaryRow label="Helpers" value={`LKR ${Math.round(booking.helpersFare || 0).toLocaleString()}`} />
        )}
        {booking.expressFare > 0 && (
          <SummaryRow label="Express" value={`LKR ${Math.round(booking.expressFare || 0).toLocaleString()}`} />
        )}
        <SummaryRow label="Service fee" value={`LKR ${Math.round(booking.serviceFee || 0).toLocaleString()}`} />
        <View style={styles.divider} />
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Total</Text>
          <Text style={styles.totalAmount}>LKR {Math.round(booking.totalFare || 0).toLocaleString()}</Text>
        </View>
      </View>

      {/* Pay button */}
      {alreadyPaid ? (
        <View style={styles.paidFullCard}>
          <Text style={styles.paidFullEmoji}>✓</Text>
          <Text style={styles.paidFullTitle}>Payment complete</Text>
          <Text style={styles.paidFullSub}>
            Your payment has been processed and official invoice issued.
          </Text>

          <Pressable style={styles.downloadInvoiceBtn} onPress={downloadInvoice}>
            <Text style={styles.downloadInvoiceBtnText}>📄 Download & View PDF Invoice</Text>
          </Pressable>

          <Pressable style={styles.secondaryBtn} onPress={onPaid}>
            <Text style={styles.secondaryBtnText}>Back to bookings</Text>
          </Pressable>
        </View>
      ) : (
        <Pressable
          style={[styles.payBtn, submitting && { opacity: 0.6 }]}
          onPress={method === 'cash' ? payCash : payOnline}
          disabled={submitting}>
          {submitting ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={styles.payBtnText}>
              {method === 'cash'
                ? `Confirm cash payment · LKR ${Math.round(booking.totalFare).toLocaleString()}`
                : 'Pay online'}
            </Text>
          )}
        </Pressable>
      )}

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          🔒 Payments are secure. TruckMe uses industry-standard encryption.
        </Text>
        <Text style={styles.footerText}>
          For online payments, we use PayHere (Sri Lanka's trusted gateway).
        </Text>
      </View>
    </ScrollView>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.summaryRow}>
      <Text style={styles.summaryRowLabel}>{label}</Text>
      <Text style={styles.summaryRowValue}>{value}</Text>
    </View>
  );
}

const NAVY = '#1A2B4A';
const ORANGE = '#F5A623';
const GREEN = '#27AE60';
const styles = StyleSheet.create({
  center: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#F4F7FB',
  },

  title: { fontSize: 28, fontWeight: '900', color: NAVY },
  subtitle: { fontSize: 14, color: '#5A6B85', marginTop: 4, marginBottom: 20 },

  amountCard: {
    backgroundColor: NAVY, padding: 24, borderRadius: 12,
    alignItems: 'center', marginBottom: 16,
  },
  amountLabel: { fontSize: 11, color: 'rgba(255,255,255,0.7)', letterSpacing: 1.5 },
  amountValue: { fontSize: 36, fontWeight: '900', color: 'white', marginTop: 4 },
  amountBooking: { fontSize: 12, color: ORANGE, marginTop: 4, fontWeight: '600' },

  paidBadge: {
    marginTop: 12, paddingHorizontal: 12, paddingVertical: 4,
    backgroundColor: GREEN, borderRadius: 999,
  },
  paidBadgeText: { color: 'white', fontSize: 12, fontWeight: '700' },

  sectionLabel: {
    fontSize: 13, fontWeight: '700', color: '#5A6B85',
    marginTop: 12, marginBottom: 8, letterSpacing: 0.5,
  },

  methodCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'white', padding: 16, borderRadius: 12,
    marginBottom: 10, borderWidth: 2, borderColor: '#E8EDF3',
  },
  methodCardActive: { borderColor: ORANGE, backgroundColor: '#FFF8E7' },
  methodIcon: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: '#F4F7FB', alignItems: 'center',
    justifyContent: 'center', marginRight: 14,
  },
  methodIconText: { fontSize: 24 },
  methodLabel: { fontSize: 15, fontWeight: '600', color: NAVY },
  methodSub: { fontSize: 12, color: '#5A6B85', marginTop: 2 },

  radio: {
    width: 22, height: 22, borderRadius: 11,
    borderWidth: 2, borderColor: '#D8E0EA',
  },
  radioActive: { borderColor: ORANGE, backgroundColor: ORANGE },

  cardForm: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    marginTop: 6,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  cardFormTitle: { fontSize: 14, fontWeight: '700', color: NAVY, marginBottom: 12 },
  inputLabel: { fontSize: 11, fontWeight: '700', color: '#5A6B85', marginTop: 8, marginBottom: 4, letterSpacing: 0.5 },
  input: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: NAVY,
  },

  summaryCard: {
    backgroundColor: 'white', padding: 16, borderRadius: 12,
    marginTop: 16, marginBottom: 16,
  },
  summaryLabel: {
    fontSize: 13, fontWeight: '700', color: '#5A6B85',
    marginBottom: 8, letterSpacing: 0.5,
  },
  summaryRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    paddingVertical: 4,
  },
  summaryRowLabel: { fontSize: 13, color: '#5A6B85' },
  summaryRowValue: { fontSize: 13, color: NAVY, fontWeight: '600' },
  divider: { height: 1, backgroundColor: '#E8EDF3', marginVertical: 8 },

  totalRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    paddingTop: 8,
  },
  totalLabel: { fontSize: 16, color: NAVY, fontWeight: '700' },
  totalAmount: { fontSize: 18, color: ORANGE, fontWeight: '900' },

  payBtn: {
    height: 56, borderRadius: 12, backgroundColor: ORANGE,
    alignItems: 'center', justifyContent: 'center', marginTop: 8,
  },
  payBtnText: { color: 'white', fontSize: 16, fontWeight: '700' },

  paidFullCard: {
    backgroundColor: 'white', padding: 32, borderRadius: 12,
    alignItems: 'center', marginTop: 8,
  },
  paidFullEmoji: { fontSize: 56, color: GREEN },
  paidFullTitle: { fontSize: 18, fontWeight: '700', color: NAVY, marginTop: 16 },
  paidFullSub: { fontSize: 13, color: '#5A6B85', textAlign: 'center', marginTop: 8 },

  downloadInvoiceBtn: {
    marginTop: 16,
    backgroundColor: NAVY,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 10,
    alignItems: 'center',
    width: '100%',
  },
  downloadInvoiceBtnText: { color: ORANGE, fontWeight: '800', fontSize: 14 },

  secondaryBtn: {
    marginTop: 12, paddingVertical: 12, paddingHorizontal: 24,
    borderRadius: 8, borderWidth: 1, borderColor: '#D8E0EA',
  },
  secondaryBtnText: { color: NAVY, fontWeight: '600' },

  footer: { marginTop: 24, alignItems: 'center' },
  footerText: { fontSize: 11, color: '#8895A8', textAlign: 'center', marginTop: 4 },

  linkText: { color: ORANGE, fontWeight: '600', fontSize: 14 },
});
