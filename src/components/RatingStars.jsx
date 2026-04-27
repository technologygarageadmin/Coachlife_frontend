import { useState, useEffect } from 'react';
import { Star } from 'lucide-react';

export const RatingStars = ({ initialRating = 0, onRatingChange }) => {
  const [rating, setRating] = useState(initialRating);
  const [hoverRating, setHoverRating] = useState(0);

  useEffect(() => {
    setRating(initialRating);
  }, [initialRating]);

  const handleClick = (value) => {
    setRating(value);
    onRatingChange(value);
  };

  return (
    <div className="flex items-center gap-2">
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            onClick={() => handleClick(star)}
            onMouseEnter={() => setHoverRating(star)}
            onMouseLeave={() => setHoverRating(0)}
            className="transition-transform duration-200 hover:scale-110"
            aria-label={`Rate ${star} stars`}
          >
            <Star
              size={24}
              className={`transition-all duration-200 ${
                star <= (hoverRating || rating)
                  ? 'fill-yellow-400 text-yellow-400'
                  : 'text-gray-300'
              }`}
            />
          </button>
        ))}
      </div>
      <span className="ml-2 text-sm font-medium text-gray-600">
        {rating > 0 ? `${rating}/5` : 'Rate this'}
      </span>
    </div>
  );
};
