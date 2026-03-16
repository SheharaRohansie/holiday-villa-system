import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { getAllUsersApi, getAllStaffApi, getAllGuestsApi, createStaffApi, deleteUserApi, updateProfileApi } from '../api/userApi';
import { getAllVillasApi, addVillaApi, updateVillaApi, deleteVillaApi } from '../api/villaApi';
import { getAllBookingsApi, completePaymentApi } from '../api/bookingApi';
import { getAllPromotionsApi, createPromotionApi, updatePromotionApi, deletePromotionApi } from '../api/promotionApi';
import type { UserResponse, CreateStaffRequest, UpdateProfileRequest, Villa, VillaRequest, Booking, Promotion, PromotionRequest } from '../types';
import { COUNTRIES } from '../data/countries';
import VillaTable from '../components/VillaTable';
import AdminReviews from './AdminReviews';
import RevenueDashboard from './RevenueDashboard';
import '../styles/Dashboard.css';
import '../styles/Villa.css';
import '../styles/Booking.css';

type ActiveTab = 'overview' | 'staff' | 'guests' | 'create-staff' | 'profile' | 'villas' | 'add-villa' | 'edit-villa' | 'bookings' | 'revenue' | 'promotions' | 'add-promotion' | 'edit-promotion' | 'reviews';

const emptyVillaForm = (): VillaRequest => ({
  name: '', description: '', pricePerNight: '',
  maxGuests: '', amenities: [], imageUrls: ['', '', ''],
});

const emptyPromoForm = (): PromotionRequest => ({
  villaId: 0,
  title: '',
  description: '',
  discountType: 'PERCENTAGE',
  discountValue: 0,
  startDate: '',
  endDate: '',
  isActive: true,
});

