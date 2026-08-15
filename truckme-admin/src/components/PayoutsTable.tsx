import React, { useState } from 'react';
import { PayoutRequest } from '../types';
import axios from 'axios';
import { API_HOST } from '../api/adminClient';

interface PayoutsTableProps {
  payouts: PayoutRequest[];
  onRefresh: () => void;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const PayoutsTable: React.FC<PayoutsTableProps> = ({ payouts, onRefresh, showToast }) => {
  const [selectedPayout, setSelectedPayout] = useState<PayoutRequest | null>(null);
  const [bankRef, setBankRef] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const openPayoutModal = (p: PayoutRequest) => {
    setSelectedPayout(p);
    setBankRef(`REF-${Math.floor(100000 + Math.random() * 900000)}`);
  };

  const handleApprovePayout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPayout || !bankRef) return;

    setSubmitting(true);
    try {
      const res = await axios.post(
        `${API_HOST}/api/payouts/admin/${selectedPayout.id}/approve`,
        { bankReferenceNumber: bankRef },
        { headers: { 'bypass-tunnel-reminder': 'true' } }
      );
      showToast(res.data.message || 'Payout approved and transferred!', 'success');
      setSelectedPayout(null);
      onRefresh();
    } catch (e) {
      showToast('Failed to process bank payout transfer', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (payouts.length === 0) {
    return (
      <div className="table-container" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)', fontWeight: 700 }}>
        ✅ No pending driver bank payout requests.
      </div>
    );
  }

  return (
    <div>
      {/* Custom Bank Transfer Reference Modal Popup */}
      {selectedPayout && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(26, 43, 74, 0.75)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 3000,
          }}
        >
          <div
            style={{
              background: 'white',
              borderRadius: '20px',
              padding: '28px',
              maxWidth: '480px',
              width: '90%',
              boxShadow: '0 20px 50px rgba(0,0,0,0.3)',
            }}
          >
            <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--navy)', marginBottom: '12px' }}>
              🏦 Process Bank Payout Transfer
            </div>

            <div style={{ background: '#F8FAFC', padding: '14px', borderRadius: '12px', marginBottom: '16px', fontSize: '13px', display: 'grid', gap: '4px' }}>
              <div><strong>Driver Name:</strong> {selectedPayout.driverName}</div>
              <div><strong>Withdrawal Amount:</strong> <span style={{ color: 'var(--green)', fontWeight: 800 }}>LKR {selectedPayout.amount.toLocaleString()}</span></div>
              <div><strong>Bank & Branch:</strong> {selectedPayout.bankName} ({selectedPayout.branchName})</div>
              <div><strong>Account Number:</strong> {selectedPayout.accountNumber}</div>
              <div><strong>Account Holder:</strong> {selectedPayout.accountHolderName}</div>
            </div>

            <form onSubmit={handleApprovePayout} style={{ display: 'grid', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)' }}>
                  Bank Transfer Reference Number *
                </label>
                <input
                  type="text"
                  value={bankRef}
                  onChange={(e) => setBankRef(e.target.value)}
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border)', marginTop: '4px', fontWeight: 700 }}
                  required
                />
              </div>

              <div style={{ display: 'flex', gap: '12px', marginTop: '10px' }}>
                <button
                  type="submit"
                  disabled={submitting}
                  style={{ flex: 1, background: 'var(--green)', color: 'white', border: 'none', padding: '12px', borderRadius: '10px', fontWeight: 800, fontSize: '14px', cursor: 'pointer' }}
                >
                  {submitting ? 'Processing...' : 'Confirm Bank Transfer ✓'}
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedPayout(null)}
                  style={{ flex: 1, background: '#F1F5F9', color: 'var(--navy)', border: '1px solid var(--border)', padding: '12px', borderRadius: '10px', fontWeight: 700, fontSize: '14px', cursor: 'pointer' }}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Request Ref</th>
              <th>Driver Name</th>
              <th>Withdrawal Amount</th>
              <th>Bank Name</th>
              <th>Account Details</th>
              <th>Requested Date</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {payouts.map((p) => (
              <tr key={p.id}>
                <td style={{ fontWeight: 800, color: 'var(--orange)' }}>{p.referenceNumber}</td>
                <td>
                  <strong>{p.driverName}</strong>
                </td>
                <td style={{ fontWeight: 800, color: 'var(--green)' }}>LKR {p.amount.toLocaleString()}</td>
                <td>🏦 {p.bankName}</td>
                <td>
                  Account: <strong>{p.accountNumber}</strong>
                  <br />
                  <span style={{ color: 'var(--text-muted)', fontSize: '11px' }}>
                    {p.accountHolderName} ({p.branchName})
                  </span>
                </td>
                <td style={{ color: 'var(--text-muted)', fontSize: '12px' }}>
                  {new Date(p.requestedAt).toLocaleString()}
                </td>
                <td>
                  <button
                    className="btn-approve"
                    style={{ padding: '6px 12px', fontSize: '12px' }}
                    onClick={() => openPayoutModal(p)}
                  >
                    Process Bank Transfer ✓
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
