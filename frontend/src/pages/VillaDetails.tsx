import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getVillaByIdApi } from '../api/villaApi';
import { getActivePromotionsApi } from '../api/promotionApi';
import { getVillaReviewsApi } from '../api/reviewApi';
import { useAuth } from '../context/AuthContext';
import type { Villa, Promotion, Review } from '../types';
import ReviewCard from '../components/ReviewCard';
import StarRating from '../components/StarRating';
import '../styles/Villa.css';
import '../styles/Review.css';

const VillaDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [villa, setVilla] = useState<Villa | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeImg, setActiveImg] = useState(0);
  const [promotion, setPromotion] = useState<Promotion | null>(null);
  const [villaReviews, setVillaReviews] = useState<Review[]>([]);
  const [avgRating, setAvgRating] = useState(0);
  const [totalReviews, setTotalReviews] = useState(0);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    getVillaByIdApi(Number(id))
      .then(data => { setVilla(data); setLoading(false); })
      .catch(() => { setError('Villa not found.'); setLoading(false); });
    // Fetch active promotions for this villa
    getActivePromotionsApi()
      .then(promos => {
        const match = promos.find(p => p.villaId === Number(id));
        setPromotion(match ?? null);
      })
      .catch(() => {});
    // Fetch villa reviews
    getVillaReviewsApi(Number(id))
      .then(data => {
        setVillaReviews(data.reviews);
        setAvgRating(data.averageRating);
        setTotalReviews(data.totalReviews);
      })
      .catch(() => {});
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

          {/* ── Promotion Banner ──────────────────────────────────────── */}
          {promotion && (
            <div className="villa-promo-banner">
              <div className="villa-promo-tag">🏷️ Limited Time Offer</div>
              <div className="villa-promo-title">{promotion.title}</div>
              <div className="villa-promo-desc">{promotion.description}</div>
              <div className="villa-promo-pricing">
                <span className="villa-promo-original">
                  LKR {villa.pricePerNight.toLocaleString()}/night
                </span>
                <span className="villa-promo-badge">
                  {promotion.discountType === 'PERCENTAGE'
                    ? `${promotion.discountValue}% OFF`
                    : `LKR ${promotion.discountValue.toLocaleString()} OFF`}
                </span>
              </div>
              <div className="villa-promo-validity">
                Valid until {promotion.endDate}
              </div>
            </div>
          )}

          <div className="villa-details-meta">
            <div className="villa-meta-item">
              <span className="meta-label">Price per night</span>
              <span className="meta-value price">LKR {villa.pricePerNight.toLocaleString()}</span>
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

          <button
            className="btn-book-now"
            onClick={() => {
              if (!user || user.role !== 'GUEST') {
                navigate('/login');
              } else {
                navigate(`/book/${villa.id}`);
              }
            }}
          >
            Book Now
          </button>

          {/* ── Guest Reviews ──────────────────────────────────────────── */}
          <div className="villa-reviews-section">
            <div className="villa-reviews-header">
              <h3>Guest Reviews</h3>
              {totalReviews > 0 && (
                <div className="villa-avg-rating">
                  <StarRating value={Math.round(avgRating)} size="sm" />
                  <span className="villa-avg-number">{avgRating.toFixed(1)}</span>
                  <span className="villa-avg-total">/ 5 ({totalReviews} review{totalReviews !== 1 ? 's' : ''})</span>
                </div>
              )}
            </div>
            {villaReviews.length === 0 ? (
              <div className="villa-reviews-empty">
                No reviews yet for this villa. Be the first to share your experience!
              </div>
            ) : (
              <div className="villa-reviews-list">
                {villaReviews.map(r => (
                  <ReviewCard key={r.id} review={r} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default VillaDetails;
