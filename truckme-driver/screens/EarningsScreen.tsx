import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  Pressable,
  TextInput,
  Alert,
  ActivityIndicator,
  Modal,
} from 'react-native';
import client, { getStoredUser } from '../api/client';

const NAVY = '#1A2B4A';
const ORANGE = '#F5A623';

const SRI_LANKAN_BANKS = [
  'Commercial Bank of Ceylon',
  'Hatton National Bank (HNB)',
  'Bank of Ceylon (BOC)',
  'Sampath Bank',
  'Peoples Bank',
  'Nations Trust Bank (NTB)',
  'National Development Bank (NDB)',
  'DFCC Bank',
  'Seylan Bank',
];

export default function EarningsScreen({ onBack }: { onBack?: () => void }) {
  const [loading, setLoading] = useState(true);
  const [driverUser, setDriverUser] = useState<any>(null);
  const [summary, setSummary] = useState<any>(null);
  const [payouts, setPayouts] = useState<any[]>([]);

  // Bank Form State
  const [showBankModal, setShowBankModal] = useState(false);
  const [selectedBank, setSelectedBank] = useState(SRI_LANKAN_BANKS[0]);
  const [branchName, setBranchName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [accountHolder, setAccountHolder] = useState('');
  const [savingBank, setSavingBank] = useState(false);

  // Cash-Out Modal State
  const [showCashOutModal, setShowCashOutModal] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [requestingPayout, setRequestingPayout] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const u = await getStoredUser();
      setDriverUser(u);
      const driverId = u?.id || u?.userId;
      if (driverId) {
        const [sumRes, payRes] = await Promise.all([
          client.get(`/api/payouts/driver/${driverId}/summary`),
          client.get(`/api/payouts/history/${driverId}`),
        ]);
        setSummary(sumRes.data);
        setPayouts(payRes.data || []);

        if (sumRes.data?.bankDetails) {
          const bd = sumRes.data.bankDetails;
          setSelectedBank(bd.bankName || SRI_LANKAN_BANKS[0]);
          setBranchName(bd.branchName || '');
          setAccountNumber(bd.accountNumber || '');
          setAccountHolder(bd.accountHolderName || '');
        } else if (u?.fullName) {
          setAccountHolder(u.fullName);
        }
      }
    } catch (e: any) {
      console.warn('Error fetching driver earnings:', e?.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveBankDetails = async () => {
    if (!branchName.trim() || !accountNumber.trim() || !accountHolder.trim()) {
      Alert.alert('Required', 'Please fill in all bank details (Branch, Account Number, Holder Name)');
      return;
    }
    const driverId = driverUser?.id || driverUser?.userId;
    setSavingBank(true);
    try {
      await client.post(`/api/payouts/driver/${driverId}/bank-account`, {
        bankName: selectedBank,
        branchName: branchName.trim(),
        accountNumber: accountNumber.trim(),
        accountHolderName: accountHolder.trim(),
      });
      Alert.alert('Bank Account Saved 🎉', `Direct payouts will be sent to ${selectedBank} (${accountNumber.trim()}).`);
      setShowBankModal(false);
      fetchData();
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.message || 'Unable to save bank details.');
    } finally {
      setSavingBank(false);
    }
  };

  const handleRequestPayout = async () => {
    const amt = parseFloat(withdrawAmount);
    if (isNaN(amt) || amt < 1000) {
      Alert.alert('Minimum Amount', 'Minimum withdrawal amount is LKR 1,000.');
      return;
    }
    if (summary && amt > summary.availableBalance) {
      Alert.alert('Insufficient Balance', `Available balance for payout is LKR ${summary.availableBalance.toLocaleString()}`);
      return;
    }

    const driverId = driverUser?.id || driverUser?.userId;
    setRequestingPayout(true);
    try {
      const res = await client.post('/api/payouts/request', {
        driverId,
        amount: amt,
      });
      Alert.alert('Payout Requested 💸', res.data?.message || 'Cash-out request submitted successfully!');
      setShowCashOutModal(false);
      setWithdrawAmount('');
      fetchData();
    } catch (e: any) {
      Alert.alert('Request Failed ⚠️', e?.response?.data?.message || 'Failed to submit payout request.');
    } finally {
      setRequestingPayout(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={ORANGE} />
        <Text style={{ marginTop: 12, color: '#A8B6CC' }}>Loading Earnings & Payout Wallet...</Text>
      </View>
    );
  }

  const availableBal = summary?.availableBalance || 0;
  const totalEarn = summary?.totalEarnings || 0;
  const cashCollected = summary?.cashCollected || 0;
  const onlineEarn = summary?.onlineEarnings || 0;
  const pendingPayouts = summary?.pendingPayouts || 0;

  return (
    <View style={styles.root}>
      {/* Header */}
      <View style={styles.header}>
        {onBack && (
          <Pressable style={styles.backBtn} onPress={onBack}>
            <Text style={{ fontSize: 18, color: 'white', fontWeight: '800' }}>← Back</Text>
          </Pressable>
        )}
        <Text style={styles.headerTitle}>💳 Driver Wallet & Earnings</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Main Wallet Balance Card */}
        <View style={styles.balanceCard}>
          <Text style={styles.balLabel}>AVAILABLE FOR BANK CASHOUT</Text>
          <Text style={styles.balAmount}>LKR {availableBal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</Text>
          
          {pendingPayouts > 0 && (
            <Text style={styles.pendingText}>⏳ LKR {pendingPayouts.toLocaleString()} Cash-out Processing</Text>
          )}

          <View style={styles.actionRow}>
            <Pressable
              style={[styles.cashOutBtn, availableBal < 1000 && { opacity: 0.5 }]}
              onPress={() => {
                if (!summary?.bankDetailsConfigured) {
                  Alert.alert('Bank Account Required', 'Please set up your Sri Lankan bank account details first.', [
                    { text: 'Set Up Bank', onPress: () => setShowBankModal(true) },
                    { text: 'Cancel' },
                  ]);
                } else {
                  setWithdrawAmount(availableBal.toString());
                  setShowCashOutModal(true);
                }
              }}>
              <Text style={styles.cashOutBtnText}>💸 Instant Cash-Out Request</Text>
            </Pressable>

            <Pressable style={styles.bankBtn} onPress={() => setShowBankModal(true)}>
              <Text style={styles.bankBtnText}>🏦 {summary?.bankDetailsConfigured ? 'Edit Bank Account' : 'Set Bank'}</Text>
            </Pressable>
          </View>
        </View>

        {/* Bank Details Banner */}
        {summary?.bankDetails ? (
          <View style={styles.bankCard}>
            <Text style={styles.bankTitle}>🏦 Direct Payout Bank Account</Text>
            <Text style={styles.bankDetailText}>• Bank: <Text style={{ fontWeight: '800', color: NAVY }}>{summary.bankDetails.bankName}</Text></Text>
            <Text style={styles.bankDetailText}>• Account No: <Text style={{ fontWeight: '800', color: NAVY }}>{summary.bankDetails.accountNumber}</Text></Text>
            <Text style={styles.bankDetailText}>• Holder Name: <Text style={{ fontWeight: '800', color: NAVY }}>{summary.bankDetails.accountHolderName}</Text> ({summary.bankDetails.branchName})</Text>
          </View>
        ) : (
          <Pressable style={styles.bankNoticeCard} onPress={() => setShowBankModal(true)}>
            <Text style={styles.bankNoticeTitle}>⚠️ Action Required: Add Bank Details</Text>
            <Text style={styles.bankNoticeSub}>Add your Commercial Bank, BOC, HNB, or Sampath account to receive direct online trip payouts.</Text>
          </Pressable>
        )}

        {/* Summary Breakdown Grid */}
        <Text style={styles.sectionHeader}>📊 Trip Earnings Breakdown</Text>
        <View style={styles.gridRow}>
          <View style={styles.gridCard}>
            <Text style={styles.gridValue}>LKR {totalEarn.toLocaleString()}</Text>
            <Text style={styles.gridLabel}>Total Driver Earnings</Text>
          </View>
          <View style={styles.gridCard}>
            <Text style={styles.gridValue}>LKR {onlineEarn.toLocaleString()}</Text>
            <Text style={styles.gridLabel}>Online Card Earnings (85%)</Text>
          </View>
        </View>

        <View style={styles.gridRow}>
          <View style={styles.gridCard}>
            <Text style={[styles.gridValue, { color: '#059669' }]}>LKR {cashCollected.toLocaleString()}</Text>
            <Text style={styles.gridLabel}>💵 Cash Collected (100%)</Text>
          </View>
          <View style={styles.gridCard}>
            <Text style={[styles.gridValue, { color: ORANGE }]}>{summary?.completedJobsCount || 0}</Text>
            <Text style={styles.gridLabel}>Completed Trips</Text>
          </View>
        </View>

        {/* Recent Payout Requests */}
        <Text style={styles.sectionHeader}>📜 Bank Payout History</Text>
        {payouts.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={{ color: '#8895A8', fontSize: 13 }}>No cash-out payout requests yet.</Text>
          </View>
        ) : (
          payouts.map((p: any) => (
            <View key={p.id} style={styles.historyCard}>
              <View style={{ flex: 1 }}>
                <Text style={styles.historyAmount}>LKR {p.amount.toLocaleString()}</Text>
                <Text style={styles.historySub}>{p.bankName} • {p.accountNumber}</Text>
                <Text style={{ fontSize: 10, color: '#8895A8', marginTop: 2 }}>{new Date(p.requestedAt).toLocaleString()} ({p.referenceNumber})</Text>
              </View>

              <View style={[
                styles.badge,
                p.status === 'Transferred' ? styles.badgeSuccess : p.status === 'Pending' ? styles.badgePending : styles.badgeError
              ]}>
                <Text style={[
                  styles.badgeText,
                  p.status === 'Transferred' ? styles.badgeSuccessText : p.status === 'Pending' ? styles.badgePendingText : styles.badgeErrorText
                ]}>
                  {p.status === 'Transferred' ? '🟢 Transferred' : p.status === 'Pending' ? '🟡 Processing' : '🔴 Rejected'}
                </Text>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      {/* Bank Account Modal */}
      <Modal visible={showBankModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>🏦 Configure Bank Details</Text>
            <Text style={styles.modalSub}>Payouts are transferred directly into your Sri Lankan bank account.</Text>

            <Text style={styles.label}>Select Bank *</Text>
            <View style={styles.bankPickerBox}>
              {SRI_LANKAN_BANKS.map((b) => (
                <Pressable
                  key={b}
                  style={[styles.bankChip, selectedBank === b && styles.bankChipActive]}
                  onPress={() => setSelectedBank(b)}>
                  <Text style={[styles.bankChipText, selectedBank === b && styles.bankChipTextActive]}>{b}</Text>
                </Pressable>
              ))}
            </View>

            <Text style={styles.label}>Branch Name *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Colombo Fort / Kandy / Galle"
              placeholderTextColor="#8895A8"
              value={branchName}
              onChangeText={setBranchName}
            />

            <Text style={styles.label}>Account Number *</Text>
            <TextInput
              style={styles.input}
              placeholder="1000 8492 0192"
              placeholderTextColor="#8895A8"
              value={accountNumber}
              onChangeText={setAccountNumber}
              keyboardType="number-pad"
            />

            <Text style={styles.label}>Account Holder Full Name *</Text>
            <TextInput
              style={styles.input}
              placeholder="Must match bank passbook name"
              placeholderTextColor="#8895A8"
              value={accountHolder}
              onChangeText={setAccountHolder}
            />

            <Pressable style={styles.saveBtn} onPress={handleSaveBankDetails} disabled={savingBank}>
              {savingBank ? <ActivityIndicator color="white" /> : <Text style={styles.saveBtnText}>Save Bank Account ✓</Text>}
            </Pressable>

            <Pressable style={{ marginTop: 16, alignItems: 'center' }} onPress={() => setShowBankModal(false)}>
              <Text style={{ fontSize: 13, color: '#8895A8', fontWeight: '700' }}>Cancel</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* Cash-Out Modal */}
      <Modal visible={showCashOutModal} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>💸 Instant Cash-Out Request</Text>
            <Text style={styles.modalSub}>Transfer available online earnings to your bank account ({summary?.bankDetails?.bankName}).</Text>

            <Text style={styles.label}>Withdrawal Amount (LKR) *</Text>
            <TextInput
              style={styles.input}
              placeholder="1000"
              placeholderTextColor="#8895A8"
              value={withdrawAmount}
              onChangeText={setWithdrawAmount}
              keyboardType="numeric"
            />
            <Text style={{ fontSize: 11, color: '#5A6B85', marginTop: 4 }}>Minimum withdrawal: LKR 1,000. Available: LKR {availableBal.toLocaleString()}</Text>

            <Pressable style={styles.saveBtn} onPress={handleRequestPayout} disabled={requestingPayout}>
              {requestingPayout ? <ActivityIndicator color="white" /> : <Text style={styles.saveBtnText}>Submit Bank Transfer Request →</Text>}
            </Pressable>

            <Pressable style={{ marginTop: 16, alignItems: 'center' }} onPress={() => setShowCashOutModal(false)}>
              <Text style={{ fontSize: 13, color: '#8895A8', fontWeight: '700' }}>Cancel</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F4F6F9' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: NAVY },
  header: { backgroundColor: NAVY, paddingTop: 44, paddingBottom: 16, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center' },
  backBtn: { marginRight: 12 },
  headerTitle: { fontSize: 20, fontWeight: '800', color: 'white' },
  scroll: { padding: 16, paddingBottom: 40 },

  balanceCard: { backgroundColor: NAVY, borderRadius: 16, padding: 20, marginBottom: 16 },
  balLabel: { fontSize: 10, fontWeight: '800', color: ORANGE, letterSpacing: 1 },
  balAmount: { fontSize: 30, fontWeight: '900', color: 'white', marginTop: 4 },
  pendingText: { fontSize: 12, color: '#FCD34D', marginTop: 4, fontWeight: '600' },
  actionRow: { flexDirection: 'row', gap: 10, marginTop: 18 },
  cashOutBtn: { flex: 1.2, backgroundColor: ORANGE, borderRadius: 10, paddingVertical: 12, alignItems: 'center', justifyContent: 'center' },
  cashOutBtnText: { color: 'white', fontWeight: '800', fontSize: 13 },
  bankBtn: { flex: 0.9, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 10, paddingVertical: 12, alignItems: 'center', justifyContent: 'center' },
  bankBtnText: { color: 'white', fontWeight: '700', fontSize: 12 },

  bankCard: { backgroundColor: 'white', borderRadius: 12, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: '#E2E8F0' },
  bankTitle: { fontSize: 14, fontWeight: '800', color: NAVY, marginBottom: 8 },
  bankDetailText: { fontSize: 13, color: '#475569', marginTop: 2 },

  bankNoticeCard: { backgroundColor: '#FEF3C7', borderRadius: 12, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: '#F59E0B' },
  bankNoticeTitle: { fontSize: 14, fontWeight: '800', color: '#92400E' },
  bankNoticeSub: { fontSize: 12, color: '#B45309', marginTop: 4, lineHeight: 16 },

  sectionHeader: { fontSize: 15, fontWeight: '800', color: NAVY, marginTop: 8, marginBottom: 12 },
  gridRow: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  gridCard: { flex: 1, backgroundColor: 'white', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#E2E8F0' },
  gridValue: { fontSize: 18, fontWeight: '800', color: NAVY },
  gridLabel: { fontSize: 11, color: '#64748B', marginTop: 4, fontWeight: '600' },

  emptyCard: { backgroundColor: 'white', borderRadius: 12, padding: 16, alignItems: 'center' },
  historyCard: { backgroundColor: 'white', borderRadius: 12, padding: 14, marginBottom: 8, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#E2E8F0' },
  historyAmount: { fontSize: 16, fontWeight: '800', color: NAVY },
  historySub: { fontSize: 12, color: '#475569', marginTop: 2 },

  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  badgeSuccess: { backgroundColor: '#D1FAE5' },
  badgePending: { backgroundColor: '#FEF3C7' },
  badgeError: { backgroundColor: '#FEE2E2' },
  badgeText: { fontSize: 11, fontWeight: '700' },
  badgeSuccessText: { color: '#065F46' },
  badgePendingText: { color: '#92400E' },
  badgeErrorText: { color: '#991B1B' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: 20 },
  modalCard: { backgroundColor: 'white', borderRadius: 16, padding: 20, maxHeight: '85%' },
  modalTitle: { fontSize: 18, fontWeight: '800', color: NAVY, marginBottom: 4 },
  modalSub: { fontSize: 12, color: '#64748B', marginBottom: 12 },
  label: { fontSize: 12, fontWeight: '700', color: NAVY, marginTop: 10, marginBottom: 4 },
  input: { borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 8, padding: 10, fontSize: 14, color: NAVY },
  saveBtn: { backgroundColor: ORANGE, borderRadius: 10, paddingVertical: 12, alignItems: 'center', marginTop: 16 },
  saveBtnText: { color: 'white', fontWeight: '800', fontSize: 15 },

  bankPickerBox: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginVertical: 4 },
  bankChip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6, borderWidth: 1, borderColor: '#CBD5E1', backgroundColor: '#F8FAFC' },
  bankChipActive: { backgroundColor: NAVY, borderColor: NAVY },
  bankChipText: { fontSize: 11, color: '#475569', fontWeight: '600' },
  bankChipTextActive: { color: 'white', fontWeight: '700' },
});
