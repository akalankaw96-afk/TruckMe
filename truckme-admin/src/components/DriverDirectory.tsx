import React, { useState } from 'react';
import { DriverPartner } from '../types';
import adminClient from '../api/adminClient';

interface DriverDirectoryProps {
  drivers: DriverPartner[];
  onRefresh: () => void;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const DriverDirectory: React.FC<DriverDirectoryProps> = ({ drivers, onRefresh, showToast }) => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'online' | 'approved' | 'pending'>('all');
  const [confirmDriver, setConfirmDriver] = useState<{ driver: DriverPartner; approve: boolean } | null>(null);

  let filtered = drivers.filter(
    (d) =>
      d.fullName.toLowerCase().includes(search.toLowerCase()) ||
      (d.vehiclePlateNumber && d.vehiclePlateNumber.toLowerCase().includes(search.toLowerCase())) ||
      (d.phoneNumber && d.phoneNumber.includes(search))
  );

  if (statusFilter === 'online') filtered = filtered.filter((d) => d.isOnline);
  else if (statusFilter === 'approved') filtered = filtered.filter((d) => d.isApproved);
  else if (statusFilter === 'pending') filtered = filtered.filter((d) => !d.isApproved);

  const executeVerifyDriver = async () => {
    if (!confirmDriver) return;
    const { driver, approve } = confirmDriver;

    try {
      const res = await adminClient.post(`/drivers/${driver.id}/verify`, { isApproved: approve });
      showToast(res.data.message || 'Driver status updated!', 'success');
      setConfirmDriver(null);
      onRefresh();
    } catch (e) {
      showToast('Failed to update driver status', 'error');
    }
  };

  return (
    <div>
      <div className="controls-bar">
        <div className="search-box">
          🔍{' '}
          <input
            type="text"
            placeholder="Search drivers by name, plate number, phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="filter-chips">
          <button
            className={`chip-btn ${statusFilter === 'all' ? 'active' : ''}`}
            onClick={() => setStatusFilter('all')}
          >
            All Drivers
          </button>
          <button
            className={`chip-btn ${statusFilter === 'online' ? 'active' : ''}`}
            onClick={() => setStatusFilter('online')}
          >
            🟢 Online Only
          </button>
          <button
            className={`chip-btn ${statusFilter === 'approved' ? 'active' : ''}`}
            onClick={() => setStatusFilter('approved')}
          >
            ✓ Approved
          </button>
          <button
            className={`chip-btn ${statusFilter === 'pending' ? 'active' : ''}`}
            onClick={() => setStatusFilter('pending')}
          >
            ⏳ Pending Approval
          </button>
        </div>
      </div>

      {/* Driver Verification Confirmation Popup */}
      {confirmDriver && (
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
              border: confirmDriver.approve ? '2px solid var(--green)' : '2px solid var(--red)',
            }}
          >
            <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--navy)', marginBottom: '12px' }}>
              {confirmDriver.approve ? '✓ Approve & Verify Driver Partner?' : '⚠️ Revoke Driver Verification?'}
            </div>
            <div style={{ fontSize: '14px', color: '#334155', lineHeight: 1.5, marginBottom: '16px', fontWeight: 600 }}>
              {confirmDriver.approve
                ? `Are you sure you want to APPROVE '${confirmDriver.driver.fullName}'? The driver will be granted access to go online and accept customer trip requests.`
                : `Are you sure you want to REVOKE verification for '${confirmDriver.driver.fullName}'? The driver will be disabled from accepting trips until re-approved.`}
            </div>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={executeVerifyDriver}
                style={{
                  flex: 1,
                  background: confirmDriver.approve ? 'var(--green)' : 'var(--red)',
                  color: 'white',
                  border: 'none',
                  padding: '12px',
                  borderRadius: '10px',
                  fontWeight: 800,
                  fontSize: '14px',
                  cursor: 'pointer',
                }}
              >
                {confirmDriver.approve ? 'Yes, Approve Driver ✓' : 'Yes, Revoke Verification'}
              </button>
              <button
                onClick={() => setConfirmDriver(null)}
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
              <th>Driver Partner</th>
              <th>Phone Number</th>
              <th>Vehicle Type & Plate</th>
              <th>Rating ⭐</th>
              <th>Trips Completed</th>
              <th>Earnings (LKR)</th>
              <th>Live Status</th>
              <th>KYC Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={9} style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)', fontWeight: 700 }}>
                  No driver partners found matching search criteria.
                </td>
              </tr>
            ) : (
              filtered.map((d) => (
                <tr key={d.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div className="user-avatar-sm" style={{ background: 'var(--orange)', color: 'var(--navy)' }}>
                        {(d.fullName || 'D')[0]}
                      </div>
                      <div>
                        <strong>{d.fullName}</strong>
                        <br />
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{d.email}</span>
                      </div>
                    </div>
                  </td>
                  <td>📞 {d.phoneNumber || 'N/A'}</td>
                  <td>
                    <strong>{d.vehicleType || 'Truck'}</strong>
                    <br />
                    <span style={{ color: 'var(--text-muted)', fontSize: '11px' }}>
                      Plate: {d.vehiclePlateNumber || 'N/A'}
                    </span>
                  </td>
                  <td>
                    <strong style={{ color: 'var(--orange)' }}>⭐ {(d.ratingAverage || 4.9).toFixed(1)}</strong>
                  </td>
                  <td>
                    <strong>{d.totalCompletedJobs || 0} Jobs</strong>
                  </td>
                  <td>
                    <strong style={{ color: 'var(--green)' }}>LKR {Math.round(d.totalEarnings || 0).toLocaleString()}</strong>
                  </td>
                  <td>
                    <span className={`status-tag ${d.isOnline ? 'status-Online' : 'status-Offline'}`}>
                      {d.isOnline ? '🟢 Online' : '⚫ Offline'}
                    </span>
                  </td>
                  <td>
                    <span className={`status-tag ${d.isApproved ? 'status-Approved' : 'status-PendingApproval'}`}>
                      {d.isApproved ? '✓ Verified' : '⏳ Pending'}
                    </span>
                  </td>
                  <td>
                    <button
                      className="btn-action"
                      onClick={() => setConfirmDriver({ driver: d, approve: !d.isApproved })}
                    >
                      {d.isApproved ? 'Revoke Approval' : 'Approve ✓'}
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
