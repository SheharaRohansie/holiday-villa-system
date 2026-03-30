import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { loginApi } from '../api/authApi';
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

const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState('');
  const [flashMessage, setFlashMessage] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const msg = sessionStorage.getItem('flashMessage');
    if (msg) {
      setFlashMessage(msg);
      sessionStorage.removeItem('flashMessage');
    }
  }, []);

  useEffect(() => {
    if (!flashMessage) return;
    const id = window.setTimeout(() => setFlashMessage(''), 3000);
    return () => window.clearTimeout(id);
  }, [flashMessage]);

  useEffect(() => {
    if (!serverError) return;
    const id = window.setTimeout(() => setServerError(''), 3000);
    return () => window.clearTimeout(id);
  }, [serverError]);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!formData.email) newErrors.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(formData.email)) newErrors.email = 'Invalid email format';
    if (!formData.password) newErrors.password = 'Password is required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    setErrors(prev => ({ ...prev, [e.target.name]: '' }));
    setServerError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    setServerError('');
    try {
      const response = await loginApi(formData);
      login(response);
      if (response.role === 'ADMIN') navigate('/admin/dashboard');
      else if (response.role === 'STAFF') navigate('/staff/dashboard');
      else navigate('/guest/dashboard');
    } catch (err: unknown) {
      const { status, message, fieldErrors } = getApiError(err);

      if (fieldErrors && Object.keys(fieldErrors).length > 0) {
        setErrors(fieldErrors);
        setServerError('');
        return;
      }

      // Spring Security auth failures come back as 401 with a generic message.
      if (status === 401) {
        setServerError('Invalid email or password. Please try again.');
      } else {
        setServerError(message || 'Login failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-container">
        <div className="auth-brand">
          <Link to="/" className="auth-logo">💒 Holiday Villa Resort</Link>
        </div>
        <div className="auth-card">
          <h2 className="auth-title">Welcome Back</h2>
          <p className="auth-subtitle">Sign in to your account</p>

          {flashMessage && <div className="alert alert-success">{flashMessage}</div>}
          {serverError && <div className="alert alert-error">{serverError}</div>}

          <form onSubmit={handleSubmit} noValidate>
            <div className="form-group">
              <label htmlFor="email">Email Address</label>
              <input
                id="email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="you@example.com"
                className={errors.email ? 'input-error' : ''}
                autoComplete="email"
              />
              {errors.email && <span className="field-error">{errors.email}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="password">Password</label>
              <input
                id="password"
                name="password"
                type="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="Enter your password"
                className={errors.password ? 'input-error' : ''}
                autoComplete="current-password"
              />
              {errors.password && <span className="field-error">{errors.password}</span>}
            </div>

            <button type="submit" className="btn-auth" disabled={loading}>
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <div className="auth-footer">
            <p><Link to="/forgot-password">Forgot Password?</Link></p>
            <p>Don't have an account? <Link to="/register">Register here</Link></p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
