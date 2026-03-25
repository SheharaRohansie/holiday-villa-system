import React, { useMemo, useState } from 'react';
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

const OTPVerification: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const registrationDraft = useMemo(() => {
    const state = location.state as { registrationDraft?: RegisterRequest } | null;
    return state?.registrationDraft;
  }, [location.state]);

  const [otp, setOtp] = useState('');
  const [serverError, setServerError] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  if (!registrationDraft) return <Navigate to="/register" replace />;

  const handleOtpChange = (value: string) => {
    const digitsOnly = value.replace(/\D/g, '').slice(0, 6);
    setOtp(digitsOnly);
    setServerError('');
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
              <input
                id="otp"
                name="otp"
                type="text"
                value={otp}
                onChange={(e) => handleOtpChange(e.target.value)}
                placeholder="123456"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
              />
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
