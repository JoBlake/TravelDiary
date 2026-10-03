import { useEffect, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'

interface Diary {
  id: string
  name: string
  start_date: string | null
  end_date: string | null
  commentary: string | null
  created_at: string
  profiles: { display_name: string | null } | null
}

export function DiariesScreen() {
  const { user } = useAuth()

  const [diaries, setDiaries] = useState<Diary[]>([])
  const [loadingList, setLoadingList] = useState(true)
  const [listError, setListError] = useState<string | null>(null)

  const [name, setName] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [commentary, setCommentary] = useState('')
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const loadDiaries = async () => {
    setLoadingList(true)
    setListError(null)
    const { data, error } = await supabase
      .from('diaries')
      .select(
        'id, name, start_date, end_date, commentary, created_at, profiles(display_name)',
      )
      .order('created_at', { ascending: false })

    if (error) setListError(error.message)
    else setDiaries(data ?? [])
    setLoadingList(false)
  }

  useEffect(() => {
    if (user) loadDiaries()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  const handleCreate = async (event: FormEvent) => {
    event.preventDefault()
    if (!user) return
    setFormError(null)

    if (!name.trim()) {
      setFormError('Give the diary a name.')
      return
    }
    if (startDate && endDate && endDate < startDate) {
      setFormError('End date must be on or after the start date.')
      return
    }

    setSaving(true)
    const { error } = await supabase.from('diaries').insert({
      owner_id: user.id,
      name: name.trim(),
      start_date: startDate || null,
      end_date: endDate || null,
      commentary: commentary.trim() || null,
    })
    setSaving(false)

    if (error) {
      setFormError(error.message)
      return
    }

    setName('')
    setStartDate('')
    setEndDate('')
    setCommentary('')
    loadDiaries()
  }

  return (
    <div className="diaries-screen">
      <h1>Diaries</h1>

      <form onSubmit={handleCreate} className="diary-form">
        <h2>New diary</h2>
        <label>
          Name
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </label>
        <div className="diary-form-dates">
          <label>
            Start date
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </label>
          <label>
            End date
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </label>
        </div>
        <label>
          Commentary
          <textarea
            value={commentary}
            onChange={(e) => setCommentary(e.target.value)}
            rows={4}
            placeholder="Notes about the trip…"
          />
        </label>
        {formError && <p className="form-error">{formError}</p>}
        <button type="submit" disabled={saving}>
          {saving ? 'Creating…' : 'Create diary'}
        </button>
      </form>

      <section className="diary-list">
        <h2>Your diaries</h2>
        {loadingList && <p className="loading-note">Loading…</p>}
        {listError && <p className="form-error">{listError}</p>}
        {!loadingList && diaries.length === 0 && !listError && (
          <p className="empty-note">No diaries yet — create your first one above.</p>
        )}
        <ul>
          {diaries.map((diary) => (
            <li key={diary.id} className="diary-list-item">
              <Link to={`/diaries/${diary.id}`} className="diary-list-link">
                <strong>{diary.name}</strong>
                {(diary.start_date || diary.end_date) && (
                  <span className="diary-dates">
                    {diary.start_date ?? '?'} – {diary.end_date ?? '?'}
                  </span>
                )}
                <span className="diary-creator">
                  by {diary.profiles?.display_name || 'you'}
                </span>
                {diary.commentary && (
                  <p className="diary-commentary">{diary.commentary}</p>
                )}
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
