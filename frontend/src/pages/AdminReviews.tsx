import React, { useEffect, useState } from 'react';
import { getAllReviewsApi } from '../api/reviewApi';
import type { Review } from '../types';
import ReviewCard from '../components/ReviewCard';
import '../styles/Review.css';

const AdminReviews: React.FC = () => {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);

  const loadReviews = () => {
    setLoading(true);
    getAllReviewsApi()
      .then(setReviews)
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadReviews(); }, []);

  const avgRating = reviews.length > 0
    ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1)
    : '—';

  return (
    <div className="admin-reviews-page">
      <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#1e3a5f', marginBottom: '0.5rem' }}>
        Review Management
      </h2>
      <p style={{ fontSize: '0.85rem', color: '#6b7280', marginBottom: '1.2rem' }}>
        View guest villa reviews. Guests can edit or delete their own reviews within 7 days of posting.
      </p>

      {/* Stats */}
      <div className="admin-reviews-stats">
        <div className="admin-review-stat">
          <span>{reviews.length}</span>
          <span>Total Reviews</span>
        </div>
        <div className="admin-review-stat">
          <span>{avgRating} ⭐</span>
          <span>Avg Rating</span>
        </div>
      </div>

      {/* Reviews Grid */}
      {loading ? (
        <p style={{ color: '#9ca3af' }}>Loading reviews…</p>
      ) : reviews.length === 0 ? (
        <div className="admin-reviews-empty">No reviews found.</div>
      ) : (
        <div className="admin-reviews-grid">
          {reviews.map(r => (
            <ReviewCard
              key={r.id}
              review={r}
              adminMode
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminReviews;
