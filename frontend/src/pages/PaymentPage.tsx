import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getBookingByIdApi } from '../api/bookingApi';
import { processPaymentApi, downloadInvoiceApi } from '../api/paymentApi';
import { useAuth } from '../context/AuthContext';
import type { Booking, PaymentMethod, PaymentType, PaymentRecord } from '../types';
import '../styles/Payment.css';

const fmt = (v: number) =>
  `LKR ${v.toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const PaymentPage: React.FC = () => {
  const { bookingId } = useParams<{ bookingId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [paymentType, setPaymentType] = useState<PaymentType>('ADVANCE');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CARD');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const [successRecord, setSuccessRecord] = useState<PaymentRecord | null>(null);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    if (!user) { navigate('/login'); return; }
    if (!bookingId) { navigate('/'); return; }
    getBookingByIdApi(Number(bookingId))
      .then(b => { setBooking(b); setLoading(false); })
      .catch(() => { setError('Booking not found.'); setLoading(false); });
  }, [bookingId]);

  // Determine which payment options are available
  const availableTypes = (): PaymentType[] => {
    if (!booking) return [];
    if (booking.paymentStatus === 'UNPAID') return ['ADVANCE', 'FULL'];
    if (booking.paymentStatus === 'PARTIALLY_PAID') return ['REMAINING'];
    return [];
  };

  const payableAmount = (): number => {
    if (!booking) return 0;
    if (paymentType === 'ADVANCE') return Math.round(booking.totalPrice * 0.30 * 100) / 100;
    if (paymentType === 'FULL')    return booking.totalPrice;
    if (paymentType === 'REMAINING') return booking.remainingAmount;
    return 0;
  };

  const handlePay = async () => {
    if (!booking) return;
    setSubmitError('');
    setSubmitting(true);
    try {
      const result = await processPaymentApi({
        bookingId: booking.id,
        paymentType,
        paymentMethod,
      });
      setSuccessRecord(result);
      // Refresh booking state
      const updated = await getBookingByIdApi(booking.id);
      setBooking(updated);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      setSubmitError(e.response?.data?.message || 'Payment failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDownloadInvoice = async () => {
    if (!successRecord) return;
    setDownloading(true);
    try { await downloadInvoiceApi(successRecord.id); }
    catch { alert('Failed to download invoice.'); }
    finally { setDownloading(false); }
  };

  const options = availableTypes();

  if (loading) return <div className="payment-page"><div className="payment-container"><p>Loading booking...</p></div></div>;
  if (error)   return <div className="payment-page"><div className="payment-container"><p style={{ color: 'red' }}>{error}</p></div></div>;
  if (!booking) return null;

  const fullyPaid = booking.paymentStatus === 'FULLY_PAID';

  return (
    <div className="payment-page">
      <div className="payment-container">
        <button
          style={{ background: 'none', border: 'none', color: '#0077b6', cursor: 'pointer', marginBottom: '1rem', fontWeight: 600, fontSize: '0.9rem' }}
          onClick={() => navigate('/guest/dashboard')}
        >
          ← Back to Dashboard
        </button>

        <h1 className="payment-page-title">Complete Your Payment</h1>

        {/* Success Banner */}
        {successRecord && (
          <div className="payment-success-banner">
            <div className="success-icon">✅</div>
            <h2>Payment Successful!</h2>
            <p>Amount paid: <strong>{fmt(successRecord.amount)}</strong></p>
            <div className="tx-ref">{successRecord.transactionReference}</div>
            <p>Booking Status: <strong>{successRecord.bookingStatus}</strong></p>
            <p>Remaining Balance: <strong>{fmt(successRecord.remainingAmount)}</strong></p>
            <button className="btn-download-invoice" onClick={handleDownloadInvoice} disabled={downloading}>
              {downloading ? 'Downloading…' : '📄 Download Invoice'}
            </button>
          </div>
        )}

        <div className="payment-grid">
          {/* Booking Summary */}
          <div className="booking-summary-card">
            <h3>Booking Summary</h3>
            <div className="summary-row"><span className="label">Booking ID</span><span className="value">#{booking.id}</span></div>
            <div className="summary-row"><span className="label">Villa</span><span className="value">{booking.villaName}</span></div>
            <div className="summary-row"><span className="label">Check-In</span><span className="value">{booking.checkInDate}</span></div>
            <div className="summary-row"><span className="label">Check-Out</span><span className="value">{booking.checkOutDate}</span></div>
            <div className="summary-row"><span className="label">Nights</span><span className="value">{booking.nights}</span></div>
            <div className="summary-row"><span className="label">Per Night</span><span className="value">{fmt(booking.pricePerNight)}</span></div>
            <div className="summary-row"><span className="label">Total</span><span className="value highlight">{fmt(booking.totalPrice)}</span></div>
            <div className="summary-row"><span className="label">Paid</span><span className="value success-color">{fmt(booking.amountPaid)}</span></div>
            <div className="summary-row"><span className="label">Remaining</span><span className="value warning-color">{fmt(booking.remainingAmount)}</span></div>
            <div className="summary-row"><span className="label">Status</span><span className="value">{booking.paymentStatus.replace('_', ' ')}</span></div>
          </div>

          {/* Payment Form */}
          <div className="payment-form-card">
            <h3>Payment Options</h3>

            {fullyPaid ? (
              <div style={{ textAlign: 'center', padding: '2rem', color: '#2e7d32' }}>
                <div style={{ fontSize: '2.5rem' }}>✅</div>
                <p style={{ fontWeight: 700, marginTop: '0.5rem' }}>This booking is fully paid!</p>
              </div>
            ) : options.length === 0 ? (
              <p style={{ color: '#888' }}>No payment actions available for this booking.</p>
            ) : (
              <>
                {/* Payment Type */}
                <div className="payment-option-group">
                  <label>Payment Type</label>
                  <div className="payment-option-buttons">
                    {options.map(t => (
                      <button
                        key={t}
                        className={`opt-btn ${paymentType === t ? 'active' : ''}`}
                        onClick={() => setPaymentType(t)}
                      >
                        {t === 'ADVANCE' && `30% Advance (${fmt(Math.round(booking.totalPrice * 0.30 * 100) / 100)})`}
                        {t === 'FULL' && `Full Payment (${fmt(booking.totalPrice)})`}
                        {t === 'REMAINING' && `Pay Remaining (${fmt(booking.remainingAmount)})`}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Payment Method */}
                <div className="payment-option-group">
                  <label>Payment Method</label>
                  <div className="payment-option-buttons">
                    {(['CARD', 'CASH', 'BANK_TRANSFER'] as PaymentMethod[]).map(m => (
                      <button
                        key={m}
                        className={`opt-btn ${paymentMethod === m ? 'active' : ''}`}
                        onClick={() => setPaymentMethod(m)}
                      >
                        {m === 'CARD' && '💳 Card'}
                        {m === 'CASH' && '💵 Cash'}
                        {m === 'BANK_TRANSFER' && '🏦 Bank Transfer'}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Amount Preview */}
                <div className="pay-amount-preview">
                  <div className="preview-label">Amount to Pay</div>
                  <div className="preview-amount">{fmt(payableAmount())}</div>
                </div>

                {submitError && <p style={{ color: '#c62828', fontSize: '0.88rem', marginBottom: '0.8rem' }}>{submitError}</p>}

                <button className="btn-pay" onClick={handlePay} disabled={submitting}>
                  {submitting ? 'Processing…' : `Pay ${fmt(payableAmount())}`}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentPage;
