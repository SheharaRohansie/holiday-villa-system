import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { getAllBookingsApi, completePaymentApi } from '../api/bookingApi';
import { getAllGuestsApi, updateProfileApi } from '../api/userApi';
import { COUNTRIES } from '../data/countries';
import type { Booking, UpdateProfileRequest, UserResponse } from '../types';
import '../styles/Dashboard.css';

const StaffDashboard: React.FC = () => {
  const { user, logout, login } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'overview' | 'reservations' | 'guests' | 'profile'>('overview');

  const [message, setMessage] = useState('');
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [bookingsLoading, setBookingsLoading] = useState(false);
  const [guests, setGuests] = useState<UserResponse[]>([]);
  const [guestsLoading, setGuestsLoading] = useState(false);
  const [guestNationalityFilter, setGuestNationalityFilter] = useState<string>('');

  const [profileForm, setProfileForm] = useState<UpdateProfileRequest>({
    email: user?.email || '',
    currentPassword: '',
    newPassword: '',
  });
  const [profileErrors, setProfileErrors] = useState<UpdateProfileRequest>({});

  const handleLogout = () => { logout(); navigate('/'); };

  useEffect(() => {
    if (!message) return;
    const id = window.setTimeout(() => setMessage(''), 3000);
    return () => window.clearTimeout(id);
  }, [message]);

  const loadBookings = async () => {
    setBookingsLoading(true);
    try {
      const data = await getAllBookingsApi();
      setBookings(data);
    } catch {
      setMessage('Failed to load bookings.');
    } finally {
      setBookingsLoading(false);
    }
  };

  const loadGuests = async () => {
    setGuestsLoading(true);
    try {
      const data = await getAllGuestsApi();
      setGuests(data);
    } catch {
      setMessage('Failed to load guests.');
    } finally {
      setGuestsLoading(false);
    }
  };

  useEffect(() => {
    loadBookings();
    loadGuests();
  }, []);

  const filteredGuests = useMemo(() => {
    const f = (guestNationalityFilter || '').trim();
    if (!f) return guests;
    return guests.filter(g => (g.nationality || '').trim() === f);
  }, [guestNationalityFilter, guests]);

  const handleCompletePayment = async (bookingId: number) => {
    try {
      await completePaymentApi(bookingId);
      setMessage('Payment completed. Booking marked as COMPLETED.');
      loadBookings();
    } catch {
      setMessage('Failed to complete payment.');
    }
  };

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const errs: UpdateProfileRequest = {};
    if (profileForm.email && !/\S+@\S+\.\S+/.test(profileForm.email)) errs.email = 'Invalid email';
    if (profileForm.newPassword && !/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#^()_+\-=\[\]{};':"\\|,.<>/?]).{8,}$/.test(profileForm.newPassword)) errs.newPassword = 'Weak password';
    setProfileErrors(errs);
    if (Object.keys(errs).length > 0) return;

    try {
      const updated = await updateProfileApi(user.userId, {
        email: profileForm.email || undefined,
        currentPassword: profileForm.currentPassword || undefined,
        newPassword: profileForm.newPassword || undefined,
      });
      setMessage('Profile updated successfully!');
      login({ ...user, email: updated.email });
      setProfileForm(p => ({ ...p, currentPassword: '', newPassword: '' }));
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      setMessage(e.response?.data?.message || 'Update failed.');
    }
  };

  return (
    <div className="dashboard">
      <aside className="sidebar">
        <div className="sidebar-header">
          <span className="sidebar-logo">🌊</span>
          <div>
            <p className="sidebar-name">{user?.firstName} {user?.lastName}</p>
            <span className="role-badge badge-staff">STAFF</span>
          </div>
        </div>
        <nav className="sidebar-nav">
          {([
            { key: 'overview', icon: '📊', label: 'Overview' },
            { key: 'reservations', icon: '📅', label: 'Reservations' },
            { key: 'guests', icon: '🧳', label: 'Guest List' },
            { key: 'profile', icon: '👤', label: 'Profile' },
          ] as { key: 'overview' | 'reservations' | 'guests' | 'profile'; icon: string; label: string }[]).map(item => (
            <button
              key={item.key}
              className={`nav-item ${activeTab === item.key ? 'active' : ''}`}
              onClick={() => setActiveTab(item.key)}
            >
              <span>{item.icon}</span> {item.label}
            </button>
          ))}
        </nav>
        <button className="btn-logout-sidebar" onClick={handleLogout}>🚪 Logout</button>
      </aside>

      <main className="dashboard-main">
        {message && (
          <div className={`alert ${message.includes('success') || message.includes('completed') ? 'alert-success' : 'alert-error'}`}>
            {message}
          </div>
        )}

        {activeTab === 'overview' && (
          <div className="tab-content">
            <h2 className="tab-title">Staff Dashboard</h2>
            <div className="stats-grid">
              <div className="stat-card"><span className="stat-icon">📅</span><h3>—</h3><p>Reservations Today</p></div>
              <div className="stat-card"><span className="stat-icon">✅</span><h3>—</h3><p>Check-ins Today</p></div>
              <div className="stat-card"><span className="stat-icon">🚪</span><h3>—</h3><p>Check-outs Today</p></div>
              <div className="stat-card"><span className="stat-icon">🏨</span><h3>25</h3><p>Total Villas</p></div>
            </div>
            <div className="welcome-banner">
              <h3>Welcome back, {user?.firstName}!</h3>
              <p>You are logged in as a staff member. Use the sidebar to manage reservations and guest information.</p>
            </div>
          </div>
        )}

        {activeTab === 'reservations' && (
          <div className="tab-content">
            <h2 className="tab-title">Reservations</h2>
            {bookingsLoading ? (
              <p className="empty-state">Loading bookings…</p>
            ) : bookings.length === 0 ? (
              <p className="empty-state">No bookings found.</p>
            ) : (
              <div className="table-wrapper">
                <table className="data-table bookings-table">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Guest</th>
                      <th>Villa</th>
                      <th>Check-in</th>
                      <th>Check-out</th>
                      <th>Nights</th>
                      <th>Total (LKR)</th>
                      <th>Paid (LKR)</th>
                      <th>Remaining (LKR)</th>
                      <th>Booking Status</th>
                      <th>Payment Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bookings.map(b => (
                      <tr key={b.id}>
                        <td>#{b.id}</td>
                        <td>
                          <div className="guest-cell">
                            <span>{b.guestName}</span>
                            <small>{b.guestEmail}</small>
                          </div>
                        </td>
                        <td>{b.villaName}</td>
                        <td>{b.checkInDate}</td>
                        <td>{b.checkOutDate}</td>
                        <td>{b.nights}</td>
                        <td>{b.totalPrice.toLocaleString()}</td>
                        <td className="paid-amount">{b.amountPaid.toLocaleString()}</td>
                        <td className={b.remainingAmount > 0 ? 'remaining-amount' : 'paid-amount'}>
                          {b.remainingAmount.toLocaleString()}
                        </td>
                        <td>
                          <span className={`badge-status status-${b.status.toLowerCase()}`}>{b.status}</span>
                        </td>
                        <td>
                          <span className={`badge-payment payment-${b.paymentStatus.toLowerCase().replace('_', '-')}`}>
                            {b.paymentStatus.replace('_', ' ')}
                          </span>
                        </td>
                        <td>
                          {b.remainingAmount > 0 && b.status !== 'CANCELLED' && (
                            <button className="btn-complete-payment" onClick={() => handleCompletePayment(b.id)}>
                              Complete Payment
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {activeTab === 'guests' && (
          <div className="tab-content">
            <h2 className="tab-title">Guest List</h2>
            {guestsLoading ? (
              <p className="empty-state">Loading guests…</p>
            ) : (
              <>
                <div className="form-group" style={{ maxWidth: 320 }}>
                  <label>Filter by Nationality</label>
                  <select value={guestNationalityFilter} onChange={e => setGuestNationalityFilter(e.target.value)}>
                    <option value="">All</option>
                    {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>

                <div className="table-wrapper">
                  {filteredGuests.length === 0 ? (
                    <p className="empty-state">No records found.</p>
                  ) : (
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Name</th><th>Email</th><th>Phone</th><th>Nationality</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredGuests.map(g => (
                          <tr key={g.id}>
                            <td>{g.firstName} {g.lastName}</td>
                            <td>{g.email}</td>
                            <td>{g.phoneNumber}</td>
                            <td>{g.nationality}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </>
            )}
          </div>
        )}

        {activeTab === 'profile' && (
          <div className="tab-content">
            <h2 className="tab-title">My Profile</h2>
            <div className="form-card">
              <div className="profile-info">
                <p><strong>Name:</strong> {user?.firstName} {user?.lastName}</p>
                <p><strong>Email:</strong> {user?.email}</p>
                <p><strong>Role:</strong> <span className="role-badge badge-staff">STAFF</span></p>
              </div>
              <hr />
              <h3>Update Email / Password</h3>
              <form onSubmit={handleProfileUpdate} noValidate>
                <div className="form-group">
                  <label>New Email</label>
                  <input
                    type="email"
                    value={profileForm.email}
                    onChange={e => setProfileForm(p => ({ ...p, email: e.target.value }))}
                    placeholder="New email address"
                    className={profileErrors.email ? 'input-error' : ''}
                  />
                  {profileErrors.email && <span className="field-error">{profileErrors.email}</span>}
                </div>
                <div className="form-group">
                  <label>Current Password</label>
                  <input
                    type="password"
                    value={profileForm.currentPassword}
                    onChange={e => setProfileForm(p => ({ ...p, currentPassword: e.target.value }))}
                    placeholder="Required if changing password"
                  />
                </div>
                <div className="form-group">
                  <label>New Password</label>
                  <input
                    type="password"
                    value={profileForm.newPassword}
                    onChange={e => setProfileForm(p => ({ ...p, newPassword: e.target.value }))}
                    placeholder="New password"
                    className={profileErrors.newPassword ? 'input-error' : ''}
                  />
                  {profileErrors.newPassword && <span className="field-error">{profileErrors.newPassword}</span>}
                </div>
                <button type="submit" className="btn-primary-action">Update Profile</button>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default StaffDashboard;
