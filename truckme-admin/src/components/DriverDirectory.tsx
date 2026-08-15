import React, { useState } from 'react';
import { DriverPartner } from '../types';
import adminClient from '../api/adminClient';

interface DriverDirectoryProps {
  drivers: DriverPartner[];
  onRefresh: () => void;
}

export const DriverDirectory: React.FC<DriverDirectoryProps> = ({ drivers, onRefresh }) => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'online' | 'approved' | 'pending'>('all');

  let filtered = drivers.filter(
    (d) =>
      d.fullName.toLowerCase().includes(search.toLowerCase()) ||
      (d.vehiclePlateNumber && d.vehiclePlateNumber.toLowerCase().includes(search.toLowerCase())) ||
      (d.phoneNumber && d.phoneNumber.includes(search))
  );

  if (statusFilter === 'online') filtered = filtered.filter((d) => d.isOnline);
  else if (statusFilter === 'approved') filtered = filtered.filter((d) => d.isApproved);
  else if (statusFilter === 'pending') filtered = filtered.filter((d) => !d.isApproved);

  const verifyDriver = async (driverId: string, approve: boolean) => {
    if (!window.confirm(`Are you sure you want to ${approve ? 'APPROVE' : 'REVOKE'} this driver partner?`)) return;
    try {
      const res = await adminClient.post(`/drivers/${driverId}/verify`, { isApproved: approve });
      alert(res.data.message || 'Driver status updated!');
      onRefresh();
    } catch (e) {
      alert('Failed to update driver status');
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
                    <button className="btn-action" onClick={() => verifyDriver(d.id, !d.isApproved)}>
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
