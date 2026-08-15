import React, { useState } from 'react';
import { CustomerUser } from '../types';
import adminClient from '../api/adminClient';

interface CustomersDirectoryProps {
  customers: CustomerUser[];
  onRefresh: () => void;
}

export const CustomersDirectory: React.FC<CustomersDirectoryProps> = ({ customers, onRefresh }) => {
  const [search, setSearch] = useState('');

  const filtered = customers.filter(
    (c) =>
      c.fullName.toLowerCase().includes(search.toLowerCase()) ||
      (c.phoneNumber && c.phoneNumber.includes(search)) ||
      (c.email && c.email.toLowerCase().includes(search.toLowerCase()))
  );

  const toggleStatus = async (id: string) => {
    if (!window.confirm('Are you sure you want to change this customer account status?')) return;
    try {
      const res = await adminClient.post(`/customers/${id}/toggle-status`);
      alert(res.data.message || 'Customer status updated');
      onRefresh();
    } catch (e) {
      alert('Failed to update status');
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
                    <button className="btn-action" onClick={() => toggleStatus(c.id)}>
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
