import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import '../styles/Navbar.css';

const Navbar: React.FC = () => {
  const { user, logout, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const getDashboardLink = () => {
    if (!user) return '/login';
    if (user.role === 'ADMIN') return '/admin/dashboard';
    if (user.role === 'STAFF') return '/staff/dashboard';
    return '/guest/dashboard';
  };

  return (
    <nav className="navbar">
      <div className="navbar-brand">
        <Link to="/" className="brand-link">
          <span className="brand-icon">💒</span>
          <span className="brand-name">The Country House</span>
        </Link>
      </div>

      <button className="hamburger" onClick={() => setMenuOpen(!menuOpen)} aria-label="Toggle menu">
        <span></span><span></span><span></span>
      </button>

      <ul className={`navbar-links ${menuOpen ? 'open' : ''}`}>
        <li><Link to="/" onClick={() => setMenuOpen(false)}>Home</Link></li>
        <li><a href="#villas" onClick={() => setMenuOpen(false)}>Villas</a></li>
        <li><a href="#offers" onClick={() => setMenuOpen(false)}>Offers</a></li>

        {isAuthenticated ? (
          <>
            <li>
              <Link to={getDashboardLink()} onClick={() => setMenuOpen(false)} className="nav-dashboard">
                Dashboard
              </Link>
            </li>
            <li>
              <span className="nav-user">Hello, {user?.firstName}</span>
            </li>
            <li>
              <button onClick={handleLogout} className="btn-nav btn-logout">Logout</button>
            </li>
          </>
        ) : (
          <>
            <li>
              <Link to="/login" className="btn-nav btn-login" onClick={() => setMenuOpen(false)}>Login</Link>
            </li>
            <li>
              <Link to="/register" className="btn-nav btn-register" onClick={() => setMenuOpen(false)}>Register</Link>
            </li>
          </>
        )}
      </ul>
    </nav>
  );
};

export default Navbar;
