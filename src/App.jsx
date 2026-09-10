import { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { supabase } from './supabaseClient'
import {
  getCurrentUser,
  startInactivityTimer,
  stopInactivityTimer,
} from './authManager'

import LandingPage from './pages/LandingPage'
import Register from './Register'
import Login from './Login'
import VerifyEmail from './VerifyEmail'
import ForgotPassword from './ForgotPassword'
import ResetPassword from './ResetPassword'
import StudentProfile from './pages/StudentProfile'
import Dashboard from './pages/Dashboard'
import Practice from './pages/Practice'
import Quiz from './pages/Quiz'


function ProtectedRoute({ children, user, loading }) {
  if (loading) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#070b14',
          color: '#ffffff',
          fontFamily: 'Inter, sans-serif',
        }}
      >
        Loading Overmaths...
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  return children
}


function App() {
  const [user, setUser] = useState(null)
  const [authLoading, setAuthLoading] = useState(true)

  useEffect(() => {
    let mounted = true

    async function loadSession() {
      try {
        const currentUser = await getCurrentUser()

        if (!mounted) return

        setUser(currentUser)
      } catch (error) {
        console.error('Session loading error:', error)
      } finally {
        if (mounted) {
          setAuthLoading(false)
        }
      }
    }

    loadSession()

    if (!supabase) {
      return () => {
        mounted = false
      }
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (!mounted) return

        setUser(session?.user || null)
      }
    )

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  useEffect(() => {
    if (user) {
      startInactivityTimer()
    } else {
      stopInactivityTimer()
    }

    return () => {
      stopInactivityTimer()
    }
  }, [user])

  return (
    <BrowserRouter>
      <Routes>

        {/* Public pages */}
        <Route path="/" element={<LandingPage />} />

        <Route path="/register" element={<Register />} />

        <Route path="/login" element={<Login />} />

        <Route path="/verify-email" element={<VerifyEmail />} />

        <Route
          path="/forgot-password"
          element={<ForgotPassword />}
        />

        <Route
          path="/reset-password"
          element={<ResetPassword />}
        />

        {/* Protected pages */}

        <Route
          path="/student-profile"
          element={
            <ProtectedRoute
              user={user}
              loading={authLoading}
            >
              <StudentProfile />
            </ProtectedRoute>
          }
        />

        <Route
          path="/dashboard"
          element={
            <ProtectedRoute
              user={user}
              loading={authLoading}
            >
              <Dashboard />
            </ProtectedRoute>
          }
        />

        <Route
          path="/practice"
          element={
            <ProtectedRoute
              user={user}
              loading={authLoading}
            >
              <Practice />
            </ProtectedRoute>
          }
        />

        <Route
          path="/quiz"
          element={
            <ProtectedRoute
              user={user}
              loading={authLoading}
            >
              <Quiz />
            </ProtectedRoute>
          }
        />

      </Routes>
    </BrowserRouter>
  )
}

export default App