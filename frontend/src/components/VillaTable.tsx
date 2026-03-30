import React from 'react';
import type { Villa } from '../types';

interface VillaTableProps {
  villas: Villa[];
  onEdit: (villa: Villa) => void;
  onDelete: (id: number) => void;
}

const VillaTable: React.FC<VillaTableProps> = ({ villas, onEdit, onDelete }) => {
  if (villas.length === 0) {
    return <p className="empty-state">No villas found. Click "Add New Villa" to get started.</p>;
  }

  return (
    <div className="table-wrapper">
      <table className="data-table">
        <thead>
          <tr>
            <th>Image</th>
            <th>Villa Name</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {villas.map(v => (
            <tr key={v.id}>
              <td>
                {v.imageUrls?.[0] ? (
                  <img
                    src={v.imageUrls[0]}
                    alt={v.name}
                    style={{ width: 72, height: 48, objectFit: 'cover', borderRadius: 6 }}
                    onError={e => {
                      (e.target as HTMLImageElement).src =
                        'https://via.placeholder.com/72x48?text=Villa';
                    }}
                  />
                ) : (
                  <span>🏖️</span>
                )}
              </td>
              <td>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <strong>{v.name}</strong>
                  {v.hasBookings && (
                    <span
                      className="badge-status status-confirmed"
                      style={{ border: 'none', padding: '0.2rem 0.55rem', borderRadius: 999, fontWeight: 700 }}
                      title="This villa has active/upcoming bookings and cannot be deleted"
                    >
                      Has Booking
                    </span>
                  )}
                </div>
              </td>
              <td>
                <button className="btn-edit" onClick={() => onEdit(v)} style={{ marginRight: 8 }}>
                  ✏️ Edit
                </button>
                <button
                  className="btn-delete"
                  disabled={Boolean(v.hasBookings)}
                  onClick={() => onDelete(v.id)}
                  title={v.hasBookings ? 'Cannot delete: this villa has a booking today or in the future' : 'Delete villa'}
                >
                  🗑️ Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default VillaTable;
