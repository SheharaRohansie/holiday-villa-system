import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { sendRegistrationOtpApi } from '../api/authApi';
import { COUNTRIES } from '../data/countries';
import countryTelephoneData from 'country-telephone-data';
import { validatePhoneNumberLength } from 'libphonenumber-js/max';
import type { CountryCode } from 'libphonenumber-js';
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
const PASSPORT_REGEX = /^[A-Za-z0-9]{1,10}$/;

const normalizeCountryKey = (value: string): string => value.toLowerCase().replace(/[^a-z0-9]+/g, '');

const getPlainCountryName = (name: string): string => {
  const idx = name.indexOf(' (');
  return idx >= 0 ? name.slice(0, idx) : name;
};

const COUNTRY_NAME_ALIASES: Record<string, string> = {
  // Keep small and targeted; normalization handles most.
  'United States': 'United States',
  'United Kingdom': 'United Kingdom',
  'United Arab Emirates': 'United Arab Emirates',
};

type DialInfo = { dialCode: string; iso2: string };

const buildDialInfoByCountryName = (): Record<string, DialInfo> => {
  const map: Record<string, DialInfo> = {};

  const allCountries = (countryTelephoneData as any)?.allCountries as
    | Array<{ name: string; iso2: string; dialCode: string | number }>
    | undefined;

  if (!Array.isArray(allCountries)) return map;

  for (const entry of allCountries) {
    if (!entry || typeof entry !== 'object') continue;
    const name = (entry as any).name;
    const iso2 = (entry as any).iso2;
    const dialCode = (entry as any).dialCode;

    if (typeof name !== 'string') continue;
    if (typeof iso2 !== 'string') continue;
    if (typeof dialCode !== 'string' && typeof dialCode !== 'number') continue;

    const dialInfo: DialInfo = { dialCode: String(dialCode), iso2: iso2.toUpperCase() };

    // Index by the full name and by the plain name (before any native-name parentheses)
    // so lookups using our COUNTRIES list (e.g. "Czech Republic") match reliably.
    const fullKey = normalizeCountryKey(name);
    if (fullKey) map[fullKey] = dialInfo;

    const plainName = getPlainCountryName(name);
    const plainKey = normalizeCountryKey(plainName);
    if (plainKey) map[plainKey] = dialInfo;
  }

  return map;
};

