import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import type { Villa } from '../types';
import StarRating from './StarRating';
import '../styles/Villa.css';

interface VillaCardProps {
  villa: Villa;
}

const VillaCard: React.FC<VillaCardProps> = ({ villa }) => {
  const images = villa.imageUrls?.filter(u => u?.trim()) ?? [];
  const hasMultiple = images.length > 1;
  const [current, setCurrent] = useState(0);

  const prev = (e: React.MouseEvent) => {
    e.preventDefault();
    setCurrent(c => (c - 1 + images.length) % images.length);
  };
  const next = (e: React.MouseEvent) => {
    e.preventDefault();
    setCurrent(c => (c + 1) % images.length);
  };

  const shortDesc =
    villa.description.length > 100
      ? villa.description.slice(0, 100) + '…'
      : villa.description;

  const minPrice = (villa.minPrice ?? villa.pricePerNight);
  const minGuests = (villa.minPriceGuestCount ?? (villa.type === 'DELUXE' ? 2 : 2));
  const minMealPlan = (villa.minPriceMealPlan ?? 'ROOM_ONLY');
  const mealPlanLabel = String(minMealPlan).replaceAll('_', ' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase());

  return (
    <div className="villa-card-live">
      <div className="villa-card-img villa-card-slider">
        {images.length > 0 ? (
          <>
            <img
              src={images[current]}
              alt={`${villa.name} ${current + 1}`}
              onError={e => {
                (e.target as HTMLImageElement).src =
                  'https://via.placeholder.com/400x220?text=Villa+Image';
              }}
            />
            {hasMultiple && (
              <>
                <button className="slider-btn slider-btn-prev" onClick={prev}>&#8249;</button>
                <button className="slider-btn slider-btn-next" onClick={next}>&#8250;</button>
                <div className="slider-dots">
                  {images.map((_, i) => (
                    <span
                      key={i}
                      className={`slider-dot${i === current ? ' active' : ''}`}
                      onClick={e => { e.preventDefault(); setCurrent(i); }}
                    />
                  ))}
                </div>
              </>
            )}
          </>
        ) : (
          <div className="villa-card-placeholder">🏖️</div>
        )}
      </div>
      <div className="villa-card-body">
        <h3 className="villa-card-name">{villa.name}</h3>
        {villa.type && <div className="villa-card-type">{villa.type}</div>}
        <p className="villa-card-desc">{shortDesc}</p>
        {villa.reviewCount > 0 ? (
          <div className="villa-card-rating">
            <StarRating value={Math.round(villa.averageRating)} size="sm" />
            <span className="villa-card-rating-score">{villa.averageRating.toFixed(1)}</span>
            <span className="villa-card-rating-count">/ 5 ({villa.reviewCount} review{villa.reviewCount !== 1 ? 's' : ''})</span>
          </div>
        ) : (
          <div className="villa-card-rating villa-card-rating--empty">
            <span>No reviews yet</span>
          </div>
        )}
        <div className="villa-card-footer">
          <span className="villa-card-price">
            From LKR {Number(minPrice).toLocaleString()} <small>({minGuests} Guests – {mealPlanLabel})</small>
          </span>
          <Link to={`/villas/${villa.id}`} className="btn-view-details">View Details</Link>
        </div>
      </div>
    </div>
  );
};

export default VillaCard;
