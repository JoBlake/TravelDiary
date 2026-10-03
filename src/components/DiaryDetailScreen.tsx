import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { DiaryPlaceForm, type DiaryPlaceFormValues } from './DiaryPlaceForm'
import { StarRatingDisplay } from './StarRating'

interface Diary {
  id: string
  name: string
  start_date: string | null
  end_date: string | null
  commentary: string | null
  profiles: { display_name: string | null } | null
}

interface DiaryPlace {
  id: string
  name: string
  visited_on: string | null
  rating: number | null
  notes: string | null
}

export function DiaryDetailScreen() {
  const { id } = useParams<{ id: string }>()

  const [diary, setDiary] = useState<Diary | null>(null)
  const [places, setPlaces] = useState<DiaryPlace[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  const [editingId, setEditingId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const load = async () => {
    if (!id) return
    setLoading(true)
    setLoadError(null)

    const [diaryResult, placesResult] = await Promise.all([
      supabase
        .from('diaries')
        .select('id, name, start_date, end_date, commentary, profiles(display_name)')
        .eq('id', id)
        .single(),
      supabase
        .from('diary_places')
        .select('id, name, visited_on, rating, notes')
        .eq('diary_id', id)
        .order('visited_on', { ascending: true, nullsFirst: false }),
    ])

    if (diaryResult.error) setLoadError(diaryResult.error.message)
    else setDiary(diaryResult.data)

    if (placesResult.error) setLoadError(placesResult.error.message)
    else setPlaces(placesResult.data ?? [])

    setLoading(false)
  }

  useEffect(() => {
    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  const handleSaveEdit = async (placeId: string, values: DiaryPlaceFormValues) => {
    setSaving(true)
    setSaveError(null)

    const { error } = await supabase
      .from('diary_places')
      .update({
        visited_on: values.visitedOn || null,
        rating: values.rating || null,
        notes: values.notes.trim() || null,
      })
      .eq('id', placeId)

    setSaving(false)
    if (error) {
      setSaveError(error.message)
      return
    }
    setEditingId(null)
    void load()
  }

  const handleDelete = async (placeId: string) => {
    setDeletingId(placeId)
    const { error } = await supabase.from('diary_places').delete().eq('id', placeId)
    setDeletingId(null)
    if (error) {
      setSaveError(error.message)
      return
    }
    void load()
  }

  if (loading) return <p className="loading-note">Loading…</p>
  if (loadError) return <p className="form-error">{loadError}</p>
  if (!diary) return <p className="empty-note">Diary not found.</p>

  return (
    <div className="diaries-screen">
      <Link to="/diaries" className="back-link">
        ← All diaries
      </Link>

      <h1>{diary.name}</h1>
      {(diary.start_date || diary.end_date) && (
        <span className="diary-dates">
          {diary.start_date ?? '?'} – {diary.end_date ?? '?'}
        </span>
      )}
      <span className="diary-creator">by {diary.profiles?.display_name || 'you'}</span>
      {diary.commentary && <p className="diary-commentary">{diary.commentary}</p>}

      <section className="diary-list">
        <h2>Places</h2>
        {places.length === 0 && (
          <p className="empty-note">
            No places yet — add one from the <Link to="/map">Map</Link> tab.
          </p>
        )}
        <ul>
          {places.map((place) => (
            <li key={place.id} className="diary-list-item">
              {editingId === place.id ? (
                <>
                  <strong>{place.name}</strong>
                  <DiaryPlaceForm
                    initial={{
                      visitedOn: place.visited_on ?? '',
                      rating: place.rating ?? 0,
                      notes: place.notes ?? '',
                    }}
                    onSave={(values) => handleSaveEdit(place.id, values)}
                    onCancel={() => setEditingId(null)}
                    saving={saving}
                    error={saveError}
                  />
                </>
              ) : (
                <>
                  <div className="diary-place-header">
                    <strong>{place.name}</strong>
                    <div className="diary-place-actions">
                      <button type="button" onClick={() => setEditingId(place.id)}>
                        Edit
                      </button>
                      <button
                        type="button"
                        className="danger-button"
                        onClick={() => handleDelete(place.id)}
                        disabled={deletingId === place.id}
                      >
                        {deletingId === place.id ? 'Removing…' : 'Remove'}
                      </button>
                    </div>
                  </div>
                  {place.visited_on && (
                    <span className="diary-dates">{place.visited_on}</span>
                  )}
                  {place.rating && <StarRatingDisplay value={place.rating} />}
                  {place.notes && <p className="diary-commentary">{place.notes}</p>}
                </>
              )}
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
