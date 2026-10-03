import { useState, type FormEvent } from 'react'
import { StarRatingInput } from './StarRating'

export interface DiaryPlaceFormValues {
  visitedOn: string // yyyy-mm-dd, or '' for unset
  rating: number // 0 = unset
  notes: string
}

interface DiaryPlaceFormProps {
  initial: DiaryPlaceFormValues
  onSave: (values: DiaryPlaceFormValues) => void
  onCancel: () => void
  saving?: boolean
  error?: string | null
}

export function DiaryPlaceForm({
  initial,
  onSave,
  onCancel,
  saving = false,
  error = null,
}: DiaryPlaceFormProps) {
  const [visitedOn, setVisitedOn] = useState(initial.visitedOn)
  const [rating, setRating] = useState(initial.rating)
  const [notes, setNotes] = useState(initial.notes)

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    onSave({ visitedOn, rating, notes })
  }

  return (
    <form onSubmit={handleSubmit} className="diary-place-form">
      <label>
        Date
        <input
          type="date"
          value={visitedOn}
          onChange={(e) => setVisitedOn(e.target.value)}
        />
      </label>
      <label>
        Rating
        <StarRatingInput value={rating} onChange={setRating} />
      </label>
      <label>
        Notes
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
        />
      </label>
      {error && <p className="form-error">{error}</p>}
      <div className="diary-place-form-actions">
        <button type="submit" disabled={saving}>
          {saving ? 'Saving…' : 'Save'}
        </button>
        <button type="button" onClick={onCancel} disabled={saving}>
          Cancel
        </button>
      </div>
    </form>
  )
}
