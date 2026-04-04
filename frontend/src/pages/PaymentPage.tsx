import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { getBookingByIdApi } from '../api/bookingApi';
import { processPaymentApi, downloadInvoiceApi } from '../api/paymentApi';
import { useAuth } from '../context/AuthContext';
import type { Booking, PaymentMethod, PaymentType, PaymentRecord } from '../types';
import '../styles/Payment.css';

const asNumber = (v: unknown): number =>
  typeof v === 'number' && Number.isFinite(v) ? v : 0;

const fmt = (v: number | null | undefined) =>
  `LKR ${asNumber(v).toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const PaymentPage: React.FC = () => {
  const { bookingId } = useParams<{ bookingId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [paymentType, setPaymentType] = useState<PaymentType>('ADVANCE');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CARD');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  // CARD fields
  const [cardNumberDigits, setCardNumberDigits] = useState('');
  const [cardType, setCardType] = useState<'VISA' | 'MASTERCARD' | ''>('');
  const [expiryDate, setExpiryDate] = useState('');
  const [cvv, setCvv] = useState('');

  // BANK TRANSFER file
  const [bankFile, setBankFile] = useState<File | null>(null);

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const [successRecord, setSuccessRecord] = useState<PaymentRecord | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [redirectSeconds, setRedirectSeconds] = useState<number | null>(null);

  useEffect(() => {
    if (!user) { navigate('/login'); return; }
    if (!bookingId) { navigate('/'); return; }
    getBookingByIdApi(Number(bookingId))
      .then(b => {
        const maybe = b as unknown as { id?: unknown };
        if (!maybe || typeof maybe !== 'object' || typeof maybe.id !== 'number') {
          setError('Failed to load booking details.');
          setLoading(false);
          return;
        }
        setBooking(b);
        setLoading(false);
      })
      .catch(() => {
        setError('Booking not found.');
        setLoading(false);
      });
  }, [bookingId]);

  // Reset method-specific fields when payment method changes
  useEffect(() => {
    setSubmitError('');
    setFieldErrors({});
    if (paymentMethod !== 'CARD') {
      setCardNumberDigits('');
      setCardType('');
      setExpiryDate('');
      setCvv('');
    }
    if (paymentMethod !== 'BANK_TRANSFER') {
      setBankFile(null);
    }
  }, [paymentMethod]);

  const queryPaymentType = useMemo(() => {
    const params = new URLSearchParams(location.search);
    const t = params.get('type');
    if (t === 'ADVANCE' || t === 'FULL' || t === 'REMAINING') return t;
    return null;
  }, [location.search]);

  // Determine which payment options are available
  const availableTypes = (): PaymentType[] => {
    if (!booking) return [];
    if (booking.paymentStatus === 'UNPAID') return ['ADVANCE', 'FULL'];
    if (booking.paymentStatus === 'PARTIALLY_PAID') return ['REMAINING'];
    return [];
  };

  const availableMethods = (): PaymentMethod[] => {
    if (!booking) return [];
    // Reservation-stage payment: Card / Bank Transfer only
    if (booking.paymentStatus === 'UNPAID') return ['CARD', 'BANK_TRANSFER'];

    // Checkout remaining: allow cash (admin confirmation)
    if (booking.paymentStatus === 'PARTIALLY_PAID') {
      if (paymentType === 'REMAINING') return ['CARD', 'BANK_TRANSFER', 'CASH'];
      return ['CARD', 'BANK_TRANSFER'];
    }

    return [];
  };

  const payableAmount = (): number => {
    if (!booking) return 0;
    const total = asNumber(booking.totalPrice);
    const remaining = asNumber(booking.remainingAmount);
    if (paymentType === 'ADVANCE') return Math.round(total * 0.30 * 100) / 100;
    if (paymentType === 'FULL')    return total;
    if (paymentType === 'REMAINING') return remaining;
    return 0;
  };

  const detectCardType = (digits: string): 'VISA' | 'MASTERCARD' | '' => {
    if (!digits) return '';
    if (digits.startsWith('4')) return 'VISA';

    const firstTwo = Number(digits.slice(0, 2));
    if (firstTwo >= 51 && firstTwo <= 55) return 'MASTERCARD';

    const firstFour = Number(digits.slice(0, 4));
    if (firstFour >= 2221 && firstFour <= 2720) return 'MASTERCARD';

    return '';
  };

  const formatCardNumber = (digits: string) => {
    return digits.replace(/(\d{4})(?=\d)/g, '$1 ').trim();
  };

  const formatExpiry = (input: string) => {
    const digits = input.replace(/\D/g, '').slice(0, 4);
    if (digits.length <= 2) return digits;
    return `${digits.slice(0, 2)}/${digits.slice(2)}`;
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
        cardNumber: paymentMethod === 'CARD' ? cardNumberDigits : undefined,
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
    const cn = digitsOnly(cardNumberDigits);
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

  // Initialize/repair payment type and method once we know booking
  useEffect(() => {
    if (!booking) return;
    const types = availableTypes();
    const preferredType = queryPaymentType && types.includes(queryPaymentType) ? queryPaymentType : (types[0] ?? null);
    if (preferredType && paymentType !== preferredType) setPaymentType(preferredType);

    const methods = availableMethods();
    if (methods.length > 0 && !methods.includes(paymentMethod)) {
      setPaymentMethod(methods[0]);
    }
  }, [booking, queryPaymentType, paymentType, paymentMethod]);

  // If paymentType changes, ensure paymentMethod remains valid
  useEffect(() => {
    if (!booking) return;
    const methods = availableMethods();
    if (methods.length > 0 && !methods.includes(paymentMethod)) {
      setPaymentMethod(methods[0]);
    }
  }, [booking, paymentType, paymentMethod]);

  // After a successful payment, send user back to My Reservations
  // NOTE: must be declared before any conditional returns (Rules of Hooks)
  useEffect(() => {
    if (!successRecord) return;
    if (successRecord.paymentStatus !== 'SUCCESS') return;

    setRedirectSeconds(3);
    const tick = window.setInterval(() => {
      setRedirectSeconds(prev => (prev === null ? null : Math.max(0, prev - 1)));
    }, 1000);

    const timer = window.setTimeout(() => {
      navigate('/guest/dashboard?tab=reservations', { replace: true });
    }, 3000);

    return () => {
      window.clearTimeout(timer);
      window.clearInterval(tick);
    };
  }, [successRecord, navigate]);

  if (loading) return <div className="payment-page"><div className="payment-container"><p>Loading booking...</p></div></div>;
  if (error)   return <div className="payment-page"><div className="payment-container"><p style={{ color: 'red' }}>{error}</p></div></div>;
  if (!booking) return null;

  const fullyPaid = booking.paymentStatus === 'FULLY_PAID';
  const methods = availableMethods();
  const cardNumberDisplay = formatCardNumber(cardNumberDigits);
  const showInvoice = successRecord?.paymentStatus === 'SUCCESS';
  const pendingCash = successRecord?.paymentStatus === 'PENDING' && successRecord.paymentMethod === 'CASH';

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
            <h2>
              {successRecord.paymentStatus === 'SUCCESS'
                ? 'Payment Successful!'
                : successRecord.paymentStatus === 'PENDING'
                ? 'Payment Pending'
                : 'Payment Failed'}
            </h2>
            <p>
              Amount: <strong>{fmt(successRecord.amount)}</strong>
              {pendingCash ? ' (awaiting admin confirmation)' : ''}
            </p>
            <div className="tx-ref">{successRecord.transactionReference}</div>
            <p>Booking Status: <strong>{successRecord.bookingStatus}</strong></p>
            <p>Remaining Balance: <strong>{fmt(successRecord.remainingAmount)}</strong></p>
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', justifyContent: 'center' }}>
              {showInvoice && (
                <button className="btn-download-invoice" onClick={handleDownloadInvoice} disabled={downloading}>
                  {downloading ? 'Downloading…' : '📄 Download Invoice'}
                </button>
              )}
              <button
                className="btn-download-invoice"
                onClick={() => navigate('/guest/dashboard?tab=reservations', { replace: true })}
              >
                Go to My Reservations
              </button>
            </div>
            {redirectSeconds !== null && (
              <p style={{ marginTop: '0.6rem', color: '#2e7d32', fontWeight: 600 }}>
                Redirecting to My Reservations in {redirectSeconds}s…
              </p>
            )}
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
            <div className="summary-row"><span className="label">Status</span><span className="value">{booking.paymentStatus ? booking.paymentStatus.replace('_', ' ') : '—'}</span></div>
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
                    {methods.map(m => (
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
                        placeholder="1234 5678 9012 3456"
                        value={cardNumberDisplay}
                        onChange={e => {
                          // Keep digits only, max 16, and auto-detect type
                          const digits = e.target.value.replace(/\D/g, '').slice(0, 16);
                          setCardNumberDigits(digits);
                          const detected = detectCardType(digits);
                          setCardType(detected);
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
                        disabled
                        onChange={() => { /* auto-detected */ }}
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
                          const v = formatExpiry(e.target.value);
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
