import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import '../styles/Dashboard.css';

const StaffDashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'overview' | 'reservations' | 'guests'>('overview');

  const handleLogout = () => { logout(); navigate('/'); };

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
          ] as { key: 'overview' | 'reservations' | 'guests'; icon: string; label: string }[]).map(item => (
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
              <p className="coming-soon">Reservation and payment management features are coming in the next module.</p>
            </div>
          </div>
        )}

        {activeTab === 'reservations' && (
          <div className="tab-content">
            <h2 className="tab-title">Reservations</h2>
            <div className="coming-soon-card">
              <span>📅</span>
              <h3>Reservation Management</h3>
              <p>This feature will be available in the next module.</p>
            </div>
          </div>
        )}

        {activeTab === 'guests' && (
          <div className="tab-content">
            <h2 className="tab-title">Guest List</h2>
            <div className="coming-soon-card">
              <span>🧳</span>
              <h3>Guest Management</h3>
              <p>This feature will be available in the next module.</p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default StaffDashboard;
