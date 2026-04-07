import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { registerWithOtpApi, sendRegistrationOtpApi } from '../api/authApi';
import type { RegisterRequest } from '../types';
import '../styles/AuthPages.css';

type ApiErrorShape = {
  message?: string;
  errors?: Record<string, string>;
};

const getApiError = (err: unknown): { status?: number; message?: string; fieldErrors?: Record<string, string> } => {
  const anyErr = err as any;
  const status: number | undefined = anyErr?.response?.status;
  const data: unknown = anyErr?.response?.data;

  if (data && typeof data === 'object') {
    const obj = data as ApiErrorShape;
    if (obj.errors && typeof obj.errors === 'object') {
      return { status, fieldErrors: obj.errors, message: obj.message };
    }
    if (typeof obj.message === 'string') return { status, message: obj.message };
  }

  if (typeof data === 'string') return { status, message: data };
  if (typeof anyErr?.message === 'string') return { status, message: anyErr.message };
  return { status, message: undefined };
};

const OTP_REGEX = /^\d{6}$/;
const OTP_LENGTH = 6;

const OTPVerification: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const registrationDraft = useMemo(() => {
    const state = location.state as { registrationDraft?: RegisterRequest } | null;
    return state?.registrationDraft;
  }, [location.state]);

  const [otpDigits, setOtpDigits] = useState<string[]>(Array.from({ length: OTP_LENGTH }, () => ''));
  const [serverError, setServerError] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  const otpRefs = useRef<Array<HTMLInputElement | null>>([]);

  const otp = useMemo(() => otpDigits.join(''), [otpDigits]);

  useEffect(() => {
    if (!serverError) return;
    const id = window.setTimeout(() => setServerError(''), 3000);
    return () => window.clearTimeout(id);
  }, [serverError]);

  if (!registrationDraft) return <Navigate to="/register" replace />;

  const focusOtpIndex = (index: number) => {
    const el = otpRefs.current[index];
    if (!el) return;
    el.focus();
    el.select?.();
  };

  useEffect(() => {
    focusOtpIndex(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setOtpDigit = (index: number, digit: string) => {
    setOtpDigits(prev => {
      const next = [...prev];
      next[index] = digit;
      return next;
    });
  };

  const handleOtpBoxChange = (index: number, rawValue: string) => {
    const digitsOnly = (rawValue || '').replace(/\D/g, '');
    setServerError('');

    if (!digitsOnly) {
      setOtpDigit(index, '');
      return;
    }

    const digit = digitsOnly.slice(-1);
    setOtpDigit(index, digit);
    if (index < OTP_LENGTH - 1) focusOtpIndex(index + 1);
  };

  const handleOtpBoxKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      e.preventDefault();
      if (otpDigits[index]) {
        setOtpDigit(index, '');
        return;
      }
      if (index > 0) {
        setOtpDigit(index - 1, '');
        focusOtpIndex(index - 1);
      }
      return;
    }

    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      if (index > 0) focusOtpIndex(index - 1);
      return;
    }

    if (e.key === 'ArrowRight') {
      e.preventDefault();
      if (index < OTP_LENGTH - 1) focusOtpIndex(index + 1);
      return;
    }

    if (e.key.length === 1 && !/\d/.test(e.key)) {
      e.preventDefault();
    }
  };

  const handleOtpBoxPaste = (index: number, e: React.ClipboardEvent<HTMLInputElement>) => {
    const text = e.clipboardData.getData('text');
    const digits = (text || '').replace(/\D/g, '');
    if (!digits) return;
    e.preventDefault();

    const sliced = digits.slice(0, OTP_LENGTH - index);
    setOtpDigits(prev => {
      const next = [...prev];
      for (let i = 0; i < sliced.length; i++) {
        next[index + i] = sliced[i];
      }
      return next;
    });

    const nextIndex = Math.min(index + sliced.length, OTP_LENGTH - 1);
    focusOtpIndex(nextIndex);
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!OTP_REGEX.test(otp)) {
      setServerError('Please enter the 6-digit OTP');
      return;
    }
    setLoading(true);
    setServerError('');
    try {
      await registerWithOtpApi({ ...registrationDraft, otp });
      sessionStorage.setItem('flashMessage', 'Registration successful. Please log in.');
      navigate('/login');
    } catch (err: unknown) {
      const { message } = getApiError(err);
      const msg = (message || '').trim();
      if (msg.toLowerCase().includes('expired')) setServerError('OTP expired');
      else if (msg.toLowerCase().includes('invalid otp')) setServerError('Invalid OTP');
      else setServerError(msg || 'Verification failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setResending(true);
    setServerError('');
    try {
      await sendRegistrationOtpApi(registrationDraft.email);
    } catch (err: unknown) {
      const { message } = getApiError(err);
      setServerError(message || 'Failed to resend OTP');
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-container">
        <div className="auth-brand">
          <Link to="/" className="auth-logo">💒 Holiday Villa Resort</Link>
        </div>
        <div className="auth-card">
          <h2 className="auth-title">Verify Email</h2>
          <p className="auth-subtitle">Enter the 6-digit OTP sent to {registrationDraft.email}</p>

          {serverError && <div className="alert alert-error">{serverError}</div>}

          <form onSubmit={handleVerify} noValidate>
            <div className="form-group">
              <label htmlFor="otp">OTP Code</label>

              <div className="otp-input-group" aria-label="One-time password">
                <div className="otp-inputs">
                  {otpDigits.map((d, i) => (
                    <input
                      key={i}
                      ref={(el) => { otpRefs.current[i] = el; }}
                      className="otp-box"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      autoComplete={i === 0 ? 'one-time-code' : 'off'}
                      maxLength={1}
                      value={d}
                      onChange={(e) => handleOtpBoxChange(i, e.target.value)}
                      onKeyDown={(e) => handleOtpBoxKeyDown(i, e)}
                      onPaste={(e) => handleOtpBoxPaste(i, e)}
                      onFocus={(e) => e.currentTarget.select()}
                      aria-label={`OTP digit ${i + 1}`}
                    />
                  ))}
                </div>
              </div>
            </div>

            <button type="submit" className="btn-auth" disabled={loading}>
              {loading ? 'Verifying...' : 'Verify & Create Account'}
            </button>
          </form>

          <div className="auth-footer">
            <button type="button" className="btn-auth" disabled={resending} onClick={handleResend}>
              {resending ? 'Resending...' : 'Resend OTP'}
            </button>
            <p>Wrong email? <Link to="/register">Go back</Link></p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OTPVerification;
