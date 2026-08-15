import React, { useState } from 'react';
import { CustomerUser } from '../types';
import adminClient from '../api/adminClient';

interface CustomersDirectoryProps {
  customers: CustomerUser[];
  onRefresh: () => void;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const CustomersDirectory: React.FC<CustomersDirectoryProps> = ({ customers, onRefresh, showToast }) => {
  const [search, setSearch] = useState('');
  const [confirmTarget, setConfirmTarget] = useState<CustomerUser | null>(null);

  const filtered = customers.filter(
    (c) =>
      c.fullName.toLowerCase().includes(search.toLowerCase()) ||
      (c.phoneNumber && c.phoneNumber.includes(search)) ||
      (c.email && c.email.toLowerCase().includes(search.toLowerCase()))
  );

  const executeToggleStatus = async () => {
    if (!confirmTarget) return;
    try {
      const res = await adminClient.post(`/customers/${confirmTarget.id}/toggle-status`);
      showToast(res.data.message || 'Customer status updated', 'success');
      setConfirmTarget(null);
      onRefresh();
    } catch (e) {
      showToast('Failed to update customer status', 'error');
    }
  };

  return (
    <div>
      <div className="controls-bar">
        <div className="search-box">
          🔍{' '}
          <input
            type="text"
            placeholder="Search customers by name, phone, email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Custom Confirmation Popup Modal */}
      {confirmTarget && (
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
              maxWidth: '460px',
              width: '90%',
              boxShadow: '0 20px 50px rgba(0,0,0,0.3)',
              border: confirmTarget.isActive ? '2px solid var(--orange)' : '2px solid var(--green)',
            }}
          >
            <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--navy)', marginBottom: '12px' }}>
              {confirmTarget.isActive ? '⚠️ Suspend Customer Account?' : '✅ Activate Customer Account?'}
            </div>
            <div style={{ fontSize: '14px', color: '#334155', lineHeight: 1.5, marginBottom: '16px', fontWeight: 600 }}>
              {confirmTarget.isActive
                ? `Are you sure you want to SUSPEND '${confirmTarget.fullName}'? The customer will be unable to place new bookings until reactivated.`
                : `Are you sure you want to ACTIVATE '${confirmTarget.fullName}'? The customer will regain full booking capabilities.`}
            </div>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={executeToggleStatus}
                style={{
                  flex: 1,
                  background: confirmTarget.isActive ? 'var(--orange)' : 'var(--green)',
                  color: confirmTarget.isActive ? 'var(--navy)' : 'white',
                  border: 'none',
                  padding: '12px',
                  borderRadius: '10px',
                  fontWeight: 800,
                  fontSize: '14px',
                  cursor: 'pointer',
                }}
              >
                {confirmTarget.isActive ? 'Yes, Suspend Account' : 'Yes, Activate Account'}
              </button>
              <button
                onClick={() => setConfirmTarget(null)}
                style={{
                  flex: 1,
                  background: '#F1F5F9',
                  color: 'var(--navy)',
                  border: '1px solid var(--border)',
                  padding: '12px',
                  borderRadius: '10px',
                  fontWeight: 700,
                  fontSize: '14px',
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Customer Name</th>
              <th>Contact Phone</th>
              <th>Email Address</th>
              <th>Total Trips</th>
              <th>Total Spent (LKR)</th>
              <th>Account Status</th>
              <th>Joined Date</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)', fontWeight: 700 }}>
                  No registered customers found.
                </td>
              </tr>
            ) : (
              filtered.map((c) => (
                <tr key={c.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div className="user-avatar-sm">{(c.fullName || 'C')[0]}</div>
                      <div>
                        <strong>{c.fullName}</strong>
                      </div>
                    </div>
                  </td>
                  <td>📞 {c.phoneNumber || 'N/A'}</td>
                  <td>✉️ {c.email}</td>
                  <td>
                    <strong style={{ color: 'var(--navy)' }}>{c.totalTrips} Trips</strong>
                  </td>
                  <td>
                    <strong style={{ color: 'var(--green)' }}>LKR {c.totalSpent.toLocaleString()}</strong>
                  </td>
                  <td>
                    <span className={`status-tag ${c.isActive ? 'status-Active' : 'status-Suspended'}`}>
                      {c.isActive ? 'Active' : 'Suspended'}
                    </span>
                  </td>
                  <td style={{ color: 'var(--text-muted)', fontSize: '12px' }}>
                    {new Date(c.createdAt).toLocaleDateString()}
                  </td>
                  <td>
                    <button className="btn-action" onClick={() => setConfirmTarget(c)}>
                      {c.isActive ? 'Suspend' : 'Activate'}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
