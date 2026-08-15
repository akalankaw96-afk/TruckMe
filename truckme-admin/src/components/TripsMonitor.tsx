import React, { useState } from 'react';
import { BookingRecord } from '../types';

interface TripsMonitorProps {
  bookings: BookingRecord[];
}

export const TripsMonitor: React.FC<TripsMonitorProps> = ({ bookings }) => {
  const [search, setSearch] = useState('');

  const filtered = bookings.filter(
    (b) =>
      b.bookingNumber.toLowerCase().includes(search.toLowerCase()) ||
      b.customerName.toLowerCase().includes(search.toLowerCase()) ||
      b.driverName.toLowerCase().includes(search.toLowerCase()) ||
      b.pickupAddress.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <div className="controls-bar">
        <div className="search-box">
          🔍{' '}
          <input
            type="text"
            placeholder="Search trips by booking #, customer, driver, pickup..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Booking #</th>
              <th>Customer</th>
              <th>Pickup Address</th>
              <th>Driver Partner</th>
              <th>Cargo Info</th>
              <th>Total Fare (LKR)</th>
              <th>Platform Comm (15%)</th>
              <th>Driver Payout</th>
              <th>Status</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={10} style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)', fontWeight: 700 }}>
                  No trip records found matching search.
                </td>
              </tr>
            ) : (
              filtered.map((b) => (
                <tr key={b.id}>
                  <td style={{ fontWeight: 800, color: 'var(--orange)' }}>{b.bookingNumber}</td>
                  <td>
                    <strong>{b.customerName}</strong>
                    <br />
                    <span style={{ color: 'var(--text-muted)', fontSize: '11px' }}>{b.customerPhone}</span>
                  </td>
                  <td>📍 {b.pickupAddress}</td>
                  <td>
                    🚛 {b.driverName}
                    <br />
                    <span style={{ color: 'var(--text-muted)', fontSize: '11px' }}>{b.vehiclePlate}</span>
                  </td>
                  <td>
                    📦 {b.cargoType || 'Dry'} ({b.cargoWeightKg || 500}kg)
                  </td>
                  <td>
                    <strong style={{ color: 'var(--navy)' }}>LKR {Math.round(b.totalFare || 0).toLocaleString()}</strong>
                  </td>
                  <td>
                    <span style={{ color: 'var(--green)', fontWeight: 700 }}>
                      LKR {Math.round(b.commission || b.totalFare * 0.15).toLocaleString()}
                    </span>
                  </td>
                  <td>
                    <strong style={{ color: 'var(--blue)' }}>
                      LKR {Math.round(b.driverPayout || b.totalFare * 0.85).toLocaleString()}
                    </strong>
                  </td>
                  <td>
                    <span className={`status-tag status-${b.status}`}>{b.status}</span>
                  </td>
                  <td style={{ color: 'var(--text-muted)', fontSize: '12px' }}>
                    {new Date(b.createdAt).toLocaleDateString()}
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
