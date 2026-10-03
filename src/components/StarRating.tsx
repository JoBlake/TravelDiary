const STAR_COUNT = 5
const STARS = '★★★★★'

/** Interactive 1-5 star picker, for the diary's own rating of a place. */
export function StarRatingInput({
  value,
  onChange,
}: {
  value: number
  onChange: (value: number) => void
}) {
  return (
    <div className="star-rating-input" role="radiogroup" aria-label="Rating">
      {Array.from({ length: STAR_COUNT }, (_, i) => i + 1).map((star) => (
        <button
          key={star}
          type="button"
          className={star <= value ? 'star star-filled' : 'star'}
          onClick={() => onChange(star === value ? 0 : star)}
          aria-label={`${star} star${star > 1 ? 's' : ''}`}
          aria-pressed={star <= value}
        >
          ★
        </button>
      ))}
    </div>
  )
}

/** Read-only stars, supporting a fractional value like Google's 4.3 rating. */
export function StarRatingDisplay({
  value,
  count,
}: {
  value: number
  count?: number
}) {
  const percent = Math.max(0, Math.min(1, value / STAR_COUNT)) * 100

  return (
    <span className="star-rating-display">
      <span className="star-rating-track" aria-hidden="true">
        {STARS}
        <span className="star-rating-fill" style={{ width: `${percent}%` }}>
          {STARS}
        </span>
      </span>
      <span className="star-rating-value">
        {value.toFixed(1)}
        {typeof count === 'number' && ` (${count.toLocaleString()})`}
      </span>
    </span>
  )
}
