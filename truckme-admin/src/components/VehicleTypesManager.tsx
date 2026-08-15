import React, { useState } from 'react';
import { VehicleTypeOption } from '../types';
import axios from 'axios';
import { API_HOST } from '../api/adminClient';

interface VehicleTypesManagerProps {
  vehicleTypes: VehicleTypeOption[];
  onRefresh: () => void;
}

export const VehicleTypesManager: React.FC<VehicleTypesManagerProps> = ({ vehicleTypes, onRefresh }) => {
  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [category, setCategory] = useState('Dry');
  const [description, setDescription] = useState('');
  const [basePrice, setBasePrice] = useState(5000);
  const [pricePerKm, setPricePerKm] = useState(180);
  const [minCapacityKg, setMinCapacityKg] = useState(500);
  const [maxCapacityKg, setMaxCapacityKg] = useState(1500);
  const [submitting, setSubmitting] = useState(false);

  const handleAddVehicleType = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) {
      alert('Please enter a vehicle type name.');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        name,
        code: code || name.substring(0, 4).toUpperCase(),
        category,
        description,
        basePrice: Number(basePrice),
        pricePerKm: Number(pricePerKm),
        minCapacityKg: Number(minCapacityKg),
        maxCapacityKg: Number(maxCapacityKg),
      };

      await axios.post(`${API_HOST}/api/vehicletypes`, payload, {
        headers: { 'Content-Type': 'application/json', 'bypass-tunnel-reminder': 'true' },
      });

      alert(`Vehicle type '${name}' added successfully!`);
      setShowModal(false);
      setName('');
      setCode('');
      setDescription('');
      onRefresh();
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to add vehicle type');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteVehicleType = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to REMOVE vehicle type '${name}'?`)) return;

    try {
      await axios.delete(`${API_HOST}/api/vehicletypes/${id}`, {
        headers: { 'bypass-tunnel-reminder': 'true' },
      });
      alert(`Vehicle type '${name}' removed successfully!`);
      onRefresh();
    } catch (err) {
      alert('Failed to remove vehicle type');
    }
  };

  return (
    <div>
      <div className="controls-bar">
        <div style={{ fontWeight: 800, fontSize: '18px', color: 'var(--navy)' }}>
          🚚 Active Vehicle Types ({vehicleTypes.length})
        </div>
        <button
          className="refresh-btn"
          style={{ background: 'var(--navy)', color: 'white' }}
          onClick={() => setShowModal(true)}
        >
          ➕ Add New Vehicle Type
        </button>
      </div>

      {showModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 2000,
          }}
        >
          <div
            style={{
              background: 'white',
              borderRadius: '16px',
              padding: '24px',
              maxWidth: '520px',
              width: '90%',
              boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--navy)' }}>➕ Add Vehicle Type</h3>
              <button
                onClick={() => setShowModal(false)}
                style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: 'var(--text-muted)' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddVehicleType} style={{ display: 'grid', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)' }}>Vehicle Type Name *</label>
                <input
                  type="text"
                  placeholder="e.g. 7 Ton Tipper Truck"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border)', marginTop: '4px' }}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)' }}>Short Code</label>
                  <input
                    type="text"
                    placeholder="e.g. 7TON"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border)', marginTop: '4px' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)' }}>Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border)', marginTop: '4px' }}
                  >
                    <option value="Dry">Dry Cargo</option>
                    <option value="Temperature Controlled">Temperature Controlled</option>
                    <option value="Heavy Machinery">Heavy Machinery</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)' }}>Description</label>
                <input
                  type="text"
                  placeholder="e.g. Heavy aggregates & construction material transport"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border)', marginTop: '4px' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)' }}>Base Price (LKR)</label>
                  <input
                    type="number"
                    value={basePrice}
                    onChange={(e) => setBasePrice(Number(e.target.value))}
                    style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border)', marginTop: '4px' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)' }}>Per Km Price (LKR)</label>
                  <input
                    type="number"
                    value={pricePerKm}
                    onChange={(e) => setPricePerKm(Number(e.target.value))}
                    style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border)', marginTop: '4px' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)' }}>Min Payload (kg)</label>
                  <input
                    type="number"
                    value={minCapacityKg}
                    onChange={(e) => setMinCapacityKg(Number(e.target.value))}
                    style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border)', marginTop: '4px' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)' }}>Max Payload (kg)</label>
                  <input
                    type="number"
                    value={maxCapacityKg}
                    onChange={(e) => setMaxCapacityKg(Number(e.target.value))}
                    style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border)', marginTop: '4px' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                <button
                  type="submit"
                  disabled={submitting}
                  style={{ flex: 1, background: 'var(--green)', color: 'white', border: 'none', padding: '12px', borderRadius: '8px', fontWeight: 800, cursor: 'pointer' }}
                >
                  {submitting ? 'Adding...' : 'Save Vehicle Type'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  style={{ flex: 1, background: '#F1F5F9', color: 'var(--navy)', border: 'none', padding: '12px', borderRadius: '8px', fontWeight: 700, cursor: 'pointer' }}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Vehicle Type</th>
              <th>Code</th>
              <th>Category</th>
              <th>Base Rate</th>
              <th>Per Km Rate</th>
              <th>Payload Capacity</th>
              <th>Description</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {vehicleTypes.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)', fontWeight: 700 }}>
                  No vehicle types defined.
                </td>
              </tr>
            ) : (
              vehicleTypes.map((v) => (
                <tr key={v.id}>
                  <td>
                    <strong style={{ fontSize: '14px', color: 'var(--navy)' }}>🚛 {v.name}</strong>
                  </td>
                  <td>
                    <span className="status-tag status-InTransit">{v.code}</span>
                  </td>
                  <td>
                    <span className={`status-tag ${v.category.includes('Temp') ? 'status-Pending' : 'status-Approved'}`}>
                      {v.category}
                    </span>
                  </td>
                  <td>
                    <strong style={{ color: 'var(--green)' }}>LKR {v.basePrice.toLocaleString()}</strong>
                  </td>
                  <td>
                    <strong>LKR {v.pricePerKm} / km</strong>
                  </td>
                  <td>
                    ⚖️ {v.minCapacityKg} - {v.maxCapacityKg} kg
                  </td>
                  <td style={{ color: 'var(--text-muted)', fontSize: '12px' }}>{v.description}</td>
                  <td>
                    <button
                      className="btn-reject"
                      style={{ padding: '6px 12px', fontSize: '12px' }}
                      onClick={() => handleDeleteVehicleType(v.id, v.name)}
                    >
                      Remove 🗑️
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
