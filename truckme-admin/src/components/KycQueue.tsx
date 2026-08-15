import React from 'react';
import { KycApplicant } from '../types';
import adminClient from '../api/adminClient';

interface KycQueueProps {
  queue: KycApplicant[];
  onRefresh: () => void;
}

export const KycQueue: React.FC<KycQueueProps> = ({ queue, onRefresh }) => {
  const verifyDriver = async (driverId: string, approve: boolean) => {
    if (!window.confirm(`Are you sure you want to ${approve ? 'APPROVE' : 'REJECT'} this driver license?`)) return;
    try {
      const res = await adminClient.post(`/drivers/${driverId}/verify`, { isApproved: approve });
      alert(res.data.message || 'Driver license verification updated!');
      onRefresh();
    } catch (e) {
      alert('Failed to update driver license status');
    }
  };

  if (queue.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)', fontWeight: 700, background: 'white', borderRadius: '16px', border: '1px solid var(--border)' }}>
        ✅ No pending driver license approvals. All registered drivers are verified!
      </div>
    );
  }

  return (
    <div className="kyc-grid">
      {queue.map((d) => (
        <div className="kyc-card" key={d.id}>
          <div className="kyc-user-row">
            <div className="kyc-avatar">{(d.fullName || 'D')[0]}</div>
            <div>
              <div className="kyc-name">{d.fullName}</div>
              <div className="kyc-phone">📞 {d.phone || 'N/A'} • {d.email || 'Driver Partner'}</div>
            </div>
          </div>
          <img className="kyc-license-img" src={d.licenseImageUrl} alt="License Verification" />
          <div className="kyc-meta" style={{ fontSize: '12px', display: 'grid', gap: '4px' }}>
            <div><strong>License #:</strong> {d.licenseNumber}</div>
            <div><strong>Vehicle Plate:</strong> {d.vehiclePlateNumber}</div>
            <div><strong>Vehicle Class:</strong> {d.vehicleType}</div>
            <div><strong>Status:</strong> <span style={{ color: 'var(--orange)', fontWeight: 800 }}>Pending Review</span></div>
          </div>
          <div className="kyc-actions">
            <button className="btn-approve" onClick={() => verifyDriver(d.id, true)}>
              Approve License & Activate
            </button>
            <button className="btn-reject" onClick={() => verifyDriver(d.id, false)}>
              Reject
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};