const AdminDashboard: React.FC = () => {
  const { user, logout, login } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<ActiveTab>('overview');
  const [allUsers, setAllUsers] = useState<UserResponse[]>([]);
  const [staff, setStaff] = useState<UserResponse[]>([]);
  const [guests, setGuests] = useState<UserResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  // Villa state
  const [villas, setVillas] = useState<Villa[]>([]);
  const [villaForm, setVillaForm] = useState<VillaRequest>(emptyVillaForm());
  const [villaErrors, setVillaErrors] = useState<Partial<Record<keyof VillaRequest, string>>>({});
  const [editingVillaId, setEditingVillaId] = useState<number | null>(null);

  // Bookings state
  const [bookings, setBookings] = useState<Booking[]>([]);

  // Promotions state
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [promoForm, setPromoForm] = useState<PromotionRequest>(emptyPromoForm());
  const [editingPromoId, setEditingPromoId] = useState<number | null>(null);
  const [promoErrors, setPromoErrors] = useState<Partial<Record<keyof PromotionRequest, string>>>({});

  // Create Staff Form
  const [staffForm, setStaffForm] = useState<CreateStaffRequest>({
    firstName: '', lastName: '', email: '', phoneNumber: '',
    nationality: '', nic: '', passportNumber: '', password: '',
  });
  const [staffErrors, setStaffErrors] = useState<Partial<CreateStaffRequest>>({});

  // Profile Update Form
  const [profileForm, setProfileForm] = useState<UpdateProfileRequest>({
    email: user?.email || '', currentPassword: '', newPassword: '',
  });
  const [profileErrors, setProfileErrors] = useState<UpdateProfileRequest>({});

  useEffect(() => {
    loadAllUsers();
    loadVillas();
    loadBookings();
    loadPromotions();
  }, []);

  const loadBookings = async () => {
    try {
      const data = await getAllBookingsApi();
      setBookings(data);
    } catch { /* silent */ }
  };

  const handleCompletePayment = async (bookingId: number) => {
    if (!window.confirm('Mark remaining payment as received and complete this booking?')) return;
    try {
      await completePaymentApi(bookingId);
      setMessage('Payment completed. Booking marked as COMPLETED.');
      loadBookings();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      setMessage(e.response?.data?.message || 'Failed to complete payment.');
    }
  };

  const loadPromotions = async () => {
    try { setPromotions(await getAllPromotionsApi()); } catch { /* silent */ }
  };

  const validatePromoForm = (form: PromotionRequest): Partial<Record<keyof PromotionRequest, string>> => {
    const errs: Partial<Record<keyof PromotionRequest, string>> = {};
    if (!form.villaId) errs.villaId = 'Villa is required';
    if (!form.title.trim()) errs.title = 'Title is required';
    if (!form.description.trim()) errs.description = 'Description is required';
    if (!form.discountValue || form.discountValue <= 0) errs.discountValue = 'Discount value must be positive';
    if (form.discountType === 'PERCENTAGE' && form.discountValue > 100) errs.discountValue = 'Percentage cannot exceed 100';
    if (!form.startDate) errs.startDate = 'Start date is required';
    if (!form.endDate) errs.endDate = 'End date is required';
    if (form.startDate && form.endDate && form.endDate <= form.startDate) errs.endDate = 'End date must be after start date';
    return errs;
  };

  const handleAddPromotion = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validatePromoForm(promoForm);
    setPromoErrors(errs);
    if (Object.keys(errs).length > 0) return;
    try {
      await createPromotionApi(promoForm);
      setMessage('Promotion created successfully!');
      setPromoForm(emptyPromoForm());
      await loadPromotions();
      setActiveTab('promotions');
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      setMessage(e.response?.data?.message || 'Failed to create promotion.');
    }
  };

  const handleEditPromotionSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPromoId) return;
    const errs = validatePromoForm(promoForm);
    setPromoErrors(errs);
    if (Object.keys(errs).length > 0) return;
    try {
      await updatePromotionApi(editingPromoId, promoForm);
      setMessage('Promotion updated successfully!');
      setPromoForm(emptyPromoForm());
      setEditingPromoId(null);
      await loadPromotions();
      setActiveTab('promotions');
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      setMessage(e.response?.data?.message || 'Failed to update promotion.');
    }
  };

  const handleDeletePromotion = async (id: number) => {
    if (!window.confirm('Delete this promotion?')) return;
    try {
      await deletePromotionApi(id);
      setMessage('Promotion deleted.');
      await loadPromotions();
    } catch { setMessage('Failed to delete promotion.'); }
  };

  const handleTogglePromotion = async (promo: Promotion) => {
    try {
      await updatePromotionApi(promo.id, {
        villaId: promo.villaId,
        title: promo.title,
        description: promo.description,
        discountType: promo.discountType,
        discountValue: promo.discountValue,
        startDate: promo.startDate,
        endDate: promo.endDate,
        isActive: !promo.isActive,
      });
      await loadPromotions();
    } catch { setMessage('Failed to toggle promotion.'); }
  };

  const startEditPromotion = (promo: Promotion) => {
    setEditingPromoId(promo.id);
    setPromoForm({
      villaId: promo.villaId,
      title: promo.title,
      description: promo.description,
      discountType: promo.discountType,
      discountValue: promo.discountValue,
      startDate: promo.startDate,
      endDate: promo.endDate,
      isActive: promo.isActive,
    });
    setPromoErrors({});
    setActiveTab('edit-promotion');
  };

  const loadAllUsers = async () => {
    setLoading(true);
    try {
      const [u, s, g] = await Promise.all([getAllUsersApi(), getAllStaffApi(), getAllGuestsApi()]);
      setAllUsers(u); setStaff(s); setGuests(g);
    } catch { setMessage('Failed to load users.'); }
    finally { setLoading(false); }
  };

  const loadVillas = async () => {
    try {
      const data = await getAllVillasApi();
      setVillas(data);
    } catch { /* silent */ }
  };

  const validateVillaForm = (): boolean => {
    const errs: Partial<Record<keyof VillaRequest, string>> = {};
    if (!villaForm.name.trim()) errs.name = 'Villa name is required';
    if (!villaForm.description.toString().trim()) errs.description = 'Description is required';
    if (!villaForm.pricePerNight || Number(villaForm.pricePerNight) <= 0) errs.pricePerNight = 'Price must be positive';
    const images = villaForm.imageUrls.filter(u => u.trim() !== '');
    if (images.length === 0) errs.imageUrls = 'At least one image URL is required';
    setVillaErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const buildVillaPayload = (): VillaRequest => ({
    ...villaForm,
    pricePerNight: Number(villaForm.pricePerNight),
    maxGuests: villaForm.maxGuests ? Number(villaForm.maxGuests) : 0,
    amenities: (villaForm.amenities as string[]).filter(Boolean),
    imageUrls: villaForm.imageUrls.filter(u => u.trim() !== ''),
  });

  const handleAddVilla = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateVillaForm()) return;
    try {
      await addVillaApi(buildVillaPayload());
      setMessage('Villa added successfully!');
      setVillaForm(emptyVillaForm());
      await loadVillas();
      setActiveTab('villas');
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      setMessage(e.response?.data?.message || 'Failed to add villa.');
    }
  };

  const handleEditVillaSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingVillaId || !validateVillaForm()) return;
    try {
      await updateVillaApi(editingVillaId, buildVillaPayload());
      setMessage('Villa updated successfully!');
      setVillaForm(emptyVillaForm());
      setEditingVillaId(null);
      await loadVillas();
      setActiveTab('villas');
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      setMessage(e.response?.data?.message || 'Failed to update villa.');
    }
  };

  const handleDeleteVilla = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this villa?')) return;
    try {
      await deleteVillaApi(id);
      setMessage('Villa deleted successfully.');
      await loadVillas();
    } catch { setMessage('Failed to delete villa.'); }
  };

  const startEditVilla = (villa: Villa) => {
    setEditingVillaId(villa.id);
    const urls = [...villa.imageUrls];
    while (urls.length < 3) urls.push('');
    setVillaForm({
      name: villa.name,
      description: villa.description,
      pricePerNight: villa.pricePerNight,
      maxGuests: villa.maxGuests ?? '',
      amenities: villa.amenities,
      imageUrls: urls,
    });
    setVillaErrors({});
    setActiveTab('edit-villa');
  };

  const handleDeleteUser = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this user?')) return;
    try {
      await deleteUserApi(id);
      setMessage('User deleted successfully.');
      loadAllUsers();
    } catch { setMessage('Failed to delete user.'); }
  };

  const handleCreateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs: Partial<CreateStaffRequest> = {};
    if (!staffForm.firstName) errs.firstName = 'Required';
    if (!staffForm.lastName) errs.lastName = 'Required';
    if (!staffForm.email) errs.email = 'Required';
    else if (!/\S+@\S+\.\S+/.test(staffForm.email)) errs.email = 'Invalid email';
    if (!staffForm.phoneNumber) errs.phoneNumber = 'Required';
    else if (!/^\+?[0-9]{8,15}$/.test(staffForm.phoneNumber)) errs.phoneNumber = 'Invalid phone';
    if (!staffForm.nationality) errs.nationality = 'Required';
    if (staffForm.nationality === 'Sri Lanka' && !staffForm.nic) errs.nic = 'NIC required for Sri Lankans';
    if (staffForm.nationality && staffForm.nationality !== 'Sri Lanka' && !staffForm.passportNumber) errs.passportNumber = 'Passport required';
    if (!staffForm.password) errs.password = 'Required';
    else if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#^()_+\-=\[\]{};':"\\|,.<>/?]).{8,}$/.test(staffForm.password)) errs.password = 'Weak password';
    setStaffErrors(errs);
    if (Object.keys(errs).length > 0) return;

    try {
      await createStaffApi({
        ...staffForm,
        nic: staffForm.nationality === 'Sri Lanka' ? staffForm.nic : undefined,
        passportNumber: staffForm.nationality !== 'Sri Lanka' ? staffForm.passportNumber : undefined,
      });
      setMessage('Staff account created successfully!');
      setStaffForm({ firstName: '', lastName: '', email: '', phoneNumber: '', nationality: '', nic: '', passportNumber: '', password: '' });
      loadAllUsers();
      setActiveTab('staff');
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      setMessage(e.response?.data?.message || 'Failed to create staff.');
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
      setMessage('Profile updated! Please login again if you changed your email/password.');
      login({ ...user, email: updated.email });
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      setMessage(e.response?.data?.message || 'Update failed.');
    }
  };

  const handleLogout = () => { logout(); navigate('/'); };

  return (
    <div className="dashboard">
      <aside className="sidebar">
        <div className="sidebar-header">
          <span className="sidebar-logo">🌊</span>
          <div>
            <p className="sidebar-name">{user?.firstName} {user?.lastName}</p>
            <span className="role-badge badge-admin">ADMIN</span>
          </div>
        </div>
        <nav className="sidebar-nav">
          {([
            { key: 'overview', icon: '📊', label: 'Overview' },
            { key: 'bookings', icon: '📅', label: 'Manage Bookings' },
            { key: 'villas', icon: '🏖️', label: 'Manage Villas' },
            { key: 'promotions', icon: '🎁', label: 'Manage Promotions' },
            { key: 'staff', icon: '👥', label: 'Staff Members' },
            { key: 'guests', icon: '🧳', label: 'Guests' },
            { key: 'create-staff', icon: '➕', label: 'Create Staff' },
            { key: 'reviews', icon: '⭐', label: 'Review Management' },
            { key: 'revenue', icon: '💰', label: 'Revenue Analytics' },
            { key: 'profile', icon: '⚙️', label: 'My Profile' },
          ] as { key: ActiveTab; icon: string; label: string }[]).map(item => (
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
          <div className={`alert ${message.includes('success') || message.includes('created') || message.includes('updated') || message.includes('deleted') ? 'alert-success' : 'alert-error'}`}>
            {message}
            <button onClick={() => setMessage('')} className="alert-close">×</button>
          </div>
        )}

        {/* OVERVIEW */}
        {activeTab === 'overview' && (
          <div className="tab-content">
            <h2 className="tab-title">Dashboard Overview</h2>
            <div className="stats-grid">
              <div className="stat-card"><span className="stat-icon">👥</span><h3>{allUsers.length}</h3><p>Total Users</p></div>
              <div className="stat-card"><span className="stat-icon">🧑‍💼</span><h3>{staff.length}</h3><p>Staff Members</p></div>
              <div className="stat-card"><span className="stat-icon">🧳</span><h3>{guests.length}</h3><p>Guests</p></div>
              <div className="stat-card"><span className="stat-icon">🏨</span><h3>{villas.length}</h3><p>Villas Available</p></div>
              <div className="stat-card"><span className="stat-icon">📅</span><h3>{bookings.length}</h3><p>Total Bookings</p></div>
              <div className="stat-card"><span className="stat-icon">✅</span><h3>{bookings.filter(b => b.status === 'CONFIRMED').length}</h3><p>Confirmed</p></div>
            </div>
            <div className="recent-section">
              <h3>Recent Users</h3>
              <UserTable users={allUsers.slice(-5).reverse()} onDelete={handleDeleteUser} />
            </div>
          </div>
        )}

        {/* BOOKINGS */}
        {activeTab === 'bookings' && (
          <div className="tab-content">
            <h2 className="tab-title">Manage Bookings</h2>
            {bookings.length === 0 ? (
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
                            <button
                              className="btn-complete-payment"
                              onClick={() => handleCompletePayment(b.id)}
                            >
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

        {/* STAFF */}
        {activeTab === 'staff' && (
          <div className="tab-content">
            <h2 className="tab-title">Staff Members</h2>
            {loading ? <p>Loading...</p> : <UserTable users={staff} onDelete={handleDeleteUser} />}
          </div>
        )}

        {/* GUESTS */}
        {activeTab === 'guests' && (
          <div className="tab-content">
            <h2 className="tab-title">Registered Guests</h2>
            {loading ? <p>Loading...</p> : <UserTable users={guests} onDelete={handleDeleteUser} />}
          </div>
        )}

        {/* VILLAS */}
        {activeTab === 'villas' && (
          <div className="tab-content">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h2 className="tab-title">Manage Villas</h2>
              <button className="btn-primary-action" onClick={() => { setVillaForm(emptyVillaForm()); setVillaErrors({}); setActiveTab('add-villa'); }}>
                ➕ Add New Villa
              </button>
            </div>
            <VillaTable villas={villas} onEdit={startEditVilla} onDelete={handleDeleteVilla} />
          </div>
        )}

        {/* ADD VILLA */}
        {activeTab === 'add-villa' && (
          <div className="tab-content">
            <h2 className="tab-title">Add New Villa</h2>
            <div className="form-card">
              <form onSubmit={handleAddVilla} noValidate>
                <VillaFormFields form={villaForm} setForm={setVillaForm} errors={villaErrors} />
                <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                  <button type="submit" className="btn-primary-action">Add Villa</button>
                  <button type="button" className="btn-primary-action" style={{ background: '#888' }}
                    onClick={() => setActiveTab('villas')}>Cancel</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* EDIT VILLA */}
        {activeTab === 'edit-villa' && (
          <div className="tab-content">
            <h2 className="tab-title">Edit Villa</h2>
            <div className="form-card">
              <form onSubmit={handleEditVillaSave} noValidate>
                <VillaFormFields form={villaForm} setForm={setVillaForm} errors={villaErrors} />
                <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                  <button type="submit" className="btn-primary-action">Update Villa</button>
                  <button type="button" className="btn-primary-action" style={{ background: '#888' }}
                    onClick={() => setActiveTab('villas')}>Cancel</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* CREATE STAFF */}
        {activeTab === 'create-staff' && (
          <div className="tab-content">
            <h2 className="tab-title">Create Staff Account</h2>
            <div className="form-card">
              <form onSubmit={handleCreateStaff} noValidate>
                <div className="form-row">
                  <div className="form-group">
                    <label>First Name *</label>
                    <input value={staffForm.firstName} onChange={e => setStaffForm(p => ({ ...p, firstName: e.target.value }))} placeholder="First Name" className={staffErrors.firstName ? 'input-error' : ''} />
                    {staffErrors.firstName && <span className="field-error">{staffErrors.firstName}</span>}
                  </div>
                  <div className="form-group">
                    <label>Last Name *</label>
                    <input value={staffForm.lastName} onChange={e => setStaffForm(p => ({ ...p, lastName: e.target.value }))} placeholder="Last Name" className={staffErrors.lastName ? 'input-error' : ''} />
                    {staffErrors.lastName && <span className="field-error">{staffErrors.lastName}</span>}
                  </div>
                </div>
                <div className="form-group">
                  <label>Email *</label>
                  <input type="email" value={staffForm.email} onChange={e => setStaffForm(p => ({ ...p, email: e.target.value }))} placeholder="staff@holidayvilla.com" className={staffErrors.email ? 'input-error' : ''} />
                  {staffErrors.email && <span className="field-error">{staffErrors.email}</span>}
                </div>
                <div className="form-group">
                  <label>Phone Number *</label>
                  <input value={staffForm.phoneNumber} onChange={e => setStaffForm(p => ({ ...p, phoneNumber: e.target.value }))} placeholder="+94771234567" className={staffErrors.phoneNumber ? 'input-error' : ''} />
                  {staffErrors.phoneNumber && <span className="field-error">{staffErrors.phoneNumber}</span>}
                </div>
                <div className="form-group">
                  <label>Nationality *</label>
                  <select value={staffForm.nationality} onChange={e => setStaffForm(p => ({ ...p, nationality: e.target.value, nic: '', passportNumber: '' }))} className={staffErrors.nationality ? 'input-error' : ''}>
                    <option value="">-- Select --</option>
                    {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                  {staffErrors.nationality && <span className="field-error">{staffErrors.nationality}</span>}
                </div>
                {staffForm.nationality === 'Sri Lanka' ? (
                  <div className="form-group">
                    <label>NIC *</label>
                    <input value={staffForm.nic} onChange={e => setStaffForm(p => ({ ...p, nic: e.target.value }))} placeholder="NIC Number" className={staffErrors.nic ? 'input-error' : ''} />
                    {staffErrors.nic && <span className="field-error">{staffErrors.nic}</span>}
                  </div>
                ) : staffForm.nationality ? (
                  <div className="form-group">
                    <label>Passport Number *</label>
                    <input value={staffForm.passportNumber} onChange={e => setStaffForm(p => ({ ...p, passportNumber: e.target.value }))} placeholder="Passport Number" className={staffErrors.passportNumber ? 'input-error' : ''} />
                    {staffErrors.passportNumber && <span className="field-error">{staffErrors.passportNumber}</span>}
                  </div>
                ) : null}
                <div className="form-group">
                  <label>Password *</label>
                  <input type="password" value={staffForm.password} onChange={e => setStaffForm(p => ({ ...p, password: e.target.value }))} placeholder="Strong password" className={staffErrors.password ? 'input-error' : ''} />
                  {staffErrors.password && <span className="field-error">{staffErrors.password}</span>}
                </div>
                <button type="submit" className="btn-primary-action">Create Staff Account</button>
              </form>
            </div>
          </div>
        )}

        {/* PROMOTIONS */}
        {activeTab === 'promotions' && (
          <div className="tab-content">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h2 className="tab-title">Manage Promotions</h2>
              <button className="btn-primary-action" onClick={() => { setPromoForm(emptyPromoForm()); setPromoErrors({}); setActiveTab('add-promotion'); }}>
                ➕ Add Promotion
              </button>
            </div>
            {promotions.length === 0 ? (
              <p className="empty-state">No promotions found. Create one to get started.</p>
            ) : (
              <div className="table-wrapper">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Villa</th><th>Title</th><th>Discount</th><th>Start</th><th>End</th><th>Status</th><th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {promotions.map(p => (
                      <tr key={p.id}>
                        <td>{p.villaName}</td>
                        <td>
                          <div><strong>{p.title}</strong></div>
                          <small style={{ color: '#888' }}>{p.description}</small>
                        </td>
                        <td>
                          <span className="badge badge-advance">
                            {p.discountType === 'PERCENTAGE' ? `${p.discountValue}%` : `LKR ${p.discountValue.toLocaleString()}`} OFF
                          </span>
                        </td>
                        <td>{p.startDate}</td>
                        <td>{p.endDate}</td>
                        <td>
                          <button
                            className={`badge-status ${p.isActive ? 'status-confirmed' : 'status-cancelled'}`}
                            style={{ cursor: 'pointer', border: 'none', padding: '0.25rem 0.6rem', borderRadius: '4px', fontWeight: 600 }}
                            onClick={() => handleTogglePromotion(p)}
                            title="Click to toggle active/inactive"
                          >
                            {p.isActive ? '✅ Active' : '⏸ Inactive'}
                          </button>
                        </td>
                        <td style={{ display: 'flex', gap: '0.5rem' }}>
                          <button className="btn-primary-action" style={{ padding: '0.3rem 0.8rem', fontSize: '0.8rem' }} onClick={() => startEditPromotion(p)}>Edit</button>
                          <button className="btn-delete" onClick={() => handleDeletePromotion(p.id)}>Delete</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ADD PROMOTION */}
        {activeTab === 'add-promotion' && (
          <div className="tab-content">
            <h2 className="tab-title">Add New Promotion</h2>
            <div className="form-card">
              <form onSubmit={handleAddPromotion} noValidate>
                <PromotionFormFields form={promoForm} setForm={setPromoForm} errors={promoErrors} villas={villas} />
                <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                  <button type="submit" className="btn-primary-action">Create Promotion</button>
                  <button type="button" className="btn-primary-action" style={{ background: '#888' }} onClick={() => setActiveTab('promotions')}>Cancel</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* EDIT PROMOTION */}
        {activeTab === 'edit-promotion' && (
          <div className="tab-content">
            <h2 className="tab-title">Edit Promotion</h2>
            <div className="form-card">
              <form onSubmit={handleEditPromotionSave} noValidate>
                <PromotionFormFields form={promoForm} setForm={setPromoForm} errors={promoErrors} villas={villas} />
                <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                  <button type="submit" className="btn-primary-action">Update Promotion</button>
                  <button type="button" className="btn-primary-action" style={{ background: '#888' }} onClick={() => setActiveTab('promotions')}>Cancel</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* REVIEW MANAGEMENT */}
        {activeTab === 'reviews' && (
          <AdminReviews />
        )}

        {/* REVENUE ANALYTICS */}
        {activeTab === 'revenue' && (
          <RevenueDashboard />
        )}
        {activeTab === 'profile' && (
          <div className="tab-content">
            <h2 className="tab-title">My Profile Settings</h2>
            <div className="form-card">
              <div className="profile-info">
                <p><strong>Name:</strong> {user?.firstName} {user?.lastName}</p>
                <p><strong>Email:</strong> {user?.email}</p>
                <p><strong>Role:</strong> <span className="role-badge badge-admin">ADMIN</span></p>
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
                  <input type="password" value={profileForm.currentPassword} onChange={e => setProfileForm(p => ({ ...p, currentPassword: e.target.value }))} placeholder="Required if changing password" />
                </div>
                <div className="form-group">
                  <label>New Password</label>
                  <input type="password" value={profileForm.newPassword} onChange={e => setProfileForm(p => ({ ...p, newPassword: e.target.value }))} placeholder="New password" className={profileErrors.newPassword ? 'input-error' : ''} />
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

const VillaFormFields: React.FC<{
  form: VillaRequest;
  setForm: React.Dispatch<React.SetStateAction<VillaRequest>>;
  errors: Partial<Record<keyof VillaRequest, string>>;
}> = ({ form, setForm, errors }) => (
  <div className="villa-form-grid">
    <div className="form-group">
      <label>Villa Name *</label>
      <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
        placeholder="e.g. Ocean Breeze Villa" className={errors.name ? 'input-error' : ''} />
      {errors.name && <span className="field-error">{errors.name}</span>}
    </div>
    <div className="form-group villa-form-full">
      <label>Description *</label>
      <textarea rows={4} value={form.description as string}
        onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
        placeholder="Full villa description…" className={errors.description ? 'input-error' : ''}
        style={{ resize: 'vertical' }} />
      {errors.description && <span className="field-error">{errors.description}</span>}
    </div>
    <div className="form-group">
      <label>Price Per Night (LKR) *</label>
      <input type="number" min={1} value={form.pricePerNight as string}
        onChange={e => setForm(p => ({ ...p, pricePerNight: e.target.value }))}
        placeholder="e.g. 250" className={errors.pricePerNight ? 'input-error' : ''} />
      {errors.pricePerNight && <span className="field-error">{errors.pricePerNight}</span>}
    </div>
    <div className="form-group">
      <label>Max Guests</label>
      <input type="number" min={1} value={form.maxGuests as string}
        onChange={e => setForm(p => ({ ...p, maxGuests: e.target.value }))}
        placeholder="e.g. 6" />
    </div>
    <div className="form-group villa-form-full">
      <label>Amenities (comma separated)</label>
      <input value={(form.amenities as string[]).join(', ')}
        onChange={e => setForm(p => ({ ...p, amenities: e.target.value.split(',').map(s => s.trim()) }))}
        placeholder="e.g. Pool, WiFi, Air Conditioning, Beach Access" />
    </div>
    {[0, 1, 2].map(i => (
      <div className="form-group" key={i}>
        <label>Image URL {i + 1} {i === 0 ? '*' : '(optional)'}</label>
        <input value={form.imageUrls[i] || ''}
          onChange={e => setForm(p => {
            const urls = [...p.imageUrls];
            urls[i] = e.target.value;
            return { ...p, imageUrls: urls };
          })}
          placeholder="https://example.com/image.jpg"
          className={i === 0 && errors.imageUrls ? 'input-error' : ''} />
        {i === 0 && errors.imageUrls && <span className="field-error">{errors.imageUrls}</span>}
      </div>
    ))}
  </div>
);

const PromotionFormFields: React.FC<{
  form: PromotionRequest;
  setForm: React.Dispatch<React.SetStateAction<PromotionRequest>>;
  errors: Partial<Record<keyof PromotionRequest, string>>;
  villas: Villa[];
}> = ({ form, setForm, errors, villas }) => (
  <div className="villa-form-grid">
    <div className="form-group">
      <label>Villa *</label>
      <select value={form.villaId} onChange={e => setForm(p => ({ ...p, villaId: Number(e.target.value) }))}
        className={errors.villaId ? 'input-error' : ''}>
        <option value={0}>-- Select Villa --</option>
        {villas.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
      </select>
      {errors.villaId && <span className="field-error">{errors.villaId}</span>}
    </div>
    <div className="form-group">
      <label>Title *</label>
      <input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
        placeholder="e.g. Summer Special" className={errors.title ? 'input-error' : ''} />
      {errors.title && <span className="field-error">{errors.title}</span>}
    </div>
    <div className="form-group villa-form-full">
      <label>Description *</label>
      <textarea rows={3} value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
        placeholder="Describe the promotion…" className={errors.description ? 'input-error' : ''}
        style={{ resize: 'vertical' }} />
      {errors.description && <span className="field-error">{errors.description}</span>}
    </div>
    <div className="form-group">
      <label>Discount Type *</label>
      <select value={form.discountType} onChange={e => setForm(p => ({ ...p, discountType: e.target.value as 'PERCENTAGE' | 'FIXED_AMOUNT' }))}>
        <option value="PERCENTAGE">Percentage (%)</option>
        <option value="FIXED_AMOUNT">Fixed Amount (LKR)</option>
      </select>
    </div>
    <div className="form-group">
      <label>Discount Value * {form.discountType === 'PERCENTAGE' ? '(%)' : '(LKR)'}</label>
      <input type="number" min={0.01} step={0.01} value={form.discountValue || ''}
        onChange={e => setForm(p => ({ ...p, discountValue: Number(e.target.value) }))}
        placeholder={form.discountType === 'PERCENTAGE' ? 'e.g. 20' : 'e.g. 10000'}
        className={errors.discountValue ? 'input-error' : ''} />
      {errors.discountValue && <span className="field-error">{errors.discountValue}</span>}
    </div>
    <div className="form-group">
      <label>Start Date *</label>
      <input type="date" value={form.startDate} onChange={e => setForm(p => ({ ...p, startDate: e.target.value }))}
        className={errors.startDate ? 'input-error' : ''} />
      {errors.startDate && <span className="field-error">{errors.startDate}</span>}
    </div>
    <div className="form-group">
      <label>End Date *</label>
      <input type="date" value={form.endDate} onChange={e => setForm(p => ({ ...p, endDate: e.target.value }))}
        className={errors.endDate ? 'input-error' : ''} />
      {errors.endDate && <span className="field-error">{errors.endDate}</span>}
    </div>
    <div className="form-group">
      <label>Status</label>
      <select value={form.isActive ? 'true' : 'false'} onChange={e => setForm(p => ({ ...p, isActive: e.target.value === 'true' }))}>
        <option value="true">Active</option>
        <option value="false">Inactive</option>
      </select>
    </div>
  </div>
);

const UserTable: React.FC<{ users: UserResponse[]; onDelete: (id: number) => void }> = ({ users, onDelete }) => (
  <div className="table-wrapper">
    {users.length === 0 ? (
      <p className="empty-state">No records found.</p>
    ) : (
      <table className="data-table">
        <thead>
          <tr>
            <th>Name</th><th>Email</th><th>Phone</th><th>Nationality</th><th>Role</th><th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {users.map(u => (
            <tr key={u.id}>
              <td>{u.firstName} {u.lastName}</td>
              <td>{u.email}</td>
              <td>{u.phoneNumber}</td>
              <td>{u.nationality}</td>
              <td><span className={`role-badge badge-${u.role.toLowerCase()}`}>{u.role}</span></td>
              <td>
                <button className="btn-delete" onClick={() => onDelete(u.id)}>Delete</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    )}
  </div>
);

export default AdminDashboard;
