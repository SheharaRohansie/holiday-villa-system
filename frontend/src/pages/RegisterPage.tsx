import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { registerApi } from '../api/authApi';
import { COUNTRIES } from '../data/countries';
import '../styles/AuthPages.css';

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

const RegisterPage: React.FC = () => {
  const { login } = useAuth();
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
    setFormData(prev => ({ ...prev, [name]: value }));
    setErrors(prev => ({ ...prev, [name]: '' }));
  };

  const validate = (): boolean => {
    const newErrors: Partial<FormState> = {};

    if (!formData.firstName.trim()) newErrors.firstName = 'First name is required';
    if (!formData.lastName.trim()) newErrors.lastName = 'Last name is required';

    if (!formData.email.trim()) newErrors.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(formData.email)) newErrors.email = 'Invalid email format';

    if (!formData.phoneNumber.trim()) newErrors.phoneNumber = 'Phone number is required';
    else if (!/^\+?[0-9]{8,15}$/.test(formData.phoneNumber)) newErrors.phoneNumber = 'Phone must be 8-15 digits (may start with +)';

    if (!formData.nationality) newErrors.nationality = 'Nationality is required';

    if (isSriLankan) {
      if (!formData.nic.trim()) newErrors.nic = 'NIC is required for Sri Lankan nationals';
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
      const response = await registerApi(payload);
      login(response);
      navigate('/guest/dashboard');
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string; errors?: Record<string, string> } } };
      if (error.response?.data?.errors) {
        const beErrors = error.response.data.errors as Record<string, string>;
        setErrors(beErrors as Partial<FormState>);
      } else {
        setServerError(error.response?.data?.message || 'Registration failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-container auth-container-wide">
        <div className="auth-brand">
          <Link to="/" className="auth-logo">🌊 Holiday Villa Resort</Link>
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
                placeholder="+94771234567" className={errors.phoneNumber ? 'input-error' : ''}
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
