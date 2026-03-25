import React, { useMemo, useState } from 'react';
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

const ResetPassword: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const email = useMemo(() => {
    const state = location.state as { email?: string } | null;
    return state?.email;
  }, [location.state]);

  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  if (!email) return <Navigate to="/forgot-password" replace />;

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
              <input
                id="otp"
                name="otp"
                type="text"
                value={otp}
                onChange={(e) => { setOtp(e.target.value.replace(/\D/g, '').slice(0, 6)); setError(''); }}
                placeholder="123456"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
              />
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
