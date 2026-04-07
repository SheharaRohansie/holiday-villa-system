import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { resetPasswordApi, sendForgotPasswordOtpApi } from '../api/authApi';
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

const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#^()_+\-=\[\]{};':"\\|,.<>/?]).{8,}$/;
const OTP_LENGTH = 6;

const ResetPassword: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const email = useMemo(() => {
    const state = location.state as { email?: string } | null;
    return state?.email;
  }, [location.state]);

  const [otpDigits, setOtpDigits] = useState<string[]>(Array.from({ length: OTP_LENGTH }, () => ''));
  const [newPassword, setNewPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  const otpRefs = useRef<Array<HTMLInputElement | null>>([]);

  const otp = useMemo(() => otpDigits.join(''), [otpDigits]);

  useEffect(() => {
    if (!error) return;
    const id = window.setTimeout(() => setError(''), 3000);
    return () => window.clearTimeout(id);
  }, [error]);

  if (!email) return <Navigate to="/forgot-password" replace />;

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
    setError('');

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

  const validate = (): boolean => {
    if (!/^\d{6}$/.test(otp)) {
      setError('Please enter the 6-digit OTP');
      return false;
    }
    if (!PASSWORD_REGEX.test(newPassword)) {
      setError('Password must be 8+ chars with uppercase, lowercase, digit & special character');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!validate()) return;
    setLoading(true);
    try {
      await resetPasswordApi({ email, otp, newPassword });
      sessionStorage.setItem('flashMessage', 'Password reset successful. Please log in.');
      navigate('/login');
    } catch (err: unknown) {
      const { message } = getApiError(err);
      const msg = (message || '').trim();
      if (msg.toLowerCase().includes('expired')) setError('OTP expired');
      else if (msg.toLowerCase().includes('invalid otp')) setError('Invalid OTP');
      else setError(msg || 'Password reset failed');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setResending(true);
    setError('');
    try {
      await sendForgotPasswordOtpApi(email);
    } catch (err: unknown) {
      const { message } = getApiError(err);
      setError(message || 'Failed to resend OTP');
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
          <h2 className="auth-title">Reset Password</h2>
          <p className="auth-subtitle">Enter the OTP sent to {email}</p>

          {error && <div className="alert alert-error">{error}</div>}

          <form onSubmit={handleSubmit} noValidate>
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

            <div className="form-group">
              <label htmlFor="newPassword">New Password</label>
              <input
                id="newPassword"
                name="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => { setNewPassword(e.target.value); setError(''); }}
                placeholder="NewPassword@123"
                autoComplete="new-password"
              />
            </div>

            <button type="submit" className="btn-auth" disabled={loading}>
              {loading ? 'Resetting...' : 'Reset Password'}
            </button>
          </form>

          <div className="auth-footer">
            <button type="button" className="btn-auth" disabled={resending} onClick={handleResend}>
              {resending ? 'Resending...' : 'Resend OTP'}
            </button>
            <p><Link to="/login">Back to login</Link></p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
