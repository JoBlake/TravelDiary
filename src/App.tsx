import { BrowserRouter, Routes, Route, Navigate, NavLink } from 'react-router-dom'
import { AuthProvider, useAuth } from './lib/auth'
import { supabase } from './lib/supabase'
import { AuthForm } from './components/AuthForm'
import { ProfileScreen } from './components/ProfileScreen'
import { LocationPickerScreen } from './components/LocationPicker'
import { DiariesScreen } from './components/DiariesScreen'
import { DiaryDetailScreen } from './components/DiaryDetailScreen'
import './App.css'

function tabClassName({ isActive }: { isActive: boolean }) {
  return isActive ? 'tab tab-active' : 'tab'
}

function TopNav() {
  const { user } = useAuth()

  return (
    <nav className="top-nav">
      <div className="top-nav-left">
        <span className="brand">TravelDiary</span>
        <div className="tabs">
          <NavLink to="/map" className={tabClassName}>
            Map
          </NavLink>
          <NavLink to="/diaries" className={tabClassName}>
            Diaries
          </NavLink>
        </div>
      </div>
      <div className="top-nav-right">
        <span className="nav-email">{user?.email}</span>
        <NavLink to="/profile" className={tabClassName}>
          Profile
        </NavLink>
        <button type="button" onClick={() => supabase.auth.signOut()}>
          Sign out
        </button>
      </div>
    </nav>
  )
}

function AppShell() {
  const { session, loading } = useAuth()

  if (loading) return <p className="loading-note">Loading…</p>

  if (!session) {
    return (
      <Routes>
        <Route path="*" element={<AuthForm />} />
      </Routes>
    )
  }

  return (
    <>
      <TopNav />
      <Routes>
        <Route path="/map" element={<LocationPickerScreen />} />
        <Route path="/diaries" element={<DiariesScreen />} />
        <Route path="/diaries/:id" element={<DiaryDetailScreen />} />
        <Route path="/profile" element={<ProfileScreen />} />
        <Route path="*" element={<Navigate to="/map" replace />} />
      </Routes>
    </>
  )
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppShell />
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
