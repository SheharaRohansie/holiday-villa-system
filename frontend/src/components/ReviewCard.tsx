import React, { useState } from 'react';
import type { Review } from '../types';
import StarRating from './StarRating';
import { updateReviewApi, deleteMyReviewApi } from '../api/reviewApi';
import ConfirmDeleteModal from './ConfirmDeleteModal';
import Toast from './Toast';

interface ReviewCardProps {
  review: Review;
  /** Admin mode: show hide/show toggle (no delete per business rules) */
  adminMode?: boolean;
  onToggleVisibility?: (id: number) => void;
  /** Called after a guest edits or deletes their review */
  onUpdated?: () => void;
}

const ReviewCard: React.FC<ReviewCardProps> = ({
  review,
  adminMode = false,
  onToggleVisibility,
  onUpdated,
}) => {
  const [editing, setEditing] = useState(false);
  const [editRating, setEditRating] = useState(review.rating);
  const [editText, setEditText] = useState(review.reviewText);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [deleteType, setDeleteType] = useState('');
  const [deleteProcessing, setDeleteProcessing] = useState(false);
  const [toast, setToast] = useState('');

  const date = new Date(review.createdAt).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  const handleSaveEdit = async () => {
    if (editRating < 1 || editRating > 5) { setError('Please select a rating.'); return; }
    if (!editText.trim()) { setError('Review text cannot be empty.'); return; }
    setSaving(true);
    setError('');
    try {
      await updateReviewApi(review.id, { rating: editRating, reviewText: editText.trim() });
      setEditing(false);
      onUpdated?.();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      setError(e.response?.data?.message || 'Failed to update review.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setSelectedId(review.id);
    setDeleteType('review');
    setShowModal(true);
  };

  const handleConfirmDelete = async () => {
    if (!selectedId || deleteType !== 'review') return;
    setDeleteProcessing(true);
    try {
      await deleteMyReviewApi(selectedId);
      setShowModal(false);
      setSelectedId(null);
      setDeleteType('');
      setToast('Deleted successfully');
      onUpdated?.();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      setError(e.response?.data?.message || 'Failed to delete review.');
    } finally {
      setDeleteProcessing(false);
    }
  };

  return (
    <div className={`review-card ${!review.isVisible ? 'review-card--hidden' : ''}`}>
      <Toast message={toast} onClose={() => setToast('')} />
      <ConfirmDeleteModal
        isOpen={showModal}
        onClose={() => { if (!deleteProcessing) setShowModal(false); }}
        onConfirm={handleConfirmDelete}
        isProcessing={deleteProcessing}
      />

      <div className="review-card-header">
        <div className="review-card-avatar">
          {review.guestName.charAt(0).toUpperCase()}
        </div>
        <div className="review-card-meta">
          <span className="review-card-name">{review.guestName}</span>
          <span className="review-card-date">{date}</span>
        </div>
        {!editing && <StarRating value={review.rating} size="sm" />}
      </div>

      {adminMode && review.villaName && (
        <div className="review-card-villa-tag">
          🏡 {review.villaName}
        </div>
      )}

      {editing ? (
        <div className="review-card-edit">
          <div style={{ marginBottom: '0.75rem' }}>
            <StarRating value={editRating} onChange={setEditRating} size="md" />
          </div>
          <textarea
            className="review-form-textarea"
            value={editText}
            onChange={e => setEditText(e.target.value)}
            maxLength={1000}
          />
          {error && <div className="review-form-error">{error}</div>}
          <div className="review-card-actions" style={{ marginTop: '0.75rem' }}>
            <button className="btn-review-save" onClick={handleSaveEdit} disabled={saving}>
              {saving ? 'Saving…' : '✓ Save'}
            </button>
            <button className="btn-review-cancel" onClick={() => { setEditing(false); setError(''); }}>
              ✕ Cancel
            </button>
          </div>
        </div>
      ) : (
        <p className="review-card-text">{review.reviewText}</p>
      )}

      {!review.isVisible && (
        <div className="review-card-hidden-badge">Hidden</div>
      )}

      {/* Admin controls: hide/show only — admin cannot delete reviews */}
      {adminMode && !editing && (
        <div className="review-card-actions">
          <button
            className={`btn-review-toggle ${review.isVisible ? 'btn-hide' : 'btn-show'}`}
            onClick={() => onToggleVisibility?.(review.id)}
          >
            {review.isVisible ? '🙈 Hide' : '👁️ Show'}
          </button>
        </div>
      )}

      {/* Guest controls: edit/delete within 7-day window */}
      {!adminMode && review.canEdit && !editing && (
        <div className="review-card-actions">
          <button className="btn-review-edit" onClick={() => setEditing(true)}>
            ✏️ Edit
          </button>
          <button className="btn-review-delete" onClick={handleDelete}>
            🗑️ Delete
          </button>
        </div>
      )}
    </div>
  );
};

export default ReviewCard;
