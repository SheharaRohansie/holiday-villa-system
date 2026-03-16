import React, { useEffect, useState } from 'react';
import { getAllReviewsApi, toggleReviewVisibilityApi } from '../api/reviewApi';
import type { Review } from '../types';
import ReviewCard from '../components/ReviewCard';
import '../styles/Review.css';

type FilterType = 'ALL' | 'VISIBLE' | 'HIDDEN';

const AdminReviews: React.FC = () => {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterType>('ALL');
  const [message, setMessage] = useState('');

  const loadReviews = () => {
    setLoading(true);
    getAllReviewsApi()
      .then(setReviews)
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadReviews(); }, []);

  const handleToggleVisibility = async (id: number) => {
    try {
      const updated = await toggleReviewVisibilityApi(id);
      setReviews(prev => prev.map(r => r.id === id ? updated : r));
      setMessage(`Review ${updated.isVisible ? 'shown' : 'hidden'} successfully.`);
      setTimeout(() => setMessage(''), 3000);
    } catch {
      setMessage('Failed to update review visibility.');
      setTimeout(() => setMessage(''), 3000);
    }
  };

  const filtered = reviews.filter(r => {
    if (filter === 'ALL') return true;
    if (filter === 'HIDDEN') return !r.isVisible;
    return r.isVisible;
  });

  const hiddenCount = reviews.filter(r => !r.isVisible).length;
  const visibleCount = reviews.filter(r => r.isVisible).length;

  const avgRating = visibleCount > 0
    ? (reviews.filter(r => r.isVisible).reduce((s, r) => s + r.rating, 0) / visibleCount).toFixed(1)
    : '—';

  return (
    <div className="admin-reviews-page">
      <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#1e3a5f', marginBottom: '0.5rem' }}>
        Review Management
      </h2>
      <p style={{ fontSize: '0.85rem', color: '#6b7280', marginBottom: '1.2rem' }}>
        View and moderate guest villa reviews. Reviews can only be hidden/shown — guests are responsible for their own content within 7 days.
      </p>

      {message && (
        <div
          style={{
            background: message.startsWith('Failed') ? '#fee2e2' : '#d1fae5',
            color: message.startsWith('Failed') ? '#b91c1c' : '#065f46',
            padding: '0.75rem 1.2rem',
            borderRadius: 10,
            marginBottom: '1rem',
            fontWeight: 600,
            fontSize: '0.9rem',
          }}
        >
          {message}
        </div>
      )}

      {/* Stats */}
      <div className="admin-reviews-stats">
        <div className="admin-review-stat">
          <span>{reviews.length}</span>
          <span>Total Reviews</span>
        </div>
        <div className="admin-review-stat">
          <span>{visibleCount}</span>
          <span>Visible</span>
        </div>
        <div className="admin-review-stat">
          <span>{hiddenCount}</span>
          <span>Hidden</span>
        </div>
        <div className="admin-review-stat">
          <span>{avgRating} ⭐</span>
          <span>Avg Rating</span>
        </div>
      </div>

      {/* Filters */}
      <div className="admin-reviews-filters">
        {(['ALL', 'VISIBLE', 'HIDDEN'] as const).map(f => (
          <button
            key={f}
            className={`filter-btn ${filter === f ? 'active' : ''}`}
            onClick={() => setFilter(f)}
          >
            {f === 'ALL' ? `All (${reviews.length})` :
             f === 'VISIBLE' ? `Visible (${visibleCount})` :
             `Hidden (${hiddenCount})`}
          </button>
        ))}
      </div>

      {/* Reviews Grid */}
      {loading ? (
        <p style={{ color: '#9ca3af' }}>Loading reviews…</p>
      ) : filtered.length === 0 ? (
        <div className="admin-reviews-empty">No reviews found for this filter.</div>
      ) : (
        <div className="admin-reviews-grid">
          {filtered.map(r => (
            <ReviewCard
              key={r.id}
              review={r}
              adminMode
              onToggleVisibility={handleToggleVisibility}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminReviews;