const stripLeadingZeros = (digits: string) => digits.replace(/^0+/, '');

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

  useEffect(() => {
    if (!serverError) return;
    const id = window.setTimeout(() => setServerError(''), 3000);
    return () => window.clearTimeout(id);
  }, [serverError]);

  const dialInfoByCountryName = React.useMemo(() => buildDialInfoByCountryName(), []);

  const isSriLankan = formData.nationality === 'Sri Lanka';

  const dialInfo = (() => {
    if (!formData.nationality) return '';
    const resolvedName = COUNTRY_NAME_ALIASES[formData.nationality] ?? formData.nationality;
    const key = normalizeCountryKey(resolvedName);
    return dialInfoByCountryName[key] ?? '';
  })();

  const phoneCountryCode = typeof dialInfo === 'string' ? '' : dialInfo.dialCode;
  const phoneCountryIso2 = typeof dialInfo === 'string' ? '' : dialInfo.iso2;
  const phonePrefixLabel = phoneCountryCode ? `+${phoneCountryCode}` : '';

  const getPhoneLengthStatus = (nationalDigits: string) => {
    if (!phoneCountryIso2) return undefined;
    try {
      return validatePhoneNumberLength(nationalDigits, phoneCountryIso2 as CountryCode);
    } catch {
      return undefined;
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    const sanitizedValue = (() => {
      if (name === 'phoneNumber') {
        // Digits only (user enters local/national number only)
        const digitsOnly = value.replace(/\D/g, '');
        let nationalDigits = phoneCountryCode ? stripLeadingZeros(digitsOnly) : digitsOnly;

        // Enforce max length for the selected country.
        while (nationalDigits.length > 0 && getPhoneLengthStatus(nationalDigits) === 'TOO_LONG') {
          nationalDigits = nationalDigits.slice(0, -1);
        }

        // Also enforce backend's E.164 max length (15 digits, excluding '+').
        const maxTotalDigits = 15;
        const maxLocalDigits = Math.max(0, maxTotalDigits - (phoneCountryCode ? phoneCountryCode.length : 0));
        return nationalDigits.slice(0, maxLocalDigits);
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
      if (name === 'passportNumber') {
        // Passport: allow only letters + numbers, max 10 characters.
        const cleaned = value.replace(/[^a-zA-Z0-9]/g, '');
        return cleaned.slice(0, 10);
      }
      return value;
    })();

    setFormData(prev => {
      // If nationality changes, clear the now-irrelevant identity doc field.
      if (name === 'nationality') {
        const nextIsSriLankan = value === 'Sri Lanka';

        // When nationality changes, re-normalize phone digits to avoid double prefixes / leading zeros.
        const nextDialCode = (() => {
          if (!value) return '';
          const resolvedName = COUNTRY_NAME_ALIASES[value] ?? value;
          const key = normalizeCountryKey(resolvedName);
          return dialInfoByCountryName[key]?.dialCode ?? '';
        })();
        const nextPhoneDigits = (() => {
          const digitsOnly = (prev.phoneNumber || '').replace(/\D/g, '');
          const normalizedLocal = nextDialCode ? stripLeadingZeros(digitsOnly) : digitsOnly;
          const maxTotalDigits = 15;
          const maxLocalDigits = Math.max(0, maxTotalDigits - (nextDialCode ? nextDialCode.length : 0));
          return normalizedLocal.slice(0, maxLocalDigits);
        })();

        return {
          ...prev,
          nationality: value,
          phoneNumber: nextPhoneDigits,
          nic: nextIsSriLankan ? prev.nic : '',
          passportNumber: nextIsSriLankan ? '' : prev.passportNumber,
        };
      }
      return { ...prev, [name]: sanitizedValue };
    });

    // Live phone validation feedback (too short / invalid length) once nationality is selected.
    if (name === 'phoneNumber' && formData.nationality) {
      const digitsOnly = sanitizedValue.replace(/\D/g, '');
      const status = getPhoneLengthStatus(digitsOnly);
      if (status === 'TOO_SHORT') setErrors(prev => ({ ...prev, phoneNumber: 'Number is too short' }));
      else if (status === 'INVALID_LENGTH') setErrors(prev => ({ ...prev, phoneNumber: 'Invalid number length' }));
      else setErrors(prev => ({ ...prev, phoneNumber: '' }));
    } else if (name === 'passportNumber') {
      const cleaned = value.replace(/[^a-zA-Z0-9]/g, '');
      let msg = '';
      if (value.length > 10) msg = 'Passport number cannot exceed 10 characters';
      else if (value !== cleaned) msg = 'Passport number can contain only letters and numbers';
      setErrors(prev => ({ ...prev, passportNumber: msg }));
    } else {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
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

    const localPhoneDigits = formData.phoneNumber.trim();
    const normalizedLocalPhoneDigits = phoneCountryCode ? stripLeadingZeros(localPhoneDigits) : localPhoneDigits;
    const fullPhoneDigits = phoneCountryCode ? `${phoneCountryCode}${normalizedLocalPhoneDigits}` : normalizedLocalPhoneDigits;

    if (!normalizedLocalPhoneDigits) {
      newErrors.phoneNumber = 'Phone number is required';
    } else if (!/^\d+$/.test(normalizedLocalPhoneDigits)) {
      newErrors.phoneNumber = 'Phone must contain digits only';
    } else {
      const status = getPhoneLengthStatus(normalizedLocalPhoneDigits);
      if (status === 'TOO_SHORT') {
        newErrors.phoneNumber = 'Number is too short';
      } else if (status === 'TOO_LONG') {
        newErrors.phoneNumber = 'Number is too long';
      } else if (status === 'INVALID_LENGTH') {
        newErrors.phoneNumber = 'Invalid number length';
      } else if (!/^\d{8,15}$/.test(fullPhoneDigits)) {
        newErrors.phoneNumber = phoneCountryCode
          ? `Phone must be 8-15 digits total (including ${phonePrefixLabel})`
          : 'Phone must be 8-15 digits (numbers only)';
      }
    }

    if (!formData.nationality) newErrors.nationality = 'Nationality is required';

    if (isSriLankan) {
      if (!formData.nic.trim()) newErrors.nic = 'NIC is required for Sri Lankan nationals';
      else if (!NIC_REGEX.test(formData.nic.trim())) newErrors.nic = 'NIC must be 12 digits, or 9 digits followed by V';
    } else if (formData.nationality) {
      const p = formData.passportNumber.trim();
      if (!p) newErrors.passportNumber = 'Passport number is required';
      else if (p.length > 10) newErrors.passportNumber = 'Passport number cannot exceed 10 characters';
      else if (!PASSPORT_REGEX.test(p)) newErrors.passportNumber = 'Passport number can contain only letters and numbers';
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
      const phoneNumberToSend = phoneCountryCode
        ? `+${phoneCountryCode}${stripLeadingZeros(formData.phoneNumber)}`
        : formData.phoneNumber;

      const payload = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        phoneNumber: phoneNumberToSend,
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
              <label htmlFor="nationality">Nationality *</label>
              <select
                id="nationality" name="nationality"
                value={formData.nationality} onChange={handleChange}
                className={errors.nationality ? 'input-error' : ''}
              >
                <option value="">-- Select your nationality --</option>
                {COUNTRIES.map(c => {
                  const resolvedName = COUNTRY_NAME_ALIASES[c] ?? c;
                  const code = dialInfoByCountryName[normalizeCountryKey(resolvedName)]?.dialCode;
                  const label = code ? `${c} (+${code})` : c;
                  return (
                    <option key={c} value={c}>{label}</option>
                  );
                })}
              </select>
              {errors.nationality && <span className="field-error">{errors.nationality}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="phoneNumber">Phone Number *</label>
              <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '0.75rem' }}>
                <input
                  id="phoneCode"
                  name="phoneCode"
                  type="text"
                  value={formData.nationality ? (phonePrefixLabel || '+') : ''}
                  disabled
                  aria-label="Country code"
                />
                <input
                  id="phoneNumber" name="phoneNumber" type="tel"
                  value={formData.phoneNumber} onChange={handleChange}
                  placeholder={formData.nationality ? 'Enter local number' : 'Select nationality first'}
                  className={errors.phoneNumber ? 'input-error' : ''}
                  inputMode="numeric"
                  pattern="[0-9]*"
                  disabled={!formData.nationality}
                />
              </div>
              {formData.nationality && phonePrefixLabel && (
                <div className="field-error" style={{ color: '#666' }}>
                  Country code is set to {phonePrefixLabel}. Enter only the local number.
                </div>
              )}
              {errors.phoneNumber && <span className="field-error">{errors.phoneNumber}</span>}
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
