import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getVillaByIdApi } from '../api/villaApi';
import { createBookingApi, processPaymentApi } from '../api/bookingApi';
import { useAuth } from '../context/AuthContext';
import type { Villa } from '../types';
import '../styles/Booking.css';

const formatLKR = (amount: number) =>
  `LKR ${amount.toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const today = () => new Date().toISOString().split('T')[0];
const tomorrow = () => {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().split('T')[0];
};

const BookingPage: React.FC = () => {
  const { villaId } = useParams<{ villaId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [villa, setVilla] = useState<Villa | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [checkIn, setCheckIn] = useState(today());
  const [checkOut, setCheckOut] = useState(tomorrow());
  const [paymentType, setPaymentType] = useState<'ADVANCE' | 'FULL'>('ADVANCE');

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    if (!user) { navigate('/login'); return; }
    if (!villaId) { navigate('/'); return; }
    getVillaByIdApi(Number(villaId))
      .then(v => { setVilla(v); setLoading(false); })
      .catch(() => { setError('Villa not found.'); setLoading(false); });
  }, [villaId]);

  const calcNights = (): number => {
    const ci = new Date(checkIn);
    const co = new Date(checkOut);
    const diff = (co.getTime() - ci.getTime()) / (1000 * 60 * 60 * 24);
    return diff > 0 ? Math.floor(diff) : 0;
  };

  const nights = calcNights();
  const totalPrice = villa ? nights * villa.pricePerNight : 0;
  const advanceAmount = Math.round(totalPrice * 0.30 * 100) / 100;
  const remainingAmount = Math.round((totalPrice - advanceAmount) * 100) / 100;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError('');

    if (nights <= 0) { setSubmitError('Check-out must be after check-in.'); return; }
    if (!villa) return;

    setSubmitting(true);
    try {
      // Step 1: Create booking (PENDING, UNPAID)
      const booking = await createBookingApi({
        villaId: villa.id,
        checkInDate: checkIn,
        checkOutDate: checkOut,
      });

      // Step 2: Simulate payment
      const paid = await processPaymentApi(booking.id, { paymentType });

      const amountLabel = paymentType === 'ADVANCE'
        ? `${formatLKR(paid.amountPaid)} (30% advance)`
        : formatLKR(paid.amountPaid);

      setSuccessMessage(
        `Payment of ${amountLabel} was successful!\n\nYour booking for ${villa.name} has been confirmed.` +
        (paymentType === 'ADVANCE'
          ? `\n\nRemaining balance of ${formatLKR(paid.remainingAmount)} must be paid at check-out.`
          : '')
      );
      setShowSuccess(true);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      setSubmitError(e.response?.data?.message || 'Booking failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="booking-loading">Loading villa details…</div>;
  if (error || !villa) return <div className="booking-error">{error || 'Villa not found.'}</div>;

  return (
    <div className="booking-page">
      {/* ── Success Modal ── */}
      {showSuccess && (
        <div className="booking-modal-overlay">
          <div className="booking-modal">
            <div className="booking-modal-icon">✅</div>
            <h2>Payment Successful!</h2>
            <p className="booking-modal-body">{successMessage}</p>
            <div className="booking-modal-actions">
              <button
                className="btn-booking-primary"
                onClick={() => navigate('/guest/dashboard')}
              >
                View My Bookings
              </button>
              <button
                className="btn-booking-secondary"
                onClick={() => navigate('/')}
              >
                Back to Home
              </button>
            </div>
          </div>
        </div>
      )}

      <button className="btn-back-booking" onClick={() => navigate(-1)}>← Back</button>

      <div className="booking-container">
        {/* Villa Summary */}
        <div className="booking-villa-card">
          {villa.imageUrls?.[0] && (
            <img
              src={villa.imageUrls[0]}
              alt={villa.name}
              className="booking-villa-img"
              onError={e => {
                (e.target as HTMLImageElement).src =
                  'https://via.placeholder.com/480x220?text=Villa';
              }}
            />
          )}
          <div className="booking-villa-info">
            <h2>{villa.name}</h2>
            <p className="booking-villa-desc">{villa.description}</p>
            <div className="booking-villa-meta">
              <span>👥 Max {villa.maxGuests} guests</span>
              <span className="booking-price-night">
                {formatLKR(villa.pricePerNight)} <span>/night</span>
              </span>
            </div>
            {villa.amenities.length > 0 && (
              <div className="booking-amenities">
                {villa.amenities.map((a, i) => (
                  <span key={i} className="amenity-tag">{a}</span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Booking Form */}
        <div className="booking-form-card">
          <h2 className="booking-form-title">Book Your Stay</h2>

          <form onSubmit={handleSubmit} noValidate>
            {/* Dates */}
            <div className="booking-dates-row">
              <div className="booking-field">
                <label>Check-in Date</label>
                <input
                  type="date"
                  value={checkIn}
                  min={today()}
                  onChange={e => { setCheckIn(e.target.value); setSubmitError(''); }}
                  required
                />
              </div>
              <div className="booking-field">
                <label>Check-out Date</label>
                <input
                  type="date"
                  value={checkOut}
                  min={checkIn || today()}
                  onChange={e => { setCheckOut(e.target.value); setSubmitError(''); }}
                  required
                />
              </div>
            </div>

            {/* Price Summary */}
            {nights > 0 ? (
              <div className="booking-price-summary">
                <div className="price-row">
                  <span>{formatLKR(villa.pricePerNight)} × {nights} night{nights !== 1 ? 's' : ''}</span>
                  <span>{formatLKR(totalPrice)}</span>
                </div>
                <hr className="price-divider" />
                <div className="price-row price-total">
                  <span>Total</span>
                  <span>{formatLKR(totalPrice)}</span>
                </div>
                <div className="price-row price-advance">
                  <span>Advance (30%)</span>
                  <span>{formatLKR(advanceAmount)}</span>
                </div>
                <div className="price-row price-remaining">
                  <span>Remaining (70%)</span>
                  <span>{formatLKR(remainingAmount)}</span>
                </div>
              </div>
            ) : (
              <div className="booking-price-placeholder">
                Select valid dates to see price summary.
              </div>
            )}

            {/* Payment Option */}
            <div className="payment-options">
              <h3>Payment Option</h3>
              <label className={`payment-option-label ${paymentType === 'ADVANCE' ? 'selected' : ''}`}>
                <input
                  type="radio"
                  name="paymentType"
                  value="ADVANCE"
                  checked={paymentType === 'ADVANCE'}
                  onChange={() => setPaymentType('ADVANCE')}
                />
                <div className="payment-option-content">
                  <div className="payment-option-title">Pay 30% Advance Now</div>
                  <div className="payment-option-detail">
                    Pay <strong>{formatLKR(advanceAmount)}</strong> today.
                    Remaining <strong>{formatLKR(remainingAmount)}</strong> due at check-out.
                  </div>
                </div>
              </label>

              <label className={`payment-option-label ${paymentType === 'FULL' ? 'selected' : ''}`}>
                <input
                  type="radio"
                  name="paymentType"
                  value="FULL"
                  checked={paymentType === 'FULL'}
                  onChange={() => setPaymentType('FULL')}
                />
                <div className="payment-option-content">
                  <div className="payment-option-title">Pay Full Amount Now</div>
                  <div className="payment-option-detail">
                    Pay <strong>{formatLKR(totalPrice)}</strong> now — fully covered.
                  </div>
                </div>
              </label>
            </div>

            {submitError && (
              <div className="booking-error-banner">{submitError}</div>
            )}

            <button
              type="submit"
              className="btn-booking-confirm"
              disabled={submitting || nights <= 0}
            >
              {submitting
                ? 'Processing…'
                : paymentType === 'ADVANCE'
                  ? `Pay 30% & Confirm Booking — ${formatLKR(advanceAmount)}`
                  : `Pay Full Amount & Confirm Booking — ${formatLKR(totalPrice)}`}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default BookingPage;
