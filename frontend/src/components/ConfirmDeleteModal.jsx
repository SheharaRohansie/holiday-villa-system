import React, { useEffect, useState } from 'react';
import '../styles/ConfirmDeleteModal.css';

/**
 * Reusable delete confirmation modal.
 *
 * Props:
 * - isOpen: boolean
 * - onClose: () => void
 * - onConfirm: () => Promise<void> | void
 * - isProcessing?: boolean
 */
const ConfirmDeleteModal = ({ isOpen, onClose, onConfirm, isProcessing = false }) => {
  const [animateIn, setAnimateIn] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setAnimateIn(false);
      return;
    }

    const id = window.setTimeout(() => setAnimateIn(true), 10);
    return () => window.clearTimeout(id);
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="cdm-backdrop" role="dialog" aria-modal="true" aria-label="Confirm deletion">
      <div className={`cdm-modal ${animateIn ? 'cdm-modal--in' : ''}`}>
        <h3 className="cdm-title">Confirm Deletion</h3>
        <p className="cdm-text">
          Are you sure you want to delete this item? This action cannot be undone.
        </p>
        <div className="cdm-actions">
          <button className="cdm-btn cdm-btn-secondary" onClick={onClose} disabled={isProcessing}>
            Cancel
          </button>
          <button className="cdm-btn cdm-btn-danger" onClick={onConfirm} disabled={isProcessing} autoFocus>
            {isProcessing ? 'Deleting…' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDeleteModal;
