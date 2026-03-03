import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { getAllUsersApi, getAllStaffApi, getAllGuestsApi, createStaffApi, deleteUserApi, updateProfileApi } from '../api/userApi';
import type { UserResponse, CreateStaffRequest, UpdateProfileRequest } from '../types';
import { COUNTRIES } from '../data/countries';
import '../styles/Dashboard.css';

type ActiveTab = 'overview' | 'staff' | 'guests' | 'create-staff' | 'profile';

const AdminDashboard: React.FC = () => {
  const { user, logout, login } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<ActiveTab>('overview');
  const [allUsers, setAllUsers] = useState<UserResponse[]>([]);
  const [staff, setStaff] = useState<UserResponse[]>([]);
  const [guests, setGuests] = useState<UserResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

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
  }, []);

  const loadAllUsers = async () => {
    setLoading(true);
    try {
      const [u, s, g] = await Promise.all([getAllUsersApi(), getAllStaffApi(), getAllGuestsApi()]);
      setAllUsers(u); setStaff(s); setGuests(g);
    } catch { setMessage('Failed to load users.'); }
    finally { setLoading(false); }
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
            { key: 'staff', icon: '👥', label: 'Staff Members' },
            { key: 'guests', icon: '🧳', label: 'Guests' },
            { key: 'create-staff', icon: '➕', label: 'Create Staff' },
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
              <div className="stat-card"><span className="stat-icon">🏨</span><h3>25</h3><p>Villas Available</p></div>
            </div>
            <div className="recent-section">
              <h3>Recent Users</h3>
              <UserTable users={allUsers.slice(-5).reverse()} onDelete={handleDeleteUser} />
            </div>
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

        {/* PROFILE */}
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
