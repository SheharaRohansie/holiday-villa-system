import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { sendRegistrationOtpApi } from '../api/authApi';
import { COUNTRIES } from '../data/countries';
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

interface FormState {
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  nationality: string;
  nic: string;
  passportNumber: string;
  password: string;
  confirmPassword: string;
}

const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#^()_+\-=\[\]{};':"\\|,.<>/?]).{8,}$/;
const NIC_REGEX = /^(\d{12}|\d{9}[Vv])$/;

const RegisterPage: React.FC = () => {
  const navigate = useNavigate();

  const [formData, setFormData] = useState<FormState>({
    firstName: '',
    lastName: '',
    email: '',
    phoneNumber: '',
    nationality: '',
    nic: '',
    passportNumber: '',
    password: '',
    confirmPassword: '',
  });

  const [errors, setErrors] = useState<Partial<FormState>>({});
  const [serverError, setServerError] = useState('');
  const [loading, setLoading] = useState(false);

  const isSriLankan = formData.nationality === 'Sri Lanka';

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    const sanitizedValue = (() => {
      if (name === 'phoneNumber') {
        // Digits only
        return value.replace(/\D/g, '');
      }
      if (name === 'nic') {
        // Allow only digits and V/v (Sri Lankan NIC), keep V at the end.
        const cleaned = value.replace(/[^0-9Vv]/g, '');
        const digits = cleaned.replace(/[Vv]/g, '');
        const hasV = /[Vv]/.test(cleaned);
        // Limit to 12 digits max for the numeric-only format; keep optional trailing V.
        const limitedDigits = digits.slice(0, 12);
        const maybeV = hasV ? 'V' : '';
        // If user is typing the old NIC format (9 digits + V), digits length will be <= 9.
        return `${limitedDigits}${maybeV}`;
      }
      return value;
    })();

    setFormData(prev => {
      // If nationality changes, clear the now-irrelevant identity doc field.
      if (name === 'nationality') {
        const nextIsSriLankan = value === 'Sri Lanka';
        return {
          ...prev,
          nationality: value,
          nic: nextIsSriLankan ? prev.nic : '',
          passportNumber: nextIsSriLankan ? '' : prev.passportNumber,
        };
      }
      return { ...prev, [name]: sanitizedValue };
    });
    setErrors(prev => ({ ...prev, [name]: '' }));
    if (name === 'nationality') {
      setErrors(prev => ({ ...prev, nic: '', passportNumber: '' }));
    }
    setServerError('');
  };

  const validate = (): boolean => {
    const newErrors: Partial<FormState> = {};

    if (!formData.firstName.trim()) newErrors.firstName = 'First name is required';
    if (!formData.lastName.trim()) newErrors.lastName = 'Last name is required';

    if (!formData.email.trim()) newErrors.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(formData.email)) newErrors.email = 'Invalid email format';

    if (!formData.phoneNumber.trim()) newErrors.phoneNumber = 'Phone number is required';
    else if (!/^\d{8,15}$/.test(formData.phoneNumber)) newErrors.phoneNumber = 'Phone must be 8-15 digits (numbers only)';

    if (!formData.nationality) newErrors.nationality = 'Nationality is required';

    if (isSriLankan) {
      if (!formData.nic.trim()) newErrors.nic = 'NIC is required for Sri Lankan nationals';
      else if (!NIC_REGEX.test(formData.nic.trim())) newErrors.nic = 'NIC must be 12 digits, or 9 digits followed by V';
    } else if (formData.nationality) {
      if (!formData.passportNumber.trim()) newErrors.passportNumber = 'Passport number is required';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (!PASSWORD_REGEX.test(formData.password)) {
      newErrors.password = 'Password must be 8+ chars with uppercase, lowercase, digit & special character';
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    setServerError('');
    try {
      const payload = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        phoneNumber: formData.phoneNumber,
        nationality: formData.nationality,
        nic: isSriLankan ? formData.nic : undefined,
        passportNumber: !isSriLankan ? formData.passportNumber : undefined,
        password: formData.password,
        confirmPassword: formData.confirmPassword,
      };
      await sendRegistrationOtpApi(payload.email);
      navigate('/register/verify-otp', { state: { registrationDraft: payload } });
    } catch (err: unknown) {
      const { status, message, fieldErrors } = getApiError(err);

      if (fieldErrors && Object.keys(fieldErrors).length > 0) {
        setErrors(prev => ({ ...prev, ...(fieldErrors as Partial<FormState>) }));
        setServerError('');
        return;
      }

      // Map common backend messages (IllegalArgumentException / conflict) to field-level errors.
      const msg = (message || '').trim();
      if (status === 409 && msg.toLowerCase().includes('email')) {
        setErrors(prev => ({ ...prev, email: msg || 'Email already in use' }));
        setServerError('');
        return;
      }
      if (msg.toLowerCase().includes('passwords do not match')) {
        setErrors(prev => ({ ...prev, confirmPassword: msg }));
        setServerError('');
        return;
      }
      if (msg.toLowerCase().includes('nic is required')) {
        setErrors(prev => ({ ...prev, nic: msg }));
        setServerError('');
        return;
      }
      if (msg.toLowerCase().includes('passport number is required')) {
        setErrors(prev => ({ ...prev, passportNumber: msg }));
        setServerError('');
        return;
      }

      setServerError(msg || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-container auth-container-wide">
        <div className="auth-brand">
          <Link to="/" className="auth-logo">💒 Holiday Villa Resort</Link>
        </div>
        <div className="auth-card">
          <h2 className="auth-title">Create Account</h2>
          <p className="auth-subtitle">Register as a guest to start booking</p>

          {serverError && <div className="alert alert-error">{serverError}</div>}

          <form onSubmit={handleSubmit} noValidate>
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="firstName">First Name *</label>
                <input
                  id="firstName" name="firstName" type="text"
                  value={formData.firstName} onChange={handleChange}
                  placeholder="John" className={errors.firstName ? 'input-error' : ''}
                />
                {errors.firstName && <span className="field-error">{errors.firstName}</span>}
              </div>

              <div className="form-group">
                <label htmlFor="lastName">Last Name *</label>
                <input
                  id="lastName" name="lastName" type="text"
                  value={formData.lastName} onChange={handleChange}
                  placeholder="Doe" className={errors.lastName ? 'input-error' : ''}
                />
                {errors.lastName && <span className="field-error">{errors.lastName}</span>}
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="email">Email Address *</label>
              <input
                id="email" name="email" type="email"
                value={formData.email} onChange={handleChange}
                placeholder="john@example.com" className={errors.email ? 'input-error' : ''}
                autoComplete="email"
              />
              {errors.email && <span className="field-error">{errors.email}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="phoneNumber">Phone Number *</label>
              <input
                id="phoneNumber" name="phoneNumber" type="tel"
                value={formData.phoneNumber} onChange={handleChange}
                placeholder="0712345678" className={errors.phoneNumber ? 'input-error' : ''}
                inputMode="numeric"
                pattern="[0-9]*"
              />
              {errors.phoneNumber && <span className="field-error">{errors.phoneNumber}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="nationality">Nationality *</label>
              <select
                id="nationality" name="nationality"
                value={formData.nationality} onChange={handleChange}
                className={errors.nationality ? 'input-error' : ''}
              >
                <option value="">-- Select your nationality --</option>
                {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              {errors.nationality && <span className="field-error">{errors.nationality}</span>}
            </div>

            {/* Conditional: NIC for Sri Lanka, Passport for others */}
            {isSriLankan ? (
              <div className="form-group">
                <label htmlFor="nic">NIC Number *</label>
                <input
                  id="nic" name="nic" type="text"
                  value={formData.nic} onChange={handleChange}
                  placeholder="e.g. 990101234V or 199901012345"
                  className={errors.nic ? 'input-error' : ''}
                  inputMode="text"
                  autoCapitalize="characters"
                />
                {errors.nic && <span className="field-error">{errors.nic}</span>}
              </div>
            ) : formData.nationality ? (
              <div className="form-group">
                <label htmlFor="passportNumber">Passport Number *</label>
                <input
                  id="passportNumber" name="passportNumber" type="text"
                  value={formData.passportNumber} onChange={handleChange}
                  placeholder="e.g. N1234567"
                  className={errors.passportNumber ? 'input-error' : ''}
                />
                {errors.passportNumber && <span className="field-error">{errors.passportNumber}</span>}
              </div>
            ) : null}

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="password">Password *</label>
                <input
                  id="password" name="password" type="password"
                  value={formData.password} onChange={handleChange}
                  placeholder="Min 8 chars, mixed case + number + symbol"
                  className={errors.password ? 'input-error' : ''}
                  autoComplete="new-password"
                />
                {errors.password && <span className="field-error">{errors.password}</span>}
              </div>

              <div className="form-group">
                <label htmlFor="confirmPassword">Confirm Password *</label>
                <input
                  id="confirmPassword" name="confirmPassword" type="password"
                  value={formData.confirmPassword} onChange={handleChange}
                  placeholder="Re-enter your password"
                  className={errors.confirmPassword ? 'input-error' : ''}
                  autoComplete="new-password"
                />
                {errors.confirmPassword && <span className="field-error">{errors.confirmPassword}</span>}
              </div>
            </div>

            <div className="password-rules">
              <p>Password must contain:</p>
              <ul>
                <li className={formData.password.length >= 8 ? 'valid' : ''}>At least 8 characters</li>
                <li className={/[A-Z]/.test(formData.password) ? 'valid' : ''}>1 uppercase letter</li>
                <li className={/[a-z]/.test(formData.password) ? 'valid' : ''}>1 lowercase letter</li>
                <li className={/[0-9]/.test(formData.password) ? 'valid' : ''}>1 number</li>
                <li className={/[@$!%*?&#^()_+\-=\[\]{};':"\\|,.<>/?]/.test(formData.password) ? 'valid' : ''}>1 special character</li>
              </ul>
            </div>

            <button type="submit" className="btn-auth" disabled={loading}>
              {loading ? 'Creating Account...' : 'Create Account'}
            </button>
          </form>

          <div className="auth-footer">
            <p>Already have an account? <Link to="/login">Sign in</Link></p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;
