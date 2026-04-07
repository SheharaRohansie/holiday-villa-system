import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getAllVillasApi } from '../api/villaApi';
import { getActivePromotionsApi } from '../api/promotionApi';
import type { Villa, Promotion } from '../types';
import VillaCard from '../components/VillaCard';
import '../styles/HomePage.css';
import '../styles/Villa.css';
import '../styles/Review.css';

const HomePage: React.FC = () => {
  const { isAuthenticated, user } = useAuth();
  const [villas, setVillas] = useState<Villa[]>([]);
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const todayIso = (() => {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  })();

  useEffect(() => {
    getAllVillasApi().then(setVillas).catch(() => {});
    getActivePromotionsApi()
      .then(list => {
        // Keep future promos, hide expired ones.
        setPromotions((list ?? []).filter(p => !p.endDate || p.endDate >= todayIso));
      })
      .catch(() => {});
  }, []);

  const promoByVillaId = promotions.reduce<Record<number, Promotion>>((acc, p) => {
    acc[p.villaId] = p;
    return acc;
  }, {});

  return (
    <div className="home">
      {/* Hero Section */}
      <section className="hero">
        <div className="hero-overlay">
          <div className="hero-content">
            <h1 className="hero-title">Welcome to The Country House</h1>
            <p className="hero-subtitle">
              Experience luxury and serenity by the tea estates — where every moment is a memory.
            </p>
            {!isAuthenticated ? (
              <div className="hero-actions">
                <Link to="/register" className="btn-hero btn-primary">Book Your Stay</Link>
                <Link to="/login" className="btn-hero btn-secondary">Login</Link>
              </div>
            ) : (
              <div className="hero-actions">
                <Link
                  to={user?.role === 'ADMIN' ? '/admin/dashboard' : user?.role === 'STAFF' ? '/staff/dashboard' : '/guest/dashboard'}
                  className="btn-hero btn-primary"
                >
                  Go to Dashboard
                </Link>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Villas Section */}
      <section className="section villas-section" id="villas">
        <div className="section-header">
          <h2>Our Luxury Villas</h2>
          <p>Discover your perfect seaside retreat</p>
        </div>
        {villas.length === 0 ? (
          <div className="villa-grid">
            {villaData.map((villa) => (
              <div key={villa.id} className="villa-card">
                <div className="villa-img-placeholder" style={{ background: villa.gradient }}>
                  <span className="villa-icon">{villa.icon}</span>
                </div>
                <div className="villa-info">
                  <h3>{villa.name}</h3>
                  <p>{villa.description}</p>
                  <div className="villa-footer">
                    <span className="villa-price">{villa.price}</span>
                    <Link to="/register" className="btn-book">
                      {isAuthenticated ? 'Reserve' : 'Register to Book'}
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="villa-grid-live">
            {villas.map(v => (
              <div key={v.id}>
                <VillaCard villa={v} promotion={promoByVillaId[v.id] ?? null} />
              </div>
            ))}
          </div>
        )}
      </section>

      {/* About Section */}
      <section className="section about-section">        <div className="about-content">
          <div className="about-text">
            <h2>About Holiday Villa Resort</h2>
            <p>
              Set in a calm and serene inland setting, this location offers a perfect escape from the busy coastal crowds, surrounded by lush tropical greenery and a peaceful residential atmosphere. 
              The environment reflects authentic Sri Lankan living, with quiet streets, natural surroundings, and a refreshing sense of privacy and relaxation. 
              While the ocean is just a short drive away, the area provides a tranquil retreat, ideal for unwinding in comfort while still enjoying easy access to nearby beaches and attractions.
            </p>
            <p>
              Whether you're seeking a romantic escape, a family adventure, or a corporate retreat,
              our expertly curated experiences ensure an unforgettable stay.
            </p>
            <div className="about-stats">
              <div className="stat"><span className="stat-number">4+</span><span>Luxury Villas</span></div>
              <div className="stat"><span className="stat-number">500m</span><span>City access</span></div>
              <div className="stat"><span className="stat-number">4.5★</span><span>Guest Rating</span></div>
            </div>
          </div>
          <div className="about-map">
            <div className="map-placeholder">
              <span>📍</span>
              <p>297, Morris road, Galle, Sri Lanka</p>
              <small>GPS: 6.0535° N, 80.2210° E</small>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      {!isAuthenticated && (
        <section className="section cta-section">
          <div className="cta-content">
            <h2>Ready to Experience Paradise?</h2>
            <p>Register now to unlock exclusive rates and make your reservation.</p>
            <div className="cta-actions">
              <Link to="/register" className="btn-hero btn-primary">Create Account</Link>
              <Link to="/login" className="btn-hero btn-outline">Already a member? Login</Link>
            </div>
          </div>
        </section>
      )}

      {/* Footer */}
      <footer className="footer">
        <div className="footer-grid">
          <div className="footer-brand">
            <h3>💒 The Country House</h3>
            <p>Your paradise awaits on the shores of Sri Lanka.</p>
          </div>
          <div className="footer-links">
            <h4>Quick Links</h4>
            <ul>
              <li><Link to="/">Home</Link></li>
              <li><a href="#villas">Villas</a></li>
              <li><Link to="/login">Login</Link></li>
            </ul>
          </div>
          <div className="footer-contact">
            <h4>Contact Us</h4>
            <p>📞 +94 77 123 4567</p>
            <p>✉️ countryhouse815@gmail.com</p>
            <p>📍 297, Morris road, Galle, Sri Lanka</p>
          </div>
        </div>
        <div className="footer-bottom">
          <p>© 2026 The Country House. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

const villaData = [
  {
    id: 1,
    name: 'Ocean Breeze Villa',
    description: 'Step out to a breathtaking ocean view. Private pool, king bedroom, and direct beach access.',
    price: 'From $350/night',
    icon: '🏖️',
    gradient: 'linear-gradient(135deg, #0077b6, #00b4d8)',
  },
  {
    id: 2,
    name: 'Garden Paradise Villa',
    description: 'Surrounded by lush tropical gardens with a tranquil outdoor shower and plunge pool.',
    price: 'From $280/night',
    icon: '🌺',
    gradient: 'linear-gradient(135deg, #2d6a4f, #52b788)',
  },
  {
    id: 3,
    name: 'Sunset Penthouse',
    description: 'Panoramic sunset views from the rooftop terrace. Ideal for romantic getaways.',
    price: 'From $450/night',
    icon: '🌅',
    gradient: 'linear-gradient(135deg, #e76f51, #f4a261)',
  },
  {
    id: 4,
    name: 'Family Coral Suite',
    description: 'Spacious 3-bedroom suite with a children\'s play area and family pool.',
    price: 'From $520/night',
    icon: '🐚',
    gradient: 'linear-gradient(135deg, #4361ee, #7209b7)',
  },
];

export default HomePage;
