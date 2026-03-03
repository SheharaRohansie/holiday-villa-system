import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getVillaByIdApi } from '../api/villaApi';
import type { Villa } from '../types';
import '../styles/Villa.css';

const VillaDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [villa, setVilla] = useState<Villa | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeImg, setActiveImg] = useState(0);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    getVillaByIdApi(Number(id))
      .then(data => { setVilla(data); setLoading(false); })
      .catch(() => { setError('Villa not found.'); setLoading(false); });
  }, [id]);

  if (loading) return <div className="villa-details-loading">Loading villa details…</div>;
  if (error || !villa) return <div className="villa-details-error">{error || 'Villa not found.'}</div>;

  return (
    <div className="villa-details-page">
      <button className="btn-back" onClick={() => navigate(-1)}>← Back</button>

      <div className="villa-details-card">
        {/* Image Gallery */}
        <div className="villa-gallery">
          <div className="villa-main-img">
            {villa.imageUrls?.[activeImg] ? (
              <img
                src={villa.imageUrls[activeImg]}
                alt={`${villa.name} - image ${activeImg + 1}`}
                onError={e => {
                  (e.target as HTMLImageElement).src =
                    'https://via.placeholder.com/800x450?text=Villa+Image';
                }}
              />
            ) : (
              <div className="villa-img-fallback">🏖️</div>
            )}
          </div>
          {villa.imageUrls?.length > 1 && (
            <div className="villa-thumbs">
              {villa.imageUrls.map((url, i) => (
                <img
                  key={i}
                  src={url}
                  alt={`thumb ${i + 1}`}
                  className={`villa-thumb ${activeImg === i ? 'active' : ''}`}
                  onClick={() => setActiveImg(i)}
                  onError={e => {
                    (e.target as HTMLImageElement).src =
                      'https://via.placeholder.com/120x80?text=Img';
                  }}
                />
              ))}
            </div>
          )}
        </div>

        {/* Villa Info */}
        <div className="villa-details-info">
          <h1 className="villa-details-name">{villa.name}</h1>

          <div className="villa-details-meta">
            <div className="villa-meta-item">
              <span className="meta-label">Price per night</span>
              <span className="meta-value price">LKR {villa.pricePerNight}</span>
            </div>
            {villa.maxGuests && (
              <div className="villa-meta-item">
                <span className="meta-label">Max guests</span>
                <span className="meta-value">{villa.maxGuests} persons</span>
              </div>
            )}
          </div>

          <div className="villa-details-section">
            <h3>Description</h3>
            <p>{villa.description}</p>
          </div>

          {villa.amenities?.length > 0 && (
            <div className="villa-details-section">
              <h3>Amenities</h3>
              <div className="amenities-list">
                {villa.amenities.map((a, i) => (
                  <span key={i} className="amenity-tag">✓ {a}</span>
                ))}
              </div>
            </div>
          )}

          <button className="btn-book-now" disabled>
            🗓 Book Now — Coming Soon
          </button>
        </div>
      </div>
    </div>
  );
};

export default VillaDetails;
