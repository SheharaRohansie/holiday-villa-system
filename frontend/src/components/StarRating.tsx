import React from 'react';

interface StarRatingProps {
  /** Current selected value (1-5) */
  value: number;
  /** Called when user clicks a star – omit to render as read-only display */
  onChange?: (rating: number) => void;
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
}

const StarRating: React.FC<StarRatingProps> = ({ value, onChange, size = 'md' }) => {
  const sizePx = size === 'sm' ? '1.1rem' : size === 'lg' ? '2rem' : '1.5rem';

  return (
    <span className="star-rating" style={{ display: 'inline-flex', gap: '2px' }}>
      {[1, 2, 3, 4, 5].map(star => (
        <span
          key={star}
          onClick={() => onChange?.(star)}
          style={{
            fontSize: sizePx,
            cursor: onChange ? 'pointer' : 'default',
            color: star <= value ? '#f4a522' : '#d1d5db',
            transition: 'color 0.15s',
            userSelect: 'none',
          }}
          title={onChange ? `Rate ${star} star${star > 1 ? 's' : ''}` : undefined}
        >
          ★
        </span>
      ))}
    </span>
  );
};

export default StarRating;
