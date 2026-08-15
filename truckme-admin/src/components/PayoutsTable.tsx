import React from 'react';
import { PayoutRequest } from '../types';
import axios from 'axios';
import { API_HOST } from '../api/adminClient';

interface PayoutsTableProps {
  payouts: PayoutRequest[];
  onRefresh: () => void;
}

export const PayoutsTable: React.FC<PayoutsTableProps> = ({ payouts, onRefresh }) => {
  const approvePayout = async (payoutId: string, driverName: string, amount: number) => {
    const bankRef = window.prompt(
      `Enter Bank Transfer Reference Number for ${driverName} (LKR ${amount.toLocaleString()}):`,
      `REF-${Math.floor(100000 + Math.random() * 900000)}`
    );
    if (!bankRef) return;

    try {
      const res = await axios.post(
        `${API_HOST}/api/payouts/admin/${payoutId}/approve`,
        { bankReferenceNumber: bankRef },
        { headers: { 'bypass-tunnel-reminder': 'true' } }
      );
      alert(res.data.message || 'Payout approved and transferred!');
      onRefresh();
    } catch (e) {
      alert('Failed to process payout');
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
                  onClick={() => approvePayout(p.id, p.driverName, p.amount)}
                >
                  Process Bank Transfer ✓
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
