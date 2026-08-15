import React, { useState } from 'react';
import { useAdminData } from './hooks/useAdminData';
import { Header } from './components/Header';
import { KpiMetrics } from './components/KpiMetrics';
import { LiveFleetMap } from './components/LiveFleetMap';
import { CustomersDirectory } from './components/CustomersDirectory';
import { DriverDirectory } from './components/DriverDirectory';
import { KycQueue } from './components/KycQueue';
import { TripsMonitor } from './components/TripsMonitor';
import { PayoutsTable } from './components/PayoutsTable';
import { VehicleTypesManager } from './components/VehicleTypesManager';

type TabType = 'map' | 'customers' | 'drivers' | 'kyc' | 'bookings' | 'payouts' | 'vehicleTypes';

export function App() {
  const [activeTab, setActiveTab] = useState<TabType>('map');
  const { stats, fleet, customers, drivers, kycQueue, bookings, payouts, vehicleTypes, refreshing, refresh } = useAdminData();

  return (
    <div className="admin-app">
      <Header refreshing={refreshing} onRefresh={refresh} />

      <div className="container">
        <KpiMetrics stats={stats} />

        {/* Navigation Tabs Header */}
        <div className="tabs-header">
          <button
            className={`tab-btn ${activeTab === 'map' ? 'active' : ''}`}
            onClick={() => setActiveTab('map')}
          >
            🗺️ Live Fleet Map
          </button>
          <button
            className={`tab-btn ${activeTab === 'customers' ? 'active' : ''}`}
            onClick={() => setActiveTab('customers')}
          >
            👥 Customers ({customers.length})
          </button>
          <button
            className={`tab-btn ${activeTab === 'drivers' ? 'active' : ''}`}
            onClick={() => setActiveTab('drivers')}
          >
            🚛 Driver Partners ({drivers.length})
          </button>
          <button
            className={`tab-btn ${activeTab === 'kyc' ? 'active' : ''}`}
            onClick={() => setActiveTab('kyc')}
          >
            📜 KYC Verification Queue ({kycQueue.length})
          </button>
          <button
            className={`tab-btn ${activeTab === 'vehicleTypes' ? 'active' : ''}`}
            onClick={() => setActiveTab('vehicleTypes')}
          >
            🚚 Vehicle Types ({vehicleTypes.length})
          </button>
          <button
            className={`tab-btn ${activeTab === 'bookings' ? 'active' : ''}`}
            onClick={() => setActiveTab('bookings')}
          >
            📊 Trips & Dispatch Monitor
          </button>
          <button
            className={`tab-btn ${activeTab === 'payouts' ? 'active' : ''}`}
            onClick={() => setActiveTab('payouts')}
          >
            💸 Bank Payouts ({payouts.length})
          </button>
        </div>

        {/* Active Tab View */}
        <div className="tab-body">
          {activeTab === 'map' && <LiveFleetMap fleet={fleet} />}
          {activeTab === 'customers' && <CustomersDirectory customers={customers} onRefresh={refresh} />}
          {activeTab === 'drivers' && <DriverDirectory drivers={drivers} onRefresh={refresh} />}
          {activeTab === 'kyc' && <KycQueue queue={kycQueue} onRefresh={refresh} />}
          {activeTab === 'vehicleTypes' && <VehicleTypesManager vehicleTypes={vehicleTypes} onRefresh={refresh} />}
          {activeTab === 'bookings' && <TripsMonitor bookings={bookings} />}
          {activeTab === 'payouts' && <PayoutsTable payouts={payouts} onRefresh={refresh} />}
        </div>
      </div>
    </div>
  );
}

export default App;
