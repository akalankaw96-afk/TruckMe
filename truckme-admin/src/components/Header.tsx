import React from 'react';

interface HeaderProps {
  refreshing: boolean;
  onRefresh: () => void;
}

export const Header: React.FC<HeaderProps> = ({ refreshing, onRefresh }) => {
  return (
    <header className="admin-header">
      <div className="brand">
        <div className="brand-icon">🚛</div>
        <div>
          <div className="brand-title">TruckMe Control Center</div>
          <div className="brand-subtitle">Enterprise Logistics & Fleet Dispatch</div>
        </div>
      </div>
      <div className="header-actions">
        <div className="live-indicator">
          <div className="pulse-dot"></div>
          Live System Active
        </div>
        <button
          className="refresh-btn"
          onClick={onRefresh}
          disabled={refreshing}
        >
          {refreshing ? '🔄 Syncing...' : '🔄 Refresh Feed'}
        </button>
      </div>
    </header>
  );
};
