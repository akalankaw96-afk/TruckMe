import React, { useState } from 'react';
import { VehicleTypeOption } from '../types';
import axios from 'axios';
import { API_HOST } from '../api/adminClient';

interface VehicleTypesManagerProps {
  vehicleTypes: VehicleTypeOption[];
  onRefresh: () => void;
}

interface ConfirmState {
  type: 'edit' | 'delete';
  title: string;
  warningMessage: string;
  details?: string[];
  onConfirm: () => Promise<void>;
}

export const VehicleTypesManager: React.FC<VehicleTypesManagerProps> = ({ vehicleTypes, onRefresh }) => {
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [category, setCategory] = useState('Dry');
  const [description, setDescription] = useState('');
  const [basePrice, setBasePrice] = useState(5000);
  const [pricePerKm, setPricePerKm] = useState(180);
  const [minCapacityKg, setMinCapacityKg] = useState(500);
  const [maxCapacityKg, setMaxCapacityKg] = useState(1500);
  const [submitting, setSubmitting] = useState(false);

  // Safety Confirmation Popup Modal state
  const [confirmState, setConfirmState] = useState<ConfirmState | null>(null);

  const openAddModal = () => {
    setEditingId(null);
    setName('');
    setCode('');
    setCategory('Dry');
    setDescription('');
    setBasePrice(5000);
    setPricePerKm(180);
    setMinCapacityKg(500);
    setMaxCapacityKg(1500);
    setShowModal(true);
  };

  const openEditModal = (v: VehicleTypeOption) => {
    setEditingId(v.id);
    setName(v.name);
    setCode(v.code);
    setCategory(v.category || 'Dry');
    setDescription(v.description || '');
    setBasePrice(v.basePrice);
    setPricePerKm(v.pricePerKm);
    setMinCapacityKg(v.minCapacityKg);
    setMaxCapacityKg(v.maxCapacityKg);
    setShowModal(true);
  };

  // Form submit handler with safety confirmation prompt
  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) {
      alert('Please enter a vehicle type name.');
      return;
    }

    const originalItem = vehicleTypes.find((v) => v.id === editingId);

    if (editingId && originalItem) {
      // Trigger confirmation popup before saving edit changes
      const details = [
        `Vehicle Name: ${name}`,
        `Base Rate: LKR ${originalItem.basePrice.toLocaleString()} ➔ LKR ${Number(basePrice).toLocaleString()}`,
        `Per KM Rate: LKR ${originalItem.pricePerKm.toLocaleString()} ➔ LKR ${Number(pricePerKm).toLocaleString()}`,
        `Capacity: ${minCapacityKg} - ${maxCapacityKg} kg`,
      ];

      setConfirmState({
        type: 'edit',
        title: '⚠️ Confirm Rate & Vehicle Data Update',
        warningMessage:
          'Caution: Modifying pricing rates will immediately change dispatch fare calculations for all new customer bookings across the platform.',
        details,
        onConfirm: async () => {
          await executeSave();
        },
      });
    } else {
      executeSave();
    }
  };

  const executeSave = async () => {
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

      if (editingId) {
        await axios.put(`${API_HOST}/api/vehicletypes/${editingId}`, payload, {
          headers: { 'Content-Type': 'application/json', 'bypass-tunnel-reminder': 'true' },
        });
        alert(`Vehicle type '${name}' rates updated successfully!`);
      } else {
        await axios.post(`${API_HOST}/api/vehicletypes`, payload, {
          headers: { 'Content-Type': 'application/json', 'bypass-tunnel-reminder': 'true' },
        });
        alert(`Vehicle type '${name}' added successfully!`);
      }

      setShowModal(false);
      setConfirmState(null);
      onRefresh();
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to save vehicle type');
    } finally {
      setSubmitting(false);
    }
  };

  // Safe delete handler with prominent warning popup
  const promptDeleteVehicleType = (id: string, vehicleName: string) => {
    const details = [
      `Target Vehicle: ${vehicleName}`,
      'Impact: New customer bookings for this vehicle category will be disabled.',
      'Driver Impact: Drivers assigned to this class will require category reassignment.',
    ];

    setConfirmState({
      type: 'delete',
      title: '🚨 Permanent Vehicle Removal Safety Warning',
      warningMessage: `Are you sure you want to PERMANENTLY REMOVE '${vehicleName}' from the active fleet catalog?`,
      details,
      onConfirm: async () => {
        try {
          await axios.delete(`${API_HOST}/api/vehicletypes/${id}`, {
            headers: { 'bypass-tunnel-reminder': 'true' },
          });
          alert(`Vehicle type '${vehicleName}' removed successfully!`);
          setConfirmState(null);
          onRefresh();
        } catch (err) {
          alert('Failed to remove vehicle type');
        }
      },
    });
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
          onClick={openAddModal}
        >
          ➕ Add New Vehicle Type
        </button>
      </div>

      {/* Safety Confirmation Modal Popup */}
      {confirmState && (
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
              maxWidth: '500px',
              width: '90%',
              boxShadow: '0 20px 50px rgba(0,0,0,0.3)',
              border: confirmState.type === 'delete' ? '2px solid var(--red)' : '2px solid var(--orange)',
            }}
          >
            <div style={{ fontSize: '18px', fontWeight: 800, color: confirmState.type === 'delete' ? 'var(--red)' : 'var(--navy)', marginBottom: '12px' }}>
              {confirmState.title}
            </div>

            <div style={{ fontSize: '14px', color: '#334155', lineHeight: 1.5, marginBottom: '16px', fontWeight: 600 }}>
              {confirmState.warningMessage}
            </div>

            {confirmState.details && (
              <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', padding: '14px', borderRadius: '12px', marginBottom: '20px', fontSize: '13px' }}>
                <div style={{ fontWeight: 800, color: 'var(--navy)', marginBottom: '6px' }}>Summary of Changes:</div>
                {confirmState.details.map((d, i) => (
                  <div key={i} style={{ color: 'var(--text-muted)', marginBottom: '4px', fontWeight: 600 }}>
                    • {d}
                  </div>
                ))}
              </div>
            )}

            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={confirmState.onConfirm}
                style={{
                  flex: 1,
                  background: confirmState.type === 'delete' ? 'var(--red)' : 'var(--orange)',
                  color: confirmState.type === 'delete' ? 'white' : 'var(--navy)',
                  border: 'none',
                  padding: '12px',
                  borderRadius: '10px',
                  fontWeight: 800,
                  fontSize: '14px',
                  cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                }}
              >
                {confirmState.type === 'delete' ? 'Yes, Permanently Delete 🗑️' : 'Confirm & Save Changes ✓'}
              </button>
              <button
                onClick={() => setConfirmState(null)}
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

      {/* Add / Edit Form Modal */}
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
              <h3 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--navy)' }}>
                {editingId ? '✏️ Edit Base Rate & Per KM Rate' : '➕ Add Vehicle Type'}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: 'var(--text-muted)' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleFormSubmit} style={{ display: 'grid', gap: '12px' }}>
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

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', background: '#F8FAFC', padding: '12px', borderRadius: '10px', border: '1px solid #E2E8F0' }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 800, color: 'var(--navy)' }}>💰 Base Rate (LKR)</label>
                  <input
                    type="number"
                    value={basePrice}
                    onChange={(e) => setBasePrice(Number(e.target.value))}
                    style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '2px solid var(--orange)', marginTop: '4px', fontWeight: 800 }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 800, color: 'var(--navy)' }}>📏 Per KM Rate (LKR)</label>
                  <input
                    type="number"
                    value={pricePerKm}
                    onChange={(e) => setPricePerKm(Number(e.target.value))}
                    style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '2px solid var(--green)', marginTop: '4px', fontWeight: 800 }}
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
                  {submitting ? 'Saving...' : editingId ? 'Update Rates ✓' : 'Save Vehicle Type'}
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
              <th>Actions</th>
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
                    <span className={`status-tag ${v.category?.includes('Temp') ? 'status-Pending' : 'status-Approved'}`}>
                      {v.category}
                    </span>
                  </td>
                  <td>
                    <strong style={{ color: 'var(--green)', fontSize: '14px' }}>LKR {v.basePrice.toLocaleString()}</strong>
                  </td>
                  <td>
                    <strong style={{ color: 'var(--blue)', fontSize: '14px' }}>LKR {v.pricePerKm} / km</strong>
                  </td>
                  <td>
                    ⚖️ {v.minCapacityKg} - {v.maxCapacityKg} kg
                  </td>
                  <td style={{ color: 'var(--text-muted)', fontSize: '12px' }}>{v.description}</td>
                  <td>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button
                        className="btn-action"
                        style={{ padding: '6px 10px', fontSize: '12px', background: '#EBF5FF', color: 'var(--blue)', border: '1px solid #BFDBFE' }}
                        onClick={() => openEditModal(v)}
                      >
                        Edit Rates ✏️
                      </button>
                      <button
                        className="btn-reject"
                        style={{ padding: '6px 10px', fontSize: '12px' }}
                        onClick={() => promptDeleteVehicleType(v.id, v.name)}
                      >
                        Remove 🗑️
                      </button>
                    </div>
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
