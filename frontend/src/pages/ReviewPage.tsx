import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getMyBookingsApi } from '../api/bookingApi';
import { submitReviewApi, getMyReviewsApi } from '../api/reviewApi';
import type { Booking, Review } from '../types';
import StarRating from '../components/StarRating';
import ReviewCard from '../components/ReviewCard';
import '../styles/Review.css';

const ReviewPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [selectedBookingId, setSelectedBookingId] = useState<number | ''>('');
  const [rating, setRating] = useState(0);
  const [reviewText, setReviewText] = useState('');

  const [completedBookings, setCompletedBookings] = useState<Booking[]>([]);
  const [myReviews, setMyReviews] = useState<Review[]>([]);
  const [loadingBookings, setLoadingBookings] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState('');
  const [apiError, setApiError] = useState('');
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const loadData = () => {
    getMyReviewsApi().then(setMyReviews).catch(() => {});
  };

  useEffect(() => {
    if (!user) { navigate('/login'); return; }
    setLoadingBookings(true);
    getMyBookingsApi()
      .then(data => setCompletedBookings(data.filter(b => b.status === 'COMPLETED')))
      .catch(() => {})
      .finally(() => setLoadingBookings(false));
    loadData();
  }, [user, navigate]);

  const selectedBooking = completedBookings.find(b => b.id === selectedBookingId);
  const reviewedBookingIds = new Set(myReviews.map(r => r.bookingId));

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!selectedBookingId) errs.booking = 'Please select a completed stay.';
    if (rating < 1 || rating > 5) errs.rating = 'Please select a rating between 1 and 5.';
    if (!reviewText.trim()) errs.reviewText = 'Review text cannot be empty.';
    if (selectedBookingId && reviewedBookingIds.has(selectedBookingId as number)) {
      errs.booking = 'You have already reviewed this stay.';
    }
    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccess('');
    setApiError('');
    if (!validate()) return;

    setSubmitting(true);
    try {
      await submitReviewApi({
        bookingId: selectedBookingId as number,
        villaId: selectedBooking!.villaId,
        rating,
        reviewText,
      });
      setSuccess('Your review has been submitted successfully! Thank you for your feedback.');
      setSelectedBookingId('');
      setRating(0);
      setReviewText('');
      loadData();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      setApiError(e.response?.data?.message || 'Failed to submit review. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="review-page">
      <div className="review-page-inner">
        <button className="btn-back-review" onClick={() => navigate(-1)}>← Back</button>
        <h1 className="review-page-title">Leave a Review</h1>
        <p className="review-page-subtitle">
          Share your experience about a villa you have stayed in.
        </p>

        <div className="review-form-card">
          {success && <div className="review-form-success">{success}</div>}
          {apiError && <div className="review-form-api-error">{apiError}</div>}

          <form onSubmit={handleSubmit} noValidate>
            {/* Select completed stay */}
            <div className="review-form-group">
              <label className="review-form-label">Select Your Completed Stay *</label>
              {loadingBookings ? (
                <p style={{ color: '#9ca3af', fontSize: '0.9rem' }}>Loading bookings…</p>
              ) : completedBookings.length === 0 ? (
                <p style={{ color: '#9ca3af', fontSize: '0.9rem' }}>
                  No completed stays found. You can only review villas where you have completed a booking.
                </p>
              ) : (
                <select
                  className="review-form-select"
                  value={selectedBookingId}
                  onChange={e => setSelectedBookingId(e.target.value ? Number(e.target.value) : '')}
                >
                  <option value="">— Select a booking —</option>
                  {completedBookings.map(b => (
                    <option
                      key={b.id}
                      value={b.id}
                      disabled={reviewedBookingIds.has(b.id)}
                    >
                      {b.villaName} · {b.checkInDate} → {b.checkOutDate}
                      {reviewedBookingIds.has(b.id) ? ' (already reviewed)' : ''}
                    </option>
                  ))}
                </select>
              )}
              {formErrors.booking && <div className="review-form-error">{formErrors.booking}</div>}
            </div>

            {/* Star Rating */}
            <div className="review-form-group">
              <label className="review-form-label">Your Rating *</label>
              <div className="review-star-row">
                <StarRating value={rating} onChange={setRating} size="lg" />
                {rating > 0 && (
                  <span className="review-star-hint">
                    {['', 'Poor', 'Fair', 'Good', 'Very Good', 'Excellent'][rating]}
                  </span>
                )}
              </div>
              {formErrors.rating && <div className="review-form-error">{formErrors.rating}</div>}
            </div>

            {/* Review Text */}
            <div className="review-form-group">
              <label className="review-form-label">Your Review *</label>
              <textarea
                className="review-form-textarea"
                placeholder="Tell us about your stay experience…"
                value={reviewText}
                onChange={e => setReviewText(e.target.value)}
                maxLength={1000}
              />
              <div style={{ textAlign: 'right', fontSize: '0.75rem', color: '#9ca3af' }}>
                {reviewText.length} / 1000
              </div>
              {formErrors.reviewText && <div className="review-form-error">{formErrors.reviewText}</div>}
            </div>

            <button type="submit" className="btn-submit-review" disabled={submitting}>
              {submitting ? 'Submitting…' : 'Submit Review'}
            </button>
          </form>
        </div>

        {/* My Reviews — guests can edit/delete within 7 days */}
        {myReviews.length > 0 && (
          <div style={{ marginTop: '2.5rem' }}>
            <h2 style={{ fontSize: '1.3rem', fontWeight: 700, color: '#1e3a5f', marginBottom: '0.5rem' }}>
              My Reviews
            </h2>
            <p style={{ fontSize: '0.85rem', color: '#6b7280', marginBottom: '1rem' }}>
              Reviews can be edited or deleted within 7 days of posting.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {myReviews.map(r => (
                <ReviewCard key={r.id} review={r} onUpdated={loadData} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ReviewPage;
