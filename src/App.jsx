
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
import ExamDates from './pages/ExamDates'
import Dashboard from './pages/Dashboard'
import Practice from './pages/Practice'
import Quiz from './pages/Quiz'

// ============================================================
// PREMIUM
// ============================================================

import PremiumDashboard from './pages/PremiumDashboard'
import PremiumUpgrade from './pages/PremiumUpgrade'
import PremiumRoute from './pages/PremiumRoute'
import MyExam from './pages/MyExam'
import MyExamSetup from './pages/MyExamSetup'
import PremiumQuiz from './pages/PremiumQuiz'
import PremiumQuizSetup from './pages/PremiumQuizSetup'
import PremiumSectionPage from './pages/PremiumSectionPage'
import PremiumWorkspaceLayout from './pages/PremiumWorkspaceLayout'

// ============================================================
// ADMIN
// ============================================================

import AdminDashboard from './pages/AdminDashboard'
import AdminQuestions from './pages/AdminQuestions'

// ============================================================
// ROUTES
// ============================================================

import FreeRoute from './routes/FreeRoute'

// ============================================================
// PROTECTED ROUTE
// ============================================================

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

// ============================================================
// ADMIN ROUTE
// ============================================================

function AdminRoute({ children, user, loading }) {

  const [checkingAdmin, setCheckingAdmin] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    let mounted = true

    async function checkAdmin() {

      if (!user) {
        if (mounted) {
          setIsAdmin(false)
          setCheckingAdmin(false)
        }

        return
      }

      try {
        const { data, error } = await supabase
          .from('users')
          .select('role')
          .eq('auth_user_id', user.id)
          .maybeSingle()

        if (!mounted) return

        if (error) {
          console.error('Admin check error:', error)
          setIsAdmin(false)
        } else {
          setIsAdmin(data?.role === 'admin')
        }

      } catch (error) {
        console.error('Admin verification error:', error)

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

  if (!user) {
    return <Navigate to="/login" replace />
  }

  if (!isAdmin) {
    return <Navigate to="/dashboard" replace />
  }

  return children
}

// ============================================================
// APP
// ============================================================

function App() {

  const [user, setUser] = useState(null)
  const [authLoading, setAuthLoading] = useState(true)

  // ==========================================================
  // LOAD AUTH SESSION
  // ==========================================================

  useEffect(() => {

    let mounted = true

    async function loadSession() {

      try {
        const currentUser = await getCurrentUser()

        if (!mounted) return

        setUser(currentUser)

      } catch (error) {

        console.error('Session loading error:', error)

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

    // SUPABASE AUTH LISTENER

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

    // CLEANUP

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

        {/* ================================================
            PUBLIC PAGES
        ================================================ */}

        <Route path="/" element={<LandingPage />} />

        <Route path="/register" element={<Register />} />

        <Route path="/login" element={<Login />} />

        <Route path="/verify-email" element={<VerifyEmail />} />

        <Route path="/forgot-password" element={<ForgotPassword />} />

        <Route path="/reset-password" element={<ResetPassword />} />

        {/* ================================================
            STUDENT PROFILE
        ================================================ */}

        <Route
          path="/student-profile"
          element={
            <ProtectedRoute user={user} loading={authLoading}>
              <StudentProfile />
            </ProtectedRoute>
          }
        />

        {/* ================================================
            FREE STUDENT DASHBOARD
        ================================================ */}

        <Route
          element={
            <ProtectedRoute user={user} loading={authLoading}>
              <FreeRoute />
            </ProtectedRoute>
          }
        >
          <Route path="/dashboard" element={<Dashboard />} />
        </Route>

        {/* ================================================
            FREE PRACTICE
        ================================================ */}

        <Route
          path="/practice"
          element={
            <ProtectedRoute user={user} loading={authLoading}>
              <Practice />
            </ProtectedRoute>
          }
        />

        {/* ================================================
            FREE QUIZ
        ================================================ */}

        <Route
          path="/quiz"
          element={
            <ProtectedRoute user={user} loading={authLoading}>
              <Quiz />
            </ProtectedRoute>
          }
        />

        {/* ================================================
            EXAM DATES
        ================================================ */}

        <Route
          path="/exam-dates"
          element={
            <ProtectedRoute user={user} loading={authLoading}>
              <ExamDates />
            </ProtectedRoute>
          }
        />

        {/* ================================================
            PREMIUM UPGRADE
        ================================================ */}

        <Route
          path="/premium-upgrade"
          element={
            <ProtectedRoute user={user} loading={authLoading}>
              <PremiumUpgrade />
            </ProtectedRoute>
          }
        />

        {/* ================================================
            SHARED PREMIUM WORKSPACE
        ================================================ */}

        <Route
          element={
            <PremiumRoute>
              <PremiumWorkspaceLayout />
            </PremiumRoute>
          }
        >

          {/* COMMAND CENTER */}

          <Route
            path="/premium"
            element={<PremiumDashboard />}
          />

          {/* MY EXAM */}

          <Route
            path="/my-exam"
            element={<MyExam />}
          />

          <Route
            path="/my-exam-setup"
            element={<MyExamSetup />}
          />

          {/* DAILY MISSION */}

          <Route
            path="/daily-mission"
            element={
              <PremiumSectionPage section="Daily Mission" />
            }
          />

          {/* PRACTICE & MASTERY */}

          <Route
            path="/practice-mastery"
            element={
              <PremiumSectionPage section="Practice & Mastery" />
            }
          />

          {/* REVISION CENTRE */}

          <Route
            path="/revision-centre"
            element={
              <PremiumSectionPage section="Revision Centre" />
            }
          />

          {/* BATTLE ARENA */}

          <Route
            path="/battle-arena"
            element={
              <PremiumSectionPage section="Battle Arena" />
            }
          />

          {/* AI STUDY COACH */}

          <Route
            path="/ai-study-coach"
            element={
              <PremiumSectionPage section="AI Study Coach" />
            }
          />

          {/* PERFORMANCE & READINESS */}

          <Route
            path="/performance-readiness"
            element={
              <PremiumSectionPage section="Performance & Readiness" />
            }
          />

          {/* ACHIEVEMENTS & STREAKS */}

          <Route
            path="/achievements-streaks"
            element={
              <PremiumSectionPage section="Achievements & Streaks" />
            }
          />

        </Route>

        {/* ================================================
            PREMIUM QUIZ
            Separate from the shared workspace
        ================================================ */}

        <Route
          path="/premium-quiz-setup"
          element={
            <PremiumRoute>
              <PremiumQuizSetup />
            </PremiumRoute>
          }
        />

        <Route
          path="/premium-quiz"
          element={
            <PremiumRoute>
              <PremiumQuiz />
            </PremiumRoute>
          }
        />

        {/* ================================================
            OLD PREMIUM URL REDIRECTS
            Preserve existing links
        ================================================ */}

        <Route
          path="/premium-practice"
          element={
            <Navigate to="/practice-mastery" replace />
          }
        />

        <Route
          path="/smart-revision"
          element={
            <Navigate to="/revision-centre" replace />
          }
        />

        <Route
          path="/challenges"
          element={
            <Navigate to="/battle-arena" replace />
          }
        />

        <Route
          path="/performance"
          element={
            <Navigate to="/performance-readiness" replace />
          }
        />

        <Route
          path="/achievements"
          element={
            <Navigate to="/achievements-streaks" replace />
          }
        />

        {/* ================================================
            ADMIN QUESTIONS
        ================================================ */}

        <Route
          path="/admin/questions"
          element={
            <AdminRoute user={user} loading={authLoading}>
              <AdminQuestions />
            </AdminRoute>
          }
        />

        {/* ================================================
            ADMIN DASHBOARD
        ================================================ */}

        <Route
          path="/admin"
          element={
            <AdminRoute user={user} loading={authLoading}>
              <AdminDashboard />
            </AdminRoute>
          }
        />

        {/* ================================================
            FALLBACK
        ================================================ */}

        <Route
          path="*"
          element={<Navigate to="/dashboard" replace />}
        />

      </Routes>

    </BrowserRouter>
  )
}

export default App

