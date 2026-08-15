import React from 'react';
import { DashboardStats } from '../types';

interface KpiMetricsProps {
  stats: DashboardStats | null;
}

export const KpiMetrics: React.FC<KpiMetricsProps> = ({ stats }) => {
  return (
    <div className="kpi-grid">
      <div className="kpi-card">
        <div className="kpi-title">Total Platform Revenue</div>
        <div className="kpi-value">
          LKR {Math.round(stats?.totalRevenue || 0).toLocaleString()}
        </div>
        <div className="kpi-sub">
          Platform 15% Comm: LKR {Math.round(stats?.platformCommission || 0).toLocaleString()}
        </div>
        <div className="kpi-icon-bg">💰</div>
      </div>

      <div className="kpi-card">
        <div className="kpi-title">Active Fleet Online</div>
        <div className="kpi-value">
          {stats?.onlineDrivers || 0} Drivers
        </div>
        <div className="kpi-sub">
          {stats?.activeDeliveries || 0} Active Trips In Progress
        </div>
        <div className="kpi-icon-bg">📡</div>
      </div>

      <div className="kpi-card">
        <div className="kpi-title">Registered Customers</div>
        <div className="kpi-value">
          {stats?.totalCustomers || 0} Customers
        </div>
        <div className="kpi-sub">
          Out of {stats?.totalBookings || 0} Total Bookings
        </div>
        <div className="kpi-icon-bg">👥</div>
      </div>

      <div className="kpi-card">
        <div className="kpi-title">Pending KYC Approvals</div>
        <div className="kpi-value" style={{ color: 'var(--orange)' }}>
          {stats?.pendingApprovals || 0} Applicants
        </div>
        <div className="kpi-sub">Driver Verification Queue</div>
        <div className="kpi-icon-bg">📜</div>
      </div>
    </div>
  );
};
