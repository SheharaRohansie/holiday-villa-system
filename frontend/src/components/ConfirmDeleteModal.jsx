import React, { useEffect, useState } from 'react';
import '../styles/ConfirmDeleteModal.css';

/**
 * Reusable confirmation modal.
 *
 * Props:
 * - isOpen: boolean
 * - onClose: () => void
 * - onConfirm: () => Promise<void> | void
 * - isProcessing?: boolean
 * - title?: string
 * - message?: string
 * - confirmText?: string
 * - cancelText?: string
 * - ariaLabel?: string
 */
const ConfirmDeleteModal = ({
  isOpen,
  onClose,
  onConfirm,
  isProcessing = false,
  title = 'Confirm Deletion',
  message = 'Are you sure you want to delete this item? This action cannot be undone.',
  confirmText = 'Delete',
  cancelText = 'Cancel',
  ariaLabel = 'Confirm deletion',
}) => {
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
    <div className="cdm-backdrop" role="dialog" aria-modal="true" aria-label={ariaLabel}>
      <div className={`cdm-modal ${animateIn ? 'cdm-modal--in' : ''}`}>
        <h3 className="cdm-title">{title}</h3>
        <p className="cdm-text">{message}</p>
        <div className="cdm-actions">
          <button className="cdm-btn cdm-btn-secondary" onClick={onClose} disabled={isProcessing}>
            {cancelText}
          </button>
          <button className="cdm-btn cdm-btn-danger" onClick={onConfirm} disabled={isProcessing} autoFocus>
            {isProcessing ? 'Deleting…' : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDeleteModal;
