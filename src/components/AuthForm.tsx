import { useState, type FormEvent } from 'react'
import { supabase } from '../lib/supabase'

type Mode = 'sign-in' | 'sign-up'
type Status = 'idle' | 'submitting' | 'check-email'

export function AuthForm() {
  const [mode, setMode] = useState<Mode>('sign-in')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [status, setStatus] = useState<Status>('idle')

  const switchMode = () => {
    setMode((m) => (m === 'sign-in' ? 'sign-up' : 'sign-in'))
    setError(null)
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setError(null)
    setStatus('submitting')

    if (mode === 'sign-in') {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      if (error) {
        setError(error.message)
        setStatus('idle')
      }
      // On success, AuthProvider's onAuthStateChange updates the app.
    } else {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: displayName ? { display_name: displayName } : undefined,
        },
      })
      if (error) {
        setError(error.message)
        setStatus('idle')
      } else if (data.session) {
        // Email confirmation is off for this project; already signed in.
      } else {
        setStatus('check-email')
      }
    }
  }

  if (status === 'check-email') {
    return (
      <div className="auth-form">
        <h1>Check your email</h1>
        <p>
          We sent a confirmation link to <strong>{email}</strong>. Click it,
          then come back and sign in.
        </p>
        <button
          type="button"
          onClick={() => {
            setMode('sign-in')
            setStatus('idle')
          }}
        >
          Back to sign in
        </button>
      </div>
    )
  }

  return (
    <div className="auth-form">
      <h1>{mode === 'sign-in' ? 'Sign in' : 'Create an account'}</h1>
      <form onSubmit={handleSubmit}>
        {mode === 'sign-up' && (
          <label>
            Display name
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              autoComplete="nickname"
            />
          </label>
        )}
        <label>
          Email
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
          />
        </label>
        <label>
          Password
          <input
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete={mode === 'sign-in' ? 'current-password' : 'new-password'}
          />
        </label>
        {error && <p className="form-error">{error}</p>}
        <button type="submit" disabled={status === 'submitting'}>
          {status === 'submitting'
            ? 'Please wait…'
            : mode === 'sign-in'
              ? 'Sign in'
              : 'Sign up'}
        </button>
      </form>
      <button type="button" className="auth-switch" onClick={switchMode}>
        {mode === 'sign-in'
          ? "Don't have an account? Sign up"
          : 'Already have an account? Sign in'}
      </button>
    </div>
  )
}
