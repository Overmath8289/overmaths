import { useEffect, useState } from 'react'
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
} from 'react-router-dom'

import { supabase } from './supabaseClient'

import {
  getCurrentUser,
  startInactivityTimer,
  stopInactivityTimer,
} from './authManager'

// ============================================================
// PUBLIC / STUDENT PAGES
// ============================================================

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

// ============================================================
// PREMIUM
// ============================================================

import PremiumDashboard from './pages/PremiumDashboard'
import PremiumUpgrade from './pages/PremiumUpgrade'
import PremiumRoute from './pages/PremiumRoute'

// ============================================================
// ADMIN
// ============================================================

import AdminDashboard from './pages/AdminDashboard'
import AdminQuestions from './pages/AdminQuestions'
import FreeRoute from './routes/FreeRoute'


// ============================================================
// PROTECTED ROUTE
// ============================================================

function ProtectedRoute({
  children,
  user,
  loading,
}) {
  // ----------------------------------------------------------
  // AUTH LOADING
  // ----------------------------------------------------------

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

  // ----------------------------------------------------------
  // NOT LOGGED IN
  // ----------------------------------------------------------

  if (!user) {
    return (
      <Navigate
        to="/login"
        replace
      />
    )
  }

  return children
}


// ============================================================
// ADMIN ROUTE
// ============================================================

function AdminRoute({
  children,
  user,
  loading,
}) {
  const [checkingAdmin, setCheckingAdmin] =
    useState(true)

  const [isAdmin, setIsAdmin] =
    useState(false)

  useEffect(() => {
    let mounted = true

    async function checkAdmin() {
      // ------------------------------------------------------
      // NO USER
      // ------------------------------------------------------

      if (!user) {
        if (mounted) {
          setIsAdmin(false)
          setCheckingAdmin(false)
        }

        return
      }

      // ------------------------------------------------------
      // CHECK DATABASE ROLE
      // ------------------------------------------------------

      try {
        const {
          data,
          error,
        } = await supabase
          .from('users')
          .select('role')
          .eq('auth_user_id', user.id)
          .maybeSingle()

        if (!mounted) return

        if (error) {
          console.error(
            'Admin check error:',
            error
          )

          setIsAdmin(false)
        } else {
          setIsAdmin(
            data?.role === 'admin'
          )
        }
      } catch (error) {
        console.error(
          'Admin verification error:',
          error
        )

        if (mounted) {
          setIsAdmin(false)
        }
      } finally {
        if (mounted) {
          setCheckingAdmin(false)
        }
      }
    }

    if (!loading) {
      checkAdmin()
    }

    return () => {
      mounted = false
    }
  }, [user, loading])

  // ----------------------------------------------------------
  // LOADING
  // ----------------------------------------------------------

  if (loading || checkingAdmin) {
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
        Checking admin access...
      </div>
    )
  }

  // ----------------------------------------------------------
  // NOT LOGGED IN
  // ----------------------------------------------------------

  if (!user) {
    return (
      <Navigate
        to="/login"
        replace
      />
    )
  }

  // ----------------------------------------------------------
  // NOT ADMIN
  // ----------------------------------------------------------

  if (!isAdmin) {
    return (
      <Navigate
        to="/dashboard"
        replace
      />
    )
  }

  return children
}


// ============================================================
// APP
// ============================================================

function App() {
  const [user, setUser] = useState(null)
  const [authLoading, setAuthLoading] =
    useState(true)

  // ==========================================================
  // LOAD AUTH SESSION
  // ==========================================================

  useEffect(() => {
    let mounted = true

    async function loadSession() {
      try {
        const currentUser =
          await getCurrentUser()

        if (!mounted) return

        setUser(currentUser)
      } catch (error) {
        console.error(
          'Session loading error:',
          error
        )

        if (mounted) {
          setUser(null)
        }
      } finally {
        if (mounted) {
          setAuthLoading(false)
        }
      }
    }

    loadSession()

    // --------------------------------------------------------
    // SUPABASE AUTH LISTENER
    // --------------------------------------------------------

    if (!supabase) {
      return () => {
        mounted = false
      }
    }

    const {
      data: {
        subscription,
      },
    } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (!mounted) return

        setUser(
          session?.user || null
        )
      }
    )

    // --------------------------------------------------------
    // CLEANUP
    // --------------------------------------------------------

    return () => {
      mounted = false

      subscription?.unsubscribe()
    }
  }, [])


  // ==========================================================
  // INACTIVITY TIMER
  // ==========================================================

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


  // ==========================================================
  // ROUTES
  // ==========================================================

  return (
    <BrowserRouter>

      <Routes>

        {/* ==================================================
            PUBLIC
        ================================================== */}

        <Route
          path="/"
          element={<LandingPage />}
        />

        <Route
          path="/register"
          element={<Register />}
        />

        <Route
          path="/login"
          element={<Login />}
        />

        <Route
          path="/verify-email"
          element={<VerifyEmail />}
        />

        <Route
          path="/forgot-password"
          element={<ForgotPassword />}
        />

        <Route
          path="/reset-password"
          element={<ResetPassword />}
        />


        {/* ==================================================
            STUDENT
        ================================================== */}

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


        {/* ==================================================
            NORMAL DASHBOARD
        ================================================== */}

        <Route
  element={
    <ProtectedRoute
      user={user}
      loading={authLoading}
    >
      <FreeRoute />
    </ProtectedRoute>
  }
>
  <Route
    path="/dashboard"
    element={<Dashboard />}
  />
</Route>


        {/* ==================================================
            PRACTICE
        ================================================== */}

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


        {/* ==================================================
            QUIZ
        ================================================== */}

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


        {/* ==================================================
            PREMIUM UPGRADE
           
            Any logged-in user can see the upgrade page.
           
            Free user:
              Dashboard
                  ↓
              Unlock Premium
                  ↓
              /premium-upgrade
           
        ================================================== */}

        <Route
          path="/premium-upgrade"
          element={
            <ProtectedRoute
              user={user}
              loading={authLoading}
            >
              <PremiumUpgrade />
            </ProtectedRoute>
          }
        />


        {/* ==================================================
            PREMIUM DASHBOARD
           
            IMPORTANT:
            PremiumRoute must verify the subscription.
           
            Active Premium:
                /premium
                    ↓
                PremiumDashboard
           
            Not Premium:
                /premium
                    ↓
                /premium-upgrade
           
        ================================================== */}

        <Route
          path="/premium"
          element={
            <PremiumRoute
              user={user}
              loading={authLoading}
            >
              <PremiumDashboard />
            </PremiumRoute>
          }
        />


        {/* ==================================================
            ADMIN QUESTIONS
        ================================================== */}

        <Route
          path="/admin/questions"
          element={
            <AdminRoute
              user={user}
              loading={authLoading}
            >
              <AdminQuestions />
            </AdminRoute>
          }
        />


        {/* ==================================================
            ADMIN DASHBOARD
        ================================================== */}

        <Route
          path="/admin"
          element={
            <AdminRoute
              user={user}
              loading={authLoading}
            >
              <AdminDashboard />
            </AdminRoute>
          }
        />


        {/* ==================================================
            FALLBACK
        ================================================== */}

        <Route
          path="*"
          element={
            <Navigate
              to="/dashboard"
              replace
            />
          }
        />

      </Routes>

    </BrowserRouter>
  )
}

export default App