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

  // CARD fields
  const [cardNumber, setCardNumber] = useState('');
  const [cardType, setCardType] = useState<'VISA' | 'MASTERCARD' | ''>('');
  const [expiryDate, setExpiryDate] = useState('');
  const [cvv, setCvv] = useState('');

  // BANK TRANSFER file
  const [bankFile, setBankFile] = useState<File | null>(null);

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const [successRecord, setSuccessRecord] = useState<PaymentRecord | null>(null);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    if (!user) { navigate('/login'); return; }
    if (!bookingId) { navigate('/'); return; }
    getBookingByIdApi(Number(bookingId))
      .then(b => { setBooking(b); setLoading(false); })
      .catch(() => { setError('Booking not found.'); setLoading(false); });
  }, [bookingId]);

  // Reset method-specific fields when payment method changes
  useEffect(() => {
    setSubmitError('');
    setFieldErrors({});
    if (paymentMethod !== 'CARD') {
      setCardNumber('');
      setCardType('');
      setExpiryDate('');
      setCvv('');
    }
    if (paymentMethod !== 'BANK_TRANSFER') {
      setBankFile(null);
    }
  }, [paymentMethod]);

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
        cardNumber: paymentMethod === 'CARD' ? cardNumber : undefined,
        cardType: paymentMethod === 'CARD' ? (cardType || undefined) : undefined,
        expiryDate: paymentMethod === 'CARD' ? expiryDate : undefined,
        cvv: paymentMethod === 'CARD' ? cvv : undefined,
        bankTransferFile: paymentMethod === 'BANK_TRANSFER' ? (bankFile ?? undefined) : undefined,
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

  const validateCard = () => {
    const errors: Record<string, string> = {};

    const digitsOnly = (s: string) => s.replace(/\D/g, '');
    const cn = digitsOnly(cardNumber);
    if (!cn) errors.cardNumber = 'Card number is required.';
    else if (cn.length !== 16) errors.cardNumber = 'Card number must be exactly 16 digits.';

    if (!cardType) errors.cardType = 'Card type is required.';

    const cv = digitsOnly(cvv);
    if (!cv) errors.cvv = 'CVV is required.';
    else if (cv.length !== 3) errors.cvv = 'CVV must be exactly 3 digits.';

    // Expiry MM/YY and must be in the future
    if (!expiryDate) {
      errors.expiryDate = 'Expiry date is required.';
    } else {
      const m = expiryDate.match(/^(0[1-9]|1[0-2])\/(\d{2})$/);
      if (!m) {
        errors.expiryDate = 'Expiry date must be in MM/YY format.';
      } else {
        const mm = Number(m[1]);
        const yy = Number(m[2]);
        const fullYear = 2000 + yy;
        // Consider valid until the end of the expiry month
        const expiryEnd = new Date(fullYear, mm, 0, 23, 59, 59, 999);
        if (expiryEnd.getTime() <= Date.now()) {
          errors.expiryDate = 'Expiry date must be a future date.';
        }
      }
    }

    return errors;
  };

  const validateBankTransfer = () => {
    const errors: Record<string, string> = {};
    if (!bankFile) {
      errors.bankFile = 'Please upload your bank transfer receipt (JPG, PNG, or PDF).';
      return errors;
    }

    const maxBytes = 5 * 1024 * 1024;
    if (bankFile.size > maxBytes) {
      errors.bankFile = 'File size must be 5MB or less.';
      return errors;
    }

    const name = bankFile.name.toLowerCase();
    const okExt = name.endsWith('.jpg') || name.endsWith('.jpeg') || name.endsWith('.png') || name.endsWith('.pdf');
    if (!okExt) {
      errors.bankFile = 'Only JPG, PNG, or PDF files are allowed.';
      return errors;
    }

    const okType =
      bankFile.type === 'image/jpeg' ||
      bankFile.type === 'image/png' ||
      bankFile.type === 'application/pdf' ||
      bankFile.type === '';
    if (!okType) {
      errors.bankFile = 'Only image or PDF files are allowed.';
    }
    return errors;
  };

  const validateBeforeSubmit = () => {
    let errors: Record<string, string> = {};
    if (paymentMethod === 'CARD') errors = validateCard();
    if (paymentMethod === 'BANK_TRANSFER') errors = validateBankTransfer();
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const canPay = () => {
    if (submitting) return false;
    if (!booking) return false;
    if (paymentMethod === 'CARD') {
      const errors = validateCard();
      return Object.keys(errors).length === 0;
    }
    if (paymentMethod === 'BANK_TRANSFER') {
      const errors = validateBankTransfer();
      return Object.keys(errors).length === 0;
    }
    return true; // CASH
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

                {/* Method-specific fields */}
                {paymentMethod === 'CARD' && (
                  <div className="payment-method-fields">
                    <div className="payment-field">
                      <label>Card Number</label>
                      <input
                        type="text"
                        inputMode="numeric"
                        placeholder="16-digit card number"
                        value={cardNumber}
                        onChange={e => {
                          // Keep digits only, max 16
                          const digits = e.target.value.replace(/\D/g, '').slice(0, 16);
                          setCardNumber(digits);
                          setFieldErrors(prev => ({ ...prev, cardNumber: '' }));
                        }}
                        onBlur={() => setFieldErrors(prev => ({ ...prev, ...validateCard() }))}
                      />
                      {fieldErrors.cardNumber && <div className="payment-field-error">{fieldErrors.cardNumber}</div>}
                    </div>

                    <div className="payment-field">
                      <label>Card Type</label>
                      <select
                        value={cardType}
                        onChange={e => {
                          setCardType(e.target.value as any);
                          setFieldErrors(prev => ({ ...prev, cardType: '' }));
                        }}
                        onBlur={() => setFieldErrors(prev => ({ ...prev, ...validateCard() }))}
                      >
                        <option value="">Select card type</option>
                        <option value="VISA">VISA</option>
                        <option value="MASTERCARD">MASTERCARD</option>
                      </select>
                      {fieldErrors.cardType && <div className="payment-field-error">{fieldErrors.cardType}</div>}
                    </div>

                    <div className="payment-field">
                      <label>Expiry Date (MM/YY)</label>
                      <input
                        type="text"
                        inputMode="numeric"
                        placeholder="MM/YY"
                        value={expiryDate}
                        onChange={e => {
                          const v = e.target.value.replace(/[^0-9/]/g, '').slice(0, 5);
                          setExpiryDate(v);
                          setFieldErrors(prev => ({ ...prev, expiryDate: '' }));
                        }}
                        onBlur={() => setFieldErrors(prev => ({ ...prev, ...validateCard() }))}
                      />
                      {fieldErrors.expiryDate && <div className="payment-field-error">{fieldErrors.expiryDate}</div>}
                    </div>

                    <div className="payment-field">
                      <label>CVV</label>
                      <input
                        type="password"
                        inputMode="numeric"
                        placeholder="3 digits"
                        value={cvv}
                        onChange={e => {
                          const digits = e.target.value.replace(/\D/g, '').slice(0, 3);
                          setCvv(digits);
                          setFieldErrors(prev => ({ ...prev, cvv: '' }));
                        }}
                        onBlur={() => setFieldErrors(prev => ({ ...prev, ...validateCard() }))}
                      />
                      {fieldErrors.cvv && <div className="payment-field-error">{fieldErrors.cvv}</div>}
                    </div>
                  </div>
                )}

                {paymentMethod === 'BANK_TRANSFER' && (
                  <div className="payment-method-fields">
                    <div className="payment-field">
                      <label>Upload Receipt (JPG, PNG, PDF)</label>
                      <input
                        type="file"
                        accept=".jpg,.jpeg,.png,.pdf,application/pdf,image/jpeg,image/png"
                        onChange={e => {
                          const f = e.target.files?.[0] ?? null;
                          setBankFile(f);
                          setFieldErrors(prev => ({ ...prev, bankFile: '' }));
                        }}
                        onBlur={() => setFieldErrors(prev => ({ ...prev, ...validateBankTransfer() }))}
                      />
                      {bankFile && (
                        <div className="payment-file-hint">Selected: {bankFile.name}</div>
                      )}
                      {fieldErrors.bankFile && <div className="payment-field-error">{fieldErrors.bankFile}</div>}
                    </div>
                  </div>
                )}

                <button
                  className="btn-pay"
                  onClick={() => {
                    if (!validateBeforeSubmit()) return;
                    void handlePay();
                  }}
                  disabled={!canPay()}
                >
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
