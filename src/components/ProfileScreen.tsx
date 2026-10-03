import { useEffect, useState, type FormEvent } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'

export function ProfileScreen() {
  const { user } = useAuth()
  const [displayName, setDisplayName] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  useEffect(() => {
    if (!user) return
    let cancelled = false

    supabase
      .from('profiles')
      .select('display_name')
      .eq('id', user.id)
      .single()
      .then(({ data, error }) => {
        if (cancelled) return
        if (!error && data) setDisplayName(data.display_name ?? '')
        setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [user])

  const handleSave = async (event: FormEvent) => {
    event.preventDefault()
    if (!user) return
    setSaving(true)
    setSaveError(null)
    setSaved(false)

    const { error } = await supabase
      .from('profiles')
      .update({ display_name: displayName })
      .eq('id', user.id)

    setSaving(false)
    if (error) {
      setSaveError(error.message)
    } else {
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    }
  }

  const handleDelete = async () => {
    setDeleting(true)
    setDeleteError(null)

    const { error } = await supabase.functions.invoke('delete-account')
    if (error) {
      setDeleteError(error.message)
      setDeleting(false)
      return
    }

    // Deleting the auth user doesn't invalidate the local session by
    // itself; sign out explicitly so the app returns to the login screen.
    await supabase.auth.signOut()
  }

  if (loading) return <p className="loading-note">Loading profile…</p>

  return (
    <div className="profile-screen">
      <h1>Your profile</h1>

      <form onSubmit={handleSave} className="profile-form">
        <label>
          Email
          <input type="email" value={user?.email ?? ''} disabled />
        </label>
        <label>
          Display name
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
          />
        </label>
        {saveError && <p className="form-error">{saveError}</p>}
        <div className="profile-form-actions">
          <button type="submit" disabled={saving}>
            {saving ? 'Saving…' : 'Save changes'}
          </button>
          {saved && <span className="save-confirmation">Saved</span>}
        </div>
      </form>

      <section className="danger-zone">
        <h2>Delete account</h2>
        <p>
          This permanently deletes your account and all your diaries and
          places. This cannot be undone.
        </p>

        {!confirmingDelete ? (
          <button
            type="button"
            className="danger-button"
            onClick={() => setConfirmingDelete(true)}
          >
            Delete my account
          </button>
        ) : (
          <div className="delete-confirm">
            <p>
              <strong>Are you sure?</strong> This cannot be undone.
            </p>
            <div className="delete-confirm-actions">
              <button
                type="button"
                className="danger-button"
                onClick={handleDelete}
                disabled={deleting}
              >
                {deleting ? 'Deleting…' : 'Yes, permanently delete my account'}
              </button>
              <button
                type="button"
                onClick={() => setConfirmingDelete(false)}
                disabled={deleting}
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {deleteError && <p className="form-error">{deleteError}</p>}
      </section>
    </div>
  )
}
