import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { updateProfileApi } from '../api/userApi';
import { getAllVillasApi } from '../api/villaApi';
import { getMyBookingsApi, cancelBookingApi } from '../api/bookingApi';
import type { UpdateProfileRequest, Villa, Booking } from '../types';
import VillaCard from '../components/VillaCard';
import '../styles/Dashboard.css';
import '../styles/Villa.css';
import '../styles/Booking.css';

const GuestDashboard: React.FC = () => {
  const { user, logout, login } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'overview' | 'villas' | 'reservations' | 'profile'>('overview');
  const [message, setMessage] = useState('');
  const [villas, setVillas] = useState<Villa[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [bookingsLoading, setBookingsLoading] = useState(false);

  const [profileForm, setProfileForm] = useState<UpdateProfileRequest>({
    email: user?.email || '', currentPassword: '', newPassword: '',
  });
  const [profileErrors, setProfileErrors] = useState<UpdateProfileRequest>({});

  const handleLogout = () => { logout(); navigate('/'); };

  useEffect(() => {
    getAllVillasApi().then(setVillas).catch(() => {});
    loadMyBookings();
  }, []);

  const loadMyBookings = async () => {
    setBookingsLoading(true);
    try {
      const data = await getMyBookingsApi();
      setBookings(data);
    } catch { /* silent */ }
    finally { setBookingsLoading(false); }
  };

  const handleCancelBooking = async (bookingId: number) => {
    if (!window.confirm('Are you sure you want to cancel this booking?')) return;
    try {
      await cancelBookingApi(bookingId);
      setMessage('Booking cancelled successfully.');
      loadMyBookings();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      setMessage(e.response?.data?.message || 'Failed to cancel booking.');
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
            <span className="role-badge badge-guest">GUEST</span>
          </div>
        </div>
        <nav className="sidebar-nav">
          {([
            { key: 'overview', icon: '🏠', label: 'Overview' },
            { key: 'villas', icon: '🏖️', label: 'Explore Villas' },
            { key: 'reservations', icon: '📅', label: 'My Reservations' },
            { key: 'profile', icon: '👤', label: 'My Profile' },
          ] as { key: 'overview' | 'villas' | 'reservations' | 'profile'; icon: string; label: string }[]).map(item => (
            <button
              key={item.key}
              className={`nav-item ${activeTab === item.key ? 'active' : ''}`}
              onClick={() => { setActiveTab(item.key); setMessage(''); }}
            >
              <span>{item.icon}</span> {item.label}
            </button>
          ))}
        </nav>
        <button className="btn-logout-sidebar" onClick={handleLogout}>🚪 Logout</button>
      </aside>

      <main className="dashboard-main">
        {message && (
          <div className={`alert ${message.includes('successfully') ? 'alert-success' : 'alert-error'}`}>
            {message} <button onClick={() => setMessage('')} className="alert-close">×</button>
          </div>
        )}

        {activeTab === 'overview' && (
          <div className="tab-content">
            <h2 className="tab-title">Welcome, {user?.firstName}!</h2>
            <div className="welcome-banner">
              <p>You're logged in as a guest. Browse our villas and make your reservation.</p>
              <Link to="/#villas" className="btn-primary-action inline">Explore Villas</Link>
            </div>
            <div className="stats-grid">
              <div className="stat-card"><span className="stat-icon">📅</span><h3>{bookings.length}</h3><p>My Reservations</p></div>
              <div className="stat-card"><span className="stat-icon">✅</span><h3>{bookings.filter(b => b.status === 'CONFIRMED').length}</h3><p>Confirmed</p></div>
              <div className="stat-card"><span className="stat-icon">💳</span><h3>{bookings.filter(b => b.paymentStatus === 'FULLY_PAID').length}</h3><p>Fully Paid</p></div>
              <div className="stat-card"><span className="stat-icon">🎁</span><h3>3</h3><p>Active Offers</p></div>
            </div>
          </div>
        )}

        {activeTab === 'villas' && (
          <div className="tab-content">
            <h2 className="tab-title">Explore Our Villas</h2>
            {villas.length === 0 ? (
              <p className="empty-state">No villas available at the moment. Check back soon!</p>
            ) : (
              <div className="guest-villas-grid">
                {villas.map(v => <VillaCard key={v.id} villa={v} />)}
              </div>
            )}
          </div>
        )}

        {activeTab === 'reservations' && (
          <div className="tab-content">
            <h2 className="tab-title">My Reservations</h2>
            {bookingsLoading ? (
              <p className="empty-state">Loading your bookings…</p>
            ) : bookings.length === 0 ? (
              <div className="coming-soon-card">
                <span>📅</span>
                <h3>No Reservations Yet</h3>
                <p>Browse our villas and make your first reservation.</p>
                <button className="btn-primary-action inline" onClick={() => setActiveTab('villas')}>Browse Villas</button>
              </div>
            ) : (
              <div className="bookings-list">
                {bookings.map(b => (
                  <div key={b.id} className="booking-card">
                    <div className="booking-card-header">
                      <div>
                        <h3 className="booking-villa-title">{b.villaName}</h3>
                        <p className="booking-id">Booking #{b.id}</p>
                      </div>
                      <div className="booking-badges">
                        <span className={`badge-status status-${b.status.toLowerCase()}`}>{b.status}</span>
                        <span className={`badge-payment payment-${b.paymentStatus.toLowerCase().replace('_', '-')}`}>{b.paymentStatus.replace('_', ' ')}</span>
                      </div>
                    </div>
                    <div className="booking-card-body">
                      <div className="booking-detail-grid">
                        <div className="booking-detail-item">
                          <span className="detail-label">Check-in</span>
                          <span className="detail-value">{b.checkInDate}</span>
                        </div>
                        <div className="booking-detail-item">
                          <span className="detail-label">Check-out</span>
                          <span className="detail-value">{b.checkOutDate}</span>
                        </div>
                        <div className="booking-detail-item">
                          <span className="detail-label">Nights</span>
                          <span className="detail-value">{b.nights}</span>
                        </div>
                        <div className="booking-detail-item">
                          <span className="detail-label">Total Price</span>
                          <span className="detail-value">LKR {b.totalPrice.toLocaleString()}</span>
                        </div>
                        <div className="booking-detail-item">
                          <span className="detail-label">Amount Paid</span>
                          <span className="detail-value paid-amount">LKR {b.amountPaid.toLocaleString()}</span>
                        </div>
                        <div className="booking-detail-item">
                          <span className="detail-label">Remaining</span>
                          <span className={`detail-value ${b.remainingAmount > 0 ? 'remaining-amount' : 'paid-amount'}`}>
                            LKR {b.remainingAmount.toLocaleString()}
                          </span>
                        </div>
                      </div>
                      {b.paymentStatus === 'PARTIALLY_PAID' && (
                        <div className="booking-partial-notice">
                          ⚠️ Remaining balance of <strong>LKR {b.remainingAmount.toLocaleString()}</strong> must be paid at check-out.
                        </div>
                      )}
                    </div>
                    {(b.status === 'PENDING' || b.status === 'CONFIRMED') && (
                      <div className="booking-card-actions">
                        <button
                          className="btn-cancel-booking"
                          onClick={() => handleCancelBooking(b.id)}
                        >
                          Cancel Booking
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
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
                <p><strong>Role:</strong> <span className="role-badge badge-guest">GUEST</span></p>
              </div>
              <hr />
              <h3>Update Email / Password</h3>
              <form onSubmit={handleProfileUpdate} noValidate>
                <div className="form-group">
                  <label>New Email</label>
                  <input type="email" value={profileForm.email} onChange={e => setProfileForm(p => ({ ...p, email: e.target.value }))} placeholder="New email address" className={profileErrors.email ? 'input-error' : ''} />
                  {profileErrors.email && <span className="field-error">{profileErrors.email}</span>}
                </div>
                <div className="form-group">
                  <label>Current Password</label>
                  <input type="password" value={profileForm.currentPassword} onChange={e => setProfileForm(p => ({ ...p, currentPassword: e.target.value }))} placeholder="Required to change password" />
                </div>
                <div className="form-group">
                  <label>New Password</label>
                  <input type="password" value={profileForm.newPassword} onChange={e => setProfileForm(p => ({ ...p, newPassword: e.target.value }))} placeholder="New secure password" className={profileErrors.newPassword ? 'input-error' : ''} />
                  {profileErrors.newPassword && <span className="field-error">{profileErrors.newPassword}</span>}
                </div>
                <button type="submit" className="btn-primary-action">Save Changes</button>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default GuestDashboard;
